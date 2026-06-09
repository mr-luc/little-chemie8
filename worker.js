// Cloudflare Worker (mit statischen Assets) für Little Chemie 8
// - /api/ping                  Erkennung
// - /api/progress              Schüler-Sync (nur für angelegte Klassencodes)
// - /api/teacher/login         Lehrer-PIN prüfen
// - /api/teacher/classes       Klassencodes verwalten (GET/POST/DELETE)
// - /api/class                 Schülerliste einer Klasse (Lehrer)
// - sonst: statische Dateien (index.html, app.js, lehrer.html …)
//
// KV-Namespace ist als `PROGRESS` gebunden. Lehrer-PIN als Secret
// `TEACHER_PIN` (oder `Teacher`). Es werden nur Spieldaten gespeichert.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,X-Teacher-Pin',
};

const norm = (s) => String(s || '').trim().toLowerCase().slice(0, 40);
const valid = (c, n) => norm(c).length >= 1 && norm(n).length >= 1;
const stKey = (c, n) => `st:${encodeURIComponent(norm(c))}:${encodeURIComponent(norm(n))}`;
const stPrefix = (c) => `st:${encodeURIComponent(norm(c))}:`;
const classKey = (c) => `class:${encodeURIComponent(norm(c))}`;
const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

const teacherPinEnv = (env) => env.TEACHER_PIN || env.Teacher || env.TEACHER || env.teacher;
async function resolvePin(env) {
  const e = teacherPinEnv(env);
  if (e) return e;
  try { return (await env.PROGRESS.get('cfg:teacherpin')) || ''; } catch (e2) { return ''; }
}

function sanitize(s) {
  if (!s || typeof s !== 'object') return null;
  const deck = Array.isArray(s.deck)
    ? s.deck.filter((x) => typeof x === 'string' && x.length < 40).slice(0, 300)
    : [];
  const coins = Number.isFinite(s.coins) ? Math.max(0, Math.min(1e6, s.coins | 0)) : 0;
  const xp = Number.isFinite(s.xp) ? Math.max(0, Math.min(1e9, s.xp | 0)) : 0;
  return { deck, coins, xp };
}

// Pseudonyme Login-Namen erzeugen (eindeutig je Klasse, fortlaufend nummeriert).
const NAMEWORDS = ['Argon', 'Helium', 'Neon', 'Krypton', 'Xenon', 'Eisen', 'Kupfer', 'Zink', 'Gold', 'Silber', 'Natrium', 'Kalium', 'Calcium', 'Magnesium', 'Kohlenstoff', 'Sauerstoff', 'Stickstoff', 'Schwefel', 'Chlor', 'Jod', 'Lithium', 'Nickel', 'Platin', 'Titan', 'Bor', 'Brom', 'Fluor', 'Radon', 'Cobalt', 'Zinn'];
function genSlots(existing, count) {
  const out = [];
  const start = existing.length;
  for (let i = 0; i < count; i++) {
    const idx = start + i;
    const word = NAMEWORDS[idx % NAMEWORDS.length];
    out.push(`${word}-${String(idx + 1).padStart(2, '0')}`);
  }
  return out;
}
// Nur erzeugte Namen zulassen (sofern für die Klasse Slots existieren).
function nameAllowed(clsRaw, name) {
  try {
    const c = JSON.parse(clsRaw);
    if (Array.isArray(c.slots) && c.slots.length) return c.slots.some((s) => norm(s) === norm(name));
    return true;
  } catch (e) { return true; }
}

async function handleApi(request, env, url) {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const p = url.pathname;

  if (p === '/api/ping') return json({ ok: true, kv: !!env.PROGRESS, teacher: !!(await resolvePin(env)) });

  // Ist eine Lehrer-PIN eingerichtet? (für die Setup-/Login-Entscheidung)
  if (p === '/api/teacher/status') {
    return json({ configured: !!(await resolvePin(env)), bySecret: !!teacherPinEnv(env) });
  }
  // Lehrer-PIN erstmalig festlegen (oder ändern mit aktueller PIN). Nicht möglich,
  // wenn die PIN über ein Worker-Secret verwaltet wird.
  if (p === '/api/teacher/setup') {
    if (request.method !== 'POST') return json({ error: 'method-not-allowed' }, 405);
    if (!env.PROGRESS) return json({ error: 'kv-not-bound' }, 500);
    if (teacherPinEnv(env)) return json({ error: 'managed-by-secret' }, 409);
    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'bad-json' }, 400); }
    const newPin = String((body && body.pin) || '').trim();
    if (newPin.length < 4) return json({ error: 'pin-too-short' }, 400);
    const cur = await env.PROGRESS.get('cfg:teacherpin');
    if (cur && String((body && body.current) || '') !== cur) return json({ error: 'unauthorized' }, 401);
    await env.PROGRESS.put('cfg:teacherpin', newPin);
    return json({ ok: true });
  }

  // ---- Schüler-Sync: nur für angelegte Klassencodes ----
  if (p === '/api/progress') {
    if (!env.PROGRESS) return json({ error: 'kv-not-bound' }, 500);
    if (request.method === 'GET') {
      const code = url.searchParams.get('code');
      const name = url.searchParams.get('name');
      if (!valid(code, name)) return json({ error: 'bad-params' }, 400);
      const clsRaw = await env.PROGRESS.get(classKey(code));
      if (!clsRaw) return json({ error: 'unknown-class' }, 403);
      if (!nameAllowed(clsRaw, name)) return json({ error: 'unknown-name' }, 403);
      const raw = await env.PROGRESS.get(stKey(code, name));
      return json({ state: raw ? JSON.parse(raw) : null });
    }
    if (request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: 'bad-json' }, 400); }
      const { code, name, state } = body || {};
      if (!valid(code, name)) return json({ error: 'bad-params' }, 400);
      const clsRaw = await env.PROGRESS.get(classKey(code));
      if (!clsRaw) return json({ error: 'unknown-class' }, 403);
      if (!nameAllowed(clsRaw, name)) return json({ error: 'unknown-name' }, 403);
      const clean = sanitize(state);
      if (!clean) return json({ error: 'bad-state' }, 400);
      await env.PROGRESS.put(stKey(code, name), JSON.stringify({ ...clean, name: norm(name), updated: Date.now() }));
      return json({ ok: true });
    }
    return json({ error: 'method-not-allowed' }, 405);
  }

  // ---- Ab hier: Lehrer-Bereich (PIN nötig) ----
  if (p === '/api/teacher/login' || p === '/api/teacher/classes' || p === '/api/class') {
    if (!env.PROGRESS) return json({ error: 'kv-not-bound' }, 500);
    const tp = await resolvePin(env);
    if (!tp) return json({ error: 'teacher-pin-not-configured' }, 503);
    const pin = request.headers.get('X-Teacher-Pin') || url.searchParams.get('pin') || '';
    if (pin !== tp) return json({ error: 'unauthorized' }, 401);

    if (p === '/api/teacher/login') return json({ ok: true });

    if (p === '/api/teacher/classes') {
      if (request.method === 'GET') {
        const list = await env.PROGRESS.list({ prefix: 'class:' });
        const classes = [];
        for (const k of list.keys) {
          const raw = await env.PROGRESS.get(k.name);
          if (!raw) continue;
          const c = JSON.parse(raw);
          const sl = await env.PROGRESS.list({ prefix: stPrefix(c.code) });
          classes.push({ code: c.code, label: c.label || '', created: c.created || 0, slots: Array.isArray(c.slots) ? c.slots.length : 0, students: sl.keys.length });
        }
        classes.sort((a, b) => (a.label || a.code).localeCompare(b.label || b.code));
        return json({ classes });
      }
      if (request.method === 'POST') {
        let body;
        try { body = await request.json(); } catch (e) { return json({ error: 'bad-json' }, 400); }
        const code = norm(body && body.code);
        if (!code) return json({ error: 'bad-code' }, 400);
        const count = Math.max(0, Math.min(200, parseInt((body && body.count), 10) || 0));
        const raw = await env.PROGRESS.get(classKey(code));
        const cur = raw ? JSON.parse(raw) : null;
        const created = cur ? (cur.created || Date.now()) : Date.now();
        const label = String((body && body.label) || (cur && cur.label) || '').trim().slice(0, 60);
        let slots = (cur && Array.isArray(cur.slots)) ? cur.slots.slice() : [];
        if (slots.length + count > 500) return json({ error: 'too-many' }, 400);
        if (count > 0) slots = slots.concat(genSlots(slots, count));
        const cls = { code, label, created, slots };
        await env.PROGRESS.put(classKey(code), JSON.stringify(cls));
        return json({ ok: true, class: cls });
      }
      if (request.method === 'DELETE') {
        let body;
        try { body = await request.json(); } catch (e) { return json({ error: 'bad-json' }, 400); }
        const code = norm(body && body.code);
        if (!code) return json({ error: 'bad-code' }, 400);
        await env.PROGRESS.delete(classKey(code));
        return json({ ok: true });
      }
      return json({ error: 'method-not-allowed' }, 405);
    }

    if (p === '/api/class') {
      const code = norm(url.searchParams.get('code'));
      if (!code) return json({ error: 'bad-params' }, 400);
      const clsRaw = await env.PROGRESS.get(classKey(code));
      const slots = clsRaw && Array.isArray(JSON.parse(clsRaw).slots) ? JSON.parse(clsRaw).slots : [];
      const prefix = stPrefix(code);
      const list = await env.PROGRESS.list({ prefix });
      const students = [];
      for (const k of list.keys) {
        const raw = await env.PROGRESS.get(k.name);
        if (!raw) continue;
        const s = JSON.parse(raw);
        students.push({
          name: s.name || decodeURIComponent(k.name.slice(prefix.length)),
          entdeckt: Array.isArray(s.deck) ? s.deck.length : 0,
          muenzen: s.coins || 0,
          xp: s.xp || 0,
          updated: s.updated || 0,
        });
      }
      students.sort((a, b) => b.xp - a.xp);
      return json({ code, slots, anzahl: students.length, students });
    }
  }

  return json({ error: 'not-found' }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return handleApi(request, env, url);
    return env.ASSETS.fetch(request);
  },
};
