// Cloudflare Pages Function: GET /api/ping
// Dient der Front-End-Erkennung, ob das Cloud-Backend verfügbar ist.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,OPTIONS' };

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export function onRequestGet({ env }) {
  return new Response(JSON.stringify({ ok: true, kv: !!env.PROGRESS }), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}
