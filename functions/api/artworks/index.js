import { requireAuth } from '../../util/auth.js';
function makeId(prefix='id') {
  const arr = crypto.getRandomValues(new Uint8Array(12));
  return prefix + Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
}
function slugify(s) { return s.toString().toLowerCase().trim().replace(/\s+/g,'-').replace(/[^\w\-]+/g,'').replace(/\-\-+/g,'-'); }
export async function onRequestGet(context) {
  const { env } = context;
  const res = await env.D1.prepare('SELECT * FROM artworks ORDER BY created_at DESC LIMIT 500').all();
  const items = (res && res.results) ? res.results : [];
  return new Response(JSON.stringify({ items }), { headers: { 'Content-Type': 'application/json' }});
}
export async function onRequestPost(context) {
  const { request, env } = context;
  const user = await requireAuth(request, env);
  if (!user) return new Response('unauthorized', { status: 401 });
  const form = await request.formData();
  const title = form.get('title') || '';
  const description = form.get('description') || '';
  const price_cents = parseInt(form.get('price_cents') || '0', 10);
  const status = form.get('status') || 'available';
  const file = form.get('image');
  const thumb = form.get('thumbnail');
  if (!title) return new Response('title required', { status: 400 });
  const now = Date.now();
  const artworkId = makeId('art_');
  const slug = slugify(title) + '-' + artworkId.slice(-6);
  let imagePath = null;
  let thumbPath = null;
  if (file && file.arrayBuffer) {
    const buf = await file.arrayBuffer();
    const ext = (file.name && file.name.split('.').pop()) || 'jpg';
    const imgId = makeId('img_');
    imagePath = `artworks/${artworkId}/original/${imgId}.${ext}`;
    await env.ARTIST_BUCKET.put(imagePath, buf, { httpMetadata: { contentType: file.type || 'image/jpeg' }});
    await env.D1.prepare(`INSERT INTO artwork_images (id, artwork_id, r2_key, role, size_bytes, created_at) VALUES (?,?,?,?,?,?)`)
      .bind(makeId('ai_'), artworkId, imagePath, 'primary', buf.byteLength || 0, now).run();
  }
  if (thumb && thumb.arrayBuffer) {
    const b = await thumb.arrayBuffer();
    const ext2 = (thumb.name && thumb.name.split('.').pop()) || 'webp';
    const tId = makeId('thumb_');
    thumbPath = `artworks/${artworkId}/thumb/${tId}.${ext2}`;
    await env.ARTIST_BUCKET.put(thumbPath, b, { httpMetadata: { contentType: thumb.type || 'image/webp' }});
  }
  const insert = `
    INSERT INTO artworks (id, title, slug, description, price_cents, status, thumbnail_path, image_path, metadata, created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const metadata = JSON.stringify({});
  await env.D1.prepare(insert).bind(artworkId, title, slug, description, price_cents, status, thumbPath, imagePath, metadata, user.id, now, now).run();
  await env.D1.prepare(`INSERT INTO audit_log (id,user_id,action,target_table,target_id,payload,ts) VALUES (?,?,?,?,?,?,?)`)
    .bind(makeId('al_'), user.id, 'create', 'artworks', artworkId, JSON.stringify({ title }), now).run();
  return new Response(JSON.stringify({ id: artworkId }), { status: 201, headers: { 'Content-Type': 'application/json' }});
}
