import { verifyPassword, createJWT } from '../../util/auth.js';
export async function onRequestPost(context) {
  const { request, env } = context;
  const form = await request.formData();
  const email = (form.get('email') || '').toLowerCase();
  const password = form.get('password') || '';
  if (!email || !password) return new Response('Missing', { status: 400 });
  const q = `SELECT id, password_hash, password_salt FROM users WHERE email = ?`;
  const res = await env.D1.prepare(q).bind(email).all();
  if (!res || !res.results || res.results.length === 0) return new Response('invalid', { status: 401 });
  const u = res.results[0];
  const ok = await verifyPassword(u.password_salt, u.password_hash, password);
  if (!ok) return new Response('invalid', { status: 401 });
  const token = await createJWT({ sub: u.id }, env, 60 * 60 * 8);
  const cookie = `session=${encodeURIComponent(token)}; HttpOnly; Path=/; Secure; SameSite=Lax`;
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' } });
}
