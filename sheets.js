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

    // === Menulis ke KPI RESPON TIME (hanya jika D–H kosong) ===
    if (sheet2) {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'KPI RESPON TIME'!D:H`,
        majorDimension: 'ROWS',
      });

      let targetRow = res.data.values?.length + 1 || 1;

      // Cari baris pertama di mana D–H kosong semua (abaikan kolom C)
      for (let i = 0; i < res.data.values.length; i++) {
        const row = res.data.values[i];
        const isEmptyDToH = !row || row.length < 5 || row.every(cell => !cell || cell.trim() === '');
        if (isEmptyDToH) {
          targetRow = i + 1; // karena baris Excel dimulai dari 1
          break;
        }
      }

      // Tulis C–H (override kolom C meskipun sudah terisi/dropdown)
      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `'KPI RESPON TIME'!C${targetRow}:H${targetRow}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [sheet2] },
      });
    }

    // === Menulis ke Log Bot WA tetap pakai append ===
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
