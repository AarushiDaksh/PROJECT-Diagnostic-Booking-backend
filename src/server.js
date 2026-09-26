require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

app.listen(PORT, () => {
  console.log(`Diagnostic booking API running on port ${PORT}`);
});
