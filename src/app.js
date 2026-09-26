require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const centreRoutes = require('./routes/centres');
const testRoutes = require('./routes/tests');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const { errorHandler } = require('./middleware/error');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./openapi');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/home', (req, res) => res.json({ status: 'ok' }));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get('/openapi.json', (req, res) => res.json(swaggerDocument));
app.use('/auth', authRoutes);
app.use('/centres', centreRoutes);
app.use('/tests', testRoutes);
app.use('/bookings', bookingRoutes);
app.use('/payments', paymentRoutes);

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use(errorHandler);

module.exports = app;
