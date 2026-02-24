const express = require('express');
const path = require('path');
const { Telegraf } = require('telegraf');

if (!process.env.BOT_TOKEN) {
  throw new Error('BOT_TOKEN is not set');
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// ===== Express =====
const app = express();
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== Telegram =====
bot.start((ctx) => ctx.reply('Hello! Bot is running.'));

bot.on('message', async (ctx) => {
  try {
    if (ctx.message.video || ctx.message.text?.includes('t.me')) {
      await ctx.reply('Got your video/link!');
    }
  } catch (err) {
    console.error('Message error:', err);
  }
});

// ===== Start =====
async function start() {
  await bot.launch();
  console.log('Bot started');
}

start().catch(console.error);

// graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// ===== Server =====
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});