# Privacy and data handling

This guide describes the intended v0.1 data flow and operator review duties. It is not a certification or a ready-to-publish privacy notice for every business. Before real intake, the deploying business must review the implementation, its providers, notices, access, retention, and applicable requirements. No GDPR certification or automatic compliance is claimed.

## What is processed

| Data                                               | Purpose and access                                                                                                         |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Customer name, email, subject, and message         | Request handling; visible to the owner. Do not request passwords, payment-card data, or unnecessary sensitive information. |
| Reference, status, timestamps, and public messages | Customer follow-up through the tracking capability; also visible to the owner.                                             |
| Priority, assignment label, and internal notes     | Owner workflow only; excluded from customer tracking responses.                                                            |
| Capability hash and session records                | Customer and owner access. Raw tracking capabilities must not be stored as application records or logged.                  |
| Rate-limit and audit records                       | Abuse prevention and operational accountability; minimize contents and review cleanup behavior.                            |
| Optional notification outbox                       | Owner notification delivery status and retries; provider use requires explicit configuration.                              |

The customer directory is derived from ticket contact information. It is not a separate marketing contact list. There is no public customer search, staff directory, or cross-business data sharing in the MVP. The server processes the connecting IP to derive keyed, time-bucketed rate-limit identifiers; the application rate-limit table stores those derived identifiers rather than the raw IP. Provider infrastructure can have separate request logs.

## Customer tracking

After submission the customer receives a tracking link containing a random bearer capability in the URL fragment (`/track#…`). Anyone with that link can read the public history and reply for that request. The fragment is handled by the browser; the application sends the capability in an Authorization header for tracking API calls. Do not add analytics or third-party scripts that could read it, move it to a query string/path, or store it in localStorage.

Keep the link private, and avoid full-address screenshots. No customer email is sent automatically, so the customer must save the link. There is no promised recovery/rotation workflow for a lost or exposed capability in v0.1. Contact the business through its published support contact for help.

The customer view excludes email addresses, internal notes, assignment, priority, and token hashes. Verify this boundary after changes; calling a note “internal” is insufficient without server-side filtering.

## Sessions, providers, and links

Owner login creates an eight-hour HttpOnly session cookie; production uses Secure and SameSite=Strict. The cookie supports owner authentication. No marketing-cookie or tracking service is included in the documented MVP. Provider infrastructure may keep its own operational records, which the deploying business must review.

Local development uses local D1 storage. A hosted deployment uses the separately approved Cloudflare Worker and D1 database. Optional Resend notifications send configured owner notifications through a separate provider key; `MAIL_MODE=disabled` is the default. Review notification content and recipient before enabling delivery. The application does not automatically email customers.

Calendly and Stripe hosted links send the visitor to those providers when clicked. Review the destination and tell customers what to expect. The application does not collect card details, create a charge, receive payment webhooks, or infer a booking/payment result.

## Retention and deletion

The owner can configure 30–730 days of resolved-ticket retention, measured from the recorded resolution time. A scheduled daily purge and an owner-confirmed manual purge remove resolved requests beyond that window, including their messages and outbox records. A new customer reply reopens a resolved request and clears its resolution date. Open, in-progress, and waiting requests are not automatically deleted by that rule. Operational cleanup also removes expired sessions and rate buckets; audit entries use the same age cutoff as the configured retention period. A recent audit entry can remain without a ticket link until its own cutoff. Confirm cleanup behavior before production use.

Changing the retention value affects future purge decisions. A purge is destructive. Review the count and scope with synthetic data before enabling real intake. Retention in the application does not remove separately held backups, exports, email-provider records, or messages forwarded by people. Set access and deletion rules for those copies separately.

## Operator checklist

Publish a business-specific notice covering who operates the desk, the purpose of processing, the providers actually enabled, contact details, and how people can request access, correction, or deletion. Do not describe an unimplemented self-service export/delete feature. Route requests through the business's support contact and verify identity through a suitable private process.

Limit provider-account access, protect secrets and backups, review unresolved requests regularly, and avoid personal data in logs or public issue reports. Keep screenshots and demonstrations synthetic. Review [SECURITY.md](../SECURITY.md) for incident handling and [deployment](deployment.md) before hosting.
