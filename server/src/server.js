/**
 * VTRIA ERP Backend Server
 * Main server entry point for VTRIA Engineering Solutions ERP System
 * Configured for WAMP Server Environment (Apache + PostgreSQL + Node.js)
 * Supports multi-location operations: Mangalore, Bangalore, Pune
 */

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { sequelize } = require('./config/database');
const logger = require('./utils/logger');
const licenseMiddleware = require('./middleware/license');
const websocketService = require('./services/websocketService');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const caseRoutes = require('./routes/cases');
const caseQueueRoutes = require('./routes/caseQueues');
const ticketRoutes = require('./routes/tickets');
const stockRoutes = require('./routes/stock');
const documentRoutes = require('./routes/documents');
const notificationRoutes = require('./routes/notifications');
const auditLogRoutes = require('./routes/auditLogs');

const app = express();
const server = http.createServer(app);

// Force port 5000 to avoid conflicts with other applications
// This will override any command-line arguments
process.env.PORT = process.env.PORT || '5000';
const PORT = parseInt(process.env.PORT, 10);
console.log(`Setting server port to: ${PORT}`);


// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration for WAMP Apache proxy
app.use(cors({
  origin: '*', // Allow all origins for development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-License-Key']
}));

// Add CORS headers manually to ensure they're always present
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-License-Key');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint - available at both root and /api/health
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'VTRIA ERP Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'VTRIA ERP Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Apply license middleware to all API routes except auth/login
// TEMPORARILY DISABLED FOR DEVELOPMENT
/*
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth/login') || req.path === '/health') {
    return next();
  }
  return licenseMiddleware(req, res, next);
});
*/

// Skip license check for development
app.use('/api', (req, res, next) => {
  // Add mock license data to request
  req.license = {
    isValid: true,
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
    features: ['all_features', 'premium'],
    maxUsers: 100,
    locations: ['Mangalore', 'Bangalore', 'Pune']
  };
  return next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/case-queues', caseQueueRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// Global error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      path: req.originalUrl
    }
  });
});

// Database connection and server startup
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');
    
    // Initialize case scheduler
    const caseScheduler = require('./utils/caseScheduler');
    caseScheduler.init();
    
    // Initialize ticket scheduler
    const ticketScheduler = require('./utils/ticketScheduler');
    ticketScheduler.initialize();
    
    // Initialize stock scheduler
    const stockScheduler = require('./utils/stockScheduler');
    stockScheduler.initialize();

    // Initialize WebSocket service
    websocketService.initialize(server);
    
    // Start the server
    server.listen(PORT, () => {
      console.info(`VTRIA ERP Server running on port ${PORT}`);
      console.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.info('Case lifecycle scheduler initialized');
      console.info('Ticket support scheduler initialized');
      console.info('Stock management scheduler initialized');
      console.info('WebSocket server initialized for real-time notifications');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};


// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  const caseScheduler = require('./utils/caseScheduler');
  const ticketScheduler = require('./utils/ticketScheduler');
  const stockScheduler = require('./utils/stockScheduler');
  caseScheduler.stop();
  ticketScheduler.stop();
  stockScheduler.stop();
  
  // Close WebSocket connections
  if (websocketService.io) {
    websocketService.io.close();
    logger.info('WebSocket server closed');
  }
  
  await sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  // Check if we should ignore SIGINT signals (for debugging)
  if (process.env.IGNORE_SIGINT === 'true') {
    logger.info('SIGINT received but ignored due to IGNORE_SIGINT=true');
    console.log('SIGINT received but ignored due to IGNORE_SIGINT=true');
    console.log('Server will continue running');
    return;
  }
  
  logger.info('SIGINT received, shutting down gracefully');
  const caseScheduler = require('./utils/caseScheduler');
  const ticketScheduler = require('./utils/ticketScheduler');
  const stockScheduler = require('./utils/stockScheduler');
  caseScheduler.stop();
  ticketScheduler.stop();
  stockScheduler.stop();
  
  // Close WebSocket connections
  if (websocketService.io) {
    websocketService.io.close();
    logger.info('WebSocket server closed');
  }
  
  await sequelize.close();
  process.exit(0);
});

startServer();

module.exports = app;
