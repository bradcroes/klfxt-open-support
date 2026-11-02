import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import type { Env } from '../server/types';
export function database() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../migrations/0001_initial.sql', import.meta.url), 'utf8'));
  function prepare(query: string) {
    let args: any[] = [];
    const stmt = {
      bind(...values: any[]) {
        args = values;
        return stmt;
      },
      async first<T>(column?: string) {
        const r = sql.prepare(query).get(...args) as any;
        return r ? ((column ? r[column] : r) as T) : null;
      },
      async all() {
        return { success: true, results: sql.prepare(query).all(...args), meta: {} };
      },
      async run() {
        const r = sql.prepare(query).run(...args);
        return { success: true, meta: { changes: Number(r.changes) } };
      },
    };
    return stmt;
  }
  const db = {
    prepare,
    async batch(statements: any[]) {
      sql.exec('BEGIN');
      try {
        const results = [];
        for (const s of statements) results.push(await s.run());
        sql.exec('COMMIT');
        return results;
      } catch (e) {
        sql.exec('ROLLBACK');
        throw e;
      }
    },
  } as unknown as D1Database;
  const env = {
    DB: db,
    ASSETS: {
      fetch: async () =>
        new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } }),
    },
    APP_ORIGIN: 'http://localhost:8787',
    DEV_MODE: 'true',
    ADMIN_ACCESS_KEY: 'A'.repeat(43),
    RATE_LIMIT_SECRET: 'B'.repeat(43),
    BUSINESS_NAME: 'Example Studio',
    MAIL_MODE: 'disabled',
  } as unknown as Env;
  return { env, sql, close: () => sql.close() };
}
