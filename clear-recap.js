// cleanRecap.js
require('dotenv').config();
const Redis = require('ioredis');

// Pastikan REDIS_URL disiapkan di .env atau bisa langsung ditaruh di sini
const redis = new Redis('rediss://default:your_token@your-endpoint.upstash.io:6379', {
  tls: {} // wajib untuk Upstash
});

(async () => {
  try {
    const keys = await redis.keys('recap:*');
    if (!keys.length) {
      console.log('✅ Tidak ada key recap:* ditemukan.');
      return;
    }

    const deleted = await redis.del(keys);
    console.log(`🧹 ${deleted} key recap:* berhasil dihapus.`);

    redis.disconnect();
  } catch (err) {
    console.error('❌ Gagal hapus key:', err.message);
  }
})();
