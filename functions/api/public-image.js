export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (!key) return new Response('missing key', { status: 400 });
  const obj = await env.ARTIST_BUCKET.get(key);
  if (!obj) return new Response('not found', { status: 404 });
  const headers = new Headers();
  if (obj.httpMetadata && obj.httpMetadata.contentType) headers.set('Content-Type', obj.httpMetadata.contentType);
  headers.set('Cache-Control', 'public, max-age=604800, immutable');
  return new Response(obj.body, { status: 200, headers });
}
