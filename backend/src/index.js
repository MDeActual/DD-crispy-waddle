const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const socketService = require('./socket');
const authRoutes = require('./routes/auth');
const driverRoutes = require('./routes/drivers');
const deliveryRoutes = require('./routes/deliveries');

const PORT = process.env.PORT || 3001;

const app = express();

// CORS - allow Vite dev server and general use
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/deliveries', deliveryRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// HTTP + Socket.io server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

socketService.init(io);

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Logistics tracking server running on port ${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
  });
}

module.exports = { app, server };
