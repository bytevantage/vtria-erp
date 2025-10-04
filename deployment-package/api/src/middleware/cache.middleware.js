const redis = require('../config/redis');
const logger = require('../utils/logger');

class CacheMiddleware {
    /**
     * Generate cache key based on request parameters
     */
    static generateKey(req) {
        return `cache:${req.originalUrl}:${JSON.stringify(req.query)}:${req.user?.id || 'anonymous'}`;
    }
    
    /**
     * Cache middleware factory
     * @param {Object} options Cache options
     * @param {number} options.ttl Time to live in seconds
     * @param {function} options.keyGenerator Custom key generator function
     */
    static route(options = {}) {
        const { ttl = 300, keyGenerator = CacheMiddleware.generateKey } = options;
        
        return async (req, res, next) => {
            // Skip cache for non-GET requests
            if (req.method !== 'GET') {
                return next();
            }
            
            const timer = logger.startTimer();
            const cacheKey = keyGenerator(req);
            
            try {
                // Try to get cached response
                const cachedResponse = await redis.get(cacheKey);
                
                if (cachedResponse) {
                    const parsed = JSON.parse(cachedResponse);
                    timer.end('Cache hit');
                    return res.json(parsed);
                }
                
                // If not cached, capture the response
                const originalJson = res.json;
                res.json = (body) => {
                    // Store in cache
                    redis.setex(cacheKey, ttl, JSON.stringify(body))
                        .catch(err => logger.error('Cache storage error:', err));
                    
                    timer.end('Cache miss');
                    originalJson.call(res, body);
                };
                
                next();
            } catch (error) {
                logger.error('Cache middleware error:', error);
                next();
            }
        };
    }
    
    /**
     * Clear cache entries matching a pattern
     */
    static async clearCache(pattern) {
        try {
            const keys = await redis.keys(pattern);
            if (keys.length > 0) {
                await redis.del(keys);
                logger.info(`Cleared ${keys.length} cache entries matching pattern: ${pattern}`);
            }
        } catch (error) {
            logger.error('Cache clearing error:', error);
            throw error;
        }
    }
    
    /**
     * Cache wrapper for expensive computations
     */
    static async cacheComputation(key, ttl, computeFunction) {
        try {
            const cached = await redis.get(key);
            if (cached) {
                return JSON.parse(cached);
            }
            
            const result = await computeFunction();
            await redis.setex(key, ttl, JSON.stringify(result));
            
            return result;
        } catch (error) {
            logger.error('Cache computation error:', error);
            throw error;
        }
    }
}

module.exports = CacheMiddleware;
