# Development

Start with [installation](installation.md). Use Node 24, the committed lockfile, a local D1 database, and synthetic records. Do not modify a live business deployment while developing this project.

## Commands

| Command                | What it does                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `npm ci`               | Installs the exact dependency tree from `package-lock.json`.                                        |
| `npm run setup:local`  | Generates local configuration, builds the UI, and applies local migrations.                         |
| `npm run dev`          | Runs Wrangler locally on loopback port 8787, serving built assets.                                  |
| `npm run db:local`     | Applies D1 migrations to local storage.                                                             |
| `npm run typecheck`    | Checks TypeScript without emitting files.                                                           |
| `npm run check:public` | Runs the repository's public-content checks. Review its scope; it is not a complete secret scanner. |
| `npm run check`        | Runs TypeScript, formatting, and public-content checks.                                             |
| `npm test`             | Runs the TypeScript-backed Node tests, serially.                                                    |
| `npm run build`        | Builds the React/Vite frontend into `dist/`.                                                        |
| `npm run verify:local` | Exercises the running local application; start `npm run dev` separately.                            |

Rebuild after frontend changes. Do not commit `dist/`, `.wrangler/`, `node_modules/`, `.dev.vars`, exports, or operational secrets.

## Structure and boundaries

- `web/`: React UI and NL/EN copy.
- `server/`: Hono Worker API and server-side validation/authentication.
- `migrations/`: D1 SQLite schema changes.
- `tests/`: behavior and security regression coverage.
- `scripts/`: repeatable setup, public checks, and local verification.
- `docs/`: setup, operation, API, privacy, and review material.

The [API contract](api-contract.md) is the integration reference. One deployment has one business and one owner. The generated owner key becomes an HttpOnly session; it is not a staff account system. A customer capability authorizes access to one customer-visible ticket. Treat internal-note separation, capability secrecy, exact-origin writes, rate limits, input bounds, optimistic edit conflicts, and resolved-only retention as required behavior.

When changing behavior, update the contract and both languages, add meaningful regression coverage, and verify affected browser flows. Use forward migrations; do not rewrite a migration already used by a deployment. Keep all SQL access scoped to the intended ticket and parameterized. Validate external links on the server as well as the UI.

## Continuous integration

The prepared GitHub workflow uses Node 24 and runs `npm ci`, `npm run check`, `npm test`, and `npm run build`. Actions are pinned to reviewed commit IDs. The workflow has read-only repository contents permission, does not persist checkout credentials, and contains no deployment job or production secrets. Its presence is not evidence that hosted CI has run. Dependabot proposes npm and GitHub Actions updates for human review; it does not automatically merge them.

## License choice

The owner approved Apache-2.0 on 2 November 2026. It permits commercial use and modification while explicitly addressing contributor patent grants, preserving notices, and marking modified files. MIT is shorter and also permissive, with a copyright/permission-notice requirement, but its text does not include Apache's express patent grant. Apache adds more redistribution obligations; the choice is not a promise of protection against every legal issue. Compare the authoritative [Apache-2.0 text](https://www.apache.org/licenses/LICENSE-2.0) and [MIT text](https://opensource.org/license/mit).

[LICENSE](../LICENSE) retains the complete official Apache-2.0 text unchanged, including its appendix. [NOTICE](../NOTICE) is attribution, not an extra license restriction; the owner approved Bradley Croes as the copyright holder. Review bundled dependency licenses and distinguish source-code permission from brand permission before release.

## Formatting and notifications

Run `npm run format` before contributing; `npm run check` includes `format:check`, strict TypeScript checking and the public-file scan. Automatic owner-email delivery stops after three attempts. An expired final-attempt lease becomes a visible failure. The authenticated retry action deliberately resets exhausted failed jobs; email remains disabled unless explicitly configured.
