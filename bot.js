const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const TOKEN = process.env.BOT_TOKEN || 'PASTE_YOUR_TOKEN_HERE';
const BASE_URL = process.env.APP_URL || 'http://localhost:3000';

const bot = new TelegramBot(TOKEN, { polling: true });

// ===== EXPRESS =====
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// ===== SOCKET.IO =====
io.on('connection', socket => {
  console.log('🔌 User connected:', socket.id);

  socket.on('joinRoom', roomId => {
    socket.join(roomId);
    console.log(`👥 ${socket.id} joined room ${roomId}`);
  });

  socket.on('videoEvent', data => {
    socket.to(data.roomId).emit('videoEvent', data);
  });

  socket.on('disconnect', () => {
    console.log('❌ User disconnected:', socket.id);
  });
});

// ===== TELEGRAM =====
bot.on('message', async msg => {
  try {
    const chatId = msg.chat.id;

    // создаём комнату
    const roomId = Math.random().toString(36).substring(2, 8);

    let videoUrl = '';

    // 📹 Telegram видео
    if (msg.video) {
      const file = await bot.getFile(msg.video.file_id);
      videoUrl = `https://api.telegram.org/file/bot${TOKEN}/${file.file_path}`;
    }

    // 🔗 YouTube ссылка
    if (msg.text && msg.text.includes('youtu')) {
      videoUrl = msg.text.trim();
    }

    if (!videoUrl) {
      await bot.sendMessage(chatId, '❗ Пришли видео или YouTube ссылку');
      return;
    }

    const roomLink = `${BASE_URL}/?room=${roomId}&video=${encodeURIComponent(videoUrl)}`;

    await bot.sendMessage(chatId, `🎬 Комната готова:\n${roomLink}`);
  } catch (e) {
    console.error('BOT ERROR:', e);
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server running on port', PORT);
});