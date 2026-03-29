import 'dotenv/config';
import { trimEnvValue } from './envTrim.js';

export const BOT_TOKEN = trimEnvValue(process.env.BOT_TOKEN);
export const ADMIN_ID = Number(trimEnvValue(process.env.ADMIN_ID));
