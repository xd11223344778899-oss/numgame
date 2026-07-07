import http from 'node:http';
import {
  Client,
  GatewayIntentBits,
  Partials,
  AttachmentBuilder,
  Events,
} from 'discord.js';
import { config } from './config.js';
import { gameManager } from './game/manager.js';
import { getBannerBuffer, preloadBanner } from './image/banner.js';

preloadBanner();

function startHealthServer() {
  const port = Number(process.env.PORT) || 3000;

  http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  }).listen(port, '0.0.0.0', () => {
    console.log(`Health server running on port ${port}`);
  });
}

startHealthServer();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

function createBannerAttachment() {
  return new AttachmentBuilder(getBannerBuffer(), { name: 'game-start.png' });
}

/**
 * @param {string} channelId
 * @param {string} text
 */
async function sendToChannel(channelId, text) {
  const channel = await client.channels.fetch(channelId);
  if (!channel?.isTextBased()) {
    return;
  }

  await channel.send({
    content: text,
    allowedMentions: { users: [] },
  });
}

/**
 * @param {'higher' | 'lower'} direction
 * @param {number} attemptsLeft
 */
function formatHint(direction, attemptsLeft) {
  const label = direction === 'higher' ? 'أكبر' : 'أصغر';
  return `الرقم ${label} • المحاولات المتبقية: ${attemptsLeft}`;
}

/**
 * @param {import('discord.js').Message} message
 */
async function handleStart(message) {
  const result = gameManager.start(message.channel.id, message.author.id, {
    onExpired: ({ channelId, target }) =>
      sendToChannel(channelId, `⏰ انتهى الوقت! الرقم الصحيح كان: ${target}`),
  });

  if ('error' in result) {
    await message.reply({
      content: 'توجد لعبة نشطة بالفعل.',
      allowedMentions: { users: [] },
    });
    return;
  }

  await message.reply({
    files: [createBannerAttachment()],
    allowedMentions: { users: [] },
  });
}

/**
 * @param {import('discord.js').Message} message
 */
async function handleStop(message) {
  const game = gameManager.getInChannel(message.channel.id);
  if (!game) {
    await message.reply({
      content: 'لا توجد لعبة نشطة.',
      allowedMentions: { users: [] },
    });
    return;
  }

  gameManager.end();

  await message.reply({
    content: 'تم إيقاف اللعبة.',
    allowedMentions: { users: [] },
  });
}

/**
 * @param {import('discord.js').Message} message
 */
async function handleGuessMessage(message) {
  const game = gameManager.getInChannel(message.channel.id);
  if (!game) {
    return;
  }

  const trimmed = message.content.trim();
  if (!/^\d{1,3}$/.test(trimmed)) {
    return;
  }

  const guess = Number(trimmed);
  if (!Number.isInteger(guess) || guess < config.minNumber || guess > config.maxNumber) {
    await message.reply({
      content: `يرجى إرسال رقم صحيح من ${config.minNumber} إلى ${config.maxNumber}.`,
      allowedMentions: { users: [] },
    });
    gameManager.resetTimer();
    return;
  }

  const outcome = gameManager.processGuess(guess);
  if (!outcome) {
    return;
  }

  let text;

  switch (outcome.result) {
    case 'win':
      text = `أحسنت. الرقم الصحيح هو ${outcome.target}.`;
      break;
    case 'lose':
      text = `انتهت المحاولات. الرقم الصحيح كان ${outcome.target}.`;
      break;
    case 'higher':
      text = formatHint('higher', outcome.game.attemptsLeft);
      break;
    case 'lower':
      text = formatHint('lower', outcome.game.attemptsLeft);
      break;
  }

  await message.reply({
    content: text,
    allowedMentions: { users: [] },
  });

  if (outcome.result === 'higher' || outcome.result === 'lower') {
    gameManager.resetTimer();
  }
}

/**
 * @param {import('discord.js').Message} message
 */
async function handleMessage(message) {
  if (message.author.bot) {
    return;
  }

  const content = message.content.trim();

  if (content.startsWith(config.prefix)) {
    const command = content.slice(config.prefix.length).trim();

    if (command === 'تخمين') {
      await handleStart(message);
      return;
    }

    if (command === 'ايقاف') {
      await handleStop(message);
      return;
    }
  }

  await handleGuessMessage(message);
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`البوت جاهز: ${readyClient.user.tag}`);
  console.log(`البادئة: ${config.prefix}`);
  console.log(`الألعاب النشطة: ${gameManager.activeCount}`);
});

client.on(Events.MessageCreate, async (message) => {
  try {
    await handleMessage(message);
  } catch (error) {
    console.error('خطأ في معالجة الرسالة:', error);
  }
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

client.login(config.token).catch((error) => {
  console.error('فشل تسجيل الدخول إلى Discord:', error);
  process.exit(1);
});
