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
      '6282353086174@c.us': 'DOMAS',
      '6287839258122@c.us': 'ARIF IRVANSYAH',
      '6281288079200@c.us': 'HERMAWAN',
      '6282298361954@c.us': 'DEDI HANDOYO',
      '6285348761223@C.US': 'DZUAL',
      '6282255025432@C.US': 'ECHO NUGRAHA',
      '6281278861552@c.us': 'ERNA WATI',
      '6282195204255@c.us': 'ABDUL RAHIM',
      '6282285487744@c.us': 'JUHANDA',
      '6282218595016@c.us': 'OCHA ALIENA',
      '6282259255551@c.us': 'MAMAN',
      '6285752196213@c.us': 'MEY',
      '628115525414@c.us': 'YAYAN',
      '6285155222109@c.us': 'AFRIDA',
      '6285727812635@c.us': 'ATHA',
      '628974441966@c.us': 'ANCA',
      '6285228782260@c.us': 'RANNI',
      '6281273878321@c.us': 'MEIDIAN',
      '6281257160490@c.us': 'DASANA',
      '6282260234011@c.us': 'RIDWAN',
      '6281254005440@c.us': 'RONY',
      '6281375281051@c.us': 'RAY',
      '6281354839288@c.us': 'DEWI',
      '6285893084048@c.us': 'RIYADI',
      '6285751867540@c.us': 'SUTRISNO',
      '6281345390650@c.us': 'ASMAN',
      '6287819624638@c.us': 'ABU NIZAM',
      '6282176086738@c.us': 'REZA WARDANA',
      '6281266423834@c.us': 'HERU KURNIAWAN',
      '6281345567102@c.us': 'DEWI',
      '6281258756870@c.us': 'LATIF',
      '6281214370316@c.us': 'MEYKI SANDRA',
      '6281278659650@c.us': 'YADI',
      '6285267667919@c.us': 'RENDI PUTRA',
      '6281348498598@c.us': 'ICA',
      '6281260070007@c.us': 'HAGA BANGUN',
      '6281248305432@c.us': 'ROY TONA',
      '6285277909966@c.us': 'RADA ALBARRA',
      '628115576914@c.us': 'ANDHIKA',
      '6281339779828@c.us': 'DIMAS DWI',
      '6282157264121@c.us': 'BUDI SETYO',
      '6283800792218@c.us': 'WILDAN FIRDAUS',
      '6282152443014@c.us': 'ABDUL AZIS',
      '62895702569361@c.us': 'REZA FAIZADIN',
      '628115522724@c.us': 'ROBERT YOSUA SARAGIH',
      '6282138094042@c.us': 'RIZALDI',
      '6281299061460@c.us': 'MIRZA',
      '6281346813157@c.us': 'MUHAMMAD EKO',
      '6281939614245@c-us': 'JIMMY',
      '6281549387469@c.us': 'JEPRI JULIANSYAH',
      '6287814722805@c.us': 'RUSYDI',
      '6282259578239@c.us': 'PERNANDA'
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
        keywords: ['sloc','storage location','maibnten','maintece','mainten','menten','maintian','maintain','maintanance','maintannace','maintenance','maiantan','maintan','maintence','maintance','maintened','maintanace','bin','update']
      },
      {
        category: 'BLOK/OPEN BLOCK',
        keywords: ['open','block','blok','unblock']
      },
      {
        category: 'RELEASE/UNRELEASE PO',
        keywords: ['realis','rilis','release']
      },
      {
        category: 'SETTING INTRANSIT PO',
        keywords: ['setting','intransit','transit','po','intransil']
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
          console.log(`✅ Menandai request "${data.activity}" dari "${data.requesterName}" sebagai selesai.`);

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
      console.log(`📌 Menyimpan request ${ activity} dari ${requesterName} ke Redis`);
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
