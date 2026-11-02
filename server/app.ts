import { Hono } from 'hono';
import { ZodError, z } from 'zod';
import type { AppEnv, Env, Ticket } from './types';
import {
  ApiError,
  configured,
  configuredLink,
  cookieValue,
  equalSecret,
  hash,
  jsonInput,
  nowIso,
  randomToken,
  rateLimit,
  safeLink,
  sessionCookie,
  tokenPattern,
} from './security';
import { ticketSchema, messageSchema, updateSchema } from './schemas';
import {
  deliverNotifications,
  purge,
  retentionDays,
  resetFailedNotifications,
} from './maintenance';

export const app = new Hono<AppEnv>();
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  );
  if (c.req.path.startsWith('/api/') || c.res.headers.get('content-type')?.includes('text/html'))
    c.header('Cache-Control', 'no-store');
  if (c.req.url.startsWith('https:')) c.header('Strict-Transport-Security', 'max-age=31536000');
});
app.use('/api/*', async (c, next) => {
  configured(c.req.raw, c.env);
  if (!['GET', 'HEAD'].includes(c.req.method) && c.req.header('Origin') !== c.env.APP_ORIGIN)
    throw new ApiError(403, 'origin_rejected');
  await next();
});
app.onError((error, c) => {
  if (error instanceof ApiError) return c.json({ error: error.code }, error.status as any);
  if (error instanceof ZodError) return c.json({ error: 'invalid_input' }, 400);
  console.error('Open Support request failed', { kind: error.name });
  return c.json({ error: 'service_unavailable' }, 503);
});
app.get('/api/config', async (c) =>
  c.json({
    businessName: (c.env.BUSINESS_NAME || 'Open Support').slice(0, 80),
    language: c.env.DEFAULT_LANGUAGE === 'en' ? 'en' : 'nl',
    supportEmail: z.email().safeParse(c.env.SUPPORT_EMAIL).success ? c.env.SUPPORT_EMAIL : '',
    bookingUrl: configuredLink(c.env.BOOKING_URL, 'booking'),
    paymentUrl: configuredLink(c.env.PAYMENT_URL, 'payment'),
    retentionDays: await retentionDays(c.env),
  }),
);
app.post('/api/tickets', async (c) => {
  await rateLimit(c.req.raw, c.env, 'new-ticket', 5);
  const data = ticketSchema.parse(await jsonInput(c.req.raw));
  if (data.website) throw new ApiError(400, 'invalid_input');
  const id = crypto.randomUUID(),
    reference = 'OS-' + crypto.randomUUID().replaceAll('-', '').slice(0, 10).toUpperCase(),
    trackingToken = randomToken(),
    time = nowIso();
  const outboxId = crypto.randomUUID();
  const notify =
    c.env.MAIL_MODE === 'resend' &&
    !!c.env.RESEND_API_KEY &&
    !!c.env.MAIL_FROM &&
    !!c.env.NOTIFY_EMAIL;
  const statements = [
    c.env.DB.prepare(
      'INSERT INTO tickets(id,reference,token_hash,name,email,subject,created_at,updated_at,last_change_id,booking_url,payment_url) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
    ).bind(
      id,
      reference,
      await hash(trackingToken),
      data.name,
      data.email,
      data.subject,
      time,
      time,
      id,
      configuredLink(c.env.BOOKING_URL, 'booking'),
      configuredLink(c.env.PAYMENT_URL, 'payment'),
    ),
    c.env.DB.prepare(
      "INSERT INTO messages(id,ticket_id,author,visibility,body,created_at) VALUES (?,?,'customer','public',?,?)",
    ).bind(crypto.randomUUID(), id, data.message, time),
    c.env.DB.prepare(
      "INSERT INTO audit_log(id,ticket_id,action,created_at) VALUES (?,?,'ticket.created',?)",
    ).bind(crypto.randomUUID(), id, time),
  ];
  if (notify)
    statements.push(
      c.env.DB.prepare('INSERT INTO outbox(id,ticket_id,created_at) VALUES (?,?,?)').bind(
        outboxId,
        id,
        time,
      ),
    );
  await c.env.DB.batch(statements);
  if (notify) c.executionCtx.waitUntil(deliverNotifications(c.env));
  return c.json({ reference, trackingToken, notification: notify ? 'queued' : 'disabled' }, 201);
});
async function customer(request: Request, env: Env) {
  const token = request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  if (!token) throw new ApiError(404, 'ticket_not_found');
  const t = await env.DB.prepare('SELECT * FROM tickets WHERE token_hash=?')
    .bind(await hash(token))
    .first<Ticket>();
  if (!t) throw new ApiError(404, 'ticket_not_found');
  return t;
}
app.get('/api/track', async (c) => {
  await rateLimit(c.req.raw, c.env, 'track', 60, 60);
  const t = await customer(c.req.raw, c.env);
  const messages = await c.env.DB.prepare(
    "SELECT id,body,author,created_at FROM messages WHERE ticket_id=? AND visibility='public' ORDER BY created_at,id",
  )
    .bind(t.id)
    .all();
  return c.json({
    ticket: {
      reference: t.reference,
      subject: t.subject,
      status: t.status,
      created_at: t.created_at,
      updated_at: t.updated_at,
      booking_url: t.booking_url,
      payment_url: t.payment_url,
    },
    messages: messages.results,
  });
});
async function addMessage(
  env: Env,
  t: Ticket,
  body: string,
  author: 'customer' | 'owner',
  internal = false,
) {
  const time = nowIso();
  await env.DB.batch([
    env.DB.prepare(
      'INSERT INTO messages(id,ticket_id,author,visibility,body,created_at) VALUES (?,?,?,?,?,?)',
    ).bind(crypto.randomUUID(), t.id, author, internal ? 'internal' : 'public', body, time),
    env.DB.prepare(
      "UPDATE tickets SET updated_at=?,version=version+1,last_change_id=?,status=CASE WHEN ?='customer' AND status='resolved' THEN 'open' ELSE status END,resolved_at=CASE WHEN ?='customer' THEN NULL ELSE resolved_at END WHERE id=?",
    ).bind(time, crypto.randomUUID(), author, author, t.id),
    env.DB.prepare('INSERT INTO audit_log(id,ticket_id,action,created_at) VALUES (?,?,?,?)').bind(
      crypto.randomUUID(),
      t.id,
      internal ? 'note.created' : 'message.created',
      time,
    ),
  ]);
}
app.post('/api/track/messages', async (c) => {
  await rateLimit(c.req.raw, c.env, 'customer-message', 20);
  const t = await customer(c.req.raw, c.env);
  const data = z
    .object({ message: z.string().trim().min(1).max(4000) })
    .strict()
    .parse(await jsonInput(c.req.raw));
  await addMessage(c.env, t, data.message, 'customer');
  return c.json({ ok: true }, 201);
});
app.post('/api/admin/login', async (c) => {
  await rateLimit(c.req.raw, c.env, 'login', 5);
  const data = z
    .object({ accessKey: z.string().max(100) })
    .strict()
    .parse(await jsonInput(c.req.raw));
  if (!(await equalSecret(c.env.ADMIN_ACCESS_KEY, data.accessKey)))
    throw new ApiError(401, 'login_failed');
  const token = randomToken();
  await c.env.DB.prepare('INSERT INTO sessions(token_hash,key_hash,expires_at) VALUES (?,?,?)')
    .bind(
      await hash(token),
      await hash(c.env.ADMIN_ACCESS_KEY),
      Math.floor(Date.now() / 1000) + 28800,
    )
    .run();
  c.header('Set-Cookie', sessionCookie(c.req.raw, c.env, token));
  return c.json({ ok: true });
});
app.use('/api/admin/*', async (c, next) => {
  const token = cookieValue(c.req.raw, c.env);
  if (!token) throw new ApiError(401, 'authentication_required');
  const tokenHash = await hash(token);
  const session = await c.env.DB.prepare(
    'SELECT token_hash FROM sessions WHERE token_hash=? AND key_hash=? AND expires_at>?',
  )
    .bind(tokenHash, await hash(c.env.ADMIN_ACCESS_KEY), Math.floor(Date.now() / 1000))
    .first();
  if (!session) throw new ApiError(401, 'authentication_required');
  c.set('sessionHash', tokenHash);
  await next();
});
app.get('/api/admin/session', (c) => c.json({ authenticated: true }));
app.post('/api/admin/logout', async (c) => {
  await c.env.DB.prepare('DELETE FROM sessions WHERE token_hash=?')
    .bind(c.get('sessionHash'))
    .run();
  c.header('Set-Cookie', sessionCookie(c.req.raw, c.env, '', 0));
  return c.json({ ok: true });
});
function publicTicket(t: Ticket) {
  const { token_hash, last_change_id, ...rest } = t;
  return rest;
}
app.get('/api/admin/tickets', async (c) => {
  const page = Math.min(Math.max(parseInt(c.req.query('page') || '1') || 1, 1), 400);
  const status = c.req.query('status') || '';
  const q = (c.req.query('q') || '').slice(0, 100);
  const pattern = '%' + q.replace(/[\\%_]/g, '\\$&') + '%';
  const clause =
    "WHERE (?='' OR status=?) AND (subject LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' OR reference LIKE ? ESCAPE '\\')";
  const params = [status, status, pattern, pattern, pattern, pattern];
  const rows = await c.env.DB.prepare(
    'SELECT * FROM tickets ' + clause + ' ORDER BY updated_at DESC,id LIMIT 25 OFFSET ?',
  )
    .bind(...params, (page - 1) * 25)
    .all<Ticket>();
  const count = await c.env.DB.prepare('SELECT count(*) AS count FROM tickets ' + clause)
    .bind(...params)
    .first<{ count: number }>();
  const groups = await c.env.DB.prepare(
    'SELECT status,count(*) AS count FROM tickets GROUP BY status',
  ).all<{ status: string; count: number }>();
  const stats: Record<string, number> = {
    open: 0,
    in_progress: 0,
    waiting: 0,
    resolved: 0,
    total: 0,
  };
  for (const r of groups.results) {
    stats[r.status] = r.count;
    stats.total += r.count;
  }
  const customers = await c.env.DB.prepare(
    'SELECT count(DISTINCT email) AS count FROM tickets',
  ).first<{ count: number }>();
  return c.json({
    tickets: rows.results.map(publicTicket),
    total: count?.count ?? 0,
    page,
    pageSize: 25,
    stats,
    customers: customers?.count ?? 0,
  });
});
async function getTicket(env: Env, id: string) {
  const t = await env.DB.prepare('SELECT * FROM tickets WHERE id=?').bind(id).first<Ticket>();
  if (!t) throw new ApiError(404, 'ticket_not_found');
  return t;
}
app.get('/api/admin/tickets/:id', async (c) => {
  const t = await getTicket(c.env, c.req.param('id'));
  const messages = await c.env.DB.prepare(
    'SELECT id,body,author,visibility,created_at FROM messages WHERE ticket_id=? ORDER BY created_at,id',
  )
    .bind(t.id)
    .all();
  const notifications = await c.env.DB.prepare(
    'SELECT status,attempts,created_at FROM outbox WHERE ticket_id=?',
  )
    .bind(t.id)
    .all();
  return c.json({
    ticket: publicTicket(t),
    messages: messages.results,
    notifications: notifications.results,
  });
});
app.patch('/api/admin/tickets/:id', async (c) => {
  const t = await getTicket(c.env, c.req.param('id'));
  const data = updateSchema.parse(await jsonInput(c.req.raw));
  if (data.version !== t.version) throw new ApiError(409, 'edit_conflict');
  const change = crypto.randomUUID(),
    time = nowIso(),
    status = data.status ?? t.status;
  const r = await c.env.DB.batch([
    c.env.DB.prepare(
      'UPDATE tickets SET status=?,priority=?,assignee=?,booking_url=?,payment_url=?,updated_at=?,resolved_at=?,version=version+1,last_change_id=? WHERE id=? AND version=?',
    ).bind(
      status,
      data.priority ?? t.priority,
      data.assignee ?? t.assignee,
      data.bookingUrl === undefined ? t.booking_url : safeLink(data.bookingUrl, 'booking'),
      data.paymentUrl === undefined ? t.payment_url : safeLink(data.paymentUrl, 'payment'),
      time,
      status === 'resolved' ? (t.resolved_at ?? time) : null,
      change,
      t.id,
      data.version,
    ),
    c.env.DB.prepare(
      "INSERT INTO audit_log(id,ticket_id,action,created_at) SELECT ?,id,'ticket.updated',? FROM tickets WHERE id=? AND last_change_id=?",
    ).bind(crypto.randomUUID(), time, t.id, change),
  ]);
  if (!r[0].meta.changes) throw new ApiError(409, 'edit_conflict');
  return c.json({ ok: true });
});
app.post('/api/admin/tickets/:id/messages', async (c) => {
  const t = await getTicket(c.env, c.req.param('id'));
  const data = messageSchema.parse(await jsonInput(c.req.raw));
  await addMessage(c.env, t, data.message, 'owner', data.internal ?? false);
  return c.json({ ok: true }, 201);
});
app.get('/api/admin/customers', async (c) => {
  const q = '%' + (c.req.query('q') || '').slice(0, 100).replace(/[\\%_]/g, '\\$&') + '%';
  const rows = await c.env.DB.prepare(
    "SELECT name,email,count(*) AS tickets,max(updated_at) AS last_contact FROM tickets WHERE name LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\' GROUP BY email ORDER BY last_contact DESC LIMIT 50",
  )
    .bind(q, q)
    .all();
  return c.json({ customers: rows.results });
});
app.get('/api/admin/settings', async (c) => c.json({ retentionDays: await retentionDays(c.env) }));
app.put('/api/admin/settings', async (c) => {
  const data = z
    .object({ retentionDays: z.number().int().min(30).max(730) })
    .strict()
    .parse(await jsonInput(c.req.raw));
  await c.env.DB.prepare(
    "INSERT INTO settings(key,value) VALUES('retention_days',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
  )
    .bind(String(data.retentionDays))
    .run();
  return c.json({ ok: true });
});
app.post('/api/admin/retention/run', async (c) => c.json({ deleted: await purge(c.env) }));
app.post('/api/admin/notifications/retry', async (c) => {
  await resetFailedNotifications(c.env);
  return c.json({ processed: await deliverNotifications(c.env) });
});
app.all('/api/*', (c) => c.json({ error: 'not_found' }, 404));
app.all('*', async (c) => c.env.ASSETS.fetch(c.req.raw));
export default app;
