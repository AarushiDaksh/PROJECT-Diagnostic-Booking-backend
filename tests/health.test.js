const request = require('supertest');
const app = require('../src/app');

describe('Home', () => {
  test('GET /home', async () => {
    const response = await request(app).get('/home');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
