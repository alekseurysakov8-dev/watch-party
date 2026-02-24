// bot.js
const express = require('express');
const path = require('path');
const { Telegraf } = require('telegraf');

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN); // токен берётся из Environment Variables

// фронт
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// бот реагирует на /start
bot.start((ctx) => ctx.reply('Hello! Bot is running.'));

// бот реагирует на пересылаемые видео и ссылки на t.me
bot.on('message', async (ctx) => {
  if (ctx.message.video || ctx.message.text?.includes('t.me')) {
    await ctx.reply('Got your video/link!');
  }
});

// запускаем сервер и бот
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
bot.launch();