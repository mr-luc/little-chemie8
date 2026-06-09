# Portal „Little-schoolapp" – Bauplan

Repo: **`mr-luc/Little-schoolapp`** · Cloudflare-Worker-Name: `little-schoolapp`
KV-Binding `PROGRESS` möglichst auf **denselben** Namespace wie chemie8 legen
(ID `3d5084f60edb457da08df691b31a0a0d`), dann bleiben Klassen + Lehrer-PIN erhalten.

Ziel: ein zentrales Portal, in dem sich Schüler:innen einmal anmelden und
automatisch das **von der Lehrkraft zugewiesene Spiel** bekommen. Mehrere Spiele
teilen sich **einen** Login, **einen** KV-Speicher und **einen** Lehrer-Bereich.

## Verzeichnisstruktur (neues Repo `Little-schoolapp`)
```
/
├── index.html              # Portal: Login → Weiterleitung zum zugewiesenen Spiel
├── lehrer.html             # Lehrer-Bereich (Login, Klassen, Spiel-Zuweisung)
├── worker.js               # Cloudflare Worker: /api/* + statische Auslieferung
├── wrangler.toml           # name, assets, KV-Binding PROGRESS, keep_vars=true
├── .assetsignore
├── games/
│   ├── chemie8/            # das bisherige little-chemie8 (index/app/style/effects)
│   └── biologie8/          # später
└── CLOUDFLARE.md
```

## Datenmodell (KV-Namespace `PROGRESS`)
- `class:<code>` → `{ code, label, created, slots:[namen], game:"chemie8" }`
  - **neu:** Feld `game` = zugewiesenes Spiel pro Klasse.
- `st:<code>:<name>:<game>` → Spielstand `{ deck, coins, xp, name, updated }`
  - **neu:** Spiel im Schlüssel, damit Stände je Spiel getrennt sind.
- `cfg:teacherpin` → Lehrer-PIN (wie gehabt).

## Worker-Endpunkte
Bestehend (aus chemie8 übernehmen):
- `GET /api/ping`
- `GET|POST /api/progress` – jetzt mit `game`-Parameter; Schlüssel inkl. game.
  Prüft: Klasse existiert + Name in slots (sofern slots) + game = zugewiesenes Spiel.
- `GET /api/teacher/status`, `POST /api/teacher/setup`
- `POST /api/teacher/login`
- `GET|POST|DELETE /api/teacher/classes` – beim Anlegen zusätzlich `game` setzen.
- `GET /api/class?code=` – liefert slots + game + students.

Neu:
- `GET /api/games` – Liste verfügbarer Spiele `[{id,title}]` (für das Dropdown).
  Quelle: feste Liste im Worker, z. B. `[{id:"chemie8",title:"Little Chemie 8"}]`.

## Lehrer-Ablauf
1. Login mit PIN.
2. Klasse anlegen: Code + Bezeichnung + **Anzahl** + **Spiel (Dropdown)**.
   → Login-Namen werden erzeugt, `game` wird gespeichert.
3. Klassenansicht: Login-Liste + Status + zugewiesenes Spiel (änderbar).

## Schüler-Ablauf
1. Portal `index.html` öffnen → Login (Klassencode + Login-Name).
2. Worker/__Portal__ ermittelt `game` der Klasse → Weiterleitung zu
   `/games/<game>/?...` (Login bleibt via localStorage gültig, gleiche Origin).
3. Das Spiel lädt seinen Stand über `/api/progress` mit seinem `game`-Wert.

## Anpassungen im Spiel chemie8 (in /games/chemie8/)
- In `app.js`: bei allen `fetch('api/...')` einen **Spiel-Bezeichner** `chemie8`
  mitgeben (z. B. `&game=chemie8`) und Login-Ident vom Portal übernehmen.
- API-Pfade absolut auf `/api/...` setzen (da das Spiel in einem Unterordner liegt).
- Kein eigener Login mehr im Spiel – der kommt vom Portal (ident in localStorage).

## Migration
1. Dateien von `little-chemie8` nach `games/chemie8/` kopieren (Spiel-Dateien:
   index.html, app.js, style.css, effects.css/js – ohne worker/lehrer/CLOUDFLARE).
2. Worker + lehrer.html + wrangler.toml ins Portal-Root, um `game` erweitern.
3. KV-Namespace kann derselbe bleiben (neuer Schlüssel inkl. game; alte
   chemie8-Stände ggf. einmal migrieren oder neu starten).

## So startest du
1. Repo `Little-schoolapp` ist angelegt.
2. Neue Claude-Code-Session auf **`Little-schoolapp`** starten – **mit Zugriff
   auch auf `little-chemie8`**, damit Claude die Spiel-Dateien nach
   `/games/chemie8/` kopieren und diesen Plan lesen kann.
3. Auftrag geben: „Baue das Portal laut `little-chemie8/PORTAL-PLAN.md`."
