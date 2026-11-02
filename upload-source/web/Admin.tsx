import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, json, request } from './api';
import { errorText, useLanguage } from './i18n';
import { TicketDashboard } from './TicketDashboard';
import { TicketEditor } from './TicketEditor';
import { CustomerDirectory, Settings } from './AdminTools';
import { Feedback, Loading } from './ui';

function Login({ expired, onLogin }: { expired: boolean; onLogin: () => void }) {
  const { t } = useLanguage();
  const [accessKey, setAccessKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (!/^[A-Za-z0-9_-]{43}$/.test(accessKey)) {
      setError(t.unauthorized);
      return;
    }
    setBusy(true);
    try {
      await request('/api/admin/login', json('POST', { accessKey }));
      setAccessKey('');
      onLogin();
    } catch (cause) {
      setError(errorText(cause, t));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="login-panel">
      <div className="login-illustration" aria-hidden="true">
        <span>KLFXT</span>
        <div className="login-shape">
          <span>↗</span>
        </div>
        <p>
          OPEN
          <br />
          SUPPORT
        </p>
      </div>
      <div className="login-content">
        <p className="eyebrow">{t.owner}</p>
        <h1>{t.loginTitle}</h1>
        <p>{t.loginIntro}</p>
        <Feedback message={expired ? t.expired : ''} kind="info" />
        <form noValidate onSubmit={submit}>
          <div className="field">
            <label htmlFor="access-key">{t.accessKey}</label>
            <input
              id="access-key"
              type="password"
              autoComplete="off"
              spellCheck={false}
              required
              minLength={43}
              maxLength={43}
              pattern="[A-Za-z0-9_-]{43}"
              aria-describedby="key-hint"
              value={accessKey}
              onChange={(event) => setAccessKey(event.target.value)}
              disabled={busy}
            />
            <p id="key-hint" className="field-hint">
              {t.keyHint}
            </p>
          </div>
          <Feedback message={error} />
          <button className="button" disabled={busy} type="submit">
            {busy ? t.loggingIn : t.login}
            <span aria-hidden="true">↗</span>
          </button>
        </form>
        <p className="privacy-note">{t.loginPrivacy}</p>
      </div>
    </section>
  );
}

export function Admin() {
  const { t } = useLanguage();
  const [checked, setChecked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [hasWorkspace, setHasWorkspace] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'tickets' | 'customers' | 'settings'>('tickets');
  const [selected, setSelected] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => {
    let active = true;
    void request('/api/admin/session')
      .then(() => {
        if (active) {
          setAuthenticated(true);
          setHasWorkspace(true);
        }
      })
      .catch((cause) => {
        if (active && !(cause instanceof ApiError && cause.status === 401))
          setError(errorText(cause, t));
      })
      .finally(() => {
        if (active) setChecked(true);
      });
    return () => {
      active = false;
    };
  }, [t]);
  useEffect(() => {
    const expire = () => {
      setAuthenticated(false);
      setExpired(true);
    };
    window.addEventListener('support:auth-expired', expire);
    return () => window.removeEventListener('support:auth-expired', expire);
  }, []);
  useEffect(() => {
    if (authenticated) {
      document.getElementById('main')?.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    }
  }, [authenticated]);
  async function logout() {
    setSigningOut(true);
    setError('');
    try {
      await request('/api/admin/logout', json('POST', {}));
      setAuthenticated(false);
      setHasWorkspace(false);
      setExpired(false);
      setSelected(null);
    } catch (cause) {
      setError(errorText(cause, t));
    } finally {
      setSigningOut(false);
    }
  }
  function navigate(next: typeof tab) {
    setTab(next);
    setSelected(null);
  }
  return (
    <main
      id="main"
      tabIndex={-1}
      className={`admin-page ${!authenticated ? 'admin-unauthenticated page-width' : ''}`}
    >
      {!checked ? (
        <Loading />
      ) : (
        <>
          {!authenticated && (
            <>
              <Feedback message={error} />
              <Login
                expired={expired}
                onLogin={() => {
                  setAuthenticated(true);
                  setHasWorkspace(true);
                  setExpired(false);
                  setError('');
                  setRevision((value) => value + 1);
                }}
              />
            </>
          )}
          {hasWorkspace && (
            <div className="desk-layout" hidden={!authenticated}>
              <aside className="desk-sidebar">
                <p className="eyebrow">{t.desk}</p>
                <nav aria-label={t.owner}>
                  <button
                    aria-current={tab === 'tickets' ? 'page' : undefined}
                    onClick={() => navigate('tickets')}
                  >
                    <span aria-hidden="true">▤</span>
                    {t.tickets}
                    <span className="nav-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                  <button
                    aria-current={tab === 'customers' ? 'page' : undefined}
                    onClick={() => navigate('customers')}
                  >
                    <span aria-hidden="true">◎</span>
                    {t.customers}
                    <span className="nav-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                  <button
                    aria-current={tab === 'settings' ? 'page' : undefined}
                    onClick={() => navigate('settings')}
                  >
                    <span aria-hidden="true">⌘</span>
                    {t.settings}
                    <span className="nav-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </button>
                </nav>
                <div className="sidebar-bottom">
                  <a href="/docs/README.html">
                    {t.docsTitle} <span aria-hidden="true">↗</span>
                  </a>
                  <button
                    className="text-button"
                    disabled={signingOut}
                    onClick={() => void logout()}
                  >
                    {t.logout}
                    <span aria-hidden="true">→</span>
                  </button>
                  <span className="sidebar-version">KLFXT · {t.version}</span>
                </div>
              </aside>
              <div className="desk-main">
                <Feedback message={error} />
                {tab === 'tickets' ? (
                  selected ? (
                    <TicketEditor
                      id={selected}
                      onBack={() => {
                        setSelected(null);
                        setRevision((value) => value + 1);
                      }}
                    />
                  ) : (
                    <TicketDashboard revision={revision} onSelect={setSelected} />
                  )
                ) : tab === 'customers' ? (
                  <CustomerDirectory />
                ) : (
                  <Settings />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
