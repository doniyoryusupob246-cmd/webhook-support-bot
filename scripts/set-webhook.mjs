import 'dotenv/config';

const token = process.env.BOT_TOKEN;
const baseUrl = process.env.WEBHOOK_URL?.replace(/\/$/, '');
const secret = process.env.WEBHOOK_SECRET;

if (!token) {
  console.error('Set BOT_TOKEN in .env');
  process.exit(1);
}

if (!baseUrl) {
  console.error('Set WEBHOOK_URL in .env, e.g. https://your-domain.com');
  process.exit(1);
}

const webhookPath = '/api/webhook';
const url = `${baseUrl}${webhookPath}`;

const params = new URLSearchParams({ url });

if (secret) {
  params.set('secret_token', secret);
}

const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?${params}`);
const data = await res.json();

if (!data.ok) {
  console.error('setWebhook failed:', data);
  process.exit(1);
}

console.log('Webhook set:', url);
if (secret) {
  console.log('Secret token enabled — set WEBHOOK_SECRET in .env to the same value');
}
