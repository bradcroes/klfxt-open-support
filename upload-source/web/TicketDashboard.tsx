import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { request } from './api';
import { errorText, useLanguage } from './i18n';
import type { Status, TicketList } from './types';
import { DateTime, EmptyState, Feedback, Loading, StatusBadge, statuses } from './ui';

export function TicketDashboard({
  onSelect,
  revision,
}: {
  onSelect: (id: string) => void;
  revision: number;
}) {
  const { t } = useLanguage();
  const [data, setData] = useState<TicketList | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status | ''>('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(
        await request<TicketList>(
          `/api/admin/tickets?${new URLSearchParams({ q: query, status, page: String(page) })}`,
        ),
      );
    } catch (cause) {
      setError(errorText(cause, t));
    } finally {
      setLoading(false);
    }
  }, [query, status, page, t]);
  useEffect(() => {
    void load();
  }, [load, revision]);
  function submit(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setQuery(search.trim());
  }
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 25)));
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t.tickets}</p>
          <h1>{t.overviewTitle}</h1>
          <p>{t.overviewIntro}</p>
        </div>
        <span className="desk-date">
          {new Intl.DateTimeFormat(document.documentElement.lang === 'nl' ? 'nl-NL' : 'en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          }).format(new Date())}
        </span>
      </div>
      <div className="stats-strip">
        <div className="stat">
          <span>{t.totalTickets}</span>
          <strong>{data?.stats.total ?? '—'}</strong>
          <span className="stat-symbol" aria-hidden="true">
            ↗
          </span>
        </div>
        <div className="stat">
          <span>{t.activeTickets}</span>
          <strong>
            {data ? data.stats.open + data.stats.in_progress + data.stats.waiting : '—'}
          </strong>
          <span className="stat-dot" aria-hidden="true" />
        </div>
        <div className="stat">
          <span>{t.resolved}</span>
          <strong>{data?.stats.resolved ?? '—'}</strong>
          <span className="stat-symbol" aria-hidden="true">
            ✓
          </span>
        </div>
        <div className="stat">
          <span>{t.customerCount}</span>
          <strong>{data?.customers ?? '—'}</strong>
          <span className="stat-symbol" aria-hidden="true">
            ◎
          </span>
        </div>
      </div>
      <section className="ticket-list-card">
        <div className="list-heading">
          <h2>
            {t.latestRequests} <span>{data?.total ?? 0}</span>
          </h2>
          <button className="text-button" disabled={loading} onClick={() => void load()}>
            {t.refresh} <span aria-hidden="true">↻</span>
          </button>
        </div>
        <form className="filter-row" onSubmit={submit}>
          <div className="search-field">
            <label className="sr-only" htmlFor="ticket-search">
              {t.search}
            </label>
            <span aria-hidden="true">⌕</span>
            <input
              id="ticket-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.searchPlaceholder}
              maxLength={200}
            />
          </div>
          <label className="sr-only" htmlFor="status-filter">
            {t.status}
          </label>
          <select
            id="status-filter"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as Status | '');
              setPage(1);
            }}
          >
            <option value="">{t.allStatuses}</option>
            {statuses.map((value) => (
              <option key={value} value={value}>
                {t[value]}
              </option>
            ))}
          </select>
          <button className="button button-secondary" type="submit" disabled={loading}>
            {t.searchButton}
          </button>
        </form>
        <Feedback message={error} />
        {loading && !data ? (
          <Loading />
        ) : !data?.tickets.length ? (
          <EmptyState title={t.emptyTickets}>{t.emptyTicketsText}</EmptyState>
        ) : (
          <div className="table-scroll" aria-busy={loading}>
            <table className="ticket-table">
              <thead>
                <tr>
                  <th scope="col">{t.subject}</th>
                  <th scope="col">{t.customer}</th>
                  <th scope="col">{t.status}</th>
                  <th scope="col">{t.priority}</th>
                  <th scope="col">{t.updated}</th>
                  <th scope="col">
                    <span className="sr-only">{t.view}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.tickets.map((ticket) => (
                  <tr key={ticket.id}>
                    <td>
                      <button className="ticket-title" onClick={() => onSelect(ticket.id)}>
                        {ticket.subject}
                      </button>
                      <span className="table-secondary mono">{ticket.reference}</span>
                    </td>
                    <td>
                      <span className="customer-name">{ticket.name}</span>
                      <span className="table-secondary">{ticket.email}</span>
                    </td>
                    <td>
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td>
                      <span className={`priority priority-${ticket.priority}`}>
                        <span aria-hidden="true">
                          {ticket.priority === 'urgent'
                            ? '!!'
                            : ticket.priority === 'high'
                              ? '↑'
                              : ticket.priority === 'low'
                                ? '↓'
                                : '–'}
                        </span>
                        {t[ticket.priority]}
                      </span>
                    </td>
                    <td className="date-cell">
                      <DateTime value={ticket.updated_at} short />
                    </td>
                    <td>
                      <button
                        className="row-open"
                        onClick={() => onSelect(ticket.id)}
                        aria-label={`${t.view}: ${ticket.reference}`}
                      >
                        <span aria-hidden="true">↗</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="pagination">
          <span>
            {data?.total ?? 0} {t.results} · {t.page} {page} {t.of} {pages}
          </span>
          <div>
            <button
              className="button button-small button-secondary"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => value - 1)}
            >
              <span aria-hidden="true">←</span>
              {t.previous}
            </button>
            <button
              className="button button-small button-secondary"
              disabled={page >= pages || loading}
              onClick={() => setPage((value) => value + 1)}
            >
              {t.next}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
