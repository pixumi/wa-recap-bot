<p align="center">
  <img src="assets/banner.png" width="100%" alt="WA Recap Bot Banner"/>
</p>

# 📩 WhatsApp Recap Bot
Bot otomatis untuk mencatat permintaan dan feedback dari grup WhatsApp ke dalam Google Spreadsheet — **tanpa perlu copy-paste manual.** Dibangun menggunakan `whatsapp-web.js` dan integrasi `googleapis`.

---

## ✨ Fitur Utama

- ✅ Membaca pesan dari grup WhatsApp tertentu
- ✅ Mendeteksi pesan `request` dan `done`
- ✅ Mencatat log recap ke Google Sheet secara otomatis
- ✅ Tidak memerlukan interaksi manual setelah jalan

---

## 🛠️ Teknologi

- Node.js
- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js)
- Google Sheets API
- LocalAuth session
- GitHub integration (auto-push project)

---

## 📦 Instalasi

```bash
git clone https://github.com/pixumi/wa-recap-bot.git
cd wa-recap-bot
npm install
npm start
```

### 1. Siapkan `credentials.json`

- Buat project serta service account di Google Cloud.
- Aktifkan Google Sheets API dan unduh file kunci JSON.
- Simpan file tersebut sebagai `credentials.json` di folder proyek.

### 2. Atur konfigurasi

- Ubah `allowedGroupId` pada `index.js` dengan ID grup WhatsApp kamu.
- Sesuaikan `SHEET_ID` dan `SHEET_NAME` pada `sheets.js`.

### 3. Menjalankan bot

```bash
node index.js
```

Saat pertama kali dijalankan, scan QR yang muncul di terminal. Bot akan mencatat pesan `request` dan `done` dari grup yang diizinkan ke Google Sheet.

Salin file `.env.example` menjadi `.env` lalu isi variabel berikut:

```env
ALLOWED_GROUP_ID=1234567890-abcdefg@g.us
GOOGLE_SHEET_ID=your_google_sheet_id
GOOGLE_CREDENTIALS=base64_encoded_credentials
REDIS_URL=your_upstash_connection_string
```

`REDIS_URL` merupakan string koneksi Redis dari Upstash.

Jika dideploy ke Fly.io, encode `credentials.json` menggunakan perintah berikut dan set sebagai secret:

```bash
fly secrets set GOOGLE_CREDENTIALS=$(base64 -w0 credentials.json)
```

## 🚀 Deploy ke Fly.io

1. **Install Fly CLI** dan login:

   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. **Buat aplikasi** (satu kali saja):

   ```bash
   fly launch --no-deploy
   ```

3. **Siapkan database Redis**. Kamu bisa menggunakan layanan gratis seperti
   [Upstash](https://upstash.com/) dan salin `REDIS_URL`-nya.

4. **Set secrets** yang diperlukan agar tidak tersimpan di repositori:

   ```bash
  fly secrets set \
    ALLOWED_GROUP_ID=1234567890-abcdefg@g.us \
    GOOGLE_SHEET_ID=your_google_sheet_id \
    GOOGLE_CREDENTIALS=$(base64 -w0 credentials.json) \
    REDIS_URL=redis://username:password@host:port
   ```

5. **Deploy dan jalankan container**:

   ```bash
   fly deploy
   ```

   Setelah proses selesai, bot akan otomatis berjalan di Fly.io.