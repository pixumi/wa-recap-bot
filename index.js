const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');
const appendToSheet = require('./sheets');

const RECAP_FILE = path.join(__dirname, 'recap.json');

// Inisialisasi client WhatsApp dengan session tersimpan otomatis
const client = new Client({
  authStrategy: new LocalAuth()
});

// Tampilkan QR saat pertama kali login
client.on('qr', qr => {
  console.log('📲 Scan QR berikut untuk login WhatsApp:');
  qrcode.generate(qr, { small: true });
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

  console.log('\n📌 Ganti allowedGroupId di bawah dengan ID grup kamu ↑\n');
});

// Listener pesan masuk
client.on('message', async msg => {
  const chat = await msg.getChat();
  if (!chat.isGroup) return;

  // ✅ Ganti dengan ID grup kamu
  const allowedGroupId = '6281549680498-1545037512@g.us';
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

      appendToSheet([
        pending.requester,
        sender,
        pending.requestTime,
        formattedTime,
        'https://bit.ly/RESPONSE_TIME',
        pending.requestContent
      ]);
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

    appendToSheet([
      sender,
      '',
      formattedTime,
      '',
      'https://bit.ly/RESPONSE_TIME',
      content
    ]);
  }

  // Simpan recap ke file lokal
  fs.writeFileSync(RECAP_FILE, JSON.stringify(recapData, null, 2));
});

// Jalankan bot
client.initialize();
