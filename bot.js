const express = require('express');
const path = require('path');
const { Telegraf } = require('telegraf');

const app = express();

// ====== ПРОВЕРКА ТОКЕНА ======
if (!process.env.BOT_TOKEN) {
  console.error('❌ BOT_TOKEN is missing in Environment Variables');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// ====== ОТДАЁМ ФРОНТ ======
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ====== /start ======
bot.start((ctx) => {
  ctx.reply('🚀 Watch Party bot is working!');
});

// ====== ОБРАБОТКА ССЫЛОК И ВИДЕО ======
bot.on('message', async (ctx) => {
  try {
    if (ctx.message.video) {
      await ctx.reply('🎬 Видео получено!');
      return;
    }

    if (ctx.message.text && ctx.message.text.includes('http')) {
      await ctx.reply('🔗 Ссылка получена!');
      return;
    }
  } catch (e) {
    console.error('Bot error:', e);
  }
});

// ====== 🔥 ФИКС 409 CONFLICT ======
(async () => {
  try {
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    console.log('✅ Webhook cleared');
  } catch (e) {
    console.log('Webhook clear skip');
  }

  bot.launch();
})();

// ====== ЗАПУСК СЕРВЕРА ======
const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ====== ГРАЦИОЗНАЯ ОСТАНОВКА ======
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));