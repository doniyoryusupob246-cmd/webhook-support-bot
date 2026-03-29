import { Redis } from '@upstash/redis';
import { trimEnvValue } from './envTrim.js';

let client = null;

function urlAndToken() {
  const url = trimEnvValue(process.env.UPSTASH_REDIS_REST_URL);
  const token = trimEnvValue(process.env.UPSTASH_REDIS_REST_TOKEN);
  return { url, token };
}

export function isRedisConfigured() {
  const { url, token } = urlAndToken();
  return Boolean(url && token);
}

/** @returns {Redis | null} */
export function getRedis() {
  if (!isRedisConfigured()) return null;
  if (!client) {
    const { url, token } = urlAndToken();
    client = new Redis({ url, token });
  }
  return client;
}
