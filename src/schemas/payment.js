const { z } = require('zod');

const paymentSchema = z.object({
  bookingId: z.string().min(1),
  outcome: z.enum(['SUCCESS', 'FAILED']).optional()
});

const webhookSchema = z.object({
  eventId: z.string().min(1),
  bookingId: z.string().min(1),
  status: z.enum(['SUCCESS', 'FAILED']),
  amount: z.coerce.number().positive()
});

module.exports = { paymentSchema, webhookSchema };
