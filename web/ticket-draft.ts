import type { Priority, Status, Ticket } from './types';

export type PropertyFields = {
  status: Status;
  priority: Priority;
  assignee: string;
  bookingUrl: string;
  paymentUrl: string;
};
export type PropertyDraft = { baseVersion: number; values: PropertyFields };

export function receivePropertyDraft(
  current: PropertyDraft | null,
  ticket: Ticket,
  replace = false,
): PropertyDraft {
  // A background refresh must never authorise an older set of edited fields
  // against a newer server version. Only an intentional replacement rebases it.
  if (current && !replace) return current;
  return {
    baseVersion: ticket.version,
    values: {
      status: ticket.status,
      priority: ticket.priority,
      assignee: ticket.assignee || '',
      bookingUrl: ticket.booking_url || '',
      paymentUrl: ticket.payment_url || '',
    },
  };
}

export function propertyPatch(draft: PropertyDraft) {
  return {
    version: draft.baseVersion,
    ...draft.values,
    assignee: draft.values.assignee.trim(),
    bookingUrl: draft.values.bookingUrl.trim(),
    paymentUrl: draft.values.paymentUrl.trim(),
  };
}
