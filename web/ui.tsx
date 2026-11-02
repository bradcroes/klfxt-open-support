import type { ReactNode } from 'react';
import { safeLink } from './api';
import { useLanguage } from './i18n';
import type { Message, Priority, Status } from './types';

export const statuses: Status[] = ['open', 'in_progress', 'waiting', 'resolved'];
export const priorities: Priority[] = ['low', 'normal', 'high', 'urgent'];
export function StatusBadge({ status }: { status: Status }) {
  const { t } = useLanguage();
  return (
    <span className={`status-badge status-${status}`}>
      <span aria-hidden="true" />
      {t[status] ?? status}
    </span>
  );
}
export function Feedback({
  message,
  kind = 'error',
}: {
  message?: string;
  kind?: 'error' | 'success' | 'info';
}) {
  if (!message) return null;
  return (
    <div className={`feedback feedback-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {message}
    </div>
  );
}
export function Loading() {
  const { t } = useLanguage();
  return (
    <div className="loading-state" role="status">
      <span className="loading-dot" aria-hidden="true" />
      {t.loading}
    </div>
  );
}
export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-mark" aria-hidden="true">
        ↗
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function DateTime({ value, short = false }: { value: string; short?: boolean }) {
  const { locale } = useLanguage();
  const date = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`);
  return (
    <time dateTime={value}>
      {Number.isNaN(date.getTime())
        ? '—'
        : new Intl.DateTimeFormat(locale === 'nl' ? 'nl-NL' : 'en-GB', {
            day: 'numeric',
            month: 'short',
            ...(short ? {} : { year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          }).format(date)}
    </time>
  );
}
export function Conversation({
  messages,
  customer = false,
}: {
  messages: Message[];
  customer?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div className="conversation">
      {messages.length === 0 ? (
        <EmptyState title={t.noMessages} />
      ) : (
        messages.map((item) => (
          <article
            key={item.id}
            className={`message message-${item.author}${item.visibility === 'internal' ? ' message-internal' : ''}`}
          >
            <div className="message-meta">
              <strong>{item.author === 'owner' ? t.team : customer ? t.you : t.customer}</strong>
              {item.visibility === 'internal' && (
                <span className="note-label">{t.internalNote}</span>
              )}
              <DateTime value={item.created_at} />
            </div>
            <p>{item.body}</p>
          </article>
        ))
      )}
    </div>
  );
}
export function IntegrationLinks({
  booking,
  payment,
}: {
  booking?: string | null;
  payment?: string | null;
}) {
  const { t } = useLanguage();
  const bookingHref = safeLink(booking, 'booking');
  const paymentHref = safeLink(payment, 'payment');
  if (!bookingHref && !paymentHref) return null;
  return (
    <section className="integration-links">
      <h2>{t.links}</h2>
      <div className="button-row">
        {bookingHref && (
          <a
            className="button button-secondary"
            href={bookingHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.booking} <span aria-hidden="true">↗</span>
          </a>
        )}
        {paymentHref && (
          <a
            className="button button-secondary"
            href={paymentHref}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.payment} <span aria-hidden="true">↗</span>
          </a>
        )}
      </div>
      <p className="field-hint">{t.linkInfo}</p>
    </section>
  );
}
export function DocumentLinks() {
  const { t } = useLanguage();
  return (
    <div className="doc-links">
      <a href="/docs/README.html">
        {t.readme} <span aria-hidden="true">↗</span>
      </a>
      <a href="/docs/CONTRIBUTING.html">
        {t.contributing} <span aria-hidden="true">↗</span>
      </a>
      <a href="/docs/SECURITY.html">
        {t.security} <span aria-hidden="true">↗</span>
      </a>
      <a href="/docs/api-contract.html">
        {t.architecture} <span aria-hidden="true">↗</span>
      </a>
    </div>
  );
}
