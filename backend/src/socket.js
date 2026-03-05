let io = null;

function init(socketIoInstance) {
  io = socketIoInstance;
}

function getIO() {
  return io;
}

function emitLocationUpdate(driverData) {
  if (io) {
    io.emit('location_update', driverData);
  }
}

function emitDeliveryUpdate(deliveryData) {
  if (io) {
    io.emit('delivery_update', deliveryData);
  }
}

function emitRouteUpdate(routeData) {
  if (io) {
    io.emit('route_update', routeData);
  }
}

function emitIncident(incidentData) {
  if (io) {
    io.emit('driver_incident', incidentData);
  }
}

module.exports = { init, getIO, emitLocationUpdate, emitDeliveryUpdate, emitRouteUpdate, emitIncident };
