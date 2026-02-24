// bot.js — объединяет сервер и Telegram бота
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const TelegramBot = require("node-telegram-bot-api");

// Берём токен из Environment Variables Render
const TOKEN = process.env.TOKEN;
if (!TOKEN) {
  console.error("ERROR: Telegram Bot Token not found in Environment Variables!");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- SERVER / WATCH PARTY SETUP ---

// Статика для плеера
app.use(express.static(path.join(__dirname, "public")));

// Маршрут для комнаты
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// Socket.io — синхронизация play/pause
io.on("connection", (socket) => {
  const room = socket.handshake.query.room;
  if (room) socket.join(room);

  socket.on("video-action", (data) => {
    socket.to(room).emit("video-action", data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// --- TELEGRAM BOT HANDLERS ---

// /start команда
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Hello! 👋 Send me a video or a link from a Telegram channel to start a Watch Party."
  );
});

// Обработка пересланных видео или ссылок
bot.on("message", async (msg) => {
  try {
    const chatId = msg.chat.id;

    // Если это ссылка на канал или видео
    if (msg.text && msg.text.startsWith("https://t.me/")) {
      const room = Math.random().toString(36).substring(2, 8);
      const url = `${process.env.SERVER_URL || "https://watch-party-9ufo.onrender.com"}/?room=${room}&file=${encodeURIComponent(msg.text)}`;
      bot.sendMessage(chatId, `Watch Party created! 🎬\nOpen this link in Telegram Web View:\n${url}`);
      return;
    }

    // Если это пересланное видео
    if (msg.video) {
      const fileId = msg.video.file_id;
      const room = Math.random().toString(36).substring(2, 8);
      const url = `${process.env.SERVER_URL || "https://watch-party-9ufo.onrender.com"}/?room=${room}&file=${fileId}`;
      bot.sendMessage(chatId, `Watch Party created! 🎬\nOpen this link in Telegram Web View:\n${url}`);
      return;
    }
  } catch (e) {
    console.error("Bot message handler error:", e);
  }
});