// =================================================================
// ============== 🇮🇩 WHATSAPP BOT RECAP - MAIN SCRIPT 🇮🇩 ==============
// =================================================================
// 👨‍💻 Author: Dharma
// 🤖 Assistance: Kano
// 📅 Version: 2.1 (Highly Responsive Edition)
// =================================================================

require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const Redis = require('ioredis');
const { appendToSheetMulti } = require('./sheets'); // Pastikan file ini ada dan berfungsi
const { senderOverrides, activityRegexMap, allowedDoneSenders } = require('./config'); // ✨ Memuat konfigurasi dari file terpisah

// === ⚙️ KONSTANTA & KONFIGURASI APLIKASI ===
const RESTART_SCHEDULES_UTC = [ { hour: 22, minute: 30 }, { hour: 13, minute: 0 } ]; // 05:30 & 21:00 WITA (UTC+8)
const MEMORY_TRACK_INTERVAL_MS = 5 * 60 * 1000; // 5 menit
const QR_COOLDOWN_MS = 60 * 1000; // 1 menit
const REDIS_KEY_PREFIX = 'recap:';
const REDIS_KEY_EXPIRY_SECONDS = 172800; // 48 jam

// === 🔁 FUNGSI AUTO RESTART ===
(function scheduleRestart() {
    const now = new Date();
    let nextRestart = null;

    for (const schedule of RESTART_SCHEDULES_UTC) {
        const t = new Date(now);
        t.setUTCHours(schedule.hour, schedule.minute, 0, 0);
        if (t > now) {
            nextRestart = t;
            break;
        }
    }

    if (!nextRestart) {
        const [firstSchedule] = RESTART_SCHEDULES_UTC;
        nextRestart = new Date(now);
        nextRestart.setUTCDate(now.getUTCDate() + 1);
        nextRestart.setUTCHours(firstSchedule.hour, firstSchedule.minute, 0, 0);
    }

    const msUntilRestart = nextRestart - now;
    const hours = Math.floor(msUntilRestart / 3600000);
    const minutes = Math.floor((msUntilRestart % 3600000) / 60000);
    console.log(`⏳ Bot akan auto-restart dalam ${hours} jam ${minutes} menit (target: ${nextRestart.toISOString()})`);

    setTimeout(() => {
        console.log('♻️ Waktu restart tercapai. Bot akan keluar untuk di-restart oleh process manager (e.g., PM2, Heroku)...');
        process.exit(1);
    }, msUntilRestart);
})();

// === 📈 FUNGSI TRACKING MEMORY USAGE ===
setInterval(() => {
    const mem = process.memoryUsage();
    console.log(`📊 Memory - RSS: ${(mem.rss / 1024 / 1024).toFixed(1)} MB | Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`);
}, MEMORY_TRACK_INTERVAL_MS);

// === 🔌 INISIALISASI KONEKSI REDIS ===
// ✨ REVISI: Menambahkan opsi koneksi TLS secara otomatis untuk URL `rediss://`
const redisUrl = process.env.REDIS_URL;
const redisOptions = redisUrl && redisUrl.startsWith('rediss://') ? { tls: {} } : {};
const redis = new Redis(redisUrl, redisOptions);
console.log('🔌 Menghubungkan ke Redis server...');
redis.on('error', (err) => console.error('❌ Redis Connection Error:', err));
redis.on('connect', () => console.log('✅ Berhasil terhubung ke Redis.'));

// === 📁 PENENTUAN PATH AUTENTIKASI ===
const dataPath = process.env.NODE_ENV === 'production' ? '/app/.wwebjs_auth' : './.wwebjs_auth';
console.log(`🔐 Menggunakan path data auth di: ${dataPath}`);

console.log('🚀 Memulai inisialisasi WhatsApp bot...');

// === 🤖 KONFIGURASI WHATSAPP CLIENT (PUPPETEER) ===
const client = new Client({
    authStrategy: new LocalAuth({ dataPath }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
            '--disable-gpu', '--disable-software-rasterizer', '--no-zygote',
            '--single-process', '--disable-extensions', '--disable-infobars',
            '--disable-breakpad', '--disable-background-timer-throttling',
            '--no-default-browser-check', '--metrics-recording-only', '--mute-audio',
            '--disable-component-update', '--disable-domain-reliability',
            '--disable-client-side-phising-detection', '--disable-renderer-backgrounding',
            '--js-flags=--max-old-space-size=256'
        ],
        executablePath: process.env.CHROME_BIN || undefined
    }
});

// === 📲 EVENT HANDLER: QR CODE GENERATOR ===
let lastQRGenerated = 0;
client.on('qr', async (qr) => {
    const now = Date.now();
    if (now - lastQRGenerated < QR_COOLDOWN_MS) {
        console.log('⏳ QR skipped: Masih dalam cooldown untuk mencegah spam.');
        return;
    }
    lastQRGenerated = now;
    console.log('📲 Scan QR Code berikut di terminal atau buka Data URL di browser:');
    try {
        const qrImageUrl = await QRCode.toDataURL(qr);
        console.log(qrImageUrl);
        QRCode.toString(qr, { type: 'terminal' }, (err, url) => {
            if (err) throw err;
            console.log(url);
        });
    } catch (err) {
        console.error('❌ Gagal generate QR:', err.message);
    }
});

// === ✅ EVENT HANDLER: CLIENT READY ===
client.on('ready', async () => {
    console.log('✅ WhatsApp bot siap digunakan!');
    try {
        const chats = await client.getChats();
        console.log('👥 Daftar Grup yang terdeteksi:');
        chats.forEach(chat => {
            if (chat.isGroup) {
                console.log(`   - Grup: ${chat.name} | ID: ${chat.id._serialized}`);
            }
        });
        console.log(`\n📌 Pastikan ALLOWED_GROUP_ID di .env sudah diatur ke salah satu ID di atas.`);
    } catch(err) {
        console.error('❌ Gagal mengambil daftar chat:', err);
    }
});

// === 📦 ANTRIAN PEMROSESAN PESAN (MESSAGE QUEUE) ===
const messageQueue = [];
let isProcessing = false;

async function processQueue() {
    if (isProcessing || messageQueue.length === 0) return;
    
    isProcessing = true;
    const { msg, resolve } = messageQueue.shift();
    
    try {
        await messageHandler(msg);
    } catch (err) {
        console.error('❌ Error saat memproses pesan dari queue:', err);
    } finally {
        isProcessing = false;
        resolve();
        process.nextTick(processQueue);
    }
}

client.on('message', (msg) => { // Dibuat non-async karena promise di-handle di dalam
    return new Promise((resolve) => {
        messageQueue.push({ msg, resolve });
        processQueue();
    });
});

// === 🧠 HANDLER UTAMA (MESSAGE DISPATCHER) ===
async function messageHandler(msg) {
    try {
        const chat = await msg.getChat();
        const allowedGroupId = process.env.ALLOWED_GROUP_ID;

        if (!chat.isGroup || !allowedGroupId || chat.id._serialized !== allowedGroupId) {
            return;
        }

        const senderId = msg.author || msg.from;
        const contact = await msg.getContact();
        const text = msg.body.trim().toLowerCase();
        
        const senderName = senderOverrides[senderId] || contact?.pushname?.toUpperCase() || senderId;

        console.log(`\n📥 Pesan diterima dari ${senderName} (${senderId}) di grup ${chat.name}`);
        console.log(`   Konten: "${msg.body.trim()}"`);

        const isDoneMessage = allowedDoneSenders.has(senderId) && /\bdone\b/i.test(text);
        if (isDoneMessage) {
            await processDoneMessage(msg, senderName, senderId);
            return;
        }

        const activity = detectActivity(text);
        if (activity) {
            await processRequestMessage(msg, senderName, senderId, activity);
        } else {
            console.log('   ⚠️ Pesan diabaikan (bukan request/done yang valid).');
        }
    } catch (err) {
        console.error(`❌ Terjadi error pada message handler utama:`, err);
    }
}

// === 🛠️ FUNGSI-FUNGSI BANTU (HELPER FUNCTIONS) ===

function detectActivity(text) {
    for (const [category, regex] of activityRegexMap.entries()) {
        if (regex.test(text)) {
            console.log(`   🔍 Aktivitas terdeteksi: ${category}`);
            return category;
        }
    }
    return null;
}

async function processRequestMessage(msg, senderName, senderId, activity) {
    console.log(`   📌 Menyimpan request "${activity}" dari ${senderName}.`);
    const timestamp = new Date(msg.timestamp * 1000);
    const formattedTime = getWitaTimeString(timestamp);
    const redisKey = `${REDIS_KEY_PREFIX}${Date.now()}`;

    const requestData = {
        activity,
        requester: senderId,
        requesterName: senderName,
        requestTime: formattedTime,
        requestContent: msg.body.trim(),
        doneTime: '',
        progressBy: '',
        progressByName: ''
    };

    try {
        // ✨ REVISI: Menggunakan `hset` yang lebih modern daripada `hmset`
        await redis.hset(redisKey, requestData);
        await redis.expire(redisKey, REDIS_KEY_EXPIRY_SECONDS);
        console.log(`   🧠 Request berhasil disimpan di Redis dengan key ${redisKey}.`);
    } catch (redisErr) {
        console.error(`   ❌ Gagal menyimpan request ke Redis:`, redisErr);
    }
}

async function processDoneMessage(msg, senderName, senderId) {
    console.log(`   🟢 Feedback "done" terdeteksi dari ${senderName}.`);
    const timestamp = new Date(msg.timestamp * 1000);
    const doneFormattedTime = getWitaTimeString(timestamp);

    try {
        const keys = await redis.keys(`${REDIS_KEY_PREFIX}*`);
        if (keys.length === 0) {
            console.log('   ℹ️ Tidak ditemukan request yang belum selesai di Redis.');
            return;
        }

        const sortedKeys = keys.sort((a, b) => parseInt(a.split(':')[1]) - parseInt(b.split(':')[1]));

        for (const key of sortedKeys) {
            const data = await redis.hgetall(key);
            
            if (data && !data.doneTime) {
                console.log(`   ✅ Menemukan request yang belum selesai: "${data.activity}" dari ${data.requesterName}.`);
                
                const updatedData = {
                    doneTime: doneFormattedTime,
                    progressBy: senderId,
                    progressByName: senderName
                };
                
                await redis.hset(key, updatedData);
                console.log('   💾 Data di Redis berhasil diupdate.');

                // ✨ OPTIMISASI UTAMA: "Fire and Forget"
                // Tugas menulis ke spreadsheet (yang lambat) dijalankan di latar belakang.
                // Fungsi `processDoneMessage` tidak perlu menunggunya selesai,
                // sehingga bisa langsung lanjut memproses pesan berikutnya di antrian.
                console.log('   🚀 Menitipkan tugas penulisan ke Spreadsheet untuk dijalankan di background...');
                sendToGoogleSheets(data, updatedData); // <-- Perhatikan, tidak ada `await` di sini!
                
                return; // Keluar dari loop setelah memproses satu request
            }
        }
        
        console.log('   ℹ️ Semua request yang tersimpan sudah ditandai selesai.');
    } catch (err) {
        console.error(`   ❌ Gagal memproses pesan "done":`, err);
    }
}

/**
 * Mengirim data ke Google Sheets. Dijalankan sebagai proses background.
 */
async function sendToGoogleSheets(originalData, updateData) {
    // ✨ REVISI: Log dipindahkan ke dalam fungsi ini agar lebih jelas.
    console.log('   📝 (Background) Memulai penulisan data ke Google Spreadsheet...');
    try {
        const sheetPayload = {
            sheet2: [
                originalData.activity,
                originalData.requesterName.toUpperCase(),
                updateData.progressByName,
                originalData.requestTime,
                updateData.doneTime,
                'https://bit.ly/RESPONSE_TIME'
            ],
            sheet7: [
                originalData.activity,
                originalData.requesterName.toUpperCase(),
                updateData.progressByName,
                originalData.requestTime,
                updateData.doneTime,
                'https://bit.ly/RESPONSE_TIME',
                originalData.requestContent || 'Tidak ada konten'
            ]
        };
        await appendToSheetMulti(sheetPayload);
        console.log(`   ✅ (Background) Berhasil menulis request "${originalData.activity}" ke Spreadsheet!`);
    } catch (sheetErr) {
        // Karena ini berjalan di background, errornya hanya kita catat dan tidak menghentikan aplikasi.
        console.error(`   ❌ (Background) Gagal menulis request "${originalData.activity}" ke Spreadsheet:`, sheetErr);
    }
}

function getWitaTimeString(dateObj) {
    const witaOffset = 8 * 60 * 60 * 1000;
    const witaTime = new Date(dateObj.getTime() + witaOffset);
    
    const mm = String(witaTime.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(witaTime.getUTCDate()).padStart(2, '0');
    const yyyy = witaTime.getUTCFullYear();
    const hh = String(witaTime.getUTCHours()).padStart(2, '0');
    const min = String(witaTime.getUTCMinutes()).padStart(2, '0');
    const ss = String(witaTime.getUTCSeconds()).padStart(2, '0');

    return `${mm}/${dd}/${yyyy} ${hh}:${min}:${ss}`;
}


// === 🚦 FUNGSI GRACEFUL SHUTDOWN ===
process.on('SIGINT', async () => {
    console.log('\n🚪 Menerima sinyal SIGINT. Memulai proses shutdown...');
    try {
        await client.destroy();
        console.log('✅ WhatsApp client destroyed.');
        await redis.quit();
        console.log('✅ Redis connection closed.');
    } catch (err) {
        console.error('❌ Error saat graceful shutdown:', err);
    }
    process.exit(0);
});

// === ▶️ MULAI CLIENT ===
client.initialize().catch(err => {
    console.error('❌ Gagal inisialisasi WhatsApp client:', err);
    process.exit(1);
});
