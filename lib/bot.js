import TelegramBot from 'node-telegram-bot-api';
import { BOT_TOKEN, ADMIN_ID } from './config.js';
import { isRedisConfigured } from './redis.js';
import { getSession, setSession } from './sessionStore.js';
import { saveMessage } from './storage.js';

const TEXT = {
  ru: {
    chooseLang: '🌍 Выберите язык:',
    chooseMode: 'Как вы хотите написать?',
    chooseModeVar: '👤 Представиться',
    chooseModeVar2: '🕶 Анонимно',
    askName: 'Введите имя и фамилию:',
    askPhone: 'Поделитесь номером телефона:',
    writeMsg: '✍️ Напишите ваше сообщение',
    sent: '✅ Сообщение отправлено администратору',
  },
  uz: {
    chooseLang: '🌍 Tilni tanlang:',
    chooseMode: 'Qanday yozmoqchisiz?',
    chooseModeVar: "👤 O'zingizni tanishtiring",
    chooseModeVar2: '🕶 Anonim',
    askName: 'Ism va familiyangizni kiriting:',
    askPhone: 'Telefon raqamingizni ulashing:',
    writeMsg: '✍️ Xabaringizni yozing',
    sent: '✅ Xabar administratorga yuborildi',
  },
};

function attachHandlers(bot) {
  bot.onText(/\/start/, async (msg) => {
    await setSession(msg.chat.id, { step: 'lang' });

    bot.sendMessage(msg.chat.id, TEXT.ru.chooseLang, {
      reply_markup: {
        keyboard: [['🇺🇿 O‘zbekcha', '🇷🇺 Русский']],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    });
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (msg.from?.is_bot) return;

    const text = msg.text;

    if (!text) return;
    if (text.startsWith('/')) return;

    if (chatId === ADMIN_ID && msg.reply_to_message) {
      const match = msg.reply_to_message.text?.match(/USER_CHAT_ID:(\d+)/);
      if (!match) return;

      const userChatId = match[1];

      await bot.sendMessage(userChatId, `💬 Ответ от поддержки:\n\n${text}`);
      return;
    }

    let user = await getSession(chatId);
    if (!user) return;

    if (user.step === 'lang') {
      user.lang = text.includes('Рус') ? 'ru' : 'uz';
      user.step = 'mode';
      await setSession(chatId, user);

      bot.sendMessage(chatId, TEXT[user.lang].chooseMode, {
        reply_markup: {
          keyboard: [[TEXT[user.lang].chooseModeVar, TEXT[user.lang].chooseModeVar2]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
      return;
    }

    if (user.step === 'mode') {
      user.anonymous = text.includes('Аноним') || text.includes('Anonim');

      if (user.anonymous) {
        user.step = 'message';
        await setSession(chatId, user);
        bot.sendMessage(chatId, TEXT[user.lang].writeMsg, {
          reply_markup: { remove_keyboard: true },
        });
      } else {
        user.step = 'name';
        await setSession(chatId, user);
        bot.sendMessage(chatId, TEXT[user.lang].askName);
      }
      return;
    }

    if (user.step === 'name') {
      user.name = text;
      user.step = 'phone';
      await setSession(chatId, user);

      bot.sendMessage(chatId, TEXT[user.lang].askPhone);
      return;
    }

    if (user.step === 'phone') {
      user.phone = text;
      user.step = 'message';
      await setSession(chatId, user);

      bot.sendMessage(chatId, TEXT[user.lang].writeMsg);
      return;
    }

    if (user.step === 'message') {
      const info = user.anonymous ? '🕶 Аноним' : `👤 ${user.name}\n📞 ${user.phone}`;

      const messageData = {
        chatId,
        name: user.name || null,
        phone: user.phone || null,
        anonymous: user.anonymous,
        message: text,
        date: new Date().toISOString(),
      };

      await saveMessage(messageData);

      await bot.sendMessage(
        ADMIN_ID,
        `📩 Новое сообщение
👤 USER_CHAT_ID:${chatId}

${info}

💬 ${text}`,
      );

      await bot.sendMessage(chatId, TEXT[user.lang].sent);
    }
  });
}

const globalForBot = globalThis;

function createWebhookBot() {
  const bot = new TelegramBot(BOT_TOKEN, { polling: false });
  attachHandlers(bot);
  return bot;
}

async function deleteWebhookRemote() {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`;
  const res = await fetch(url, { method: 'POST' });
  const data = await res.json();
  if (!data.ok) {
    console.warn('[telegram] deleteWebhook:', data);
  }
}

function createPollingBot() {
  const bot = new TelegramBot(BOT_TOKEN, { polling: true });
  attachHandlers(bot);
  return bot;
}

let initPromise = null;

/**
 * Long polling только при TELEGRAM_USE_POLLING=true (см. scripts/dev-bot.mjs).
 * Иначе — webhook: апдейты приходят в POST /api/webhook.
 */
export async function initTelegramBot() {
  if (globalForBot.__supportBot) return;
  if (!BOT_TOKEN) {
    console.warn('[telegram] BOT_TOKEN не задан');
    return;
  }

  if (process.env.VERCEL === '1' && !isRedisConfigured()) {
    console.warn(
      '[telegram] На Vercel задайте UPSTASH_REDIS_REST_URL и UPSTASH_REDIS_REST_TOKEN (иначе сессии не сохраняются между запросами).',
    );
  }

  const usePolling = process.env.TELEGRAM_USE_POLLING === 'true';

  if (usePolling) {
    await deleteWebhookRemote();
    globalForBot.__supportBot = createPollingBot();
    console.log('[telegram] polling (локальная разработка)');
  } else {
    globalForBot.__supportBot = createWebhookBot();
    console.log('[telegram] webhook (processUpdate → /api/webhook)');
  }
}

/** Первый запрос к webhook поднимает бота (npm run start / продакшен). */
export async function ensureTelegramBot() {
  if (globalForBot.__supportBot) return;
  if (!initPromise) {
    initPromise = initTelegramBot().finally(() => {
      initPromise = null;
    });
  }
  await initPromise;
}

export function getBot() {
  if (!globalForBot.__supportBot) {
    throw new Error('Telegram-бот ещё не инициализирован');
  }
  return globalForBot.__supportBot;
}
