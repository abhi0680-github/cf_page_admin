/* Helper for Cloudflare Workers/Functions environment */
export async function hashPassword(password) {
  const saltArr = crypto.getRandomValues(new Uint8Array(16));
  const salt = arrayBufferToBase64(saltArr.buffer);
  const hash = await deriveKeyBase64(password, salt);
  return { salt, hash };
}
export async function verifyPassword(salt, hashBase64, password) {
  const derived = await deriveKeyBase64(password, salt);
  return constantTimeEqual(derived, hashBase64);
}
async function deriveKeyBase64(password, saltBase64) {
  const salt = base64ToArrayBuffer(saltBase64);
  const enc = new TextEncoder();
  const pwKey = await crypto.subtle.importKey('raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const derivedBits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, pwKey, 256);
  return arrayBufferToBase64(derivedBits);
}
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let res = 0;
  for (let i = 0; i < a.length; i++) res |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return res === 0;
}
function arrayBufferToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
function base64UrlEncode(buf) {
  const b64 = arrayBufferToBase64(buf);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function base64UrlDecodeToArrayBuffer(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return base64ToArrayBuffer(str);
}
async function importHmacKey(secret) {
  const enc = new TextEncoder();
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign','verify']);
}
export async function createJWT(payloadObj, env, expSeconds = 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = Object.assign({ iat: now, exp: now + expSeconds }, payloadObj);
  const enc = new TextEncoder();
  const headerB = enc.encode(JSON.stringify(header));
  const payloadB = enc.encode(JSON.stringify(payload));
  const tokenPart = `${base64UrlEncode(headerB)}.${base64UrlEncode(payloadB)}`;
  const key = await importHmacKey(env.JWT_SECRET);
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(tokenPart));
  const sig = base64UrlEncode(sigBuf);
  return `${tokenPart}.${sig}`;
}
export async function verifyJWT(token, env) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h,p,s] = parts;
    const tokenPart = `${h}.${p}`;
    const key = await importHmacKey(env.JWT_SECRET);
    const valid = await crypto.subtle.verify('HMAC', key, base64UrlDecodeToArrayBuffer(s), new TextEncoder().encode(tokenPart));
    if (!valid) return null;
    const payloadJson = new TextDecoder().decode(base64UrlDecodeToArrayBuffer(p));
    const payload = JSON.parse(payloadJson);
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return null;
    return payload;
  } catch (e) {
    return null;
  }
}
export function getSessionTokenFromRequest(request) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
export async function requireAuth(request, env) {
  const token = getSessionTokenFromRequest(request);
  if (!token) return null;
  const payload = await verifyJWT(token, env);
  if (!payload || !payload.sub) return null;
  const q = `SELECT id, email, display_name, role FROM users WHERE id = ?`;
  const r = await env.D1.prepare(q).bind(payload.sub).all();
  if (!r || !r.results || r.results.length === 0) return null;
  return r.results[0];
}
