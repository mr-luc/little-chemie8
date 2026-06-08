// Cloudflare Pages Function: /api/progress
//   GET  ?code=<klassencode>&name=<nickname>  -> { state: {...} | null }
//   POST { code, name, state }                 -> { ok: true }
//
// Spielstände liegen im KV-Namespace, gebunden als `PROGRESS`.
// Es werden bewusst nur Spieldaten gespeichert (entdeckte Begriffe, Münzen, XP) –
// keine echten Accounts, kein Passwort. Datensparsam für den Schuleinsatz.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const norm = (s) => String(s || '').trim().toLowerCase().slice(0, 40);
const valid = (c, n) => norm(c).length >= 1 && norm(n).length >= 1;
const keyOf = (c, n) => `st:${encodeURIComponent(norm(c))}:${encodeURIComponent(norm(n))}`;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
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

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  if (!env.PROGRESS) return json({ error: 'kv-not-bound' }, 500);
  const u = new URL(request.url);
  const code = u.searchParams.get('code');
  const name = u.searchParams.get('name');
  if (!valid(code, name)) return json({ error: 'bad-params' }, 400);
  const raw = await env.PROGRESS.get(keyOf(code, name));
  return json({ state: raw ? JSON.parse(raw) : null });
}

export async function onRequestPost({ request, env }) {
  if (!env.PROGRESS) return json({ error: 'kv-not-bound' }, 500);
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'bad-json' }, 400);
  }
  const { code, name, state } = body || {};
  if (!valid(code, name)) return json({ error: 'bad-params' }, 400);
  const clean = sanitize(state);
  if (!clean) return json({ error: 'bad-state' }, 400);
  await env.PROGRESS.put(
    keyOf(code, name),
    JSON.stringify({ ...clean, name: norm(name), updated: Date.now() })
  );
  return json({ ok: true });
}
