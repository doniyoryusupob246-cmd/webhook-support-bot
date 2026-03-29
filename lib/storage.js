import fs from 'fs';
import path from 'path';
import { getRedis } from './redis.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_PATH = path.join(DATA_DIR, 'messages.json');

const MESSAGES_LIST_KEY = 'messages:log';
const MESSAGES_MAX = 10_000;

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, JSON.stringify([], null, 2));
  }
}

export async function saveMessage(data) {
  const r = getRedis();
  if (r) {
    await r.lpush(MESSAGES_LIST_KEY, JSON.stringify(data));
    await r.ltrim(MESSAGES_LIST_KEY, 0, MESSAGES_MAX - 1);
    return;
  }

  try {
    ensureDataFile();
    const file = fs.readFileSync(DATA_PATH, 'utf-8');
    const messages = JSON.parse(file);
    messages.push(data);
    fs.writeFileSync(DATA_PATH, JSON.stringify(messages, null, 2));
  } catch (err) {
    console.error('Ошибка сохранения:', err);
  }
}
