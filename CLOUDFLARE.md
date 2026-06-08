# Schüler-Login & Spielstand-Sync (Cloudflare Pages)

Diese Anleitung beschreibt **Variante B**: Login per **Klassencode + Name** (kein
Passwort), mit Spielstand-Synchronisierung über Cloudflare. Damit findet jede:r
Schüler:in den eigenen Stand (entdeckte Begriffe, Münzen, XP) auf jedem Gerät
wieder.

> Wichtig: Auf GitHub Pages (ohne Backend) läuft das Spiel unverändert lokal –
> der Login erscheint nur dann, wenn die unten beschriebenen Functions verfügbar
> sind. Die App erkennt das automatisch über `/api/ping`.

## Funktionsweise (kurz)

- `functions/api/ping.js` – meldet, dass das Backend da ist (Auto-Erkennung).
- `functions/api/progress.js` – `GET` lädt, `POST` speichert den Spielstand.
- `functions/api/class.js` – Übersicht für die Lehrkraft (`/api/class?code=…`).
- Gespeichert wird in einem **KV-Namespace**, gebunden als `PROGRESS`.
- Es werden **nur Spieldaten** gespeichert (Begriffe, Münzen, XP) plus der vom
  Kind gewählte Name – bewusst datensparsam.

## Einrichtung in Cloudflare

1. **Pages-Projekt anlegen**
   - Cloudflare Dashboard → *Workers & Pages* → *Create application* → *Pages* →
     *Connect to Git* → dieses Repository wählen.
   - Build-Einstellungen: **Framework preset: None**, **Build command: leer**,
     **Build output directory: `/`** (das Spiel ist statisch). Die `functions/`
     werden automatisch als Pages Functions deployt.

2. **KV-Namespace erstellen & binden**
   - *Workers & Pages* → *KV* → *Create a namespace*, z. B. Name
     `little-chemie8`.
   - Im Pages-Projekt → *Settings* → *Functions* → *KV namespace bindings* →
     *Add binding*:
     - **Variable name:** `PROGRESS`
     - **KV namespace:** den eben erstellten auswählen
   - Binding für **Production** und **Preview** setzen, dann neu deployen.

3. **Fertig.** Beim Öffnen der Cloudflare-URL erscheint der Login. Code + Name
   eingeben → Stand wird geladen/angelegt und automatisch gesichert.

## Lehrer-Übersicht

`https://DEINE-PAGES-URL/api/class?code=KLASSENCODE`

liefert eine nach XP sortierte JSON-Liste aller Schüler:innen der Klasse
(Name, entdeckte Begriffe, Münzen, XP, letzte Aktualisierung).

## Datenschutz-Hinweise

- Keine Passwörter, keine E-Mail – nur Klassencode + (frei wählbarer) Name.
- Empfehlung: **Spitznamen statt Klarnamen** verwenden, dann ist der Stand
  pseudonym.
- Wer den Klassencode kennt, kann Stände dieser Klasse lesen/überschreiben.
  Für den niedrigschwelligen Spieleinsatz ist das ok; für mehr Schutz ließe
  sich später ein Lehrer-PIN oder Cloudflare Access ergänzen.
- Vor dem produktiven Einsatz mit der/dem Datenschutzbeauftragten der Schule
  abstimmen.

## Lokales Testen (optional)

Mit der Cloudflare-CLI `wrangler`:

```bash
npx wrangler pages dev . --kv PROGRESS
```

Dann `http://localhost:8788` öffnen – der Login erscheint, KV läuft lokal.
