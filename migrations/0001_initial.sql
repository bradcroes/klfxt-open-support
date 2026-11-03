PRAGMA foreign_keys = ON;
CREATE TABLE tickets (
 id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE, token_hash TEXT NOT NULL UNIQUE,
 name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','waiting','resolved')),
 priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
 assignee TEXT NOT NULL DEFAULT '', booking_url TEXT NOT NULL DEFAULT '', payment_url TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, resolved_at TEXT,
 version INTEGER NOT NULL DEFAULT 1, last_change_id TEXT NOT NULL
);
CREATE INDEX tickets_queue ON tickets(status, updated_at DESC);
CREATE INDEX tickets_customer ON tickets(email);
CREATE TABLE messages (
 id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
 author TEXT NOT NULL CHECK(author IN ('customer','owner')),
 visibility TEXT NOT NULL CHECK(visibility IN ('public','internal')), body TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX messages_ticket ON messages(ticket_id,created_at);
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY, key_hash TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE rate_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE audit_log (
 id TEXT PRIMARY KEY, ticket_id TEXT REFERENCES tickets(id) ON DELETE SET NULL,
 action TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE outbox (
 id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','failed')),
 attempts INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL, provider_id TEXT
);
