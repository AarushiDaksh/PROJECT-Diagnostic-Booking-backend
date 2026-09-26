# Diagnostic Booking Backend

Backend API for diagnostic test centres, diagnostic tests, bookings, and simulated payments.

## Tech Stack

| Technology | Purpose |
|---|---|
| Node.js | Runtime |
| Express.js | REST API |
| PostgreSQL | Database |
| Prisma | ORM |
| JWT | Authentication |
| bcrypt | Password hashing |
| Zod | Request validation |
| Jest | Testing |
| Supertest | API testing |
| Docker | Containerization |

## Features

- User signup and login
- JWT authentication
- Password hashing
- Diagnostic centres and tests
- Centre-specific test pricing
- Authenticated bookings
- Booking ownership authorization
- Booking cancellation
- Duplicate booking prevention
- Simulated successful and failed payments
- Payment webhook
- Idempotent payment processing
- Pagination
- API validation and error handling
- Automated tests
- Docker setup

## Project Structure

| Path | Purpose |
|---|---|
| `src/routes/` | API routes |
| `src/middleware/` | Authentication and error handling |
| `src/schemas/` | Request validation |
| `src/lib/` | Prisma and authentication utilities |
| `prisma/schema.prisma` | Database schema |
| `prisma/seed.js` | Sample database data |
| `tests/` | Automated tests |
| `Dockerfile` | API Docker image |
| `docker-compose.yml` | API and PostgreSQL setup |

## Setup

### Environment

Create a `.env` file in the project root.

    DATABASE_URL="postgresql://postgres:postgres@localhost:5432/diagnostic_booking?schema=public"
    JWT_SECRET="replace-with-a-secure-secret"
    PORT=5000

### Docker

Start the application:

    docker compose up --build -d

Seed the database:

    docker compose exec api node prisma/seed.js

The API runs at:

    http://localhost:5000

Stop the application:

    docker compose down

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/signup` | No | Create a user |
| POST | `/auth/login` | No | Login and receive JWT |
| GET | `/tests` | No | Get diagnostic tests |
| GET | `/centres` | No | Get diagnostic centres |
| GET | `/centres/:id` | No | Get a centre |
| POST | `/bookings` | Yes | Create a booking |
| GET | `/bookings` | Yes | Get user's bookings |
| GET | `/bookings/:id` | Yes | Get a booking |
| PATCH | `/bookings/:id/cancel` | Yes | Cancel a booking |
| POST | `/payments` | Yes | Create simulated payment |
| POST | `/payments/webhook` | No | Process payment webhook |
| GET | `/home` | No | API health check |

## Authentication

Signup:

    POST /auth/signup

Request:

    {
      "name": "Aarushi",
      "email": "aarushi@example.com",
      "password": "password123"
    }

Login:

    POST /auth/login

Request:

    {
      "email": "aarushi@example.com",
      "password": "password123"
    }

Protected endpoints require:

    Authorization: Bearer <token>

## Booking

Create a booking:

    POST /bookings

Request:

    {
      "testId": "test-id",
      "centreId": "centre-id",
      "appointment": "2027-01-10T10:00:00.000Z"
    }

Get bookings with pagination:

    GET /bookings?page=1&limit=10

Cancel a booking:

    PATCH /bookings/:id/cancel

## Payment

Create a successful payment:

    POST /payments

Request:

    {
      "bookingId": "booking-id",
      "outcome": "SUCCESS"
    }

Create a failed payment:

    {
      "bookingId": "booking-id",
      "outcome": "FAILED"
    }

Payment statuses:

| Status | Meaning |
|---|---|
| PENDING | Booking is waiting for payment |
| SUCCESS | Payment completed |
| FAILED | Payment failed |
| CANCELLED | Booking was cancelled |

## Payment Webhook

    POST /payments/webhook

Request:

    {
      "eventId": "evt_123",
      "bookingId": "booking-id",
      "status": "SUCCESS",
      "amount": 450
    }

The `eventId` is used for idempotency. Sending the same webhook multiple times does not create multiple payment records.

## Database Schema

| Entity | Purpose |
|---|---|
| User | Stores user accounts |
| DiagnosticTest | Stores available diagnostic tests |
| DiagnosticCentre | Stores diagnostic centres |
| CentreTest | Connects tests with centres and stores pricing |
| Booking | Stores user appointments |
| Payment | Stores payment records and provider event IDs |

Relationships:

    User
     |
     └── Booking
           |
           ├── DiagnosticTest
           ├── DiagnosticCentre
           └── Payment

    DiagnosticCentre
     |
     └── CentreTest
           |
           └── DiagnosticTest

## Booking Rules

| Rule | Behaviour |
|---|---|
| Authentication | Required for bookings and payments |
| Ownership | Users can only access their own bookings |
| Test validation | Test must exist |
| Centre validation | Centre must exist |
| Centre-test validation | Test must be available at the selected centre |
| Pricing | Price comes from the centre-test relationship |
| Duplicate booking | Same user, test, centre and appointment is rejected |
| Payment | Only pending bookings can be paid |
| Cancellation | Only pending bookings can be cancelled |
| Webhook | Duplicate event IDs are ignored |

## Testing

Run the tests:

    npm test -- --runInBand

Current result:

    Test Suites: 2 passed, 2 total
    Tests:       11 passed, 11 total

Tests cover:

| Area | Covered |
|---|---|
| Authentication | Yes |
| Authorization | Yes |
| Booking ownership | Yes |
| Invalid centre/test | Yes |
| Duplicate booking | Yes |
| Invalid booking ID | Yes |
| Invalid centre ID | Yes |
| Pagination | Yes |
| Cancellation | Yes |
| Failed payment | Yes |
| Webhook idempotency | Yes |

## Error Responses

| Status | Usage |
|---|---|
| 400 | Invalid request or validation error |
| 401 | Authentication required |
| 404 | Resource not found |
| 409 | Duplicate or invalid state |
| 500 | Unexpected server error |

## Assumptions

- Payments are simulated.
- Centres and diagnostic tests are seeded data.
- PostgreSQL is the primary database.
- JWT is used for authentication.
- Payment webhook events use a unique provider event ID.
