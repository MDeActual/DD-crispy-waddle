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

module.exports = { init, getIO, emitLocationUpdate, emitDeliveryUpdate };
