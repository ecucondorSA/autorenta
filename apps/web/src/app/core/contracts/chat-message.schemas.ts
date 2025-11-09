import { z } from 'zod';

// Schema compatible con la estructura actual de la tabla messages
export const ChatMessageInsertSchema = z
  .object({
    sender_id: z.string().uuid(),
    recipient_id: z.string().uuid(),
    body: z.string().trim().min(1).max(2000),
    booking_id: z.string().uuid().nullable().optional(),
    car_id: z.string().uuid().nullable().optional(),
  })
  .strict();

export const ChatMessageRowSchema = ChatMessageInsertSchema.extend({
  id: z.string().uuid(),
  created_at: z.string().datetime(),
  read_at: z.string().datetime().nullable().optional(),
  delivered_at: z.string().datetime().nullable().optional(),
});

export type ChatMessageInsert = z.infer<typeof ChatMessageInsertSchema>;
