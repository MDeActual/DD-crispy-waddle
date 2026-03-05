const bcrypt = require('bcryptjs');

// In-memory data store with seed data

const users = [
  {
    id: 'u1',
    name: 'Alice Admin',
    email: 'admin@logistics.com',
    password: bcrypt.hashSync('password123', 10),
    role: 'admin',
    mfaEnabled: false,
    mfaSecret: null,
  },
  {
    id: 'u2',
    name: 'Dave Dispatcher',
    email: 'dispatcher@logistics.com',
    password: bcrypt.hashSync('password123', 10),
    role: 'dispatcher',
    mfaEnabled: false,
    mfaSecret: null,
  },
  {
    id: 'u3',
    name: 'Dan Driver',
    email: 'driver1@logistics.com',
    password: bcrypt.hashSync('password123', 10),
    role: 'driver',
    mfaEnabled: false,
    mfaSecret: null,
  },
  {
    id: 'u4',
    name: 'Sara Speed',
    email: 'driver2@logistics.com',
    password: bcrypt.hashSync('password123', 10),
    role: 'driver',
    mfaEnabled: false,
    mfaSecret: null,
  },
];

const drivers = [
  {
    id: 'd1',
    userId: 'u3',
    name: 'Dan Driver',
    status: 'active',
    lat: 37.7749,
    lng: -122.4194,
    lastUpdate: Date.now(),
  },
  {
    id: 'd2',
    userId: 'u4',
    name: 'Sara Speed',
    status: 'active',
    lat: 37.7849,
    lng: -122.4094,
    lastUpdate: Date.now(),
  },
];

const deliveries = [
  {
    id: 'del1',
    trackingNumber: 'TRK001',
    recipient: 'John Smith',
    address: '123 Main St, SF',
    status: 'pending',
    driverId: null,
    lat: 37.78,
    lng: -122.41,
  },
  {
    id: 'del2',
    trackingNumber: 'TRK002',
    recipient: 'Jane Doe',
    address: '456 Oak Ave, SF',
    status: 'in_transit',
    driverId: 'd1',
    lat: 37.79,
    lng: -122.42,
  },
  {
    id: 'del3',
    trackingNumber: 'TRK003',
    recipient: 'Bob Wilson',
    address: '789 Pine St, SF',
    status: 'delivered',
    driverId: 'd2',
    lat: 37.77,
    lng: -122.43,
  },
  {
    id: 'del4',
    trackingNumber: 'TRK004',
    recipient: 'Alice Brown',
    address: '321 Elm St, SF',
    status: 'pending',
    driverId: null,
    lat: 37.76,
    lng: -122.4,
  },
  {
    id: 'del5',
    trackingNumber: 'TRK005',
    recipient: 'Charlie Green',
    address: '654 Maple Dr, SF',
    status: 'in_transit',
    driverId: 'd2',
    lat: 37.795,
    lng: -122.415,
  },
];

module.exports = { users, drivers, deliveries };
