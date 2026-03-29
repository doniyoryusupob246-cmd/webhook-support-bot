import { Redis } from '@upstash/redis';

let client = null;

export function isRedisConfigured() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

/** @returns {Redis | null} */
export function getRedis() {
  if (!isRedisConfigured()) return null;
  if (!client) {
    client = Redis.fromEnv();
  }
  return client;
}
