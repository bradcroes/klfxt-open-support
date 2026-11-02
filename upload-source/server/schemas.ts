import { z } from 'zod';
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
export const ticketSchema = z
  .object({
    name: text(2, 100),
    email: z
      .email()
      .max(200)
      .transform((v) => v.toLowerCase()),
    subject: text(3, 160).refine((v) => !/[\r\n]/.test(v)),
    message: text(10, 4000),
    locale: z.enum(['nl', 'en']).default('nl'),
    website: z.string().max(200).default(''),
  })
  .strict();
export const messageSchema = z
  .object({ message: text(1, 4000), internal: z.boolean().optional() })
  .strict();
export const updateSchema = z
  .object({
    version: z.number().int().positive(),
    status: z.enum(['open', 'in_progress', 'waiting', 'resolved']).optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    assignee: text(0, 100).optional(),
    bookingUrl: z.string().max(2048).optional(),
    paymentUrl: z.string().max(2048).optional(),
  })
  .strict();
