# Schüler-Login & Spielstand-Sync (Cloudflare Worker)

**Variante B**: Login per **Klassencode + Name** (kein Passwort) mit
Spielstand-Synchronisierung. Jede:r findet den eigenen Stand (entdeckte
Begriffe, Münzen, XP) auf jedem Gerät wieder.

Dieses Projekt läuft als **Cloudflare Worker mit statischen Assets**
(URL-Form `…workers.dev`):

- `worker.js` – bedient `/api/*` (Login/Sync + Lehrer-Übersicht) und liefert
  sonst die statischen Dateien aus.
- `wrangler.toml` – Konfiguration: Worker-Einstieg, Assets-Verzeichnis und die
  **KV-Bindung `PROGRESS`** (mit deiner Namespace-ID).
- `.assetsignore` – verhindert, dass Code/Config als Website ausgeliefert wird.

> Hinweis: Auf **GitHub Pages** (ohne Worker/Backend) läuft das Spiel weiterhin
> rein lokal – der Login erscheint dort nicht (die App erkennt das automatisch
> über `/api/ping`).

## Einrichtung

1. **KV-Namespace** anlegen
   - Dashboard → *Storage & Databases* → *KV* → **Create** → z. B.
     `little-chemie8`.
   - Die **Namespace-ID** (lange Hex-Zeichenkette) in `wrangler.toml` unter
     `[[kv_namespaces]] id = "…"` eintragen. *(Ist bereits gesetzt.)*

2. **Worker mit dem Repo verbinden** (falls noch nicht geschehen)
   - Dashboard → *Workers & Pages* → *Create* → *Import a repository* →
     `mr-luc/little-chemie8`.
   - Da eine `wrangler.toml` vorhanden ist, wird bei jedem Push auf `main`
     automatisch `wrangler deploy` ausgeführt – inklusive KV-Bindung und Assets.

3. **Fertig.** Beim Öffnen der `…workers.dev`-URL erscheint der Login.

## Lehrer-Bereich

Seite: **`https://DEINE-URL/lehrer.html`** – Login **nur mit der Lehrer-PIN**.
Danach im Bereich:

- **Klassencodes anlegen** (Code + optionale Bezeichnung) und löschen.
- Pro Klasse die **Schülerliste** ansehen (nach XP sortiert: Level, Begriffe,
  Münzen, XP, „zuletzt aktiv").

**Wichtig:** Schüler:innen können sich im Spiel **nur mit einem hier angelegten
Klassencode** anmelden. Lege die Klasse also an, bevor die Klasse spielt, und
gib den Code aus. Unbekannte Codes werden im Spiel abgewiesen.

### Lehrer-PIN einrichten (einmalig)

Die PIN wird als **verschlüsseltes Worker-Secret `TEACHER_PIN`** gespeichert –
**nicht** im Code/Repo. Ohne dieses Secret antwortet `/api/class` mit
„PIN nicht eingerichtet".

- **Im Dashboard:** Worker → *Settings* → *Variables and Secrets* →
  *Add variable* → Name `TEACHER_PIN`, Wert = deine Wunsch-PIN,
  **Type: Secret / Encrypt** → *Save* → einmal neu deployen.
- **Oder per CLI:** `npx wrangler secret put TEACHER_PIN`

Die PIN gilt für alle Klassencodes (eine Lehr-PIN). Sie wird im Browser nur für
die laufende Sitzung gemerkt, nicht dauerhaft gespeichert.

> Den Lehrer-Link trotzdem nicht aktiv an die Schüler:innen weitergeben.

## Lokal testen

```bash
npx wrangler dev
```

## Datenschutz

- Keine Passwörter/E-Mail – nur Klassencode + (frei wählbarer) Name.
- Empfehlung: **Spitznamen** statt Klarnamen → Stand ist pseudonym.
- Wer den Klassencode kennt, kann Stände dieser Klasse lesen/überschreiben.
  Für den niedrigschwelligen Einsatz ok; für mehr Schutz später Lehrer-PIN
  ergänzen. Vor produktivem Einsatz mit der/dem Datenschutzbeauftragten klären.
