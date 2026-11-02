import { useState } from 'react';
import type { FormEvent } from 'react';
import { json, request } from './api';
import { errorText, useLanguage } from './i18n';
import type { Config } from './types';
import { Feedback, IntegrationLinks } from './ui';

export function PublicIntake({ config }: { config: Config }) {
  const { locale, t } = useLanguage();
  const [fields, setFields] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    website: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{ reference: string; trackingToken: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState<'copied' | 'failed' | null>(null);
  const update = (key: keyof typeof fields, value: string) =>
    setFields((current) => ({ ...current, [key]: value }));
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (
      ![fields.name, fields.email, fields.subject, fields.message].every((value) => value.trim())
    ) {
      setError(t.required);
      return;
    }
    if (
      !event.currentTarget.checkValidity() ||
      fields.name.trim().length < 2 ||
      fields.subject.trim().length < 3 ||
      fields.message.trim().length < 10
    ) {
      setError(t.invalidInput);
      return;
    }
    setBusy(true);
    try {
      const result = await request<{ reference: string; trackingToken: string }>(
        '/api/tickets',
        json('POST', {
          ...fields,
          name: fields.name.trim(),
          email: fields.email.trim(),
          subject: fields.subject.trim(),
          message: fields.message.trim(),
          locale,
        }),
      );
      setReceipt(result);
      setFields({ name: '', email: '', subject: '', message: '', website: '' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (cause) {
      setError(errorText(cause, t));
    } finally {
      setBusy(false);
    }
  }
  const trackingLink = receipt
    ? `${window.location.origin}/track#${encodeURIComponent(receipt.trackingToken)}`
    : '';
  async function copy() {
    try {
      await navigator.clipboard.writeText(trackingLink);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }
  if (receipt)
    return (
      <main id="main" tabIndex={-1} className="receipt-page page-width">
        <section className="receipt-card">
          <div className="success-mark" aria-hidden="true">
            ✓
          </div>
          <p className="eyebrow">
            {t.reference} {receipt.reference}
          </p>
          <h1>{t.sentTitle}</h1>
          <p className="lead">{t.sentText}</p>
          <label className="field-label" htmlFor="tracking-link">
            {t.privateLink}
          </label>
          <input
            id="tracking-link"
            className="tracking-link"
            readOnly
            value={trackingLink}
            onFocus={(event) => event.currentTarget.select()}
          />
          <div className="button-row">
            <a className="button" href={trackingLink}>
              {t.openTicket} <span aria-hidden="true">↗</span>
            </a>
            <button className="button button-secondary" onClick={copy}>
              {copyStatus === 'copied' ? t.copied : t.copy}
            </button>
          </div>
          <Feedback message={copyStatus === 'failed' ? t.copyFailed : ''} />
          <p className="privacy-note">{t.secretLink}</p>
          <button
            className="text-button"
            onClick={() => {
              setReceipt(null);
              setCopyStatus(null);
            }}
          >
            {t.another} <span aria-hidden="true">→</span>
          </button>
        </section>
      </main>
    );
  return (
    <main id="main" tabIndex={-1} className="public-page page-width">
      <div className="public-heading">
        <p className="eyebrow">
          <span className="live-dot" aria-hidden="true" />
          {config.businessName}
        </p>
        <h1>{t.intakeTitle}</h1>
        <p className="lead">{t.intakeIntro}</p>
      </div>
      <div className="intake-layout">
        <section className="intake-form-card">
          <div className="section-heading">
            <span className="section-number" aria-hidden="true">
              01
            </span>
            <h2>{t.newRequest}</h2>
          </div>
          <form noValidate onSubmit={submit}>
            <fieldset disabled={busy}>
              <legend className="sr-only">{t.contactDetails}</legend>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="name">
                    {t.name} <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="name"
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                    value={fields.name}
                    onChange={(event) => update('name', event.target.value)}
                    placeholder={t.namePlaceholder}
                  />
                </div>
                <div className="field">
                  <label htmlFor="email">
                    {t.email} <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={200}
                    value={fields.email}
                    onChange={(event) => update('email', event.target.value)}
                    placeholder={t.emailPlaceholder}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="subject">
                  {t.subject} <span aria-hidden="true">*</span>
                </label>
                <input
                  id="subject"
                  required
                  minLength={3}
                  maxLength={160}
                  value={fields.subject}
                  onChange={(event) => update('subject', event.target.value)}
                  placeholder={t.subjectPlaceholder}
                />
              </div>
              <div className="field">
                <label htmlFor="message">
                  {t.message} <span aria-hidden="true">*</span>
                </label>
                <textarea
                  id="message"
                  required
                  minLength={10}
                  maxLength={4000}
                  rows={7}
                  value={fields.message}
                  onChange={(event) => update('message', event.target.value)}
                  placeholder={t.messagePlaceholder}
                />
              </div>
              <div className="honeypot" aria-hidden="true">
                <label htmlFor="website">{t.website}</label>
                <input
                  id="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={fields.website}
                  onChange={(event) => update('website', event.target.value)}
                />
              </div>
              <Feedback message={error} />
              <button className="button submit-button" type="submit">
                {busy ? t.submitting : t.submit}
                <span aria-hidden="true">↗</span>
              </button>
              <p className="privacy-note">
                <span aria-hidden="true">◇</span>
                {t.privacy}
              </p>
            </fieldset>
          </form>
        </section>
        <aside className="intake-aside">
          <div className="aside-kicker">
            KLFXT <span>OPEN SUPPORT</span>
          </div>
          <h2>{t.singleBusiness}</h2>
          <div className="benefit">
            <span aria-hidden="true">01</span>
            <div>
              <h3>{t.private}</h3>
              <p>{t.privateText}</p>
            </div>
          </div>
          <div className="benefit">
            <span aria-hidden="true">02</span>
            <div>
              <h3>{t.direct}</h3>
              <p>{t.directText}</p>
            </div>
          </div>
          <div className="benefit">
            <span aria-hidden="true">03</span>
            <div>
              <h3>{t.follow}</h3>
              <p>{t.followText}</p>
            </div>
          </div>
          {config.supportEmail && (
            <div className="direct-contact">
              <p>{t.businessContact}</p>
              <a href={`mailto:${config.supportEmail}`}>
                {config.supportEmail} <span aria-hidden="true">↗</span>
              </a>
            </div>
          )}
        </aside>
      </div>
      <IntegrationLinks booking={config.bookingUrl} payment={config.paymentUrl} />
    </main>
  );
}
