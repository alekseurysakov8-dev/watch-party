// bot.js — бот + сервер + Socket.io

const TelegramBot = require("node-telegram-bot-api");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

// ====== TELEGRAM BOT ======
const TOKEN = process.env.TOKEN; // токен берём из Environment Variables
if (!TOKEN) {
  console.error("EFATAL: Telegram Bot Token not provided!");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

// ====== EXPRESS + SOCKET.IO ======
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// отдаём статические файлы из public
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public/index.html"));
});

// синхронизация видео через Socket.io
io.on("connection", (socket) => {
  const room = socket.handshake.query.room;
  if (room) socket.join(room);

  socket.on("video-action", (data) => {
    socket.to(room).emit("video-action", data);
  });
});

// ====== TELEGRAM BOT ЛОГИКА ======

// /start — приветствие
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    "Hello! Send me a video or a Telegram channel link, and I'll create a Watch Party for you."
  );
});

// ловим пересланные видео
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  // если прислали видео
  if (msg.video) {
    const fileId = msg.video.file_id;
    const room = Math.random().toString(36).substring(2, 8);
    const videoUrl = `https://api.telegram.org/file/bot${TOKEN}/${(await bot.getFile(fileId)).file_path}`;

    // формируем ссылку на комнату с room и file_id
    const link = `${process.env.SERVER_URL || "https://watch-party-9ufo.onrender.com"}/?room=${room}&file_id=${fileId}`;
    bot.sendMessage(chatId, `Your Watch Party is ready: ${link}`);
  }

  // если прислали ссылку на канал
  if (msg.text && msg.text.includes("https://t.me/")) {
    const room = Math.random().toString(36).substring(2, 8);
    const link = `${process.env.SERVER_URL || "https://watch-party-9ufo.onrender.com"}/?room=${room}&url=${encodeURIComponent(msg.text)}`;
    bot.sendMessage(chatId, `Your Watch Party is ready: ${link}`);
  }
});

// ====== СЕРВЕР ======
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));