# Verification record

Review date: **2 November 2026**. Version: **0.1.0 pre-release alpha**. The local review below was followed by source publication and GitHub CI verification on 3 November 2026. These checks do not establish hosted production operation or independent security certification. The owner approved the public contents and Apache-2.0 license on 2 November 2026. The exact public files are listed in `PUBLIC-FILES.md`; the review archive has a separate SHA-256 checksum.

## Completed checks

- Node.js 24.21.0 and npm 11.19.0 were used. A separate clean source folder completed a locked `npm ci --offline`, type/format/public checks, all 17 tests, frontend/documentation build, fresh-secret setup, and local migration. The offline install used the local package cache; a new adopter needs registry access. The sandbox required a local-only permission override for Wrangler logs and its loopback socket.
- Strict TypeScript, Prettier, and the public-file scanner passed. The scanner checks the Git-visible file set; a manual review also excluded local secrets, databases, internal research, and operational configuration.
- All **17 automated tests passed** against the API, real SQLite transactions, mocked notification delivery, and owner-editor state.
- The production frontend and 16 script-free documentation pages built successfully; 122 local document references were checked without missing files or heading targets. A Wrangler deployment dry run bundled the Worker without uploading or creating remote resources.
- Local D1 migrations applied successfully. The running local Worker passed **nine journey checks**: anonymous owner access denied; ticket saved with mail disabled; private customer access; owner session creation; ticket edits/replies/notes and conflicts; internal-note separation; customer search; logout revocation; and frontend/documentation headers.
- Manual browser review covered Dutch and English intake, customer replies, owner replies and internal notes, status/priority/assignment, stale-edit recovery, customer search, and retention settings using synthetic data.
- Intake and ticket-detail layouts were reviewed at 320, 768, 1024, and 1440 CSS pixels. The owner dashboard was also rechecked at all four widths with no document overflow; its table uses a contained horizontal scroll area on narrow screens. Customer/settings views were also checked at 320 pixels. A keyboard skip-link regression was corrected and manually checked to preserve the tracking capability while focusing the main content.
- Screenshots contain synthetic records and example.com addresses. Displayed counters are demo data, not evidence of adoption.

## Regression and security coverage

Tests cover capability isolation, customer/internal-note separation, missing configuration, unauthorized requests, exact-origin writes, session expiry and rotation, input and streaming byte bounds, atomic rate limits, approved external-link hosts, no-store/framing headers, resolved-only retention and related-record cleanup. A customer reply reopens a resolved request before retention can remove the active conversation.

Notification tests simulate provider failure and concurrent delivery: tickets remain stored, customer content is not sent in the notification, retries use an idempotency key, exhausted leases become visible failures, and a deliberate owner retry recovers an exhausted job. Editor tests ensure refreshes and replies cannot silently overwrite another version while preserving a local property draft. A subsequent source review found no remaining high- or medium-priority finding in the reviewed scope; this does not establish absence of vulnerabilities.

## Source publication and GitHub CI — 3 November 2026

The [public repository](https://github.com/bradcroes/klfxt-open-support) contains all 66 approved files. After restoring their intended paths, every content hash and file mode matched the reviewed source snapshot. The resulting source tree was `766801f87ebaf596c871fe428ad212d6befe1440`, merged in [pull request #1](https://github.com/bradcroes/klfxt-open-support/pull/1).

[Push CI](https://github.com/bradcroes/klfxt-open-support/actions/runs/41674304491), [pull-request CI](https://github.com/bradcroes/klfxt-open-support/actions/runs/41674304737), and [main-branch CI](https://github.com/bradcroes/klfxt-open-support/actions/runs/41674482892) passed. Each ran a locked dependency installation on Node 24, strict TypeScript, formatting, public-file checks, all 17 automated tests, and the production build. These are source-validation checks; they do not deploy the application. Subsequent documentation updates record this evidence without changing application behavior.

## Not established by these checks

No versioned GitHub release, hosted deployment, production database, HTTPS end-to-end session test, scheduled production cleanup, real email delivery, payment, booking, backup restoration, external penetration test, or real-user pilot has been completed for this project. Provider delivery is mocked in automated tests; outgoing mail stays disabled locally.

The MVP supports one business and one owner per deployment. It has no staff accounts, attachments, inbound mailbox integration, automatic customer email, payment/booking synchronization, customer self-service export, or tracking-link recovery. Hosting and real personal-data intake require the separate operational checks in the [deployment runbook](deployment.md) and [release checklist](release-checklist.md).
