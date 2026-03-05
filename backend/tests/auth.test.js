const request = require('supertest');
const { app, server } = require('../src/index');

afterAll((done) => {
  if (server.listening) {
    server.close(done);
  } else {
    done();
  }
});

describe('Health check', () => {
  test('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Auth - Register', () => {
  test('POST /api/auth/register - success', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Test User',
      email: `testuser_${Date.now()}@test.com`,
      password: 'testpassword',
      role: 'driver',
    });
    expect(res.statusCode).toBe(201);
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user).not.toHaveProperty('password');
    expect(res.body.user.role).toBe('driver');
  });

  test('POST /api/auth/register - missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@x.com' });
    expect(res.statusCode).toBe(400);
  });

  test('POST /api/auth/register - duplicate email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Alice Admin',
      email: 'admin@logistics.com',
      password: 'password123',
      role: 'admin',
    });
    expect(res.statusCode).toBe(409);
  });
});

describe('Auth - Login', () => {
  test('POST /api/auth/login - success (admin)', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@logistics.com',
      password: 'password123',
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('admin');
  });

  test('POST /api/auth/login - wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@logistics.com',
      password: 'wrongpassword',
    });
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/auth/login - unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@nowhere.com',
      password: 'password123',
    });
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/auth/login - missing fields', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@logistics.com' });
    expect(res.statusCode).toBe(400);
  });
});

describe('Drivers API', () => {
  let adminToken;
  let driverToken;

  beforeAll(async () => {
    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@logistics.com',
      password: 'password123',
    });
    adminToken = adminRes.body.token;

    const driverRes = await request(app).post('/api/auth/login').send({
      email: 'driver1@logistics.com',
      password: 'password123',
    });
    driverToken = driverRes.body.token;
  });

  test('GET /api/drivers - admin can list all drivers', async () => {
    const res = await request(app)
      .get('/api/drivers')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.drivers)).toBe(true);
    expect(res.body.drivers.length).toBeGreaterThanOrEqual(2);
  });

  test('GET /api/drivers - driver cannot list all drivers', async () => {
    const res = await request(app)
      .get('/api/drivers')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('GET /api/drivers - unauthenticated returns 401', async () => {
    const res = await request(app).get('/api/drivers');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/drivers/:id - driver can get their own record', async () => {
    const res = await request(app)
      .get('/api/drivers/d1')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.driver.id).toBe('d1');
  });

  test('GET /api/drivers/:id - driver cannot get another driver record', async () => {
    const res = await request(app)
      .get('/api/drivers/d2')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('PUT /api/drivers/:id/location - driver updates own location', async () => {
    const res = await request(app)
      .put('/api/drivers/d1/location')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ lat: 37.123, lng: -122.456 });
    expect(res.statusCode).toBe(200);
    expect(res.body.driver.lat).toBe(37.123);
    expect(res.body.driver.lng).toBe(-122.456);
  });

  test('PUT /api/drivers/:id/location - driver cannot update another driver location', async () => {
    const res = await request(app)
      .put('/api/drivers/d2/location')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ lat: 37.0, lng: -122.0 });
    expect(res.statusCode).toBe(403);
  });

  test('PUT /api/drivers/:id/location - admin can update any driver location', async () => {
    const res = await request(app)
      .put('/api/drivers/d2/location')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ lat: 38.0, lng: -121.0 });
    expect(res.statusCode).toBe(200);
  });
});

describe('Deliveries API', () => {
  let adminToken;
  let dispatcherToken;
  let driverToken;

  beforeAll(async () => {
    const [a, d, dr] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'admin@logistics.com', password: 'password123' }),
      request(app).post('/api/auth/login').send({ email: 'dispatcher@logistics.com', password: 'password123' }),
      request(app).post('/api/auth/login').send({ email: 'driver1@logistics.com', password: 'password123' }),
    ]);
    adminToken = a.body.token;
    dispatcherToken = d.body.token;
    driverToken = dr.body.token;
  });

  test('GET /api/deliveries - admin sees all deliveries', async () => {
    const res = await request(app)
      .get('/api/deliveries')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.deliveries.length).toBeGreaterThanOrEqual(5);
  });

  test('GET /api/deliveries - dispatcher sees all deliveries', async () => {
    const res = await request(app)
      .get('/api/deliveries')
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.deliveries)).toBe(true);
  });

  test('GET /api/deliveries - driver sees only their deliveries', async () => {
    const res = await request(app)
      .get('/api/deliveries')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(res.statusCode).toBe(200);
    // driver1 has driverId d1, which has del2
    res.body.deliveries.forEach((d) => {
      expect(d.driverId).toBe('d1');
    });
  });

  test('POST /api/deliveries - dispatcher can create delivery', async () => {
    const res = await request(app)
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${dispatcherToken}`)
      .send({
        trackingNumber: `TRK_TEST_${Date.now()}`,
        recipient: 'Test Recipient',
        address: '999 Test Ave, SF',
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.delivery.status).toBe('pending');
  });

  test('POST /api/deliveries - driver cannot create delivery', async () => {
    const res = await request(app)
      .post('/api/deliveries')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({
        trackingNumber: 'TRK_DRIVER',
        recipient: 'Test',
        address: '123 Test St',
      });
    expect(res.statusCode).toBe(403);
  });

  test('PUT /api/deliveries/:id - admin can update status', async () => {
    const res = await request(app)
      .put('/api/deliveries/del1')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'in_transit' });
    expect(res.statusCode).toBe(200);
    expect(res.body.delivery.status).toBe('in_transit');
  });

  test('PUT /api/deliveries/:id - driver updates own delivery status', async () => {
    const res = await request(app)
      .put('/api/deliveries/del2')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'delivered' });
    expect(res.statusCode).toBe(200);
    expect(res.body.delivery.status).toBe('delivered');
  });

  test('PUT /api/deliveries/:id - driver cannot update another driver delivery', async () => {
    const res = await request(app)
      .put('/api/deliveries/del3')
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ status: 'failed' });
    expect(res.statusCode).toBe(403);
  });

  test('GET /api/deliveries/:id - 404 for unknown id', async () => {
    const res = await request(app)
      .get('/api/deliveries/nonexistent')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(404);
  });
});

describe('MFA Setup Flow', () => {
  let token;

  beforeAll(async () => {
    // Register a fresh user for MFA testing
    const email = `mfatest_${Date.now()}@test.com`;
    await request(app).post('/api/auth/register').send({
      name: 'MFA Tester',
      email,
      password: 'mfapassword',
      role: 'driver',
    });
    const loginRes = await request(app).post('/api/auth/login').send({
      email,
      password: 'mfapassword',
    });
    token = loginRes.body.token;
  });

  test('POST /api/auth/mfa/setup - returns secret and QR code', async () => {
    const res = await request(app)
      .post('/api/auth/mfa/setup')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('secret');
    expect(res.body).toHaveProperty('qrCode');
  });

  test('POST /api/auth/mfa/verify - fails with wrong token', async () => {
    const res = await request(app)
      .post('/api/auth/mfa/verify')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: '000000' });
    expect(res.statusCode).toBe(400);
  });
});
