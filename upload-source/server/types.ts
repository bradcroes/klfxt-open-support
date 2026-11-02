export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_ORIGIN: string;
  DEV_MODE?: string;
  ADMIN_ACCESS_KEY: string;
  RATE_LIMIT_SECRET: string;
  BUSINESS_NAME?: string;
  DEFAULT_LANGUAGE?: string;
  SUPPORT_EMAIL?: string;
  BOOKING_URL?: string;
  PAYMENT_URL?: string;
  RETENTION_DAYS?: string;
  MAIL_MODE?: string;
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
  NOTIFY_EMAIL?: string;
}
export type AppEnv = { Bindings: Env; Variables: { sessionHash: string } };
export type Ticket = {
  id: string;
  reference: string;
  token_hash: string;
  name: string;
  email: string;
  subject: string;
  status: string;
  priority: string;
  assignee: string;
  booking_url: string;
  payment_url: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  version: number;
  last_change_id: string;
};
