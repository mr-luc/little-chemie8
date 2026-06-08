// Cloudflare Pages Function: GET /api/class?code=<klassencode>
// Übersicht für die Lehrkraft: alle Spielstände einer Klasse (nach XP sortiert).
// Bewusst ohne Auth gehalten (wie das Spiel selbst) – wer den Klassencode kennt,
// sieht die Übersicht. Für mehr Schutz später einen Lehrer-PIN ergänzen.

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS' };
const norm = (s) => String(s || '').trim().toLowerCase().slice(0, 40);

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  if (!env.PROGRESS) return json({ error: 'kv-not-bound' }, 500);
  const u = new URL(request.url);
  const code = norm(u.searchParams.get('code'));
  if (!code) return json({ error: 'bad-params' }, 400);
  const prefix = `st:${encodeURIComponent(code)}:`;
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
  return json({ code, anzahl: students.length, students });
}
