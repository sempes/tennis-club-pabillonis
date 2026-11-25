import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Users, UserRound, Plus, Save, X, RefreshCw,
  ChevronRight, CalendarDays, ShieldCheck
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
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(emptyMember);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const authorized = profile?.role === 'super_admin' && profile?.status === 'active';

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
  }

  async function selectRecord(record) {
    setSelectedId(record.id);
    setCreating(false);
    setNotice('');
    setError('');
    setForm(toForm(record));
    setSelectedCategoryIds(record.category_ids || []);
    setContactEmail('');
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
    setNotice('');
    setError('');
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

    setSaving(false);
    setNotice(creating ? 'Nuova scheda anagrafica creata.' : 'Scheda anagrafica aggiornata.');
    setCreating(false);
    setSelectedId(result.data.id);
    setForm(toForm(result.data));
    setSelectedCategoryIds(selectedIds);
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

  const linkedProfile = profileById.get(form.profile_id);

  return (
    <section className="admin-panel" style={{display:'grid',gap:18}}>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">GESTIONE RISERVATA · TENNIS CLUB PABILLONIS</span>
          <h2 style={{marginBottom:5}}>Anagrafica soci</h2>
          <p className="muted" style={{margin:0}}>Archivio anagrafico del circolo e dati associativi.</p>
        </div>
        <Users size={29}/>
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
