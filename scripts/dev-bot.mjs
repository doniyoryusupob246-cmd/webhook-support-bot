/**
 * Локальная разработка: long polling (Telegram не шлёт апдейты на localhost по webhook).
 * Запускается вместе с Next: npm run dev
 */
import 'dotenv/config';

process.env.TELEGRAM_USE_POLLING = 'true';

const { initTelegramBot } = await import('../lib/bot.js');
await initTelegramBot();
