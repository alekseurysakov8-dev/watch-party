const { Telegraf } = require('telegraf');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const TOKEN = process.env.BOT_TOKEN;
const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
const PORT = process.env.PORT || 3000;

const bot = new Telegraf(TOKEN);
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const roomUsers = {}; // { roomId: [nick1, nick2] }

io.on('connection', socket => {
  console.log('User connected:', socket.id);

  socket.on('joinRoom', ({ roomId, nick }) => {
    socket.join(roomId);
    socket.nick = nick;

    if (!roomUsers[roomId]) roomUsers[roomId] = [];
    roomUsers[roomId].push(nick);

    io.to(roomId).emit('nickList', roomUsers[roomId]);
    console.log(`${nick} joined room ${roomId}`);
  });

  socket.on('videoEvent', data => {
    socket.to(data.roomId).emit('videoEvent', data);
  });

  socket.on('disconnect', () => {
    for (const roomId in roomUsers) {
      if (roomUsers[roomId]) {
        roomUsers[roomId] = roomUsers[roomId].filter(n => n !== socket.nick);
        io.to(roomId).emit('nickList', roomUsers[roomId]);
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

// ===== Telegram webhook =====
app.use(bot.webhookCallback('/bot'));

bot.start(async ctx => {
  await ctx.reply('🎬 Welcome! Send me a video or YouTube link to create a room.');
});

bot.on('video', async ctx => {
  const roomId = Math.random().toString(36).substring(2, 8);
  const file = await ctx.telegram.getFile(ctx.message.video.file_id);
  const videoUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
  const roomLink = `${BASE_URL}/?room=${roomId}&video=${encodeURIComponent(videoUrl)}`;
  await ctx.reply(`🎬 Room ready:\n${roomLink}`);
});

bot.on('text', async ctx => {
  if (ctx.message.text.includes('youtu')) {
    const roomId = Math.random().toString(36).substring(2, 8);
    const videoUrl = ctx.message.text.trim();
    const roomLink = `${BASE_URL}/?room=${roomId}&video=${encodeURIComponent(videoUrl)}`;
    await ctx.reply(`🎬 Room ready:\n${roomLink}`);
  } else {
    await ctx.reply('❗ Please send a video or YouTube link');
  }
});

bot.launch({
  webhook: {
    domain: BASE_URL,
    port: PORT
  }
});

// ===== start server =====
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server running on port', PORT);
});