import type { Env } from './types';
export async function retentionDays(env: Env) {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key='retention_days'").first<{
    value: string;
  }>();
  const n = Number(row?.value ?? env.RETENTION_DAYS ?? 90);
  return Number.isInteger(n) && n >= 30 && n <= 730 ? n : 90;
}
export async function purge(env: Env) {
  const cutoff = new Date(Date.now() - (await retentionDays(env)) * 86400000).toISOString();
  const result = await env.DB.prepare(
    "DELETE FROM tickets WHERE status='resolved' AND resolved_at < ?",
  )
    .bind(cutoff)
    .run();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at < ?').bind(Math.floor(Date.now() / 1000)),
    env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?').bind(
      Math.floor(Date.now() / 1000),
    ),
    env.DB.prepare('DELETE FROM audit_log WHERE created_at < ?').bind(cutoff),
  ]);
  return Number(result.meta.changes ?? 0);
}
export async function deliverNotifications(env: Env, fetcher: typeof fetch = fetch) {
  await env.DB.prepare(
    "UPDATE outbox SET status='failed',locked_until=0 WHERE status='sending' AND attempts>=3 AND locked_until < ?",
  )
    .bind(Math.floor(Date.now() / 1000))
    .run();
  if (
    env.MAIL_MODE !== 'resend' ||
    !env.RESEND_API_KEY ||
    !env.MAIL_FROM ||
    !env.NOTIFY_EMAIL ||
    /[\r\n]/.test(env.MAIL_FROM) ||
    !/^\S+@\S+\.\S+$/.test(env.NOTIFY_EMAIL)
  )
    return 0;
  const time = Math.floor(Date.now() / 1000);
  const pending = await env.DB.prepare(
    "SELECT id,ticket_id FROM outbox WHERE attempts < 3 AND (status IN ('pending','failed') OR (status='sending' AND locked_until < ?)) ORDER BY created_at LIMIT 10",
  )
    .bind(time)
    .all<{ id: string; ticket_id: string }>();
  let processed = 0;
  for (const item of pending.results) {
    const claimed = await env.DB.prepare(
      "UPDATE outbox SET status='sending', attempts=attempts+1, locked_until=? WHERE id=? AND attempts<3 AND (status IN ('pending','failed') OR (status='sending' AND locked_until < ?))",
    )
      .bind(time + 60, item.id, time)
      .run();
    if (!claimed.meta.changes) continue;
    let status = 'failed';
    let providerId: string | null = null;
    try {
      const ticket = await env.DB.prepare('SELECT reference,subject FROM tickets WHERE id=?')
        .bind(item.ticket_id)
        .first<{ reference: string; subject: string }>();
      if (!ticket) continue;
      // Content-minimal owner notification. Customer address/message and tracking token never leave D1 here.
      const r = await fetcher('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + env.RESEND_API_KEY,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'open-support/' + item.id,
        },
        body: JSON.stringify({
          from: env.MAIL_FROM,
          to: [env.NOTIFY_EMAIL],
          subject: 'Open Support · ' + ticket.reference,
          text: `New support request: ${ticket.reference}\nOpen your private desk: ${env.APP_ORIGIN}/admin`,
        }),
        signal: AbortSignal.timeout(5000),
      });
      const data = (await r.json()) as { id?: unknown };
      if (r.ok && typeof data.id === 'string' && data.id.length <= 100) {
        status = 'sent';
        providerId = data.id;
      }
    } catch {
      /* Persist failure without leaking provider details or losing the ticket. */
    }
    await env.DB.prepare('UPDATE outbox SET status=?,provider_id=?,locked_until=0 WHERE id=?')
      .bind(status, providerId, item.id)
      .run();
    processed++;
  }
  return processed;
}

export async function resetFailedNotifications(env: Env) {
  const result = await env.DB.prepare(
    "UPDATE outbox SET attempts=0,status='failed',locked_until=0 WHERE attempts>=3 AND (status='failed' OR (status='sending' AND locked_until < ?))",
  )
    .bind(Math.floor(Date.now() / 1000))
    .run();
  return Number(result.meta.changes ?? 0);
}
