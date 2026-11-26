import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Users, UserRound, Plus, Save, X, RefreshCw,
  ChevronRight, CalendarDays, ShieldCheck, Settings, ArrowLeft
} from 'lucide-react';
import { supabase } from './supabase';

const emptyMember = {
  profile_id: '',
  full_name: '',
  first_name: '',
  last_name: '',
  birth_date: '',
  birth_place: '',
  tax_code: '',
  citizenship: '',
  gender: '',
  residence_address: '',
  residence_postal_code: '',
  residence_city: '',
  residence_province: '',
  domicile_address: '',
  domicile_postal_code: '',
  domicile_city: '',
  domicile_province: '',
  enrollment_date: '',
  membership_end_date: '',
  membership_status: 'active',
  category_id: '',
  internal_notes: ''
};

function surnameFirstLabel(record) {
  const first = (record.first_name || '').trim();
  const last = (record.last_name || '').trim();

  if (first || last) {
    return [last, first].filter(Boolean).join(' ') || 'Nome da completare';
  }

  const parts = (record.full_name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return record.full_name || 'Nome da completare';
  const givenName = parts.shift();
  return `${parts.join(' ')} ${givenName}`;
}

const fieldStyle = {
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  padding: '11px 12px',
  border: '1px solid #dce4dc',
  borderRadius: '10px',
  background: '#fff',
  color: '#24352b',
  font: 'inherit',
  outlineColor: '#6c9560'
};

const labelStyle = {
  display: 'grid',
  gap: '6px',
  color: '#526258',
  fontSize: '12px',
  fontWeight: 700
};

function Field({ label, name, value, onChange, type = 'text', ...props }) {
  return (
    <label style={labelStyle}>
      {label}
      <input
        {...props}
        type={type}
        name={name}
        value={value ?? ''}
        onChange={onChange}
        style={fieldStyle}
      />
    </label>
  );
}

function SelectField({ label, name, value, onChange, children }) {
  return (
    <label style={labelStyle}>
      {label}
      <select name={name} value={value ?? ''} onChange={onChange} style={fieldStyle}>
        {children}
      </select>
    </label>
  );
}

export default function MemberRegistry({ profile, members = [], onRegistrySaved }) {
  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [fitpRecords, setFitpRecords] = useState([]);
  const [sportRecords, setSportRecords] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [fitpEditing, setFitpEditing] = useState(false);
  const [medicalEditing, setMedicalEditing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyMember);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [configurationFields, setConfigurationFields] = useState([]);
  const [configurationLoading, setConfigurationLoading] = useState(false);
  const [configurationError, setConfigurationError] = useState('');

  const authorized = profile?.role === 'super_admin' && profile?.status === 'active';

  async function openConfiguration() {
    if (!authorized) return;
    setConfigurationOpen(true);
    setConfigurationLoading(true);
    setConfigurationError('');

    // In questa prima fase leggiamo soltanto le definizioni già presenti.
    // Nessun campo della scheda socio e nessun dato anagrafico viene modificato.
    const result = await supabase
      .from('member_custom_fields')
      .select('id,field_key,label,description,section,data_type,options,active,visible,required,show_in_summary,sort_order')
      .order('sort_order', { ascending: true })
      .order('label', { ascending: true });

    if (result.error) {
      setConfigurationFields([]);
      setConfigurationError('Impossibile leggere la configurazione dei campi: ' + result.error.message);
    } else {
      setConfigurationFields(result.data || []);
    }
    setConfigurationLoading(false);
  }

  async function loadRegistry(keepSelection = true) {
    if (!authorized) {
      setRecords([]);
      setCategories([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const [registryResult, categoriesResult, assignmentsResult] = await Promise.all([
      supabase.from('member_registry').select('*').order('full_name', { ascending: true }),
      supabase.from('member_categories').select('id,name,active,sort_order')
        .order('sort_order').order('name'),
      supabase.from('member_registry_categories').select('member_id,category_id')
    ]);

    if (registryResult.error) {
      setError('Errore caricamento anagrafica: ' + registryResult.error.message);
      setRecords([]);
    } else {
      const nextRecords = [...(registryResult.data || [])].sort((a, b) => {
        const parts = record => {
          const first = (record.first_name || '').trim();
          const last = (record.last_name || '').trim();
          if (first || last) {
            return {
              first,
              last: last || (record.full_name || '').trim()
            };
          }

          // Compatibilità con le schede importate prima della
          // separazione dei campi nome/cognome.
          const words = (record.full_name || '').trim().split(/\s+/).filter(Boolean);
          return {
            first: words.shift() || '',
            last: words.join(' ')
          };
        };

        const left = parts(a);
        const right = parts(b);
        const surnameCompare = left.last.localeCompare(right.last, 'it', { sensitivity: 'base' });
        if (surnameCompare !== 0) return surnameCompare;
        return left.first.localeCompare(right.first, 'it', { sensitivity: 'base' });
      });
      const categoryIdsByMember = new Map();
      if (!assignmentsResult.error) {
        for (const assignment of assignmentsResult.data || []) {
          const currentIds = categoryIdsByMember.get(assignment.member_id) || [];
          currentIds.push(assignment.category_id);
          categoryIdsByMember.set(assignment.member_id, currentIds);
        }
      }
      const recordsWithCategories = nextRecords.map(record => ({
        ...record,
        category_ids: categoryIdsByMember.get(record.id) || []
      }));
      setRecords(recordsWithCategories);
      if (keepSelection && selectedId) {
        const current = recordsWithCategories.find(item => item.id === selectedId);
        if (current) {
          setForm(toForm(current));
          setSelectedCategoryIds(current.category_ids);
        }
        else {
          setSelectedId(null);
          setForm(emptyMember);
          setSelectedCategoryIds([]);
        }
      }
    }

    if (assignmentsResult.error) {
      setError(previous => [previous, 'Categorie dei soci non disponibili: ' + assignmentsResult.error.message]
        .filter(Boolean).join(' · '));
    }

    if (categoriesResult.error) {
      setError(previous => [previous, 'Categorie non disponibili: ' + categoriesResult.error.message]
        .filter(Boolean).join(' · '));
    } else {
      setCategories(categoriesResult.data || []);
    }

    setLoading(false);
  }

  function toForm(record) {
    const values = Object.fromEntries(
      Object.keys(emptyMember).map(key => [
        key,
        record?.[key] == null ? '' : String(record[key])
      ])
    );

    // Per le schede importate in precedenza, ricava nome e cognome
    // da full_name soltanto quando i campi separati sono vuoti.
    if ((!values.first_name || !values.last_name) && values.full_name.trim()) {
      const parts = values.full_name.trim().split(/\s+/);
      if (!values.first_name) values.first_name = parts.shift() || '';
      if (!values.last_name) values.last_name = parts.join(' ');
    }

    return values;
  }

  useEffect(() => {
    loadRegistry(false);
    // Il caricamento dipende dall'autorizzazione del profilo corrente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authorized]);

  const profileById = useMemo(
    () => new Map(members.map(member => [member.id, member])),
    [members]
  );

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('it');
    return records.filter(record => {
      if (statusFilter !== 'all' && record.membership_status !== statusFilter) return false;
      if (!term) return true;
      const linkedProfile = profileById.get(record.profile_id);
      return [
        record.full_name, record.first_name, record.last_name,
        record.tax_code, record.residence_city, linkedProfile?.email
      ].some(value => String(value || '').toLocaleLowerCase('it').includes(term));
    });
  }, [records, search, statusFilter, profileById]);

  function startNew() {
    setSelectedId(null);
    setCreating(true);
    setNotice('');
    setError('');
    setForm({ ...emptyMember });
    setSelectedCategoryIds([]);
    setContactEmail('');
    setContactPhone('');
    setFitpRecords([]);
    setSportRecords([]);
    setMedicalRecords([]);
    setFitpEditing(false);
    setMedicalEditing(false);
  }

  async function selectRecord(record) {
    setSelectedId(record.id);
    setCreating(false);
    setNotice('');
    setError('');
    setForm(toForm(record));
    setSelectedCategoryIds(record.category_ids || []);
    setFitpEditing(false);
    setMedicalEditing(false);
    setContactEmail('');
    setContactPhone('');
    const emailResult = await supabase
      .from('member_contacts')
      .select('value')
      .eq('member_id', record.id)
      .eq('contact_type', 'email')
      .eq('is_primary', true)
      .limit(1)
      .maybeSingle();
    if (emailResult.error) {
      setError('Impossibile caricare l’email di contatto: ' + emailResult.error.message);
    } else {
      setContactEmail(emailResult.data?.value || '');
    }

    const phoneResult = await supabase
      .from('member_contacts')
      .select('value')
      .eq('member_id', record.id)
      .eq('contact_type', 'phone')
      .eq('is_primary', true)
      .limit(1)
      .maybeSingle();
    if (phoneResult.error) {
      setError(previous => [previous, 'Impossibile caricare il telefono: ' + phoneResult.error.message]
        .filter(Boolean).join(' · '));
    } else {
      setContactPhone(phoneResult.data?.value || '');
    }

    const [fitpResult, sportsResult, medicalResult] = await Promise.all([
      supabase.from('member_fitp').select('*').eq('member_id', record.id).order('sport_year', { ascending: false }),
      supabase.from('member_sports').select('*').eq('member_id', record.id).order('start_date', { ascending: false }),
      supabase.from('member_medical').select('*').eq('member_id', record.id).order('created_at', { ascending: false })
    ]);
    if (fitpResult.error) {
      setError(previous => [previous, 'Impossibile caricare i tesseramenti FITP: ' + fitpResult.error.message]
        .filter(Boolean).join(' · '));
    } else {
      setFitpRecords(fitpResult.data || []);
    }
    if (sportsResult.error) {
      setError(previous => [previous, 'Impossibile caricare le attività sportive: ' + sportsResult.error.message]
        .filter(Boolean).join(' · '));
    } else {
      setSportRecords(sportsResult.data || []);
    }
    if (medicalResult.error) {
      setError(previous => [previous, 'Impossibile caricare i certificati medici: ' + medicalResult.error.message]
        .filter(Boolean).join(' · '));
    } else {
      setMedicalRecords(medicalResult.data || []);
    }
  }

  function toggleCategory(categoryId) {
    setSelectedCategoryIds(previous => previous.includes(categoryId)
      ? previous.filter(id => id !== categoryId)
      : [...previous, categoryId]);
  }

  function changeField(event) {
    const { name, value } = event.target;

    setForm(previous => {
      const next = { ...previous, [name]: value };

      if (name === 'first_name' || name === 'last_name') {
        next.full_name = [next.first_name.trim(), next.last_name.trim()]
          .filter(Boolean)
          .join(' ');
      }

      return next;
    });
  }

  function cancelEdit() {
    setCreating(false);
    setSelectedId(null);
    setForm(emptyMember);
    setSelectedCategoryIds([]);
    setContactEmail('');
    setContactPhone('');
    setFitpRecords([]);
    setSportRecords([]);
    setMedicalRecords([]);
    setFitpEditing(false);
    setMedicalEditing(false);
    setNotice('');
    setError('');
  }

  function updateFitpRecord(index, field, value) {
    setFitpRecords(previous => previous.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function updateSportRecord(index, field, value) {
    setSportRecords(previous => previous.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function updateMedicalRecord(index, field, value) {
    setMedicalRecords(previous => previous.map((item, i) => i === index ? { ...item, [field]: value } : item));
  }

  function addFitpRecord() {
    setFitpEditing(true);
    setFitpRecords(previous => [...previous, {
      member_id: selectedId || null, card_number: '', card_type: '', sport_year: '',
      issue_date: '', expiry_date: '', classification: '', status: 'active', notes: ''
    }]);
  }

  function addSportRecord() {
    setSportRecords(previous => [...previous, {
      member_id: selectedId || null, activity_type: 'course', title: '', season: '',
      coach_name: '', playing_level: '', competitive: false, start_date: '',
      end_date: '', status: 'active', notes: ''
    }]);
  }

  function addMedicalRecord() {
    setMedicalEditing(true);
    setMedicalRecords(previous => [...previous, {
      member_id: selectedId || null, regularity_status: 'not_presented',
      presented_date: '', expiry_date: ''
    }]);
  }

  async function saveRecord(event) {
    event.preventDefault();
    if (!authorized || saving) return;

    const firstName = form.first_name.trim();
    const lastName = form.last_name.trim();
    const fullName = [firstName, lastName].filter(Boolean).join(' ');

    if (!firstName || !lastName) {
      setError('Inserisci sia il nome sia il cognome.');
      return;
    }

    const payload = {
      profile_id: form.profile_id || null,
      full_name: fullName,
      first_name: form.first_name.trim() || null,
      last_name: form.last_name.trim() || null,
      birth_date: form.birth_date || null,
      birth_place: form.birth_place.trim() || null,
      tax_code: form.tax_code.trim().toUpperCase() || null,
      citizenship: form.citizenship.trim() || null,
      gender: form.gender || null,
      residence_address: form.residence_address.trim() || null,
      residence_postal_code: form.residence_postal_code.trim() || null,
      residence_city: form.residence_city.trim() || null,
      residence_province: form.residence_province.trim().toUpperCase() || null,
      domicile_address: form.domicile_address.trim() || null,
      domicile_postal_code: form.domicile_postal_code.trim() || null,
      domicile_city: form.domicile_city.trim() || null,
      domicile_province: form.domicile_province.trim().toUpperCase() || null,
      enrollment_date: form.enrollment_date || null,
      membership_end_date: form.membership_end_date || null,
      membership_status: form.membership_status,
      category_id: selectedCategoryIds[0] || null,
      internal_notes: form.internal_notes.trim() || null,
      updated_by: profile.id
    };

    setSaving(true);
    setError('');
    setNotice('');

    const result = creating
      ? await supabase.from('member_registry').insert({
          ...payload,
          created_by: profile.id
        }).select('*').single()
      : await supabase.from('member_registry').update(payload)
          .eq('id', selectedId).select('*').single();

    if (result.error) {
      setSaving(false);
      setError('Salvataggio non riuscito: ' + result.error.message);
      return;
    }

    const memberId = result.data.id;

    // L'email di contatto è indipendente dall'email dell'account.
    // Viene gestita in member_contacts come contatto email principale.
    const currentContactEmail = await supabase
      .from('member_contacts')
      .select('id')
      .eq('member_id', memberId)
      .eq('contact_type', 'email')
      .eq('is_primary', true)
      .limit(1)
      .maybeSingle();

    if (currentContactEmail.error) {
      setSaving(false);
      setError('Scheda salvata, ma non è stato possibile verificare l’email di contatto: '
        + currentContactEmail.error.message);
      await loadRegistry(true);
      return;
    }

    const normalizedContactEmail = contactEmail.trim();
    let contactEmailResult = { error: null };

    if (normalizedContactEmail && currentContactEmail.data?.id) {
      contactEmailResult = await supabase
        .from('member_contacts')
        .update({ value: normalizedContactEmail, label: 'Email di contatto' })
        .eq('id', currentContactEmail.data.id);
    } else if (normalizedContactEmail) {
      contactEmailResult = await supabase
        .from('member_contacts')
        .insert({
          member_id: memberId,
          contact_type: 'email',
          label: 'Email di contatto',
          value: normalizedContactEmail,
          is_primary: true
        });
    } else if (currentContactEmail.data?.id) {
      contactEmailResult = await supabase
        .from('member_contacts')
        .delete()
        .eq('id', currentContactEmail.data.id);
    }

    if (contactEmailResult.error) {
      setSaving(false);
      setError('Scheda salvata, ma non è stato possibile salvare l’email di contatto: '
        + contactEmailResult.error.message);
      await loadRegistry(true);
      return;
    }

    // Il telefono di contatto è indipendente dall'account e viene
    // memorizzato nella tabella member_contacts.
    const currentContactPhone = await supabase
      .from('member_contacts')
      .select('id')
      .eq('member_id', memberId)
      .eq('contact_type', 'phone')
      .eq('is_primary', true)
      .limit(1)
      .maybeSingle();

    if (currentContactPhone.error) {
      setSaving(false);
      setError('Scheda salvata, ma non è stato possibile verificare il telefono: '
        + currentContactPhone.error.message);
      await loadRegistry(true);
      return;
    }

    const normalizedContactPhone = contactPhone.trim();
    let contactPhoneResult = { error: null };

    if (normalizedContactPhone && currentContactPhone.data?.id) {
      contactPhoneResult = await supabase
        .from('member_contacts')
        .update({ value: normalizedContactPhone, label: 'Telefono' })
        .eq('id', currentContactPhone.data.id);
    } else if (normalizedContactPhone) {
      contactPhoneResult = await supabase
        .from('member_contacts')
        .insert({
          member_id: memberId,
          contact_type: 'phone',
          label: 'Telefono',
          value: normalizedContactPhone,
          is_primary: true
        });
    } else if (currentContactPhone.data?.id) {
      contactPhoneResult = await supabase
        .from('member_contacts')
        .delete()
        .eq('id', currentContactPhone.data.id);
    }

    if (contactPhoneResult.error) {
      setSaving(false);
      setError('Scheda salvata, ma non è stato possibile salvare il telefono: '
        + contactPhoneResult.error.message);
      await loadRegistry(true);
      return;
    }

    // Salva le categorie multiple nella tabella di collegamento.
    // La colonna category_id della scheda resta aggiornata con la prima
    // categoria selezionata per compatibilità con le funzioni precedenti.
    const existingAssignments = await supabase
      .from('member_registry_categories')
      .select('category_id')
      .eq('member_id', memberId);

    if (existingAssignments.error) {
      setSaving(false);
      setError('Scheda salvata, ma non è stato possibile leggere le categorie assegnate: '
        + existingAssignments.error.message);
      await loadRegistry(true);
      return;
    }

    const existingIds = (existingAssignments.data || []).map(item => item.category_id);
    const selectedIds = [...new Set(selectedCategoryIds)];
    const idsToAdd = selectedIds.filter(id => !existingIds.includes(id));
    const idsToRemove = existingIds.filter(id => !selectedIds.includes(id));

    if (idsToAdd.length) {
      const assignmentInsert = await supabase
        .from('member_registry_categories')
        .insert(idsToAdd.map(categoryId => ({
          member_id: memberId,
          category_id: categoryId,
          assigned_by: profile.id
        })));

      if (assignmentInsert.error) {
        setSaving(false);
        setError('Scheda salvata, ma errore nell’assegnazione delle categorie: '
          + assignmentInsert.error.message);
        await loadRegistry(true);
        return;
      }
    }

    for (const categoryId of idsToRemove) {
      const assignmentDelete = await supabase
        .from('member_registry_categories')
        .delete()
        .eq('member_id', memberId)
        .eq('category_id', categoryId);

      if (assignmentDelete.error) {
        setSaving(false);
        setError('Scheda salvata, ma non è stato possibile rimuovere una categoria: '
          + assignmentDelete.error.message);
        await loadRegistry(true);
        return;
      }
    }

    // Salva lo storico dei tesseramenti FITP. Le righe esistenti vengono
    // aggiornate e quelle nuove inserite; non vengono cancellati gli anni precedenti.
    for (const item of fitpRecords) {
      const cardNumber = (item.card_number || '').trim();
      const cardType = (item.card_type || '').trim();
      if (!cardNumber && !cardType && !item.sport_year && !item.issue_date && !item.expiry_date
          && !item.classification && !item.notes) continue;
      const fitpPayload = {
        member_id: memberId,
        card_number: cardNumber || null,
        card_type: cardType || null,
        sport_year: item.sport_year ? Number(item.sport_year) : null,
        issue_date: item.issue_date || null,
        expiry_date: item.expiry_date || null,
        classification: (item.classification || '').trim() || null,
        status: item.status || 'active',
        notes: (item.notes || '').trim() || null
      };
      const fitpSave = item.id
        ? await supabase.from('member_fitp').update(fitpPayload).eq('id', item.id)
        : await supabase.from('member_fitp').insert(fitpPayload);
      if (fitpSave.error) {
        setSaving(false);
        setError('Scheda salvata, ma errore nel tesseramento FITP: ' + fitpSave.error.message);
        await loadRegistry(true);
        return;
      }
    }

    // Le attività vengono conservate come storico: non si eliminano
    // automaticamente le attività precedenti.
    for (const item of sportRecords) {
      const title = (item.title || '').trim();
      if (!title) continue;
      const sportPayload = {
        member_id: memberId,
        activity_type: item.activity_type || 'other',
        title,
        season: (item.season || '').trim() || null,
        coach_name: (item.coach_name || '').trim() || null,
        playing_level: (item.playing_level || '').trim() || null,
        competitive: item.competitive === true || item.competitive === 'true',
        start_date: item.start_date || null,
        end_date: item.end_date || null,
        status: item.status || 'active',
        notes: (item.notes || '').trim() || null
      };
      const sportSave = item.id
        ? await supabase.from('member_sports').update(sportPayload).eq('id', item.id)
        : await supabase.from('member_sports').insert(sportPayload);
      if (sportSave.error) {
        setSaving(false);
        setError('Scheda salvata, ma errore nell’attività sportiva: ' + sportSave.error.message);
        await loadRegistry(true);
        return;
      }
    }

    // Salva lo storico dei certificati medici: le nuove righe vengono
    // inserite e quelle esistenti aggiornate, senza cancellare certificati precedenti.
    for (const item of medicalRecords) {
      const status = item.regularity_status || 'not_presented';
      const medicalPayload = {
        member_id: memberId,
        regularity_status: status,
        presented_date: item.presented_date || null,
        expiry_date: item.expiry_date || null,
        verified_by: profile.id,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      const medicalSave = item.id
        ? await supabase.from('member_medical').update(medicalPayload).eq('id', item.id)
        : await supabase.from('member_medical').insert(medicalPayload);
      if (medicalSave.error) {
        setSaving(false);
        setError('Scheda salvata, ma errore nel certificato medico: ' + medicalSave.error.message);
        await loadRegistry(true);
        return;
      }
    }

    setSaving(false);
    setNotice(creating ? 'Nuova scheda anagrafica creata.' : 'Scheda anagrafica aggiornata.');
    setCreating(false);
    setFitpEditing(false);
    setMedicalEditing(false);
    setSelectedId(result.data.id);
    setForm(toForm(result.data));
    setSelectedCategoryIds(selectedIds);
    const [savedFitp, savedSports, savedMedical] = await Promise.all([
      supabase.from('member_fitp').select('*').eq('member_id', memberId).order('sport_year', { ascending: false }),
      supabase.from('member_sports').select('*').eq('member_id', memberId).order('start_date', { ascending: false }),
      supabase.from('member_medical').select('*').eq('member_id', memberId).order('created_at', { ascending: false })
    ]);
    if (!savedFitp.error) setFitpRecords(savedFitp.data || []);
    if (!savedSports.error) setSportRecords(savedSports.data || []);
    if (!savedMedical.error) setMedicalRecords(savedMedical.data || []);
    await loadRegistry(true);

    // Se è stato modificato lo stato associativo di un socio collegato,
    // aggiorna subito Gestione soci senza ricaricare tutta l'app.
    if (typeof onRegistrySaved === 'function') {
      await onRegistrySaved();
    }
  }

  if (!authorized) {
    return (
      <section className="admin-panel">
        <div style={{display:'flex',alignItems:'center',gap:12,color:'#a33b32'}}>
          <ShieldCheck size={24}/>
          <div>
            <h2 style={{margin:'0 0 4px'}}>Accesso non autorizzato</h2>
            <p className="muted" style={{margin:0}}>L'anagrafica è riservata ai super amministratori attivi.</p>
          </div>
        </div>
      </section>
    );
  }

  const todayLocal = new Date();
  todayLocal.setHours(0, 0, 0, 0);
  const daysToExpiry = expiryDate => {
    if (!expiryDate) return null;
    const [year, month, day] = String(expiryDate).slice(0, 10).split('-').map(Number);
    if (!year || !month || !day) return null;
    const expiry = new Date(year, month - 1, day);
    return Math.ceil((expiry.getTime() - todayLocal.getTime()) / 86400000);
  };
  const currentFitp = fitpRecords.find(item => item.status !== 'cancelled') || null;
  const fitpDaysLeft = daysToExpiry(currentFitp?.expiry_date);
  const fitpNeedsRenewal = !!currentFitp && (
    currentFitp.status === 'expired' ||
    (fitpDaysLeft !== null && fitpDaysLeft <= 30)
  );
  const currentMedical = medicalRecords[0] || null;
  const medicalDaysLeft = daysToExpiry(currentMedical?.expiry_date);
  const medicalNeedsRenewal = !!currentMedical && (
    ['expiring', 'expired', 'not_presented'].includes(currentMedical.regularity_status) ||
    (medicalDaysLeft !== null && medicalDaysLeft <= 30)
  );
  const linkedProfile = profileById.get(form.profile_id);

  if (configurationOpen) {
    return (
      <section className="admin-panel" style={{display:'grid',gap:18}}>
        <div className="admin-heading" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
          <div>
            <span className="eyebrow">GESTIONE RISERVATA · TENNIS CLUB PABILLONIS</span>
            <h2 style={{marginBottom:5}}>Configurazione anagrafica</h2>
            <p className="muted" style={{margin:0}}>Prima fase: consultazione delle definizioni dei campi personalizzati già presenti.</p>
          </div>
          <button type="button" className="password-button" onClick={()=>setConfigurationOpen(false)}
            style={{display:'inline-flex',alignItems:'center',gap:7}}>
            <ArrowLeft size={16}/> Torna all'anagrafica
          </button>
        </div>

        <div style={{padding:14,border:'1px solid #dce8d8',borderRadius:12,background:'#f7faf5',color:'#405b43',fontSize:13,lineHeight:1.5}}>
          In questo passaggio non vengono modificati campi, schede o dati esistenti. Stiamo verificando la lettura delle impostazioni prima di introdurre i comandi di configurazione.
        </div>

        {configurationError && <div role="alert" style={{padding:12,borderRadius:10,background:'#fff1ef',color:'#963c32'}}>{configurationError}</div>}

        <div style={{border:'1px solid #e2e9e1',borderRadius:16,padding:16,background:'#fff',display:'grid',gap:12}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
            <div>
              <h3 style={{margin:0,fontSize:16}}>Campi personalizzati esistenti</h3>
              <p className="muted" style={{margin:'4px 0 0',fontSize:12}}>Definizioni presenti in member_custom_fields</p>
            </div>
            <button type="button" className="password-button" onClick={openConfiguration} disabled={configurationLoading}
              style={{display:'inline-flex',alignItems:'center',gap:7}}>
              <RefreshCw size={15}/> Aggiorna
            </button>
          </div>

          {configurationLoading ? <p className="muted">Lettura configurazione…</p>
            : configurationFields.length === 0
              ? <p className="muted" style={{margin:0}}>Nessun campo personalizzato presente. I campi standard saranno gestiti nel passaggio successivo.</p>
              : <div style={{display:'grid',gap:8}}>
                  {configurationFields.map(item => (
                    <div key={item.id} style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto',gap:10,alignItems:'center',padding:12,border:'1px solid #e7ece5',borderRadius:11,background:'#fbfcfa'}}>
                      <div style={{minWidth:0}}>
                        <strong style={{display:'block',color:'#304338',fontSize:13}}>{item.label}</strong>
                        <small className="muted">{item.field_key} · {item.data_type} · sezione: {item.section || 'custom'}</small>
                        {item.description && <p className="muted" style={{margin:'4px 0 0',fontSize:12}}>{item.description}</p>}
                      </div>
                      <div style={{display:'flex',gap:5,flexWrap:'wrap',justifyContent:'flex-end'}}>
                        <span style={{fontSize:10,fontWeight:700,padding:'4px 7px',borderRadius:20,background:item.active?'#e8f4e5':'#f1f2f1',color:item.active?'#3f6c37':'#69736b'}}>{item.active?'Attivo':'Disattivo'}</span>
                        <span style={{fontSize:10,fontWeight:700,padding:'4px 7px',borderRadius:20,background:item.visible?'#e8f0fa':'#f1f2f1',color:item.visible?'#3f5f83':'#69736b'}}>{item.visible?'Visibile':'Nascosto'}</span>
                        {item.required && <span style={{fontSize:10,fontWeight:700,padding:'4px 7px',borderRadius:20,background:'#fff3df',color:'#8a5b16'}}>Obbligatorio</span>}
                      </div>
                    </div>
                  ))}
                </div>}
        </div>
      </section>
    );
  }

  return (
    <section className="admin-panel" style={{display:'grid',gap:18}}>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">GESTIONE RISERVATA · TENNIS CLUB PABILLONIS</span>
          <h2 style={{marginBottom:5}}>Anagrafica soci</h2>
          <p className="muted" style={{margin:0}}>Archivio anagrafico del circolo e dati associativi.</p>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <button type="button" className="password-button" onClick={openConfiguration}
            style={{display:'inline-flex',alignItems:'center',gap:7}}>
            <Settings size={16}/> Configurazione
          </button>
          <Users size={29}/>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))',gap:10}}>
        {[
          ['Schede totali', records.length],
          ['Soci attivi', records.filter(item => item.membership_status === 'active').length],
          ['Sospesi', records.filter(item => item.membership_status === 'suspended').length],
          ['Cessati/archiviati', records.filter(item => ['ceased','archived'].includes(item.membership_status)).length]
        ].map(([label,value]) => (
          <div key={label} style={{padding:'14px 16px',border:'1px solid #e3eae2',borderRadius:14,background:'#fbfcfa'}}>
            <div style={{fontSize:12,color:'#718078',fontWeight:700}}>{label}</div>
            <div style={{fontSize:25,fontWeight:800,color:'#203b2b',marginTop:4}}>{value}</div>
          </div>
        ))}
      </div>

      {error && <div role="alert" style={{padding:12,borderRadius:10,background:'#fff1ef',color:'#963c32'}}>{error}</div>}
      {notice && <div role="status" style={{padding:12,borderRadius:10,background:'#edf7ed',color:'#285c35'}}>{notice}</div>}

      <div style={{display:'grid',gridTemplateColumns:'minmax(260px, .85fr) minmax(0, 1.6fr)',gap:16,alignItems:'start'}}>
        <div style={{border:'1px solid #e2e9e1',borderRadius:16,padding:14,background:'#fff',minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,marginBottom:12}}>
            <h3 style={{margin:0,fontSize:16}}>Elenco soci</h3>
            <button type="button" className="password-button" onClick={()=>loadRegistry()} title="Aggiorna elenco"
              style={{display:'inline-flex',alignItems:'center',gap:6}}>
              <RefreshCw size={15}/> Aggiorna
            </button>
          </div>

          <label style={{position:'relative',display:'block',marginBottom:10}}>
            <Search size={17} style={{position:'absolute',left:11,top:12,color:'#7a897e'}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Cerca nome, codice fiscale, email..."
              style={{...fieldStyle,paddingLeft:36}}/>
          </label>

          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
            style={{...fieldStyle,marginBottom:12}}>
            <option value="all">Tutti gli stati</option>
            <option value="active">Attivi</option>
            <option value="suspended">Sospesi</option>
            <option value="ceased">Cessati</option>
            <option value="archived">Archiviati</option>
          </select>

          <button type="button" className="primary" onClick={startNew}
            style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:12}}>
            <Plus size={17}/> Nuova scheda
          </button>

          {loading ? <p className="muted">Caricamento anagrafica…</p>
            : filteredRecords.length === 0
              ? <p className="muted">Nessuna scheda trovata.</p>
              : <div style={{display:'grid',gap:6,maxHeight:560,overflowY:'auto'}}>
                  {filteredRecords.map(record => {
                    const active = selectedId === record.id && !creating;
                    return (
                      <button key={record.id} type="button" onClick={()=>selectRecord(record)}
                        style={{
                          display:'flex',alignItems:'center',gap:10,textAlign:'left',
                          width:'100%',padding:'11px 10px',borderRadius:11,
                          border:active?'1px solid #8cae83':'1px solid transparent',
                          background:active?'#eff6ec':'#f8faf7',cursor:'pointer',color:'#26352b'
                        }}>
                        <span style={{width:36,height:36,flex:'0 0 36px',borderRadius:12,background:'#e5eee2',
                          display:'grid',placeItems:'center',fontWeight:800,color:'#496b43'}}>
                          {surnameFirstLabel(record).trim().charAt(0).toUpperCase()}
                        </span>
                        <span style={{minWidth:0,flex:1}}>
                          <strong style={{display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontSize:13}}>
                            {surnameFirstLabel(record)}
                          </strong>
                        </span>
                        <ChevronRight size={16} color="#849187"/>
                      </button>
                    );
                  })}
                </div>}
        </div>

        <div style={{border:'1px solid #e2e9e1',borderRadius:16,padding:18,background:'#fff',minWidth:0}}>
          {!creating && !selectedId ? (
            <div style={{minHeight:300,display:'grid',placeItems:'center',textAlign:'center',color:'#718078'}}>
              <div>
                <UserRound size={38} style={{marginBottom:10,opacity:.65}}/>
                <h3 style={{margin:'0 0 6px',color:'#304338'}}>Seleziona un socio</h3>
                <p style={{margin:0,fontSize:13}}>Scegli una scheda dall'elenco oppure creane una nuova.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={saveRecord} style={{display:'grid',gap:18}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
                <div>
                  <span className="eyebrow">{creating ? 'NUOVA SCHEDA' : 'SCHEDA ANAGRAFICA'}</span>
                  <h3 style={{margin:'4px 0 0',fontSize:19}}>{creating ? 'Inserisci un nuovo socio' : form.full_name}</h3>
                  {linkedProfile?.email && <small className="muted" style={{display:'block',marginTop:5}}>Email account (accesso app): {linkedProfile.email}</small>}
                </div>
                <button type="button" className="password-button" onClick={cancelEdit}
                  style={{display:'inline-flex',alignItems:'center',gap:6}}>
                  <X size={15}/> Chiudi
                </button>
              </div>

              <div>
                <h4 style={{margin:'0 0 10px',fontSize:13,color:'#557b42'}}>DATI PERSONALI</h4>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:11}}>
                  <Field label="Nome *" name="first_name" value={form.first_name} onChange={changeField} required/>
                  <Field label="Cognome *" name="last_name" value={form.last_name} onChange={changeField} required/>
                  <Field label="Data di nascita" name="birth_date" type="date" value={form.birth_date} onChange={changeField}/>
                  <Field label="Luogo di nascita" name="birth_place" value={form.birth_place} onChange={changeField}/>
                  <Field label="Codice fiscale" name="tax_code" value={form.tax_code} onChange={changeField} maxLength={32}/>
                  <Field label="Email di contatto" name="contact_email" type="email" value={contactEmail} onChange={event => setContactEmail(event.target.value)} placeholder="email personale" />
                  <Field label="Telefono" name="contact_phone" type="tel" value={contactPhone} onChange={event => setContactPhone(event.target.value)} placeholder="numero di telefono" />
                  <Field label="Cittadinanza" name="citizenship" value={form.citizenship} onChange={changeField}/>
                  <SelectField label="Genere" name="gender" value={form.gender} onChange={changeField}>
                    <option value="">Non specificato</option>
                    <option value="M">Maschile</option>
                    <option value="F">Femminile</option>
                    <option value="other">Altro</option>
                  </SelectField>
                </div>
              </div>

              <div>
                <h4 style={{margin:'0 0 10px',fontSize:13,color:'#557b42'}}>RESIDENZA</h4>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:11}}>
                  <Field label="Indirizzo" name="residence_address" value={form.residence_address} onChange={changeField}/>
                  <Field label="CAP" name="residence_postal_code" value={form.residence_postal_code} onChange={changeField}/>
                  <Field label="Comune" name="residence_city" value={form.residence_city} onChange={changeField}/>
                  <Field label="Provincia" name="residence_province" value={form.residence_province} onChange={changeField} maxLength={2}/>
                </div>
              </div>

              <div>
                <h4 style={{margin:'0 0 10px',fontSize:13,color:'#557b42'}}>DOMICILIO (SE DIVERSO)</h4>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:11}}>
                  <Field label="Indirizzo" name="domicile_address" value={form.domicile_address} onChange={changeField}/>
                  <Field label="CAP" name="domicile_postal_code" value={form.domicile_postal_code} onChange={changeField}/>
                  <Field label="Comune" name="domicile_city" value={form.domicile_city} onChange={changeField}/>
                  <Field label="Provincia" name="domicile_province" value={form.domicile_province} onChange={changeField} maxLength={2}/>
                </div>
              </div>

              <div>
                <h4 style={{margin:'0 0 10px',fontSize:13,color:'#557b42'}}>DATI ASSOCIATIVI</h4>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:11}}>
                  <Field label="Data iscrizione" name="enrollment_date" type="date" value={form.enrollment_date} onChange={changeField}/>
                  <Field label="Fine iscrizione" name="membership_end_date" type="date" value={form.membership_end_date} onChange={changeField}/>
                  <SelectField label="Stato socio" name="membership_status" value={form.membership_status} onChange={changeField}>
                    <option value="active">Attivo</option>
                    <option value="suspended">Sospeso</option>
                    <option value="ceased">Cessato</option>
                    <option value="archived">Archiviato</option>
                  </SelectField>
                  <div style={{gridColumn:'1 / -1',display:'grid',gap:8}}>
                    <span style={labelStyle}>Categorie associative (selezionabili più categorie)</span>
                    <div style={{
                      display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',
                      gap:8,padding:12,border:'1px solid #dce4dc',borderRadius:10,background:'#fbfcfa'
                    }}>
                      {categories.filter(item => item.active).map(item => (
                        <label key={item.id} style={{
                          display:'flex',alignItems:'center',gap:9,padding:'8px 9px',
                          borderRadius:8,background:selectedCategoryIds.includes(item.id)?'#edf5e9':'#fff',
                          border:'1px solid '+(selectedCategoryIds.includes(item.id)?'#a9c49f':'#e4eae2'),
                          color:'#304338',fontSize:13,fontWeight:600,cursor:'pointer'
                        }}>
                          <input
                            type="checkbox"
                            checked={selectedCategoryIds.includes(item.id)}
                            onChange={() => toggleCategory(item.id)}
                            style={{accentColor:'#557b42',width:16,height:16}}
                          />
                          {item.name}
                        </label>
                      ))}
                      {categories.filter(item => item.active).length === 0 && (
                        <span className="muted">Nessuna categoria attiva disponibile.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{display:'grid',gap:12}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
                  <h4 style={{margin:0,fontSize:13,color:'#557b42'}}>TESSERAMENTO FITP</h4>
                  <button type="button" className="password-button"
                    onClick={() => {
                      if (!currentFitp) addFitpRecord();
                      else if (fitpNeedsRenewal) addFitpRecord();
                      else setFitpEditing(true);
                    }}
                    style={{display:'inline-flex',alignItems:'center',gap:6}}>
                    <Plus size={14}/>{!currentFitp ? 'Inserisci tessera FITP' : fitpNeedsRenewal ? 'Inserisci rinnovo' : 'Modifica'}
                  </button>
                </div>
                {fitpRecords.length === 0 && <p className="muted" style={{margin:0,fontSize:12}}>Nessun tesseramento registrato.</p>}
                {fitpRecords.map((item, index) => (
                  <div key={item.id || `fitp-${index}`} style={{display:'grid',gap:10,padding:12,border:'1px solid #e2e9e1',borderRadius:12,background:'#fbfcfa'}}>
                    <strong style={{fontSize:12,color:'#405b43'}}>{index === 0 ? 'Tessera corrente' : `Storico tessera ${index}`}</strong>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
                      <label style={labelStyle}>Numero tessera<input style={fieldStyle} value={item.card_number || ''} disabled={!!item.id && !(index === 0 && fitpEditing)} onChange={e=>updateFitpRecord(index,'card_number',e.target.value)}/></label>
                      <label style={labelStyle}>Tipo tessera<input style={fieldStyle} value={item.card_type || ''} disabled={!!item.id && !(index === 0 && fitpEditing)} onChange={e=>updateFitpRecord(index,'card_type',e.target.value)} placeholder="Es. atleta"/></label>
                      <label style={labelStyle}>Anno sportivo<input style={fieldStyle} type="number" value={item.sport_year || ''} disabled={!!item.id && !(index === 0 && fitpEditing)} onChange={e=>updateFitpRecord(index,'sport_year',e.target.value)}/></label>
                      <label style={labelStyle}>Classificazione<input style={fieldStyle} value={item.classification || ''} disabled={!!item.id && !(index === 0 && fitpEditing)} onChange={e=>updateFitpRecord(index,'classification',e.target.value)}/></label>
                      <label style={labelStyle}>Data emissione<input style={fieldStyle} type="date" value={item.issue_date || ''} disabled={!!item.id && !(index === 0 && fitpEditing)} onChange={e=>updateFitpRecord(index,'issue_date',e.target.value)}/></label>
                      <label style={labelStyle}>Scadenza<input style={fieldStyle} type="date" value={item.expiry_date || ''} disabled={!!item.id && !(index === 0 && fitpEditing)} onChange={e=>updateFitpRecord(index,'expiry_date',e.target.value)}/></label>
                      <label style={labelStyle}>Stato
                        {index === 0 && !fitpEditing ? (
                          <div style={{...fieldStyle,display:'flex',alignItems:'center',minHeight:42,background:'#f8faf7'}}>
                            {item.status === 'active' && fitpDaysLeft !== null && fitpDaysLeft < 0
                              ? 'Scaduta'
                              : ({active:'Attiva',expired:'Scaduta',pending:'In attesa',cancelled:'Annullata'}[item.status] || item.status || 'Attiva')}
                          </div>
                        ) : (
                          <select style={fieldStyle} value={item.status || 'active'} disabled={!!item.id && !(index === 0 && fitpEditing)} onChange={e=>updateFitpRecord(index,'status',e.target.value)}>
                            <option value="active">Attiva</option><option value="expired">Scaduta</option><option value="pending">In attesa</option><option value="cancelled">Annullata</option>
                          </select>
                        )}
                      </label>
                    </div>
                    <label style={labelStyle}>Note<input style={fieldStyle} value={item.notes || ''} disabled={!!item.id && !(index === 0 && fitpEditing)} onChange={e=>updateFitpRecord(index,'notes',e.target.value)}/></label>
                  </div>
                ))}
              </div>

              <div style={{display:'grid',gap:12}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
                  <div>
                    <h4 style={{margin:0,fontSize:13,color:'#557b42'}}>CERTIFICATO MEDICO</h4>
                    <p className="muted" style={{margin:'4px 0 0',fontSize:11}}>Gestione riservata al super amministratore. Le registrazioni precedenti vengono conservate.</p>
                  </div>
                  {!currentMedical ? (
                    <button type="button" className="password-button"
                      onClick={addMedicalRecord}
                      style={{display:'inline-flex',alignItems:'center',gap:6}}>
                      <Plus size={14}/>Inserisci certificato
                    </button>
                  ) : (
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                      <button type="button" className="password-button"
                        onClick={() => setMedicalEditing(true)}
                        style={{display:'inline-flex',alignItems:'center',gap:6}}>
                        Modifica
                      </button>
                      {medicalNeedsRenewal && (
                        <button type="button" className="password-button"
                          onClick={addMedicalRecord}
                          style={{display:'inline-flex',alignItems:'center',gap:6}}>
                          <Plus size={14}/>Inserisci rinnovo
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {medicalRecords.length === 0 && <p className="muted" style={{margin:0,fontSize:12}}>Nessun certificato medico registrato.</p>}
                {medicalRecords.map((item, index) => (
                  <div key={item.id || `medical-${index}`} style={{display:'grid',gap:10,padding:12,border:'1px solid #e2e9e1',borderRadius:12,background:'#fbfcfa'}}>
                    <strong style={{fontSize:12,color:'#405b43'}}>{index === 0 ? 'Certificato corrente' : `Storico certificato ${index}`}{item.created_at ? ` · inserito il ${new Date(item.created_at).toLocaleDateString('it-IT')}` : ' · nuovo'}</strong>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
                      <label style={labelStyle}>Stato di regolarità
                        {index === 0 && !medicalEditing ? (
                          <div style={{...fieldStyle,display:'flex',alignItems:'center',minHeight:42,background:'#f8faf7'}}>
                            {['not_presented','not_required'].includes(item.regularity_status)
                              ? (item.regularity_status === 'not_presented' ? 'Non presentato' : 'Non richiesto')
                              : medicalDaysLeft !== null && medicalDaysLeft < 0
                                ? 'Scaduto'
                                : medicalDaysLeft !== null && medicalDaysLeft <= 30
                                  ? 'In scadenza'
                                  : ({regular:'Regolare',expiring:'In scadenza',expired:'Scaduto'}[item.regularity_status] || item.regularity_status || 'Non presentato')}
                          </div>
                        ) : (
                          <select style={fieldStyle} value={item.regularity_status || 'not_presented'} disabled={!!item.id && !(index === 0 && medicalEditing)} onChange={e=>updateMedicalRecord(index,'regularity_status',e.target.value)}>
                            <option value="regular">Regolare</option>
                            <option value="expiring">In scadenza</option>
                            <option value="expired">Scaduto</option>
                            <option value="not_presented">Non presentato</option>
                            <option value="not_required">Non richiesto</option>
                          </select>
                        )}
                      </label>
                      <label style={labelStyle}>Data presentazione<input style={fieldStyle} type="date" value={item.presented_date || ''} disabled={!!item.id && !(index === 0 && medicalEditing)} onChange={e=>updateMedicalRecord(index,'presented_date',e.target.value)}/></label>
                      <label style={labelStyle}>Data scadenza<input style={fieldStyle} type="date" value={item.expiry_date || ''} disabled={!!item.id && !(index === 0 && medicalEditing)} onChange={e=>updateMedicalRecord(index,'expiry_date',e.target.value)}/></label>
                    </div>
                    {item.verified_at && <small className="muted">Ultima verifica: {new Date(item.verified_at).toLocaleString('it-IT')}</small>}
                  </div>
                ))}
              </div>

              <div style={{display:'grid',gap:12}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
                  <h4 style={{margin:0,fontSize:13,color:'#557b42'}}>ATTIVITÀ SPORTIVE</h4>
                  <button type="button" className="password-button" onClick={addSportRecord}
                    style={{display:'inline-flex',alignItems:'center',gap:6}}>
                    <Plus size={14}/> Aggiungi attività
                  </button>
                </div>
                {sportRecords.length === 0 && <p className="muted" style={{margin:0,fontSize:12}}>Nessuna attività registrata.</p>}
                {sportRecords.map((item, index) => (
                  <div key={item.id || `sport-${index}`} style={{display:'grid',gap:10,padding:12,border:'1px solid #e2e9e1',borderRadius:12,background:'#fbfcfa'}}>
                    <strong style={{fontSize:12,color:'#405b43'}}>Attività {index + 1}</strong>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
                      <label style={labelStyle}>Tipo attività
                        <select style={fieldStyle} value={item.activity_type || 'course'} onChange={e=>updateSportRecord(index,'activity_type',e.target.value)}>
                          <option value="course">Corso</option><option value="lesson">Lezione</option><option value="team">Squadra</option><option value="tournament">Torneo</option><option value="competition">Competizione</option><option value="other">Altro</option>
                        </select>
                      </label>
                      <label style={labelStyle}>Nome attività<input style={fieldStyle} value={item.title || ''} onChange={e=>updateSportRecord(index,'title',e.target.value)} placeholder="Nome attività" /></label>
                      <label style={labelStyle}>Stagione sportiva<input style={fieldStyle} value={item.season || ''} onChange={e=>updateSportRecord(index,'season',e.target.value)} placeholder="Es. 2026/2027"/></label>
                      <label style={labelStyle}>Istruttore<input style={fieldStyle} value={item.coach_name || ''} onChange={e=>updateSportRecord(index,'coach_name',e.target.value)}/></label>
                      <label style={labelStyle}>Livello di gioco<input style={fieldStyle} value={item.playing_level || ''} onChange={e=>updateSportRecord(index,'playing_level',e.target.value)}/></label>
                      <label style={labelStyle}>Data inizio<input style={fieldStyle} type="date" value={item.start_date || ''} onChange={e=>updateSportRecord(index,'start_date',e.target.value)}/></label>
                      <label style={labelStyle}>Data fine<input style={fieldStyle} type="date" value={item.end_date || ''} onChange={e=>updateSportRecord(index,'end_date',e.target.value)}/></label>
                      <label style={labelStyle}>Stato
                        <select style={fieldStyle} value={item.status || 'active'} onChange={e=>updateSportRecord(index,'status',e.target.value)}>
                          <option value="active">Attiva</option><option value="completed">Completata</option><option value="cancelled">Annullata</option>
                        </select>
                      </label>
                      <label style={{...labelStyle,display:'flex',alignItems:'center',gap:8,alignSelf:'end',padding:'10px 0'}}>
                        <input type="checkbox" checked={!!item.competitive} onChange={e=>updateSportRecord(index,'competitive',e.target.checked)} style={{accentColor:'#557b42',width:16,height:16}}/>
                        Attività agonistica
                      </label>
                    </div>
                    <label style={labelStyle}>Note<input style={fieldStyle} value={item.notes || ''} onChange={e=>updateSportRecord(index,'notes',e.target.value)}/></label>
                  </div>
                ))}
              </div>

              <label style={labelStyle}>
                Note interne
                <textarea name="internal_notes" rows={4} value={form.internal_notes}
                  onChange={changeField} style={{...fieldStyle,resize:'vertical'}}/>
              </label>

              <div style={{display:'flex',gap:9,flexWrap:'wrap',justifyContent:'flex-end',borderTop:'1px solid #edf0ec',paddingTop:14}}>
                <button type="button" className="password-button" onClick={cancelEdit}>Annulla</button>
                <button type="submit" className="primary" disabled={saving}
                  style={{display:'inline-flex',alignItems:'center',gap:8}}>
                  <Save size={16}/>{saving ? 'Salvataggio…' : 'Salva scheda'}
                </button>
              </div>
              <p className="muted" style={{fontSize:11,margin:0}}>
                Le modifiche vengono salvate nell'archivio anagrafico. L'account di accesso e le prenotazioni non vengono modificati.
              </p>
            </form>
          )}
        </div>
      </div>

      <div style={{fontSize:11,color:'#78867c',display:'flex',alignItems:'center',gap:7}}>
        <CalendarDays size={14}/> Archivio anagrafico separato dagli account di accesso e dal calendario prenotazioni.
      </div>
    </section>
  );
}
