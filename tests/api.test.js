
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const app = require('../src/app');
const prisma = require('../src/lib/prisma');

describe('Diagnostic booking API', () => {
  let userA;
  let userB;
  let tokenA;
  let tokenB;
  let centre;
  let diagnosticTest;

  beforeAll(async () => {
    const suffix = randomUUID().slice(0, 8);

    userA = await prisma.user.create({
      data: {
        name: 'Test User A',
        email: `test-a-${suffix}@example.com`,
        passwordHash: await bcrypt.hash('password123', 10)
      }
    });

    userB = await prisma.user.create({
      data: {
        name: 'Test User B',
        email: `test-b-${suffix}@example.com`,
        passwordHash: await bcrypt.hash('password123', 10)
      }
    });

    const authA = await request(app)
      .post('/auth/login')
      .send({
        email: userA.email,
        password: 'password123'
      });

    const authB = await request(app)
      .post('/auth/login')
      .send({
        email: userB.email,
        password: 'password123'
      });

    tokenA = authA.body.token;
    tokenB = authB.body.token;

    diagnosticTest = await prisma.diagnosticTest.create({
      data: {
        name: `CBC ${suffix}`,
        code: `CBC-${suffix}`
      }
    });

  
    centre = await prisma.diagnosticCentre.create({
      data: {
        name: `Test Centre ${suffix}`,
        location: 'Greater Noida',
        tests: {
          create: [
            {
              testId: diagnosticTest.id,
              price: 450
            }
          ]
        }
      }
    });
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({
      where: {
        booking: {
          userId: {
            in: [userA.id, userB.id]
          }
        }
      }
    });

    await prisma.booking.deleteMany({
      where: {
        userId: {
          in: [userA.id, userB.id]
        }
      }
    });

    await prisma.centreTest.deleteMany({
      where: {
        centreId: centre.id
      }
    });

    await prisma.diagnosticCentre.delete({
      where: {
        id: centre.id
      }
    });

    await prisma.diagnosticTest.delete({
      where: {
        id: diagnosticTest.id
      }
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: [userA.id, userB.id]
        }
      }
    });

    await prisma.$disconnect();
  });

  test('requires authentication for bookings', async () => {
    const response = await request(app)
      .get('/bookings');

    expect(response.statusCode).toBe(401);
  });

  test('prevents one user from accessing another user booking', async () => {
    const created = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        testId: diagnosticTest.id,
        centreId: centre.id,
        appointment: '2027-01-10T10:00:00.000Z'
      });

    expect(created.statusCode).toBe(201);

    const response = await request(app)
      .get(`/bookings/${created.body.id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(response.statusCode).toBe(404);
  });

  test('rejects invalid centre/test combination', async () => {
    const response = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        testId: diagnosticTest.id,
        centreId: 'missing-centre',
        appointment: '2027-02-10T10:00:00.000Z'
      });

    expect(response.statusCode).toBe(400);
  });

  test('prevents duplicate booking for the same appointment', async () => {
    const payload = {
      testId: diagnosticTest.id,
      centreId: centre.id,
      appointment: '2027-03-10T10:00:00.000Z'
    };

    const first = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(payload);

    const second = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(payload);

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(409);
  });

  test('returns 404 for an invalid booking ID when paying', async () => {
    const response = await request(app)
      .post('/payments')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        bookingId: 'missing-booking-id'
      });

    expect(response.statusCode).toBe(404);
  });

  test('returns 404 for an invalid centre ID', async () => {
    const response = await request(app)
      .get('/centres/missing-centre-id');

    expect(response.statusCode).toBe(404);
  });

  test('supports pagination for bookings', async () => {
    const response = await request(app)
      .get('/bookings?page=1&limit=2')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.pagination).toEqual(
      expect.objectContaining({
        page: 1,
        limit: 2
      })
    );
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  test('cancels a pending booking and blocks a second cancellation', async () => {
    const created = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        testId: diagnosticTest.id,
        centreId: centre.id,
        appointment: '2027-04-10T10:00:00.000Z'
      });

    const cancelled = await request(app)
      .patch(`/bookings/${created.body.id}/cancel`)
      .set('Authorization', `Bearer ${tokenA}`);

    const again = await request(app)
      .patch(`/bookings/${created.body.id}/cancel`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(cancelled.statusCode).toBe(200);
    expect(cancelled.body.status).toBe('CANCELLED');
    expect(again.statusCode).toBe(409);
  });

  test('supports a deterministic failed payment', async () => {
    const created = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        testId: diagnosticTest.id,
        centreId: centre.id,
        appointment: '2027-05-10T10:00:00.000Z'
      });

    const payment = await request(app)
      .post('/payments')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        bookingId: created.body.id,
        outcome: 'FAILED'
      });

    const retry = await request(app)
      .post('/payments')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        bookingId: created.body.id,
        outcome: 'SUCCESS'
      });

    expect(payment.statusCode).toBe(201);
    expect(payment.body.payment.status).toBe('FAILED');
    expect(payment.body.booking.status).toBe('FAILED');
    expect(retry.statusCode).toBe(409);
  });

  test('webhook is idempotent', async () => {
    const created = await request(app)
      .post('/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        testId: diagnosticTest.id,
        centreId: centre.id,
        appointment: '2027-06-10T10:00:00.000Z'
      });

    const payload = {
      eventId: `evt_${randomUUID()}`,
      bookingId: created.body.id,
      status: 'SUCCESS',
      amount: 450
    };

    const first = await request(app)
      .post('/payments/webhook')
      .send(payload);

    const second = await request(app)
      .post('/payments/webhook')
      .send(payload);

    const payments = await prisma.payment.findMany({
      where: {
        bookingId: created.body.id
      }
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(second.body.message).toBe('Webhook already processed');
    expect(payments).toHaveLength(1);
  });
});
