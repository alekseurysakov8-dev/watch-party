require('dotenv').config(); // читаем .env
const { Telegraf } = require('telegraf');
const express = require('express');
const http = require('http');
const path = require('path');
const crypto = require('crypto');

// --- Инициализация бота ---
const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) throw new Error('❌ BOT_TOKEN not set in .env');

const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const bot = new Telegraf(TOKEN); // Telegraf без polling

// --- Express сервер ---
const app = express();
const server = http.createServer(app);

// Статика фронта
app.use(express.static(path.join(__dirname, 'public')));

// Webhook Telegram
app.use(bot.webhookCallback('/bot'));

// Установка webhook один раз
(async () => {
  try {
    await bot.telegram.setWebhook(`${BASE_URL}/bot`);
    console.log('✅ Webhook set:', `${BASE_URL}/bot`);
  } catch (err) {
    console.error('❌ Error setting webhook:', err);
  }
})();

// --- Обработчики сообщений ---
bot.start((ctx) => {
  ctx.reply('🎬 Welcome! Send me a YouTube link or video URL to create a watch room.');
});

bot.on('text', async (ctx) => {
  const text = ctx.message.text.trim();
  let videoUrl = '';

  if (text.includes('youtu') || text.includes('vimeo') || text.includes('mp4')) {
    videoUrl = text;
  }

  if (!videoUrl) {
    await ctx.reply('❗ Please send a valid YouTube/Vimeo/video link.');
    return;
  }

  // Генерация уникального ID комнаты
  const roomId = crypto.randomBytes(3).toString('hex');
  const roomLink = `${BASE_URL}/?room=${encodeURIComponent(roomId)}&video=${encodeURIComponent(videoUrl)}`;

  await ctx.reply(`🎬 Room ready:\n${roomLink}`);
});

// Ловим ошибки бота
bot.catch((err, ctx) => {
  console.error('❌ Bot error:', err);
});

// --- Запуск сервера на Render ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server running on port', PORT);
});