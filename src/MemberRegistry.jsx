import React, { useEffect, useMemo, useState } from 'react';
import {
  Search, Users, UserRound, Plus, Save, X, RefreshCw,
  ChevronRight, CalendarDays, ShieldCheck, Settings, ArrowLeft, Trash2
} from 'lucide-react';
import { supabase } from './supabase';


const STANDARD_REGISTRY_FIELDS = [
  { section: 'Dati personali', fields: [
    ['first_name', 'Nome'], ['last_name', 'Cognome'], ['birth_date', 'Data di nascita'],
    ['birth_place', 'Luogo di nascita'], ['tax_code', 'Codice fiscale'],
    ['contact_email', 'Email di contatto'], ['contact_phone', 'Telefono'],
    ['citizenship', 'Cittadinanza'], ['gender', 'Genere']
  ]},
  { section: 'Residenza', fields: [
    ['residence_address', 'Indirizzo'], ['residence_postal_code', 'CAP'],
    ['residence_city', 'Comune'], ['residence_province', 'Provincia']
  ]},
  { section: 'Domicilio', fields: [
    ['domicile_address', 'Indirizzo'], ['domicile_postal_code', 'CAP'],
    ['domicile_city', 'Comune'], ['domicile_province', 'Provincia']
  ]},
  { section: 'Dati associativi', fields: [
    ['enrollment_date', 'Data iscrizione'], ['membership_end_date', 'Fine iscrizione'],
    ['membership_status', 'Stato socio'], ['category_id', 'Categorie associative']
  ]},
  { section: 'Tesseramento FITP', fields: [
    ['fitp_card_number', 'Numero tessera'], ['fitp_card_type', 'Tipo tessera'],
    ['fitp_sport_year', 'Anno sportivo'], ['fitp_classification', 'Classificazione'],
    ['fitp_issue_date', 'Data emissione'], ['fitp_expiry_date', 'Scadenza'],
    ['fitp_status', 'Stato tessera'], ['fitp_notes', 'Note tessera']
  ]},
  { section: 'Certificato medico', fields: [
    ['medical_regularity_status', 'Stato di regolarità'],
    ['medical_presented_date', 'Data presentazione'],
    ['medical_expiry_date', 'Data scadenza'],
    ['medical_verified_at', 'Data ultima verifica']
  ]},
  { section: 'Attività sportive', fields: [
    ['sport_activity_type', 'Tipo attività'], ['sport_title', 'Nome attività'],
    ['sport_season', 'Stagione sportiva'], ['sport_coach_name', 'Istruttore'],
    ['sport_playing_level', 'Livello di gioco'], ['sport_start_date', 'Data inizio'],
    ['sport_end_date', 'Data fine'], ['sport_status', 'Stato attività'],
    ['sport_competitive', 'Attività agonistica'], ['sport_notes', 'Note attività']
  ]},
  { section: 'Note interne', fields: [
    ['internal_notes', 'Note interne']
  ]}
];

const CUSTOM_FIELD_TYPES = [
  ['text','Testo breve'], ['long_text','Testo lungo'], ['number','Numero intero'],
  ['decimal','Numero decimale'], ['currency','Valuta'], ['date','Data'],
  ['boolean','Sì / No'], ['email','Email'], ['phone','Telefono'], ['url','URL'],
  ['single_select','Selezione singola'], ['multi_select','Selezione multipla']
];

const SECTION_VISIBILITY_KEYS = {
  'Tesseramento FITP': 'section_fitp_enabled',
  'Certificato medico': 'section_medical_enabled',
  'Attività sportive': 'section_sport_enabled'
};

const DEFAULT_STANDARD_FIELD_VISIBILITY = {
  ...Object.fromEntries(
    STANDARD_REGISTRY_FIELDS.flatMap(group => group.fields.map(([key]) => [key, true]))
  ),
  section_fitp_enabled: true,
  section_medical_enabled: true,
  section_sport_enabled: true
};

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
  const [standardFieldVisibility, setStandardFieldVisibility] = useState(DEFAULT_STANDARD_FIELD_VISIBILITY);
  const [configurationSaving, setConfigurationSaving] = useState(false);
  const [configurationNotice, setConfigurationNotice] = useState('');
  const [customValues, setCustomValues] = useState({});
  const [customFieldDraft, setCustomFieldDraft] = useState(null);
  const [customFieldSaving, setCustomFieldSaving] = useState(false);

  const authorized = profile?.role === 'super_admin' && profile?.status === 'active';
  const showStandardField = key => standardFieldVisibility[key] !== false;

  function updateCustomValue(fieldId, value) {
    setCustomValues(current => ({ ...current, [fieldId]: value }));
  }

  function newCustomField(section = 'Documenti') {
    const sameSectionCount = configurationFields.filter(field => (field.section || 'Altri dati').trim().toLowerCase() === section.trim().toLowerCase()).length;
    setCustomFieldDraft({ id: null, label: '', description: '', section, data_type: 'text', optionsText: '', sort_order: (sameSectionCount + 1) * 10, required: false, visible: true, show_in_summary: false, active: true });
    setConfigurationError('');
    setConfigurationNotice('');
  }

  function editCustomField(item) {
    setCustomFieldDraft({ ...item, optionsText: Array.isArray(item.options) ? item.options.join('\n') : '', originalType: item.data_type });
    setConfigurationError('');
    setConfigurationNotice('');
  }

  async function saveCustomField() {
    if (!authorized || customFieldSaving || !customFieldDraft) return;
    const label = (customFieldDraft.label || '').trim();
    const section = (customFieldDraft.section || '').trim();
    if (!label || !section) {
      setConfigurationError('Inserisci il nome del campo e la sezione.');
      return;
    }
    const options = ['single_select','multi_select'].includes(customFieldDraft.data_type)
      ? [...new Set((customFieldDraft.optionsText || '').split(/[\n,;]/).map(v => v.trim()).filter(Boolean))]
      : [];
    if (['single_select','multi_select'].includes(customFieldDraft.data_type) && !options.length) {
      setConfigurationError('Inserisci almeno un’opzione per questo tipo di campo.');
      return;
    }
    setCustomFieldSaving(true);
    setConfigurationError('');
    if (customFieldDraft.id && customFieldDraft.data_type !== customFieldDraft.originalType) {
      const usage = await supabase.from('member_custom_values').select('id', { count: 'exact', head: true }).eq('field_id', customFieldDraft.id);
      if (usage.error) { setConfigurationError('Impossibile verificare i valori esistenti: ' + usage.error.message); setCustomFieldSaving(false); return; }
      if ((usage.count || 0) > 0) { setConfigurationError('Non puoi cambiare il tipo di dato perché questo campo contiene già valori. Crea un nuovo campo per usare un tipo diverso.'); setCustomFieldSaving(false); return; }
    }
    const payload = {
      label, description: (customFieldDraft.description || '').trim() || null,
      section, data_type: customFieldDraft.data_type, options,
      sort_order: Number(customFieldDraft.sort_order) || 0,
      required: !!customFieldDraft.required, visible: !!customFieldDraft.visible,
      show_in_summary: !!customFieldDraft.show_in_summary,
      active: customFieldDraft.active !== false, updated_at: new Date().toISOString()
    };
    let result;
    if (customFieldDraft.id) {
      result = await supabase.from('member_custom_fields').update(payload).eq('id', customFieldDraft.id);
    } else {
      const slug = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'campo';
      result = await supabase.from('member_custom_fields').insert({
        ...payload, field_key: `${slug}_${Date.now().toString(36)}`, created_at: new Date().toISOString()
      });
    }
    if (result.error) {
      setConfigurationError('Impossibile salvare il campo: ' + result.error.message);
    } else {
      setCustomFieldDraft(null);
      setConfigurationNotice('Campo personalizzato salvato.');
      await openConfiguration();
    }
    setCustomFieldSaving(false);
  }

  async function setCustomFieldActive(item, active) {
    if (!authorized) return;
    setConfigurationError('');
    const result = await supabase.from('member_custom_fields')
      .update({ active, updated_at: new Date().toISOString() }).eq('id', item.id);
    if (result.error) setConfigurationError('Impossibile aggiornare il campo: ' + result.error.message);
    else {
      setConfigurationNotice(active ? 'Campo riattivato.' : 'Campo archiviato. I valori esistenti sono conservati.');
      await openConfiguration();
    }
  }

  async function deleteCustomField(item) {
    if (!authorized || customFieldSaving) return;
    const usage = await supabase.from('member_custom_values')
      .select('id', { count: 'exact', head: true }).eq('field_id', item.id);
    if (usage.error) {
      setConfigurationError('Impossibile verificare se il campo contiene valori: ' + usage.error.message);
      return;
    }
    if ((usage.count || 0) > 0) {
      setConfigurationError('Questo campo contiene già valori associati ai soci. Per sicurezza non può essere eliminato: puoi archiviarlo.');
      return;
    }
    if (!window.confirm(`Eliminare definitivamente il campo “${item.label}”? L’operazione è consentita solo perché non contiene valori.`)) return;
    setCustomFieldSaving(true);
    setConfigurationError('');
    const result = await supabase.from('member_custom_fields').delete().eq('id', item.id);
    if (result.error) setConfigurationError('Impossibile eliminare il campo: ' + result.error.message);
    else {
      setCustomFieldDraft(null);
      setConfigurationNotice('Campo eliminato definitivamente.');
      await openConfiguration();
    }
    setCustomFieldSaving(false);
  }

  async function openConfiguration() {
    if (!authorized) return;
    setConfigurationOpen(true);
    setConfigurationLoading(true);
    setConfigurationError('');

    const [fieldsResult, settingsResult] = await Promise.all([
      supabase
        .from('member_custom_fields')
        .select('id,field_key,label,description,section,data_type,options,active,visible,required,show_in_summary,sort_order')
        .order('sort_order', { ascending: true })
        .order('label', { ascending: true }),
      supabase.from('member_registry_settings')
        .select('setting_value')
        .eq('setting_key', 'standard_fields_visibility')
        .maybeSingle()
    ]);

    if (fieldsResult.error) {
      setConfigurationFields([]);
      setConfigurationError('Impossibile leggere la configurazione dei campi personalizzati: ' + fieldsResult.error.message);
    } else {
      setConfigurationFields(fieldsResult.data || []);
    }
    if (settingsResult.error) {
      setConfigurationError(current => current || ('Impossibile leggere le impostazioni dei campi standard: ' + settingsResult.error.message));
    } else {
      const savedVisibility = settingsResult.data?.setting_value;
      setStandardFieldVisibility({ ...DEFAULT_STANDARD_FIELD_VISIBILITY, ...(savedVisibility && typeof savedVisibility === 'object' ? savedVisibility : {}) });
    }
    setConfigurationLoading(false);
  }

  async function saveStandardFieldVisibility() {
    if (!authorized || configurationSaving) return;
    setConfigurationSaving(true);
    setConfigurationError('');
    setConfigurationNotice('');
    const result = await supabase.from('member_registry_settings').upsert({
      setting_key: 'standard_fields_visibility',
      setting_value: standardFieldVisibility,
      description: 'Visibilità dei campi standard nella configurazione Anagrafica Soci',
      updated_by: profile?.id || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'setting_key' });
    if (result.error) {
      setConfigurationError('Impossibile salvare le impostazioni: ' + result.error.message);
    } else {
      setConfigurationNotice('Impostazioni di visibilità salvate. Nessun dato anagrafico è stato cancellato o modificato.');
    }
    setConfigurationSaving(false);
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
    if (authorized) {
      supabase.from('member_custom_fields')
        .select('id,field_key,label,description,section,data_type,options,active,visible,required,show_in_summary,sort_order')
        .order('sort_order', { ascending: true }).order('label', { ascending: true })
        .then(({ data, error: fieldsError }) => {
          if (!fieldsError) setConfigurationFields(data || []);
        });
      supabase.from('member_registry_settings')
        .select('setting_value')
        .eq('setting_key', 'standard_fields_visibility')
        .maybeSingle()
        .then(({ data, error: settingsError }) => {
          if (!settingsError) {
            const savedVisibility = data?.setting_value;
            setStandardFieldVisibility({
              ...DEFAULT_STANDARD_FIELD_VISIBILITY,
              ...(savedVisibility && typeof savedVisibility === 'object' ? savedVisibility : {})
            });
          }
        });
    }
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
    setCustomValues({});
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
    setCustomValues({});
    const customResult = await supabase.from('member_custom_values')
      .select('field_id,value').eq('member_id', record.id);
    if (customResult.error) {
      setError('Impossibile caricare i campi personalizzati: ' + customResult.error.message);
    } else {
      setCustomValues(Object.fromEntries((customResult.data || []).map(item => [item.field_id, item.value])));
    }
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
    setCustomValues({});
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

    const requiredCustomFields = configurationFields.filter(field => field.active && field.visible && field.required);
    const missingCustomField = requiredCustomFields.find(field => {
      const value = customValues[field.id];
      return value == null || value === '' || (Array.isArray(value) && value.length === 0) || (field.data_type === 'boolean' && value !== true);
    });
    if (missingCustomField) {
      setError(`Il campo \"${missingCustomField.label}\" è obbligatorio.`);
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

    // Salva soltanto i campi attivi e visibili: campi nascosti o archiviati
    // e i relativi valori non vengono mai toccati.
    const editableCustomFields = configurationFields.filter(field => field.active && field.visible);
    if (editableCustomFields.length) {
      const customRows = editableCustomFields.map(field => ({
        member_id: memberId, field_id: field.id,
        value: customValues[field.id] === undefined || customValues[field.id] === '' ? null : customValues[field.id],
        updated_by: profile.id, updated_at: new Date().toISOString()
      }));
      const customSave = await supabase.from('member_custom_values').upsert(customRows, { onConflict: 'member_id,field_id' });
      if (customSave.error) {
        setSaving(false);
        setError('Scheda socio salvata, ma non è stato possibile salvare i campi personalizzati: ' + customSave.error.message);
        await loadRegistry(true);
        return;
      }
    }

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
    const savedCustom = await supabase.from('member_custom_values').select('field_id,value').eq('member_id', memberId);
    if (!savedCustom.error) setCustomValues(Object.fromEntries((savedCustom.data || []).map(item => [item.field_id, item.value])));
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
            <p className="muted" style={{margin:0}}>Gestisci singolarmente la visibilità di tutti i campi e delle sezioni della scheda socio.</p>
          </div>
          <button type="button" className="password-button" onClick={()=>setConfigurationOpen(false)}
            style={{display:'inline-flex',alignItems:'center',gap:7}}>
            <ArrowLeft size={16}/> Torna all'anagrafica
          </button>
        </div>

        <div style={{padding:14,border:'1px solid #dce8d8',borderRadius:12,background:'#f7faf5',color:'#405b43',fontSize:13,lineHeight:1.5}}>
Le opzioni qui sotto memorizzano soltanto quali campi dovranno essere mostrati. Nascondere un campo non elimina né modifica il valore già registrato nel database. Le modifiche si applicano alla scheda anagrafica. I campi nascosti conservano tutti i valori già registrati.
        </div>

        {configurationError && <div role="alert" style={{padding:12,borderRadius:10,background:'#fff1ef',color:'#963c32'}}>{configurationError}</div>}

        {configurationNotice && <div role="status" style={{padding:12,borderRadius:10,background:'#edf7e9',color:'#3f6c37',fontSize:13}}>{configurationNotice}</div>}

        <div style={{border:'1px solid #e2e9e1',borderRadius:16,padding:16,background:'#fff',display:'grid',gap:14}}>
          <div>
            <h3 style={{margin:0,fontSize:16}}>Tutti i campi della scheda socio</h3>
            <p className="muted" style={{margin:'4px 0 0',fontSize:12}}>Attiva o disattiva la visualizzazione dei singoli campi. Le modifiche non cancellano i dati.</p>
          </div>
          {STANDARD_REGISTRY_FIELDS.map(group => {
            const sectionKey = SECTION_VISIBILITY_KEYS[group.section];
            const isWholeSection = !!sectionKey;
            const sectionEnabled = !isWholeSection || standardFieldVisibility[sectionKey] !== false;
            return (
              <div key={group.section} style={{display:'grid',gap:8,padding:12,border:'1px solid #e7ece5',borderRadius:12,background:'#fff'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
                  <h4 style={{margin:0,fontSize:12,letterSpacing:'.06em',color:'#557b42'}}>{group.section.toUpperCase()}</h4>
                  {isWholeSection && (
                    <label style={{display:'flex',alignItems:'center',gap:8,fontSize:12,fontWeight:700,color:sectionEnabled?'#3f6c37':'#8a4b43'}}>
                      <input type="checkbox" checked={sectionEnabled} onChange={event => {
                        setStandardFieldVisibility(current => ({...current, [sectionKey]: event.target.checked}));
                        setConfigurationNotice('');
                      }} style={{width:17,height:17,accentColor:'#557b42'}} />
                      Sezione intera attiva
                    </label>
                  )}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:8,opacity:sectionEnabled?1:.48}}>
                  {group.fields.map(([key, label]) => (
                    <label key={key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,padding:'10px 12px',border:'1px solid #e7ece5',borderRadius:10,background:'#fbfcfa',color:'#304338',fontSize:13}}>
                      <span>{label}</span>
                      <input type="checkbox" checked={standardFieldVisibility[key] !== false} onChange={event => {
                        setStandardFieldVisibility(current => ({...current, [key]: event.target.checked}));
                        setConfigurationNotice('');
                      }} style={{width:17,height:17,accentColor:'#557b42'}} />
                    </label>
                  ))}
                </div>
                {isWholeSection && !sectionEnabled && <small className="muted">L'intera sezione sarà nascosta nella scheda socio. I dati e lo storico resteranno conservati.</small>}
              </div>
            );
          })}
          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <button type="button" className="password-button" onClick={saveStandardFieldVisibility} disabled={configurationSaving || configurationLoading}
              style={{display:'inline-flex',alignItems:'center',gap:7}}>
              <Save size={15}/>{configurationSaving ? 'Salvataggio…' : 'Salva configurazione'}
            </button>
          </div>
        </div>

        <div style={{border:'1px solid #e2e9e1',borderRadius:16,padding:16,background:'#fff',display:'grid',gap:12}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
            <div>
              <h3 style={{margin:0,fontSize:16}}>Campi personalizzati esistenti</h3>
              <p className="muted" style={{margin:'4px 0 0',fontSize:12}}>Definizioni presenti in member_custom_fields</p>
            </div>
            <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
              <button type="button" className="password-button" onClick={newCustomField}
                style={{display:'inline-flex',alignItems:'center',gap:7}}><Plus size={15}/> Nuovo campo</button>
              <button type="button" className="password-button" onClick={openConfiguration} disabled={configurationLoading}
                style={{display:'inline-flex',alignItems:'center',gap:7}}><RefreshCw size={15}/> Aggiorna</button>
            </div>
          </div>

          {customFieldDraft && <div style={{display:'grid',gap:12,padding:14,border:'1px solid #cdddc8',borderRadius:12,background:'#f9fcf7'}}>
            <strong>{customFieldDraft.id ? 'Modifica campo personalizzato' : 'Crea campo personalizzato'}</strong>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10}}>
              <Field label="Nome campo" value={customFieldDraft.label} onChange={e=>setCustomFieldDraft(v=>({...v,label:e.target.value}))}/>
              <Field label="Sezione" value={customFieldDraft.section} onChange={e=>setCustomFieldDraft(v=>({...v,section:e.target.value}))} placeholder="Es. Documenti"/>
              <label style={labelStyle}>Tipo di dato<select style={fieldStyle} value={customFieldDraft.data_type} onChange={e=>setCustomFieldDraft(v=>({...v,data_type:e.target.value}))}>{CUSTOM_FIELD_TYPES.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
              <Field label="Ordine" type="number" value={customFieldDraft.sort_order} onChange={e=>setCustomFieldDraft(v=>({...v,sort_order:e.target.value}))}/>
            </div>
            <label style={labelStyle}>Descrizione<textarea rows={2} style={{...fieldStyle,resize:'vertical'}} value={customFieldDraft.description || ''} onChange={e=>setCustomFieldDraft(v=>({...v,description:e.target.value}))}/></label>
            {['single_select','multi_select'].includes(customFieldDraft.data_type) && <label style={labelStyle}>Opzioni (una per riga o separate da virgola)<textarea rows={3} style={{...fieldStyle,resize:'vertical'}} value={customFieldDraft.optionsText || ''} onChange={e=>setCustomFieldDraft(v=>({...v,optionsText:e.target.value}))}/></label>}
            <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>{[['required','Obbligatorio'],['visible','Visibile nella scheda'],['show_in_summary','Mostra nel riepilogo']].map(([key,label])=><label key={key} style={{display:'flex',alignItems:'center',gap:7,fontSize:12,fontWeight:700}}><input type="checkbox" checked={!!customFieldDraft[key]} onChange={e=>setCustomFieldDraft(v=>({...v,[key]:e.target.checked}))}/>{label}</label>)}</div>
            {customFieldDraft.id && <small className="muted">Puoi modificare il tipo solo se il campo non contiene ancora valori. Se sono già presenti valori, il salvataggio impedirà il cambio per proteggerli.</small>}
            <div style={{display:'flex',justifyContent:'flex-end',gap:8}}><button type="button" className="password-button" onClick={()=>setCustomFieldDraft(null)}>Annulla</button><button type="button" className="primary" disabled={customFieldSaving} onClick={saveCustomField}>{customFieldSaving?'Salvataggio…':'Salva campo'}</button></div>
          </div>}
          {configurationLoading ? <p className="muted">Lettura configurazione…</p>
            : configurationFields.length === 0
              ? <p className="muted" style={{margin:0}}>Nessun campo personalizzato presente. Non sono presenti campi personalizzati.</p>
              : <div style={{display:'grid',gap:14}}>
                  {Object.entries(configurationFields.reduce((groups, item) => { const section = (item.section || 'Altri dati').trim(); (groups[section] ||= []).push(item); return groups; }, {})).map(([section, items]) => (
                    <div key={section} style={{display:'grid',gap:8,padding:12,border:'1px solid #dfe8dc',borderRadius:13,background:'#fbfdf9'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap'}}>
                        <strong style={{fontSize:13,color:'#42663d'}}>{section}</strong>
                        <button type="button" className="password-button" onClick={()=>newCustomField(section)} style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:11,padding:'6px 9px'}}><Plus size={13}/> Aggiungi casella in questa sezione</button>
                      </div>
                      {items.map(item => (
                        <div key={item.id} style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) auto',gap:10,alignItems:'center',padding:12,border:'1px solid #e7ece5',borderRadius:11,background:'#fff'}}>
                          <div style={{minWidth:0}}>
                            <strong style={{display:'block',color:'#304338',fontSize:13}}>{item.label}</strong>
                            <small className="muted">{item.field_key} · {item.data_type}</small>
                            {item.description && <p className="muted" style={{margin:'4px 0 0',fontSize:12}}>{item.description}</p>}
                          </div>
                          <div style={{display:'flex',gap:5,flexWrap:'wrap',justifyContent:'flex-end',alignItems:'center'}}>
                            <span style={{fontSize:10,fontWeight:700,padding:'4px 7px',borderRadius:20,background:item.active?'#e8f4e5':'#f1f2f1',color:item.active?'#3f6c37':'#69736b'}}>{item.active?'Attivo':'Archiviato'}</span>
                            <span style={{fontSize:10,fontWeight:700,padding:'4px 7px',borderRadius:20,background:item.visible?'#e8f0fa':'#f1f2f1',color:item.visible?'#3f5f83':'#69736b'}}>{item.visible?'Visibile':'Nascosto'}</span>
                            {item.required && <span style={{fontSize:10,fontWeight:700,padding:'4px 7px',borderRadius:20,background:'#fff3df',color:'#8a5b16'}}>Obbligatorio</span>}
                            <button type="button" className="password-button" onClick={()=>editCustomField(item)} style={{fontSize:11,padding:'6px 9px'}}>Modifica</button>
                            <button type="button" className="password-button" onClick={()=>setCustomFieldActive(item,!item.active)} style={{fontSize:11,padding:'6px 9px'}}>{item.active?'Archivia':'Riattiva'}</button>
                            <button type="button" className="password-button" onClick={()=>deleteCustomField(item)} style={{display:'inline-flex',alignItems:'center',gap:4,fontSize:11,padding:'6px 9px',color:'#a33d35'}}><Trash2 size={13}/> Elimina</button>
                          </div>
                        </div>
                      ))}
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
        <div style={{display:'flex',alignItems:'center',gap:10,marginLeft:'auto'}}>
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

              {[
                {
                  title: 'DATI PERSONALI',
                  keys: ['first_name','last_name','birth_date','birth_place','tax_code','contact_email','contact_phone','citizenship','gender']
                },
                { title: 'RESIDENZA', keys: ['residence_address','residence_postal_code','residence_city','residence_province'] },
                { title: 'DOMICILIO (SE DIVERSO)', keys: ['domicile_address','domicile_postal_code','domicile_city','domicile_province'] },
                { title: 'DATI ASSOCIATIVI', keys: ['enrollment_date','membership_end_date','membership_status','category_id'] }
              ].map(section => {
                const visibleKeys = section.keys.filter(showStandardField);
                if (visibleKeys.length === 0) return null;
                return (
                  <div key={section.title}>
                    <h4 style={{margin:'0 0 10px',fontSize:13,color:'#557b42'}}>{section.title}</h4>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:11}}>
                      {section.title === 'DATI PERSONALI' && <>
                        {showStandardField('first_name') && <Field label="Nome *" name="first_name" value={form.first_name} onChange={changeField} required/>}
                        {showStandardField('last_name') && <Field label="Cognome *" name="last_name" value={form.last_name} onChange={changeField} required/>}
                        {showStandardField('birth_date') && <Field label="Data di nascita" name="birth_date" type="date" value={form.birth_date} onChange={changeField}/>}
                        {showStandardField('birth_place') && <Field label="Luogo di nascita" name="birth_place" value={form.birth_place} onChange={changeField}/>}
                        {showStandardField('tax_code') && <Field label="Codice fiscale" name="tax_code" value={form.tax_code} onChange={changeField} maxLength={32}/>}
                        {showStandardField('contact_email') && <Field label="Email di contatto" name="contact_email" type="email" value={contactEmail} onChange={event => setContactEmail(event.target.value)} placeholder="email personale" />}
                        {showStandardField('contact_phone') && <Field label="Telefono" name="contact_phone" type="tel" value={contactPhone} onChange={event => setContactPhone(event.target.value)} placeholder="numero di telefono" />}
                        {showStandardField('citizenship') && <Field label="Cittadinanza" name="citizenship" value={form.citizenship} onChange={changeField}/>}
                        {showStandardField('gender') && <SelectField label="Genere" name="gender" value={form.gender} onChange={changeField}>
                          <option value="">Non specificato</option><option value="M">Maschile</option><option value="F">Femminile</option><option value="other">Altro</option>
                        </SelectField>}
                      </>}
                      {section.title === 'RESIDENZA' && <>
                        {showStandardField('residence_address') && <Field label="Indirizzo" name="residence_address" value={form.residence_address} onChange={changeField}/>}
                        {showStandardField('residence_postal_code') && <Field label="CAP" name="residence_postal_code" value={form.residence_postal_code} onChange={changeField}/>}
                        {showStandardField('residence_city') && <Field label="Comune" name="residence_city" value={form.residence_city} onChange={changeField}/>}
                        {showStandardField('residence_province') && <Field label="Provincia" name="residence_province" value={form.residence_province} onChange={changeField} maxLength={2}/>}
                      </>}
                      {section.title === 'DOMICILIO (SE DIVERSO)' && <>
                        {showStandardField('domicile_address') && <Field label="Indirizzo" name="domicile_address" value={form.domicile_address} onChange={changeField}/>}
                        {showStandardField('domicile_postal_code') && <Field label="CAP" name="domicile_postal_code" value={form.domicile_postal_code} onChange={changeField}/>}
                        {showStandardField('domicile_city') && <Field label="Comune" name="domicile_city" value={form.domicile_city} onChange={changeField}/>}
                        {showStandardField('domicile_province') && <Field label="Provincia" name="domicile_province" value={form.domicile_province} onChange={changeField} maxLength={2}/>}
                      </>}
                      {section.title === 'DATI ASSOCIATIVI' && <>
                        {showStandardField('enrollment_date') && <Field label="Data iscrizione" name="enrollment_date" type="date" value={form.enrollment_date} onChange={changeField}/>}
                        {showStandardField('membership_end_date') && <Field label="Fine iscrizione" name="membership_end_date" type="date" value={form.membership_end_date} onChange={changeField}/>}
                        {showStandardField('membership_status') && <SelectField label="Stato socio" name="membership_status" value={form.membership_status} onChange={changeField}>
                          <option value="active">Attivo</option><option value="suspended">Sospeso</option><option value="ceased">Cessato</option><option value="archived">Archiviato</option>
                        </SelectField>}
                        {showStandardField('category_id') && <div style={{gridColumn:'1 / -1',display:'grid',gap:8}}>
                          <span style={labelStyle}>Categorie associative (selezionabili più categorie)</span>
                          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:8,padding:12,border:'1px solid #dce4dc',borderRadius:10,background:'#fbfcfa'}}>
                            {categories.filter(item => item.active).map(item => (
                              <label key={item.id} style={{display:'flex',alignItems:'center',gap:9,padding:'8px 9px',borderRadius:8,background:selectedCategoryIds.includes(item.id)?'#edf5e9':'#fff',border:'1px solid '+(selectedCategoryIds.includes(item.id)?'#a9c49f':'#e4eae2'),color:'#304338',fontSize:13,fontWeight:600,cursor:'pointer'}}>
                                <input type="checkbox" checked={selectedCategoryIds.includes(item.id)} onChange={() => toggleCategory(item.id)} style={{accentColor:'#557b42',width:16,height:16}}/>
                                {item.name}
                              </label>
                            ))}
                            {categories.filter(item => item.active).length === 0 && <span className="muted">Nessuna categoria attiva disponibile.</span>}
                          </div>
                        </div>}
                      </>}
                    </div>
                  </div>
                );
              })}

              {standardFieldVisibility.section_fitp_enabled !== false && ['fitp_card_number','fitp_card_type','fitp_sport_year','fitp_classification','fitp_issue_date','fitp_expiry_date','fitp_status','fitp_notes'].some(showStandardField) && <div style={{display:'grid',gap:12}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
                  <h4 style={{margin:0,fontSize:13,color:'#557b42'}}>TESSERAMENTO FITP</h4>
                  <button type="button" className="password-button"
                    onClick={() => {
                      if (!currentFitp) addFitpRecord();
                      else if (fitpNeedsRenewal) addFitpRecord();
                      else setFitpEditing(true);
                    }} style={{display:'inline-flex',alignItems:'center',gap:6}}>
                    <Plus size={14}/>{!currentFitp ? 'Inserisci tessera FITP' : fitpNeedsRenewal ? 'Inserisci rinnovo' : 'Modifica'}
                  </button>
                </div>
                {fitpRecords.length === 0 && <p className="muted" style={{margin:0,fontSize:12}}>Nessun tesseramento registrato.</p>}
                {fitpRecords.map((item, index) => (
                  <div key={item.id || `fitp-${index}`} style={{display:'grid',gap:10,padding:12,border:'1px solid #e2e9e1',borderRadius:12,background:'#fbfcfa'}}>
                    <strong style={{fontSize:12,color:'#405b43'}}>{index === 0 ? 'Tessera corrente' : `Storico tessera ${index}`}</strong>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
                      {showStandardField('fitp_card_number') && <label style={labelStyle}>Numero tessera<input style={fieldStyle} value={item.card_number || ''} disabled={!!item.id && !(index === 0 && fitpEditing)} onChange={e=>updateFitpRecord(index,'card_number',e.target.value)}/></label>}
                      {showStandardField('fitp_card_type') && <label style={labelStyle}>Tipo tessera<input style={fieldStyle} value={item.card_type || ''} disabled={!!item.id && !(index === 0 && fitpEditing)} onChange={e=>updateFitpRecord(index,'card_type',e.target.value)} placeholder="Es. atleta"/></label>}
                      {showStandardField('fitp_sport_year') && <label style={labelStyle}>Anno sportivo<input style={fieldStyle} type="number" value={item.sport_year || ''} disabled={!!item.id && !(index === 0 && fitpEditing)} onChange={e=>updateFitpRecord(index,'sport_year',e.target.value)}/></label>}
                      {showStandardField('fitp_classification') && <label style={labelStyle}>Classificazione<input style={fieldStyle} value={item.classification || ''} disabled={!!item.id && !(index === 0 && fitpEditing)} onChange={e=>updateFitpRecord(index,'classification',e.target.value)}/></label>}
                      {showStandardField('fitp_issue_date') && <label style={labelStyle}>Data emissione<input style={fieldStyle} type="date" value={item.issue_date || ''} disabled={!!item.id && !(index === 0 && fitpEditing)} onChange={e=>updateFitpRecord(index,'issue_date',e.target.value)}/></label>}
                      {showStandardField('fitp_expiry_date') && <label style={labelStyle}>Scadenza<input style={fieldStyle} type="date" value={item.expiry_date || ''} disabled={!!item.id && !(index === 0 && fitpEditing)} onChange={e=>updateFitpRecord(index,'expiry_date',e.target.value)}/></label>}
                      {showStandardField('fitp_status') && <label style={labelStyle}>Stato
                        {index === 0 && !fitpEditing ? (
                          <div style={{...fieldStyle,display:'flex',alignItems:'center',minHeight:42,background:'#f8faf7'}}>
                            {item.status === 'active' && fitpDaysLeft !== null && fitpDaysLeft < 0 ? 'Scaduta' : ({active:'Attiva',expired:'Scaduta',pending:'In attesa',cancelled:'Annullata'}[item.status] || item.status || 'Attiva')}
                          </div>
                        ) : (
                          <select style={fieldStyle} value={item.status || 'active'} disabled={!!item.id && !(index === 0 && fitpEditing)} onChange={e=>updateFitpRecord(index,'status',e.target.value)}>
                            <option value="active">Attiva</option><option value="expired">Scaduta</option><option value="pending">In attesa</option><option value="cancelled">Annullata</option>
                          </select>
                        )}
                      </label>}
                    </div>
                    {showStandardField('fitp_notes') && <label style={labelStyle}>Note<input style={fieldStyle} value={item.notes || ''} disabled={!!item.id && !(index === 0 && fitpEditing)} onChange={e=>updateFitpRecord(index,'notes',e.target.value)}/></label>}
                  </div>
                ))}
              </div>}

              {standardFieldVisibility.section_medical_enabled !== false && ['medical_regularity_status','medical_presented_date','medical_expiry_date','medical_verified_at'].some(showStandardField) && <div style={{display:'grid',gap:12}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
                  <div>
                    <h4 style={{margin:0,fontSize:13,color:'#557b42'}}>CERTIFICATO MEDICO</h4>
                    <p className="muted" style={{margin:'4px 0 0',fontSize:11}}>Gestione riservata al super amministratore. Le registrazioni precedenti vengono conservate.</p>
                  </div>
                  {!currentMedical ? (
                    <button type="button" className="password-button" onClick={addMedicalRecord} style={{display:'inline-flex',alignItems:'center',gap:6,marginLeft:'auto'}}><Plus size={14}/>Inserisci certificato</button>
                  ) : (
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginLeft:'auto'}}>
                      <button type="button" className="password-button" onClick={() => setMedicalEditing(true)} style={{display:'inline-flex',alignItems:'center',gap:6}}>Modifica</button>
                      {medicalNeedsRenewal && <button type="button" className="password-button" onClick={addMedicalRecord} style={{display:'inline-flex',alignItems:'center',gap:6}}><Plus size={14}/>Inserisci rinnovo</button>}
                    </div>
                  )}
                </div>
                {medicalRecords.length === 0 && <p className="muted" style={{margin:0,fontSize:12}}>Nessun certificato medico registrato.</p>}
                {medicalRecords.map((item, index) => (
                  <div key={item.id || `medical-${index}`} style={{display:'grid',gap:10,padding:12,border:'1px solid #e2e9e1',borderRadius:12,background:'#fbfcfa'}}>
                    <strong style={{fontSize:12,color:'#405b43'}}>{index === 0 ? 'Certificato corrente' : `Storico certificato ${index}`}{item.created_at ? ` · inserito il ${new Date(item.created_at).toLocaleDateString('it-IT')}` : ' · nuovo'}</strong>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10}}>
                      {showStandardField('medical_regularity_status') && <label style={labelStyle}>Stato di regolarità
                        {index === 0 && !medicalEditing ? (
                          <div style={{...fieldStyle,display:'flex',alignItems:'center',minHeight:42,background:'#f8faf7'}}>
                            {['not_presented','not_required'].includes(item.regularity_status) ? (item.regularity_status === 'not_presented' ? 'Non presentato' : 'Non richiesto') : medicalDaysLeft !== null && medicalDaysLeft < 0 ? 'Scaduto' : medicalDaysLeft !== null && medicalDaysLeft <= 30 ? 'In scadenza' : ({regular:'Regolare',expiring:'In scadenza',expired:'Scaduto'}[item.regularity_status] || item.regularity_status || 'Non presentato')}
                          </div>
                        ) : (
                          <select style={fieldStyle} value={item.regularity_status || 'not_presented'} disabled={!!item.id && !(index === 0 && medicalEditing)} onChange={e=>updateMedicalRecord(index,'regularity_status',e.target.value)}>
                            <option value="regular">Regolare</option><option value="expiring">In scadenza</option><option value="expired">Scaduto</option><option value="not_presented">Non presentato</option><option value="not_required">Non richiesto</option>
                          </select>
                        )}
                      </label>}
                      {showStandardField('medical_presented_date') && <label style={labelStyle}>Data presentazione<input style={fieldStyle} type="date" value={item.presented_date || ''} disabled={!!item.id && !(index === 0 && medicalEditing)} onChange={e=>updateMedicalRecord(index,'presented_date',e.target.value)}/></label>}
                      {showStandardField('medical_expiry_date') && <label style={labelStyle}>Data scadenza<input style={fieldStyle} type="date" value={item.expiry_date || ''} disabled={!!item.id && !(index === 0 && medicalEditing)} onChange={e=>updateMedicalRecord(index,'expiry_date',e.target.value)}/></label>}
                    </div>
                    {showStandardField('medical_verified_at') && item.verified_at && <small className="muted">Ultima verifica: {new Date(item.verified_at).toLocaleString('it-IT')}</small>}
                  </div>
                ))}
              </div>}

              {standardFieldVisibility.section_sport_enabled !== false && ['sport_activity_type','sport_title','sport_season','sport_coach_name','sport_playing_level','sport_start_date','sport_end_date','sport_status','sport_competitive','sport_notes'].some(showStandardField) && <div style={{display:'grid',gap:12}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
                  <h4 style={{margin:0,fontSize:13,color:'#557b42'}}>ATTIVITÀ SPORTIVE</h4>
                  <button type="button" className="password-button" onClick={addSportRecord} style={{display:'inline-flex',alignItems:'center',gap:6}}><Plus size={14}/> Aggiungi attività</button>
                </div>
                {sportRecords.length === 0 && <p className="muted" style={{margin:0,fontSize:12}}>Nessuna attività registrata.</p>}
                {sportRecords.map((item, index) => (
                  <div key={item.id || `sport-${index}`} style={{display:'grid',gap:10,padding:12,border:'1px solid #e2e9e1',borderRadius:12,background:'#fbfcfa'}}>
                    <strong style={{fontSize:12,color:'#405b43'}}>Attività {index + 1}</strong>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:10}}>
                      {showStandardField('sport_activity_type') && <label style={labelStyle}>Tipo attività
                        <select style={fieldStyle} value={item.activity_type || 'course'} onChange={e=>updateSportRecord(index,'activity_type',e.target.value)}>
                          <option value="course">Corso</option><option value="lesson">Lezione</option><option value="team">Squadra</option><option value="tournament">Torneo</option><option value="competition">Competizione</option><option value="other">Altro</option>
                        </select>
                      </label>}
                      {showStandardField('sport_title') && <label style={labelStyle}>Nome attività<input style={fieldStyle} value={item.title || ''} onChange={e=>updateSportRecord(index,'title',e.target.value)} placeholder="Nome attività"/></label>}
                      {showStandardField('sport_season') && <label style={labelStyle}>Stagione sportiva<input style={fieldStyle} value={item.season || ''} onChange={e=>updateSportRecord(index,'season',e.target.value)} placeholder="Es. 2026/2027"/></label>}
                      {showStandardField('sport_coach_name') && <label style={labelStyle}>Istruttore<input style={fieldStyle} value={item.coach_name || ''} onChange={e=>updateSportRecord(index,'coach_name',e.target.value)}/></label>}
                      {showStandardField('sport_playing_level') && <label style={labelStyle}>Livello di gioco<input style={fieldStyle} value={item.playing_level || ''} onChange={e=>updateSportRecord(index,'playing_level',e.target.value)}/></label>}
                      {showStandardField('sport_start_date') && <label style={labelStyle}>Data inizio<input style={fieldStyle} type="date" value={item.start_date || ''} onChange={e=>updateSportRecord(index,'start_date',e.target.value)}/></label>}
                      {showStandardField('sport_end_date') && <label style={labelStyle}>Data fine<input style={fieldStyle} type="date" value={item.end_date || ''} onChange={e=>updateSportRecord(index,'end_date',e.target.value)}/></label>}
                      {showStandardField('sport_status') && <label style={labelStyle}>Stato
                        <select style={fieldStyle} value={item.status || 'active'} onChange={e=>updateSportRecord(index,'status',e.target.value)}>
                          <option value="active">Attiva</option><option value="completed">Completata</option><option value="cancelled">Annullata</option>
                        </select>
                      </label>}
                      {showStandardField('sport_competitive') && <label style={{...labelStyle,display:'flex',alignItems:'center',gap:8,alignSelf:'end',padding:'10px 0'}}>
                        <input type="checkbox" checked={!!item.competitive} onChange={e=>updateSportRecord(index,'competitive',e.target.checked)} style={{accentColor:'#557b42',width:16,height:16}}/>
                        Attività agonistica
                      </label>}
                    </div>
                    {showStandardField('sport_notes') && <label style={labelStyle}>Note<input style={fieldStyle} value={item.notes || ''} onChange={e=>updateSportRecord(index,'notes',e.target.value)}/></label>}
                  </div>
                ))}
              </div>}

              {configurationFields.filter(field => field.active && field.visible).length > 0 && <div style={{display:'grid',gap:14}}>
                {Object.entries(configurationFields.filter(field => field.active && field.visible).reduce((groups, field) => { const section = (field.section || 'Altri dati').trim(); (groups[section] ||= []).push(field); return groups; }, {})).map(([section, fields]) => <div key={section} style={{display:'grid',gap:10,padding:13,border:'1px solid #e2e9e1',borderRadius:13,background:'#fbfcfa'}}>
                  <h4 style={{margin:0,fontSize:13,color:'#557b42'}}>{section.toUpperCase()}</h4>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10}}>
                    {fields.map(field => { const value = customValues[field.id]; const setValue = next => updateCustomValue(field.id,next); const common = {style:fieldStyle,required:!!field.required};
                      if (field.data_type === 'boolean') return <label key={field.id} style={{...labelStyle,display:'flex',alignItems:'center',gap:8,padding:'10px 0'}}><input type="checkbox" checked={value === true || value === 'true'} onChange={e=>setValue(e.target.checked)} style={{accentColor:'#557b42',width:17,height:17}}/>{field.label}{field.required?' *':''}</label>;
                      if (field.data_type === 'single_select') return <label key={field.id} style={labelStyle}>{field.label}{field.required?' *':''}<select {...common} value={value ?? ''} onChange={e=>setValue(e.target.value)}><option value="">Seleziona…</option>{(field.options || []).map(option=><option key={option} value={option}>{option}</option>)}</select></label>;
                      if (field.data_type === 'multi_select') return <fieldset key={field.id} style={{border:'1px solid #dce4dc',borderRadius:10,padding:10,display:'grid',gap:7}}><legend style={{fontSize:12,fontWeight:700,color:'#526258'}}>{field.label}{field.required?' *':''}</legend>{(field.options || []).map(option=><label key={option} style={{display:'flex',gap:7,alignItems:'center',fontSize:12}}><input type="checkbox" checked={Array.isArray(value) && value.includes(option)} onChange={e=>setValue(e.target.checked?[...(Array.isArray(value)?value:[]),option]:(value||[]).filter(v=>v!==option))}/>{option}</label>)}</fieldset>;
                      if (field.data_type === 'long_text') return <label key={field.id} style={{...labelStyle,gridColumn:'1/-1'}}>{field.label}{field.required?' *':''}<textarea rows={3} {...common} value={value ?? ''} onChange={e=>setValue(e.target.value)}/></label>;
                      const inputType = field.data_type === 'date' ? 'date' : ['number','decimal','currency'].includes(field.data_type) ? 'number' : field.data_type === 'email' ? 'email' : field.data_type === 'url' ? 'url' : field.data_type === 'phone' ? 'tel' : 'text';
                      return <label key={field.id} style={labelStyle}>{field.label}{field.required?' *':''}<input {...common} type={inputType} step={['decimal','currency'].includes(field.data_type)?'0.01':undefined} value={value ?? ''} onChange={e=>setValue(e.target.value)}/></label>;
                    })}
                  </div>
                </div>)}
              </div>}

              {showStandardField('internal_notes') && <label style={labelStyle}>
                Note interne
                <textarea name="internal_notes" rows={4} value={form.internal_notes}
                  onChange={changeField} style={{...fieldStyle,resize:'vertical'}}/>
              </label>}

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
