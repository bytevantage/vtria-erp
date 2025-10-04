const express = require('express');
const router = express.Router();
const db = require('../config/database');
const logger = require('../utils/logger');

// Basic health check
router.get('/', async (req, res) => {
  try {
    const healthCheck = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      service: 'VTRIA ERP API',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime()
    };

    res.status(200).json(healthCheck);
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Detailed health check with dependencies
router.get('/detailed', async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'VTRIA ERP API',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    dependencies: {}
  };

  let allHealthy = true;

  // Check database connection
  try {
    await db.execute('SELECT 1');
    healthCheck.dependencies.database = {
      status: 'OK',
      connection: 'active',
      host: process.env.DB_HOST,
      database: process.env.DB_NAME
    };
  } catch (error) {
    allHealthy = false;
    healthCheck.dependencies.database = {
      status: 'ERROR',
      error: error.message
    };
  }

  // Check disk space
  try {
    const fs = require('fs');
    const stats = fs.statSync('./');
    healthCheck.dependencies.filesystem = {
      status: 'OK',
      writable: true
    };
  } catch (error) {
    allHealthy = false;
    healthCheck.dependencies.filesystem = {
      status: 'ERROR',
      error: error.message
    };
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const memoryMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  };

  healthCheck.dependencies.memory = {
    status: memoryMB.heapUsed < 512 ? 'OK' : 'WARNING',
    usage: memoryMB,
    unit: 'MB'
  };

  if (memoryMB.heapUsed >= 512) {
    allHealthy = false;
  }

  healthCheck.status = allHealthy ? 'OK' : 'WARNING';
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json(healthCheck);
});

module.exports = router;