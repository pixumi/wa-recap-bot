require('dotenv').config();
const { google } = require('googleapis');

// Ambil kredensial dari environment
let raw = process.env.GOOGLE_CREDENTIALS;
if (!raw) {
  console.error('❌ Missing GOOGLE_CREDENTIALS environment variable.');
  process.exit(1);
}

// Decode base64 jika perlu
if (!raw.trim().startsWith('{')) {
  try {
    raw = Buffer.from(raw, 'base64').toString('utf8');
  } catch (err) {
    console.error('❌ Invalid base64 in GOOGLE_CREDENTIALS:', err.message);
    process.exit(1);
  }
}

// Parse JSON kredensial
let credentials;
try {
  credentials = JSON.parse(raw);
} catch (err) {
  console.error('❌ Invalid GOOGLE_CREDENTIALS JSON:', err.message);
  process.exit(1);
}

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES
});

// 🔄 Reuse client dan sheets API (biar gak autentikasi ulang terus)
let sheetsClient = null;
let sheetsAPI = null;

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

async function getSheets() {
  if (!sheetsClient) {
    sheetsClient = await auth.getClient();
    sheetsAPI = google.sheets({ version: 'v4', auth: sheetsClient });
  }
  return sheetsAPI;
}

async function appendToSheetMulti({ sheet2, sheet7 }) {
  try {
    const sheets = await getSheets();

    // ====== Untuk KPI RESPON TIME (gunakan UPDATE, bukan APPEND) ======
    if (sheet2) {
      // Ambil semua isi kolom D (penanda baris terisi)
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'KPI RESPON TIME'!C:H`,
        majorDimension: 'ROWS',
      });

      const lastRow = res.data.values ? res.data.values.length : 0;
      const nextRow = lastRow + 1;

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `'KPI RESPON TIME'!D${nextRow}:I${nextRow}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [sheet2] },
      });
    }

    // ====== Untuk Log Bot WA (tetap pakai APPEND) ======
    if (sheet7) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: `'Log Bot WA'!B:H`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [sheet7] },
      });
    }

  } catch (err) {
    console.error('❌ Gagal menulis ke multi-sheet:', err.message);
  }
}

module.exports = { appendToSheetMulti };
