const Redis = require('ioredis');
const logger = require('./logger'); // You already use this logger anywhere in your code

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Create Redis client
const redisClient = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
    // lazyConnect: true,
});

// Events
redisClient.on('connect', () => {
    logger.info('🔑 Redis connected successfully.');
});

redisClient.on('error', (err) => {
    logger.error('❌ Redis Connection Error:', err);
    // Do NOT crash the app — fallback gracefully
});

// Helper: Set cache value
async function setCache(key, value, ttl = 60) {
    try {
        const stringValue = JSON.stringify(value);
        if (ttl > 0) {
            await redisClient.set(key, stringValue, 'EX', ttl);
        } else {
            await redisClient.set(key, stringValue);
        }
    } catch (err) {
        logger.error(`Redis setCache failed for key ${key}: ${err.message}`);
    }
}

// Helper: Get cache value
async function getCache(key) {
    try {
        const result = await redisClient.get(key);
        return result ? JSON.parse(result) : null;
    } catch (err) {
        logger.error(`Redis getCache failed for key ${key}: ${err.message}`);
        return null; // safe fallback
    }
}

module.exports = {
    redisClient,
    getCache,
    setCache
};
