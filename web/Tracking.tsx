import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, json, request } from './api';
import { errorText, useLanguage } from './i18n';
import type { TrackingDetail } from './types';
import { Conversation, DateTime, Feedback, IntegrationLinks, Loading, StatusBadge } from './ui';

export function Tracking() {
  const { t } = useLanguage();
  const [token] = useState(() => {
    try {
      return decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return '';
    }
  });
  const [data, setData] = useState<TrackingDetail | null>(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState('');
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      setData(
        await request<TrackingDetail>('/api/track', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
    } catch (cause) {
      setError(
        cause instanceof ApiError && [401, 404].includes(cause.status)
          ? t.invalidToken
          : errorText(cause, t),
      );
    } finally {
      setLoading(false);
    }
  }, [token, t]);
  useEffect(() => {
    void load();
  }, [load]);
  async function reply(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!message.trim()) {
      setError(t.blankMessage);
      return;
    }
    setBusy(true);
    try {
      await request('/api/track/messages', {
        ...json('POST', { message: message.trim() }),
        headers: { Authorization: `Bearer ${token}` },
      });
      setMessage('');
      setSuccess(t.replySent);
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError && [401, 404].includes(cause.status)
          ? t.invalidToken
          : errorText(cause, t),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main" tabIndex={-1} className="tracking-page page-width">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t.trackingTitle}</p>
          <h1>{data?.ticket.subject || t.trackingTitle}</h1>
          <p className="lead">{t.trackingIntro}</p>
        </div>
        {data && <StatusBadge status={data.ticket.status} />}
      </div>
      {!token ? (
        <Feedback message={t.missingToken} />
      ) : (
        <>
          {error && <Feedback message={error} />}
          {!data && loading ? (
            <Loading />
          ) : !data ? (
            <button className="button button-secondary" onClick={() => void load()}>
              {t.retry}
            </button>
          ) : (
            <>
              <div className="ticket-metadata">
                <span>
                  <strong>{t.reference}</strong>
                  {data.ticket.reference}
                </span>
                <span>
                  <strong>{t.created}</strong>
                  <DateTime value={data.ticket.created_at} />
                </span>
                <span>
                  <strong>{t.updated}</strong>
                  <DateTime value={data.ticket.updated_at} />
                </span>
              </div>
              <section className="conversation-card">
                <div className="section-heading">
                  <h2>{t.conversation}</h2>
                  <button className="text-button" disabled={loading} onClick={() => void load()}>
                    {t.refresh} <span aria-hidden="true">↻</span>
                  </button>
                </div>
                <Conversation messages={data.messages} customer />
                <form noValidate className="reply-form" onSubmit={reply}>
                  <label htmlFor="customer-reply">{t.yourReply}</label>
                  <textarea
                    id="customer-reply"
                    required
                    maxLength={4000}
                    rows={4}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={t.replyPlaceholder}
                    disabled={busy}
                  />
                  <Feedback message={success} kind="success" />
                  <button className="button" disabled={busy} type="submit">
                    {busy ? t.submitting : t.sendReply}
                    <span aria-hidden="true">↗</span>
                  </button>
                </form>
              </section>
              <IntegrationLinks
                booking={data.ticket.booking_url}
                payment={data.ticket.payment_url}
              />
            </>
          )}
        </>
      )}
    </main>
  );
}
