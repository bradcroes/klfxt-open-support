# Release checklist

Status: **pre-release alpha; public contents, Apache-2.0, Bradley Croes attribution and public repository creation approved by the owner on 2 November 2026**. The public repository has been created using the owner’s existing GitHub browser session; source upload and hosted CI verification are in progress. No deployment, stable release, production test, or community adoption is asserted. Check an item only after reviewing evidence for the exact version being released.

## Contents and permission

- [x] Owner reviews and explicitly approves the concrete source, documentation, screenshots, and public file bundle.
- [x] Owner explicitly approves Apache-2.0 or selects another license before publication. Keep the official license text intact; confirm the `NOTICE` copyright holder and attribution.
- [x] Review dependency licenses and any asset attribution. Confirm no copied private business code, client data, restricted assets, or unapproved branding.
- [x] Scan the public bundle and history for credentials, `.dev.vars`, local state, exports, customer data, tokens, account identifiers, and operational configuration. Inspect public-check results rather than relying on the script alone.
- [x] Use only synthetic screenshots; inspect addresses, browser fragments, notes, file paths, and terminal output for secrets.
- [x] Approve the real repository name, visibility, owner, and description. Add the actual repository URL only after creation; no guessed `bradcroes` URL.
- [x] Confirm the publication action itself is explicitly authorized. Do not create a repository, push, publish a package/site, or submit an application before approval.

## Local verification

- [x] Run `npm ci` on Node 24 from the committed lockfile.
- [x] Run `npm run setup:local` in an isolated local environment; confirm secrets remain ignored and migrations remain local.
- [x] Run `npm run check`, `npm test`, and `npm run build`; record actual results below.
- [x] Run `npm run dev` and `npm run verify:local`; record the actual local journey and version.
- [x] Review NL/EN intake, validation, errors, tracking, owner workflow, customer search, and mobile/keyboard usability.
- [x] Verify customer/internal-note isolation, capability handling, unauthorized writes, exact-origin/CSRF checks, login/logout/expiry, missing-secret behavior, rate limits, request limits, and edit conflicts.
- [x] Verify allowed/blocked external links and that no booking or payment completion is inferred.
- [x] Verify disabled mail sends nothing, provider failure does not lose tickets, and optional retries do not disclose credentials.
- [x] Verify resolved-only retention and related-record deletion; confirm unresolved requests survive.

## Hosted operation — separate approval

- [ ] Approve a new, dedicated Worker/database/account target and costs; confirm no existing KlikGefixt resources are reused.
- [ ] Approve the HTTPS hostname/route and production configuration; retain `DEV_MODE=false`, exact `APP_ORIGIN`, and fresh independent secrets.
- [ ] Review the business privacy notice, provider arrangements, backup/deletion plan, incident contact, and recovery procedure.
- [ ] Enable owner email only if separately approved and tested; confirm no automatic customer email.
- [ ] Apply reviewed remote migrations and deploy only after authorization; record resource identity privately.
- [ ] Verify the actual hosted version using synthetic requests, HTTPS cookies, headers, authorization boundaries, and scheduled cleanup. Record results; local checks alone do not establish hosted readiness.

## Release record

| Field                                                  | Evidence                                                                                                                                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Commit or source-bundle identity                       | Source-only publication ZIP; exact public file manifest in `PUBLIC-FILES.md`, checksum supplied alongside the ZIP. Identify a checkout with `git rev-parse HEAD`; repository upload and hosted CI verification are in progress. |
| Node/npm versions and verification date                | Node 24.21.0, npm 11.19.0; 2 November 2026.                                                                                                                                                                                     |
| Check/test/build/local-journey results                 | Passed: strict types, formatting, public scan, 17 tests, production build, 9 local journey checks, local migration, and Worker dry run. Separate clean-folder locked install/check/test/build/local migration also passed.      |
| Security review and unresolved limitations             | Source review plus regression checks; no independent audit. See [verification](verification.md) for tested boundaries and untested production operations. Mail-provider tests use a mock.                                       |
| Owner contents/license approval                        | Approved 2 November 2026: reviewed public files, Apache-2.0 and Bradley Croes attribution.                                                                                                                                      |
| Publication approval and actual repository/release URL | Public bradcroes/klfxt-open-support creation approved 2 November 2026. Repository created at https://github.com/bradcroes/klfxt-open-support; source upload and hosted CI verification are in progress.                         |
| Hosted approval and verification, if applicable        | Pending; hosting is optional and separate.                                                                                                                                                                                      |

Before release, update `CHANGELOG.md` with verified behavior and an actual date. Retain explicit limitations and the absence of an SLA. Do not invent badges, testimonials, contributors, customers, stars, certification, or eligibility claims.
