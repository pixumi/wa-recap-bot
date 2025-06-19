require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const appendToSheet = require('./sheets');

const RECAP_FILE = path.join(__dirname, 'recap.json');
console.log('🚀 Memulai WhatsApp bot...');

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './.wwebjs_auth' // ✅ WAJIB: set agar path penyimpanan session bisa persistent di Fly.io
  }),
  puppeteer: {
    headless: true,
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
  console.log('✅ WhatsApp bot siap digunakan!');

  const chats = await client.getChats();
  chats.forEach(chat => {
    if (chat.isGroup) {
      console.log(`🟢 Grup: ${chat.name} | ID: ${chat.id._serialized}`);
    }
  });

  console.log('\n📌 Pastikan ALLOWED_GROUP_ID sudah diatur di environment');
});

const recapKeywords = [
  'bnt', 'bntu', 'bantu',
  'mainten', 'menten', 'maintain', 'maintanance', 'maintannace', 'maintenance', 'maiantan',
  'maintan', 'maintence', 'maintance', 'maintened', 'maintanace',
  'open', 'bin', 'update', 'realis', 'rilis', 'release', 'sto'
];
const recapRegex = new RegExp(`\\b(${recapKeywords.join('|')})\\b`, 'i');

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

  const isRecapRequest = recapRegex.test(content);
  const isDone = content.toLowerCase() === 'done';

  if (!isRecapRequest && !isDone) return;

  if (isDone) {
    const pending = recapData.find(entry => !entry.doneTime);

    if (pending) {
      pending.doneTime = formattedTime;
      pending.progressBy = sender;

      try {
        await appendToSheet([
          pending.requester,
          sender,
          pending.requestTime,
          formattedTime,
          'https://bit.ly/RESPONSE_TIME',
          pending.requestContent
        ]);
      } catch (error) {
        console.error('❌ Error saat appendToSheet (done):', error);
      }
    }
  } else {
    recapData.push({
      requester: sender,
      requestTime: formattedTime,
      requestContent: content,
      doneTime: '',
      progressBy: ''
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    fs.writeFileSync(RECAP_FILE, JSON.stringify(recapData, null, 2));
  }
});

client.initialize().catch(err => {
  console.error('❌ Gagal inisialisasi client:', err);
});
