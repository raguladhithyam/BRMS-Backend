import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Redis Client Configuration with retry logic and connection management
let redisClient: any = null;
let isConnecting = false;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY = 5000; // 5 seconds

const createRedisClient = () => {
  // Use environment variables or fallback to localhost
  const redisUrl = process.env.REDIS_URL || 
    `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;
  
  return createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > MAX_RECONNECT_ATTEMPTS) {
          console.warn('⚠️ Max Redis reconnection attempts reached. Disabling Redis.');
          return false; // Stop trying to reconnect
        }
        return Math.min(retries * 100, 3000); // Exponential backoff, max 3 seconds
      },
      connectTimeout: 10000, // 10 seconds
    }
  });
};

const setupRedisEventHandlers = (client: any) => {
  client.on('error', (err: any) => {
    console.error('❌ Redis Client Error:', err.message);
    // Don't attempt to reconnect on certain errors
    if (err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')) {
      console.warn('⚠️ Redis server not available. Continuing without Redis cache...');
    }
  });

  client.on('connect', () => {
    console.log('✅ Redis Client Connected');
    connectionAttempts = 0; // Reset connection attempts on successful connection
  });

  client.on('ready', () => {
    console.log('✅ Redis Client Ready');
  });

  client.on('end', () => {
    console.log('🔌 Redis Client Disconnected');
  });

  client.on('reconnecting', () => {
    connectionAttempts++;
    console.log(`🔄 Redis Client Reconnecting... (attempt ${connectionAttempts})`);
  });
};

export const connectRedis = async (): Promise<void> => {
  // Prevent multiple connection attempts
  if (isConnecting) {
    console.log('⏳ Redis connection already in progress...');
    return;
  }

  if (redisClient && redisClient.isOpen) {
    console.log('✅ Redis already connected');
    return;
  }

  try {
    isConnecting = true;
    
    // Create new client if none exists
    if (!redisClient) {
      redisClient = createRedisClient();
      setupRedisEventHandlers(redisClient);
    }

    // Only connect if not already connected
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    
    console.log('✅ Redis connection established successfully');
  } catch (error: any) {
    console.error('❌ Failed to connect to Redis:', error.message);
    console.warn('⚠️ Continuing without Redis cache...');
    
    // Don't throw error to prevent app from crashing
    // The app should work without Redis
  } finally {
    isConnecting = false;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.disconnect();
      console.log('🔌 Redis disconnected gracefully');
    }
  } catch (error: any) {
    console.error('❌ Error disconnecting Redis:', error.message);
  } finally {
    redisClient = null; // Reset client
    isConnecting = false;
    connectionAttempts = 0;
  }
};

// Get Redis client (with null check)
export const getRedisClient = () => {
  return redisClient;
};

// Check if Redis is available
export const isRedisAvailable = (): boolean => {
  return redisClient && redisClient.isOpen;
};

export default redisClient;