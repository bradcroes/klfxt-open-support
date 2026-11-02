export type Locale = 'nl' | 'en';
export type Status = 'open' | 'in_progress' | 'waiting' | 'resolved';
export type Priority = 'low' | 'normal' | 'high' | 'urgent';
export type Config = {
  businessName: string;
  language: Locale;
  supportEmail: string;
  bookingUrl: string;
  paymentUrl: string;
  retentionDays: number;
};
export type Ticket = {
  id: string;
  reference: string;
  name: string;
  email: string;
  subject: string;
  status: Status;
  priority: Priority;
  assignee: string;
  created_at: string;
  updated_at: string;
  version: number;
  booking_url: string | null;
  payment_url: string | null;
};
export type Message = {
  id: string;
  body: string;
  author: 'customer' | 'owner';
  visibility?: 'public' | 'internal';
  created_at: string;
};
export type Customer = { name: string; email: string; tickets: number; last_contact: string };
export type TicketList = {
  tickets: Ticket[];
  total: number;
  page: number;
  pageSize: number;
  stats: Record<Status | 'total', number>;
  customers: number;
};
export type TicketDetail = {
  ticket: Ticket;
  messages: Message[];
  notifications: { status: string; attempts: number; created_at: string }[];
};
export type TrackingDetail = {
  ticket: Pick<
    Ticket,
    'reference' | 'subject' | 'status' | 'created_at' | 'updated_at' | 'booking_url' | 'payment_url'
  >;
  messages: Message[];
};
