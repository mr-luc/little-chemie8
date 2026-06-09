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

## Lehrer-Übersicht

Seite: **`https://DEINE-URL/lehrer.html`** – Klassencode eingeben
(oder `…/lehrer.html?code=KLASSENCODE`). Liste aller Schüler:innen nach XP
sortiert mit Level, Begriffen, Münzen, XP und „zuletzt aktiv"; optionale
Auto-Aktualisierung. Rohdaten: `…/api/class?code=KLASSENCODE`.

> Den Lehrer-Link nicht an die Schüler:innen weitergeben.

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
