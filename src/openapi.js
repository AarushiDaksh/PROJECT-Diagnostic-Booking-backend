const swaggerDocument = {
  openapi: '3.0.3',
  info: {
    title: 'Diagnostic Booking API',
    version: '1.0.0',
    description: 'Backend service for diagnostic test bookings and simulated payments.'
  },
  servers: [{ url: 'http://localhost:5000' }],
  paths: {
    '/home': {
      get: { summary: 'Service health check', responses: { 200: { description: 'Service is running' } } }
    },
    '/auth/signup': {
      post: {
        summary: 'Create a user',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Signup' } } } },
        responses: { 201: { description: 'User created' }, 409: { description: 'Email already registered' } }
      }
    },
    '/auth/login': {
      post: {
        summary: 'Login',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Login' } } } },
        responses: { 200: { description: 'Authenticated' }, 401: { description: 'Invalid credentials' } }
      }
    },
    '/centres': {
      get: {
        summary: 'List diagnostic centres',
        parameters: [{ $ref: '#/components/parameters/Page' }, { $ref: '#/components/parameters/Limit' }],
        responses: { 200: { description: 'Paginated centres' } }
      },
      post: {
        summary: 'Create a diagnostic centre',
        security: [{ bearerAuth: [] }],
        responses: { 201: { description: 'Centre created' }, 401: { description: 'Authentication required' } }
      }
    },
    '/centres/{id}': {
      get: {
        summary: 'Get a diagnostic centre',
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: { 200: { description: 'Centre' }, 404: { description: 'Centre not found' } }
      }
    },
    '/tests': {
      get: {
        summary: 'List diagnostic tests',
        parameters: [{ $ref: '#/components/parameters/Page' }, { $ref: '#/components/parameters/Limit' }],
        responses: { 200: { description: 'Paginated tests' } }
      }
    },
    '/bookings': {
      get: {
        summary: 'List current user bookings',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/Page' }, { $ref: '#/components/parameters/Limit' }],
        responses: { 200: { description: 'Paginated bookings' }, 401: { description: 'Authentication required' } }
      },
      post: {
        summary: 'Create a booking',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/BookingCreate' } } } },
        responses: { 201: { description: 'Booking created' }, 400: { description: 'Invalid booking' }, 409: { description: 'Duplicate booking' } }
      }
    },
    '/bookings/{id}': {
      get: {
        summary: 'Get a booking owned by the current user',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: { 200: { description: 'Booking' }, 404: { description: 'Booking not found' } }
      }
    },
    '/bookings/{id}/cancel': {
      patch: {
        summary: 'Cancel a pending booking',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: { 200: { description: 'Booking cancelled' }, 409: { description: 'Booking cannot be cancelled' } }
      }
    },
    '/payments': {
      post: {
        summary: 'Simulate a payment',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Payment' } } } },
        responses: { 201: { description: 'Payment processed' }, 409: { description: 'Booking already processed' } }
      }
    },
    '/payments/webhook': {
      post: {
        summary: 'Process a payment provider webhook',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Webhook' } } } },
        responses: { 200: { description: 'Webhook processed or already processed' }, 400: { description: 'Invalid payment amount' }, 409: { description: 'Booking already processed' } }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    parameters: {
      Id: { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
      Page: { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
      Limit: { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } }
    },
    schemas: {
      Signup: { type: 'object', required: ['name', 'email', 'password'], properties: { name: { type: 'string' }, email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' } } },
      Login: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' } } },
      BookingCreate: { type: 'object', required: ['testId', 'centreId', 'appointment'], properties: { testId: { type: 'string' }, centreId: { type: 'string' }, appointment: { type: 'string', format: 'date-time' } } },
      Payment: { type: 'object', required: ['bookingId'], properties: { bookingId: { type: 'string' }, outcome: { type: 'string', enum: ['SUCCESS', 'FAILED'], description: 'Optional deterministic outcome for mock/testing flows.' } } },
      Webhook: { type: 'object', required: ['eventId', 'bookingId', 'status', 'amount'], properties: { eventId: { type: 'string' }, bookingId: { type: 'string' }, status: { type: 'string', enum: ['SUCCESS', 'FAILED'] }, amount: { type: 'number', exclusiveMinimum: 0 } } }
    }
  }
};

module.exports = swaggerDocument;
