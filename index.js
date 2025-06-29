require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const Redis = require('ioredis');
const { appendToSheetMulti } = require('./sheets');

// === 🔁 AUTO RESTART JAM 05:30 & 21:00 WITA (UTC+8) ===
(function scheduleRestart() {
  const now = new Date();

  // Daftar target waktu restart dalam UTC [ [hour, minute], ... ]
  const targetsUTC = [
    [22, 30], // 05:30 WITA
    [13, 0],  // 21:00 WITA
  ];

  // Cari waktu target terdekat
  let nextRestart = null;
  for (const [h, m] of targetsUTC) {
    const t = new Date(now);
    t.setUTCHours(h, m, 0, 0);
    if (t > now) {
      nextRestart = t;
      break;
    }
  }

  // Kalau semua waktu hari ini sudah lewat, ambil jadwal besok
  if (!nextRestart) {
    const [h, m] = targetsUTC[0];
    nextRestart = new Date(now);
    nextRestart.setUTCDate(now.getUTCDate() + 1);
    nextRestart.setUTCHours(h, m, 0, 0);
  }

  const msUntilRestart = nextRestart - now;
  const jam = Math.floor(msUntilRestart / 3600000);
  const menit = Math.floor((msUntilRestart % 3600000) / 60000);
  console.log(`⏳ Bot akan auto-restart dalam ${jam} jam ${menit} menit (target: ${nextRestart.toISOString()})`);

  setTimeout(() => {
    console.log('♻️ Waktu restart tercapai. Bot akan keluar...');
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
      '--disable-breakpad',
      '--disable-background-timer-throttling',
      '--no-default-browser-check',
      '--metrics-recording-only',
      '--mute-audio',
      '--disable-component-update',
      '--disable-domain-reliability',
      '--disable-client-side-phising-detection',
      '--disable-renderer-backgrounding',
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

// === OPTIMIZED MESSAGE HANDLING ===
const messageQueue = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing || messageQueue.length === 0) return;
  
  isProcessing = true;
  const { msg, resolve } = messageQueue.shift();
  
  try {
    await handleMessage(msg);
    resolve();
  } catch (err) {
    console.error('❌ Queue processing error:', err);
    resolve(err);
  } finally {
    isProcessing = false;
    processQueue();
  }
}

async function handleMessage(msg) {
  try {
    const chat = await msg.getChat();
    if (!chat.isGroup) return;

    const allowedGroupId = process.env.ALLOWED_GROUP_ID;
    if (chat.id._serialized !== allowedGroupId) return;

    const senderId = msg.author || msg.from;
    const contact = await msg.getContact();

    // 🔒 Override nama untuk user tertentu (FIXED CASE CONSISTENCY)
    const senderOverrides = {
      '6285212540122@c.us': 'DHARMA',
      '6282353086174@c.us': 'DOMAS',
      '6287839258122@c.us': 'ARIF IRVANSYAH',
      '6281288079200@c.us': 'HERMAWAN',
      '6282298361954@c.us': 'DEDI HANDOYO',
      '6285348761223@c.us': 'DZUAL',
      '6282255025432@c.us': 'ECHO NUGRAHA',
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
      '6281939614245@c.us': 'JIMMY',
      '6281549387469@c.us': 'JEPRI JULIANSYAH',
      '6287814722805@c.us': 'RUSYDI',
      '6282259578239@c.us': 'PERNANDA',
      '6282131982720@c.us': 'RIYAN',
      '6281321200906@c.us': 'FADLURRAHMAN',
      '6283178537395@c.us': 'VIONA AGUSTIN',
      '6282334623744@c.us': 'ADI KRIS',
      '6282298392742@c.us': 'BARRON',
      '6285755074240@c.us': 'DONI',
      '6281346290596@c.us': 'AMRIL',
      '6285249564964@c.us': 'BUDI',
      '6282250265734@c.us': 'FLORENSIUS SUBANDI',
      '6281340459271@c.us': 'ANTY',
      '6282251503210@c.us': 'BIBIT SATRIONO',
      '6282254168885@c.us': 'HENDRA',
      '6288268345410@c.us': 'TITO',
      '6285247113641@c.us': 'MOKO',
      '6281267133663@c.us': 'AHMAD AZIS',
      '6285822030750@c.us': 'SINANTO',
      '6285346179404@c.us': 'DEBYANTORO',
      '6281223121550@c.us': 'DINA',
      '6285246669961@c.us': 'ARI FAUNDA',
      '6285345612333@c.us': 'FAHMI',
      '6285397065282@c.us': 'RENTHA PALAMPA',
      '628115530970@c.us': 'DIMAS',
      '628115576915@c.us': 'ANTON SARDONO',
      '6285754006319@c.us': 'BENY ATTA',
      '6282293075684@c.us': 'FARIKH',
      '6282371476064@c.us': 'FAISAL',
      '6285267153227@c.us': 'FANHAR',
      '6285849174071@c.us': 'HARIADI',
      '6282164883434@c.us': 'GUIL TARIGAN',
      '6285159814122@c.us': 'YOGA PUTRA',
      '6282159280132@c.us': 'AULIA',
      '6282184307675@c.us': 'YUNUS',
      '6285602363506@c.us': 'HUSNI',
      '6281333929644@c.us': 'TARBONI',
      '6285348476393@c.us': 'OBERT',
      '6281354832816@c.us': 'ANDI YUSUF'

    };

    let senderName = senderOverrides[senderId] 
      || contact?.pushname?.toUpperCase() 
      || senderId.toUpperCase();

    console.log(`👤 Sender: ${senderName} (${senderId})`);

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

    // ✅ FIXED CASE-INSENSITIVE KEYWORD DETECTION
    const activityMap = [
      { 
        category: 'MAINTAIN', 
        keywords: ['pl04','found','sloc','storage location','mainte','maintaince','maibnten','mantain','mentenance','maintenenkn','mentenace','maintennace','maintece','mainten','menten','maintian','maintain','maintanance','maintannace','maintenance','maiantan','maintan','maintence','maintance','maintened','maintanace','maitnenacne','maintenacne','bin','update'] 
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

    // Enhanced case-insensitive matching with word boundaries
    const normalizedText = text.replace(/\s+/g, ' ');  // Normalize spaces
    for (const { category, keywords } of activityMap) {
      const found = keywords.some(k => {
        const pattern = new RegExp(`\\b${k}\\b`, 'i');  // Case-insensitive word boundary
        return pattern.test(normalizedText);
      });
      
      if (found) {
        activity = category;
        break;
      }
    }

    // Log activity detection for debugging
    if (activity !== 'LAINNYA') {
      console.log(`🔍 Aktivitas terdeteksi: ${activity}`);
    }

    // Deteksi activity
    const allowedDoneSenders = ['6285212540122@c.us', '6282353086174@c.us'];
    const isDone = allowedDoneSenders.includes(senderId) && /\bdone\b/i.test(text);
    const isRecapRequest = activity !== 'LAINNYA' && !allowedDoneSenders.includes(senderId);

    // 🔍 Proses done
    if (isDone) {
      console.log(`🟢 Feedback done terdeteksi dari ${senderName}: "${content}"`);
      console.log('🔍 Mencari request belum selesai di Redis...');

      const keys = await redis.keys('recap:*');
      // Prioritize oldest unfinished request
      const sortedKeys = keys.sort((a, b) => parseInt(a.split(':')[1]) - parseInt(b.split(':')[1]));

      for (const key of sortedKeys) {
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
      return;
    }

    // 🔍 Proses request biasa
    if (isRecapRequest) {
      const key = `recap:${Date.now()}`;
      console.log(`📌 Menyimpan request ${activity} dari ${senderName} ke Redis`);
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
    } else {
      console.log('⚠️ Bukan recap keyword atau done, diabaikan.');
    }

  } catch (err) {
    console.error('❌ Handler error:', err.message);
  }
}

// Queue-based message processing
client.on('message', async (msg) => {
  return new Promise((resolve) => {
    messageQueue.push({ msg, resolve });
    processQueue();
  });
});

client.initialize().catch(err => {
  console.error('❌ Gagal inisialisasi client:', err);
});