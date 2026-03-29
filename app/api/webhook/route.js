import { ensureTelegramBot, getBot } from '@/lib/bot.js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const token = request.headers.get('x-telegram-bot-api-secret-token');
    if (token !== secret) {
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
  } catch (e) {
    console.error('processUpdate:', e);
    return new Response('Error', { status: 500 });
  }

  return new Response('OK', { status: 200 });
}
