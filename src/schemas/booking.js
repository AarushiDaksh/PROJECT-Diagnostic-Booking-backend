const { z } = require('zod');

const createBookingSchema = z.object({
  testId: z.string().min(1),
  centreId: z.string().min(1),
  appointment: z.coerce.date()
});

module.exports = { createBookingSchema };
