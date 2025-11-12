import { requireAuth } from '../../util/auth.js';
function makeId(prefix='id') {
  const arr = crypto.getRandomValues(new Uint8Array(12));
  return prefix + Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
}
export async function onRequestPut(context) {
  const { request, env, params } = context;
  const user = await requireAuth(request, env);
  if (!user) return new Response('unauthorized', { status: 401 });
  const id = params.id;
  const body = await request.json().catch(() => null);
  if (!body) return new Response('bad body', { status: 400 });
  const now = Date.now();
  const fields = [];
  const values = [];
  if (body.title) { fields.push('title = ?'); values.push(body.title); }
  if (body.description !== undefined) { fields.push('description = ?'); values.push(body.description); }
  if (body.price_cents !== undefined) { fields.push('price_cents = ?'); values.push(body.price_cents); }
  if (body.status) { fields.push('status = ?'); values.push(body.status); }
  if (fields.length === 0) return new Response('nothing to update', { status: 400 });
  fields.push('updated_at = ?'); values.push(now);
  values.push(id);
  const sql = `UPDATE artworks SET ${fields.join(', ')} WHERE id = ?`;
  await env.D1.prepare(sql).bind(...values).run();
  await env.D1.prepare(`INSERT INTO audit_log (id,user_id,action,target_table,target_id,payload,ts) VALUES (?,?,?,?,?,?,?)`)
    .bind(makeId('al_'), user.id, 'update', 'artworks', id, JSON.stringify(body), now).run();
  return new Response(JSON.stringify({ ok:true }));
}
export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const user = await requireAuth(request, env);
  if (!user) return new Response('unauthorized', { status: 401 });
  const id = params.id;
  const res = await env.D1.prepare('SELECT image_path FROM artworks WHERE id = ?').bind(id).all();
  if (!res || !res.results || res.results.length === 0) return new Response('not found', { status: 404 });
  await env.D1.prepare('DELETE FROM artworks WHERE id = ?').bind(id).run();
  await env.D1.prepare('DELETE FROM artwork_images WHERE artwork_id = ?').bind(id).run();
  const prefix = `artworks/${id}/`;
  for await (const obj of env.ARTIST_BUCKET.list({ prefix })) {
    await env.ARTIST_BUCKET.delete(obj.key);
  }
  const now = Date.now();
  await env.D1.prepare(`INSERT INTO audit_log (id,user_id,action,target_table,target_id,payload,ts) VALUES (?,?,?,?,?,?,?)`)
    .bind(makeId('al_'), user.id, 'delete', 'artworks', id, JSON.stringify({ id }), now).run();
  return new Response(JSON.stringify({ ok:true }));
}
