// Mock Redis client to bypass dependencies
const logger = require('../utils/logger');

class MockRedis {
    constructor() {
        console.log('Redis disabled - using in-memory cache fallback');
        this.cache = new Map();
    }
    
    async get(key) {
        return this.cache.get(key) || null;
    }
    
    async set(key, value, ...args) {
        this.cache.set(key, value);
        return 'OK';
    }
    
    async del(key) {
        const existed = this.cache.has(key);
        this.cache.delete(key);
        return existed ? 1 : 0;
    }
    
    async exists(key) {
        return this.cache.has(key) ? 1 : 0;
    }
    
    async keys(pattern) {
        // Simple pattern matching for * only
        if (pattern === '*') {
            return Array.from(this.cache.keys());
        }
        return [];
    }
    
    async flushall() {
        this.cache.clear();
        return 'OK';
    }
    
    async ping() {
        return 'PONG';
    }
    
    // Mock event handlers
    on(event, callback) {
        // No-op for mock
        return this;
    }
    
    // Health check function
    async healthCheck() {
        return true;
    }
}

const redis = new MockRedis();
redis.healthCheck = redis.healthCheck.bind(redis);

module.exports = redis;
