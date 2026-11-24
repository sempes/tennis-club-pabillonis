
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, CalendarDays, Clock3, LogOut, Plus, ShieldCheck,
  Sparkles, X, KeyRound, LockKeyhole, ChevronDown, Search,
  BookOpen, Pencil, Save, Bell, Pin, Trash2
} from 'lucide-react';
import { configured, supabase } from './supabase';
import clubLogo from '../logo-tennis-club-pabillonis.jpeg';
import clabLogo from '../logo-clabc-solutions.png';

const pad = n => String(n).padStart(2, '0');
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const prettyDate = d => new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long'}).format(d);
const hours = Array.from({length:24},(_,i)=>`${pad(i)}:00`);
const timeToMinutes = value => {
  const [hour='0', minute='0'] = String(value || '00:00').slice(0,5).split(':');
  return Number(hour) * 60 + Number(minute);
};
// Converte una data in un numero progressivo di giorni.
// Permette di confrontare correttamente orari su date diverse.
const dateToDayNumber = date => {
  const [year, month, day] = date.split('-').map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
};

// Inizio assoluto di un evento in minuti.
const eventStartAbsolute = event =>
  dateToDayNumber(event.event_date) * 1440 +
  timeToMinutes(event.start_time);

// Fine assoluta dell'evento.
// Se l'orario di fine è uguale o precedente all'inizio,
// l'evento termina il giorno successivo.
const eventEndAbsolute = event => {
  const start = eventStartAbsolute(event);

  let end =
    dateToDayNumber(event.event_date) * 1440 +
    timeToMinutes(event.end_time);

  if (end <= start) {
    end += 1440;
  }

  return end;
};
// Inizio assoluto di una prenotazione in minuti.
const bookingStartAbsolute = booking =>
  dateToDayNumber(booking.booking_date) * 1440 +
  timeToMinutes(booking.start_time);

// Fine effettiva: 60 minuti per singolo, 120 per doppio.
const bookingEndAbsolute = booking =>
  bookingStartAbsolute(booking) +
  (booking.booking_type === 'doubles' ? 120 : 60);

/* VISUALIZZA IL COGNOME PRIMA DEL NOME */
function surnameFirst(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);

  if (parts.length < 2) return fullName;

  const firstName = parts[0];
  const surname = parts.slice(1).join(' ');

  return `${surname} ${firstName}`;
}

/* ORDINA ALFABETICAMENTE PER COGNOME */
function sortBySurname(a, b) {
  const surnameA = String(a.full_name || '').trim().split(/\s+/).slice(1).join(' ');
  const surnameB = String(b.full_name || '').trim().split(/\s+/).slice(1).join(' ');

  const comparison = surnameA.localeCompare(surnameB, 'it', {
    sensitivity: 'base'
  });

  if (comparison !== 0) return comparison;

  return String(a.full_name || '').localeCompare(
    String(b.full_name || ''),
    'it',
    { sensitivity: 'base' }
  );
}


function Brand({ sidebar = false }) {
  if (sidebar) {
    return (
      <div className="brand brand-sidebar">
        <span className="brand-sidebar-title">
          TC PABILLONIS
        </span>

        <img
          className="club-logo"
          src={clubLogo}
          alt="Tennis Club Pabillonis"
        />
      </div>
    );
  }

  return (
    <div className="brand">
      <img
        className="club-logo"
        src={clubLogo}
        alt="Tennis Club Pabillonis"
      />

      <span style={{
        fontSize: 'clamp(14px, 4.2vw, 28px)',
        fontWeight: 700,
        whiteSpace: 'nowrap'
      }}>
        TC PABILLONIS
        <span style={{
          display: 'inline-block',
          marginLeft: '7px',
          fontSize: '0.9em',
          verticalAlign: '-0.05em'
        }}>
          🎾
        </span>
      </span>
    </div>
  );
}

function ClabFooter() {
  return (
    <footer className="app-footer">
      <span>Applicazione realizzata da</span>
      <img src={clabLogo} alt="CLAB.C Solutions" />
    </footer>
  );
}

/* CAMPO DA TENNIS AZZURRO */
function TennisCourt() {
  return (
    <div
      className="tennis-court-graphic"
      style={{
        width: '100%',
        aspectRatio: '720 / 300',
        overflow: 'hidden',
        borderRadius: '18px',
        lineHeight: 0
      }}
    >
      <svg
        viewBox="0 0 720 300"
        width="100%"
        height="100%"
        role="img"
        aria-label="Campo da tennis azzurro visto dall'alto"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="tennisOuter" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#07539a"/>
            <stop offset="100%" stopColor="#06366e"/>
          </linearGradient>

          <linearGradient id="tennisSurface" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#159de8"/>
            <stop offset="100%" stopColor="#0878c5"/>
          </linearGradient>
        </defs>

        <rect width="720" height="300" fill="url(#tennisOuter)"/>
        <rect x="140" y="48" width="440" height="204" fill="url(#tennisSurface)"/>

        <g fill="none" stroke="#ffffff" strokeWidth="3">
          <rect x="140" y="48" width="440" height="204"/>
          <line x1="140" y1="73.5" x2="580" y2="73.5"/>
          <line x1="140" y1="226.5" x2="580" y2="226.5"/>
          <line x1="242" y1="73.5" x2="242" y2="226.5"/>
          <line x1="478" y1="73.5" x2="478" y2="226.5"/>
          <line x1="242" y1="150" x2="478" y2="150"/>
        </g>

        <rect x="355" y="45" width="10" height="210" rx="2" fill="#18374c"/>
        <line x1="360" y1="48" x2="360" y2="252"
          stroke="#ffffff" strokeWidth="1" opacity=".7"/>

        <rect x="352" y="43" width="16" height="5" rx="2" fill="#ffffff"/>
        <rect x="352" y="252" width="16" height="5" rx="2" fill="#ffffff"/>

        <text x="690" y="280" textAnchor="end" fill="#ffffff"
          fontSize="11" letterSpacing="3" fontWeight="500">
          TENNIS CLUB PABILLONIS
        </text>
      </svg>
    </div>
  );
}

function App() {
  const [session,setSession] = useState(null);
  const [profile,setProfile] = useState(null);
  const [members,setMembers] = useState([]);
  const [allMembers,setAllMembers] = useState([]);
  const [adminProfiles,setAdminProfiles] = useState([]);
  const [bookings,setBookings] = useState([]);
  // Storico separato: legge soltanto booking_history e non interviene sulle prenotazioni.
  const [bookingHistory,setBookingHistory] = useState([]);
  const [historyLoading,setHistoryLoading] = useState(false);
  const [historyDateFilter,setHistoryDateFilter] = useState('');
  const [historyMemberFilter,setHistoryMemberFilter] = useState('all');
  const [historyCourtFilter,setHistoryCourtFilter] = useState('all');
  const [historyTypeFilter,setHistoryTypeFilter] = useState('all');
  const [expandedHistoryId,setExpandedHistoryId] = useState(null);
  const [memberListSearch,setMemberListSearch] = useState('');
  const [historyError,setHistoryError] = useState('');
  const [events,setEvents] = useState([]);
  // Stato separato della bacheca: non modifica i dati delle prenotazioni.
  const [announcements,setAnnouncements] = useState([]);
  const [announcementReadIds,setAnnouncementReadIds] = useState([]);
  const [selectedAnnouncement,setSelectedAnnouncement] = useState(null);
  const [announcementForm,setAnnouncementForm] = useState({
    title:'', content:'', category:'Avviso', is_pinned:false
  });
  const [editingAnnouncementId,setEditingAnnouncementId] = useState(null);
  const [savingAnnouncement,setSavingAnnouncement] = useState(false);
  const [announcementAttachment,setAnnouncementAttachment] = useState(null);
  const [selectedAnnouncementAttachmentUrl,setSelectedAnnouncementAttachmentUrl] = useState('');
  const [eventForm,setEventForm] = useState({
  title:'',
  description:'',
  event_date:dateKey(new Date()),
  start_time:'09:00',
  end_time:'10:00',
  court_ids:['1']
});
const [savingEvent,setSavingEvent] = useState(false);
  const [selectedDate,setSelectedDate] = useState(dateKey(new Date()));
  const [court,setCourt] = useState('all');
  const [loading,setLoading] = useState(false);
  const [notice,setNotice] = useState('');
  const [isOnline,setIsOnline] = useState(navigator.onLine);
  const [updateAvailable,setUpdateAvailable] = useState(false);

  useEffect(() => {
    const handleUpdateAvailable = () => setUpdateAvailable(true);
    window.addEventListener('tc-app-update-available', handleUpdateAvailable);
    return () => window.removeEventListener('tc-app-update-available', handleUpdateAvailable);
  }, []);

  function applyAppUpdate() {
    window.dispatchEvent(new Event('tc-app-update-apply'));
  }

  useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);
  const [loginEmail,setLoginEmail] = useState('');
  const [loginPassword,setLoginPassword] = useState('');
  const [recoveryMode,setRecoveryMode] = useState(false);
  const [pendingRecoveryTokenHash,setPendingRecoveryTokenHash] = useState('');
  const [verifyingRecovery,setVerifyingRecovery] = useState(false);
  const [sendingRecovery,setSendingRecovery] = useState(false);
  const [recoveryPassword,setRecoveryPassword] = useState('');
  const [confirmRecoveryPassword,setConfirmRecoveryPassword] = useState('');
  const [showBooking,setShowBooking] = useState(false);
  const [showAdminBooking,setShowAdminBooking] = useState(false);
  const [savingAdminBooking,setSavingAdminBooking] = useState(false);
  const [adminBooking,setAdminBooking] = useState({
    court_id:'1',time:'',type:'singles',players:['','','',''],guests:['','','','']
  });
  const [showPassword,setShowPassword] = useState(false);
  const [selectedBooking,setSelectedBooking] = useState(null);
  const [selectedEvent,setSelectedEvent] = useState(null);
  const [selectedPlayerIndex,setSelectedPlayerIndex] = useState(null);
  const [selectedAdminPlayerIndex,setSelectedAdminPlayerIndex] = useState(null);
  const [memberSearch,setMemberSearch] = useState('');
  const [newPassword,setNewPassword] = useState('');
  const [confirmPassword,setConfirmPassword] = useState('');
  const [savingPassword,setSavingPassword] = useState(false);
  const [newMember,setNewMember] = useState({name:'',surname:'',email:'',password:''});
  const [newAdmin,setNewAdmin] = useState({
  name:'',
  surname:'',
  email:'',
  password:'',
  role:'admin'
});
  const [savingAdmin,setSavingAdmin] = useState(false);
  const [activeView,setActiveView] = useState('bookings');
  const [regulation,setRegulation] = useState('');
const [editingRegulation,setEditingRegulation] = useState(false);
const [savingRegulation,setSavingRegulation] = useState(false);
  const [openMemberMenu,setOpenMemberMenu] = useState(null);
  const [newBooking,setNewBooking] = useState({
    court_id:'1',time:'',type:'singles',players:['',''],guests:['','']
  });

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const isSuperAdmin = profile?.role === 'super_admin';
  const selected = new Date(`${selectedDate}T12:00:00`);

  const days = [0,1,2].map(n=>{
    const d=new Date();
    d.setDate(d.getDate()+n);
    return d;
  });

  useEffect(()=>{
    if(!configured) return;

    // Il link email porta prima all'app: il token viene verificato
    // soltanto dopo il clic esplicito dell'utente su "Continua".
    const params = new URLSearchParams(window.location.search);
    const recoveryToken = params.get('recovery_token_hash');
    if (recoveryToken) setPendingRecoveryTokenHash(recoveryToken);

    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,s)=>{
      setSession(s);
      if(event==='PASSWORD_RECOVERY'){
        setRecoveryMode(true);
        setPendingRecoveryTokenHash('');
        setNotice('');
        setRecoveryPassword('');
        setConfirmRecoveryPassword('');
      }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(session && !recoveryMode) loadData();
    else if(!session) {
      setProfile(null);
      setMembers([]);
      setAllMembers([]);
      setBookings([]);
      setEvents([]);
      setAdminProfiles([]);
      setSelectedBooking(null);
      setSelectedPlayerIndex(null);
    }
  },[session,recoveryMode]);

  // Aggiornamento in tempo reale delle prenotazioni e dei relativi partecipanti.
  // La sottoscrizione è separata dal caricamento iniziale e non modifica le regole di prenotazione.
  useEffect(() => {
    if (!session || recoveryMode) return;

    let refreshTimer = null;
    let disposed = false;

    const refreshBookingsData = () => {
      if (disposed || document.visibilityState === 'hidden') return;
      loadData();
    };

    const scheduleRefresh = () => {
      if (disposed) return;
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        refreshBookingsData();
      }, 300);
    };

    const channel = supabase
      .channel(`bookings-realtime-${session.user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        scheduleRefresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'booking_players' },
        scheduleRefresh
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Supabase Realtime prenotazioni:', status);
        }
      });

    const handleFocus = () => {
      if (document.visibilityState !== 'hidden') scheduleRefresh();
    };
    const handleOnline = () => scheduleRefresh();

    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      disposed = true;
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, recoveryMode]);

  useEffect(() => {
    if (!session || recoveryMode) return;

    let cancelled = false;

    async function loadRegulation() {
      const { data, error } = await supabase
        .from('club_regulations')
        .select('content')
        .eq('id', 1)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setNotice('Errore caricamento regolamento: ' + error.message);
        return;
      }

      setRegulation(data?.content || '');
    }

    loadRegulation();

    return () => {
      cancelled = true;
    };
  }, [session, recoveryMode]);

  
// Caricamento e aggiornamento periodico della bacheca, separati dalle prenotazioni.
  useEffect(() => {
    if (!session || recoveryMode) {
      setAnnouncements([]);
      setAnnouncementReadIds([]);
      return;
    }

    let cancelled = false;
    const refreshAnnouncements = async () => {
      const [announcementResult, readResult] = await Promise.all([
        supabase.from('announcements').select('*')
          .order('is_pinned', { ascending: false })
          .order('created_at', { ascending: false }),
        supabase.from('announcement_reads').select('announcement_id')
          .eq('user_id', session.user.id)
      ]);

      if (cancelled) return;
      if (announcementResult.error || readResult.error) {
        console.error('Errore caricamento bacheca:', announcementResult.error || readResult.error);
        return;
      }
      setAnnouncements(announcementResult.data || []);
      setAnnouncementReadIds((readResult.data || []).map(row => row.announcement_id));
    };

    refreshAnnouncements();
    const intervalId = window.setInterval(refreshAnnouncements, 60000);
    const handleFocus = () => refreshAnnouncements();
    window.addEventListener('focus', handleFocus);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [session?.user?.id, recoveryMode]);

  async function saveRegulation() {
  if (!isAdmin || !session) return;

  if (!regulation.trim()) {
    setNotice('Il regolamento non può essere vuoto.');
    return;
  }

  setSavingRegulation(true);
  setNotice('');

  try {
    const { error } = await supabase
      .from('club_regulations')
      .update({
        content: regulation,
        updated_at: new Date().toISOString(),
        updated_by: session.user.id
      })
      .eq('id', 1);

    if (error) {
      setNotice('Errore salvataggio regolamento: ' + error.message);
      return;
    }

    setEditingRegulation(false);
    setNotice('Regolamento aggiornato e pubblicato correttamente.');
  } catch (error) {
    setNotice('Errore salvataggio regolamento: ' + error.message);
  } finally {
    setSavingRegulation(false);
  }
}

  async function refreshAnnouncementsNow() {
    if (!session) return;
    const [announcementResult, readResult] = await Promise.all([
      supabase.from('announcements').select('*')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('announcement_reads').select('announcement_id')
        .eq('user_id', session.user.id)
    ]);
    if (!announcementResult.error) setAnnouncements(announcementResult.data || []);
    if (!readResult.error) {
      setAnnouncementReadIds((readResult.data || []).map(row => row.announcement_id));
    }
  }

  async function openAnnouncement(item) {
    setSelectedAnnouncement(item);
    setSelectedAnnouncementAttachmentUrl('');
    if (item.attachment_path) {
      const { data, error } = await supabase.storage
        .from('announcement-attachments')
        .createSignedUrl(item.attachment_path, 3600);
      if (!error && data?.signedUrl) setSelectedAnnouncementAttachmentUrl(data.signedUrl);
    }
    if (announcementReadIds.includes(item.id)) return;
    const { error } = await supabase.from('announcement_reads').insert({
      announcement_id: item.id,
      user_id: session.user.id
    });
    if (!error || error.code === '23505') {
      setAnnouncementReadIds(previous =>
        previous.includes(item.id) ? previous : [...previous, item.id]
      );
    } else {
      console.error('Errore registrazione lettura:', error);
    }
  }

  function resetAnnouncementForm() {
    setEditingAnnouncementId(null);
    setAnnouncementForm({title:'', content:'', category:'Avviso', is_pinned:false});
    setAnnouncementAttachment(null);
  }

  function editAnnouncement(item) {
    setEditingAnnouncementId(item.id);
    setAnnouncementForm({
      title:item.title || '',
      content:item.content || '',
      category:item.category || 'Avviso',
      is_pinned:Boolean(item.is_pinned)
    });
    setAnnouncementAttachment(null);
  }

  async function saveAnnouncement(e) {
    e.preventDefault();
    if (!isAdmin || profile?.status !== 'active' || savingAnnouncement) return;
    const title = announcementForm.title.trim();
    const content = announcementForm.content.trim();
    if (!title || !content) {
      setNotice('Inserisci il titolo e il testo dell’aggiornamento.');
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (announcementAttachment && !allowedTypes.includes(announcementAttachment.type)) {
      setNotice('Formato non valido. Puoi allegare solo PDF, JPG o PNG.');
      return;
    }
    if (announcementAttachment && announcementAttachment.size > 10 * 1024 * 1024) {
      setNotice('Il file supera il limite massimo di 10 MB.');
      return;
    }

    setSavingAnnouncement(true);
    setNotice('');
    const editing = Boolean(editingAnnouncementId);
    const previousItem = editing
      ? announcements.find(item => item.id === editingAnnouncementId)
      : null;
    let attachmentPath = previousItem?.attachment_path || null;
    let uploadedAttachmentPath = null;

    if (announcementAttachment) {
      const safeName = announcementAttachment.name
        .normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '_');
      uploadedAttachmentPath = `${session.user.id}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('announcement-attachments')
        .upload(uploadedAttachmentPath, announcementAttachment, {
          contentType: announcementAttachment.type,
          upsert: false
        });
      if (uploadError) {
        setSavingAnnouncement(false);
        setNotice('Errore caricamento allegato: ' + uploadError.message);
        return;
      }
      attachmentPath = uploadedAttachmentPath;
    }

    const payload = {
      title,
      content,
      category:announcementForm.category,
      is_pinned:announcementForm.is_pinned,
      attachment_path:attachmentPath,
      updated_at:new Date().toISOString()
    };
    const result = editing
      ? await supabase.from('announcements').update(payload).eq('id', editingAnnouncementId)
      : await supabase.from('announcements').insert({
          ...payload,
          created_by:session.user.id
        });
    setSavingAnnouncement(false);

    if (result.error) {
      if (uploadedAttachmentPath) {
        await supabase.storage.from('announcement-attachments').remove([uploadedAttachmentPath]);
      }
      setNotice('Errore salvataggio aggiornamento: ' + result.error.message);
      return;
    }

    if (uploadedAttachmentPath && previousItem?.attachment_path) {
      await supabase.storage.from('announcement-attachments').remove([previousItem.attachment_path]);
    }
    resetAnnouncementForm();
    setNotice(editing ? 'Aggiornamento modificato correttamente.' : 'Aggiornamento pubblicato correttamente.');
    await refreshAnnouncementsNow();
  }

  async function removeAnnouncementAttachment(item) {
    if (!isAdmin || profile?.status !== 'active' || !item?.attachment_path) return;
    if (!confirm(`Vuoi eliminare soltanto il file allegato a “${item.title}”? L’annuncio resterà pubblicato.`)) return;

    const { error: updateError } = await supabase
      .from('announcements')
      .update({ attachment_path: null, updated_at: new Date().toISOString() })
      .eq('id', item.id);

    if (updateError) {
      setNotice('Errore aggiornamento annuncio: ' + updateError.message);
      return;
    }

    const { error: storageError } = await supabase.storage
      .from('announcement-attachments')
      .remove([item.attachment_path]);

    if (storageError) {
      setNotice('Il collegamento al file è stato rimosso, ma non è stato possibile eliminare il file da Storage: ' + storageError.message);
    } else {
      setNotice('Allegato eliminato. L’annuncio è rimasto pubblicato.');
    }

    if (selectedAnnouncement?.id === item.id) {
      setSelectedAnnouncement({ ...selectedAnnouncement, attachment_path: null });
      setSelectedAnnouncementAttachmentUrl('');
    }
    if (editingAnnouncementId === item.id) setAnnouncementAttachment(null);
    await refreshAnnouncementsNow();
  }

  async function deleteAnnouncement(item) {
    if (!isAdmin || profile?.status !== 'active') return;
    if (!confirm(`Vuoi eliminare l’aggiornamento “${item.title}”?`)) return;
    const { error } = await supabase.from('announcements').delete().eq('id', item.id);
    if (error) {
      setNotice('Errore eliminazione aggiornamento: ' + error.message);
      return;
    }
    if (item.attachment_path) {
      await supabase.storage.from('announcement-attachments').remove([item.attachment_path]);
    }
    if (selectedAnnouncement?.id === item.id) setSelectedAnnouncement(null);
    setNotice('Aggiornamento eliminato.');
    await refreshAnnouncementsNow();
  }

  async function loadData(){
    if(!session) return;
    setLoading(true);

        const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const [
  {data:p,error:pe},
  {data:m,error:me},
  {data:b,error:be},
  {data:ev,error:ee}
] = await Promise.all([
      supabase.from('profiles').select('*').eq('id',session.user.id).single(),
      supabase.from('profiles').select('id,full_name,email,status,role').order('full_name'),
      supabase.from('bookings').select('*,booking_players(*)')
        .gte('booking_date',dateKey(yesterday))
        .order('booking_date').order('start_time'),
      supabase.from('events')
  .select('*,event_courts(court_id)')
  .eq('status','active')
  .gte('event_date',dateKey(new Date()))
  .lte('event_date',dateKey(new Date(Date.now()+17*24*60*60*1000)))
  .order('event_date')
  .order('start_time')
    ]);

    if(pe) setNotice(pe.message);
    else if(p?.status !== 'active') {
      await supabase.auth.signOut();
      setNotice('Account non attivo. Contatta l’amministratore.');
    } else {
      setProfile(p);
    }

    if(!me) {
      const memberList=(m||[])
        .filter(x=>x.role==='member')
        .sort(sortBySurname);

      setAllMembers(memberList);
      setMembers(memberList.filter(x=>x.status==='active'));

      setAdminProfiles(
  (m||[])
    .filter(x=>x.role==='admin'||x.role==='super_admin')
    .sort(sortBySurname)
);
    } else {
      setNotice('Errore caricamento soci: '+me.message);
    }

    if(be) setNotice(be.message);
else setBookings(b||[]);

if(ee) {
  setEvents([]);
  setNotice('Errore caricamento eventi: '+ee.message);
} else {
  setEvents(ev||[]);
}

    setLoading(false);
  }

  async function loadBookingHistory() {
    if (!session || !isSuperAdmin || profile?.status !== 'active') return;

    setHistoryLoading(true);
    setHistoryError('');

    const { data, error } = await supabase
      .from('booking_history')
      .select('id, booking_id, event_type, occurred_at, actor_id, actor_name, booking_snapshot')
      .gte('occurred_at', '2026-11-20T00:00:00+01:00')
      .order('occurred_at', { ascending: false });

    if (error) {
      setHistoryError('Errore caricamento storico: ' + error.message);
      setHistoryLoading(false);
      return;
    }

    setBookingHistory(data || []);
    setHistoryLoading(false);
  }

  // Lo storico viene caricato soltanto quando un Super Admin apre la relativa sezione.
useEffect(() => {
  if (activeView === 'history' && isSuperAdmin && profile?.status === 'active') {
    loadBookingHistory();
  }
}, [activeView, isSuperAdmin, profile?.status, session?.user?.id]);

  async function login(e){
    e.preventDefault();
    setNotice('');
    const {error}=await supabase.auth.signInWithPassword({
      email:loginEmail,password:loginPassword
    });
    if(error) setNotice('Accesso non riuscito: verifica email e password.');
  }

  async function sendPasswordRecovery(){
    setNotice('');
    const email=loginEmail.trim();

    if(!email){
      setNotice('Inserisci prima il tuo indirizzo email.');
      return;
    }

    setSendingRecovery(true);
    const {error}=await supabase.auth.resetPasswordForEmail(email,{
      redirectTo:window.location.origin
    });
    setSendingRecovery(false);

    if(error){
      setNotice('Non è stato possibile inviare l’email: '+error.message);
      return;
    }

    setNotice('Se l’indirizzo è registrato, riceverai un’email con il link per scegliere una nuova password. Controlla anche la cartella spam.');
  }

  async function verifyRecoveryLink(){
    if (!pendingRecoveryTokenHash || verifyingRecovery) return;

    setNotice('');
    setVerifyingRecovery(true);

    const { error } = await supabase.auth.verifyOtp({
      token_hash: pendingRecoveryTokenHash,
      type: 'recovery'
    });

    setVerifyingRecovery(false);

    if (error) {
      setNotice('Il collegamento non è più valido o è scaduto. Richiedi una nuova email di recupero.');
      return;
    }

    // Rimuove il token dall'indirizzo dopo la verifica.
    window.history.replaceState({}, document.title, window.location.pathname);
    setPendingRecoveryTokenHash('');
    setRecoveryMode(true);
  }

  async function completePasswordRecovery(e){
    e.preventDefault();
    setNotice('');

    if(recoveryPassword.length<8){
      setNotice('La password deve contenere almeno 8 caratteri.');
      return;
    }

    if(recoveryPassword!==confirmRecoveryPassword){
      setNotice('Le due password non coincidono.');
      return;
    }

    setSavingPassword(true);
    const {error}=await supabase.auth.updateUser({password:recoveryPassword});
    setSavingPassword(false);

    if(error){
      setNotice('Errore durante il ripristino della password: '+error.message);
      return;
    }

    setRecoveryPassword('');
    setConfirmRecoveryPassword('');
    setRecoveryMode(false);
    setNotice('Password aggiornata correttamente. Ora puoi utilizzare la nuova password.');
  }

  async function logout(){
    const {error}=await supabase.auth.signOut();
    if(error) setNotice('Errore durante l’uscita: '+error.message);
  }

  async function changePassword(e){
    e.preventDefault();
    setNotice('');

    if(newPassword.length<8){
      setNotice('La password deve contenere almeno 8 caratteri.');
      return;
    }

    if(newPassword!==confirmPassword){
      setNotice('Le due password non coincidono.');
      return;
    }

    setSavingPassword(true);
    const {error}=await supabase.auth.updateUser({password:newPassword});
    setSavingPassword(false);

    if(error){
      setNotice('Errore durante il cambio password: '+error.message);
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setNotice('Password modificata correttamente.');
  }

  const dayBookings = useMemo(() => {
  const dayStart = dateToDayNumber(selectedDate) * 1440;
  const dayEnd = dayStart + 1440;

  return bookings.filter(b => {
    if (
      b.status !== 'active' ||
      (court !== 'all' && String(b.court_id) !== court)
    ) {
      return false;
    }

    const bookingStart = bookingStartAbsolute(b);
    const bookingEnd = bookingEndAbsolute(b);

    return bookingStart < dayEnd && bookingEnd > dayStart;
  });
}, [bookings, selectedDate, court]);

  /*
   * ORARI PRENOTABILI:
   * - considera la data selezionata;
   * - considera il campo scelto nella nuova prenotazione;
   * - esclude gli orari già prenotati;
   * - esclude gli orari già trascorsi se la data è oggi.
   */
  
const availableBookingHours = useMemo(() => {
  const now = new Date();

  const nowAbsolute =
    dateToDayNumber(dateKey(now)) * 1440 +
    now.getHours() * 60 +
    now.getMinutes();

  const selectedDayAbsolute =
    dateToDayNumber(selectedDate) * 1440;

  const duration = newBooking.type === 'doubles' ? 120 : 60;

  return hours.filter(h => {
    const candidateStart =
      selectedDayAbsolute + timeToMinutes(h);

    const candidateEnd = candidateStart + duration;

    // Non permette di prenotare orari già trascorsi
    if (candidateStart <= nowAbsolute) {
      return false;
    }

    // Controllo delle prenotazioni attive,
    // comprese quelle iniziate il giorno precedente
    const occupied = bookings.some(b => {
      if (
        b.status !== 'active' ||
        String(b.court_id) !== String(newBooking.court_id)
      ) {
        return false;
      }

      const bookingStart = bookingStartAbsolute(b);
      const bookingEnd = bookingEndAbsolute(b);

      return (
        candidateStart < bookingEnd &&
        candidateEnd > bookingStart
      );
    });

    // Controllo degli eventi attivi
    const occupiedByEvent = events.some(event => {
      if (event.status !== 'active') return false;

      const eventCourts = (event.event_courts || [])
        .map(ec => String(ec.court_id));

      if (!eventCourts.includes(String(newBooking.court_id))) {
        return false;
      }

      const eventStart = eventStartAbsolute(event);
const eventEnd = eventEndAbsolute(event);

      return (
        candidateStart < eventEnd &&
        candidateEnd > eventStart
      );
    });

    return !occupied && !occupiedByEvent;
  });
}, [
  bookings,
  events,
  selectedDate,
  newBooking.court_id,
  newBooking.type
]);

const availableAdminBookingHours = useMemo(() => {
  const now = new Date();
  const nowAbsolute = dateToDayNumber(dateKey(now)) * 1440 + now.getHours() * 60 + now.getMinutes();
  const selectedDayAbsolute = dateToDayNumber(selectedDate) * 1440;
  const duration = adminBooking.type === 'doubles' ? 120 : 60;

  return hours.filter(h => {
    const candidateStart = selectedDayAbsolute + timeToMinutes(h);
    const candidateEnd = candidateStart + duration;
    if (candidateStart <= nowAbsolute) return false;

    const occupied = bookings.some(b => {
      if (b.status !== 'active' || String(b.court_id) !== String(adminBooking.court_id)) return false;
      return candidateStart < bookingEndAbsolute(b) && candidateEnd > bookingStartAbsolute(b);
    });

    const occupiedByEvent = events.some(event => {
      if (event.status !== 'active') return false;
      const eventCourts = (event.event_courts || []).map(ec => String(ec.court_id));
      if (!eventCourts.includes(String(adminBooking.court_id))) return false;
      const eventStart = eventStartAbsolute(event);
      const eventEnd = eventEndAbsolute(event);
      return candidateStart < eventEnd && candidateEnd > eventStart;
    });

    return !occupied && !occupiedByEvent;
  });
}, [bookings, events, selectedDate, adminBooking.court_id, adminBooking.type]);

  /*
   * Se si cambia campo oppure un orario non è più disponibile,
   * seleziona automaticamente il primo orario libero.
   */
  useEffect(()=>{
    if(!showBooking) return;

    const firstAvailable = availableBookingHours[0] || '';
    if(!availableBookingHours.includes(newBooking.time)){
      setNewBooking(prev=>({
        ...prev,
        time:firstAvailable
      }));
    }
  },[showBooking,availableBookingHours,newBooking.time]);

  useEffect(()=>{
    if(!showAdminBooking) return;

    const firstAvailable = availableAdminBookingHours[0] || '';
    if(!availableAdminBookingHours.includes(adminBooking.time)){
      setAdminBooking(prev=>({
        ...prev,
        time:firstAvailable
      }));
    }
  },[showAdminBooking,availableAdminBookingHours,adminBooking.time]);

  
const busyMemberIds = useMemo(() => {
  const now = new Date();

  const nowAbsolute =
    dateToDayNumber(dateKey(now)) * 1440 +
    now.getHours() * 60 +
    now.getMinutes();

  const busyBookings = bookings.filter(b => {
    if (b.status !== 'active') return false;

    const bookingEnd = bookingEndAbsolute(b);

    return bookingEnd > nowAbsolute;
  });

  return new Set(
    busyBookings.flatMap(b => [
      b.owner_id,
      ...(b.booking_players || []).map(p => p.member_id)
    ].filter(Boolean))
  );
}, [bookings]);


  const availableMembers=useMemo(()=>{
    const search=memberSearch.trim().toLocaleLowerCase('it');

    return members
      .filter(m=>!busyMemberIds.has(m.id))
      .filter(m=>!search||
        surnameFirst(m.full_name).toLocaleLowerCase('it').includes(search)||
        String(m.full_name||'').toLocaleLowerCase('it').includes(search)
      )
      .sort(sortBySurname);
  },[members,busyMemberIds,profile,memberSearch]);

  const availableAdminMembers=useMemo(()=>{
    const search=memberSearch.trim().toLocaleLowerCase('it');
    const alreadySelected=adminBooking.players.filter(Boolean);

    return members
      .filter(m=>!busyMemberIds.has(m.id))
      .filter(m=>!alreadySelected.includes(m.id))
      .filter(m=>!search||
        surnameFirst(m.full_name).toLocaleLowerCase('it').includes(search)||
        String(m.full_name||'').toLocaleLowerCase('it').includes(search)
      )
      .sort(sortBySurname);
  },[members,busyMemberIds,memberSearch,adminBooking.players]);

  function openPlayerSelector(index){
    setSelectedPlayerIndex(index);
    setMemberSearch('');
  }

  function chooseMember(memberId){
    if(selectedPlayerIndex===null) return;

    const players=[...newBooking.players];
    const guests=[...newBooking.guests];
    players[selectedPlayerIndex]=memberId;
    guests[selectedPlayerIndex]='';

    setNewBooking({...newBooking,players,guests});
    setSelectedPlayerIndex(null);
    setMemberSearch('');
  }

  function openAdminPlayerSelector(index){
    setSelectedAdminPlayerIndex(index);
    setMemberSearch('');
  }

  function chooseAdminMember(memberId){
    if(selectedAdminPlayerIndex===null) return;

    const players=[...adminBooking.players];
    const guests=[...adminBooking.guests];
    players[selectedAdminPlayerIndex]=memberId;
    guests[selectedAdminPlayerIndex]='';

    setAdminBooking({...adminBooking,players,guests});
    setSelectedAdminPlayerIndex(null);
    setMemberSearch('');
  }

  function chooseAdminGuest(index){
    const players=[...adminBooking.players];
    const guests=[...adminBooking.guests];
    players[index]='guest';
    guests[index]='';
    setAdminBooking({...adminBooking,players,guests});
  }

  function chooseGuest(index){
    const players=[...newBooking.players];
    const guests=[...newBooking.guests];
    players[index]='guest';
    guests[index]='';

    setNewBooking({...newBooking,players,guests});
  }

  // Chiudendo una finestra di prenotazione si scartano i dati non confermati.
  function closeNewBooking(){
    setShowBooking(false);
    setNewBooking({court_id:'1',time:'',type:'singles',players:['',''],guests:['','']});
    setSelectedPlayerIndex(null);
    setMemberSearch('');
  }

  function closeAdminBooking(){
    if(savingAdminBooking) return;
    setShowAdminBooking(false);
    setAdminBooking({court_id:'1',time:'',type:'singles',players:['','','',''],guests:['','','','']});
    setSelectedAdminPlayerIndex(null);
    setMemberSearch('');
  }
  
function bookingAt(c, t) {
  const slotStart =
    dateToDayNumber(selectedDate) * 1440 +
    timeToMinutes(t);

  return bookings.find(b => {
    if (
      String(b.court_id) !== String(c) ||
      !['active', 'expired'].includes(b.status)
    ) {
      return false;
    }

    const bookingStart = bookingStartAbsolute(b);
    const bookingEnd = bookingEndAbsolute(b);

    return (
      slotStart >= bookingStart &&
      slotStart < bookingEnd
    );
  });
}
function eventAt(c,t){
  const slotStart =
    dateToDayNumber(selectedDate) * 1440 +
    timeToMinutes(t);

  return events.find(event=>{
    const eventCourtIds=(event.event_courts||[])
      .map(ec=>String(ec.court_id));

    if(!eventCourtIds.includes(String(c))) return false;

    const eventStart = eventStartAbsolute(event);
    const eventEnd = eventEndAbsolute(event);

    return slotStart >= eventStart && slotStart < eventEnd;
  });
}
  function playerNames(b){
    return (b.booking_players||[])
      .map(p=>surnameFirst(p.display_name))
      .join(' · ');
  }

  function canCancelBooking(b){
  // Amministratori e super amministratori mantengono i permessi attuali.
  if (isAdmin) return true;

  // Il socio deve partecipare alla prenotazione.
  const isParticipant = (b.booking_players||[]).some(
    p => p.member_id === session?.user?.id
  );

  if (!isParticipant) return false;

  // Il socio può cancellare soltanto prima dell'inizio della partita.
  const bookingStart = new Date(
    `${b.booking_date}T${String(b.start_time).slice(0,5)}:00`
  );

  return bookingStart.getTime() > Date.now();
}
  function canBook(){
    return profile?.status==='active';
  }

  async function createBooking(e){
    e.preventDefault();

    if(!availableBookingHours.includes(newBooking.time)){
      setNotice('L’orario selezionato non è più disponibile. Scegli un altro orario.');
      return;
    }

    const count=newBooking.type==='singles'?2:4;
    const picked=newBooking.players.slice(0,count);
    const guestAllowed=newBooking.type==='singles'?[1]:[2,3];

    if(picked.some((x,i)=>x==='guest'&&!guestAllowed.includes(i))){
      setNotice('Un ospite esterno non può occupare questa posizione.');
      return;
    }

    if(picked.some(x=>!x)){
      setNotice('Seleziona tutti i soci o indica gli ospiti.');
      return;
    }

    const start=new Date(`${selectedDate}T${newBooking.time}:00`);
    if(start<new Date()){
      setNotice('Non puoi prenotare un orario già passato.');
      return;
    }

    const participants=picked.map((id,i)=>{
      const member=members.find(m=>m.id===id);
      const guest=newBooking.guests[i]?.trim();

      return member
        ? {member_id:member.id,display_name:member.full_name}
        : id==='guest'
          ? {member_id:null,display_name:guest}
          : {member_id:null,display_name:''};
    });

    if(participants.some(p=>!p.display_name)){
      setNotice('Completa i nomi dei partecipanti.');
      return;
    }

    const {error}=await supabase.rpc('create_booking',{
      p_court_id:Number(newBooking.court_id),
      p_booking_date:selectedDate,
      p_start_time:newBooking.time,
      p_booking_type:newBooking.type,
      p_players:participants
    });

    if(error){
  const message = error.message || '';

  setNotice(
    message.includes('guest_month_limit_reached')
      ? 'Hai raggiunto il limite massimo di 3 prenotazioni con ospiti nel mese.'
      : message.includes('guest_year_limit_reached')
        ? 'Hai raggiunto il limite massimo di 10 prenotazioni con ospiti nell’anno.'
        : message.includes('member_already_booked')
          ? 'Uno dei soci selezionati ha già una prenotazione attiva.'
          : message.includes('slot_unavailable')
            ? 'Questo orario è già occupato.'
            : message.includes('booking_owner_must_play')
              ? 'Chi effettua la prenotazione deve essere uno dei giocatori.'
              : 'Non è stato possibile completare la prenotazione. Verifica i dati e riprova.'
  );

  return;
}
    setNotice('Prenotazione confermata!');
    setShowBooking(false);
    setSelectedPlayerIndex(null);
    await loadData();
  }

  async function createAdminBooking(e){
    e.preventDefault();
    if(!isAdmin || savingAdminBooking) return;

    // Legge l'orario direttamente dal menu al momento della conferma.
    const selectedTime = e.currentTarget.elements.namedItem('admin-booking-time')?.value || adminBooking.time;
    if(!availableAdminBookingHours.includes(selectedTime)){
      setNotice('L’orario selezionato non è più disponibile. Scegli un altro orario.');
      return;
    }

    const count=adminBooking.type==='singles'?2:4;
    const picked=adminBooking.players.slice(0,count);
    const guestAllowed=adminBooking.type==='singles'?[1]:[2,3];

    if(!picked[0] || picked[0]==='guest'){
      setNotice('Il primo giocatore deve essere un socio e sarà l’intestatario della prenotazione.');
      return;
    }
    if(picked.some((x,i)=>x==='guest'&&!guestAllowed.includes(i))){
      setNotice('Un ospite esterno non può occupare questa posizione.');
      return;
    }
    if(picked.some(x=>!x)){
      setNotice('Seleziona tutti i giocatori o indica gli ospiti.');
      return;
    }

    const memberIds=picked.filter(x=>x!=='guest');
    if(new Set(memberIds).size!==memberIds.length){
      setNotice('Lo stesso socio non può essere selezionato più di una volta.');
      return;
    }

    const participants=picked.map((id,i)=>{
      const member=members.find(m=>m.id===id);
      const guest=adminBooking.guests[i]?.trim();
      return member
        ? {member_id:member.id,display_name:member.full_name}
        : id==='guest'
          ? {member_id:null,display_name:guest}
          : {member_id:null,display_name:''};
    });

    if(participants.some(p=>!p.display_name)){
      setNotice('Inserisci nome e cognome degli ospiti.');
      return;
    }

    const rpcArgs={
      p_court_id:Number(adminBooking.court_id),
      p_booking_date:selectedDate,
      p_start_time:selectedTime,
      p_booking_type:adminBooking.type,
      p_players:participants
    };

    setSavingAdminBooking(true);
    const {error}=await supabase.rpc('create_booking_admin',rpcArgs);
    setSavingAdminBooking(false);

    if(error){
      const message=error.message||'';
      setNotice(
        message.includes('member_already_booked')
          ? 'Uno dei soci selezionati ha già una prenotazione attiva.'
          : message.includes('slot_unavailable')
            ? 'Questo orario è già occupato o bloccato da un evento.'
            : message.includes('not_admin')
              ? 'Non hai i permessi per effettuare questa operazione.'
              : 'Non è stato possibile completare la prenotazione amministrativa. Verifica i dati e riprova.'
      );
      return;
    }

    setShowAdminBooking(false);
    setAdminBooking({court_id:'1',time:'',type:'singles',players:['','','',''],guests:['','','','']});
    setNotice('Prenotazione amministrativa confermata.');
    await loadData();
  }

  async function cancelBooking(id){
    if(!confirm('Vuoi cancellare questa prenotazione?')) return;

    const {error}=await supabase.rpc('cancel_booking',{
      p_booking_id:id
    });

    if(error){
      setNotice('Errore durante la cancellazione: '+error.message);
      return;
    }

    setSelectedBooking(null);
    setNotice('Prenotazione cancellata.');
    await loadData();
  }
  async function createEvent(e){
    e.preventDefault();
    setNotice('');

    if(!isAdmin) return;
if(
  !eventForm.start_time.endsWith(':00') ||
  !eventForm.end_time.endsWith(':00')
){
  setNotice('Gli orari degli eventi devono essere impostati su ore intere (es. 17:00).');
  return;
}
    setSavingEvent(true);

    const {error}=await supabase.rpc('create_club_event',{
      p_title:eventForm.title.trim(),
      p_description:eventForm.description.trim(),
      p_event_date:eventForm.event_date,
      p_start_time:eventForm.start_time,
      p_end_time:eventForm.end_time,
      p_court_ids:eventForm.court_ids.map(Number)
    });

    setSavingEvent(false);

    if(error){
      const message=error.message||'';

      setNotice(
        message.includes('event_overlaps_booking')
          ? 'Non puoi creare l’evento: uno dei campi è già prenotato in quell’orario.'
          : message.includes('event_overlaps_event')
            ? 'Esiste già un altro evento in quell’orario.'
            : message.includes('event_horizon_invalid')
              ? 'La data deve essere compresa tra oggi e i prossimi 17 giorni.'
              : message.includes('court_not_active')
                ? 'Uno dei campi selezionati non è attivo.'
                : message.includes('invalid_event_time')
                  ? 'Controlla gli orari: quello finale deve essere successivo a quello iniziale.'
                  : 'Errore durante la creazione dell’evento: '+message
      );
      return;
    }

    setEventForm({
      title:'',
      description:'',
      event_date:dateKey(new Date()),
      start_time:'09:00',
      end_time:'10:00',
      court_ids:['1']
    });

    setNotice('Evento creato correttamente.');
    await loadData();
  }

  async function cancelEvent(id){
    if(!isAdmin) return;

    if(!confirm('Vuoi annullare questo evento?')) return;

    const {error}=await supabase.rpc('cancel_club_event',{
      p_event_id:id
    });

    if(error){
      setNotice('Errore durante l’annullamento dell’evento: '+error.message);
      return;
    }

    setNotice('Evento annullato correttamente.');
    await loadData();
  }
  async function addMember(e){
    e.preventDefault();
    setNotice('');

    const {data,error}=await supabase.functions.invoke('admin-manage-member',{
      body:newMember
    });

    if(error||data?.error){
      setNotice('Errore creazione socio: '+(data?.error||error?.message));
      return;
    }

    setNotice('Socio creato correttamente.');
    setNewMember({name:'',surname:'',email:'',password:''});
    await loadData();
  }

  async function editMember(member){
    const parts=String(member.full_name||'').split(' ');
    const name=prompt('Nome del socio:',parts.shift()||'');
    if(name===null) return;

    const surname=prompt('Cognome del socio:',parts.join(' '));
    if(surname===null) return;

    const email=prompt('Email del socio:',member.email||'');
    if(email===null) return;

    if(!name.trim()||!surname.trim()||!email.trim()){
      setNotice('Nome, cognome ed email sono obbligatori.');
      return;
    }

    const {data,error}=await supabase.functions.invoke('admin-manage-member',{
      body:{
        action:'update_member',
        member_id:member.id,
        name:name.trim(),
        surname:surname.trim(),
        email:email.trim()
      }
    });

    if(error||data?.error){
      setNotice('Errore modifica socio: '+(data?.error||error?.message));
      return;
    }

    setNotice('Dati del socio aggiornati correttamente.');
    await loadData();
  }

  
async function setMemberStatus(member, status) {
  const isPermanentDelete = status === 'deleted';

  const warning = isPermanentDelete
    ? `ATTENZIONE! Vuoi eliminare definitivamente ${member.full_name}? L'account verrà cancellato e non potrà essere riattivato. Le prenotazioni e i nomi nello storico saranno conservati.`
    : status === 'suspended'
      ? `Vuoi sospendere ${member.full_name}?`
      : `Vuoi riattivare ${member.full_name}?`;

  if (!confirm(warning)) return;

  const { data, error } = await supabase.functions.invoke(
    'admin-manage-member',
    {
      body: {
        action: isPermanentDelete ? 'delete_member' : 'update_member',
        member_id: member.id,
        ...(isPermanentDelete ? {} : { status })
      }
    }
  );

  if (error || data?.error) {
    setNotice(
      'Errore durante l’operazione: ' +
      (data?.error || error?.message)
    );
    return;
  }

  setNotice(
    isPermanentDelete
      ? 'Socio eliminato definitivamente. Storico delle prenotazioni conservato.'
      : status === 'suspended'
        ? 'Socio sospeso correttamente.'
        : 'Socio riattivato correttamente.'
  );

  await loadData();
}

  async function resetMemberPassword(member){
    if(member.status==='deleted'){
      setNotice('Non puoi reimpostare la password di un socio disattivato.');
      return;
    }

    const password=prompt(
      `Inserisci la nuova password temporanea per ${member.full_name} (minimo 8 caratteri):`
    );

    if(password===null) return;

    if(password.length<8){
      setNotice('La password deve contenere almeno 8 caratteri.');
      return;
    }

    const confirmation=prompt('Conferma la nuova password temporanea:');

    if(confirmation===null) return;

    if(password!==confirmation){
      setNotice('Le due password non coincidono.');
      return;
    }

    const {data,error}=await supabase.functions.invoke(
      'admin-manage-member',
      {
        body:{
          action:'reset_member_password',
          member_id:member.id,
          password
        }
      }
    );

    if(error||data?.error){
      setNotice(
        'Errore reimpostazione password: '+
        (data?.error||error?.message)
      );
      return;
    }

    setNotice(`Password temporanea aggiornata per ${member.full_name}.`);
  }
  async function addAdmin(e){
    e.preventDefault();
    setNotice('');
    setSavingAdmin(true);

    const {data,error}=await supabase.functions.invoke('admin-manage-member',{
      body:{
  ...newAdmin,
  action:newAdmin.role==='super_admin'
    ? 'create_super_admin'
    : 'create_admin'
}
    });

    setSavingAdmin(false);

    if(error||data?.error){
      setNotice('Errore creazione amministratore: '+(data?.error||error?.message));
      return;
    }

    setNotice(
  newAdmin.role==='super_admin'
    ? 'Super Amministratore creato correttamente.'
    : 'Amministratore creato correttamente.'
);

setNewAdmin({
  name:'',
  surname:'',
  email:'',
  password:'',
  role:'admin'
});

await loadData();
  }
async function deleteAdmin(id){
  const target=adminProfiles.find(a=>a.id===id);

  if(!target) return;

  if(!confirm(
    `ATTENZIONE!\n\nVuoi eliminare definitivamente ${target.full_name}?\n\nL'account non diventerà socio e non potrà più accedere. L'operazione non è reversibile.`
  )) return;

  const {data,error}=await supabase.functions.invoke('admin-manage-member',{
    body:{
      action:'delete_admin',
      member_id:id
    }
  });

  if(error||data?.error){
  let detail=data?.error||'';

  if(error?.context){
    try{
      const response=error.context.clone
        ? error.context.clone()
        : error.context;

      const body=await response.json();

      detail=body?.details
  ? JSON.stringify(body.details)
  : body?.error||JSON.stringify(body);
    }catch(e){
      detail=error.message;
    }
  }

  console.error('ERRORE DELETE ADMIN:',error,data);

  setNotice('Errore eliminazione: '+(detail||error?.message||'Errore sconosciuto'));
  return;
}

  setNotice('Amministratore eliminato definitivamente.');
  await loadData();
}
  async function setAdminStatus(id, nextStatus){
    const target=adminProfiles.find(a=>a.id===id);
    if(!target) return;

    const isSuspending=nextStatus==='suspended';
    const actionLabel=isSuspending?'sospendere':'riattivare';
    if(!confirm(`Vuoi ${actionLabel} ${target.full_name}?`)) return;

    const {data,error}=await supabase.functions.invoke('admin-manage-member',{
      body:{
        action:isSuspending?'suspend_admin':'reactivate_admin',
        member_id:id
      }
    });

    if(error||data?.error){
      setNotice(`Errore: impossibile ${actionLabel} l'amministratore: `+(data?.error||error?.message));
      return;
    }

    setNotice(isSuspending
      ? 'Amministratore sospeso. Il ruolo è rimasto invariato.'
      : 'Amministratore riattivato correttamente.');
    await loadData();
  }

  if(!configured) return <SetupScreen />;
  if (!isOnline) {
  return (
    <main className="login-shell">
      <div className="login-card">
        <h2>Connessione Internet assente</h2>
        <p>
          Per utilizzare Tennis Club Pabillonis devi essere connesso a Internet.
        </p>
      </div>
    </main>
  );
}

  if(pendingRecoveryTokenHash) return <main className="login-shell">
    <div className="login-art">
      <Brand/>
      <div className="art-copy">
        <span className="eyebrow">TENNIS CLUB PABILLONIS</span>
        <h1>Una nuova<br/><em>partita</em> comincia qui.</h1>
        <p>Conferma il collegamento per scegliere una nuova password.</p>
      </div>
      <div className="court-lines"><i/><i/><i/><i/></div>
      <span className="art-footer">TENNIS CLUB PABILLONIS · DAL 1981</span>
    </div>
    <section className="login-panel">
      <div className="mobile-brand">
        <img src={clubLogo} alt="Tennis Club Pabillonis"/>
        <span>TENNIS CLUB <b>PABILLONIS</b></span>
      </div>
      <div className="login-card">
        <span className="eyebrow">RECUPERO ACCOUNT</span>
        <h2>Conferma il recupero.</h2>
        <p>Per motivi di sicurezza, il collegamento verrà verificato soltanto quando premi il pulsante qui sotto.</p>
        <button className="primary wide" type="button"
          onClick={verifyRecoveryLink} disabled={verifyingRecovery}>
          {verifyingRecovery?'Verifica in corso…':'Continua'} <ArrowRight size={17}/>
        </button>
        {notice&&<div className="notice">{notice}</div>}
      </div>
      <div className="login-bottom">© Tennis Club Pabillonis <span>•</span> Recupero password</div>
      <div className="login-clab">
        <span>Realizzato da</span>
        <img src={clabLogo} alt="CLAB.C Solutions"/>
      </div>
    </section>
  </main>;

  if(recoveryMode) return <main className="login-shell">
    <div className="login-art">
      <Brand/>
      <div className="art-copy">
        <span className="eyebrow">TENNIS CLUB PABILLONIS</span>
        <h1>Una nuova<br/><em>partita</em> comincia qui.</h1>
        <p>Scegli una nuova password per tornare nell’area soci.</p>
      </div>
      <div className="court-lines"><i/><i/><i/><i/></div>
      <span className="art-footer">TENNIS CLUB PABILLONIS · DAL 1981</span>
    </div>

    <section className="login-panel">
      <div className="mobile-brand">
        <img src={clubLogo} alt="Tennis Club Pabillonis"/>
        <span>TENNIS CLUB <b>PABILLONIS</b></span>
      </div>

      <div className="login-card">
        <span className="eyebrow">RECUPERO ACCOUNT</span>
        <h2>Crea una nuova password.</h2>
        <p>Inserisci e conferma la nuova password. Deve contenere almeno 8 caratteri.</p>

        <form onSubmit={completePasswordRecovery}>
          <label>Nuova password
            <input type="password" value={recoveryPassword}
              onChange={e=>setRecoveryPassword(e.target.value)}
              placeholder="Almeno 8 caratteri" minLength="8"
              autoComplete="new-password" required/>
          </label>
          <label>Conferma nuova password
            <input type="password" value={confirmRecoveryPassword}
              onChange={e=>setConfirmRecoveryPassword(e.target.value)}
              placeholder="Ripeti la nuova password" minLength="8"
              autoComplete="new-password" required/>
          </label>
          <button className="primary wide" type="submit" disabled={savingPassword}>
            {savingPassword?'Aggiornamento…':'Salva nuova password'} <ArrowRight size={17}/>
          </button>
        </form>

        {notice&&<div className="notice">{notice}</div>}
      </div>

      <div className="login-bottom">© Tennis Club Pabillonis <span>•</span> Recupero password</div>
      <div className="login-clab">
        <span>Realizzato da</span>
        <img src={clabLogo} alt="CLAB.C Solutions"/>
      </div>
    </section>
  </main>;

  if(!session) return <main className="login-shell">
    <div className="login-art">
      <Brand/>
      <div className="art-copy">
        <span className="eyebrow">IL TUO CLUB, IL TUO CAMPO</span>
        <h1>Il prossimo<br/><em>match</em> inizia qui.</h1>
        <p>Prenota il campo, scegli i compagni e scendi in gioco.</p>
      </div>
      <div className="court-lines"><i/><i/><i/><i/></div>
      <span className="art-footer">TENNIS CLUB PABILLONIS · DAL 1981</span>
    </div>

    <section className="login-panel">
      <div className="mobile-brand">
        <img src={clubLogo} alt="Tennis Club Pabillonis"/>
        <span>TENNIS CLUB <b>PABILLONIS</b></span>
      </div>

      <div className="login-card">
        <span className="eyebrow">AREA RISERVATA AI SOCI</span>
        <h2>Benvenuto<br/>in campo.</h2>
        <p>Accedi con le credenziali fornite dalla segreteria.</p>

        <form onSubmit={login}>
          <label>Email
            <input type="email" value={loginEmail}
              onChange={e=>setLoginEmail(e.target.value)}
              placeholder="nome@email.it" required/>
          </label>
          <label>Password
            <input type="password" value={loginPassword}
              onChange={e=>setLoginPassword(e.target.value)}
              placeholder="La tua password" required/>
          </label>
          <button className="primary wide">Accedi <ArrowRight size={17}/></button>
        </form>

        <button
          type="button"
          onClick={sendPasswordRecovery}
          disabled={sendingRecovery}
          style={{
            display:'block',
            margin:'14px auto 0',
            padding:'4px 8px',
            border:0,
            background:'transparent',
            color:'#557b42',
            fontWeight:600,
            cursor:sendingRecovery?'wait':'pointer'
          }}
        >
          {sendingRecovery?'Invio in corso…':'Password dimenticata?'}
        </button>

        {notice&&<div className="notice">{notice}</div>}
        <small>Non hai ancora le credenziali? Rivolgiti all’amministratore del club.</small>
      </div>

      <div className="login-bottom">© Tennis Club Pabillonis <span>•</span> Accesso soci</div>
      <div className="login-clab">
        <span>Realizzato da</span>
        <img src={clabLogo} alt="CLAB.C Solutions"/>
      </div>
    </section>
  </main>;

  return <div className="app-shell">
    {updateAvailable && <div
      role="status"
      style={{
        position:'fixed', top:'12px', left:'50%', transform:'translateX(-50%)',
        zIndex:10000, width:'min(520px, calc(100% - 24px))',
        background:'#123b2b', color:'#fff', padding:'12px 14px',
        borderRadius:'12px', boxShadow:'0 8px 28px rgba(0,0,0,.22)',
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px'
      }}
    >
      <span style={{fontSize:'14px', lineHeight:1.35}}>È disponibile una nuova versione dell'app.</span>
      <button type="button" onClick={applyAppUpdate} style={{
        border:0, borderRadius:'8px', padding:'9px 12px', background:'#fff',
        color:'#123b2b', fontWeight:700, cursor:'pointer', whiteSpace:'nowrap'
      }}>Aggiorna</button>
    </div>}
    <aside className="sidebar">
      <Brand sidebar />
      <div className="club-label">TENNIS CLUB<br/><b>PABILLONIS</b></div>

      <nav>
        <button type="button"
          className={activeView==='bookings'?'nav-active nav-button':'nav-button'}
          onClick={()=>setActiveView('bookings')} 
          style={{height:'auto',minHeight:'42px',boxSizing:'border-box',display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',fontSize:'14px',lineHeight:1.2,flexWrap:'nowrap'}}>
          <CalendarDays size={18}/> Prenotazioni
        </button>

        
<button type="button"
  className={activeView==='regulation'?'nav-active nav-button':'nav-button'}
  onClick={()=>setActiveView('regulation')} 
          style={{height:'auto',minHeight:'42px',boxSizing:'border-box',display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',fontSize:'14px',lineHeight:1.2,flexWrap:'nowrap'}}>
  <BookOpen size={18}/> Regolamento
</button>

        <button type="button"
          className={activeView==='announcements'?'nav-active nav-button':'nav-button'}
          onClick={()=>setActiveView('announcements')}
          style={{display:'flex',alignItems:'center',justifyContent:'flex-start',gap:'10px',whiteSpace:'nowrap',height:'42px',minHeight:'42px',maxHeight:'42px',boxSizing:'border-box',padding:'0 12px',fontSize:'14px',lineHeight:1.2,flexWrap:'nowrap',overflow:'hidden'}}>
          <Bell size={18} style={{flex:'0 0 auto'}}/>
          <span style={{whiteSpace:'nowrap'}}>Aggiornamenti</span>
          {announcements.filter(item => !announcementReadIds.includes(item.id)).length > 0 &&
            <span style={{
              marginLeft:'auto', minWidth:'20px', height:'20px', padding:'0 6px',
              borderRadius:'20px', background:'#b94b3e', color:'#fff',
              display:'inline-flex', alignItems:'center', justifyContent:'center',
              fontSize:'11px', fontWeight:800
            }}>
              {announcements.filter(item => !announcementReadIds.includes(item.id)).length}
            </span>
          }
        </button>


        {isAdmin&&<button type="button"
          className={activeView==='members'?'nav-active nav-button':'nav-button'}
          onClick={()=>setActiveView('members')} 
          style={{height:'auto',minHeight:'42px',boxSizing:'border-box',display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',fontSize:'14px',lineHeight:1.2,flexWrap:'nowrap'}}>
          <ShieldCheck size={18}/> Gestione soci
        </button>}

        {isAdmin&&<button type="button"
  className={activeView==='events'?'nav-active nav-button':'nav-button'}
  onClick={()=>setActiveView('events')} 
          style={{height:'auto',minHeight:'42px',boxSizing:'border-box',display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',fontSize:'14px',lineHeight:1.2,flexWrap:'nowrap'}}>
  <CalendarDays size={18}/> Gestione eventi
</button>}

{isSuperAdmin&&<button type="button"
  className={activeView==='history'?'nav-active nav-button':'nav-button'}
  onClick={()=>setActiveView('history')}
  style={{height:'auto',minHeight:'42px',boxSizing:'border-box',display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',fontSize:'14px',lineHeight:1.2,flexWrap:'nowrap'}}>
  <Clock3 size={18}/> Storico prenotazioni
</button>}

        {isSuperAdmin&&<button type="button"
          className={activeView==='admins'?'nav-active nav-button':'nav-button'}
          onClick={()=>setActiveView('admins')} 
          style={{height:'auto',minHeight:'42px',boxSizing:'border-box',display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',fontSize:'14px',lineHeight:1.2,flexWrap:'nowrap'}}>
          <ShieldCheck size={18}/> Gestione amministratori
        </button>}
      </nav>

      <div className="sidebar-bottom">
        <div className="profile-mini">
          <span className="avatar">{profile?.full_name?.[0]||'S'}</span>
          <div>
            <b>{profile?.full_name}</b>
            <small>{isSuperAdmin?'Super Admin':isAdmin?'Amministratore':'Socio'}</small>
          </div>
        </div>
        <button className="logout" onClick={logout}><LogOut size={17}/> Esci</button>
      </div>
    </aside>

    <main className="main-content">
      <header className="topbar">
        <div>
          <span className="eyebrow">AREA SOCI / PRENOTAZIONI</span>
          <h1>Il campo ti aspetta<span>.</span></h1>
        </div>
        <div className="top-actions">
          <button type="button" className="password-button"
             onClick={() => setActiveView('announcements')}
             aria-label="Apri aggiornamenti" title="Aggiornamenti"
             style={{position:'relative'}}>
             <Bell size={18}/>
             {announcements.filter(item => !announcementReadIds.includes(item.id)).length > 0 &&
               <span style={{
                 position:'absolute', top:'-6px', right:'-6px',
                 minWidth:'18px', height:'18px', padding:'0 4px',
                 borderRadius:'20px', background:'#b94b3e', color:'#fff',
                 display:'flex', alignItems:'center', justifyContent:'center',
                 fontSize:'10px', fontWeight:800, border:'2px solid #fff'
               }}>
                 {announcements.filter(item => !announcementReadIds.includes(item.id)).length}
               </span>
             }
           </button>
           <span className="live-dot">Sistema attivo</span>
          <button type="button" className="password-button"
            onClick={()=>{setNotice('');setShowPassword(true);}}>
            <KeyRound size={17}/> Cambia password
          </button>
          <button type="button" className="exit-button" onClick={logout}>
            <LogOut size={17}/> Esci
          </button>
          <span className="avatar large">{profile?.full_name?.[0]||'S'}</span>
        </div>
      </header>

      {activeView==='bookings'&&<>
        <section className="welcome-strip">
          <div><Sparkles size={18}/><span>È il momento di giocare. Scegli il tuo prossimo slot.</span></div>
          <span>2 CAMPI · 60 MINUTI</span>
        </section>

        <section className="date-section">
          <div>
            <span className="eyebrow">CALENDARIO</span>
            <h2>Le disponibilità</h2>
          </div>
          <div className="date-tabs">
            {days.map((d,i)=><button key={i}
              onClick={()=>setSelectedDate(dateKey(d))}
              className={selectedDate===dateKey(d)?'date-tab selected':''}>
              <small>{['OGGI','DOMANI','DOPODOMANI'][i]}</small>
              <b>{pad(d.getDate())}</b>
              <span>{d.toLocaleDateString('it-IT',{month:'short'})}</span>
              <span style={{
                display:'block',
                marginTop:'3px',
                fontSize:'11px',
                lineHeight:1.2,
                fontWeight:600,
                textTransform:'capitalize'
              }}>
                {d.toLocaleDateString('it-IT',{weekday:'long'})}
              </span>
            </button>)}
          </div>
        </section>

        <div className="booking-toolbar">
          <div className="selected-date"><CalendarDays size={17}/><b>{prettyDate(selected)}</b></div>
          <div className="filters">
            <button className={court==='all'?'filter active':''} onClick={()=>setCourt('all')}>Tutti i campi</button>
            <button className={court==='1'?'filter active':''} onClick={()=>setCourt('1')}>Campo 1</button>
            <button className={court==='2'?'filter active':''} onClick={()=>setCourt('2')}>Campo 2</button>
          </div>
          {isAdmin&&<button
            type="button"
            className="password-button"
            onClick={()=>{
              setNotice('');
              setAdminBooking({court_id:court==='all'?'1':court,time:'',type:'singles',players:['','','',''],guests:['','','','']});
              setShowAdminBooking(true);
            }}
          >
            <Plus size={17}/> Prenota per un socio
          </button>}
          {!isAdmin&&<button className="primary" onClick={()=>{setNewBooking({court_id:'1',time:'',type:'singles',players:['',''],guests:['','']});setShowBooking(true);}} disabled={!canBook()}>
            <Plus size={17}/> Nuova prenotazione
          </button>}
        </div>

        <section className="courts-grid">
          {[1,2].filter(c=>court==='all'||String(c)===court).map(c=><article className="court-card" key={c}>
            <div className="court-head">
              <div>
                <span className="eyebrow">CAMPO {c===1?'01':'02'}</span>
                <h3>Campo {c}</h3>
              </div>
              <span className="court-status"><i/> Disponibile</span>
            </div>

            <TennisCourt/>

            <div className="slots-head"><b>Orari</b><small>Slot da 60 minuti</small></div>
            <div className="slots">
              {hours.map(t=>{
                const b=bookingAt(c,t);
    const ev=eventAt(c,t);
                const now = new Date();
                const nowAbsolute = dateToDayNumber(dateKey(now)) * 1440 + now.getHours() * 60 + now.getMinutes();
                const slotStartAbsolute = dateToDayNumber(selectedDate) * 1440 + timeToMinutes(t);
                const slotEndAbsolute = b ? bookingEndAbsolute(b) : slotStartAbsolute;
                const past = b
                  ? slotEndAbsolute <= nowAbsolute
                  : slotStartAbsolute <= nowAbsolute;

                return (
                  <div
                    key={t}
                    className={`slot ${b?'occupied':ev?'event-occupied':''} ${past?'past':''} ${b?.created_by?'admin-created':''}`}
                    onClick={b
  ? ()=>setSelectedBooking(b)
  : ev
    ? ()=>setSelectedEvent(ev)
    : undefined
}
role={b||ev?'button':undefined}
tabIndex={b||ev?0:undefined}
                    onKeyDown={(b||ev)?(e)=>{
  if(e.key==='Enter'||e.key===' '){
    e.preventDefault();
    if(b) setSelectedBooking(b);
    else if(ev) setSelectedEvent(ev);
  }
}:undefined}
                    style={b||ev?{
                      cursor:'pointer',
                      ...(b?.created_by?{background:'#dff1ff',borderColor:'#86c5e8',color:'#174b70'}:{})
                    }:undefined}
aria-label={
  b
    ? `Apri dettagli prenotazione delle ${t}`
    : ev
      ? `Apri dettagli evento ${ev.title}`
      : undefined
}
                  >
                    <span>{t}</span>
                    {b
  ? <div className="slot-info" style={{
      minWidth:0,
      maxWidth:'100%',
      maxHeight:'34px',
      overflow:'hidden',
      display:'flex',
      flexDirection:'column',
      gap:'2px'
    }}>
      <b style={{
        display:'block',
        minWidth:0,
        maxWidth:'100%',
        overflow:'hidden',
        textOverflow:'ellipsis',
        whiteSpace:'nowrap'
      }}>{playerNames(b)}</b>
      <small style={{
        display:'block',
        lineHeight:1.15,
        overflow:'hidden',
        textOverflow:'ellipsis',
        whiteSpace:'nowrap'
      }}>{b.booking_type==='singles'?'Singolo':'Doppio'}</small>
      {b.created_by&&<small style={{
        display:'block',
        maxWidth:'calc(100% - 18px)',
        fontWeight:700,
        color:'#17618f',
        fontSize:'8px',
        lineHeight:1.1,
        overflow:'hidden',
        textOverflow:'ellipsis',
        whiteSpace:'nowrap'
      }}>Prenotazione amministrativa</small>}
    </div>
  : ev
    ? <div className="slot-info event-info" style={{
        minWidth:0,
        maxWidth:'100%',
        maxHeight:'34px',
        overflow:'hidden',
        display:'flex',
        flexDirection:'column',
        gap:'2px'
      }}>
        <b style={{
          display:'block',
          minWidth:0,
          maxWidth:'100%',
          overflow:'hidden',
          textOverflow:'ellipsis',
          whiteSpace:'nowrap'
        }}>{ev.title}</b>
        <small style={{
          display:'block',
          overflow:'hidden',
          textOverflow:'ellipsis',
          whiteSpace:'nowrap'
        }}>Evento</small>
      </div>
    : <small>{past?'Passato':'Libero'}</small>
}
                    {b&&canCancelBooking(b)&&
                      <button
                        className="slot-cancel"
                        title="Cancella"
                        onClick={e=>{
                          e.stopPropagation();
                          cancelBooking(b.id);
                        }}
                      >
                        <X size={14}/>
                      </button>
                    }
                  </div>
                );
              })}
            </div>
          </article>)}
        </section>
      
      </>}

      
{activeView==='announcements'&&<section className="admin-panel">
  <div className="admin-heading">
    <div>
      <span className="eyebrow">TENNIS CLUB PABILLONIS</span>
      <h2>Aggiornamenti da amministratori</h2>
      <p className="muted">Comunicazioni ufficiali del circolo.</p>
    </div>
    <Bell size={28}/>
  </div>

  {isAdmin&&profile?.status==='active'&&
    <div style={{marginTop:'20px',padding:'18px',border:'1px solid #e1e8e1',
      borderRadius:'16px',background:'#fbfcfa'}}>
      <h3 style={{marginTop:0}}>
        {editingAnnouncementId ? 'Modifica aggiornamento' : 'Pubblica un aggiornamento'}
      </h3>
      <form className="member-form" onSubmit={saveAnnouncement}>
        <input type="text" placeholder="Titolo dell’aggiornamento"
          value={announcementForm.title}
          onChange={e=>setAnnouncementForm({...announcementForm,title:e.target.value})}
          maxLength={140} required/>
        <select value={announcementForm.category}
          onChange={e=>setAnnouncementForm({...announcementForm,category:e.target.value})}>
          <option value="Avviso">Avviso</option>
          <option value="Importante">Importante</option>
          <option value="Evento">Evento</option>
          <option value="Manutenzione">Manutenzione</option>
        </select>
        <textarea placeholder="Scrivi il testo della comunicazione..."
          value={announcementForm.content}
          onChange={e=>setAnnouncementForm({...announcementForm,content:e.target.value})}
          rows={5} required
          style={{gridColumn:'1 / -1',width:'100%',minWidth:0,boxSizing:'border-box',minHeight:'140px'}}/>
        <label style={{display:'flex',alignItems:'center',gap:'9px',gridColumn:'1 / -1',width:'100%',minWidth:0}}>
          <input type="checkbox" checked={announcementForm.is_pinned}
            onChange={e=>setAnnouncementForm({...announcementForm,is_pinned:e.target.checked})}/>
          Fissa in evidenza in cima alla bacheca
        </label>
        <div style={{display:'grid',gap:'8px',gridColumn:'1 / -1',width:'100%',minWidth:0}}>
          <label htmlFor="announcement-attachment" style={{fontWeight:700}}>Allega un file (facoltativo)</label>
          <input id="announcement-attachment" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
            onChange={e=>setAnnouncementAttachment(e.target.files?.[0] || null)}/>
          <small className="muted">
            Formati consentiti: PDF, JPG e PNG. Dimensione massima: 10 MB.
            {editingAnnouncementId && announcements.find(item=>item.id===editingAnnouncementId)?.attachment_path
              ? ' Se non scegli un nuovo file, quello già allegato viene mantenuto.' : ''}
          </small>
          {editingAnnouncementId && announcements.find(item=>item.id===editingAnnouncementId)?.attachment_path &&
            <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
              <small>È già presente un allegato.</small>
              <button type="button" className="password-button"
                style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'8px',width:'auto',minWidth:0,minHeight:'38px',padding:'8px 14px',fontSize:'13px',lineHeight:1.2,flex:'0 0 auto'}}
                onClick={()=>removeAnnouncementAttachment(announcements.find(item=>item.id===editingAnnouncementId))}>
                <Trash2 size={15}/> Elimina solo allegato
              </button>
            </div>}
          {announcementAttachment&&<small>File selezionato: {announcementAttachment.name}</small>}
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'flex-start',gap:'10px',flexWrap:'wrap',gridColumn:'1 / -1',width:'100%'}}>
          <button className="primary" type="submit" disabled={savingAnnouncement}
            style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:'8px',width:'auto',minWidth:0,minHeight:'42px',padding:'10px 16px',fontSize:'14px',lineHeight:1.2,flex:'0 0 auto'}}>
            <Save size={16}/>
            {savingAnnouncement ? 'Salvataggio…' : editingAnnouncementId ? 'Salva modifiche' : 'Pubblica aggiornamento'}
          </button>
          {editingAnnouncementId&&
            <button type="button" className="password-button" onClick={resetAnnouncementForm}
              style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:'auto',minWidth:0,minHeight:'42px',padding:'10px 16px',fontSize:'14px',lineHeight:1.2,flex:'0 0 auto'}}>
              Annulla modifica
            </button>}
        </div>
      </form>
    </div>}

  <div className="admin-list" style={{marginTop:'22px'}}>
    {announcements.length===0
      ? <p className="muted">Non ci sono ancora aggiornamenti pubblicati.</p>
      : announcements.map(item => {
          const isRead = announcementReadIds.includes(item.id);
          return <article key={item.id} style={{
            padding:'16px',marginBottom:'12px',border:'1px solid #e1e8e1',
            borderRadius:'14px',background:isRead?'#ffffff':'#f5f9f1',
            display:'grid',gap:'9px'
          }}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
              <span style={{
                fontSize:'11px',fontWeight:800,textTransform:'uppercase',
                letterSpacing:'.5px',padding:'5px 8px',borderRadius:'20px',
                background:item.category==='Importante'?'#fff0e8':'#eaf2e4',
                color:item.category==='Importante'?'#a33b32':'#557b42'
              }}>{item.category}</span>
              {item.is_pinned&&<span style={{display:'inline-flex',alignItems:'center',
                gap:'4px',fontSize:'11px',fontWeight:700,color:'#557b42'}}>
                <Pin size={13}/> In evidenza
              </span>}
              {!isRead&&<span style={{fontSize:'11px',fontWeight:800,color:'#a33b32'}}>NUOVO</span>}
            </div>
            <h3 style={{margin:0}}>{item.title}</h3>
            <small style={{color:'#718078'}}>
              {new Date(item.created_at).toLocaleDateString('it-IT',{
                day:'numeric',month:'long',year:'numeric'
              })}
              {' · '}
              {adminProfiles.find(admin => admin.id === item.created_by)?.full_name
                || (item.created_by===session?.user?.id ? profile?.full_name : 'Amministrazione')}
            </small>
            <p style={{margin:0,whiteSpace:'pre-wrap',lineHeight:1.65,overflowWrap:'anywhere'}}>
              {item.content.length>220 ? item.content.slice(0,220)+'…' : item.content}
            </p>
            <div style={{display:'flex',gap:'9px',alignItems:'center',flexWrap:'wrap'}}>
              <button type="button" className="password-button"
                onClick={()=>openAnnouncement(item)}>Leggi aggiornamento</button>
              {isAdmin&&profile?.status==='active'&&<>
                <button type="button" className="password-button"
                  onClick={()=>editAnnouncement(item)}>
                  <Pencil size={15}/> Modifica
                </button>
                <button type="button" className="password-button"
                  onClick={()=>deleteAnnouncement(item)} style={{color:'#a33b32'}}>
                  <Trash2 size={15}/> Elimina
                </button>
              </>}
            </div>
          </article>;
        })}
  </div>
</section>}

{activeView==='regulation'&&<section className="admin-panel">
  <div className="admin-heading">
    <div>
      <span className="eyebrow">TENNIS CLUB PABILLONIS</span>
      <h2>Il nostro regolamento</h2>
      <p className="muted">
        Le regole per vivere al meglio il nostro circolo.
      </p>
    </div>
    <BookOpen size={28}/>
  </div>

  <div style={{
    background:'#f8faf7',
    border:'1px solid #e4e9e1',
    borderRadius:'16px',
    padding:'22px',
    marginTop:'20px',
    lineHeight:1.8,
    fontSize:'15px',
    color:'#26352b',
    whiteSpace:'pre-wrap',
    overflowWrap:'anywhere'
  }}>
    {editingRegulation && isAdmin
      ? <textarea
          value={regulation}
          onChange={e=>setRegulation(e.target.value)}
          rows={24}
          style={{
            width:'100%',
            minHeight:'500px',
            padding:'14px',
            border:'1px solid #d5ddd2',
            borderRadius:'10px',
            fontSize:'15px',
            lineHeight:1.8,
            resize:'vertical',
            fontFamily:'inherit',
            boxSizing:'border-box'
          }}
        />
      : regulation || 'Regolamento non disponibile.'
    }
  </div>

  {isAdmin&&<div style={{
    display:'flex',
    gap:'12px',
    flexWrap:'wrap',
    marginTop:'20px'
  }}>
    {!editingRegulation
      ? <button type="button" className="primary"
          onClick={()=>setEditingRegulation(true)}>
          <Pencil size={17}/> Modifica regolamento
        </button>
      : <>
          <button type="button" className="primary"
            onClick={saveRegulation}
            disabled={savingRegulation}>
            <Save size={17}/>
            {savingRegulation?'Salvataggio...':'Salva e pubblica'}
          </button>
          <button type="button" className="password-button"
            onClick={()=>setEditingRegulation(false)}>
            Annulla
          </button>
        </>
    }
  </div>}

  {notice&&<div className="notice" style={{marginTop:'16px'}}>
    {notice}
  </div>}
</section>}


      {activeView==='events'&&isAdmin&&<section className="admin-panel">
        <div className="admin-heading">
          <div>
            <span className="eyebrow">PANNELLO AMMINISTRATORE</span>
            <h2>Gestione eventi</h2>
          </div>
          <CalendarDays/>
        </div>

        <h3>Organizza un nuovo evento</h3>

        <form className="member-form event-form" onSubmit={createEvent}>
          <input
            type="text"
            placeholder="Titolo dell'evento"
            value={eventForm.title}
            onChange={e=>setEventForm({...eventForm,title:e.target.value})}
            required
          />

          <textarea
            placeholder="Descrizione dell'evento"
            value={eventForm.description}
            onChange={e=>setEventForm({...eventForm,description:e.target.value})}
            rows="3"
          />

         <label>Data dell'evento</label>
<input
  type="date"
  value={eventForm.event_date}
  min={dateKey(new Date())}
  max={dateKey(new Date(Date.now()+17*24*60*60*1000))}
  onChange={e=>setEventForm({...eventForm,event_date:e.target.value})}
  required
/>

<label>Orario di inizio</label>
<select
  value={eventForm.start_time}
  onChange={e=>setEventForm({...eventForm,start_time:e.target.value})}
  required
>
  {Array.from({length:24},(_,h)=>`${String(h).padStart(2,'0')}:00`).map(t=>(
    <option key={t} value={t}>{t}</option>
  ))}
</select>

<label>Orario di fine</label>
<select
  value={eventForm.end_time}
  onChange={e=>setEventForm({...eventForm,end_time:e.target.value})}
  required
>
  {Array.from({length:24},(_,h)=>`${String(h).padStart(2,'0')}:00`).map(t=>(
    <option key={t} value={t}>{t}</option>
  ))}
</select>
          <label>Campi da riservare</label>

          <div style={{display:'flex',gap:'20px',flexWrap:'wrap'}}>
            {[1,2].map(c=><label key={c} style={{
              display:'flex',alignItems:'center',gap:'8px'
            }}>
              <input
                type="checkbox"
                checked={eventForm.court_ids.includes(String(c))}
                onChange={e=>setEventForm({
                  ...eventForm,
                  court_ids:e.target.checked
                    ? [...eventForm.court_ids,String(c)]
                    : eventForm.court_ids.filter(id=>id!==String(c))
                })}
              />
              Campo {c}
            </label>)}
          </div>

          <button
            type="submit"
            className="primary"
            disabled={savingEvent||eventForm.court_ids.length===0}
          >
            <Plus size={16}/>
            {savingEvent?'Creazione in corso...':'Crea evento'}
          </button>
        </form>

        <div className="admin-heading admin-subheading">
          <div>
            <span className="eyebrow">CALENDARIO EVENTI</span>
            <h2>Eventi programmati</h2>
          </div>
        </div>

        <div className="admin-list">
          {events.length===0
            ? <p className="muted">Non ci sono eventi programmati.</p>
            : events.map(ev=><div className="admin-list-row" key={ev.id}>
                <div style={{display:'grid',gap:'5px',minWidth:0}}>
                  <b>{ev.title}</b>
                  <small>
                    {new Date(ev.event_date+'T00:00:00').toLocaleDateString('it-IT')}
                    {' · '}
                    {String(ev.start_time).slice(0,5)}
                    {' - '}
                    {String(ev.end_time).slice(0,5)}
                  </small>
                  <small>
                    {(ev.event_courts||[])
                      .map(ec=>'Campo '+ec.court_id)
                      .join(' · ')}
                  </small>
                  {ev.description&&<small>{ev.description}</small>}
                </div>

                <button
                  type="button"
                  className="menu-danger"
                  onClick={()=>cancelEvent(ev.id)}
                >
                  Annulla evento
                </button>
              </div>)
          }
        </div>
      </section>}

      {activeView==='members'&&isAdmin&&<section className="admin-panel">

        <div className="admin-heading">
          <div>
            <span className="eyebrow">PANNELLO AMMINISTRATORE</span>
            <h2>Gestione soci</h2>
          </div>
          <ShieldCheck/>
        </div>

        <h3>Nuovo socio</h3>
        <form className="member-form" onSubmit={addMember}>
          <input placeholder="Nome" value={newMember.name}
            onChange={e=>setNewMember({...newMember,name:e.target.value})} required/>
          <input placeholder="Cognome" value={newMember.surname}
            onChange={e=>setNewMember({...newMember,surname:e.target.value})} required/>
          <input type="email" placeholder="Email" value={newMember.email}
            onChange={e=>setNewMember({...newMember,email:e.target.value})} required/>
          <input type="password" placeholder="Password iniziale" value={newMember.password}
            onChange={e=>setNewMember({...newMember,password:e.target.value})}
            minLength="8" required/>
          <button className="primary">Crea account <Plus size={16}/></button>
        </form>

        <div className="admin-heading admin-subheading">
          <div>
            <span className="eyebrow">ELENCO SOCI</span>
<h2>Soci registrati</h2>
<div className="member-stats">
  <div className="member-stat">
    <span>Soci totali</span>
    <b>{allMembers.filter(m=>m.status!=='deleted').length}</b>
  </div>

  <div className="member-stat">
    <span>Soci attivi</span>
    <b>{members.length}</b>
  </div>

  <div className="member-stat">
    <span>Soci sospesi</span>
    <b>{allMembers.filter(m=>m.status==='suspended').length}</b>
  </div>
</div>
          </div>
        </div>

        <label style={{display:'grid',gap:'6px',margin:'12px 0 14px',fontWeight:600}}>
          Cerca socio per nome o cognome
          <input
            type="search"
            value={memberListSearch}
            onChange={e=>setMemberListSearch(e.target.value)}
            placeholder="Scrivi nome o cognome..."
            style={{width:'100%',boxSizing:'border-box'}}
          />
        </label>

        <div className="admin-list">
          {allMembers.length===0
            ? <p className="muted">Nessun socio presente.</p>
            : allMembers.filter(m=>{
                const search=memberListSearch.trim().toLocaleLowerCase('it');
                return !search ||
                  String(m.full_name||'').toLocaleLowerCase('it').includes(search) ||
                  surnameFirst(m.full_name).toLocaleLowerCase('it').includes(search);
              }).length===0
              ? <p className="muted">Nessun socio corrisponde alla ricerca.</p>
              : allMembers
                  .filter(m=>{
                    const search=memberListSearch.trim().toLocaleLowerCase('it');
                    return !search ||
                      String(m.full_name||'').toLocaleLowerCase('it').includes(search) ||
                      surnameFirst(m.full_name).toLocaleLowerCase('it').includes(search);
                  })
                  .sort(sortBySurname)
                  .map(m=><div className="admin-list-row" key={m.id}>
                <div className="member-info" style={{
                  display:'flex',alignItems:'center',gap:'12px',minWidth:0
                }}>
                  <b>{surnameFirst(m.full_name)}</b>
                  <small className={`member-status ${
                    m.status==='active'?'status-active':
                    m.status==='suspended'?'status-suspended':'status-deleted'
                  }`} style={{marginLeft:'6px'}}>
                    <i/>
                    {m.status==='active'?'Attivo':
                      m.status==='suspended'?'Sospeso':'Eliminato'}
                  </small>
                </div>

                <div className="member-actions" style={{position:'relative',marginLeft:'16px'}}>
                  <button
                    type="button"
                    className="member-menu-button"
                    aria-expanded={openMemberMenu===m.id}
                    onClick={()=>setOpenMemberMenu(openMemberMenu===m.id?null:m.id)}
                  >
                    Azioni <ChevronDown size={15}/>
                  </button>

                  {openMemberMenu===m.id&&
                    <div className="member-actions-menu" style={{
                      position:'absolute',right:0,top:'calc(100% + 6px)',zIndex:20,
                      minWidth:'170px',padding:'6px',background:'#fff',
                      border:'1px solid #e1e8e1',borderRadius:'12px',
                      boxShadow:'0 10px 28px rgba(20,40,30,.14)',
                      display:'grid',gap:'3px'
                    }}>
                      <button type="button" style={{textAlign:'left',padding:'10px 12px',border:0,borderRadius:'8px',background:'transparent',cursor:'pointer',color:'#193329'}} onClick={()=>{setOpenMemberMenu(null);editMember(m);}}>
                        Modifica dati
                      </button>
                                            {m.status!=='deleted'&&
                        <button
                          type="button"
                          style={{
                            textAlign:'left',
                            padding:'10px 12px',
                            border:0,
                            borderRadius:'8px',
                            background:'transparent',
                            cursor:'pointer',
                            color:'#193329'
                          }}
                          onClick={()=>{
                            setOpenMemberMenu(null);
                            resetMemberPassword(m);
                          }}
                        >
                          Reimposta password
                        </button>}
                      {m.status==='active'&&
                        <button type="button" style={{textAlign:'left',padding:'10px 12px',border:0,borderRadius:'8px',background:'transparent',cursor:'pointer',color:'#193329'}} onClick={()=>{setOpenMemberMenu(null);setMemberStatus(m,'suspended');}}>
                          Sospendi socio
                        </button>}
                      {(m.status==='suspended'||m.status==='deleted')&&
                        <button type="button" style={{textAlign:'left',padding:'10px 12px',border:0,borderRadius:'8px',background:'transparent',cursor:'pointer',color:'#193329'}} onClick={()=>{setOpenMemberMenu(null);setMemberStatus(m,'active');}}>
                          Riattiva socio
                        </button>}
                      {m.status!=='deleted'&&
                        <button type="button" className="menu-danger" style={{textAlign:'left',padding:'10px 12px',border:0,borderRadius:'8px',background:'transparent',cursor:'pointer',color:'#a33b32'}} onClick={()=>{setOpenMemberMenu(null);setMemberStatus(m,'deleted');}}>
                          Elimina socio
                        </button>}
                    </div>}
                </div>
              </div>)
          }
        </div>
      </section>}

      {activeView==='history'&&isAdmin&&profile?.status==='active'&&<section className="admin-panel">
        <div className="admin-heading">
          <div>
            <span className="eyebrow">AREA RISERVATA AMMINISTRATORI</span>
            <h2>Storico prenotazioni</h2>
            <p className="muted">Registro delle prenotazioni create, cancellate e delle partite concluse dal 20 novembre 2026.</p>
          </div>
          <Clock3 size={28}/>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:'12px',margin:'20px 0'}}>
          <label style={{display:'grid',gap:'6px',fontWeight:600}}>
            Data
            <input type="date" value={historyDateFilter}
              onChange={e=>setHistoryDateFilter(e.target.value)}
              style={{width:'100%',boxSizing:'border-box'}}/>
          </label>
          <label style={{display:'grid',gap:'6px',fontWeight:600}}>
            Socio / partecipante
            <input
              type="search"
              list="history-member-options"
              value={historyMemberFilter==='all'?'':historyMemberFilter}
              onChange={e=>setHistoryMemberFilter(e.target.value.trim() || 'all')}
              placeholder="Tutti i soci · cerca per nome o cognome..."
              style={{width:'100%',boxSizing:'border-box'}}
            />
            <datalist id="history-member-options">
              {[...new Set(bookingHistory.flatMap(item => {
                const snap = item.booking_snapshot || {};
                const booking = snap.booking || snap;
                const participants = Array.isArray(snap.participants) ? snap.participants : [];
                const names = participants.map(player => player?.display_name).filter(Boolean);
                if (booking.owner_name) names.push(booking.owner_name);
                return names;
              }))].sort((a,b)=>surnameFirst(a).localeCompare(surnameFirst(b),'it',{sensitivity:'base'})).map(name =>
                <option key={name} value={surnameFirst(name)} />
              )}
            </datalist>
          </label>
          <label style={{display:'grid',gap:'6px',fontWeight:600}}>
            Campo
            <select value={historyCourtFilter}
              onChange={e=>setHistoryCourtFilter(e.target.value)}
              style={{width:'100%',boxSizing:'border-box'}}>
              <option value="all">Tutti i campi</option>
              <option value="1">Campo 1</option>
              <option value="2">Campo 2</option>
            </select>
          </label>
          <label style={{display:'grid',gap:'6px',fontWeight:600}}>
            Tipologia
            <select value={historyTypeFilter}
              onChange={e=>setHistoryTypeFilter(e.target.value)}
              style={{width:'100%',boxSizing:'border-box'}}>
              <option value="all">Tutte</option>
              <option value="created">Prenotate</option>
              <option value="cancelled">Cancellate</option>
              <option value="expired">Concluse</option>
            </select>
          </label>
        </div>

        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexWrap:'wrap',marginBottom:'14px'}}>
          <span className="muted">{bookingHistory.length} eventi registrati</span>
          <button type="button" className="password-button" onClick={loadBookingHistory} disabled={historyLoading}>
            {historyLoading?'Aggiornamento...':'Aggiorna storico'}
          </button>
        </div>

        {historyError&&<div className="notice">{historyError}</div>}
        {historyLoading&&bookingHistory.length===0
          ? <p className="muted">Caricamento dello storico...</p>
          : (() => {
              const filteredHistory = bookingHistory.filter(item => {
                const snap = item.booking_snapshot || {};
                const booking = snap.booking || snap;
                const bookingDate = booking.booking_date || '';
                const courtId = booking.court_id == null ? '' : String(booking.court_id);
                const participants = Array.isArray(snap.participants) ? snap.participants : [];
                const names = participants.map(player => player?.display_name).filter(Boolean);
                if (booking.owner_name) names.push(booking.owner_name);
                const matchesDate = !historyDateFilter || bookingDate === historyDateFilter;
                const matchesCourt = historyCourtFilter === 'all' || courtId === historyCourtFilter;
                const matchesMember = historyMemberFilter === 'all' || names.some(name => surnameFirst(name).toLocaleLowerCase('it').includes(historyMemberFilter.toLocaleLowerCase('it')));
                const matchesType = historyTypeFilter === 'all' || item.event_type === historyTypeFilter;
                return matchesDate && matchesCourt && matchesMember && matchesType;
              });

              const eventLabels = {
                created:'Prenotata',
                cancelled:'Cancellata',
                expired:'Conclusa'
              };

              const formatDateTime = value => value
                ? new Date(value).toLocaleString('it-IT', {
                    day:'2-digit',month:'2-digit',year:'numeric',
                    hour:'2-digit',minute:'2-digit'
                  })
                : 'Non disponibile';

              return filteredHistory.length === 0
                ? <p className="muted">Nessun evento trovato con i filtri selezionati.</p>
                : <div style={{overflowX:'auto',border:'1px solid #e2e8e3',borderRadius:'12px',background:'#fff'}}>
                    <div style={{minWidth:'850px'}}>
                      <div style={{display:'grid',gridTemplateColumns:'110px 105px 110px 85px 85px minmax(150px,1fr) 145px 28px',gap:'10px',alignItems:'center',padding:'10px 14px',background:'#f5f8f5',borderBottom:'1px solid #e2e8e3',fontSize:'0.78rem',fontWeight:700,color:'#607168'}}>
                        <span>Stato</span><span>Data partita</span><span>Orario</span><span>Campo</span><span>Tipo</span><span>Prenotante</span><span>Registrato il</span><span/>
                      </div>
                    {filteredHistory.map(item => {
                      const snap = item.booking_snapshot || {};
                      const booking = snap.booking || snap;
                      const participants = Array.isArray(snap.participants) ? snap.participants : [];
                      const participantNames = participants.map(player => player?.display_name).filter(Boolean);
                      const bookingDate = booking.booking_date
                        ? new Date(`${booking.booking_date}T12:00:00`).toLocaleDateString('it-IT')
                        : 'Data non disponibile';
                      const startTime = String(booking.start_time || '').slice(0,5);
                      const endTime = String(booking.end_time || '').slice(0,5);
                      const courtLabel = booking.court_id ? `Campo ${booking.court_id}` : 'Campo non disponibile';
                      const typeLabel = booking.booking_type === 'doubles' ? 'Doppio' : 'Singolo';
                      const statusLabel = eventLabels[item.event_type] || item.event_type || 'Evento';
                      const ownerName = booking.owner_name || 'Non disponibile';
                      const actorName = item.actor_name || (
                        item.event_type === 'expired' ? 'Sistema automatico' : 'Non disponibile'
                      );

                      const isExpanded = expandedHistoryId === item.id;
                      const detailsId = `history-details-${item.id}`;

                      return <article key={item.id} style={{borderBottom:'1px solid #edf1ed'}}>
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-controls={detailsId}
                          onClick={()=>setExpandedHistoryId(isExpanded ? null : item.id)}
                          style={{
                            width:'100%',display:'grid',
                            gridTemplateColumns:'110px 105px 110px 85px 85px minmax(150px,1fr) 145px 28px',
                            gap:'10px',alignItems:'center',minWidth:'850px',
                            padding:'12px 14px',border:0,background:'transparent',
                            color:'inherit',textAlign:'left',cursor:'pointer',fontSize:'0.88rem'
                          }}
                        >
                          <strong>{statusLabel}</strong>
                          <span>{bookingDate}</span>
                          <span>{startTime || '--:--'}{endTime ? `–${endTime}` : ''}</span>
                          <span>{courtLabel}</span>
                          <span>{typeLabel}</span>
                          <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ownerName}</span>
                          <small className="muted">{formatDateTime(item.occurred_at)}</small>
                          <ChevronDown size={16} style={{transform:isExpanded?'rotate(180deg)':'rotate(0deg)',transition:'transform .2s'}}/>
                        </button>
                        {isExpanded&&<div id={detailsId} style={{
                          display:'grid',gap:'7px',padding:'0 14px 13px',
                          borderTop:'1px solid #edf1ed',fontSize:'0.94rem'
                        }}>
                          <div style={{paddingTop:'10px'}}><b>Prenotante:</b> {ownerName}</div>
                          <div><b>Partecipanti:</b> {participantNames.length ? participantNames.join(', ') : 'Nessun nominativo salvato'}</div>
                          <small className="muted"><b>Creata il:</b> {formatDateTime(booking.created_at)}</small>
                          <small className="muted"><b>Effettuata da:</b> {actorName}</small>
                          {item.event_type === 'cancelled' &&
                            <small className="muted"><b>Cancellata il:</b> {formatDateTime(item.occurred_at)}</small>}
                          {item.event_type === 'expired' &&
                            <small className="muted"><b>Partita conclusa il:</b> {formatDateTime(item.occurred_at)}</small>}
                          <small className="muted">ID prenotazione: {item.booking_id}</small>
                        </div>}
                      </article>;
                    })}
                    </div>
                  </div>;
            })()}
      </section>}

      {activeView==='admins'&&isSuperAdmin&&<section className="admin-panel">
        <div className="admin-heading">
          <div>
            <span className="eyebrow">AREA RISERVATA SUPER ADMIN</span>
            <h2>Gestione amministratori</h2>
          </div>
          <ShieldCheck/>
        </div>

        <h3>Nuovo amministratore</h3>
        <form className="member-form" onSubmit={addAdmin}>
          <input placeholder="Nome" value={newAdmin.name}
            onChange={e=>setNewAdmin({...newAdmin,name:e.target.value})} required/>
          <input placeholder="Cognome" value={newAdmin.surname}
            onChange={e=>setNewAdmin({...newAdmin,surname:e.target.value})} required/>
          <input type="email" placeholder="Email" value={newAdmin.email}
            onChange={e=>setNewAdmin({...newAdmin,email:e.target.value})} required/>
          <input type="password" placeholder="Password iniziale" value={newAdmin.password}
            onChange={e=>setNewAdmin({...newAdmin,password:e.target.value})}
            minLength="8" required/>
          <select
  value={newAdmin.role}
  onChange={e=>setNewAdmin({...newAdmin,role:e.target.value})}
>
  <option value="admin">Amministratore</option>
  <option value="super_admin">Super Amministratore</option>
</select>
          <button className="primary" disabled={savingAdmin}>
            {savingAdmin?'Creazione…':'Crea amministratore'} <Plus size={16}/>
          </button>
        </form>

        <div className="admin-heading admin-subheading">
          <div>
            <span className="eyebrow">AMMINISTRATORI ATTUALI</span>
            <h2>Elenco amministratori</h2>
          </div>
        </div>

        
{adminProfiles.length===0
  ? <p className="muted">Non ci sono altri amministratori.</p>
  : <div className="admin-list">
      {adminProfiles.map(a=><div
        className="admin-list-row"
        key={a.id}
        style={{
          display:'flex',
          alignItems:'center',
          justifyContent:'space-between',
          gap:'16px',
          flexWrap:'wrap'
        }}
      >
        <div className="member-info" style={{
          display:'flex',
          alignItems:'center',
          gap:'12px',
          flexWrap:'wrap',
          minWidth:0,
          flex:'1 1 260px'
        }}>
          <b>{surnameFirst(a.full_name)}</b>

          <small style={{
            color:'#718078',
            fontSize:'13px',
            lineHeight:1.4
          }}>
            {a.role==='super_admin'
              ? 'Super Amministratore'
              : 'Amministratore'}
          </small>

          <small className={`member-status ${
            a.status==='active'
              ? 'status-active'
              : 'status-suspended'
          }`}>
            <i/>
            {a.status==='active'?'Attivo':'Non attivo'}
          </small>
        </div>

        {a.id!==session?.user?.id && a.email?.toLowerCase()!=='andrea.cirronis@tiscali.it'&&(
          <div className="member-actions" style={{
            position:'relative',
            marginLeft:'auto',
            flexShrink:0
          }}>
            <button
              type="button"
              className="member-menu-button"
              aria-expanded={openMemberMenu===a.id}
              aria-haspopup="true"
              onClick={()=>setOpenMemberMenu(
                openMemberMenu===a.id?null:a.id
              )}
            >
              Azioni <ChevronDown size={15}/>
            </button>

            {openMemberMenu===a.id&&
              <div className="member-actions-menu" style={{
                position:'absolute',
                right:0,
                top:'calc(100% + 6px)',
                zIndex:20,
                minWidth:'210px',
                padding:'6px',
                background:'#fff',
                border:'1px solid #e1e8e1',
                borderRadius:'12px',
                boxShadow:'0 10px 28px rgba(20,40,30,.14)',
                display:'grid',
                gap:'3px'
              }}>
                <button
                  type="button"
                  style={{
                    textAlign:'left',
                    padding:'10px 12px',
                    border:0,
                    borderRadius:'8px',
                    background:'transparent',
                    cursor:'pointer',
                    color:'#193329'
                  }}
                  onClick={()=>{
                    setOpenMemberMenu(null);
                    setAdminStatus(a.id, a.status==='active'?'suspended':'active');
                  }}
                >
                  {a.status==='active'?'Sospendi amministratore':'Riattiva amministratore'}
                </button>

                <button
                  type="button"
                  className="menu-danger"
                  style={{
                    textAlign:'left',
                    padding:'10px 12px',
                    border:0,
                    borderRadius:'8px',
                    background:'transparent',
                    cursor:'pointer',
                    color:'#a33b32'
                  }}
                  onClick={()=>{
                    setOpenMemberMenu(null);
                    deleteAdmin(a.id);
                  }}
                >
                  Elimina definitivamente
                </button>
              </div>
            }
          </div>
        )}
      </div>)}
    </div>
}

      </section>}

      {notice&&<div className="toast" onClick={()=>setNotice('')}>{notice}<X size={15}/></div>}
      {loading&&<div className="loading">Aggiornamento disponibilità…</div>}
      <ClabFooter/>
    </main>

    {/* FINESTRA DETTAGLIO AGGIORNAMENTO */}
    {selectedAnnouncement&&<div className="modal-backdrop"
      onClick={()=>setSelectedAnnouncement(null)}>
      <div className="modal" onClick={e=>e.stopPropagation()}
        style={{maxWidth:'620px',width:'calc(100% - 32px)'}}>
        <div className="modal-top">
          <div>
            <span className="eyebrow">{selectedAnnouncement.category}</span>
            <h2>{selectedAnnouncement.title}</h2>
          </div>
          <button type="button" className="icon-button"
            onClick={()=>setSelectedAnnouncement(null)}
            aria-label="Chiudi aggiornamento"><X/></button>
        </div>
        <small style={{color:'#718078'}}>
          {new Date(selectedAnnouncement.created_at).toLocaleDateString('it-IT',{
            weekday:'long',day:'numeric',month:'long',year:'numeric'
          })}
          {selectedAnnouncement.is_pinned ? ' · In evidenza' : ''}
        </small>
        <div style={{marginTop:'18px',padding:'18px',background:'#f8faf7',
          border:'1px solid #e4e9e1',borderRadius:'14px',whiteSpace:'pre-wrap',
          lineHeight:1.75,overflowWrap:'anywhere'}}>
          {selectedAnnouncement.content}
        </div>
        {selectedAnnouncement.attachment_path&&<div style={{marginTop:'16px',padding:'14px',
          border:'1px solid #e1e8e1',borderRadius:'12px',display:'grid',gap:'10px'}}>
          <strong>Allegato</strong>
          {selectedAnnouncementAttachmentUrl
            ? <a href={selectedAnnouncementAttachmentUrl} target="_blank" rel="noopener noreferrer"
                style={{fontWeight:700,color:'#1769aa',overflowWrap:'anywhere'}}>
                Apri o scarica l’allegato
              </a>
            : <small className="muted">Caricamento allegato o accesso non disponibile.</small>}
          {selectedAnnouncement.attachment_path.match(/\.(jpg|jpeg|png)$/i)&&selectedAnnouncementAttachmentUrl&&
            <img src={selectedAnnouncementAttachmentUrl} alt="Allegato dell’aggiornamento"
              style={{width:'100%',maxHeight:'360px',objectFit:'contain',borderRadius:'8px'}}/>}
        </div>}
        <button type="button" className="primary wide" style={{marginTop:'18px'}}
          onClick={()=>setSelectedAnnouncement(null)}>Chiudi</button>
      </div>
    </div>}

    {/* FINESTRA DETTAGLIO PRENOTAZIONE */}
    {selectedBooking&&<div
      className="modal-backdrop"
      onClick={()=>setSelectedBooking(null)}
    >
      <div
        className="modal booking-detail-modal"
        onClick={e=>e.stopPropagation()}
        style={{maxWidth:'480px',width:'calc(100% - 32px)'}}
      >
        <div className="modal-top">
          <div>
            <span className="eyebrow">DETTAGLIO PRENOTAZIONE</span>
            <h2>La partita.</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={()=>setSelectedBooking(null)}
            aria-label="Chiudi dettagli"
          >
            <X/>
          </button>
        </div>

        <div style={{
          background:'#eaf2e4',
          borderRadius:'14px',
          padding:'16px',
          marginBottom:'20px'
        }}>
          <div style={{
            display:'flex',
            justifyContent:'space-between',
            alignItems:'center',
            gap:'12px',
            flexWrap:'wrap'
          }}>
            <span style={{fontWeight:700,color:'#193329'}}>
              CAMPO {selectedBooking.court_id}
            </span>
            <span style={{
              color:'#557b42',
              fontSize:'13px',
              fontWeight:600
            }}>
              PRENOTAZIONE CONFERMATA
            </span>
          </div>

          <div style={{
            fontSize:'30px',
            fontWeight:800,
            color:'#193329',
            marginTop:'10px'
          }}>
            {selectedBooking.start_time.slice(0,5)}
          </div>

          <div style={{color:'#607365',marginTop:'4px'}}>
            {prettyDate(new Date(`${selectedBooking.booking_date}T12:00:00`))}
          </div>

          <div style={{
            display:'inline-block',
            marginTop:'12px',
            background:'#ffffff',
            borderRadius:'20px',
            padding:'6px 12px',
            fontSize:'13px',
            fontWeight:600,
            color:'#193329'
          }}>
            {selectedBooking.booking_type==='singles'?'Partita singola':'Partita doppia'} · {selectedBooking.booking_type==='singles'?60:120} minuti
          </div>
        </div>

        <h3 style={{marginBottom:'12px'}}>Giocatori</h3>

        <div style={{display:'grid',gap:'10px'}}>
          {(selectedBooking.booking_players||[]).map((p,i)=>(
            <div
              key={p.id||i}
              style={{
                display:'flex',
                alignItems:'center',
                gap:'12px',
                padding:'12px',
                border:'1px solid #e3e9e2',
                borderRadius:'12px',
                background:'#ffffff'
              }}
            >
              <div style={{
                width:'38px',
                height:'38px',
                flexShrink:0,
                borderRadius:'50%',
                background:'#e8f4d1',
                display:'flex',
                alignItems:'center',
                justifyContent:'center',
                fontSize:'19px'
              }}>
                🎾
              </div>
              <div style={{minWidth:0}}>
                <div style={{
                  display:'flex',
                  alignItems:'center',
                  gap:'7px',
                  minWidth:0
                }}>
                  {p.member_id&&p.member_id===selectedBooking.owner_id&&
                    <span
                      title="Socio intestatario della prenotazione"
                      aria-label="Socio intestatario della prenotazione"
                      style={{
                        width:'9px',
                        height:'9px',
                        flexShrink:0,
                        borderRadius:'50%',
                        background:'#557b42',
                        display:'inline-block'
                      }}
                    />
                  }
                  <b style={{display:'block',color:'#193329'}}>
                    {surnameFirst(p.display_name)||`Giocatore ${i+1}`}
                  </b>
                </div>
                <small style={{color:'#829087'}}>
                  {p.member_id ? `Giocatore ${i+1}` : 'Ospite'}
                </small>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          display:'grid',
          gap:'10px',
          marginTop:'22px'
        }}>
          {canCancelBooking(selectedBooking)&&
            <button
              type="button"
              className="primary wide"
              onClick={()=>cancelBooking(selectedBooking.id)}
              style={{background:'#a33b32',color:'#ffffff'}}
            >
              <X size={17}/> Cancella prenotazione
            </button>
          }

          <button
            type="button"
            className="wide"
            onClick={()=>setSelectedBooking(null)}
            style={{
              padding:'13px',
              borderRadius:'12px',
              border:'1px solid #dce5dc',
              background:'#ffffff',
              color:'#193329',
              fontWeight:600,
              cursor:'pointer'
            }}
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>}

    {selectedEvent&&<div
  className="modal-backdrop"
  onClick={()=>setSelectedEvent(null)}
>
  <div
    className="modal"
    onClick={e=>e.stopPropagation()}
    style={{maxWidth:'480px',width:'calc(100% - 32px)'}}
  >
    <div className="modal-top">
      <div>
        <span className="eyebrow">DETTAGLIO EVENTO</span>
        <h2>{selectedEvent.title}</h2>
      </div>
      <button
        type="button"
        className="icon-button"
        onClick={()=>setSelectedEvent(null)}
        aria-label="Chiudi dettagli evento"
      >
        <X/>
      </button>
    </div>

    <div style={{background:'#eaf2e4',borderRadius:'14px',padding:'16px',marginBottom:'20px'}}>
      <b>DATA</b>
      <div>
        {new Date(`${selectedEvent.event_date}T12:00:00`).toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
      </div>

      <div style={{marginTop:'12px'}}><b>ORARIO</b></div>
      <div>{String(selectedEvent.start_time).slice(0,5)} - {String(selectedEvent.end_time).slice(0,5)}</div>

      <div style={{marginTop:'12px'}}><b>CAMPO</b></div>
      <div>{(selectedEvent.event_courts||[]).map(ec=>'Campo '+ec.court_id).join(' · ')}</div>
    </div>

    <h3>Descrizione</h3>
    <p style={{whiteSpace:'pre-wrap',lineHeight:1.6}}>
      {selectedEvent.description?.trim()||'Nessuna descrizione disponibile.'}
    </p>

    <button
      type="button"
      className="primary wide"
      onClick={()=>setSelectedEvent(null)}
    >
      Chiudi
    </button>
  </div>
</div>}
    {showPassword&&<div className="modal-backdrop" onClick={()=>setShowPassword(false)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-top">
          <div>
            <span className="eyebrow">IL TUO ACCOUNT</span>
            <h2>Modifica password.</h2>
          </div>
          <button type="button" className="icon-button" onClick={()=>setShowPassword(false)}><X/></button>
        </div>

        <form onSubmit={changePassword}>
          <label>Nuova password
            <input type="password" value={newPassword}
              onChange={e=>setNewPassword(e.target.value)}
              placeholder="Almeno 8 caratteri" minLength="8"
              autoComplete="new-password" required/>
          </label>
          <label>Conferma nuova password
            <input type="password" value={confirmPassword}
              onChange={e=>setConfirmPassword(e.target.value)}
              placeholder="Ripeti la nuova password" minLength="8"
              autoComplete="new-password" required/>
          </label>
          <div className="modal-note">
            <LockKeyhole size={16}/> La password sarà aggiornata sul tuo account personale.
          </div>
          <button className="primary wide" type="submit" disabled={savingPassword}>
            {savingPassword?'Aggiornamento…':'Salva nuova password'}
            <ArrowRight size={17}/>
          </button>
        </form>
      </div>
    </div>}

    {showAdminBooking&&isAdmin&&<div className="modal-backdrop" onClick={closeAdminBooking}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-top">
          <div>
            <span className="eyebrow">PANNELLO AMMINISTRATORE</span>
            <h2>Prenota per un socio.</h2>
            <p className="muted" style={{margin:'6px 0 0'}}>Il primo socio selezionato sarà intestatario e giocatore. Tu risulterai come creatore.</p>
          </div>
          <button type="button" className="icon-button" onClick={closeAdminBooking} disabled={savingAdminBooking}><X/></button>
        </div>

        <div style={{background:'#eaf5ff',border:'1px solid #c9e5f8',borderRadius:'12px',padding:'12px 14px',marginBottom:'18px',fontSize:'13px',color:'#174b70'}}>
          Prenotazione amministrativa: sarà evidenziata in celeste nel calendario.
        </div>

        <div style={{
          display:'flex',
          alignItems:'center',
          gap:'14px',
          padding:'15px 17px',
          marginBottom:'22px',
          borderRadius:'16px',
          background:'linear-gradient(135deg, #f1f6e9 0%, #e7f0dc 100%)',
          border:'1px solid #e0ead6',
          boxShadow:'0 4px 12px rgba(35,65,40,0.05)'
        }}>
          <div style={{
            width:'48px',
            height:'48px',
            flexShrink:0,
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            borderRadius:'13px',
            background:'#ffffff',
            color:'#557b42',
            boxShadow:'0 2px 7px rgba(35,65,40,0.08)'
          }}>
            <CalendarDays size={25}/>
          </div>

          <div style={{minWidth:0}}>
            <div style={{
              fontSize:'10px',
              fontWeight:800,
              letterSpacing:'1.5px',
              color:'#71866b',
              marginBottom:'4px'
            }}>
              GIORNO DELLA PARTITA
            </div>

            <div style={{
              fontSize:'17px',
              fontWeight:800,
              color:'#193329',
              textTransform:'capitalize',
              lineHeight:1.3
            }}>
              {selected.toLocaleDateString('it-IT',{
                weekday:'long',
                day:'numeric',
                month:'long',
                year:'numeric'
              })}
            </div>

            <div style={{
              fontSize:'11px',
              color:'#71866b',
              marginTop:'3px'
            }}>
              Data selezionata nel calendario
            </div>
          </div>
        </div>

        <form onSubmit={createAdminBooking}>
          <label>Campo
            <select value={adminBooking.court_id} onChange={e=>setAdminBooking({...adminBooking,court_id:e.target.value,time:''})}>
              <option value="1">Campo 1</option>
              <option value="2">Campo 2</option>
            </select>
          </label>

          <label>Orario
            <select
              name="admin-booking-time"
              value={availableAdminBookingHours.includes(adminBooking.time)?adminBooking.time:''}
              onChange={e=>setAdminBooking(prev=>({...prev,time:e.target.value}))}
              disabled={availableAdminBookingHours.length===0}
              required
            >
              {availableAdminBookingHours.length===0
                ? <option value="">Nessun orario disponibile</option>
                : availableAdminBookingHours.map(h=><option key={h} value={h}>{h} – {`${pad((Number(h.slice(0,2))+(adminBooking.type==='doubles'?2:1))%24)}:00`}</option>)}
            </select>
          </label>

          <label>Tipo di partita
            <select value={adminBooking.type} onChange={e=>setAdminBooking({...adminBooking,type:e.target.value,time:'',players:['','','',''],guests:['','','','']})}>
              <option value="singles">Singolo · 2 giocatori</option>
              <option value="doubles">Doppio · 4 giocatori</option>
            </select>
          </label>

          <div className="player-fields">
            <b>Giocatori</b>
            {Array.from({length:adminBooking.type==='singles'?2:4},(_,i)=>{
              const guestAllowed=adminBooking.type==='singles'?i===1:i>=2;
              const selectedId=adminBooking.players[i];
              const selectedMember=members.find(m=>m.id===selectedId);

              return (
                <div
                  key={i}
                  style={{
                    display:'flex',
                    flexDirection:'row',
                    alignItems:'flex-start',
                    gap:'16px',
                    width:'100%',
                    minWidth:0,
                    boxSizing:'border-box'
                  }}
                >
                  <span style={{
                    display:'block',
                    flex:'0 0 40px',
                    width:'40px',
                    paddingTop:'12px',
                    boxSizing:'border-box'
                  }}>{i+1}</span>

                  <div style={{
                    display:'flex',
                    flexDirection:'column',
                    alignItems:'stretch',
                    flex:'1 1 0%',
                    minWidth:0,
                    width:'0',
                    boxSizing:'border-box',
                    gap:'8px'
                  }}>
                    {selectedId==='guest'&&guestAllowed ? (
                      <input
                        type="text"
                        placeholder="Nome e cognome ospite"
                        value={adminBooking.guests[i]||''}
                        onChange={e=>{
                          const guests=[...adminBooking.guests];
                          guests[i]=e.target.value;
                          setAdminBooking({...adminBooking,guests});
                        }}
                        required
                        style={{
                          display:'block',
                          flex:'1 1 auto',
                          width:'100%',
                          minWidth:0,
                          maxWidth:'100%',
                          alignSelf:'stretch',
                          boxSizing:'border-box',
                          minHeight:'46px',
                          padding:'10px 12px',
                          border:'1px solid #dce5dc',
                          borderRadius:'10px',
                          background:'#ffffff',
                          color:'#193329',
                          fontSize:'14px'
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={()=>openAdminPlayerSelector(i)}
                        style={{
                          width:'100%',
                          minHeight:'46px',
                          padding:'10px 12px',
                          border:'1px solid #dce5dc',
                          borderRadius:'10px',
                          background:'#ffffff',
                          color:selectedMember?'#193329':'#829087',
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'space-between',
                          gap:'10px',
                          textAlign:'left',
                          cursor:'pointer',
                          fontSize:'14px'
                        }}
                      >
                        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {selectedMember
                            ? surnameFirst(selectedMember.full_name)
                            : 'Cerca e seleziona un socio'}
                        </span>
                        <Search size={17}/>
                      </button>
                    )}

                    {guestAllowed&&
                      <button
                        type="button"
                        onClick={()=>{
                          if(selectedId==='guest'){
                            openAdminPlayerSelector(i);
                          } else {
                            chooseAdminGuest(i);
                          }
                        }}
                        style={{
                          alignSelf:'flex-start',
                          display:'inline-block',
                          whiteSpace:'nowrap',
                          width:'max-content',
                          maxWidth:'100%',
                          border:0,
                          background:'transparent',
                          color:'#557b42',
                          padding:'3px 0',
                          fontSize:'13px',
                          fontWeight:600,
                          cursor:'pointer'
                        }}
                      >
                        {selectedId==='guest'
                          ? '← Seleziona un socio'
                          : '＋ Inserisci ospite esterno'}
                      </button>
                    }
                    {i===0&&<small style={{color:'#557b42'}}>Questo socio sarà l’intestatario della prenotazione.</small>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="modal-note">
            <Clock3 size={16}/> Prenotazione di {adminBooking.type==='doubles'?120:60} minuti · massimo 2 giorni in anticipo
          </div>
          <button className="primary wide" type="submit" disabled={savingAdminBooking||availableAdminBookingHours.length===0}>
            {savingAdminBooking?'Salvataggio…':'Conferma prenotazione'} <ArrowRight size={17}/>
          </button>
        </form>
      </div>
    </div>}

    {showBooking&&<div className="modal-backdrop" onClick={closeNewBooking}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-top">
          <div>
            <span className="eyebrow">NUOVA PRENOTAZIONE</span>
            <h2>Scendi in campo.</h2>
          </div>
          <button type="button" className="icon-button" onClick={closeNewBooking}><X/></button>
        </div>

        
        <div style={{
          display:'flex',
          alignItems:'center',
          gap:'14px',
          padding:'15px 17px',
          marginBottom:'22px',
          borderRadius:'16px',
          background:'linear-gradient(135deg, #f1f6e9 0%, #e7f0dc 100%)',
          border:'1px solid #e0ead6',
          boxShadow:'0 4px 12px rgba(35,65,40,0.05)'
        }}>
          <div style={{
            width:'48px',
            height:'48px',
            flexShrink:0,
            display:'flex',
            alignItems:'center',
            justifyContent:'center',
            borderRadius:'13px',
            background:'#ffffff',
            color:'#557b42',
            boxShadow:'0 2px 7px rgba(35,65,40,0.08)'
          }}>
            <CalendarDays size={25}/>
          </div>

          <div style={{minWidth:0}}>
            <div style={{
              fontSize:'10px',
              fontWeight:800,
              letterSpacing:'1.5px',
              color:'#71866b',
              marginBottom:'4px'
            }}>
              GIORNO DELLA PARTITA
            </div>

            <div style={{
              fontSize:'17px',
              fontWeight:800,
              color:'#193329',
              textTransform:'capitalize',
              lineHeight:1.3
            }}>
              {selected.toLocaleDateString('it-IT',{
                weekday:'long',
                day:'numeric',
                month:'long',
                year:'numeric'
              })}
            </div>

            <div style={{
              fontSize:'11px',
              color:'#71866b',
              marginTop:'3px'
            }}>
              Data selezionata nel calendario
            </div>
          </div>
        </div>

        <form onSubmit={createBooking}>
          <label>Campo
            <select
              value={newBooking.court_id}
              onChange={e=>setNewBooking({
                ...newBooking,
                court_id:e.target.value,
                time:''
              })}
            >
              <option value="1">Campo 1</option>
              <option value="2">Campo 2</option>
            </select>
          </label>

          {/* MENU ORARI: MOSTRA SOLO GLI SLOT DISPONIBILI */}
          <label>Orario
            <select
              value={
                availableBookingHours.includes(newBooking.time)
                  ? newBooking.time
                  : ''
              }
              onChange={e=>setNewBooking({
                ...newBooking,
                time:e.target.value
              })}
              disabled={availableBookingHours.length===0}
              required
            >
              {availableBookingHours.length===0
                ? <option value="">Nessun orario disponibile</option>
                : availableBookingHours.map(h=>(
                    <option key={h} value={h}>
                      {h} – {`${pad((Number(h.slice(0,2))+(newBooking.type==='doubles'?2:1))%24)}:00`}
                    </option>
                  ))
              }
            </select>

            {availableBookingHours.length===0&&
              <small style={{
                color:'#a33b32',
                display:'block',
                marginTop:'6px'
              }}>
                Non ci sono più orari disponibili per questo campo nella giornata selezionata.
              </small>
            }
          </label>

          <label>Tipo di partita
            <select value={newBooking.type}
              onChange={e=>setNewBooking({...newBooking,type:e.target.value,time:'',players:['','','',''],guests:['','','','']})}>
              <option value="singles">Singolo · 2 giocatori</option>
              <option value="doubles">Doppio · 4 giocatori</option>
            </select>
          </label>

          <div className="player-fields">
            <b>Giocatori</b>

            {Array.from({length:newBooking.type==='singles'?2:4},(_,i)=>{
              const guestAllowed=newBooking.type==='singles'?i===1:i>=2;
              const selectedId=newBooking.players[i];
              const selectedMember=members.find(m=>m.id===selectedId);

              return (
                <div
                  key={i}
                  style={{
                    display:'flex',
                    flexDirection:'row',
                    alignItems:'flex-start',
                    gap:'16px',
                    width:'100%',
                    minWidth:0,
                    boxSizing:'border-box'
                  }}
                >
                  <span style={{
                    display:'block',
                    flex:'0 0 40px',
                    width:'40px',
                    paddingTop:'12px',
                    boxSizing:'border-box'
                  }}>{i+1}</span>

                  <div style={{
                    display:'flex',
                    flexDirection:'column',
                    alignItems:'stretch',
                    flex:'1 1 0%',
                    minWidth:0,
                    width:'0',
                    boxSizing:'border-box',
                    gap:'8px'
                  }}>
                    {selectedId==='guest'&&guestAllowed ? (
                      <input
                        type="text"
                        placeholder="Nome e cognome ospite"
                        value={newBooking.guests[i]||''}
                        onChange={e=>{
                          const a=[...newBooking.guests];
                          a[i]=e.target.value;
                          setNewBooking({...newBooking,guests:a});
                        }}
                        required
                        style={{
                          display:'block',
                          flex:'1 1 auto',
                          width:'100%',
                          minWidth:0,
                          maxWidth:'100%',
                          alignSelf:'stretch',
                          boxSizing:'border-box',
                          minHeight:'46px',
                          padding:'10px 12px',
                          border:'1px solid #dce5dc',
                          borderRadius:'10px',
                          background:'#ffffff',
                          color:'#193329',
                          fontSize:'14px'
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={()=>openPlayerSelector(i)}
                        style={{
                          width:'100%',
                          minHeight:'46px',
                          padding:'10px 12px',
                          border:'1px solid #dce5dc',
                          borderRadius:'10px',
                          background:'#ffffff',
                          color:selectedMember?'#193329':'#829087',
                          display:'flex',
                          alignItems:'center',
                          justifyContent:'space-between',
                          gap:'10px',
                          textAlign:'left',
                          cursor:'pointer',
                          fontSize:'14px'
                        }}
                      >
                        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {selectedMember
                            ? surnameFirst(selectedMember.full_name)
                            : 'Cerca e seleziona un socio'}
                        </span>
                        <Search size={17}/>
                      </button>
                    )}

                    {guestAllowed&&
                      <button
                        type="button"
                        onClick={()=>{
                          if(selectedId==='guest'){
                            openPlayerSelector(i);
                          } else {
                            chooseGuest(i);
                          }
                        }}
                        style={{
                          alignSelf:'flex-start',
                          display:'inline-block',
                          whiteSpace:'nowrap',
                          width:'max-content',
                          maxWidth:'100%',
                          border:0,
                          background:'transparent',
                          color:'#557b42',
                          padding:'3px 0',
                          fontSize:'13px',
                          fontWeight:600,
                          cursor:'pointer'
                        }}
                      >
                        {selectedId==='guest'
                          ? '← Seleziona un socio'
                          : '＋ Inserisci ospite esterno'}
                      </button>
                    }
                  </div>
                </div>
              );
            })}
          </div>

          <div className="modal-note">
            <Clock3 size={16}/> Prenotazione di {newBooking.type==='doubles'?120:60} minuti · massimo 2 giorni in anticipo
          </div>
          <button
            className="primary wide"
            type="submit"
            disabled={availableBookingHours.length===0}
          >
            Conferma prenotazione <ArrowRight size={17}/>
          </button>
        </form>
      </div>
    </div>}

    {/* FINESTRA RICERCA E SELEZIONE SOCI */}
    {(selectedPlayerIndex!==null||selectedAdminPlayerIndex!==null)&&
      <div
        className="modal-backdrop"
        onClick={()=>{
          setSelectedPlayerIndex(null);
          setSelectedAdminPlayerIndex(null);
          setMemberSearch('');
        }}
        style={{zIndex:10000}}
      >
        <div
          className="modal"
          onClick={e=>e.stopPropagation()}
          style={{
            maxWidth:'460px',
            width:'calc(100% - 28px)',
            maxHeight:'85vh',
            display:'flex',
            flexDirection:'column',
            overflow:'hidden'
          }}
        >
          <div className="modal-top">
            <div>
              <span className="eyebrow">{selectedAdminPlayerIndex!==null?'PANNELLO AMMINISTRATORE':'NUOVA PRENOTAZIONE'}</span>
              <h2>Seleziona socio.</h2>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={()=>{
                setSelectedPlayerIndex(null);
                setSelectedAdminPlayerIndex(null);
                setMemberSearch('');
              }}
              aria-label="Chiudi selezione"
            >
              <X/>
            </button>
          </div>

          <div style={{position:'relative',marginBottom:'14px'}}>
            <Search
              size={19}
              style={{
                position:'absolute',
                left:'13px',
                top:'50%',
                transform:'translateY(-50%)',
                color:'#829087'
              }}
            />
            <input
              type="search"
              value={memberSearch}
              onChange={e=>setMemberSearch(e.target.value)}
              placeholder="Cerca per nome o cognome..."
              autoFocus
              style={{
                width:'100%',
                boxSizing:'border-box',
                padding:'13px 14px 13px 42px',
                border:'1px solid #dce5dc',
                borderRadius:'12px',
                fontSize:'15px',
                outline:'none'
              }}
            />
          </div>

          <div style={{
            fontSize:'12px',
            color:'#829087',
            marginBottom:'9px'
          }}>
            {(selectedAdminPlayerIndex!==null?availableAdminMembers:availableMembers).length} soci disponibili
          </div>

          <div style={{
            overflowY:'auto',
            WebkitOverflowScrolling:'touch',
            flex:1,
            minHeight:0,
            display:'grid',
            alignContent:'start',
            gap:'6px',
            paddingBottom:'8px'
          }}>
            {(selectedAdminPlayerIndex!==null?availableAdminMembers:availableMembers).length===0
              ? <div style={{
                  padding:'24px 12px',
                  textAlign:'center',
                  color:'#829087'
                }}>
                  Nessun socio trovato.
                  <br/>
                  Prova a modificare la ricerca.
                </div>
              : (selectedAdminPlayerIndex!==null?availableAdminMembers:availableMembers).map(m=>(
                  <button
                    type="button"
                    key={m.id}
                    onClick={()=>selectedAdminPlayerIndex!==null?chooseAdminMember(m.id):chooseMember(m.id)}
                    style={{
                      display:'flex',
                      alignItems:'center',
                      gap:'12px',
                      width:'100%',
                      padding:'12px',
                      border:'1px solid #e5ebe4',
                      borderRadius:'11px',
                      background:'#ffffff',
                      color:'#193329',
                      textAlign:'left',
                      cursor:'pointer',
                      fontSize:'14px'
                    }}
                  >
                    <span style={{
                      width:'36px',
                      height:'36px',
                      flexShrink:0,
                      borderRadius:'50%',
                      background:'#e8f4d1',
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      fontWeight:700,
                      color:'#557b42'
                    }}>
                      {surnameFirst(m.full_name).charAt(0).toUpperCase()}
                    </span>

                    <span style={{
                      flex:1,
                      minWidth:0,
                      fontWeight:600
                    }}>
                      {surnameFirst(m.full_name)}
                    </span>

                    <ArrowRight size={17} color="#829087"/>
                  </button>
                ))
            }
          </div>

          <button
            type="button"
            onClick={()=>{
    setSelectedPlayerIndex(null);
    setSelectedAdminPlayerIndex(null);
    setMemberSearch('');
  }}
  style={{
    width:'100%',
    padding:'13px',
    marginTop:'10px',
    border:'1px solid #dce5dc',
    borderRadius:'11px',
    background:'#ffffff',
    color:'#193329',
    fontWeight:600,
    cursor:'pointer'
  }}
>
  Chiudi
</button>
        </div>
      </div>
    }
  </div>;
}

function SetupScreen(){
  return <div className="setup-screen">
    <div className="setup-card">
      <Brand/>
      <span className="eyebrow">CONFIGURAZIONE INIZIALE</span>
      <h1>Il club sta per<br/><em>scendere in campo.</em></h1>
      <p>La parte grafica è pronta. Per attivare accessi e prenotazioni condivise occorre collegare il progetto al database Supabase gratuito.</p>
      <ol>
        <li>Crea un progetto su Supabase.</li>
        <li>Esegui lo script <code>supabase/schema.sql</code> nel SQL Editor.</li>
        <li>Copia URL e chiave anonima nel file <code>.env</code>.</li>
        <li>Crea il primo utente amministratore e imposta il suo profilo come <code>admin</code>.</li>
      </ol>
      <div className="setup-warning">
        <ShieldCheck/> Non inserire mai la chiave <b>service_role</b> nel sito: deve restare segreta sul server.
      </div>
      <p className="muted">Consulta il file README incluso nel progetto per la procedura completa e le funzioni server necessarie.</p>
      <ClabFooter/>
    </div>
  </div>;
}

export default App;
