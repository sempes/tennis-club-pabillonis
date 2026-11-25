import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, RefreshCw, ShieldCheck, AlertTriangle, CheckCircle2, Clock3, HeartPulse, CreditCard } from 'lucide-react';
import { supabase } from './supabase';

const todayISO = () => new Date().toISOString().slice(0, 10);
const dateLabel = value => value
  ? new Date(`${value}T12:00:00`).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
  : 'Non indicata';

function daysUntil(value) {
  if (!value) return null;
  const today = new Date(`${todayISO()}T00:00:00`);
  const expiry = new Date(`${value}T00:00:00`);
  return Math.round((expiry - today) / 86400000);
}

function getFitpLevel(card) {
  if (card.status === 'cancelled') return 'cancelled';
  if (card.status === 'expired' || (card.expiry_date && card.expiry_date < todayISO())) return 'expired';
  if (card.status === 'pending') return 'pending';
  const days = daysUntil(card.expiry_date);
  if (days === null) return 'unknown';
  if (days <= 7) return 'urgent';
  if (days <= 30) return 'warning';
  return 'ok';
}

function getMedicalLevel(record) {
  if (record.notice_level && medicalLevelInfo[record.notice_level]) return record.notice_level;
  if (record.status === 'not_required') return 'not_required';
  if (record.status === 'not_presented') return 'not_presented';
  if (record.status === 'expired' || (record.expiry_date && record.expiry_date < todayISO())) return 'expired';
  const days = daysUntil(record.expiry_date);
  if (days !== null && days <= 7) return 'urgent';
  if (days !== null && days <= 30) return 'warning';
  if (record.status === 'expiring') return 'warning';
  if (record.status === 'regular' || days !== null) return 'ok';
  return 'unknown';
}

const fitpLevelInfo = {
  expired: { label: 'Scaduta', color: '#a33b32', background: '#fff0ee', icon: AlertTriangle },
  urgent: { label: 'In scadenza · entro 7 giorni', color: '#a33b32', background: '#fff0ee', icon: AlertTriangle },
  warning: { label: 'In scadenza · entro 30 giorni', color: '#8a641b', background: '#fff7e5', icon: Clock3 },
  pending: { label: 'In attesa', color: '#526258', background: '#f1f4f1', icon: Clock3 },
  unknown: { label: 'Scadenza non indicata', color: '#526258', background: '#f1f4f1', icon: Clock3 },
  ok: { label: 'Regolare', color: '#326344', background: '#edf7ef', icon: CheckCircle2 },
  cancelled: { label: 'Annullata', color: '#68736b', background: '#f1f4f1', icon: Clock3 }
};

const medicalLevelInfo = {
  expired: { label: 'Scaduto', color: '#a33b32', background: '#fff0ee', icon: AlertTriangle },
  urgent: { label: 'In scadenza · entro 7 giorni', color: '#a33b32', background: '#fff0ee', icon: AlertTriangle },
  warning: { label: 'In scadenza · entro 30 giorni', color: '#8a641b', background: '#fff7e5', icon: Clock3 },
  ok: { label: 'Regolare', color: '#326344', background: '#edf7ef', icon: CheckCircle2 },
  not_presented: { label: 'Non presentato', color: '#8a641b', background: '#fff7e5', icon: Clock3 },
  not_required: { label: 'Non richiesto', color: '#526258', background: '#f1f4f1', icon: ShieldCheck },
  unknown: { label: 'Scadenza non indicata', color: '#526258', background: '#f1f4f1', icon: Clock3 }
};

function StatusPill({ info }) {
  const Icon = info.icon;
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 20, background: info.background, color: info.color, fontSize: 11, fontWeight: 800 }}><Icon size={14}/>{info.label}</span>;
}

function SectionHeading({ icon: Icon, title, description, count }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 38, height: 38, borderRadius: 11, background: '#edf4ef', color: '#326344', display: 'grid', placeItems: 'center' }}><Icon size={19}/></span>
      <div><h3 style={{ margin: 0, color: '#304338', fontSize: 17 }}>{title}</h3><p className="muted" style={{ margin: '3px 0 0', fontSize: 12 }}>{description}</p></div>
    </div>
    {typeof count === 'number' && <span style={{ fontSize: 12, color: '#718078' }}>{count} {count === 1 ? 'voce' : 'voci'}</span>}
  </div>;
}

export default function FitpExpiry({ profile }) {
  const [cards, setCards] = useState([]);
  const [medical, setMedical] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isSuperAdmin = profile?.role === 'super_admin';

  const loadExpiry = useCallback(async () => {
    setLoading(true);
    setError('');
    const [fitpResult, medicalResult] = await Promise.all([
      supabase.rpc('get_fitp_expiry_overview'),
      supabase.rpc('get_medical_expiry_overview')
    ]);
    const errors = [];
    if (fitpResult.error) errors.push('FITP: ' + fitpResult.error.message);
    if (medicalResult.error) errors.push('Certificati medici: ' + medicalResult.error.message);
    setCards(fitpResult.error ? [] : (fitpResult.data || []).filter(card => card.status !== 'cancelled'));
    setMedical(medicalResult.error ? [] : (medicalResult.data || []));
    setError(errors.join(' · '));
    setLoading(false);
  }, []);

  useEffect(() => { loadExpiry(); }, [loadExpiry]);

  const fitpRows = useMemo(() => cards.map(card => ({ ...card, level: getFitpLevel(card) }))
    .sort((a, b) => (a.expiry_date || '9999-12-31').localeCompare(b.expiry_date || '9999-12-31') || String(a.member_name || '').localeCompare(String(b.member_name || ''), 'it')), [cards]);
  const medicalRows = useMemo(() => medical.map(record => ({ ...record, level: getMedicalLevel(record) }))
    .sort((a, b) => (a.expiry_date || '9999-12-31').localeCompare(b.expiry_date || '9999-12-31') || String(a.member_name || '').localeCompare(String(b.member_name || ''), 'it')), [medical]);

  const fitpUrgent = fitpRows.filter(row => ['expired', 'urgent'].includes(row.level)).length;
  const medicalUrgent = medicalRows.filter(row => ['expired', 'urgent'].includes(row.level)).length;
  const medicalWarning = medicalRows.filter(row => row.level === 'warning').length;

  return (
    <section className="admin-panel" style={{ display: 'grid', gap: 22 }}>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">TENNIS CLUB PABILLONIS</span>
          <h2>{isSuperAdmin ? 'Scadenze FITP e certificati medici' : 'Le mie scadenze'}</h2>
          <p className="muted" style={{ margin: 0 }}>
            {isSuperAdmin
              ? 'Riepilogo riservato al super amministratore. Ogni socio visualizza esclusivamente le proprie scadenze.'
              : 'Consulta lo stato della tua tessera FITP e del certificato medico.'}
          </p>
        </div>
        <button type="button" className="password-button" onClick={loadExpiry} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <RefreshCw size={15}/> Aggiorna
        </button>
      </div>

      {isSuperAdmin && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
        <div style={{ padding: 15, borderRadius: 13, background: '#fff0ee', border: '1px solid #f1d3cf' }}><strong style={{ display: 'block', fontSize: 25, color: '#a33b32' }}>{fitpUrgent + medicalUrgent}</strong><span style={{ fontSize: 12, color: '#75423c' }}>Scadute o entro 7 giorni</span></div>
        <div style={{ padding: 15, borderRadius: 13, background: '#fff7e5', border: '1px solid #f0e2bd' }}><strong style={{ display: 'block', fontSize: 25, color: '#8a641b' }}>{fitpRows.filter(row => row.level === 'warning').length + medicalWarning}</strong><span style={{ fontSize: 12, color: '#75613a' }}>In scadenza entro 30 giorni</span></div>
        <div style={{ padding: 15, borderRadius: 13, background: '#edf7ef', border: '1px solid #d7e9d9' }}><strong style={{ display: 'block', fontSize: 25, color: '#326344' }}>{fitpRows.filter(row => row.level === 'ok').length + medicalRows.filter(row => row.level === 'ok').length}</strong><span style={{ fontSize: 12, color: '#42634b' }}>Regolari</span></div>
      </div>}

      {error && <div role="alert" style={{ padding: 13, borderRadius: 11, background: '#fff0ee', color: '#963c32' }}>Attenzione: {error}</div>}
      {loading ? <p className="muted">Caricamento scadenze…</p> : <>
        <div style={{ display: 'grid', gap: 12 }}>
          <SectionHeading icon={CreditCard} title="Tessera FITP" description="Tesseramento e relativa data di scadenza" count={fitpRows.length}/>
          {fitpRows.length === 0 ? <div style={{ padding: 22, border: '1px solid #e2e9e1', borderRadius: 14, background: '#fff', color: '#718078', fontSize: 13 }}>{isSuperAdmin ? 'Non risultano tessere FITP registrate.' : 'La tua tessera non risulta ancora collegata all’anagrafica del circolo. Contatta il super amministratore.'}</div> : <div style={{ display: 'grid', gap: 10 }}>
            {fitpRows.map(card => {
              const info = fitpLevelInfo[card.level] || fitpLevelInfo.unknown;
              const days = daysUntil(card.expiry_date);
              return <article key={card.id} style={{ display: 'grid', gap: 10, padding: 15, border: '1px solid #e2e9e1', borderRadius: 14, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div style={{ minWidth: 0 }}>
                  {isSuperAdmin && <strong style={{ display: 'block', color: '#304338', marginBottom: 5 }}>{card.member_name || 'Socio non indicato'}</strong>}
                  <strong style={{ color: '#304338' }}>{card.card_type || 'Tessera FITP'}{card.sport_year ? ` · ${card.sport_year}` : ''}</strong>
                  <div style={{ fontSize: 12, color: '#718078', marginTop: 4 }}>Numero tessera: {card.card_number || 'Non indicato'}</div>
                </div><StatusPill info={info}/></div>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: '#526258' }}><span>Emissione: <strong>{dateLabel(card.issue_date)}</strong></span><span>Scadenza: <strong>{dateLabel(card.expiry_date)}</strong></span>
                  {days !== null && <strong style={{ color: days < 0 ? '#a33b32' : days <= 7 ? '#a33b32' : days <= 30 ? '#8a641b' : '#326344' }}>{days < 0 ? `Scaduta da ${Math.abs(days)} giorni` : days === 0 ? 'Scade oggi' : `Scade tra ${days} giorni`}</strong>}
                </div>
                {card.classification && <div style={{ fontSize: 12, color: '#526258' }}>Classificazione: {card.classification}</div>}
              </article>;
            })}
          </div>}
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <SectionHeading icon={HeartPulse} title="Certificato medico" description="Regolarità e data di scadenza del certificato" count={medicalRows.length}/>
          {medicalRows.length === 0 ? <div style={{ padding: 22, border: '1px solid #e2e9e1', borderRadius: 14, background: '#fff', color: '#718078', fontSize: 13 }}>{isSuperAdmin ? 'Non risultano certificati medici registrati.' : 'Non risulta ancora un certificato medico collegato alla tua anagrafica. Per informazioni, contatta il super amministratore.'}</div> : <div style={{ display: 'grid', gap: 10 }}>
            {medicalRows.map(record => {
              const info = medicalLevelInfo[record.level] || medicalLevelInfo.unknown;
              const days = daysUntil(record.expiry_date);
              return <article key={record.id} style={{ display: 'grid', gap: 10, padding: 15, border: '1px solid #e2e9e1', borderRadius: 14, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div style={{ minWidth: 0 }}>
                  {isSuperAdmin && <strong style={{ display: 'block', color: '#304338', marginBottom: 5 }}>{record.member_name || 'Socio non indicato'}</strong>}
                  <strong style={{ color: '#304338' }}>Certificato medico</strong>
                </div><StatusPill info={info}/></div>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: '#526258' }}><span>Presentato il: <strong>{dateLabel(record.presented_date)}</strong></span><span>Scadenza: <strong>{dateLabel(record.expiry_date)}</strong></span>
                  {days !== null && record.status !== 'not_required' && record.status !== 'not_presented' && <strong style={{ color: days < 0 ? '#a33b32' : days <= 7 ? '#a33b32' : days <= 30 ? '#8a641b' : '#326344' }}>{days < 0 ? `Scaduto da ${Math.abs(days)} giorni` : days === 0 ? 'Scade oggi' : `Scade tra ${days} giorni`}</strong>}
                </div>
              </article>;
            })}
          </div>}
        </div>
      </>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#718078', fontSize: 11 }}><ShieldCheck size={14}/> Le scadenze non modificano l’accesso all’app né le possibilità di prenotazione. I dati sono consultabili, ma non modificabili da questa schermata.</div>
    </section>
  );
}
