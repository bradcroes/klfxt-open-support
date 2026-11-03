import { test } from 'node:test';
import assert from 'node:assert/strict';
import { database } from './database';
import { deliverNotifications } from '../server/maintenance';
import { app } from '../server/app';
async function fixture() {
  const d = database();
  await app.fetch(
    new Request('http://localhost:8787/api/tickets', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost:8787',
        'Content-Type': 'application/json',
        'cf-connecting-ip': '192.0.2.1',
      },
      body: JSON.stringify({
        name: 'Example',
        email: 'customer@example.com',
        subject: 'Example request',
        message: 'This is a synthetic request only.',
        locale: 'en',
      }),
    }),
    d.env,
    { waitUntil() {} } as any,
  );
  const ticket = d.sql.prepare('SELECT id FROM tickets').get() as any;
  d.sql
    .prepare("INSERT INTO outbox(id,ticket_id,created_at) VALUES('job',?,?)")
    .run(ticket.id, new Date().toISOString());
  Object.assign(d.env, {
    MAIL_MODE: 'resend',
    RESEND_API_KEY: 'synthetic-key',
    MAIL_FROM: 'Example <support@example.com>',
    NOTIFY_EMAIL: 'owner@example.com',
  });
  return d;
}
test('provider rejection preserves ticket and retry uses the same idempotency key without transmitting customer content', async () => {
  const d = await fixture();
  try {
    const keys: string[] = [];
    const fetcher = (async (_url: any, init: any) => {
      const h = new Headers(init.headers);
      keys.push(h.get('Idempotency-Key')!);
      assert.equal(init.body.includes('customer@example.com'), false);
      assert.equal(init.body.includes('synthetic request'), false);
      return keys.length === 1
        ? Response.json({ error: 'temporary' }, { status: 503 })
        : Response.json({ id: 'example-provider-id' });
    }) as typeof fetch;
    await deliverNotifications(d.env, fetcher);
    assert.equal(d.sql.prepare('SELECT count(*) AS n FROM tickets').get()!.n, 1);
    assert.equal(d.sql.prepare('SELECT status FROM outbox').get()!.status, 'failed');
    await deliverNotifications(d.env, fetcher);
    assert.deepEqual(keys, ['open-support/job', 'open-support/job']);
    assert.equal(d.sql.prepare('SELECT status FROM outbox').get()!.status, 'sent');
  } finally {
    d.close();
  }
});
test('concurrent delivery claims a job once and missing mail configuration never transmits', async () => {
  const d = await fixture();
  try {
    let calls = 0;
    const fetcher = (async () => {
      calls++;
      return Response.json({ id: 'synthetic-id' });
    }) as typeof fetch;
    await Promise.all([deliverNotifications(d.env, fetcher), deliverNotifications(d.env, fetcher)]);
    assert.equal(calls, 1);
    d.env.MAIL_MODE = 'disabled';
    assert.equal(await deliverNotifications(d.env, fetcher), 0);
    assert.equal(calls, 1);
  } finally {
    d.close();
  }
});
test('an exhausted delivery lease becomes a visible terminal failure', async () => {
  const d = await fixture();
  try {
    d.sql.exec("UPDATE outbox SET status='sending',attempts=3,locked_until=0");
    let calls = 0;
    await deliverNotifications(d.env, (async () => {
      calls++;
      return Response.json({ id: 'never' });
    }) as typeof fetch);
    assert.equal(calls, 0);
    assert.equal(d.sql.prepare('SELECT status FROM outbox').get()!.status, 'failed');
  } finally {
    d.close();
  }
});

test('one deliberate retry recovers an exhausted expired lease without a second click', async () => {
  const d = await fixture();
  try {
    d.sql.exec("UPDATE outbox SET status='sending',attempts=3,locked_until=0");
    const { resetFailedNotifications } = await import('../server/maintenance');
    assert.equal(await resetFailedNotifications(d.env), 1);
    let calls = 0;
    await deliverNotifications(d.env, (async () => {
      calls++;
      return Response.json({ id: 'recovered' });
    }) as typeof fetch);
    assert.equal(calls, 1);
    assert.equal(d.sql.prepare('SELECT status FROM outbox').get()!.status, 'sent');
  } finally {
    d.close();
  }
});
