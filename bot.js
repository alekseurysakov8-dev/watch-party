const TelegramBot = require("node-telegram-bot-api");

const TOKEN = "8753858538:AAEttD4K2O9iZ28m7XBaISGoUV2Q8oMJX58"; // сюда новый токен

const bot = new TelegramBot(TOKEN, { polling: true });

bot.onText(/\/watch/, (msg) => {
  const room = Math.random().toString(36).substring(2, 8);
  const url = `http://localhost:3000/?room=${room}`;

  bot.sendMessage(msg.chat.id, `Смотри вместе:\n${url}`);
});