'use strict';
/**
 * Routes API
 * GET  /api/routes         – return current optimised route assignments
 * POST /api/routes/optimize – trigger a fresh optimisation pass
 */

const express = require('express');
const { authenticate, requireRole } = require('../middleware');
const { assignPendingDeliveries, getOptimizedRoutes } = require('../ai/routeOptimizer');
const { addBlock, EVENT } = require('../blockchain/ledger');
const { emitRouteUpdate } = require('../socket');

const router = express.Router();

// GET /api/routes – current optimised routes (admin, dispatcher)
router.get('/', authenticate, requireRole('admin', 'dispatcher'), (req, res) => {
  const routes = getOptimizedRoutes();
  return res.json({ routes });
});

// POST /api/routes/optimize – trigger optimisation pass (admin, dispatcher)
router.post('/optimize', authenticate, requireRole('admin', 'dispatcher'), (req, res) => {
  const assignments = assignPendingDeliveries();
  const routes = getOptimizedRoutes();

  if (assignments.length > 0) {
    const block = addBlock(EVENT.ROUTE_OPTIMIZED, {
      triggeredBy: req.user.id,
      assignments,
      timestamp: new Date().toISOString(),
    });
    emitRouteUpdate({ routes, block });
  }

  return res.json({
    message: `Optimization complete. ${assignments.length} deliveries assigned.`,
    assignments,
    routes,
  });
});

module.exports = router;
