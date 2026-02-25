const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const TOKEN = process.env.BOT_TOKEN;
const BASE_URL = process.env.APP_URL || 'http://localhost:3000';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const bot = new TelegramBot(TOKEN);

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

const roomUsers = {}; // { roomId: [nick1, nick2] }

// ===== SOCKET.IO =====
io.on('connection', socket => {
  console.log('🔌 User connected:', socket.id);

  socket.on('joinRoom', ({ roomId, nick }) => {
    socket.join(roomId);
    socket.nick = nick;

    if (!roomUsers[roomId]) roomUsers[roomId] = [];
    roomUsers[roomId].push(nick);

    io.to(roomId).emit('nickList', roomUsers[roomId]);
    console.log(`👥 ${nick} joined room ${roomId}`);
  });

  socket.on('videoEvent', data => {
    // double control: emit to all, including sender
    io.to(data.roomId).emit('videoEvent', data);
  });

  socket.on('disconnect', () => {
    for (const roomId in roomUsers) {
      if (roomUsers[roomId]) {
        roomUsers[roomId] = roomUsers[roomId].filter(n => n !== socket.nick);
        io.to(roomId).emit('nickList', roomUsers[roomId]);
      }
    }
    console.log('❌ User disconnected:', socket.id);
  });
});

// ===== TELEGRAM =====
bot.on('message', async msg => {
  try {
    const chatId = msg.chat.id;
    const roomId = Math.random().toString(36).substring(2, 8);

    let videoUrl = '';
    if (msg.video) {
      const file = await bot.getFile(msg.video.file_id);
      videoUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
    }
    if (msg.text && msg.text.includes('youtu')) videoUrl = msg.text.trim();

    if (!videoUrl) {
      await bot.sendMessage(chatId, '❗ Please send a video or YouTube link');
      return;
    }

    const roomLink = `${BASE_URL}/?room=${roomId}&video=${encodeURIComponent(videoUrl)}`;
    await bot.sendMessage(chatId, `🎬 Room ready:\n${roomLink}`);
  } catch (e) {
    console.error('BOT ERROR:', e);
  }
});

// ===== WEBHOOK + SERVER =====
const PORT = process.env.PORT; // Render сам задаёт порт

bot.launch({
  webhook: {
    domain: BASE_URL,
    port: PORT,
    hookPath: '/bot'
  }
});

app.use(bot.webhookCallback('/bot'));

server.listen(PORT, '0.0.0.0', () => console.log('🚀 Server running on port', PORT));