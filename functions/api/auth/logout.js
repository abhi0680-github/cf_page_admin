export async function onRequestPost(context) {
  const cookie = `session=; HttpOnly; Path=/; Secure; SameSite=Lax; Max-Age=0`;
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Set-Cookie': cookie, 'Content-Type': 'application/json' } });
}
