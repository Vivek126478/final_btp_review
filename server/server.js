const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const rootEnvPath = path.join(__dirname, '../.env');
const rootEnvExamplePath = path.join(__dirname, '../.env.example');
const envPath = fs.existsSync(rootEnvPath) ? rootEnvPath : rootEnvExamplePath;
require('dotenv').config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 5001;

// Initialize Cron Jobs
const initPnrCron = require('./cron/pnrUpdater');
initPnrCron();

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/email-verification', require('./routes/emailVerification'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/rides', require('./routes/rides'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/sos', require('./routes/sos'));
app.use('/api/ipfs', require('./routes/ipfs'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'D-CARPOOL API'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to D-CARPOOL API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      rides: '/api/rides',
      ratings: '/api/ratings',
      sos: '/api/sos',
      complaints: '/api/complaints',
      admin: '/api/admin',
      ipfs: '/api/ipfs',
      health: '/api/health'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║                                           ║
║         D-CARPOOL API SERVER              ║
║                                           ║
║   Server running on port ${PORT}           ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║                                           ║
║   API Documentation:                      ║
║   http://localhost:${PORT}/                  ║
║                                           ║
╚═══════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  if (!server) {
    process.exit(0);
  }
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
