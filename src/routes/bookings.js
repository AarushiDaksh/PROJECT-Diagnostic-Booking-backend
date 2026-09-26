const express = require('express');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { createBookingSchema } = require('../schemas/booking');

const router = express.Router();
router.use(requireAuth);

function pagination(req) {
  const page = Math.max(Number.parseInt(req.query.page || '1', 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit || '10', 10) || 10, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

router.post('/', async (req, res, next) => {
  try {
    const data = createBookingSchema.parse(req.body);
    if (data.appointment <= new Date()) {
      return res.status(400).json({ error: 'Appointment must be in the future' });
    }

    const centreTest = await prisma.centreTest.findUnique({
      where: { centreId_testId: { centreId: data.centreId, testId: data.testId } }
    });
    if (!centreTest) {
      return res.status(400).json({ error: 'Selected test is not available at this centre' });
    }

    const duplicate = await prisma.booking.findFirst({
      where: {
        userId: req.user.id,
        testId: data.testId,
        centreId: data.centreId,
        appointment: data.appointment,
        status: { not: 'CANCELLED' }
      }
    });
    if (duplicate) {
      return res.status(409).json({ error: 'You already have a booking for this test, centre, and appointment' });
    }

    const booking = await prisma.booking.create({
      data: {
        userId: req.user.id,
        testId: data.testId,
        centreId: data.centreId,
        appointment: data.appointment,
        amount: centreTest.price
      },
      include: { test: true, centre: true }
    });

    res.status(201).json(booking);
  } catch (err) { next(err); }
});

router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = pagination(req);
    const where = { userId: req.user.id };
    const [bookings, total] = await prisma.$transaction([
      prisma.booking.findMany({
        where,
        include: { test: true, centre: true, payments: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.booking.count({ where })
    ]);
    res.json({ data: bookings, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { test: true, centre: true, payments: true }
    });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) { next(err); }
});

router.patch('/:id/cancel', async (req, res, next) => {
  try {
    const booking = await prisma.booking.findFirst({ where: { id: req.params.id, userId: req.user.id } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status !== 'PENDING') {
      return res.status(409).json({ error: 'Only pending bookings can be cancelled' });
    }

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CANCELLED' }
    });
    res.json(updated);
  } catch (err) { next(err); }
});

module.exports = router;
