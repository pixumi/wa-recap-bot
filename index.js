require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const Redis = require('ioredis');
const appendToSheet = require('./sheets');

const redis = new Redis(process.env.REDIS_URL);
console.log('🚀 Memulai WhatsApp bot...');

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './.wwebjs_auth' // ✅ WAJIB: set agar path penyimpanan session bisa persistent di Fly.io
  }),
  puppeteer: {
    headless: true,
      args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage' // ✅ Tambahan ini mencegah crash di environment terbatas seperti Fly.io
    ]
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

  const isRecapRequest = recapRegex.test(content);
  const isDone = content.toLowerCase() === 'done';
  if (!isRecapRequest && !isDone) return;

  if (isDone) {
    const keys = await redis.keys('recap:*');
    for (const key of keys) {
      const data = await redis.hgetall(key);
      if (!data.doneTime) {
        await redis.hmset(key, {
          ...data,
          doneTime: formattedTime,
          progressBy: sender
        });
        await appendToSheet([
          data.requester,
          sender,
          data.requestTime,
          formattedTime,
          'https://bit.ly/RESPONSE_TIME',
          data.requestContent
        ]);
        break;
      }
    }
  } else {
    const key = `recap:${Date.now()}`;
    await redis.hmset(key, {
      requester: sender,
      requestTime: formattedTime,
      requestContent: content,
      doneTime: '',
      progressBy: ''
    });
    await redis.expire(key, 172800); // TTL 2 hari
  }
});

client.initialize().catch(err => {
  console.error('❌ Gagal inisialisasi client:', err);
});
