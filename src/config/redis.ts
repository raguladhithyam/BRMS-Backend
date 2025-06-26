import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Redis Client Configuration Localhost
// const redisClient = createClient({
//   url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
// });

// Redis Client Configuration Production (Railway)
const redisClient = createClient({
  url: `redis://default:MqFwonGEyZblDUmpQKTweKiCwdubvbGT@centerbeam.proxy.rlwy.net:35448`
});

redisClient.on('error', (err) => {
  console.error('❌ Redis Client Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Redis Client Connected');
});

redisClient.on('ready', () => {
  console.log('✅ Redis Client Ready');
});

redisClient.on('end', () => {
  console.log('🔌 Redis Client Disconnected');
});

export const connectRedis = async (): Promise<void> => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    // Don't throw error to prevent app from crashing if Redis is not available
    console.warn('⚠️ Continuing without Redis cache...');
  }
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient.isOpen) {
      await redisClient.disconnect();
    }
  } catch (error) {
    console.error('❌ Error disconnecting Redis:', error);
  }
};

export default redisClient;