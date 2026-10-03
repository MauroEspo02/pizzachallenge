# 🍕 Pizza Challenge

Gara di pizza napoletana tra amici: ognuno crea la sua pizza, tutti votano dal telefono e i risultati restano **segreti** finché l'admin non preme **Rivela risultati**.

## Avvio in locale (2 minuti)

Serve Node.js 22.13 o più recente.

```bash
npm install
npm run dev
```

Apri http://localhost:3000.

- **Partecipanti demo:** Guido 1111 · Leticia 2222 · Mauro 3333 · Terry 4444 · Lorenzo 5555 · Gigio 6666
- **Admin:** http://localhost:3000/admin, password `pizza`. Vale solo in locale: in produzione devi impostarla tu.

Il database viene creato da solo in `.data/pizza-challenge.sqlite`, già con 3 gusti demo × 2 panetti.

## Pubblicazione su Cloudflare (gratis)

L'app gira su Cloudflare Workers con il database D1: un solo deploy, nessun server da gestire.

```bash
npx wrangler login
npx wrangler d1 create pizza-challenge
```

1. Copia il `database_id` stampato dal secondo comando dentro `wrangler.jsonc`, al posto di `SOSTITUISCI-CON-IL-TUO-DATABASE-ID`.
2. Imposta la password admin (obbligatoria in produzione):
   ```bash
   npx wrangler secret put ADMIN_PASSWORD
   ```
3. Facoltativo ma consigliato, aggiunge un segreto in più ai PIN:
   ```bash
   npx wrangler secret put PIN_PEPPER
   ```
4. Pubblica:
   ```bash
   npm run deploy
   ```

Ti viene dato un indirizzo `https://pizza-challenge.<tuo-account>.workers.dev`. Per usare un tuo dominio (es. `pizza.tuodominio.com`), decommenta `routes` in `wrangler.jsonc` e rilancia `npm run deploy`. Le tabelle si creano da sole alla prima visita.

### Primo avvio in produzione

1. Vai su `/admin` ed entra con la tua password.
2. **Partecipanti → Genera PIN**: i PIN si vedono una volta sola, mandali a ciascuno (c'è il tasto WhatsApp). In produzione i PIN demo sono disattivati.
3. **Dashboard → Elimina dati demo** quando non ti servono più.

## La serata, in pochi tocchi

| Momento | Admin | Partecipanti |
|---|---|---|
| Prima | *Apri creazione* | Creano la pizza (tab **Crea**) |
| A tavola | *Apri votazioni*, poi *Servi la n. X* | Votano la pizza in tavola |
| Fine | *Chiudi votazioni* → **Rivela risultati** | Parte il verdetto su tutti i telefoni |

Su iPhone e Android: dal browser scegli **Aggiungi a schermata Home** e l'app si apre a tutto schermo.

## Alternativa: un server Node qualsiasi

```bash
npm run build:node
ADMIN_PASSWORD=... APP_ENV=production npm start   # porta 3000, DB in .data/
```

`DB_PATH` sceglie dove salvare il database. Metti l'app dietro HTTPS.

## Verifiche

```bash
npm test          # regole di calcolo, stati, ingredienti, vincoli del database
npm run test:e2e  # gli 11 casi richiesti, contro il server vero
npm run typecheck
```

## Sicurezza (in breve)

- I risultati si leggono solo da una vista del database che è vuota finché lo stato non è `RESULTS_REVEALED`. Nessuna API li espone prima, quindi ispezionare la pagina non serve a niente.
- Il database rifiuta da solo:
  - i voti fuori dalle votazioni aperte;
  - i doppi voti (`UNIQUE(event_id, pizza_version_id, user_id)`);
  - i punteggi non interi o fuori da 1–5;
  - i salti di stato non previsti.
- I PIN sono salvati con hash PBKDF2. Dopo troppi tentativi sbagliati scatta una pausa crescente.
- Le sessioni usano cookie HttpOnly e sono separate per partecipanti e admin. Sono attivi anche controllo dell'origine e intestazioni di sicurezza (CSP).
- Chi ha votato cosa lo vede solo l'admin. Ogni correzione di voto finisce nel **Registro** con data e ora.

## Struttura

```
src/
  database/      schema, migrazioni, trigger, dati demo
  features/      logica: evento (stati), partecipanti, pizze, voti, risultati, ingredienti
  auth/          PIN, sessioni, limiti di tentativi, protezione delle rotte
  pizza-builder/ catalogo ingredienti, riconoscimento del testo, disegno SVG a strati
  server/        rotte HTTP, validazione, avvio Workers e Node
  ui/            pagine (React renderizzato sul server) e "isole" interattive
  styles/        CSS
tests/           unit, db, e2e
```

### Aggiungere ingredienti

Il modo più semplice è da **Admin → Ingredienti**: scegli nome, sinonimi, categoria, aspetto grafico, strato, densità e colori. L'anteprima è dal vivo, e le pizze già create che lo nominano si aggiornano da sole. Gli ingredienti sconosciuti non bloccano mai nessuno: ricevono una grafica generica e compaiono lì sotto **Da sistemare**.

Per aggiungerli nel codice usa `src/pizza-builder/catalog.ts`. Un nuovo tipo di disegno va in `src/pizza-builder/art/visuals/`.
