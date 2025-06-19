process.on('unhandledRejection', () => {});
process.on('uncaughtException', () => {});

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const appendToSheet = require('./sheets');

const RECAP_FILE = path.join(__dirname, 'recap.json');

// Timeout helper
const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));

// Init client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

let lastQRGenerated = 0;

client.on('qr', async (qr) => {
  const now = Date.now();
  if (now - lastQRGenerated < 60000) return;
  lastQRGenerated = now;

  console.log('📲 Scan QR berikut di browser terminal:');
  try {
    const qrImageUrl = await QRCode.toDataURL(qr);
    console.log(qrImageUrl);
  } catch (err) {
    console.log('❌ Gagal generate QR:', err.message);
  }
});

client.on('ready', async () => {
  const chats = await client.getChats();
  chats.forEach(chat => {
    if (chat.isGroup) {
      // QR login success, no log needed beyond this
    }
  });
});

client.on('message', async msg => {
  const chat = await msg.getChat();
  if (!chat.isGroup) return;

  const allowedGroupId = process.env.ALLOWED_GROUP_ID;
  if (chat.id._serialized !== allowedGroupId) return;

  const sender = msg.author || msg.from;
  const content = msg.body.trim();
  const timestamp = new Date(msg.timestamp * 1000);
  const formattedTime = timestamp.toISOString().replace('T', ' ').split('.')[0];

  let recapData = [];

  if (process.env.NODE_ENV !== 'production' && fs.existsSync(RECAP_FILE)) {
    recapData = JSON.parse(fs.readFileSync(RECAP_FILE));
  }

  if (content.toLowerCase() === 'done') {
    const pending = recapData.reverse().find(entry =>
      entry.requester === sender && !entry.doneTime
    );
    recapData.reverse();

    if (pending) {
      pending.doneTime = formattedTime;
      pending.progressBy = sender;

      try {
        await Promise.race([
          appendToSheet([
            pending.requester,
            sender,
            pending.requestTime,
            formattedTime,
            'https://bit.ly/RESPONSE_TIME',
            pending.requestContent
          ]),
          timeout(7000)
        ]);
      } catch (_) {}
    }
  } else {
    recapData.push({
      requester: sender,
      requestTime: formattedTime,
      requestContent: content,
      doneTime: '',
      progressBy: ''
    });

    try {
      await Promise.race([
        appendToSheet([
          sender,
          '',
          formattedTime,
          '',
          'https://bit.ly/RESPONSE_TIME',
          content
        ]),
        timeout(7000)
      ]);
    } catch (_) {}
  }

  if (process.env.NODE_ENV !== 'production') {
    fs.writeFileSync(RECAP_FILE, JSON.stringify(recapData, null, 2));
  }
});

client.initialize();

// Optional heartbeat dihapus agar benar-benar silent