import { test } from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server/app';
import { database } from './database';
const base = 'http://localhost:8787';
const input = {
  name: 'Example Customer',
  email: 'customer@example.com',
  subject: 'Printer setup',
  message: 'Please help me set up my printer.',
  locale: 'en',
  website: '',
};
function client(env: any) {
  let cookie = '';
  return {
    async call(path: string, method = 'GET', body?: unknown, token?: string) {
      const h: Record<string, string> = { Origin: base, 'cf-connecting-ip': '192.0.2.1' };
      if (body !== undefined) h['Content-Type'] = 'application/json';
      if (cookie) h.Cookie = cookie;
      if (token) h.Authorization = 'Bearer ' + token;
      const response = await app.fetch(
        new Request(base + path, {
          method,
          headers: h,
          body: body === undefined ? undefined : JSON.stringify(body),
        }),
        env,
        { waitUntil() {}, passThroughOnException() {} } as any,
      );
      if (response.headers.get('set-cookie'))
        cookie = response.headers.get('set-cookie')!.split(';')[0];
      return response;
    },
  };
}
test('a customer can submit and retrieve only their ticket through the private capability', async () => {
  const d = database();
  try {
    const c = client(d.env);
    const r = await c.call('/api/tickets', 'POST', input);
    assert.equal(r.status, 201);
    const saved = (await r.json()) as any;
    assert.match(saved.reference, /^OS-/);
    assert.equal(saved.trackingToken.length, 43);
    const track = await c.call('/api/track', 'GET', undefined, saved.trackingToken);
    assert.equal(track.status, 200);
    const data = (await track.json()) as any;
    assert.equal(data.ticket.subject, input.subject);
    assert.equal(data.messages[0].body, input.message);
    assert.equal(JSON.stringify(data).includes(input.email), false);
    assert.equal((await c.call('/api/track', 'GET', undefined, 'C'.repeat(43))).status, 404);
    assert.equal(
      d.sql.prepare('SELECT token_hash FROM tickets').get()!.token_hash === saved.trackingToken,
      false,
    );
  } finally {
    d.close();
  }
});
test('owner-only routes reject anonymous clients and a foreign Origin', async () => {
  const d = database();
  try {
    assert.equal((await client(d.env).call('/api/admin/tickets')).status, 401);
    const r = await app.fetch(
      new Request(base + '/api/admin/login', {
        method: 'POST',
        headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKey: d.env.ADMIN_ACCESS_KEY }),
      }),
      d.env,
    );
    assert.equal(r.status, 403);
  } finally {
    d.close();
  }
});

test('private notes stay private, replies are shared, and stale edits cannot overwrite new changes', async () => {
  const d = database();
  try {
    const customer = client(d.env);
    const saved = (await (await customer.call('/api/tickets', 'POST', input)).json()) as any;
    const owner = client(d.env);
    assert.equal(
      (await owner.call('/api/admin/login', 'POST', { accessKey: d.env.ADMIN_ACCESS_KEY })).status,
      200,
    );
    const list = (await (await owner.call('/api/admin/tickets')).json()) as any;
    assert.equal(list.total, 1);
    const id = list.tickets[0].id;
    assert.equal(
      (
        await owner.call('/api/admin/tickets/' + id + '/messages', 'POST', {
          message: 'Private diagnostic hypothesis',
          internal: true,
        })
      ).status,
      201,
    );
    await owner.call('/api/admin/tickets/' + id + '/messages', 'POST', {
      message: 'Please confirm your availability.',
      internal: false,
    });
    let details = (await (await owner.call('/api/admin/tickets/' + id)).json()) as any;
    assert.equal(details.messages.length, 3);
    const update = {
      version: details.ticket.version,
      status: 'in_progress',
      priority: 'high',
      assignee: 'Service owner',
    };
    assert.equal((await owner.call('/api/admin/tickets/' + id, 'PATCH', update)).status, 200);
    assert.equal(
      (await owner.call('/api/admin/tickets/' + id, 'PATCH', { ...update, status: 'resolved' }))
        .status,
      409,
    );
    let shared = (await (
      await customer.call('/api/track', 'GET', undefined, saved.trackingToken)
    ).json()) as any;
    assert.equal(shared.ticket.status, 'in_progress');
    assert.equal(shared.messages.length, 2);
    assert.equal(JSON.stringify(shared).includes('Private diagnostic'), false);
    assert.equal(shared.ticket.priority, undefined);
    assert.equal(shared.ticket.assignee, undefined);
    assert.equal(
      (
        await customer.call(
          '/api/track/messages',
          'POST',
          { message: 'Tomorrow morning would work.' },
          saved.trackingToken,
        )
      ).status,
      201,
    );
    details = (await (await owner.call('/api/admin/tickets/' + id)).json()) as any;
    assert.equal(details.messages.length, 4);
    await owner.call('/api/admin/logout', 'POST');
    assert.equal((await owner.call('/api/admin/tickets')).status, 401);
  } finally {
    d.close();
  }
});

test('rate limits are atomic and invalid data never creates a ticket', async () => {
  const d = database();
  try {
    const c = client(d.env);
    assert.equal(
      (await c.call('/api/tickets', 'POST', { ...input, message: '        ' })).status,
      400,
    );
    assert.equal(d.sql.prepare('SELECT count(*) AS n FROM tickets').get()!.n, 0);
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => c.call('/api/tickets', 'POST', input)),
    );
    assert.equal(responses.filter((r) => r.status === 201).length, 4);
    assert.equal(responses.filter((r) => r.status === 429).length, 4);
    assert.equal(d.sql.prepare('SELECT count(*) AS n FROM tickets').get()!.n, 4);
  } finally {
    d.close();
  }
});

test('unsafe booking/payment URLs are rejected and customer names render as inert data', async () => {
  const d = database();
  try {
    const c = client(d.env);
    await c.call('/api/tickets', 'POST', { ...input, name: '<script>alert(1)</script>' });
    await c.call('/api/admin/login', 'POST', { accessKey: d.env.ADMIN_ACCESS_KEY });
    const list = (await (await c.call('/api/admin/tickets')).json()) as any;
    const t = list.tickets[0];
    for (const url of [
      'javascript:alert(1)',
      'http://buy.stripe.com/test',
      'https://buy.stripe.com.evil.example/test',
      'https://user@buy.stripe.com/test',
      'https://evil.example/test',
    ])
      assert.equal(
        (await c.call('/api/admin/tickets/' + t.id, 'PATCH', { version: 1, paymentUrl: url }))
          .status,
        400,
      );
    assert.equal(
      (
        await c.call('/api/admin/tickets/' + t.id, 'PATCH', {
          version: 1,
          paymentUrl: 'https://buy.stripe.com/test_example',
          bookingUrl: 'https://calendly.com/example/intro',
        })
      ).status,
      200,
    );
    assert.equal(t.name, '<script>alert(1)</script>');
  } finally {
    d.close();
  }
});

test('session expiry, rotation and missing configuration fail closed', async () => {
  const d = database();
  try {
    const c = client(d.env);
    await c.call('/api/admin/login', 'POST', { accessKey: d.env.ADMIN_ACCESS_KEY });
    assert.equal((await c.call('/api/admin/session')).status, 200);
    d.sql.exec('UPDATE sessions SET expires_at=0');
    assert.equal((await c.call('/api/admin/session')).status, 401);
    await c.call('/api/admin/login', 'POST', { accessKey: d.env.ADMIN_ACCESS_KEY });
    d.env.ADMIN_ACCESS_KEY = 'C'.repeat(43);
    assert.equal((await c.call('/api/admin/session')).status, 401);
    d.env.ADMIN_ACCESS_KEY = '';
    assert.equal((await c.call('/api/admin/session')).status, 503);
  } finally {
    d.close();
  }
});

test('the byte limit is enforced even when content length lies', async () => {
  const d = database();
  try {
    const r = await app.fetch(
      new Request(base + '/api/tickets', {
        method: 'POST',
        headers: {
          Origin: base,
          'Content-Type': 'application/json',
          'Content-Length': '2',
          'cf-connecting-ip': '192.0.2.9',
        },
        body: JSON.stringify({ ...input, message: 'x'.repeat(17000) }),
      }),
      d.env,
    );
    assert.equal(r.status, 413);
    assert.equal(d.sql.prepare('SELECT count(*) AS n FROM tickets').get()!.n, 0);
  } finally {
    d.close();
  }
});

test('retention deletes only old resolved data and cascades messages/outbox', async () => {
  const d = database();
  try {
    const c = client(d.env);
    await c.call('/api/tickets', 'POST', input);
    await c.call('/api/tickets', 'POST', { ...input, email: 'other@example.com' });
    await c.call('/api/admin/login', 'POST', { accessKey: d.env.ADMIN_ACCESS_KEY });
    const id = (d.sql.prepare('SELECT id FROM tickets LIMIT 1').get() as any).id;
    d.sql
      .prepare(
        "UPDATE tickets SET status='resolved',resolved_at='2020-01-01T00:00:00.000Z' WHERE id=?",
      )
      .run(id);
    d.sql
      .prepare("INSERT INTO outbox(id,ticket_id,created_at) VALUES('old',?,'2020-01-01')")
      .run(id);
    assert.equal((await c.call('/api/admin/settings', 'PUT', { retentionDays: 1 })).status, 400);
    assert.equal((await c.call('/api/admin/settings', 'PUT', { retentionDays: 30 })).status, 200);
    const result = (await (await c.call('/api/admin/retention/run', 'POST', {})).json()) as any;
    assert.equal(result.deleted, 1);
    assert.equal(d.sql.prepare('SELECT count(*) AS n FROM tickets').get()!.n, 1);
    assert.equal(d.sql.prepare('SELECT count(*) AS n FROM messages').get()!.n, 1);
    assert.equal(d.sql.prepare('SELECT count(*) AS n FROM outbox').get()!.n, 0);
  } finally {
    d.close();
  }
});

test('API and HTML responses do not cache sensitive data and deny framing', async () => {
  const d = database();
  try {
    for (const path of ['/api/config', '/admin', '/track']) {
      const r = await client(d.env).call(path);
      assert.equal(r.headers.get('cache-control'), 'no-store');
      assert.equal(r.headers.get('x-frame-options'), 'DENY');
      assert.equal(r.headers.get('referrer-policy'), 'no-referrer');
      assert.match(r.headers.get('content-security-policy')!, /frame-ancestors 'none'/);
    }
  } finally {
    d.close();
  }
});

test('a new customer reply reopens an old resolved ticket before retention can remove the active conversation', async () => {
  const d = database();
  try {
    const c = client(d.env);
    const saved = (await (await c.call('/api/tickets', 'POST', input)).json()) as any;
    d.sql.exec("UPDATE tickets SET status='resolved',resolved_at='2020-01-01T00:00:00.000Z'");
    await c.call(
      '/api/track/messages',
      'POST',
      { message: 'The problem has returned.' },
      saved.trackingToken,
    );
    const t = d.sql.prepare('SELECT status,resolved_at FROM tickets').get();
    assert.equal(t!.status, 'open');
    assert.equal(t!.resolved_at, null);
    await c.call('/api/admin/login', 'POST', { accessKey: d.env.ADMIN_ACCESS_KEY });
    const purge = (await (await c.call('/api/admin/retention/run', 'POST', {})).json()) as any;
    assert.equal(purge.deleted, 0);
  } finally {
    d.close();
  }
});
