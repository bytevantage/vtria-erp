const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Simple logger implementation
const logger = {
    error: (message) => {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} ERROR: ${message}\n`;
        console.error(`ERROR: ${message}`);
        fs.appendFileSync(path.join(logsDir, 'error.log'), logMessage);
        fs.appendFileSync(path.join(logsDir, 'combined.log'), logMessage);
    },
    warn: (message) => {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} WARN: ${message}\n`;
        console.warn(`WARN: ${message}`);
        fs.appendFileSync(path.join(logsDir, 'combined.log'), logMessage);
    },
    info: (message) => {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} INFO: ${message}\n`;
        console.info(`INFO: ${message}`);
        fs.appendFileSync(path.join(logsDir, 'combined.log'), logMessage);
    },
    http: (message) => {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} HTTP: ${message}\n`;
        console.log(`HTTP: ${message}`);
        fs.appendFileSync(path.join(logsDir, 'combined.log'), logMessage);
    },
    debug: (message) => {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} DEBUG: ${message}\n`;
        console.debug(`DEBUG: ${message}`);
        fs.appendFileSync(path.join(logsDir, 'combined.log'), logMessage);
    }
};

// Add request logging middleware
logger.middleware = (req, res, next) => {
    logger.http(`${req.method} ${req.url}`);
    next();
};

// Add performance monitoring
logger.startTimer = () => {
    return {
        start: process.hrtime(),
        end: (operation) => {
            const elapsed = process.hrtime(this.start);
            const duration = (elapsed[0] * 1000) + (elapsed[1] / 1000000);
            logger.debug(`${operation} completed in ${duration.toFixed(3)}ms`);
        }
    };
};

module.exports = logger;
