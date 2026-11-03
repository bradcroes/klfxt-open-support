// Only runs against the isolated localhost application. No production URL flag exists.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const origin = 'http://localhost:8787';
const config = await readFile(new URL('../.dev.vars', import.meta.url), 'utf8');
const accessKey = config.match(/^ADMIN_ACCESS_KEY=(.+)$/m)?.[1]?.trim();
assert.match(accessKey || '', /^[A-Za-z0-9_-]{43}$/);
let cookie = '';
async function api(path, method = 'GET', body, token) {
  const headers = { Origin: origin, 'cf-connecting-ip': '192.0.2.20' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;
  if (token) headers.Authorization = 'Bearer ' + token;
  const r = await fetch(origin + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const next = r.headers.get('set-cookie');
  if (next) cookie = next.split(';')[0];
  const data = await r.json();
  return { r, data };
}
const results = [];
let r = await api('/api/admin/tickets');
assert.equal(r.r.status, 401);
results.push('anonymous owner access denied');
r = await api('/api/tickets', 'POST', {
  name: 'Example Customer',
  email: 'customer@example.com',
  subject: 'Example · appointment request',
  message: 'This is a synthetic local test. Please help schedule an appointment.',
  locale: 'en',
  website: '',
});
assert.equal(r.r.status, 201);
const ticket = r.data;
assert.equal(ticket.notification, 'disabled');
results.push('ticket stored, notifications disabled');
r = await api('/api/track', 'GET', undefined, ticket.trackingToken);
assert.equal(r.r.status, 200);
assert.equal(r.data.ticket.reference, ticket.reference);
assert.equal(JSON.stringify(r.data).includes('customer@example.com'), false);
results.push('customer capability works without exposing email');
r = await api('/api/admin/login', 'POST', { accessKey });
assert.equal(r.r.status, 200);
assert.match(r.r.headers.get('set-cookie'), /HttpOnly/);
assert.match(r.r.headers.get('set-cookie'), /SameSite=Strict/);
results.push('owner key exchanged for HttpOnly session');
r = await api('/api/admin/tickets?q=' + encodeURIComponent(ticket.reference));
assert.equal(r.data.total, 1);
const id = r.data.tickets[0].id;
await api('/api/admin/tickets/' + id + '/messages', 'POST', {
  message: 'Synthetic internal note: never show in the customer portal.',
  internal: true,
});
await api('/api/admin/tickets/' + id + '/messages', 'POST', {
  message: 'We have received your appointment request.',
  internal: false,
});
r = await api('/api/admin/tickets/' + id);
const version = r.data.ticket.version;
assert.equal(r.data.messages.length, 3);
r = await api('/api/admin/tickets/' + id, 'PATCH', {
  version,
  status: 'in_progress',
  priority: 'high',
  assignee: 'Example owner',
});
assert.equal(r.r.status, 200);
r = await api('/api/admin/tickets/' + id, 'PATCH', { version, status: 'resolved' });
assert.equal(r.r.status, 409);
results.push('notes, replies, status and stale-version protection work');
r = await api('/api/track', 'GET', undefined, ticket.trackingToken);
assert.equal(r.data.messages.length, 2);
assert.equal(r.data.ticket.status, 'in_progress');
assert.equal(JSON.stringify(r.data).includes('Synthetic internal note'), false);
results.push('internal note excluded from customer view');
r = await api('/api/admin/customers');
assert.ok(r.data.customers.some((c) => c.email === 'customer@example.com'));
results.push('customer directory populated');
r = await api('/api/admin/logout', 'POST', {});
assert.equal(r.r.status, 200);
r = await api('/api/admin/tickets');
assert.equal(r.r.status, 401);
results.push('logout revokes session');
for (const path of [
  '/',
  '/admin',
  '/track',
  '/about',
  '/docs/installation.html',
  '/docs/CONTRIBUTING.html',
]) {
  const res = await fetch(origin + path);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-frame-options'), 'DENY');
}
results.push('frontend and rendered docs served with security headers');
await mkdir(new URL('../artifacts/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../artifacts/local-verification.json', import.meta.url),
  JSON.stringify(
    { checkedAt: new Date().toISOString(), origin, results, reference: ticket.reference },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({ checks: results.length, passed: true, reference: ticket.reference }, null, 2),
);
