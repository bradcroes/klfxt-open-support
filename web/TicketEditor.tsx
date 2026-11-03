import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, json, request, safeLink } from './api';
import { errorText, useLanguage } from './i18n';
import type { TicketDetail } from './types';
import { propertyPatch, receivePropertyDraft } from './ticket-draft';
import type { PropertyDraft, PropertyFields } from './ticket-draft';
import { Conversation, DateTime, Feedback, Loading, priorities, StatusBadge, statuses } from './ui';

export function TicketEditor({ id, onBack }: { id: string; onBack: () => void }) {
  const { t } = useLanguage();
  const [data, setData] = useState<TicketDetail | null>(null);
  const [draft, setDraft] = useState<PropertyDraft | null>(null);
  const [conflicted, setConflicted] = useState(false);
  const loadSequence = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editError, setEditError] = useState('');
  const [saved, setSaved] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [internal, setInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [messageError, setMessageError] = useState('');
  const [messageSuccess, setMessageSuccess] = useState('');
  const load = useCallback(
    async (resetDraft = false) => {
      const sequence = ++loadSequence.current;
      setLoading(true);
      setError('');
      try {
        const result = await request<TicketDetail>(`/api/admin/tickets/${encodeURIComponent(id)}`);
        if (sequence !== loadSequence.current) return false;
        setData(result);
        setDraft((current) => receivePropertyDraft(current, result.ticket, resetDraft));
        if (resetDraft) setConflicted(false);
        return true;
      } catch (cause) {
        if (sequence === loadSequence.current) setError(errorText(cause, t));
        return false;
      } finally {
        if (sequence === loadSequence.current) setLoading(false);
      }
    },
    [id, t],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const stale = conflicted || Boolean(data && draft && draft.baseVersion !== data.ticket.version);
  function update(key: keyof PropertyFields, value: string) {
    setDraft((current) =>
      current ? { ...current, values: { ...current.values, [key]: value } } : current,
    );
    setSaved('');
  }
  async function reloadProperties() {
    if (await load(true)) {
      setEditError('');
      setSaved('');
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!data || !draft) return;
    setEditError('');
    setSaved('');
    if (stale) {
      setEditError(t.conflict);
      return;
    }
    if (
      (draft.values.bookingUrl.trim() && !safeLink(draft.values.bookingUrl.trim(), 'booking')) ||
      (draft.values.paymentUrl.trim() && !safeLink(draft.values.paymentUrl.trim(), 'payment'))
    ) {
      setEditError(t.invalidLinks);
      return;
    }
    setSaving(true);
    try {
      await request(
        `/api/admin/tickets/${encodeURIComponent(id)}`,
        json('PATCH', propertyPatch(draft)),
      );
      setConflicted(true);
      await load(true);
      setSaved(t.saved);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setConflicted(true);
        await load();
      }
      setEditError(errorText(cause, t));
    } finally {
      setSaving(false);
    }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    setMessageError('');
    setMessageSuccess('');
    setSaved('');
    if (!message.trim()) {
      setMessageError(t.blankMessage);
      return;
    }
    setSending(true);
    try {
      await request(
        `/api/admin/tickets/${encodeURIComponent(id)}/messages`,
        json('POST', { message: message.trim(), internal }),
      );
      setMessage('');
      setMessageSuccess(internal ? t.noteSent : t.publicSent);
      await load();
    } catch (cause) {
      setMessageError(errorText(cause, t));
    } finally {
      setSending(false);
    }
  }
  return (
    <>
      <button className="text-button back-button" onClick={onBack}>
        <span aria-hidden="true">←</span>
        {t.back}
      </button>
      <Feedback message={error} />
      {!data || !draft ? (
        loading ? (
          <Loading />
        ) : (
          <button className="button button-secondary" onClick={() => void load()}>
            {t.retry}
          </button>
        )
      ) : (
        <>
          <div className="page-heading detail-heading">
            <div>
              <p className="eyebrow mono">{data.ticket.reference}</p>
              <h1>{data.ticket.subject}</h1>
              <p>
                {data.ticket.name}{' '}
                <span className="heading-separator" aria-hidden="true">
                  /
                </span>{' '}
                <a href={`mailto:${data.ticket.email}`}>{data.ticket.email}</a>
              </p>
            </div>
            <StatusBadge status={data.ticket.status} />
          </div>
          <div className="editor-layout">
            <section className="conversation-card">
              <div className="section-heading">
                <h2>{t.conversation}</h2>
                <button
                  className="text-button"
                  disabled={loading || saving || sending}
                  onClick={() => void load()}
                >
                  {t.refresh}
                  <span aria-hidden="true">↻</span>
                </button>
              </div>
              <Conversation messages={data.messages} />
              <form
                noValidate
                onSubmit={send}
                className={`reply-form ${internal ? 'reply-internal' : ''}`}
              >
                <div className="compose-switch" role="group" aria-label={t.message}>
                  <button
                    type="button"
                    aria-pressed={!internal}
                    onClick={() => {
                      setInternal(false);
                      setMessageSuccess('');
                    }}
                  >
                    {t.publicReply}
                  </button>
                  <button
                    type="button"
                    aria-pressed={internal}
                    onClick={() => {
                      setInternal(true);
                      setMessageSuccess('');
                    }}
                  >
                    {t.addNote}
                  </button>
                </div>
                <label className="sr-only" htmlFor="owner-reply">
                  {internal ? t.addNote : t.publicReply}
                </label>
                <p id="reply-visibility" className="field-hint">
                  {internal ? t.internalHint : t.publicHint}
                </p>
                <textarea
                  id="owner-reply"
                  aria-describedby="reply-visibility"
                  required
                  maxLength={4000}
                  rows={5}
                  placeholder={t.composePlaceholder}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={sending || saving}
                />
                <Feedback message={messageError} />
                <Feedback message={messageSuccess} kind="success" />
                <button className="button" disabled={sending || saving || loading} type="submit">
                  {sending ? t.submitting : t.send}
                  <span aria-hidden="true">↗</span>
                </button>
              </form>
            </section>
            <aside className="ticket-properties">
              <section className="properties-card">
                <div className="section-heading">
                  <h2>{t.details}</h2>
                </div>
                <form noValidate onSubmit={save}>
                  <fieldset disabled={saving || loading || sending}>
                    <div className="field">
                      <label htmlFor="edit-status">{t.status}</label>
                      <select
                        id="edit-status"
                        value={draft.values.status}
                        onChange={(event) => update('status', event.target.value)}
                      >
                        {statuses.map((value) => (
                          <option key={value} value={value}>
                            {t[value]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="edit-priority">{t.priority}</label>
                      <select
                        id="edit-priority"
                        value={draft.values.priority}
                        onChange={(event) => update('priority', event.target.value)}
                      >
                        {priorities.map((value) => (
                          <option key={value} value={value}>
                            {t[value]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="edit-assignee">{t.assignee}</label>
                      <input
                        id="edit-assignee"
                        value={draft.values.assignee}
                        maxLength={100}
                        placeholder={t.unassigned}
                        onChange={(event) => update('assignee', event.target.value)}
                        aria-describedby="assignee-hint"
                      />
                      <p id="assignee-hint" className="field-hint">
                        {t.assigneeHint}
                      </p>
                    </div>
                    <div className="field">
                      <label htmlFor="edit-booking">{t.bookingUrl}</label>
                      <input
                        id="edit-booking"
                        type="url"
                        value={draft.values.bookingUrl}
                        maxLength={2048}
                        onChange={(event) => update('bookingUrl', event.target.value)}
                        placeholder="https://calendly.com/…"
                        aria-describedby="booking-hint"
                      />
                      <p id="booking-hint" className="field-hint">
                        {t.bookingHint}
                      </p>
                    </div>
                    <div className="field">
                      <label htmlFor="edit-payment">{t.paymentUrl}</label>
                      <input
                        id="edit-payment"
                        type="url"
                        value={draft.values.paymentUrl}
                        maxLength={2048}
                        onChange={(event) => update('paymentUrl', event.target.value)}
                        placeholder="https://buy.stripe.com/…"
                        aria-describedby="payment-hint"
                      />
                      <p id="payment-hint" className="field-hint">
                        {t.paymentHint}
                      </p>
                    </div>
                    <Feedback message={editError || (stale ? t.propertyDraftStale : '')} />
                    {stale && (
                      <div className="draft-reload">
                        <p className="field-hint">{t.propertyDraftReloadHint}</p>
                        <button
                          className="button button-secondary full-width"
                          type="button"
                          onClick={() => void reloadProperties()}
                        >
                          {t.propertyDraftReload}
                        </button>
                      </div>
                    )}
                    <Feedback message={saved} kind="success" />
                    <button className="button full-width" disabled={stale} type="submit">
                      {saving ? t.saving : t.save}
                    </button>
                  </fieldset>
                </form>
                <dl className="detail-dates">
                  <div>
                    <dt>{t.created}</dt>
                    <dd>
                      <DateTime value={data.ticket.created_at} />
                    </dd>
                  </div>
                  <div>
                    <dt>{t.updated}</dt>
                    <dd>
                      <DateTime value={data.ticket.updated_at} />
                    </dd>
                  </div>
                </dl>
              </section>
              <section className="notification-card">
                <h2>{t.notifications}</h2>
                {data.notifications.length ? (
                  <ul>
                    {data.notifications.map((notification, index) => (
                      <li key={index}>
                        <strong>
                          {notification.status === 'sent' || notification.status === 'delivered'
                            ? t.sent
                            : notification.status === 'failed'
                              ? t.failed
                              : notification.status === 'disabled'
                                ? t.disabled
                                : t.pending}
                        </strong>
                        <span>
                          {notification.attempts} {t.attempts} ·{' '}
                          <DateTime value={notification.created_at} short />
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{t.notificationEmpty}</p>
                )}
              </section>
            </aside>
          </div>
        </>
      )}
    </>
  );
}
