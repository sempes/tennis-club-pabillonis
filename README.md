# Tennis Club Pabillonis

Applicazione web responsive per le prenotazioni dei due campi. Frontend React/Vite, autenticazione e database Supabase.

## Cosa è già impostato
- Interfaccia responsive moderna per smartphone, tablet e PC.
- Login per soci creati manualmente dall'amministratore.
- Due campi, calendario oggi/domani/dopodomani, fasce orarie di un'ora.
- Partite singole e doppie, soci e ospiti.
- Chiamata atomica al database per evitare doppie prenotazioni e doppio impiego di un socio.
- Storico preservato: i soci vanno disattivati, non cancellati fisicamente.

## Importante: stato del progetto
Questa è la base applicativa pronta per essere configurata, non un sito già pubblicato. Le prenotazioni condivise richiedono un progetto Supabase collegato e la funzione Edge amministrativa descritta sotto. Non usare localStorage per dati reali.

## Avvio locale
1. Installa Node.js LTS.
2. Estrai il progetto e apri il terminale nella cartella.
3. Esegui `npm install`.
4. Copia `.env.example` in `.env` e inserisci URL e publishable key del progetto Supabase. La publishable key è utilizzabile nel frontend; non inserire mai una secret key o service_role.
5. Esegui `npm run dev`.

## Configurazione Supabase
1. Crea un progetto gratuito su https://supabase.com/.
2. Nel SQL Editor esegui tutto `supabase/schema.sql`.
3. In Authentication crea il primo utente amministratore.
4. Inserisci il profilo admin: modifica l'email nel comando commentato in fondo a `schema.sql` e lancialo.
5. Implementa e distribuisci la Edge Function `admin-create-member` (specifiche in `supabase/admin-create-member/README.md`), con `SUPABASE_SERVICE_ROLE_KEY` solo come secret server-side.
6. In Authentication disabilita le registrazioni pubbliche se non necessarie.

## Pubblicazione gratuita
Puoi pubblicare il frontend su Cloudflare Pages o Vercel collegando un repository Git. Aggiungi le variabili `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` nelle impostazioni di build. Il database rimane su Supabase. I piani gratuiti hanno limiti e condizioni che possono cambiare; verifica le quote correnti prima di un uso continuativo.

## Regole da verificare prima della messa in esercizio
- La prenotazione deve contenere il socio che la crea.
- Ogni socio può essere presente in una sola prenotazione attiva, come proprietario o partecipante.
- Il controllo viene eseguito anche dal database al momento della conferma.
- La funzione di pulizia deve marcare le prenotazioni passate come `expired`, senza cancellare lo storico. Configura un job schedulato lato server, ad esempio giornaliero.
- Per la cancellazione di soci usare `status='deleted'`, non `DELETE`.
- Per sospendere usare `status='suspended'`; riattivare con `status='active'`.

## Nota tecnica da completare
Prima della produzione vanno aggiunti: Edge Function effettiva per la creazione account, schermata amministrativa completa per sospensione/riattivazione/disattivazione, test dei permessi RLS, gestione errori e job automatico di scadenza. La pagina amministratore presente è uno scheletro funzionale per la creazione account, non sostituisce la console completa.
