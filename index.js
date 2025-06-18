require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const appendToSheet = require('./sheets');

const RECAP_FILE = path.join(__dirname, 'recap.json');

// Inisialisasi client WhatsApp dengan session tersimpan otomatis
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

let lastQRGenerated = 0;

// Tampilkan QR saat pertama kali login
client.on('qr', async (qr) => {
  const now = Date.now();
  if (now - lastQRGenerated < 60000) {
    console.log('⏳ QR skipped: Masih dalam cooldown.');
    return;
  }

  lastQRGenerated = now;

  console.log('📲 Scan QR berikut di browser:');

  try {
    const qrImageUrl = await QRCode.toDataURL(qr);
    console.log(qrImageUrl);
  } catch (err) {
    console.error('❌ Gagal generate QR:', err.message);
  }
});

// Saat client sudah login
client.on('ready', async () => {
  console.log('✅ WhatsApp bot siap digunakan!\n');

  // Tampilkan daftar grup (sekali saja)
  const chats = await client.getChats();
  chats.forEach(chat => {
    if (chat.isGroup) {
      console.log(`🟢 Grup: ${chat.name} | ID: ${chat.id._serialized}`);
    }
  });

  console.log('\n📌 Pastikan ALLOWED_GROUP_ID sudah diatur di file .env\n');
});

// Listener pesan masuk
client.on('message', async msg => {
  const chat = await msg.getChat();
  if (!chat.isGroup) return;

  // ID grup yang diperbolehkan (ambil dari environment)
  const allowedGroupId = process.env.ALLOWED_GROUP_ID;
  if (chat.id._serialized !== allowedGroupId) return;

  const sender = msg.author || msg.from;
  const content = msg.body.trim();
  const timestamp = new Date(msg.timestamp * 1000);
  const formattedTime = timestamp.toISOString().replace('T', ' ').split('.')[0];

  console.log(`[${formattedTime}] ${sender}: ${content}`);

  // Load data recap
  let recapData = [];
  if (fs.existsSync(RECAP_FILE)) {
    recapData = JSON.parse(fs.readFileSync(RECAP_FILE));
  }

  if (content.toLowerCase() === 'done') {
    console.log(`📌 DONE detected dari: ${sender}`);

    // Cari request terakhir dari sender yang belum selesai
    const pending = recapData.reverse().find(entry =>
      entry.requester === sender && !entry.doneTime
    );
    recapData.reverse();

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
        console.error('❌ Error appendToSheet:', error);
      }
    }
  } else {
    console.log(`📝 Request detected dari: ${sender}`);

    recapData.push({
      requester: sender,
      requestTime: formattedTime,
      requestContent: content,
      doneTime: '',
      progressBy: ''
    });

    try {
      await appendToSheet([
        sender,
        '',
        formattedTime,
        '',
        'https://bit.ly/RESPONSE_TIME',
        content
      ]);
    } catch (error) {
      console.error('❌ Error appendToSheet:', error);
    }
  }

  // Simpan recap ke file lokal
  fs.writeFileSync(RECAP_FILE, JSON.stringify(recapData, null, 2));
});

// Jalankan bot
client.initialize();
