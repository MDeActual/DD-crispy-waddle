const express = require('express');
const { drivers, users } = require('../store');
const { authenticate, requireRole } = require('../middleware');
const { emitLocationUpdate, emitIncident, emitRouteUpdate } = require('../socket');
const { handleDriverIncident, getOptimizedRoutes, orderDriverDeliveries } = require('../ai/routeOptimizer');
const { addBlock, EVENT } = require('../blockchain/ledger');

const router = express.Router();

// GET /api/drivers - list all drivers (admin, dispatcher)
router.get('/', authenticate, requireRole('admin', 'dispatcher'), (req, res) => {
  return res.json({ drivers });
});

// GET /api/drivers/:id - get single driver (admin, dispatcher, or the driver themselves)
router.get('/:id', authenticate, (req, res) => {
  const driver = drivers.find((d) => d.id === req.params.id);
  if (!driver) {
    return res.status(404).json({ error: 'Driver not found' });
  }

  const isOwner = req.user.role === 'driver' && driver.userId === req.user.id;
  const hasAccess = req.user.role === 'admin' || req.user.role === 'dispatcher' || isOwner;

  if (!hasAccess) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  return res.json({ driver });
});

// PUT /api/drivers/:id/location - update driver location (admin or the driver themselves)
router.put('/:id/location', authenticate, (req, res) => {
  const driver = drivers.find((d) => d.id === req.params.id);
  if (!driver) {
    return res.status(404).json({ error: 'Driver not found' });
  }

  const isOwner = req.user.role === 'driver' && driver.userId === req.user.id;
  const hasAccess = req.user.role === 'admin' || isOwner;

  if (!hasAccess) {
    return res.status(403).json({ error: 'Drivers can only update their own location' });
  }

  const { lat, lng, timestamp } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);

  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    return res.status(400).json({ error: 'lat and lng must be valid numbers' });
  }

  driver.lat = parsedLat;
  driver.lng = parsedLng;
  driver.lastUpdate = timestamp ? new Date(timestamp).getTime() : Date.now();

  // Log location update to blockchain
  addBlock(EVENT.DRIVER_LOCATION, {
    driverId: driver.id,
    lat: parsedLat,
    lng: parsedLng,
    timestamp: new Date(driver.lastUpdate).toISOString(),
  });

  emitLocationUpdate({ ...driver });

  // Re-emit optimised routes since driver position changed
  const routes = getOptimizedRoutes();
  emitRouteUpdate({ routes });

  return res.json({ message: 'Location updated', driver });
});

// PATCH /api/drivers/:id/status - update driver availability status (admin or own driver)
router.patch('/:id/status', authenticate, (req, res) => {
  const driver = drivers.find((d) => d.id === req.params.id);
  if (!driver) {
    return res.status(404).json({ error: 'Driver not found' });
  }

  const isOwner = req.user.role === 'driver' && driver.userId === req.user.id;
  const hasAccess = req.user.role === 'admin' || isOwner;

  if (!hasAccess) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const VALID_STATUSES = ['active', 'inactive', 'on_delivery'];
  const { status } = req.body;
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  driver.status = status;
  addBlock(EVENT.DRIVER_STATUS, { driverId: driver.id, status, changedBy: req.user.id });

  return res.json({ message: 'Status updated', driver });
});

// POST /api/drivers/:id/incident - report a driver incident (flat tyre, breakdown, etc.)
// Triggers automatic delivery re-assignment to the next closest available driver.
router.post('/:id/incident', authenticate, (req, res) => {
  const driver = drivers.find((d) => d.id === req.params.id);
  if (!driver) {
    return res.status(404).json({ error: 'Driver not found' });
  }

  const isOwner = req.user.role === 'driver' && driver.userId === req.user.id;
  const hasAccess = req.user.role === 'admin' || req.user.role === 'dispatcher' || isOwner;

  if (!hasAccess) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const { reason = 'incident' } = req.body;

  // AI re-assignment
  const result = handleDriverIncident(driver.id, reason);

  // Blockchain audit
  addBlock(EVENT.DRIVER_INCIDENT, {
    driverId: driver.id,
    driverName: driver.name,
    reason,
    reportedBy: req.user.id,
    timestamp: new Date().toISOString(),
  });

  if (result.reassignments.length > 0) {
    addBlock(EVENT.DELIVERIES_REASSIGNED, {
      incidentDriverId: driver.id,
      reassignments: result.reassignments,
    });
  }

  const routes = getOptimizedRoutes();
  emitIncident({ driver: { ...driver }, reason, reassignments: result.reassignments });
  emitRouteUpdate({ routes });

  return res.json({
    message: `Incident recorded. ${result.reassignments.length} deliveries re-assigned.`,
    driver: { ...driver },
    reassignments: result.reassignments,
    routes,
  });
});

module.exports = router;
