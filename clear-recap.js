// =================================================================
// ======== 🇮🇩 SCRIPT PEMBERSIH REDIS - RECAP BOT 🇮🇩 =========
// =================================================================
// Deskripsi: Script ini akan mencari dan menghapus semua key
//            di Redis yang cocok dengan pola 'recap:*'.
//            Script ini dirancang untuk berjalan di environment
//            seperti Fly.io, di mana koneksi string Redis
//            disimpan sebagai secret environment variable.
//
// Cara Pakai:
// 1. Pastikan secret `REDIS_URL` sudah diatur di environment Fly.io.
// 2. Jalankan dari terminal: node cleanRecap.js
// =================================================================

const Redis = require('ioredis');
const readline = require('readline');

// --- Fungsi untuk meminta input dari user di terminal ---
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => {
  return new Promise(resolve => rl.question(query, ans => {
    resolve(ans);
  }))
}

// --- Fungsi Utama ---
async function main() {
  console.log('🧹 Memulai script pembersih key Redis...');

  // ✨ REVISI: Langsung membaca dari environment variable/secret, tanpa .env
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('❌ Error: Environment variable REDIS_URL tidak ditemukan.');
    console.error('   Pastikan secret bernama REDIS_URL sudah diatur di environment hosting Anda (misal: Fly.io).');
    return;
  }

  // Opsi koneksi, menambahkan TLS jika URL menggunakan `rediss://` (seperti Upstash/Fly.io Redis)
  const connectionOptions = redisUrl.startsWith('rediss://') ? { tls: {} } : {};

  const redis = new Redis(redisUrl, connectionOptions);

  redis.on('error', (err) => {
    console.error('❌ Gagal terhubung ke Redis:', err.message);
    // Jika gagal terhubung, tidak ada gunanya melanjutkan
    process.exit(1);
  });
  
  console.log('🔌 Mencoba terhubung ke Redis...');
  
  // Bungkus dalam try...finally untuk memastikan koneksi selalu ditutup
  try {
    await redis.ping(); // Menunggu koneksi benar-benar siap
    console.log('✅ Berhasil terhubung ke Redis.');

    // PERINGATAN: Perintah `KEYS` bisa memblokir database Redis jika ada
    // jutaan key. Untuk skala sangat besar, pertimbangkan menggunakan `SCAN`.
    // Namun untuk kasus bot ini, `KEYS` sudah cukup.
    const keys = await redis.keys('recap:*');

    if (keys.length === 0) {
      console.log('✅ Tidak ada key dengan pola "recap:*" yang ditemukan. Semuanya bersih!');
      return;
    }

    console.log(`\n⚠️  Ditemukan ${keys.length} key yang cocok dengan pola "recap:*":`);
    // Tampilkan beberapa contoh key untuk verifikasi
    keys.slice(0, 5).forEach(key => console.log(`   - ${key}`));
    if (keys.length > 5) console.log(`   - ...dan ${keys.length - 5} lainnya.`);
    
    // ✨ FITUR KEAMANAN: Meminta konfirmasi sebelum menghapus
    console.log(''); // Memberi spasi
    const answer = await askQuestion('❓ Apakah Anda yakin ingin menghapus semua key ini? (y/n) ');

    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      console.log('\n🗑️  Menghapus key...');
      const deletedCount = await redis.del(keys);
      console.log(`✅  Berhasil menghapus ${deletedCount} key.`);
    } else {
      console.log('\n❌  Operasi dibatalkan oleh user.');
    }

  } catch (err) {
    console.error('❌ Terjadi error saat menjalankan operasi Redis:', err);
  } finally {
    // Pastikan untuk selalu menutup koneksi
    rl.close();
    redis.disconnect();
    console.log('\n🔌 Koneksi ke Redis ditutup.');
  }
}

// --- Jalankan fungsi utama ---
main().catch(err => {
    console.error("Sebuah error tak terduga terjadi:", err);
    process.exit(1);
});
