require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const Redis = require('ioredis');
const appendToSheet = require('./sheets');

// === 🔁 AUTO RESTART TIAP 6 JAM ===
setTimeout(() => {
  console.log('♻️ Auto-restart triggered after 6 hours');
  process.exit(1);
}, 6 * 60 * 60 * 1000); // 6 jam

// === 📈 TRACKING MEMORY USAGE ===
setInterval(() => {
  const mem = process.memoryUsage();
  console.log(`📊 Memory - RSS: ${(mem.rss / 1024 / 1024).toFixed(1)} MB | Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`);
}, 5 * 60 * 1000); // Tiap 5 menit

// === 🔌 Redis Init ===
console.log('🔌 Connecting to Redis:', process.env.REDIS_URL);
const redis = new Redis(process.env.REDIS_URL);

// === Auth Path ===
const dataPath = process.env.NODE_ENV === 'production'
  ? '/app/.wwebjs_auth'
  : './.wwebjs_auth';

console.log('🚀 Memulai WhatsApp bot...');

// === Puppeteer Optimization ===
const client = new Client({
  authStrategy: new LocalAuth({ dataPath }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--no-zygote',
      '--single-process',
      '--disable-extensions',
      '--disable-infobars',
      '--js-flags=--max-old-space-size=256'
    ],
    // Optional tweak
    executablePath: process.env.CHROME_BIN || undefined
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

client.on('message', async (msg) => {
  try {
    const chat = await msg.getChat();
    if (!chat.isGroup) return;

    const allowedGroupId = process.env.ALLOWED_GROUP_ID;
    if (chat.id._serialized !== allowedGroupId) return;

    const sender = msg.author || msg.from;
    const content = msg.body.trim();
    const timestamp = new Date(msg.timestamp * 1000);
    const formattedTime = timestamp.toISOString().replace('T', ' ').split('.')[0];

    console.log(`📥 Pesan dari ${sender} di grup ${chat.name}: "${content}"`);

    const isRecapRequest = recapRegex.test(content);
    const isDone = content.toLowerCase() === 'done';
    if (!isRecapRequest && !isDone) {
      console.log('⚠️ Bukan recap keyword atau done, diabaikan.');
      return;
    }

    if (isDone) {
      console.log('🔍 Mencari request belum selesai di Redis...');
      const keys = await redis.keys('recap:*');
      for (const key of keys) {
        const data = await redis.hgetall(key);
        if (!data.doneTime) {
          console.log(`✅ Menandai request "${data.requestContent}" sebagai selesai.`);

          await redis.hmset(key, {
            ...data,
            doneTime: formattedTime,
            progressBy: sender
          });

          console.log('📝 Menulis data ke Google Spreadsheet...');
          await appendToSheet([
            data.requester,
            sender,
            data.requestTime,
            formattedTime,
            'https://bit.ly/RESPONSE_TIME',
            data.requestContent
          ]);

          console.log('✅ Berhasil tulis ke spreadsheet!');
          break;
        }
      }
    } else {
      const key = `recap:${Date.now()}`;
      console.log(`📌 Menyimpan request baru ke Redis: ${content}`);
      await redis.hmset(key, {
        requester: sender,
        requestTime: formattedTime,
        requestContent: content,
        doneTime: '',
        progressBy: ''
      });
      await redis.expire(key, 172800); // TTL 2 hari
      console.log('🧠 Request berhasil disimpan sementara.');
    }
  } catch (err) {
    console.error('❌ Handler error:', err.message);
  }
});

client.initialize().catch(err => {
  console.error('❌ Gagal inisialisasi client:', err);
});
