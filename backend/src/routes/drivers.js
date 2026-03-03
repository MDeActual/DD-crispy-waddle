const express = require('express');
const { drivers, users } = require('../store');
const { authenticate, requireRole } = require('../middleware');
const { emitLocationUpdate } = require('../socket');

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

  emitLocationUpdate({ ...driver });

  return res.json({ message: 'Location updated', driver });
});

module.exports = router;
