import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization") ?? "";
  const caller = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: authError } = await caller.auth.getUser();
  if (authError || !user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const admin = createClient(url, service);
  const { data: profile } = await admin.from("profiles").select("role,status").eq("id", user.id).single();
  if (profile?.role !== "admin" || profile?.status !== "active")
    return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const surname = String(body.surname ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  if (!name || !surname || !email || password.length < 8)
    return Response.json({ error: "invalid_input" }, { status: 400 });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name: `${name} ${surname}` }
  });
  if (createError || !created.user)
    return Response.json({ error: createError?.message ?? "create_failed" }, { status: 400 });

  const { error: insertError } = await admin.from("profiles").insert({
    id: created.user.id, full_name: `${name} ${surname}`, email, role: "member", status: "active"
  });
  if (insertError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return Response.json({ error: insertError.message }, { status: 400 });
  }
  return Response.json({ id: created.user.id, full_name: `${name} ${surname}` });
});