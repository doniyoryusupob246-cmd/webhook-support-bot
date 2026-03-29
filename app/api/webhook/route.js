import { ensureTelegramBot, getBot } from '@/lib/bot.js';
import { trimEnvValue } from '@/lib/envTrim.js';
import { isRedisConfigured } from '@/lib/redis.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Без секретов: проверка, что деплой видит env (откройте в браузере) */
export async function GET() {
  return Response.json({
    ok: true,
    redisConfigured: isRedisConfigured(),
    webhookSecretSet: Boolean(trimEnvValue(process.env.WEBHOOK_SECRET)),
    vercel: process.env.VERCEL === '1',
  });
}

export async function POST(request) {
  const secret = trimEnvValue(process.env.WEBHOOK_SECRET);
  if (secret) {
    const token = request.headers.get('x-telegram-bot-api-secret-token');
    if (token !== secret) {
      console.warn(
        '[webhook] 403: WEBHOOK_SECRET задан, но заголовок от Telegram не совпал. Перезапустите: npm run set-webhook (с тем же секретом в .env) или уберите WEBHOOK_SECRET.',
      );
      return new Response('Forbidden', { status: 403 });
    }
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  try {
    await ensureTelegramBot();
    getBot().processUpdate(update);
    // processUpdate не ждёт async-обработчики; на Vercel ответ мог «обрезать» sendMessage
    const graceMs = Number(process.env.WEBHOOK_PROCESSING_GRACE_MS);
    const wait =
      Number.isFinite(graceMs) && graceMs >= 0
        ? graceMs
        : process.env.VERCEL === '1'
          ? 1000
          : 0;
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait));
    }
  } catch (e) {
    console.error('processUpdate:', e);
    return new Response('Error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
}
