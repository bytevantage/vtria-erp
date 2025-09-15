// Mock rate limiter to bypass dependencies
const logger = require('../utils/logger');

class RateLimiter {
    constructor() {
        console.log('Rate limiting disabled due to missing dependencies');
    }
    
    // Mock middleware - no rate limiting
    standard() {
        return (req, res, next) => next();
    }
    
    // Mock middleware - no rate limiting
    strict() {
        return (req, res, next) => next();
    }
    
    // Mock middleware - no rate limiting
    auth() {
        return (req, res, next) => next();
    }
    
    // Mock middleware - no rate limiting
    custom(options) {
        return (req, res, next) => next();
    }
}

module.exports = new RateLimiter();
