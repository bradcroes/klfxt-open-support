import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { About } from './About';
import { Admin } from './Admin';
import { request } from './api';
import { dictionaries, errorText, LanguageContext, useLanguage } from './i18n';
import { PublicIntake } from './Public';
import { Tracking } from './Tracking';
import type { Config, Locale } from './types';
import { Feedback, Loading } from './ui';
import './styles.css';

function Header({ businessName }: { businessName?: string }) {
  const { locale, setLocale, t } = useLanguage();
  const path = window.location.pathname;
  return (
    <>
      <a
        className="skip-link"
        href={path === '/track' ? window.location.hash || '#main' : '#main'}
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById('main');
          main?.focus();
          main?.scrollIntoView();
        }}
      >
        {t.skip}
      </a>
      <header className="site-header">
        <a className="brand" href="/" aria-label="KLFXT Open Support">
          <span className="brand-symbol" aria-hidden="true">
            k<span>↗</span>
          </span>
          <span className="brand-text">
            {businessName || 'KLFXT'}
            <small>OPEN SUPPORT</small>
          </span>
        </a>
        <nav className="site-nav" aria-label={t.support}>
          <a href="/" aria-current={path === '/' || path === '/track' ? 'page' : undefined}>
            {t.support}
          </a>
          <a href="/about" aria-current={path === '/about' ? 'page' : undefined}>
            {t.about}
          </a>
          <a
            href="/admin"
            className="owner-nav"
            aria-current={path === '/admin' ? 'page' : undefined}
          >
            {t.owner}
            <span aria-hidden="true">↗</span>
          </a>
        </nav>
        <div className="language-switch" role="group" aria-label={t.language}>
          <button lang="nl" aria-pressed={locale === 'nl'} onClick={() => setLocale('nl')}>
            NL
          </button>
          <span aria-hidden="true">/</span>
          <button lang="en" aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>
            EN
          </button>
        </div>
      </header>
    </>
  );
}
function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="site-footer">
      <div>
        <strong>
          KLFXT <span>OPEN SUPPORT</span>
        </strong>
        <p>{t.footerText}</p>
      </div>
      <div>
        <a href="/docs/README.html">{t.docsTitle}</a>
        <a href="/docs/privacy.html">{t.privacyPolicy}</a>
        <a href="/docs/SECURITY.html">{t.security}</a>
        <span>{t.version}</span>
      </div>
    </footer>
  );
}
function App() {
  const [locale, setLocale] = useState<Locale>('nl');
  const t = dictionaries[locale];
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await request<Config>('/api/config');
      setConfig(result);
      setLocale(result.language === 'en' ? 'en' : 'nl');
    } catch (cause) {
      setError(cause);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = `${config?.businessName || 'KLFXT'} · Open Support`;
  }, [locale, config]);
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      <Header businessName={config?.businessName} />
      {loading ? (
        <main id="main" tabIndex={-1} className="page-width">
          <Loading />
        </main>
      ) : !config ? (
        <main id="main" tabIndex={-1} className="page-width config-error">
          <Feedback message={errorText(error, t)} />
          <button className="button" onClick={() => void load()}>
            {t.retry}
          </button>
        </main>
      ) : path === '/admin' ? (
        <Admin />
      ) : path === '/track' ? (
        <Tracking />
      ) : path === '/about' ? (
        <About />
      ) : (
        <PublicIntake config={config} />
      )}
      <Footer />
    </LanguageContext.Provider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
