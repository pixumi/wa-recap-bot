// Tangkap error global
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});

process.on('uncaughtException', err => {
  console.error('🔥 Uncaught Exception:', err);
});

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const appendToSheet = require('./sheets');

const RECAP_FILE = path.join(__dirname, 'recap.json');
console.log('🚀 Memulai WhatsApp bot...');

// Timeout helper
const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error("⏰ Timeout: Google Sheets tidak merespon")), ms));

// Inisialisasi client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

let lastQRGenerated = 0;

client.on('qr', async (qr) => {
  const now = Date.now();
  if (now - lastQRGenerated < 60000) {
    console.log('⏳ QR skipped: Masih dalam cooldown.');
    return;
  }

  lastQRGenerated = now;

  console.log('📲 Scan QR berikut di browser terminal:');
  try {
    const qrImageUrl = await QRCode.toDataURL(qr);
    console.log(qrImageUrl);
  } catch (err) {
    console.error('❌ Gagal generate QR:', err.message);
  }
});

client.on('ready', async () => {
  console.log('✅ WhatsApp bot siap digunakan!\n');

  const chats = await client.getChats();
  chats.forEach(chat => {
    if (chat.isGroup) {
      console.log(`🟢 Grup: ${chat.name} | ID: ${chat.id._serialized}`);
    }
  });

  console.log('\n📌 Pastikan ALLOWED_GROUP_ID sudah diatur di Railway env vars');
});

client.on('message', async msg => {
  console.log(`[INCOMING] Pesan masuk dari ${msg.from} | Body: "${msg.body}"`);

  const chat = await msg.getChat();
  if (!chat.isGroup) return;

  console.log(`[DEBUG] Grup aktif: ${chat.name} (${chat.id._serialized})`);

  const allowedGroupId = process.env.ALLOWED_GROUP_ID;
  if (chat.id._serialized !== allowedGroupId) return;

  const sender = msg.author || msg.from;
  const content = msg.body.trim();
  const timestamp = new Date(msg.timestamp * 1000);
  const formattedTime = timestamp.toISOString().replace('T', ' ').split('.')[0];

  console.log(`[${formattedTime}] ${sender}: ${content}`);

  let recapData = [];

  if (process.env.NODE_ENV !== 'production' && fs.existsSync(RECAP_FILE)) {
    recapData = JSON.parse(fs.readFileSync(RECAP_FILE));
  }

  if (content.toLowerCase() === 'done') {
    console.log(`📌 DONE detected dari: ${sender}`);

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
        console.log(`✅ Sheet updated untuk DONE dari ${sender}`);
      } catch (error) {
        console.error('❌ Error atau timeout saat appendToSheet (done):', error.message || error);
      }
    }
  } else {
    console.log(`📝 Request baru dari: ${sender}`);

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
      console.log(`✅ Sheet updated untuk REQUEST dari ${sender}`);
    } catch (error) {
      console.error('❌ Error atau timeout saat appendToSheet (request):', error.message || error);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    fs.writeFileSync(RECAP_FILE, JSON.stringify(recapData, null, 2));
  }
});

client.initialize().catch(err => {
  console.error('❌ Gagal inisialisasi client:', err);
});

// Heartbeat tiap 4 menit
setInterval(() => {
  const now = new Date().toISOString();
  console.log(`🫀 Heartbeat: Bot masih aktif @ ${now}`);
}, 4 * 60 * 1000);
