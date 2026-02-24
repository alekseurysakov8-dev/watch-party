const express = require('express');
const path = require('path');
const { Telegraf } = require('telegraf');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

if (!process.env.BOT_TOKEN) throw new Error('BOT_TOKEN not set');

const PORT = process.env.PORT || 10000;
const HOST = process.env.RENDER_EXTERNAL_HOSTNAME
  ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`
  : `http://localhost:${PORT}`;

const bot = new Telegraf(process.env.BOT_TOKEN);
const app = express();
const rooms = {};

// ====== Helpers =====
function detectType(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.endsWith('.mp4')) return 'mp4';
  if (url.includes('t.me')) return 'telegram';
  return 'unknown';
}

// ====== Express =====
app.use(express.static(path.join(__dirname, 'public')));
app.get('/room/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ====== Telegram =====
bot.start((ctx) => ctx.reply('🎬 Send YouTube / MP4 / Telegram link'));

bot.on('text', async (ctx) => {
  const url = ctx.message.text.trim();
  const type = detectType(url);

  if (type === 'unknown') return ctx.reply('❌ Unsupported link');

  const roomId = uuidv4().slice(0, 8);

  rooms[roomId] = { url, type, clients: new Set() };

  const roomUrl = `${HOST}/room/${roomId}`;
  console.log('Room created:', roomUrl);

  await ctx.reply(`✅ Room created!\nType: ${type}\n👉 ${roomUrl}`);
});

// ====== WebSocket =====
const server = app.listen(PORT, () => console.log('Server running on', PORT));
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  const params = new URL(req.url, 'http://localhost').searchParams;
  const roomId = params.get('room');

  if (!rooms[roomId]) return ws.close();

  const room = rooms[roomId];
  room.clients.add(ws);

  ws.send(JSON.stringify({ type: 'init', videoUrl: room.url, videoType: room.type }));

  ws.on('message', (msg) => {
    room.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) client.send(msg.toString());
    });
  });

  ws.on('close', () => room.clients.delete(ws));
});

// ====== Launch bot =====
bot.launch();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));