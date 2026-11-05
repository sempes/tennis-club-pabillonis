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

    return hours.filter(h=>{
      if(isToday && h<=`${pad(now.getHours())}:00`){
        return false;
      }

      const occupied=bookings.some(b=>
        b.status==='active' &&
        b.booking_date===selectedDate &&
        String(b.court_id)===String(newBooking.court_id) &&
        b.start_time.slice(0,5)===h
      );

      return !occupied;
    });
  },[bookings,selectedDate,newBooking.court_id]);

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
    return dayBookings.find(b=>
      String(b.court_id)===String(c) &&
      b.start_time.slice(0,5)===t &&
      b.status==='active'
    );
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
