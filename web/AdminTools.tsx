import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { json, request } from './api';
import { errorText, useLanguage } from './i18n';
import type { Customer } from './types';
import { DateTime, DocumentLinks, EmptyState, Feedback, Loading } from './ui';

export function CustomerDirectory() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await request<{ customers: Customer[] }>(
        `/api/admin/customers?q=${encodeURIComponent(query)}`,
      );
      setCustomers(result.customers);
    } catch (cause) {
      setError(errorText(cause, t));
    } finally {
      setLoading(false);
    }
  }, [query, t]);
  useEffect(() => {
    void load();
  }, [load]);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (query === search.trim()) void load();
    else setQuery(search.trim());
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t.customers}</p>
          <h1>{t.customerTitle}</h1>
          <p>{t.customerIntro}</p>
        </div>
      </div>
      <section className="ticket-list-card">
        <form className="filter-row" onSubmit={submit}>
          <div className="search-field">
            <label className="sr-only" htmlFor="customer-search">
              {t.customerSearch}
            </label>
            <span aria-hidden="true">⌕</span>
            <input
              id="customer-search"
              type="search"
              value={search}
              maxLength={200}
              placeholder={t.customerSearch}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <button className="button button-secondary" disabled={loading} type="submit">
            {t.searchButton}
          </button>
        </form>
        <Feedback message={error} />
        {loading ? (
          <Loading />
        ) : customers.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">{t.name}</th>
                  <th scope="col">{t.email}</th>
                  <th scope="col">{t.ticketCount}</th>
                  <th scope="col">{t.lastContact}</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.email}>
                    <td>
                      <span className="customer-name">{customer.name}</span>
                    </td>
                    <td>
                      <a href={`mailto:${customer.email}`}>{customer.email}</a>
                    </td>
                    <td>{customer.tickets}</td>
                    <td>
                      <DateTime value={customer.last_contact} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={t.noCustomers} />
        )}
        <p className="table-footnote">{t.directoryLimit}</p>
      </section>
    </>
  );
}

export function Settings() {
  const { t } = useLanguage();
  const [days, setDays] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'save' | 'purge' | 'mail' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await request<{ retentionDays: number }>('/api/admin/settings');
      setDays((current) => current || String(result.retentionDays));
    } catch (cause) {
      setError(errorText(cause, t));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => {
    void load();
  }, [load]);
  async function save(event: FormEvent) {
    event.preventDefault();
    setError('');
    setSuccess('');
    const value = Number(days);
    if (!Number.isInteger(value) || value < 30 || value > 730) {
      setError(t.invalidRetention);
      return;
    }
    setBusy('save');
    try {
      await request('/api/admin/settings', json('PUT', { retentionDays: value }));
      setSuccess(t.retentionSaved);
    } catch (cause) {
      setError(errorText(cause, t));
    } finally {
      setBusy(null);
    }
  }
  async function action(kind: 'purge' | 'mail') {
    if (kind === 'purge' && !window.confirm(t.purgeConfirm)) return;
    setBusy(kind);
    setError('');
    setSuccess('');
    try {
      if (kind === 'purge') {
        const result = await request<{ deleted: number }>(
          '/api/admin/retention/run',
          json('POST', {}),
        );
        setSuccess(`${t.purged} ${result.deleted}`);
      } else {
        const result = await request<{ processed: number }>(
          '/api/admin/notifications/retry',
          json('POST', {}),
        );
        setSuccess(`${t.mailRetried} ${result.processed}`);
      }
    } catch (cause) {
      setError(errorText(cause, t));
    } finally {
      setBusy(null);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t.settings}</p>
          <h1>{t.settingsTitle}</h1>
          <p>{t.settingsIntro}</p>
        </div>
      </div>
      <Feedback message={error} />
      <Feedback message={success} kind="success" />
      {loading ? (
        <Loading />
      ) : !days ? (
        <button className="button button-secondary" onClick={() => void load()}>
          {t.retry}
        </button>
      ) : (
        <div className="settings-stack">
          <section className="settings-section">
            <div>
              <span className="section-number" aria-hidden="true">
                01
              </span>
              <h2>{t.retentionTitle}</h2>
              <p>{t.retentionText}</p>
            </div>
            <div>
              <form noValidate onSubmit={save}>
                <div className="field">
                  <label htmlFor="retention-days">{t.retentionDays}</label>
                  <input
                    id="retention-days"
                    type="number"
                    required
                    min={30}
                    max={730}
                    step={1}
                    value={days}
                    onChange={(event) => {
                      setDays(event.target.value);
                      setSuccess('');
                    }}
                    aria-describedby="retention-hint"
                    disabled={busy !== null}
                  />
                  <p id="retention-hint" className="field-hint">
                    {t.retentionHint}
                  </p>
                </div>
                <button className="button" disabled={busy !== null} type="submit">
                  {busy === 'save' ? t.saving : t.save}
                </button>
              </form>
              <div className="danger-area">
                <button
                  className="text-button danger-button"
                  disabled={busy !== null}
                  onClick={() => void action('purge')}
                >
                  {busy === 'purge' ? t.loading : t.purge}
                  <span aria-hidden="true">↗</span>
                </button>
              </div>
            </div>
          </section>
          <section className="settings-section">
            <div>
              <span className="section-number" aria-hidden="true">
                02
              </span>
              <h2>{t.mailTitle}</h2>
              <p>{t.mailText}</p>
            </div>
            <div>
              <button
                className="button button-secondary"
                disabled={busy !== null}
                onClick={() => void action('mail')}
              >
                {busy === 'mail' ? t.loading : t.retryMail}
                <span aria-hidden="true">↻</span>
              </button>
            </div>
          </section>
          <section className="settings-section">
            <div>
              <span className="section-number" aria-hidden="true">
                03
              </span>
              <h2>{t.integrationTitle}</h2>
              <p>{t.integrationText}</p>
            </div>
            <DocumentLinks />
          </section>
        </div>
      )}
    </>
  );
}
