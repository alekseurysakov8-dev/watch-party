const { Telegraf } = require('telegraf');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

// =====================
// Конфигурация
// =====================
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("Error: BOT_TOKEN not found in Environment Variables");
  process.exit(1);
}

const SERVER_URL = process.env.SERVER_URL || 'https://watch-party-9ufo.onrender.com';
const PORT = process.env.PORT || 3000;

// =====================
// Telegram Bot
// =====================
const bot = new Telegraf(BOT_TOKEN);

bot.start((ctx) => {
  ctx.reply(
    `Hello! 👋 Send me a video from a Telegram channel, and I will create a synced Watch Party for you!\n\n` +
    `Example: forward a video or send a video link.`
  );
});

bot.on(['video', 'document', 'animation'], async (ctx) => {
  try {
    let fileId;
    if (ctx.message.video) fileId = ctx.message.video.file_id;
    else if (ctx.message.document) fileId = ctx.message.document.file_id;
    else if (ctx.message.animation) fileId = ctx.message.animation.file_id;

    if (!fileId) return ctx.reply("Sorry, I could not detect the video.");

    const file = await ctx.telegram.getFile(fileId);
    const videoUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    // Генерируем уникальную комнату
    const roomId = Math.random().toString(36).substring(2, 8);
    const watchUrl = `${SERVER_URL}/?room=${roomId}&video=${encodeURIComponent(videoUrl)}`;

    ctx.reply(`Your Watch Party is ready! 🎬\nClick here to watch: ${watchUrl}`);
  } catch (err) {
    console.error(err);
    ctx.reply("Something went wrong while processing the video.");
  }
});

bot.launch();
console.log("Telegram Bot launched");

// =====================
// Express + Socket.io сервер
// =====================
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

io.on('connection', (socket) => {
  const room = socket.handshake.query.room;
  if (room) socket.join(room);

  socket.on('video-action', (data) => {
    socket.to(room).emit('video-action', data);
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));