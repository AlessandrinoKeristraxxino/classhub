# ClassHub

Applicazione React per creare e consultare lezioni private, con descrizioni in
Markdown e allegati.

## Configurazione Supabase

1. Crea un progetto Supabase e applica, in ordine, tutte le migration in
   [`supabase/migrations`](./supabase/migrations). Creano le lezioni, i profili,
   gli avatar, eventi, i blocchi della dashboard, ruoli e permessi, oltre alle
   policy RLS.
2. Copia `.env.example` in `.env` e inserisci URL del progetto e chiave anonima
   (o publishable key). Non inserire mai una chiave `service_role` nel client.
3. Riavvia il server Vite dopo aver configurato le variabili.
4. In Supabase Auth configura le conferme email e gli URL di redirect per gli
   ambienti che utilizzi.

Gli utenti possono registrarsi o accedere dalla pagina **Lezioni**. RLS limita
le righe e i file al rispettivo proprietario; gli allegati sono privati e
vengono aperti tramite URL firmati a scadenza. La dimensione massima per
allegato è 10 MB e per avatar 2 MB. Ogni account riceve il ruolo predefinito
**Studente**; solo `alessandro.luigi.napoli@gmail.com` può aprire
**Amministrazione** e gestire ruoli, permessi e assegnazioni.

Se hai già applicato le migration precedenti ma la home mostra `PGRST205` per
`public.events`, esegui dal SQL Editor l'intera migration più recente
[`20261117000003_add_dashboard_blocks_and_permissions.sql`](./supabase/migrations/20261117000003_add_dashboard_blocks_and_permissions.sql).
È ripetibile e crea anche gli eventi se mancanti. La pagina **Amministrazione**
contiene il catalogo dei permessi assegnabili; gli amministratori possono
inoltre aggiungere e modificare box, testi e link mostrati nella home.
I permessi disponibili includono creazione e cancellazione di lezioni/eventi
(propri o di tutti gli utenti) e gestione dei contenuti condivisi della
dashboard. Gli utenti con `lessons.delete_own` possono eliminare le proprie
lezioni direttamente dalla scheda.

## Cloudflare Pages

La configurazione Wrangler è in [`wrangler.jsonc`](./wrangler.jsonc). Dopo aver
creato un account Cloudflare:

1. Esegui `npx wrangler login` e crea il progetto Pages `classhub` dal
   dashboard Cloudflare.
2. Configura `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_PUBLISHABLE_KEY` nelle variabili di build Cloudflare se
   userai anche le build collegate a Git. Sono chiavi pubbliche destinate al
   browser: non inserire mai una chiave `service_role`.
3. Esegui `npm run build`, poi
   `npx wrangler pages deploy dist --project-name=classhub` per pubblicare `dist`.

La distribuzione da riga di comando usa le variabili del `.env` locale. Il
dominio personalizzato e le impostazioni DNS vanno configurati nel dashboard
Cloudflare dopo aver collegato il dominio.

## Sviluppo

```sh
npm install
npm run dev
```

La build di produzione e il lint sono disponibili con `npm run build` e
`npm run lint`.
