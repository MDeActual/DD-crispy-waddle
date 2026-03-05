'use strict';
/**
 * Tests for AI Route Optimizer and Blockchain Audit Ledger
 */

const request = require('supertest');
const { app, server } = require('../src/index');
const { haversine, assignPendingDeliveries, orderDriverDeliveries, handleDriverIncident, getOptimizedRoutes } = require('../src/ai/routeOptimizer');
const { addBlock, getChain, verifyChain, getRecentEvents, EVENT } = require('../src/blockchain/ledger');
const { drivers, deliveries } = require('../src/store');

afterAll((done) => {
  if (server.listening) {
    server.close(done);
  } else {
    done();
  }
});

// ─── Haversine distance ───────────────────────────────────────────────────────

describe('Haversine distance', () => {
  test('same point returns 0', () => {
    expect(haversine(0, 0, 0, 0)).toBe(0);
  });

  test('SF to LA is approximately 559 km', () => {
    const dist = haversine(37.7749, -122.4194, 34.0522, -118.2437);
    expect(dist).toBeGreaterThan(500);
    expect(dist).toBeLessThan(620);
  });

  test('returns a positive number for distinct points', () => {
    const dist = haversine(37.77, -122.41, 37.79, -122.42);
    expect(dist).toBeGreaterThan(0);
  });
});

// ─── Route Optimizer ─────────────────────────────────────────────────────────

describe('AI Route Optimizer - orderDriverDeliveries', () => {
  test('returns empty array for unknown driverId', () => {
    expect(orderDriverDeliveries('nonexistent')).toEqual([]);
  });

  test('returns ordered deliveries for a valid driver', () => {
    // d1 has del2 assigned (in_transit)
    const ordered = orderDriverDeliveries('d1');
    expect(Array.isArray(ordered)).toBe(true);
    ordered.forEach((d) => {
      expect(d).toHaveProperty('distanceFromPrevKm');
      expect(d.driverId).toBe('d1');
    });
  });

  test('each delivery in ordered result has distanceFromPrevKm >= 0', () => {
    const ordered = orderDriverDeliveries('d2');
    ordered.forEach((d) => {
      expect(d.distanceFromPrevKm).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('AI Route Optimizer - getOptimizedRoutes', () => {
  test('returns a map keyed by driver id', () => {
    const routes = getOptimizedRoutes();
    expect(typeof routes).toBe('object');
    drivers.forEach((driver) => {
      expect(routes).toHaveProperty(driver.id);
      expect(routes[driver.id]).toHaveProperty('driver');
      expect(routes[driver.id]).toHaveProperty('orderedDeliveries');
      expect(routes[driver.id]).toHaveProperty('totalDistanceKm');
    });
  });

  test('totalDistanceKm is a non-negative number', () => {
    const routes = getOptimizedRoutes();
    Object.values(routes).forEach((r) => {
      expect(r.totalDistanceKm).toBeGreaterThanOrEqual(0);
    });
  });
});

// ─── Driver Incident & Re-assignment ─────────────────────────────────────────

describe('AI Route Optimizer - handleDriverIncident', () => {
  test('unknown driver id returns empty reassignments', () => {
    const result = handleDriverIncident('nonexistent');
    expect(result.reassignments).toEqual([]);
  });
});

// ─── Blockchain Ledger ────────────────────────────────────────────────────────

describe('Blockchain Ledger', () => {
  test('genesis block is always present', () => {
    const chain = getChain();
    expect(chain.length).toBeGreaterThanOrEqual(1);
    expect(chain[0].eventType).toBe('GENESIS');
    expect(chain[0].index).toBe(0);
    expect(chain[0].previousHash).toBe('0'.repeat(64));
  });

  test('addBlock appends a new block', () => {
    const before = getChain().length;
    addBlock(EVENT.DELIVERY_CREATED, { test: true });
    const after = getChain().length;
    expect(after).toBe(before + 1);
  });

  test('each block references the previous hash', () => {
    const chain = getChain();
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].previousHash).toBe(chain[i - 1].hash);
    }
  });

  test('verifyChain returns valid: true on unmodified chain', () => {
    const result = verifyChain();
    expect(result.valid).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  test('getRecentEvents returns newest-first', () => {
    const events = getRecentEvents(5);
    expect(Array.isArray(events)).toBe(true);
    for (let i = 1; i < events.length; i++) {
      expect(new Date(events[i - 1].timestamp).getTime()).toBeGreaterThanOrEqual(
        new Date(events[i].timestamp).getTime()
      );
    }
  });

  test('blocks contain required fields', () => {
    const chain = getChain();
    chain.forEach((block) => {
      expect(block).toHaveProperty('index');
      expect(block).toHaveProperty('timestamp');
      expect(block).toHaveProperty('eventType');
      expect(block).toHaveProperty('data');
      expect(block).toHaveProperty('previousHash');
      expect(block).toHaveProperty('hash');
    });
  });
});

// ─── Routes API ──────────────────────────────────────────────────────────────

describe('Routes API', () => {
  let adminToken;
  let driverToken;

  beforeAll(async () => {
    const [adminRes, driverRes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'admin@logistics.com', password: 'password123' }),
      request(app).post('/api/auth/login').send({ email: 'driver1@logistics.com', password: 'password123' }),
    ]);
    adminToken = adminRes.body.token;
    driverToken = driverRes.body.token;
  });

  test('GET /api/routes - admin gets optimized routes', async () => {
    const res = await request(app)
      .get('/api/routes')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('routes');
    expect(typeof res.body.routes).toBe('object');
  });

  test('GET /api/routes - driver is forbidden', async () => {
    const res = await request(app)
      .get('/api/routes')
      .set('Authorization', `Bearer ${driverToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('GET /api/routes - unauthenticated returns 401', async () => {
    const res = await request(app).get('/api/routes');
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/routes/optimize - admin triggers optimization', async () => {
    const res = await request(app)
      .post('/api/routes/optimize')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('assignments');
    expect(res.body).toHaveProperty('routes');
    expect(Array.isArray(res.body.assignments)).toBe(true);
  });
});

// ─── Audit API ───────────────────────────────────────────────────────────────

describe('Audit API', () => {
  let adminToken;
  let dispatcherToken;

  beforeAll(async () => {
    const [adminRes, dispatcherRes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'admin@logistics.com', password: 'password123' }),
      request(app).post('/api/auth/login').send({ email: 'dispatcher@logistics.com', password: 'password123' }),
    ]);
    adminToken = adminRes.body.token;
    dispatcherToken = dispatcherRes.body.token;
  });

  test('GET /api/audit - admin gets full chain', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('chain');
    expect(Array.isArray(res.body.chain)).toBe(true);
    expect(res.body.chain[0].eventType).toBe('GENESIS');
  });

  test('GET /api/audit - dispatcher is forbidden', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('GET /api/audit/recent - dispatcher can see recent events', async () => {
    const res = await request(app)
      .get('/api/audit/recent')
      .set('Authorization', `Bearer ${dispatcherToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.events)).toBe(true);
  });

  test('GET /api/audit/verify - admin verifies chain integrity', async () => {
    const res = await request(app)
      .get('/api/audit/verify')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.valid).toBe(true);
  });
});

// ─── Driver Incident API ─────────────────────────────────────────────────────

describe('Driver Incident API', () => {
  let adminToken;
  let driver2Token;

  beforeAll(async () => {
    const [adminRes, driver2Res] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'admin@logistics.com', password: 'password123' }),
      request(app).post('/api/auth/login').send({ email: 'driver2@logistics.com', password: 'password123' }),
    ]);
    adminToken = adminRes.body.token;
    driver2Token = driver2Res.body.token;
  });

  test('POST /api/drivers/:id/incident - driver reports own incident', async () => {
    // First reset d2 status to active so we can report incident
    await request(app)
      .patch('/api/drivers/d2/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'active' });

    const res = await request(app)
      .post('/api/drivers/d2/incident')
      .set('Authorization', `Bearer ${driver2Token}`)
      .send({ reason: 'flat_tyre' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('reassignments');
    expect(Array.isArray(res.body.reassignments)).toBe(true);
    // Driver status should now be 'incident'
    const driver = drivers.find((d) => d.id === 'd2');
    expect(driver.status).toBe('incident');
  });

  test('POST /api/drivers/:id/incident - 404 for unknown driver', async () => {
    const res = await request(app)
      .post('/api/drivers/nonexistent/incident')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'breakdown' });
    expect(res.statusCode).toBe(404);
  });

  test('PATCH /api/drivers/:id/status - admin can update driver status', async () => {
    const res = await request(app)
      .patch('/api/drivers/d2/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'active' });
    expect(res.statusCode).toBe(200);
    expect(res.body.driver.status).toBe('active');
  });

  test('PATCH /api/drivers/:id/status - invalid status returns 400', async () => {
    const res = await request(app)
      .patch('/api/drivers/d2/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'flying' });
    expect(res.statusCode).toBe(400);
  });
});
