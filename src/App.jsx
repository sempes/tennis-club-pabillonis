
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, CalendarDays, Clock3, LogOut, Plus, ShieldCheck,
  Sparkles, X, KeyRound, LockKeyhole, ChevronDown, Search
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

function Brand() {
  return (
    <div className="brand">
      <img className="club-logo" src={clubLogo} alt="Tennis Club Pabillonis" />
      <span>TCP<span className="brand-dot">.</span></span>
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
  const [selectedDate,setSelectedDate] = useState(dateKey(new Date()));
  const [court,setCourt] = useState('all');
  const [loading,setLoading] = useState(false);
  const [notice,setNotice] = useState('');
  const [loginEmail,setLoginEmail] = useState('');
  const [loginPassword,setLoginPassword] = useState('');
  const [showBooking,setShowBooking] = useState(false);
  const [showPassword,setShowPassword] = useState(false);
  const [selectedBooking,setSelectedBooking] = useState(null);
  const [selectedPlayerIndex,setSelectedPlayerIndex] = useState(null);
  const [memberSearch,setMemberSearch] = useState('');
  const [newPassword,setNewPassword] = useState('');
  const [confirmPassword,setConfirmPassword] = useState('');
  const [savingPassword,setSavingPassword] = useState(false);
  const [newMember,setNewMember] = useState({name:'',surname:'',email:'',password:''});
  const [newAdmin,setNewAdmin] = useState({name:'',surname:'',email:'',password:''});
  const [savingAdmin,setSavingAdmin] = useState(false);
  const [activeView,setActiveView] = useState('bookings');
  const [openMemberMenu,setOpenMemberMenu] = useState(null);
  const [newBooking,setNewBooking] = useState({
    court_id:'1',time:'09:00',type:'singles',players:['',''],guests:['','']
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
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(session) loadData();
    else {
      setProfile(null);
      setMembers([]);
      setAllMembers([]);
      setBookings([]);
      setAdminProfiles([]);
      setSelectedBooking(null);
      setSelectedPlayerIndex(null);
    }
  },[session]);

  async function loadData(){
    if(!session) return;
    setLoading(true);

    const [{data:p,error:pe},{data:m,error:me},{data:b,error:be}] = await Promise.all([
      supabase.from('profiles').select('*').eq('id',session.user.id).single(),
      supabase.from('profiles').select('id,full_name,email,status,role').order('full_name'),
      supabase.from('bookings').select('*,booking_players(*)')
        .gte('booking_date',dateKey(new Date()))
        .order('booking_date').order('start_time')
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
          .filter(x=>x.role==='admin')
          .sort(sortBySurname)
      );
    } else {
      setNotice('Errore caricamento soci: '+me.message);
    }

    if(be) setNotice(be.message);
    else setBookings(b||[]);

    setLoading(false);
  }

  async function login(e){
    e.preventDefault();
    setNotice('');
    const {error}=await supabase.auth.signInWithPassword({
      email:loginEmail,password:loginPassword
    });
    if(error) setNotice('Accesso non riuscito: verifica email e password.');
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

  const dayBookings=useMemo(
    ()=>bookings.filter(b=>b.booking_date===selectedDate &&
      (court==='all'||String(b.court_id)===court)),
    [bookings,selectedDate,court]
  );

  /*
   * ORARI PRENOTABILI:
   * - considera la data selezionata;
   * - considera il campo scelto nella nuova prenotazione;
   * - esclude gli orari già prenotati;
   * - esclude gli orari già trascorsi se la data è oggi.
   */
  const availableBookingHours=useMemo(()=>{
    const now=new Date();
    const isToday=selectedDate===dateKey(now);
    const duration=newBooking.type==='doubles'?120:60;

    return hours.filter(h=>{
      const candidateStart=timeToMinutes(h);
      const candidateEnd=candidateStart+duration;

      if(isToday && candidateStart<=now.getHours()*60+now.getMinutes()){
        return false;
      }

      const occupied=bookings.some(b=>{
        if(b.status!=='active' || b.booking_date!==selectedDate ||
          String(b.court_id)!==String(newBooking.court_id)) return false;

        const bookingStart=timeToMinutes(b.start_time);
        let bookingEnd=timeToMinutes(b.end_time);
        if(bookingEnd<=bookingStart) bookingEnd+=24*60;

        return candidateStart<bookingEnd && candidateEnd>bookingStart;
      });

      return !occupied;
    });
  },[bookings,selectedDate,newBooking.court_id,newBooking.type]);

  /*
   * Se si cambia campo oppure un orario non è più disponibile,
   * seleziona automaticamente il primo orario libero.
   */
  useEffect(()=>{
    if(!showBooking) return;

    if(
      availableBookingHours.length>0 &&
      !availableBookingHours.includes(newBooking.time)
    ){
      setNewBooking(prev=>({
        ...prev,
        time:availableBookingHours[0]
      }));
    }
  },[showBooking,availableBookingHours,newBooking.time]);

  const busyMemberIds=useMemo(
    ()=>new Set(bookings.filter(b=>b.status==='active')
      .flatMap(b=>(b.booking_players||[]).map(p=>p.member_id).filter(Boolean))),
    [bookings]
  );

  const availableMembers=useMemo(()=>{
    const search=memberSearch.trim().toLocaleLowerCase('it');

    return members
      .filter(m=>!busyMemberIds.has(m.id)||m.id===profile?.id)
      .filter(m=>!search||
        surnameFirst(m.full_name).toLocaleLowerCase('it').includes(search)||
        String(m.full_name||'').toLocaleLowerCase('it').includes(search)
      )
      .sort(sortBySurname);
  },[members,busyMemberIds,profile,memberSearch]);

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

  function chooseGuest(index){
    const players=[...newBooking.players];
    const guests=[...newBooking.guests];
    players[index]='guest';
    guests[index]='';

    setNewBooking({...newBooking,players,guests});
  }

  function bookingAt(c,t){
    const slotStart=timeToMinutes(t);
    return dayBookings.find(b=>{
      if(String(b.court_id)!==String(c) || b.status!=='active') return false;
      const bookingStart=timeToMinutes(b.start_time);
      let bookingEnd=timeToMinutes(b.end_time);
      if(bookingEnd<=bookingStart) bookingEnd+=24*60;
      return slotStart>=bookingStart && slotStart<bookingEnd;
    });
  }

  function playerNames(b){
    return (b.booking_players||[])
      .map(p=>surnameFirst(p.display_name))
      .join(' · ');
  }

  function canCancelBooking(b){
    return isAdmin ||
      (b.booking_players||[]).some(p=>p.member_id===session?.user?.id);
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
      setNotice(
        error.message.includes('member_already_booked')
          ? 'Uno dei soci selezionati ha già una prenotazione attiva.'
          : error.message.includes('slot_unavailable')
            ? 'Questo orario è già occupato.'
            : error.message
      );
      return;
    }

    setNotice('Prenotazione confermata!');
    setShowBooking(false);
    setSelectedPlayerIndex(null);
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

  async function setMemberStatus(member,status){
    const actionText=status==='suspended'
      ? 'sospendere'
      : status==='active'
        ? 'riattivare'
        : 'eliminare';

    const warning=status==='deleted'
      ? 'Il socio non potrà più accedere. Lo storico delle prenotazioni sarà conservato. Vuoi continuare?'
      : `Vuoi ${actionText} ${member.full_name}?`;

    if(!confirm(warning)) return;

    const {data,error}=await supabase.functions.invoke('admin-manage-member',{
      body:{
        action:'update_member',
        member_id:member.id,
        status
      }
    });

    if(error||data?.error){
      setNotice('Errore durante l’operazione: '+(data?.error||error?.message));
      return;
    }

    setNotice(status==='deleted'
      ? 'Accesso del socio disattivato. Storico conservato.'
      : status==='suspended'
        ? 'Socio sospeso correttamente.'
        : 'Socio riattivato correttamente.');

    await loadData();
  }

  async function addAdmin(e){
    e.preventDefault();
    setNotice('');
    setSavingAdmin(true);

    const {data,error}=await supabase.functions.invoke('admin-manage-member',{
      body:{...newAdmin,action:'create_admin'}
    });

    setSavingAdmin(false);

    if(error||data?.error){
      setNotice('Errore creazione amministratore: '+(data?.error||error?.message));
      return;
    }

    setNotice('Amministratore creato correttamente.');
    setNewAdmin({name:'',surname:'',email:'',password:''});
    await loadData();
  }

  async function revokeAdmin(id){
    if(!confirm('Vuoi revocare i permessi di questo amministratore? Diventerà socio.')) return;

    const {data,error}=await supabase.functions.invoke('admin-manage-member',{
      body:{action:'revoke_admin',member_id:id}
    });

    if(error||data?.error){
      setNotice('Errore revoca amministratore: '+(data?.error||error?.message));
      return;
    }

    setNotice('Permessi amministratore revocati.');
    await loadData();
  }

  if(!configured) return <SetupScreen />;

  if(!session) return <main className="login-shell">
    <div className="login-art">
      <Brand/>
      <div className="art-copy">
        <span className="eyebrow">IL TUO CLUB, IL TUO CAMPO</span>
        <h1>Il prossimo<br/><em>match</em> inizia qui.</h1>
        <p>Prenota il campo, scegli i compagni e scendi in gioco.</p>
      </div>
      <div className="court-lines"><i/><i/><i/><i/></div>
      <span className="art-footer">TENNIS CLUB PABILLONIS · DAL 2026</span>
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
    <aside className="sidebar">
      <Brand/>
      <div className="club-label">TENNIS CLUB<br/><b>PABILLONIS</b></div>

      <nav>
        <button type="button"
          className={activeView==='bookings'?'nav-active nav-button':'nav-button'}
          onClick={()=>setActiveView('bookings')}>
          <CalendarDays size={18}/> Prenotazioni
        </button>

        {isAdmin&&<button type="button"
          className={activeView==='members'?'nav-active nav-button':'nav-button'}
          onClick={()=>setActiveView('members')}>
          <ShieldCheck size={18}/> Gestione soci
        </button>}

        {isSuperAdmin&&<button type="button"
          className={activeView==='admins'?'nav-active nav-button':'nav-button'}
          onClick={()=>setActiveView('admins')}>
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
              <small>{['OGGI','DOMANI','DOPO DOMANI'][i]}</small>
              <b>{pad(d.getDate())}</b>
              <span>{d.toLocaleDateString('it-IT',{month:'short'})}</span>
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
          <button className="primary" onClick={()=>setShowBooking(true)} disabled={!canBook()}>
            <Plus size={17}/> Nuova prenotazione
          </button>
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
                const past=selectedDate===dateKey(new Date())&&t<=`${pad(new Date().getHours())}:00`;

                return (
                  <div
                    key={t}
                    className={`slot ${b?'occupied':''} ${past?'past':''}`}
                    onClick={b?()=>setSelectedBooking(b):undefined}
                    role={b?'button':undefined}
                    tabIndex={b?0:undefined}
                    onKeyDown={b?(e)=>{
                      if(e.key==='Enter'||e.key===' '){
                        e.preventDefault();
                        setSelectedBooking(b);
                      }
                    }:undefined}
                    style={b?{cursor:'pointer'}:undefined}
                    aria-label={b?`Apri dettagli prenotazione delle ${t}`:undefined}
                  >
                    <span>{t}</span>
                    {b
                      ? <div className="slot-info">
                          <b>{playerNames(b)}</b>
                          <small>{b.booking_type==='singles'?'Singolo':'Doppio'}</small>
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
          </div>
        </div>

        <div className="admin-list">
          {allMembers.length===0
            ? <p className="muted">Nessun socio presente.</p>
            : allMembers.map(m=><div className="admin-list-row" key={m.id}>
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
                      {m.status==='active'&&
                        <button type="button" style={{textAlign:'left',padding:'10px 12px',border:0,borderRadius:'8px',background:'transparent',cursor:'pointer',color:'#193329'}} onClick={()=>{setOpenMemberMenu(null);setMemberStatus(m,'suspended');}}>
                          Sospendi socio
                        </button>}
                      {m.status==='suspended'&&
                        <button type="button" style={{textAlign:'left',padding:'10px 12px',border:0,borderRadius:'8px',background:'transparent',cursor:'pointer',color:'#193329'}} onClick={()=>{setOpenMemberMenu(null);setMemberStatus(m,'active');}}>
                          Riattiva socio
                        </button>}
                      {m.status!=='deleted'&&
                        <button type="button" className="menu-danger" style={{textAlign:'left',padding:'10px 12px',border:0,borderRadius:'8px',background:'transparent',cursor:'pointer',color:'#a33b32'}} onClick={()=>{setOpenMemberMenu(null);setMemberStatus(m,'deleted');}}>
                          Disattiva socio
                        </button>}
                    </div>}
                </div>
              </div>)
          }
        </div>
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
              {adminProfiles.map(a=><div className="admin-list-row" key={a.id}>
                <div>
                  <b>{surnameFirst(a.full_name)}</b>
                  <small>{a.status==='active'?'Attivo':'Non attivo'}</small>
                </div>
                <button type="button" onClick={()=>revokeAdmin(a.id)}>Revoca</button>
              </div>)}
            </div>
        }
      </section>}

      {notice&&<div className="toast" onClick={()=>setNotice('')}>{notice}<X size={15}/></div>}
      {loading&&<div className="loading">Aggiornamento disponibilità…</div>}
      <ClabFooter/>
    </main>

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
                <b style={{display:'block',color:'#193329'}}>
                  {surnameFirst(p.display_name)||`Giocatore ${i+1}`}
                </b>
                <small style={{color:'#829087'}}>
                  Giocatore {i+1}
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

    {showBooking&&<div className="modal-backdrop" onClick={()=>setShowBooking(false)}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-top">
          <div>
            <span className="eyebrow">NUOVA PRENOTAZIONE</span>
            <h2>Scendi in campo.</h2>
          </div>
          <button className="icon-button" onClick={()=>setShowBooking(false)}><X/></button>
        </div>

        <form onSubmit={createBooking}>
          <label>Campo
            <select
              value={newBooking.court_id}
              onChange={e=>setNewBooking({
                ...newBooking,
                court_id:e.target.value
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
                      {h} – {`${pad((Number(h.slice(0,2))+1)%24)}:00`}
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
              onChange={e=>setNewBooking({...newBooking,type:e.target.value,players:['','','',''],guests:['','','','']})}>
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
                <div className="player-row" key={i}>
                  <span>{i+1}</span>

                  <div style={{flex:1,minWidth:0,display:'grid',gap:'8px'}}>
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
                          : selectedId==='guest'
                            ? 'Ospite esterno'
                            : 'Cerca e seleziona un socio'}
                      </span>
                      <Search size={17}/>
                    </button>

                    {guestAllowed&&
                      <button
                        type="button"
                        onClick={()=>chooseGuest(i)}
                        style={{
                          justifySelf:'start',
                          border:0,
                          background:'transparent',
                          color:'#557b42',
                          padding:'3px 0',
                          fontSize:'13px',
                          fontWeight:600,
                          cursor:'pointer'
                        }}
                      >
                        {selectedId==='guest'?'Ospite selezionato':'＋ Inserisci ospite esterno'}
                      </button>
                    }

                    {selectedId==='guest'&&guestAllowed&&
                      <input
                        placeholder="Nome e cognome ospite"
                        value={newBooking.guests[i]||''}
                        onChange={e=>{
                          const a=[...newBooking.guests];
                          a[i]=e.target.value;
                          setNewBooking({...newBooking,guests:a});
                        }}
                        required
                      />
                    }
                  </div>
                </div>
              );
            })}
          </div>

          <div className="modal-note">
            <Clock3 size={16}/> Prenotazione di 60 minuti · massimo 2 giorni in anticipo
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
    {selectedPlayerIndex!==null&&
      <div
        className="modal-backdrop"
        onClick={()=>{
          setSelectedPlayerIndex(null);
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
              <span className="eyebrow">NUOVA PRENOTAZIONE</span>
              <h2>Seleziona socio.</h2>
            </div>
            <button
              type="button"
              className="icon-button"
              onClick={()=>{
                setSelectedPlayerIndex(null);
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
            {availableMembers.length} soci disponibili
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
            {availableMembers.length===0
              ? <div style={{
                  padding:'24px 12px',
                  textAlign:'center',
                  color:'#829087'
                }}>
                  Nessun socio trovato.
                  <br/>
                  Prova a modificare la ricerca.
                </div>
              : availableMembers.map(m=>(
                  <button
                    type="button"
                    key={m.id}
                    onClick={()=>chooseMember(m.id)}
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
