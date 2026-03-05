'use strict';
/**
 * Blockchain Audit Ledger
 *
 * An append-only, cryptographically hash-chained audit log.
 * Every significant event in the system (delivery created/updated, driver
 * assigned, incident reported, route optimised) is recorded as a block.
 *
 * Each block contains:
 *  { index, timestamp, eventType, data, previousHash, hash }
 *
 * hash = SHA-256( index | timestamp | eventType | JSON(data) | previousHash )
 *
 * This design is intentionally compatible with a distributed peer-to-peer
 * extension: the deterministic hashing allows any node to independently
 * verify every block without trusting the originating server.
 */

const crypto = require('crypto');

// ─── Event Type Constants ──────────────────────────────────────────────────────
const EVENT = {
  DELIVERY_CREATED: 'DELIVERY_CREATED',
  DELIVERY_UPDATED: 'DELIVERY_UPDATED',
  DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
  DRIVER_LOCATION: 'DRIVER_LOCATION',
  DRIVER_STATUS: 'DRIVER_STATUS',
  DRIVER_INCIDENT: 'DRIVER_INCIDENT',
  ROUTE_OPTIMIZED: 'ROUTE_OPTIMIZED',
  DELIVERIES_REASSIGNED: 'DELIVERIES_REASSIGNED',
};

// ─── Block helpers ─────────────────────────────────────────────────────────────

function computeHash(index, timestamp, eventType, data, previousHash) {
  const payload = `${index}${timestamp}${eventType}${JSON.stringify(data)}${previousHash}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function createGenesisBlock() {
  const index = 0;
  const timestamp = new Date('2024-01-01T00:00:00.000Z').toISOString();
  const eventType = 'GENESIS';
  const data = { message: 'DD-Logistics chain genesis block' };
  const previousHash = '0'.repeat(64);
  const hash = computeHash(index, timestamp, eventType, data, previousHash);
  return { index, timestamp, eventType, data, previousHash, hash };
}

// ─── In-memory chain ──────────────────────────────────────────────────────────

const chain = [createGenesisBlock()];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Append a new event block to the chain.
 * @param {string} eventType  One of the EVENT constants.
 * @param {object} data       Arbitrary event payload (will be serialised).
 * @returns {object} The newly appended block.
 */
function addBlock(eventType, data) {
  const previous = chain[chain.length - 1];
  const index = previous.index + 1;
  const timestamp = new Date().toISOString();
  const previousHash = previous.hash;
  const hash = computeHash(index, timestamp, eventType, data, previousHash);
  const block = { index, timestamp, eventType, data, previousHash, hash };
  chain.push(block);
  return block;
}

/**
 * Return a shallow copy of the full chain.
 */
function getChain() {
  return [...chain];
}

/**
 * Verify that the chain has not been tampered with.
 * Returns { valid: boolean, invalidAt?: number }
 */
function verifyChain() {
  for (let i = 1; i < chain.length; i++) {
    const block = chain[i];
    const expectedHash = computeHash(
      block.index,
      block.timestamp,
      block.eventType,
      block.data,
      block.previousHash
    );
    if (block.hash !== expectedHash) return { valid: false, invalidAt: i };
    if (block.previousHash !== chain[i - 1].hash) return { valid: false, invalidAt: i };
  }
  return { valid: true, length: chain.length };
}

/**
 * Return the last N blocks (most recent events), newest-first.
 */
function getRecentEvents(n = 50) {
  return [...chain].reverse().slice(0, n);
}

module.exports = { EVENT, addBlock, getChain, verifyChain, getRecentEvents };
