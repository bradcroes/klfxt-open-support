# Local installation

These steps prepare an isolated local review. They do not create a Cloudflare database, Worker, domain, repository, or email account. Use synthetic data. The owner approved the source publication and Apache-2.0 license on 2 November 2026. Hosted resources require separate owner approval.

## Requirements

- Node.js 24 and npm. The package declares Node `>=24`; CI uses Node 24.
- Git and a local checkout or approved source archive. For an extracted archive, run `git init` in its root before the public-file check. Clone the [public repository](https://github.com/bradcroes/klfxt-open-support) or use its source download.
- A browser and an available local port 8787.
- Network access to install dependencies. The local Worker and D1 run through the project's Wrangler dependency; production Cloudflare credentials are not required for the documented local workflow.

## First run

In the project directory:

```sh
git clone https://github.com/bradcroes/klfxt-open-support.git
cd klfxt-open-support
npm ci
npm run setup:local
npm run dev
```

`setup:local` runs the local setup script, builds the interface, and applies D1 migrations using `--local`. It generates independent 32-byte random administrator and rate-limit secrets in the ignored `.dev.vars`. Keep existing local credentials private; inspect the script before intentionally resetting a local environment. The all-zero D1 identifier in `wrangler.jsonc` is a placeholder for local use, not a real resource.

Open [http://localhost:8787](http://localhost:8787), using `localhost` consistently. The dev server binds to loopback (`127.0.0.1`); `APP_ORIGIN` is `http://localhost:8787`. Visiting a different origin can fail the write-origin checks. Do not expose this development server to the public Internet.

Open `.dev.vars` privately in your editor or password manager and use `ADMIN_ACCESS_KEY` at `/admin`. Do not print credentials into shared terminals, include them in screenshots, or upload the file. This key is a generated deployment secret, not a memorable password. Customer tracking links are also sensitive.

## Configuration

Use `.dev.vars.example` as the field reference. `.env.example` is also illustrative; Wrangler's documented local workflow uses `.dev.vars`. Neither example is a credentials file.

| Setting                                       | Local purpose                                                              |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| `APP_ORIGIN`                                  | Exact browser origin; default `http://localhost:8787`.                     |
| `DEV_MODE`                                    | `true` only for local HTTP. Hosted deployments must use `false`.           |
| `ADMIN_ACCESS_KEY`                            | Independent random 256-bit key, encoded as 43 base64url characters.        |
| `RATE_LIMIT_SECRET`                           | A separate random 256-bit secret for rate-limit identifiers.               |
| `BUSINESS_NAME`, `SUPPORT_EMAIL`              | Public business identity and contact details; use examples for review.     |
| `DEFAULT_LANGUAGE`                            | `nl` or `en`; the interface supports both languages.                       |
| `RETENTION_DAYS`                              | Initial resolved-ticket retention, 30–730 days; example default 90.        |
| `BOOKING_URL`, `PAYMENT_URL`                  | Optional approved HTTPS hosted links; blank disables the default link.     |
| `MAIL_MODE`                                   | Keep `disabled` for local review.                                          |
| `RESEND_API_KEY`, `MAIL_FROM`, `NOTIFY_EMAIL` | Leave blank unless owner notification delivery is deliberately configured. |

Booking links must use `https://calendly.com`. Payment links must use `https://buy.stripe.com` or `https://checkout.stripe.com`. These links open provider pages; their presence does not implement booking or payment synchronization.

## Check the flow

Create a synthetic request, save its tracking link privately, reply as the customer, then sign in as the owner. Add a public reply and an internal note, change the status, and confirm the customer sees only public history. Log out and verify the owner desk requires login again.

```sh
npm run check
npm test
npm run build
```

With `npm run dev` running in a separate terminal:

```sh
npm run verify:local
```

Record actual results in the [release checklist](release-checklist.md). These instructions are not a statement that verification has passed on your machine.

## Everyday changes and troubleshooting

`npm run dev` serves the built assets. After changing the frontend, run `npm run build` and refresh; it is not a Vite hot-reload command. Apply new local migrations with `npm run db:local`. Stop the server with Ctrl+C.

If setup fails, check Node/npm versions and the command output, resolve the cause, then rerun setup. If writes return an origin error, use the exact configured origin and restart after editing `.dev.vars`. If login fails, check the generated key privately; do not replace it with a short password. If port 8787 is busy, stop the conflicting local process or update the port and `APP_ORIGIN` together.

Local D1 state lives under `.wrangler/`; it may contain customer-like records and remains private. Back up needed local data before any reset. Removing local state is destructive and is not part of ordinary installation.
