import { useLanguage } from './i18n';
import { DocumentLinks } from './ui';

export function About() {
  const { t } = useLanguage();
  return (
    <main id="main" tabIndex={-1} className="about-page page-width">
      <section className="about-hero">
        <p className="eyebrow">{t.aboutEyebrow}</p>
        <h1>{t.aboutTitle}</h1>
        <p className="lead">{t.aboutIntro}</p>
        <div className="button-row">
          <a className="button" href="/">
            {t.aboutStart}
            <span aria-hidden="true">↗</span>
          </a>
          <a className="text-button" href="/docs/README.html">
            {t.aboutDocs} <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className="about-motif" aria-hidden="true">
          <div className="motif-line" />
          <div className="motif-square motif-one">01</div>
          <div className="motif-square motif-two">↗</div>
          <div className="motif-square motif-three">✓</div>
        </div>
      </section>
      <div className="about-principles">
        <section>
          <span className="section-number" aria-hidden="true">
            01
          </span>
          <h2>{t.builtForTitle}</h2>
          <p>{t.builtForText}</p>
        </section>
        <section>
          <span className="section-number" aria-hidden="true">
            02
          </span>
          <h2>{t.independentTitle}</h2>
          <p>{t.independentText}</p>
        </section>
        <section>
          <span className="section-number" aria-hidden="true">
            03
          </span>
          <h2>{t.scopeTitle}</h2>
          <p>{t.scopeText}</p>
        </section>
      </div>
      <section className="about-local">
        <div>
          <p className="eyebrow">{t.docsTitle}</p>
          <h2>{t.localTitle}</h2>
          <p>{t.localText}</p>
        </div>
        <DocumentLinks />
      </section>
      <section className="contributing-block">
        <div>
          <h2>{t.contributingTitle}</h2>
          <p>{t.contributingText}</p>
        </div>
        <a
          className="repo-pending"
          href="https://github.com/bradcroes/klfxt-open-support"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="live-dot" aria-hidden="true" />
          {t.repositoryLink}
        </a>
      </section>
    </main>
  );
}
