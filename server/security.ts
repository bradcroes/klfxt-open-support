import type { Env } from './types';
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}
export const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
export const nowIso = () => new Date().toISOString();
export function randomToken() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}
export async function hash(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
export async function equalSecret(expected: string, actual: string) {
  if (!tokenPattern.test(actual)) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode('KLFXT comparison context v1'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(expected));
  return crypto.subtle.verify('HMAC', key, signature, new TextEncoder().encode(actual));
}
export function isLocal(request: Request, env: Env) {
  return (
    env.DEV_MODE === 'true' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname)
  );
}
export function configured(request: Request, env: Env) {
  let origin: URL;
  try {
    origin = new URL(env.APP_ORIGIN);
  } catch {
    throw new ApiError(503, 'setup_required');
  }
  if (
    origin.origin !== env.APP_ORIGIN ||
    (!isLocal(request, env) && origin.protocol !== 'https:') ||
    !tokenPattern.test(env.ADMIN_ACCESS_KEY ?? '') ||
    !tokenPattern.test(env.RATE_LIMIT_SECRET ?? '')
  )
    throw new ApiError(503, 'setup_required');
}
export async function jsonInput(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    throw new ApiError(415, 'json_required');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'invalid_input');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 16384) {
        await reader.cancel();
        throw new ApiError(413, 'body_too_large');
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, 'invalid_input');
  }
}
export async function rateLimit(
  request: Request,
  env: Env,
  category: string,
  limit: number,
  seconds = 3600,
) {
  const ip = request.headers.get('cf-connecting-ip') || (isLocal(request, env) ? 'loopback' : null);
  if (!ip) throw new ApiError(503, 'request_unavailable');
  const time = Math.floor(Date.now() / 1000);
  const slot = Math.floor(time / seconds);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.RATE_LIMIT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${category}:${ip}:${slot}`),
  );
  const bucket = [...new Uint8Array(mac)].map((x) => x.toString(16).padStart(2, '0')).join('');
  const row = await env.DB.prepare(
    'INSERT INTO rate_limits(bucket,count,expires_at) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 WHERE count < ? RETURNING count',
  )
    .bind(bucket, (slot + 1) * seconds, limit)
    .first();
  if (!row) throw new ApiError(429, 'rate_limited');
}
export function cookieName(request: Request, env: Env) {
  return isLocal(request, env) ? 'klfxt_session' : '__Host-klfxt_session';
}
export function cookieValue(request: Request, env: Env) {
  const name = cookieName(request, env);
  const raw = request.headers
    .get('cookie')
    ?.split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(name + '='))
    ?.slice(name.length + 1);
  return raw && tokenPattern.test(raw) ? raw : null;
}
export function sessionCookie(request: Request, env: Env, value: string, age = 28800) {
  return `${cookieName(request, env)}=${value}; HttpOnly; Path=/; SameSite=Strict; Max-Age=${age}${isLocal(request, env) ? '' : '; Secure'}`;
}
export function safeLink(value: string | undefined, kind: 'booking' | 'payment') {
  if (!value) return '';
  try {
    const u = new URL(value);
    const hosts = kind === 'booking' ? ['calendly.com'] : ['buy.stripe.com', 'checkout.stripe.com'];
    if (
      value.length > 2048 ||
      u.protocol !== 'https:' ||
      u.username ||
      u.password ||
      u.port ||
      !hosts.includes(u.hostname) ||
      u.pathname === '/'
    )
      throw new Error();
    return u.href;
  } catch {
    throw new ApiError(400, 'invalid_link');
  }
}
export function configuredLink(value: string | undefined, kind: 'booking' | 'payment') {
  try {
    return safeLink(value, kind);
  } catch {
    return '';
  }
}
