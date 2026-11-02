# MVP API contract

All API responses JSON; errors `{error: string}` with appropriate HTTP status. Writes require same-origin `Origin` matching configured APP_ORIGIN. Cookie is HttpOnly/SameSite=Strict/Secure in production, 8h expiry. Login key is 43-character base64url random 256-bit deployment secret, not a user password. CSRF checks also apply to login/public form. One owner, assignee is a label only.

GET /api/config -> `{businessName, language, supportEmail, bookingUrl, paymentUrl, retentionDays}`.
POST /api/tickets `{name,email,subject,message,locale,website:""}` -> 201 `{reference,trackingToken,notification}`. Store token in fragment `/track#TOKEN`, never query/path/localStorage. No customer email is sent automatically in this MVP.
GET /api/track with `Authorization: Bearer TOKEN` -> `{ticket:{reference,subject,status,created_at,updated_at,booking_url,payment_url},messages:[{id,body,author,created_at}]}`. Only customer-visible messages. Never customer email, notes, assignee, token hash or priority.
POST /api/track/messages same Bearer, `{message}` -> 201 `{ok:true}`.
POST /api/admin/login `{accessKey}` -> `{ok:true}` + cookie. GET /api/admin/session -> `{authenticated:true}` or 401. POST /api/admin/logout -> `{ok:true}`.
GET /api/admin/tickets?status=&q=&page=1 -> `{tickets,total,page,pageSize:25,stats:{open,in_progress,waiting,resolved,total},customers}`. Ticket fields: id, reference, name, email, subject, status, priority, assignee, created_at, updated_at, version, booking_url,payment_url. Page filter/search, totals stats unfiltered.
GET /api/admin/tickets/:id -> `{ticket,messages:[{id,body,author,visibility,created_at}],notifications:[{status,attempts,created_at}]}`.
PATCH /api/admin/tickets/:id `{version,status?,priority?,assignee?,bookingUrl?,paymentUrl?}` -> `{ok:true}`. Conflict 409: refetch. Status open/in_progress/waiting/resolved. Priority low/normal/high/urgent. Link blank clears; booking must https://calendly.com; payment https://buy.stripe.com or checkout.stripe.com. No status/booking/payment completion inferred from clicks.
POST /api/admin/tickets/:id/messages `{message,internal:boolean}` -> 201 `{ok:true}`; refetch ticket after every mutation. Authors customer/owner; public history excludes internal notes.
GET /api/admin/customers?q= -> `{customers:[{name,email,tickets,last_contact}]}` (read-only directory, max50).
GET /api/admin/settings -> `{retentionDays}`. PUT same endpoint `{retentionDays:30..730}` -> `{ok:true}`.
POST /api/admin/retention/run -> `{deleted:number}` for resolved tickets past retention only. Scheduled daily purge also removes expired sessions/rate buckets and old audit entries. Owner confirms before manual purge.
POST /api/admin/notifications/retry -> `{processed:number}`. This deliberate owner action resets exhausted failed jobs before retry. Expired final-attempt leases become failed; automatic delivery stops after three attempts. No outbound notifications unless MAIL_MODE=resend and separate RESEND_API_KEY, MAIL_FROM, NOTIFY_EMAIL configured. Never expose provider failure text/credentials.

UI routes: / support form, /track#token customer view, /admin owner desk, /about product explanation/docs links. `/docs/` copied public markdown documentation. Source repository: https://github.com/bradcroes/klfxt-open-support. The public repository does not imply a hosted support service.
