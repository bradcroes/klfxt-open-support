# Security policy

This pre-release project has no production security certification, paid security support, or response-time SLA. A published supported-version policy will be established with the first approved release; until then, reports against the current review copy are welcome.

## Report privately

Email [klikgefixt@gmail.com](mailto:klikgefixt@gmail.com) with the subject `KLFXT Open Support security report`. Include the affected commit/version, the issue, impact, reproduction steps using synthetic data, and a suggested fix if available. Do not open a public issue containing exploit details, customer records, active tracking links, keys, or session cookies. This mailbox is not an encrypted reporting channel; ask for an appropriate exchange method before sending sensitive evidence.

Maintainers will assess reports as capacity permits and coordinate disclosure after a fix where practical. Do not test against systems you do not own or lack permission to test. There is no announced bug bounty.

## Security model

- Each deployment serves one business and one owner. The owner access key is an independently generated 32-byte random value encoded as 43 base64url characters. It is a deployment secret, not a human password. A successful login creates an eight-hour HttpOnly session; production cookies must be Secure and SameSite=Strict.
- Same-origin checks protect writes, including owner login and public intake. Production `APP_ORIGIN` must exactly match the HTTPS origin used by customers and the owner.
- The customer tracking capability grants access to the customer-visible history and replies for one ticket. It is hashed at rest. Keep it in the URL fragment and Authorization header; never move it into a query string, server path, localStorage, logs, or analytics.
- Internal notes, customer email addresses, priority, and assignment labels are owner-only data. Assignment does not restrict another user: there are no staff accounts in this MVP.
- Public links are restricted to approved HTTPS Calendly and Stripe hosted-link domains. A click does not prove a booking or payment succeeded.
- Rate limiting and input validation reduce abuse; neither makes a deployment immune to abuse. Review deployment limits and access controls before accepting real customer data.

## Operator actions

Keep `.dev.vars`, provider credentials, local state, exports, and backups out of version control. Generate separate production secrets; do not reuse demonstration keys. Keep dependencies and the Worker runtime current, restrict provider account access, and review retention and backups.

If an owner key or session is exposed, restrict access to the affected deployment, rotate the key, remove affected session records, and verify that old credentials and sessions are rejected before reopening. The current session lookup binds sessions to the administrator key hash, so key rotation is intended to reject existing sessions on their next authenticated request; verify this on the deployed version. If a customer capability is exposed, treat that ticket as compromised and arrange remediation with the owner; this MVP does not promise a self-service capability rotation or recovery workflow.

See [privacy](docs/privacy.md), [deployment](docs/deployment.md), and the [release checklist](docs/release-checklist.md) for operational review items.
