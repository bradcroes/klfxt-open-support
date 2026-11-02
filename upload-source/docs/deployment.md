# Hosted deployment

**Not deployed.** This is a runbook for a future, separately approved deployment. The owner approved source publication and Apache-2.0 on 2 November 2026. The target account, new resource names, cost exposure, and hostname still require explicit approval before remote creation or deployment. The supplied configuration is local-only and must not be deployed as-is.

Use a new Worker and a new D1 database dedicated to this project. Never reuse an existing KlikGefixt Worker, database, binding, email key, route, DNS record, or production secret. Do not point a review build at live customer records.

## Prepare a reviewable configuration

First complete local [installation](installation.md), verification, and the [release checklist](release-checklist.md). Review provider limits and pricing with the account owner. Cloudflare's [D1 getting started guide](https://developers.cloudflare.com/d1/get-started/) and [Wrangler command reference](https://developers.cloudflare.com/workers/wrangler/commands/) describe resource creation and deployment.

Prepare a separate `wrangler.production.jsonc` in the project root, based on the local configuration. Keep account-specific configuration in private operational records and out of the public review bundle. Before any command uses it, review:

- A new, approved Worker `name` and a new D1 database bound as `DB`, with the actual newly created database ID and `migrations_dir: "migrations"`.
- The same `main`, asset directory/binding, SPA asset behavior, and compatibility date as the reviewed application.
- Exactly one approved HTTPS origin, configured as `APP_ORIGIN`, and `DEV_MODE: "false"`.
- Correct public business identity, support contact, `DEFAULT_LANGUAGE`, and initial `RETENTION_DAYS` from 30 to 730.
- `MAIL_MODE: "disabled"` for the first deployment. Optional default booking/payment links must pass the application's allowlist.
- Only the explicitly approved route or hostname. `workers_dev` is disabled in the supplied local config; do not enable a public hostname by accident.
- The daily retention schedule and the operator's responsibility for monitoring it. Review logging settings for personal data and credentials.

Do not place access keys or provider API keys in `vars` or committed files. Cloudflare documents [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/) separately from public configuration.

## Remote commands — only after explicit approval

The following commands change the remote account. They are documentation, not actions performed by this project. Use the owner-approved account and final names; the example database name is illustrative.

```sh
npx wrangler login
npx wrangler whoami
npx wrangler d1 create klfxt-open-support-production
```

Stop and confirm the returned account and new database ID match the approved plan. Put only that new ID in the separate production configuration. Generate two new independent 32-byte random secrets in a password manager; do not reuse local keys or store them in shell history. Use interactive secret input:

```sh
npx wrangler secret put ADMIN_ACCESS_KEY --config wrangler.production.jsonc
npx wrangler secret put RATE_LIMIT_SECRET --config wrangler.production.jsonc
npm run build
npx wrangler d1 migrations apply klfxt-open-support-production --remote --config wrangler.production.jsonc
npx wrangler deploy --config wrangler.production.jsonc
```

Secret commands can create or update a Worker, so they belong after account/resource approval too. Keep the administrator key in the owner's password manager. `npm run db:local` never substitutes for the explicit remote migration command.

## Verify before real intake

At the approved HTTPS hostname, verify public intake, private tracking, owner login/logout, customer/internal-note separation, both languages, error handling, and mobile layout using synthetic records. Inspect cookie flags, security headers, and exact-origin checks. Confirm missing secrets fail closed. Confirm a customer view never exposes email, internal notes, assignment, priority, or capability hashes. Record checks against the actual deployed version; do not infer them from a successful build.

Test resolved-ticket retention with synthetic aged data and confirm unresolved requests survive. Decide how backups are protected and deleted; a database deletion does not remove separate exports or provider backups. Establish a restoration and incident procedure before accepting real personal data. See [privacy](privacy.md) and [security](../SECURITY.md).

Optional Resend delivery requires separate owner approval, a dedicated key, an authorized sender in `MAIL_FROM`, and `NOTIFY_EMAIL`. Set `MAIL_MODE=resend` only after testing. It notifies the owner through the outbox; it does not automatically email customers. Booking/payment links need no provider API keys and do not confirm completion.

## Updates and rollback

Back up the dedicated database privately and review migrations before applying an update. Verify a new build locally first. Keep the previous reviewed Worker version and a database recovery plan; rolling back Worker code does not reverse a schema migration. Confirm compatibility before rollback. CI has no deploy job or production credentials: every hosted change remains an explicit operator action.
