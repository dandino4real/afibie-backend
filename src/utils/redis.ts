import { createClient } from 'redis';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' }); // Explicit path

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redisClient = createClient({ url: redisUrl });

redisClient.on('error', (err: Error) => {
  console.error('❌ Redis Error:', err);
});

redisClient.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redisClient.connect();

export async function setCache(key: string, value: any, ttlSeconds = 3600) {
  await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
}

export async function getCache<T>(key: string): Promise<T | null> {
  const val = await redisClient.get(key);
  if (!val) return null;
  return JSON.parse(val);
}

export async function deleteCache(key: string) {
  await redisClient.del(key);
}
