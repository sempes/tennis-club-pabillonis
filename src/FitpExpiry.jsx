import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, RefreshCw, ShieldCheck, AlertTriangle, CheckCircle2, Clock3 } from 'lucide-react';
import { supabase } from './supabase';

const dateLabel = value => value
  ? new Date(`${value}T12:00:00`).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })
  : 'Non indicata';

function getLevel(card) {
  if (card.status === 'cancelled') return 'cancelled';
  if (card.status === 'expired' || (card.expiry_date && card.expiry_date < new Date().toISOString().slice(0, 10))) return 'expired';
  if (card.status === 'pending') return 'pending';
  if (!card.expiry_date) return 'unknown';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(`${card.expiry_date}T00:00:00`);
  const days = Math.ceil((expiry - today) / 86400000);
  if (days <= 7) return 'urgent';
  if (days <= 30) return 'warning';
  return 'ok';
}

const levelInfo = {
  expired: { label: 'Scaduta', color: '#a33b32', background: '#fff0ee', icon: AlertTriangle },
  urgent: { label: 'In scadenza · entro 7 giorni', color: '#a33b32', background: '#fff0ee', icon: AlertTriangle },
  warning: { label: 'In scadenza · entro 30 giorni', color: '#8a641b', background: '#fff7e5', icon: Clock3 },
  pending: { label: 'In attesa', color: '#526258', background: '#f1f4f1', icon: Clock3 },
  unknown: { label: 'Scadenza non indicata', color: '#526258', background: '#f1f4f1', icon: Clock3 },
  ok: { label: 'Regolare', color: '#326344', background: '#edf7ef', icon: CheckCircle2 },
  cancelled: { label: 'Annullata', color: '#68736b', background: '#f1f4f1', icon: Clock3 }
};

export default function FitpExpiry({ profile }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isSuperAdmin = profile?.role === 'super_admin';

  const loadCards = useCallback(async () => {
    setLoading(true);
    setError('');
    const { data, error: rpcError } = await supabase.rpc('get_fitp_expiry_overview');
    if (rpcError) {
      setCards([]);
      setError('Non è stato possibile caricare le scadenze FITP: ' + rpcError.message);
    } else {
      setCards((data || []).filter(card => card.status !== 'cancelled'));
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadCards(); }, [loadCards]);

  const rows = useMemo(() => cards.map(card => ({ ...card, level: getLevel(card) }))
    .sort((a, b) => {
      const da = a.expiry_date || '9999-12-31';
      const db = b.expiry_date || '9999-12-31';
      return da.localeCompare(db) || String(a.member_name || '').localeCompare(String(b.member_name || ''), 'it');
    }), [cards]);

  const urgentCount = rows.filter(row => ['expired', 'urgent'].includes(row.level)).length;
  const warningCount = rows.filter(row => row.level === 'warning').length;

  return (
    <section className="admin-panel" style={{ display: 'grid', gap: 18 }}>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">TENNIS CLUB PABILLONIS</span>
          <h2>{isSuperAdmin ? 'Scadenze tessere FITP' : 'Le mie scadenze FITP'}</h2>
          <p className="muted" style={{ margin: 0 }}>
            {isSuperAdmin
              ? 'Riepilogo riservato al super amministratore. Gli avvisi sono visibili anche al socio interessato.'
              : 'Consulta lo stato della tua tessera e le eventuali scadenze.'}
          </p>
        </div>
        <button type="button" className="password-button" onClick={loadCards}
          disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <RefreshCw size={15}/> Aggiorna
        </button>
      </div>

      {isSuperAdmin && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
        <div style={{ padding: 15, borderRadius: 13, background: '#fff0ee', border: '1px solid #f1d3cf' }}>
          <strong style={{ display: 'block', fontSize: 25, color: '#a33b32' }}>{urgentCount}</strong>
          <span style={{ fontSize: 12, color: '#75423c' }}>Scadute o entro 7 giorni</span>
        </div>
        <div style={{ padding: 15, borderRadius: 13, background: '#fff7e5', border: '1px solid #f0e2bd' }}>
          <strong style={{ display: 'block', fontSize: 25, color: '#8a641b' }}>{warningCount}</strong>
          <span style={{ fontSize: 12, color: '#75613a' }}>In scadenza entro 30 giorni</span>
        </div>
        <div style={{ padding: 15, borderRadius: 13, background: '#edf7ef', border: '1px solid #d7e9d9' }}>
          <strong style={{ display: 'block', fontSize: 25, color: '#326344' }}>{rows.filter(row => row.level === 'ok').length}</strong>
          <span style={{ fontSize: 12, color: '#42634b' }}>Regolari</span>
        </div>
      </div>}

      {error && <div role="alert" style={{ padding: 13, borderRadius: 11, background: '#fff0ee', color: '#963c32' }}>{error}</div>}
      {loading ? <p className="muted">Caricamento scadenze…</p> : rows.length === 0 ? (
        <div style={{ padding: 28, border: '1px solid #e2e9e1', borderRadius: 15, background: '#fff', textAlign: 'center' }}>
          <CalendarDays size={30} color="#718078"/>
          <h3 style={{ margin: '9px 0 5px', color: '#304338' }}>Nessun tesseramento disponibile</h3>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            {isSuperAdmin ? 'Non risultano tessere FITP registrate.' : 'La tua tessera non risulta ancora collegata all’anagrafica del circolo. Contatta il super amministratore.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {rows.map(card => {
            const info = levelInfo[card.level] || levelInfo.unknown;
            const StatusIcon = info.icon;
            const days = card.expiry_date
              ? Math.ceil((new Date(`${card.expiry_date}T00:00:00`) - new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`)) / 86400000)
              : null;
            return (
              <article key={card.id} style={{ display: 'grid', gap: 10, padding: 15, border: '1px solid #e2e9e1', borderRadius: 14, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    {isSuperAdmin && <strong style={{ display: 'block', color: '#304338', marginBottom: 5 }}>{card.member_name || 'Socio non indicato'}</strong>}
                    <strong style={{ color: '#304338' }}>{card.card_type || 'Tessera FITP'}{card.sport_year ? ` · ${card.sport_year}` : ''}</strong>
                    <div style={{ fontSize: 12, color: '#718078', marginTop: 4 }}>Numero tessera: {card.card_number || 'Non indicato'}</div>
                  </div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 20, background: info.background, color: info.color, fontSize: 11, fontWeight: 800 }}>
                    <StatusIcon size={14}/>{info.label}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12, color: '#526258' }}>
                  <span>Emissione: <strong>{dateLabel(card.issue_date)}</strong></span>
                  <span>Scadenza: <strong>{dateLabel(card.expiry_date)}</strong></span>
                  {days !== null && <strong style={{ color: days < 0 ? '#a33b32' : days <= 7 ? '#a33b32' : days <= 30 ? '#8a641b' : '#326344' }}>
                    {days < 0 ? `Scaduta da ${Math.abs(days)} giorni` : days === 0 ? 'Scade oggi' : `Scade tra ${days} giorni`}
                  </strong>}
                </div>
                {card.classification && <div style={{ fontSize: 12, color: '#526258' }}>Classificazione: {card.classification}</div>}
              </article>
            );
          })}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#718078', fontSize: 11 }}>
        <ShieldCheck size={14}/> Le scadenze FITP non modificano l’accesso all’app né le possibilità di prenotazione.
      </div>
    </section>
  );
}
