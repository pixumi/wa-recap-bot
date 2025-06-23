require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const Redis = require('ioredis');
const { appendToSheetMulti } = require('./sheets');

// === 🔁 AUTO RESTART SETIAP 00:30 WITA (UTC+8) ===
(function scheduleRestart() {
  const now = new Date();
  const target = new Date(now);
  target.setUTCHours(16, 30, 0, 0); // 00:30 WITA
  if (now > target) target.setUTCDate(target.getUTCDate() + 1);
  const msUntilRestart = target - now;
  const jam = Math.floor(msUntilRestart / 3600000);
  const menit = Math.floor((msUntilRestart % 3600000) / 60000);
  console.log(`⏳ Bot akan auto-restart dalam ${jam} jam ${menit} menit (target: ${target.toISOString()})`);
  setTimeout(() => {
    console.log('♻️ Waktu restart harian (00:30 WITA) tercapai. Bot akan keluar...');
    process.exit(1);
  }, msUntilRestart);
})();

// === 📈 TRACKING MEMORY USAGE ===
setInterval(() => {
  const mem = process.memoryUsage();
  console.log(`📊 Memory - RSS: ${(mem.rss / 1024 / 1024).toFixed(1)} MB | Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`);
}, 5 * 60 * 1000);

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

client.on('message', async (msg) => {
  try {
    const chat = await msg.getChat();
    if (!chat.isGroup) return;

    const allowedGroupId = process.env.ALLOWED_GROUP_ID;
    if (chat.id._serialized !== allowedGroupId) return;

    const senderId = msg.author || msg.from;
    const contact = await msg.getContact();

    // 🔒 Override nama untuk user tertentu
    const senderOverrides = {
      '6285212540122@c.us': 'DHARMA',
      '6282353086174@c.us': 'DOMAS'
    };

    let senderName;
    if (senderOverrides[senderId]) {
      senderName = senderOverrides[senderId];
    } else {
      senderName = contact?.pushname?.toUpperCase() || senderId.toUpperCase();
    }

    senderName = senderName.toUpperCase();

    const content = msg.body.trim();
    const timestamp = new Date(msg.timestamp * 1000);

    // Konversi ke WITA (UTC+8)
    const witaTime = new Date(timestamp.getTime() + (8 * 60 * 60 * 1000));
    const mm = String(witaTime.getMonth() + 1).padStart(2, '0');
    const dd = String(witaTime.getDate()).padStart(2, '0');
    const yyyy = witaTime.getFullYear();
    const hh = String(witaTime.getHours()).padStart(2, '0');
    const min = String(witaTime.getMinutes()).padStart(2, '0');
    const ss = String(witaTime.getSeconds()).padStart(2, '0');
    const formattedTime = `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}`;

    console.log(`📥 Pesan dari ${senderName} di grup ${chat.name}: "${content}"`);


    const text = content.toLowerCase();
    let activity = 'LAINNYA';

    // ✅ Efisien & fleksibel: bisa mendeteksi kombinasi seperti 'maintainkan', 'rilisin', dll.
    const activityMap = [
      {
        category: 'MAINTAIN',
        keywords: ['mainten','menten','maintian','maintain','maintanance','maintannace','maintenance','maiantan','maintan','maintence','maintance','maintened','maintanace','bin','update']
      },
      {
        category: 'BLOK/OPEN BLOCK',
        keywords: ['open','block','blok','unblock']
      },
      {
        category: 'RELEASE/UNRELEASE PO',
        keywords: ['realis','rilis','release','sto']
      },
      {
        category: 'SETTING INTRANSIT PO',
        keywords: ['setting','intransit','transit','po']
      },
      {
        category: 'TRANSAKSI MIGO (GI,GR,TP & CANCELATION)',
        keywords: ['mutasi','mutasikan','tf','transfer','mutasinya','tfkan','transferkan']
      }
    ];

    for (const { category, keywords } of activityMap) {
      const pattern = new RegExp(keywords.map(k => `\\b\\w*${k}\\w*\\b`).join('|'), 'i');
      if (pattern.test(text)) {
        activity = category;
        break;
      }
    }

    // Deteksi activity..
    const allowedDoneSenders = ['6285212540122@c.us', '6282353086174@c.us'];
    const blockedRequestSenders = allowedDoneSenders; // sama aja biar rapi

    const isBlockedForRequest = blockedRequestSenders.includes(senderId);
    const isDone = allowedDoneSenders.includes(senderId) && /\bdone\b/i.test(content.toLowerCase());
    const isRecapRequest = !isBlockedForRequest && activity !== 'LAINNYA';

    // Filter pesan yang tidak termasuk recap keyword atau done
    if (!isRecapRequest && !isDone) {
      console.log('⚠️ Bukan recap keyword atau done, diabaikan.');
      return;
    }

    // Opsional: log feedback done yang valid
    if (isDone) {
      console.log(`🟢 Feedback done terdeteksi dari ${senderName}: "${content}"`);
      console.log('🔍 Mencari request belum selesai di Redis...');

      const keys = await redis.keys('recap:*');
      for (const key of keys) {
        const data = await redis.hgetall(key);
        if (!data.doneTime) {
          console.log(`✅ Menandai request "${data.requestContent}" sebagai selesai.`);

          await redis.hmset(key, {
            ...data,
            doneTime: formattedTime,
            progressBy: senderId,
            progressByName: senderName
          });

          console.log('📝 Menulis data ke Google Spreadsheet...');
          await appendToSheetMulti({
            sheet2: [
              data.activity || 'LAINNYA',
              (data.requesterName || data.requester).toUpperCase(),
              senderName,
              data.requestTime,
              formattedTime,
              'https://bit.ly/RESPONSE_TIME'
            ],
            sheet7: [
              data.activity || 'LAINNYA',
              (data.requesterName || data.requester).toUpperCase(),
              senderName,
              data.requestTime,
              formattedTime,
              'https://bit.ly/RESPONSE_TIME',
              data.requestContent
            ]
          });

          console.log('✅ Berhasil tulis ke spreadsheet!');
          break;
        }
      }
    } else {
      const key = `recap:${Date.now()}`;
      console.log(`📌 Menyimpan request baru ke Redis: ${content}`);
      await redis.hmset(key, {
        activity,
        requester: senderId,
        requesterName: senderName,
        requestTime: formattedTime,
        requestContent: content,
        doneTime: '',
        progressBy: '',
        progressByName: ''
      });
      await redis.expire(key, 172800);
      console.log('🧠 Request berhasil disimpan sementara.');
    }
  } catch (err) {
    console.error('❌ Handler error:', err.message);
  }
});

client.initialize().catch(err => {
  console.error('❌ Gagal inisialisasi client:', err);
});
