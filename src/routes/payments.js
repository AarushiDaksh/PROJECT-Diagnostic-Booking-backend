const express = require('express');
const crypto = require('crypto');
const { BookingStatus, PaymentStatus } = require('@prisma/client');
const prisma = require('../lib/prisma');
const { requireAuth } = require('../middleware/auth');
const { paymentSchema, webhookSchema } = require('../schemas/payment');

const router = express.Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const data = paymentSchema.parse(req.body);

    const booking = await prisma.booking.findFirst({
      where: {
        id: data.bookingId,
        userId: req.user.id
      }
    });

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    if (booking.status !== BookingStatus.PENDING) {
      return res.status(409).json({
        error: 'Payment can only be initiated for a pending booking'
      });
    }

    const status =
      data.outcome ||
      (crypto.randomInt(0, 100) < 80 ? 'SUCCESS' : 'FAILED');

    const eventId = `sim_${crypto.randomUUID()}`;

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          providerEventId: eventId,
          amount: booking.amount,
          status: PaymentStatus[status]
        }
      });

      const updatedBooking = await tx.booking.update({
        where: {
          id: booking.id
        },
        data: {
          status: BookingStatus[status]
        }
      });

      return {
        payment,
        booking: updatedBooking
      };
    });

    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/webhook', async (req, res, next) => {
  try {
    const data = webhookSchema.parse(req.body);

    const existingPayment = await prisma.payment.findUnique({
      where: {
        providerEventId: data.eventId
      }
    });

    if (existingPayment) {
      return res.status(200).json({
        message: 'Webhook already processed',
        payment: existingPayment
      });
    }

    const booking = await prisma.booking.findUnique({
      where: {
        id: data.bookingId
      }
    });

    if (!booking) {
      return res.status(404).json({
        error: 'Booking not found'
      });
    }

    if (Number(booking.amount) !== Number(data.amount)) {
      return res.status(400).json({
        error: 'Payment amount does not match booking amount'
      });
    }

    if (booking.status !== BookingStatus.PENDING) {
      return res.status(409).json({
        error: 'Booking has already been processed'
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          providerEventId: data.eventId,
          amount: data.amount,
          status: PaymentStatus[data.status]
        }
      });

      const updatedBooking = await tx.booking.update({
        where: {
          id: booking.id
        },
        data: {
          status: BookingStatus[data.status]
        }
      });

      return {
        payment,
        booking: updatedBooking
      };
    });

    return res.status(200).json(result);
  } catch (err) {
    if (err?.code === 'P2002') {
      const existingPayment = await prisma.payment.findUnique({
        where: {
          providerEventId: req.body?.eventId
        }
      });

      if (existingPayment) {
        return res.status(200).json({
          message: 'Webhook already processed',
          payment: existingPayment
        });
      }

      return res.status(409).json({
        error: 'Payment already exists'
      });
    }

    next(err);
  }
});

module.exports = router;