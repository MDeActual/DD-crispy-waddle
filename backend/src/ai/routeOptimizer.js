'use strict';
/**
 * AI-Native Route Optimizer
 *
 * Uses a greedy nearest-neighbor algorithm (TSP approximation) to assign
 * and order deliveries for each driver, minimising total travel distance.
 *
 * Key capabilities:
 *  - assignPendingDeliveries : pair every unassigned pending delivery with the
 *    geographically closest available driver.
 *  - orderDriverDeliveries   : sort a driver's delivery queue by nearest-next
 *    from the driver's current position (greedy TSP).
 *  - handleDriverIncident    : re-assign all active deliveries of an incapacitated
 *    driver to the next closest available driver and recalculate routes.
 *  - getOptimizedRoutes      : return the full optimised assignment map.
 */

const { drivers, deliveries } = require('../store');

/** Haversine great-circle distance in kilometres. */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Return drivers that can accept new deliveries.
 * Excludes drivers with status 'inactive' or 'incident'.
 */
function availableDrivers() {
  return drivers.filter(
    (d) => d.lat !== null && d.lng !== null && d.status !== 'inactive' && d.status !== 'incident'
  );
}

/**
 * Assign every unassigned pending delivery to the closest available driver.
 * Mutates the deliveries array in the store.
 * Returns list of { deliveryId, driverId, distanceKm } assignments made.
 */
function assignPendingDeliveries() {
  const available = availableDrivers();
  if (available.length === 0) return [];

  const unassigned = deliveries.filter(
    (d) => d.status === 'pending' && !d.driverId && d.lat !== null && d.lng !== null
  );

  const assignments = [];
  for (const delivery of unassigned) {
    let closestDriver = null;
    let minDist = Infinity;

    for (const driver of available) {
      const dist = haversine(driver.lat, driver.lng, delivery.lat, delivery.lng);
      if (dist < minDist) {
        minDist = dist;
        closestDriver = driver;
      }
    }

    if (closestDriver) {
      delivery.driverId = closestDriver.id;
      assignments.push({
        deliveryId: delivery.id,
        driverId: closestDriver.id,
        distanceKm: Math.round(minDist * 100) / 100,
      });
    }
  }

  return assignments;
}

/**
 * Nearest-neighbour TSP ordering for a driver's pending/in-transit deliveries.
 * Returns an ordered array of delivery objects for the driver.
 */
function orderDriverDeliveries(driverId) {
  const driver = drivers.find((d) => d.id === driverId);
  if (!driver || driver.lat === null || driver.lng === null) return [];

  const queue = deliveries.filter(
    (d) =>
      d.driverId === driverId &&
      (d.status === 'pending' || d.status === 'in_transit') &&
      d.lat !== null &&
      d.lng !== null
  );

  if (queue.length === 0) return [];

  const ordered = [];
  let currentLat = driver.lat;
  let currentLng = driver.lng;
  const remaining = [...queue];

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const dist = haversine(currentLat, currentLng, remaining[i].lat, remaining[i].lng);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    const next = remaining.splice(nearestIdx, 1)[0];
    ordered.push({ ...next, distanceFromPrevKm: Math.round(nearestDist * 100) / 100 });
    currentLat = next.lat;
    currentLng = next.lng;
  }

  return ordered;
}

/**
 * Handle a driver incident (flat tyre, breakdown, etc.).
 * 1. Sets the driver's status to 'incident'.
 * 2. Re-assigns their pending / in-transit deliveries to the closest other
 *    available driver.
 * Returns { incidentDriverId, reassignments[] }
 */
function handleDriverIncident(incidentDriverId, reason = 'incident') {
  const incidentDriver = drivers.find((d) => d.id === incidentDriverId);
  if (!incidentDriver) return { incidentDriverId, reassignments: [] };

  incidentDriver.status = 'incident';

  const affectedDeliveries = deliveries.filter(
    (d) =>
      d.driverId === incidentDriverId &&
      (d.status === 'pending' || d.status === 'in_transit')
  );

  // Available drivers excluding the incident driver
  const available = availableDrivers().filter((d) => d.id !== incidentDriverId);
  const reassignments = [];

  for (const delivery of affectedDeliveries) {
    if (available.length === 0) {
      delivery.driverId = null; // return to unassigned pool
      reassignments.push({ deliveryId: delivery.id, newDriverId: null, reason: 'no_available_driver' });
      continue;
    }

    let closestDriver = null;
    let minDist = Infinity;
    const refLat = delivery.lat ?? incidentDriver.lat;
    const refLng = delivery.lng ?? incidentDriver.lng;

    for (const driver of available) {
      if (refLat === null || refLng === null) continue;
      const dist = haversine(driver.lat, driver.lng, refLat, refLng);
      if (dist < minDist) {
        minDist = dist;
        closestDriver = driver;
      }
    }

    if (closestDriver) {
      delivery.driverId = closestDriver.id;
      reassignments.push({
        deliveryId: delivery.id,
        previousDriverId: incidentDriverId,
        newDriverId: closestDriver.id,
        distanceKm: Math.round(minDist * 100) / 100,
        reason,
      });
    }
  }

  return { incidentDriverId, reassignments };
}

/**
 * Compute and return the full optimised route map:
 * { [driverId]: { driver, orderedDeliveries, totalDistanceKm } }
 */
function getOptimizedRoutes() {
  const result = {};
  for (const driver of drivers) {
    const ordered = orderDriverDeliveries(driver.id);
    const totalDistanceKm =
      ordered.length === 0
        ? 0
        : Math.round(
            ordered.reduce((sum, d) => sum + (d.distanceFromPrevKm || 0), 0) * 100
          ) / 100;
    result[driver.id] = {
      driver: {
        id: driver.id,
        name: driver.name,
        status: driver.status,
        lat: driver.lat,
        lng: driver.lng,
      },
      orderedDeliveries: ordered,
      totalDistanceKm,
    };
  }
  return result;
}

module.exports = {
  haversine,
  assignPendingDeliveries,
  orderDriverDeliveries,
  handleDriverIncident,
  getOptimizedRoutes,
};
