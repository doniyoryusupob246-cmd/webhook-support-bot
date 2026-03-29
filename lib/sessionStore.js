import { getRedis } from './redis.js';

const PREFIX = 'tg:sess:';
const TTL_SEC = 60 * 60 * 24 * 7; // 7 дней

/** Локально без Redis — один процесс; на Vercel без Redis сессии не переживают инстансы */
const memory = new Map();

function key(chatId) {
  return PREFIX + String(chatId);
}

export async function getSession(chatId) {
  const r = getRedis();
  const id = String(chatId);
  if (r) {
    const v = await r.get(key(chatId));
    if (v == null) return undefined;
    return typeof v === 'string' ? JSON.parse(v) : v;
  }
  return memory.get(id);
}

export async function setSession(chatId, user) {
  const r = getRedis();
  const id = String(chatId);
  if (r) {
    await r.set(key(chatId), JSON.stringify(user), { ex: TTL_SEC });
  } else {
    memory.set(id, user);
  }
}

export async function deleteSession(chatId) {
  const r = getRedis();
  const id = String(chatId);
  if (r) {
    await r.del(key(chatId));
  } else {
    memory.delete(id);
  }
}
