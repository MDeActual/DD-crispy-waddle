const express = require('express');
const { deliveries, drivers } = require('../store');
const { authenticate, requireRole } = require('../middleware');
const { emitDeliveryUpdate } = require('../socket');

const router = express.Router();

const VALID_STATUSES = ['pending', 'in_transit', 'delivered', 'failed'];

// GET /api/deliveries - list deliveries (admin, dispatcher, driver)
router.get('/', authenticate, (req, res) => {
  if (req.user.role === 'admin' || req.user.role === 'dispatcher') {
    return res.json({ deliveries });
  }

  // Drivers see only their own deliveries
  const driver = drivers.find((d) => d.userId === req.user.id);
  if (!driver) {
    return res.json({ deliveries: [] });
  }

  const driverDeliveries = deliveries.filter((d) => d.driverId === driver.id);
  return res.json({ deliveries: driverDeliveries });
});

// GET /api/deliveries/:id - get single delivery
router.get('/:id', authenticate, (req, res) => {
  const delivery = deliveries.find((d) => d.id === req.params.id);
  if (!delivery) {
    return res.status(404).json({ error: 'Delivery not found' });
  }

  if (req.user.role === 'driver') {
    const driver = drivers.find((d) => d.userId === req.user.id);
    if (!driver || delivery.driverId !== driver.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
  }

  return res.json({ delivery });
});

// POST /api/deliveries - create delivery (admin, dispatcher)
router.post('/', authenticate, requireRole('admin', 'dispatcher'), (req, res) => {
  const { trackingNumber, recipient, address, driverId, lat, lng } = req.body;

  if (!trackingNumber || !recipient || !address) {
    return res.status(400).json({ error: 'trackingNumber, recipient, and address are required' });
  }

  if (deliveries.find((d) => d.trackingNumber === trackingNumber)) {
    return res.status(409).json({ error: 'Tracking number already exists' });
  }

  const newDelivery = {
    id: `del${Date.now()}`,
    trackingNumber,
    recipient,
    address,
    status: 'pending',
    driverId: driverId || null,
    lat: lat !== undefined ? parseFloat(lat) : null,
    lng: lng !== undefined ? parseFloat(lng) : null,
  };

  if (newDelivery.lat !== null && isNaN(newDelivery.lat)) {
    return res.status(400).json({ error: 'lat must be a valid number' });
  }
  if (newDelivery.lng !== null && isNaN(newDelivery.lng)) {
    return res.status(400).json({ error: 'lng must be a valid number' });
  }

  deliveries.push(newDelivery);
  emitDeliveryUpdate({ ...newDelivery });

  return res.status(201).json({ message: 'Delivery created', delivery: newDelivery });
});

// PUT /api/deliveries/:id - update delivery (admin, dispatcher; drivers can update status only)
router.put('/:id', authenticate, (req, res) => {
  const delivery = deliveries.find((d) => d.id === req.params.id);
  if (!delivery) {
    return res.status(404).json({ error: 'Delivery not found' });
  }

  if (req.user.role === 'driver') {
    // Drivers can only update status of their own deliveries
    const driver = drivers.find((d) => d.userId === req.user.id);
    if (!driver || delivery.driverId !== driver.id) {
      return res.status(403).json({ error: 'Drivers can only update their own deliveries' });
    }

    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    delivery.status = status;
    emitDeliveryUpdate({ ...delivery });
    return res.json({ message: 'Delivery updated', delivery });
  }

  // Admin / dispatcher can update all fields
  if (req.user.role !== 'admin' && req.user.role !== 'dispatcher') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  const { status, driverId, recipient, address, lat, lng } = req.body;

  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    delivery.status = status;
  }
  if (driverId !== undefined) delivery.driverId = driverId;
  if (recipient !== undefined) delivery.recipient = recipient;
  if (address !== undefined) delivery.address = address;
  if (lat !== undefined) {
    const parsedLat = parseFloat(lat);
    if (isNaN(parsedLat)) return res.status(400).json({ error: 'lat must be a valid number' });
    delivery.lat = parsedLat;
  }
  if (lng !== undefined) {
    const parsedLng = parseFloat(lng);
    if (isNaN(parsedLng)) return res.status(400).json({ error: 'lng must be a valid number' });
    delivery.lng = parsedLng;
  }

  emitDeliveryUpdate({ ...delivery });
  return res.json({ message: 'Delivery updated', delivery });
});

module.exports = router;
