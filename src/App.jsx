
import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, CalendarDays, Clock3, LogOut, Plus, ShieldCheck,
  Sparkles, CircleDot, X, Search, Edit2, Save, UserCog, RefreshCw
} from 'lucide-react';
import { configured, supabase } from './supabase';

const pad = n => String(n).padStart(2, '0');
const dateKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const prettyDate = d => new Intl.DateTimeFormat('it-IT',{weekday:'long',day:'numeric',month:'long'}).format(d);
const hours = Array.from({length:24},(_,i)=>`${pad(i)}:00`);
const today = new Date();

function App() {
  const [session,setSession] = useState(null);
  const [profile,setProfile] = useState(null);
  const [members,setMembers] = useState([]);
  const [bookings,setBookings] = useState([]);
  const [selectedDate,setSelectedDate] = useState(dateKey(today));
  const [court,setCourt] = useState('all');
  const [loading,setLoading] = useState(false);
  const [notice,setNotice] = useState('');
  const [loginEmail,setLoginEmail] = useState('');
  const [loginPassword,setLoginPassword] = useState('');
  const [showBooking,setShowBooking] = useState(false);
  const [adminSection,setAdminSection] = useState('bookings');
  const [memberSearch,setMemberSearch] = useState('');
  const [editingMember,setEditingMember] = useState(null);
  const [savingMember,setSavingMember] = useState(false);

  const [newMember,setNewMember] = useState({
    name:'',surname:'',email:'',password:''
  });

  const [memberForm,setMemberForm] = useState({
    name:'',surname:'',email:'',password:'',status:'active'
  });

  const [newBooking,setNewBooking] = useState({
    court_id:'1',time:'09:00',type:'singles',
    players:['',''],guests:['','']
  });

  const isAdmin = profile?.role === 'admin';
  const selected = new Date(`${selectedDate}T12:00:00`);
  const days = [0,1,2].map(n=>{
    const d=new Date();
    d.setDate(d.getDate()+n);
    return d;
  });

  useEffect(()=>{
    if(!configured) return;

    supabase.auth.getSession().then(({data})=>{
      setSession(data.session);
    });

    const {data:{subscription}} =
      supabase.auth.onAuthStateChange((_e,s)=>setSession(s));

    return ()=>subscription.unsubscribe();
  },[]);

  useEffect(()=>{
    if(session) loadData();
    else {
      setProfile(null);
      setMembers([]);
      setBookings([]);
    }
  },[session]);

  async function loadData(){
    if(!session) return;

    setLoading(true);

    const [
      {data:p,error:pe},
      {data:m,error:me},
      {data:b,error:be}
    ] = await Promise.all([
      supabase.from('profiles')
        .select('*')
        .eq('id',session.user.id)
        .single(),

      supabase.from('profiles')
        .select('id,full_name,email,role,status,created_at')
        .order('full_name'),

      supabase.from('bookings')
        .select('*,booking_players(*)')
        .gte('booking_date',dateKey(new Date()))
        .order('booking_date')
        .order('start_time')
    ]);

    if(pe){
      setNotice(pe.message);
    } else if(p?.status !== 'active'){
      await supabase.auth.signOut();
      setNotice('Account non attivo. Contatta l’amministratore.');
    } else {
      setProfile(p);
    }

    if(me){
      setNotice(me.message);
    } else {
      setMembers(
        isAdmin || p?.role === 'admin'
          ? (m || [])
          : (m || []).filter(x=>x.status==='active')
      );
    }

    if(be){
      setNotice(be.message);
    } else {
      setBookings(b || []);
    }

    setLoading(false);
  }

  async function login(e){
    e.preventDefault();
    setNotice('');

    const {error}=await supabase.auth.signInWithPassword({
      email:loginEmail,
      password:loginPassword
    });

    if(error) setNotice('Accesso non riuscito: verifica email e password.');
  }

  async function logout(){
    await supabase.auth.signOut();
  }

  const dayBookings=useMemo(
    ()=>bookings.filter(b=>
      b.booking_date===selectedDate &&
      (court==='all'||String(b.court_id)===court)
    ),
    [bookings,selectedDate,court]
  );

  const busyMemberIds=useMemo(
    ()=>new Set(
      bookings
        .filter(b=>b.status==='active')
        .flatMap(b=>(b.booking_players||[])
          .map(p=>p.member_id).filter(Boolean))
    ),
    [bookings]
  );

  const filteredMembers=useMemo(()=>{
    const term=memberSearch.trim().toLowerCase();

    return members.filter(m=>{
      if(!term) return true;

      return (
        (m.full_name||'').toLowerCase().includes(term) ||
        (m.email||'').toLowerCase().includes(term)
      );
    });
  },[members,memberSearch]);

  function bookingAt(c,t){
    return dayBookings.find(b=>
      String(b.court_id)===String(c) &&
      b.start_time.slice(0,5)===t &&
      b.status==='active'
    );
  }

  function playerNames(b){
    return (b.booking_players||[])
      .map(p=>p.display_name).join(' · ');
  }

  async function createBooking(e){
    e.preventDefault();

    const count=newBooking.type==='singles'?2:4;
    const picked=newBooking.players.slice(0,count);

    const guestAllowed =
      newBooking.type==='singles' ? [1] : [2,3];

    if(picked.some((x,i)=>
      x==='guest' && !guestAllowed.includes(i)
    )){
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
    await loadData();
  }

  async function cancelBooking(id){
    if(!confirm('Vuoi cancellare questa prenotazione?')) return;

    const {error}=await supabase
      .from('bookings')
      .update({status:'cancelled'})
      .eq('id',id);

    setNotice(error?error.message:'Prenotazione cancellata.');
    await loadData();
  }

  async function addMember(e){
    e.preventDefault();
    setNotice('');

    const {data,error}=await supabase.functions.invoke(
      'admin-create-member',
      {body:newMember}
    );

    if(error || data?.error){
      let detail=data?.error || error?.message || 'Errore sconosciuto';

      try{
        if(error?.context && typeof error.context.json==='function'){
          const response=await error.context.json();
          detail=response.error || response.message || detail;
        }
      }catch{}

      setNotice('Errore creazione socio: '+detail);
      return;
    }

    setNotice('Socio creato correttamente.');
    setNewMember({name:'',surname:'',email:'',password:''});
    await loadData();
  }

  function startEditMember(member){
    const parts=(member.full_name||'').split(' ');

    setEditingMember(member.id);
    setMemberForm({
      name:parts[0]||'',
      surname:parts.slice(1).join(' '),
      email:member.email||'',
      password:'',
      status:member.status
    });
  }

  async function saveMember(e){
    e.preventDefault();

    if(!editingMember) return;

    setSavingMember(true);
    setNotice('');

    const payload={
      member_id:editingMember,
      name:memberForm.name.trim(),
      surname:memberForm.surname.trim(),
      email:memberForm.email.trim(),
      status:memberForm.status
    };

    if(memberForm.password.trim()){
      payload.password=memberForm.password;
    }

    const {data,error}=await supabase.functions.invoke(
      'admin-manage-member',
      {body:payload}
    );

    setSavingMember(false);

    if(error || data?.error){
      let detail=data?.error || error?.message || 'Errore sconosciuto';

      try{
        if(error?.context && typeof error.context.json==='function'){
          const response=await error.context.json();
          detail=response.error || response.message || detail;
        }
      }catch{}

      setNotice('Modifica non riuscita: '+detail);
      return;
    }

    setNotice('Dati del socio aggiornati correttamente.');
    setEditingMember(null);
    await loadData();
  }

  async function changeMemberStatus(member,status){
    const action =
      status==='suspended' ? 'sospendere' :
      status==='active' ? 'riattivare' : 'disattivare';

    if(!confirm(`Vuoi ${action} ${member.full_name}?`)) return;

    setNotice('');

    const {data,error}=await supabase.functions.invoke(
      'admin-manage-member',
      {
        body:{
          member_id:member.id,
          status
        }
      }
    );

    if(error || data?.error){
      setNotice(
        'Operazione non riuscita: '+
        (data?.error || error?.message || 'Errore sconosciuto')
      );
      return;
    }

    setNotice('Stato del socio aggiornato.');
    await loadData();
  }

  if(!configured) return <SetupScreen/>;

  if(!session) return <main className="login-shell">
    <div className="login-art">
      <div className="brand">
        <span className="brand-mark"><CircleDot/></span>
        <span>TCP<span className="brand-dot">.</span></span>
      </div>
      <div className="art-copy">
        <span className="eyebrow">IL TUO CLUB, IL TUO CAMPO</span>
        <h1>Il prossimo<br/><em>match</em> inizia qui.</h1>
        <p>Prenota il campo, scegli i compagni e scendi in gioco.</p>
      </div>
      <div className="court-lines"><i/><i/><i/><i/></div>
      <span className="art-footer">TENNIS CLUB PABILLONIS · DAL 2026</span>
    </div>

    <section className="login-panel">
      <div className="mobile-brand">TENNIS CLUB <b>PABILLONIS</b></div>
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
          <button className="primary wide">
            Accedi <ArrowRight size={17}/>
          </button>
        </form>

        {notice&&<div className="notice">{notice}</div>}
        <small>Non hai ancora le credenziali? Rivolgiti all’amministratore del club.</small>
      </div>
      <div className="login-bottom">© Tennis Club Pabillonis <span>•</span> Accesso soci</div>
    </section>
  </main>;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark"><CircleDot/></span>
        <span>TCP<span className="brand-dot">.</span></span>
      </div>

      <div className="club-label">TENNIS CLUB<br/><b>PABILLONIS</b></div>

      <nav>
        <button
          className={adminSection==='bookings'?'nav-active':''}
          onClick={()=>setAdminSection('bookings')}>
          <CalendarDays size={18}/> Prenotazioni
        </button>

        {isAdmin&&
          <button
            className={adminSection==='members'?'nav-active':''}
            onClick={()=>setAdminSection('members')}>
            <ShieldCheck size={18}/> Gestione soci
          </button>
        }
      </nav>

      <div className="sidebar-bottom">
        <div className="profile-mini">
          <span className="avatar">{profile?.full_name?.[0]||'S'}</span>
          <div>
            <b>{profile?.full_name}</b>
            <small>{isAdmin?'Amministratore':'Socio'}</small>
          </div>
        </div>
        <button className="logout" onClick={logout}>
          <LogOut size={17}/> Esci
        </button>
      </div>
    </aside>

    <main className="main-content">

      {adminSection==='bookings'&&<>
        <header className="topbar">
          <div>
            <span className="eyebrow">AREA SOCI / PRENOTAZIONI</span>
            <h1>Il campo ti aspetta<span>.</span></h1>
          </div>
          <div className="top-actions">
            <span className="live-dot">Sistema attivo</span>
            <span className="avatar large">{profile?.full_name?.[0]||'S'}</span>
          </div>
        </header>

        <section className="welcome-strip">
          <div><Sparkles size={18}/>
            <span>È il momento di giocare. Scegli il tuo prossimo slot.</span>
          </div>
          <span>2 CAMPI · 60 MINUTI</span>
        </section>

        <section className="date-section">
          <div><span className="eyebrow">CALENDARIO</span><h2>Le disponibilità</h2></div>
          <div className="date-tabs">
            {days.map((d,i)=>
              <button key={i}
                onClick={()=>setSelectedDate(dateKey(d))}
                className={selectedDate===dateKey(d)?'date-tab selected':''}>
                <small>{['OGGI','DOMANI','DOPO DOMANI'][i]}</small>
                <b>{pad(d.getDate())}</b>
                <span>{d.toLocaleDateString('it-IT',{month:'short'})}</span>
              </button>
            )}
          </div>
        </section>

        <div className="booking-toolbar">
          <div className="selected-date">
            <CalendarDays size={17}/><b>{prettyDate(selected)}</b>
          </div>

          <div className="filters">
            <button className={court==='all'?'filter active':''}
              onClick={()=>setCourt('all')}>Tutti i campi</button>
            <button className={court==='1'?'filter active':''}
              onClick={()=>setCourt('1')}>Campo 1</button>
            <button className={court==='2'?'filter active':''}
              onClick={()=>setCourt('2')}>Campo 2</button>
          </div>

          <button className="primary" onClick={()=>setShowBooking(true)}>
            <Plus size={17}/> Nuova prenotazione
          </button>
        </div>

        <section className="courts-grid">
          {[1,2].filter(c=>court==='all'||String(c)===court).map(c=>
            <article className="court-card" key={c}>
              <div className="court-head">
                <div>
                  <span className="eyebrow">CAMPO {c===1?'01':'02'}</span>
                  <h3>Campo {c}</h3>
                </div>
                <span className="court-status"><i/> Disponibile</span>
              </div>

              <div className="court-visual">
                <div className="court-drawing">
                  <div className="court-inner">
                    <div className="court-mid"/>
                    <div className="court-net"/>
                  </div>
                </div>
                <span className="court-caption">TENNIS CLUB PABILLONIS</span>
              </div>

              <div className="slots-head">
                <b>Orari</b><small>Slot da 60 minuti</small>
              </div>

              <div className="slots">
                {hours.map(t=>{
                  const b=bookingAt(c,t);
                  const past=selectedDate===dateKey(today)&&
                    t<=`${pad(today.getHours())}:00`;

                  return <div key={t}
                    className={`slot ${b?'occupied':''} ${past?'past':''}`}>
                    <span>{t}</span>
                    {b
                      ? <div className="slot-info">
                          <b>{playerNames(b)}</b>
                          <small>{b.booking_type==='singles'?'Singolo':'Doppio'}</small>
                        </div>
                      : <small>{past?'Passato':'Libero'}</small>
                    }
                    {b&&(b.owner_id===session.user.id||isAdmin)&&
                      <button className="slot-cancel" title="Cancella"
                        onClick={()=>cancelBooking(b.id)}>
                        <X size={14}/>
                      </button>
                    }
                  </div>;
                })}
              </div>
            </article>
          )}
        </section>

        {isAdmin&&
          <section className="admin-panel">
            <div className="admin-heading">
              <div>
                <span className="eyebrow">PANNELLO AMMINISTRATORE</span>
                <h2>Nuovo socio</h2>
              </div>
              <ShieldCheck/>
            </div>

            <form className="member-form" onSubmit={addMember}>
              <input placeholder="Nome" value={newMember.name}
                onChange={e=>setNewMember({...newMember,name:e.target.value})}
                required/>
              <input placeholder="Cognome" value={newMember.surname}
                onChange={e=>setNewMember({...newMember,surname:e.target.value})}
                required/>
              <input type="email" placeholder="Email" value={newMember.email}
                onChange={e=>setNewMember({...newMember,email:e.target.value})}
                required/>
              <input type="password" placeholder="Password iniziale"
                value={newMember.password}
                onChange={e=>setNewMember({...newMember,password:e.target.value})}
                minLength="8" required/>
              <button className="primary">
                Crea account <Plus size={16}/>
              </button>
            </form>
          </section>
        }
      </>}

      {adminSection==='members'&&isAdmin&&
        <section className="admin-panel">
          <div className="admin-heading">
            <div>
              <span className="eyebrow">PANNELLO AMMINISTRATORE</span>
              <h2>Gestione soci</h2>
            </div>
            <UserCog/>
          </div>

          <div className="member-search">
            <Search size={18}/>
            <input
              placeholder="Cerca per nome o email..."
              value={memberSearch}
              onChange={e=>setMemberSearch(e.target.value)}
            />
            <button type="button" onClick={loadData} title="Aggiorna elenco">
              <RefreshCw size={17}/>
            </button>
          </div>

          <div className="member-list">
            {filteredMembers.length===0&&
              <p className="muted">Nessun socio trovato.</p>
            }

            {filteredMembers.map(member=>
              <article className="member-card" key={member.id}>
                <div className="member-card-info">
                  <span className="avatar">{member.full_name?.[0]||'S'}</span>
                  <div>
                    <b>{member.full_name}</b>
                    <small>{member.email}</small>
                    <small>
                      Stato: {
                        member.status==='active'?'Attivo':
                        member.status==='suspended'?'Sospeso':'Disattivato'
                      }
                    </small>
                  </div>
                </div>

                <div className="member-actions">
                  <button type="button" className="filter"
                    onClick={()=>startEditMember(member)}>
                    <Edit2 size={15}/> Modifica
                  </button>

                  {member.status==='active'&&
                    <button type="button" className="filter"
                      onClick={()=>changeMemberStatus(member,'suspended')}>
                      Sospendi
                    </button>
                  }

                  {member.status==='suspended'&&
                    <button type="button" className="filter"
                      onClick={()=>changeMemberStatus(member,'active')}>
                      Riattiva
                    </button>
                  }

                  {member.status!=='deleted'&&
                    <button type="button" className="filter"
                      onClick={()=>changeMemberStatus(member,'deleted')}>
                      Disattiva
                    </button>
                  }
                </div>
              </article>
            )}
          </div>

          {editingMember&&
            <div className="member-edit">
              <div className="admin-heading">
                <div>
                  <span className="eyebrow">MODIFICA ACCOUNT</span>
                  <h2>Dati del socio</h2>
                </div>
                <button type="button" className="icon-button"
                  onClick={()=>setEditingMember(null)}>
                  <X/>
                </button>
              </div>

              <form className="member-form" onSubmit={saveMember}>
                <input placeholder="Nome"
                  value={memberForm.name}
                  onChange={e=>setMemberForm({...memberForm,name:e.target.value})}
                  required/>

                <input placeholder="Cognome"
                  value={memberForm.surname}
                  onChange={e=>setMemberForm({...memberForm,surname:e.target.value})}
                  required/>

                <input type="email" placeholder="Email"
                  value={memberForm.email}
                  onChange={e=>setMemberForm({...memberForm,email:e.target.value})}
                  required/>

                <input type="password"
                  placeholder="Nuova password (facoltativa)"
                  value={memberForm.password}
                  onChange={e=>setMemberForm({...memberForm,password:e.target.value})}
                  minLength="8"/>

                <label>Stato account
                  <select value={memberForm.status}
                    onChange={e=>setMemberForm({...memberForm,status:e.target.value})}>
                    <option value="active">Attivo</option>
                    <option value="suspended">Sospeso</option>
                    <option value="deleted">Disattivato</option>
                  </select>
                </label>

                <button className="primary" disabled={savingMember}>
                  <Save size={16}/>
                  {savingMember?'Salvataggio...':'Salva modifiche'}
                </button>
              </form>

              <p className="muted">
                Lascia vuoto il campo password se non vuoi modificarla.
                La disattivazione conserva lo storico delle prenotazioni.
              </p>
            </div>
          }
        </section>
      }

      {notice&&
        <div className="toast" onClick={()=>setNotice('')}>
          {notice}<X size={15}/>
        </div>
      }

      {loading&&<div className="loading">Aggiornamento dati…</div>}
    </main>

    {showBooking&&
      <div className="modal-backdrop" onClick={()=>setShowBooking(false)}>
        <div className="modal" onClick={e=>e.stopPropagation()}>
          <div className="modal-top">
            <div>
              <span className="eyebrow">NUOVA PRENOTAZIONE</span>
              <h2>Scendi in campo.</h2>
            </div>
            <button className="icon-button" onClick={()=>setShowBooking(false)}>
              <X/>
            </button>
          </div>

          <form onSubmit={createBooking}>
            <label>Campo
              <select value={newBooking.court_id}
                onChange={e=>setNewBooking({...newBooking,court_id:e.target.value})}>
                <option value="1">Campo 1</option>
                <option value="2">Campo 2</option>
              </select>
            </label>

            <label>Orario
              <select value={newBooking.time}
                onChange={e=>setNewBooking({...newBooking,time:e.target.value})}>
                {hours.map(h=>
                  <option key={h} value={h}>
                    {h} – {`${pad((Number(h.slice(0,2))+1)%24)}:00`}
                  </option>
                )}
              </select>
            </label>

            <label>Tipo di partita
              <select value={newBooking.type}
                onChange={e=>setNewBooking({
                  ...newBooking,
                  type:e.target.value,
                  players:['','','',''],
                  guests:['','','','']
                })}>
                <option value="singles">Singolo · 2 giocatori</option>
                <option value="doubles">Doppio · 4 giocatori</option>
              </select>
            </label>

            <div className="player-fields">
              <b>Giocatori</b>

              {Array.from({
                length:newBooking.type==='singles'?2:4
              },(_,i)=>{
                const guestAllowed =
                  newBooking.type==='singles' ? i===1 : i>=2;

                return <div className="player-row" key={i}>
                  <span>{i+1}</span>

                  <select value={newBooking.players[i]||''}
                    onChange={e=>{
                      const a=[...newBooking.players];
                      a[i]=e.target.value;
                      const g=[...newBooking.guests];
                      g[i]='';
                      setNewBooking({...newBooking,players:a,guests:g});
                    }}>
                    <option value="">
                      Scegli socio{guestAllowed?' oppure ospite':''}
                    </option>

                    {guestAllowed&&
                      <option value="guest">Ospite esterno</option>
                    }

                    {members.filter(m=>
                      m.status==='active' &&
                      (!busyMemberIds.has(m.id)||m.id===profile.id)
                    ).map(m=>
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    )}
                  </select>

                  {newBooking.players[i]==='guest'&&guestAllowed&&
                    <input placeholder="Nome e cognome ospite"
                      value={newBooking.guests[i]||''}
                      onChange={e=>{
                        const a=[...newBooking.guests];
                        a[i]=e.target.value;
                        setNewBooking({...newBooking,guests:a});
                      }}
                      required/>
                  }
                </div>;
              })}
            </div>

            <div className="modal-note">
              <Clock3 size={16}/>
              Prenotazione di 60 minuti · massimo 2 giorni in anticipo
            </div>

            <button className="primary wide" type="submit">
              Conferma prenotazione <ArrowRight size={17}/>
            </button>
          </form>
        </div>
      </div>
    }
  </div>;
}

function SetupScreen(){
  return <div className="setup-screen">
    <div className="setup-card">
      <div className="brand">
        <span className="brand-mark"><CircleDot/></span>
        <span>TCP<span className="brand-dot">.</span></span>
      </div>
      <span className="eyebrow">CONFIGURAZIONE INIZIALE</span>
      <h1>Il club sta per<br/><em>scendere in campo.</em></h1>
      <p>
        La parte grafica è pronta. Per attivare accessi e prenotazioni
        condivise occorre collegare il progetto al database Supabase gratuito.
      </p>
      <ol>
        <li>Crea un progetto su Supabase.</li>
        <li>Esegui lo script <code>supabase/schema.sql</code> nel SQL Editor.</li>
        <li>Copia URL e chiave anonima nel file <code>.env</code>.</li>
        <li>Crea il primo utente amministratore e imposta il suo profilo come <code>admin</code>.</li>
      </ol>
      <div className="setup-warning">
        <ShieldCheck/> Non inserire mai la chiave <b>service_role</b> nel sito:
        deve restare segreta sul server.
      </div>
      <p className="muted">
        Consulta il file README incluso nel progetto per la procedura completa
        e le funzioni server necessarie.
      </p>
    </div>
  </div>;
}

export default App;
