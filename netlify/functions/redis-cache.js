const Redis = require('redis');

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
let redisClient = null;

// Initialize Redis connection
async function getRedisClient() {
    if (!redisClient) {
        redisClient = Redis.createClient({
            url: REDIS_URL,
            socket: {
                connectTimeout: 5000,
                lazyConnect: true
            }
        });
        
        redisClient.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });
        
        await redisClient.connect();
    }
    return redisClient;
}

// Store tracking data with TTL (Time To Live)
async function storeTrackingData(fbp, fbc, userIP, userAgent, ttlSeconds = 3600) {
    try {
        const client = await getRedisClient();
        const key = `tracking:${fbp}:${fbc}`;
        const data = {
            userIP: userIP,
            userAgent: userAgent,
            timestamp: Date.now()
        };
        
        await client.setEx(key, ttlSeconds, JSON.stringify(data));
        console.log(`Stored tracking data for key: ${key}`);
        return true;
    } catch (error) {
        console.error('Error storing tracking data:', error);
        return false;
    }
}

// Retrieve tracking data
async function getTrackingData(fbp, fbc) {
    try {
        const client = await getRedisClient();
        const key = `tracking:${fbp}:${fbc}`;
        const data = await client.get(key);
        
        if (data) {
            const parsed = JSON.parse(data);
            console.log(`Retrieved tracking data for key: ${key}`);
            return parsed;
        }
        
        console.log(`No tracking data found for key: ${key}`);
        return null;
    } catch (error) {
        console.error('Error retrieving tracking data:', error);
        return null;
    }
}

// Delete tracking data (cleanup)
async function deleteTrackingData(fbp, fbc) {
    try {
        const client = await getRedisClient();
        const key = `tracking:${fbp}:${fbc}`;
        await client.del(key);
        console.log(`Deleted tracking data for key: ${key}`);
        return true;
    } catch (error) {
        console.error('Error deleting tracking data:', error);
        return false;
    }
}

module.exports = {
    storeTrackingData,
    getTrackingData,
    deleteTrackingData
};
