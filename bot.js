const { Telegraf } = require('telegraf');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const TOKEN = process.env.BOT_TOKEN;
const BASE_URL = process.env.APP_URL || 'http://localhost:3000';
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
    // двойное управление: если кто-то ставит на паузу, другой тоже
    if (data.action === 'pause') {
      io.to(data.roomId).emit('videoEvent', { action: 'pause' });
    } else if (data.action === 'play') {
      io.to(data.roomId).emit('videoEvent', { action: 'play' });
    }
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

// ===== Telegram Bot =====
bot.on('message', async (ctx) => {
  try {
    const chatId = ctx.chat.id;
    const roomId = Math.random().toString(36).substring(2, 8);

    let videoUrl = '';
    if (ctx.message.video) {
      const fileLink = await ctx.telegram.getFileLink(ctx.message.video.file_id);
      videoUrl = fileLink.href;
    }
    if (ctx.message.text && ctx.message.text.includes('youtu')) videoUrl = ctx.message.text.trim();

    if (!videoUrl) {
      await ctx.reply('❗ Please send a video or YouTube link');
      return;
    }

    const roomLink = `${BASE_URL}/?room=${roomId}&video=${encodeURIComponent(videoUrl)}`;
    await ctx.reply(`🎬 Room ready:\n${roomLink}`);
  } catch (e) {
    console.error('BOT ERROR:', e);
  }
});

bot.launch();

// ===== Start Server =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log('Server running on port', PORT));