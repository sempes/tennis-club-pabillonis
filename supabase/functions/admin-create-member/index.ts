
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return response({ error: "method_not_allowed" }, 405);
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";

    const caller = createClient(url, anon, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await caller.auth.getUser();

    if (authError || !user) {
      return response({ error: "unauthorized" }, 401);
    }

    const admin = createClient(url, service);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role,status")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile ||
      !["admin", "super_admin"].includes(profile.role) ||
      profile.status !== "active"
    ) {
      return response({ error: "forbidden" }, 403);
    }

    const isSuperAdmin = profile.role === "super_admin";
    const body = await req.json();
    const action = String(body.action ?? "create_member");

    // CREA UN SOCIO O UN AMMINISTRATORE
    if (action === "create_member" || action === "create_admin") {
      const creatingAdmin = action === "create_admin";

      if (creatingAdmin && !isSuperAdmin) {
        return response({ error: "forbidden" }, 403);
      }

      const name = String(body.name ?? "").trim();
      const surname = String(body.surname ?? "").trim();
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");

      if (
        !name ||
        !surname ||
        !email ||
        !email.includes("@") ||
        password.length < 8
      ) {
        return response({ error: "invalid_input" }, 400);
      }

      const fullName = `${name} ${surname}`;
      const role = creatingAdmin ? "admin" : "member";

      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });

      if (createError || !created.user) {
        return response({
          error: createError?.message ?? "create_failed",
        }, 400);
      }

      const { error: insertError } = await admin
        .from("profiles")
        .insert({
          id: created.user.id,
          full_name: fullName,
          email,
          role,
          status: "active",
        });

      if (insertError) {
        await admin.auth.admin.deleteUser(created.user.id);
        return response({ error: insertError.message }, 400);
      }

      return response({
        success: true,
        id: created.user.id,
        full_name: fullName,
        role,
        message: creatingAdmin
          ? "Amministratore creato correttamente"
          : "Socio creato correttamente",
      });
    }

    // MODIFICA UN SOCIO O UN AMMINISTRATORE
    if (action === "update_member" || action === "update_admin") {
      const memberId = String(body.member_id ?? "").trim();

      if (!memberId || memberId === user.id) {
        return response({ error: "invalid_member_id" }, 400);
      }

      const { data: member, error: memberError } = await admin
        .from("profiles")
        .select("*")
        .eq("id", memberId)
        .single();

      if (memberError || !member) {
        return response({ error: "member_not_found" }, 404);
      }

      if (member.role === "super_admin") {
        return response({ error: "cannot_modify_super_admin" }, 403);
      }

      if (action === "update_admin") {
        if (!isSuperAdmin || member.role !== "admin") {
          return response({ error: "forbidden" }, 403);
        }
      } else if (member.role !== "member") {
        return response({ error: "cannot_modify_admin" }, 403);
      }

      const authUpdates: Record<string, unknown> = {};
      const profileUpdates: Record<string, unknown> = {};

      if (body.name !== undefined || body.surname !== undefined) {
        const parts = String(member.full_name ?? "").split(" ");

        const name = String(body.name ?? parts[0] ?? "").trim();
        const surname = String(
          body.surname ?? parts.slice(1).join(" ")
        ).trim();

        if (!name || !surname) {
          return response({ error: "invalid_name" }, 400);
        }

        const fullName = `${name} ${surname}`;

        profileUpdates.full_name = fullName;
        authUpdates.user_metadata = { full_name: fullName };
      }

      if (body.email !== undefined) {
        const email = String(body.email).trim().toLowerCase();

        if (!email || !email.includes("@")) {
          return response({ error: "invalid_email" }, 400);
        }

        authUpdates.email = email;
        authUpdates.email_confirm = true;
        profileUpdates.email = email;
      }

      if (body.password !== undefined && body.password !== "") {
        const password = String(body.password);

        if (password.length < 8) {
          return response({ error: "password_too_short" }, 400);
        }

        authUpdates.password = password;
      }

      if (body.status !== undefined) {
        const status = String(body.status);

        if (!["active", "suspended", "deleted"].includes(status)) {
          return response({ error: "invalid_status" }, 400);
        }

        profileUpdates.status = status;
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error } = await admin.auth.admin.updateUserById(
          memberId,
          authUpdates
        );

        if (error) {
          return response({ error: error.message }, 400);
        }
      }

      if (Object.keys(profileUpdates).length > 0) {
        const { error } = await admin
          .from("profiles")
          .update(profileUpdates)
          .eq("id", memberId);

        if (error) {
          return response({ error: error.message }, 400);
        }
      }

      return response({
        success: true,
        message: "Account aggiornato correttamente",
      });
    }

    // REVOCA UN AMMINISTRATORE: DIVENTA SOCIO
    if (action === "revoke_admin") {
      if (!isSuperAdmin) {
        return response({ error: "forbidden" }, 403);
      }

      const memberId = String(body.member_id ?? "").trim();

      if (!memberId || memberId === user.id) {
        return response({ error: "invalid_member_id" }, 400);
      }

      const { data: member, error: memberError } = await admin
        .from("profiles")
        .select("id,role")
        .eq("id", memberId)
        .single();

      if (memberError || !member) {
        return response({ error: "member_not_found" }, 404);
      }

      if (member.role !== "admin") {
        return response({ error: "target_is_not_admin" }, 400);
      }

      const { error } = await admin
        .from("profiles")
        .update({ role: "member" })
        .eq("id", memberId);

      if (error) {
        return response({ error: error.message }, 400);
      }

      return response({
        success: true,
        message: "Amministratore revocato correttamente",
      });
    }

    return response({ error: "invalid_action" }, 400);

  } catch (error) {
    return response({
      error: error instanceof Error ? error.message : "server_error",
    }, 500);
  }
});
