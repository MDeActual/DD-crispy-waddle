'use strict';
/**
 * Blockchain Audit API
 * GET /api/audit        – full chain (admin only)
 * GET /api/audit/recent – last N events (admin, dispatcher)
 * GET /api/audit/verify – chain integrity check (admin only)
 */

const express = require('express');
const { authenticate, requireRole } = require('../middleware');
const { getChain, verifyChain, getRecentEvents } = require('../blockchain/ledger');

const router = express.Router();

// GET /api/audit – full blockchain (admin only)
router.get('/', authenticate, requireRole('admin'), (req, res) => {
  const chain = getChain();
  return res.json({ chain, length: chain.length });
});

// GET /api/audit/recent – recent events (admin, dispatcher)
router.get('/recent', authenticate, requireRole('admin', 'dispatcher'), (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const events = getRecentEvents(limit);
  return res.json({ events, count: events.length });
});

// GET /api/audit/verify – verify chain integrity (admin only)
router.get('/verify', authenticate, requireRole('admin'), (req, res) => {
  const result = verifyChain();
  return res.json(result);
});

module.exports = router;
