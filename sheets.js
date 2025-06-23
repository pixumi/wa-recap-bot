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

    // === KPI RESPON TIME: baca seluruh D–H, cari baris terakhir terisi, tulis ke C–H ===
    if (sheet2) {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'KPI RESPON TIME'!D:H`,
        majorDimension: 'ROWS',
      });

      const rows = res.data.values || [];
      let lastFilledRow = 0;

      for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i];
        const hasData = row && row.some(cell => cell && cell.trim() !== '');
        if (hasData) {
          lastFilledRow = i + 1;
          break;
        }
      }

      const nextRow = lastFilledRow + 1;

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `'KPI RESPON TIME'!C${nextRow}:H${nextRow}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [sheet2] },
      });
    }

    // === LOG BOT WA: baca seluruh B–H, cari baris terakhir terisi, tulis ke B–H ===
    if (sheet7) {
      const resLog = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `'Log Bot WA'!B:H`,
        majorDimension: 'ROWS',
      });

      const rowsLog = resLog.data.values || [];
      let lastFilledRowLog = 0;

      for (let i = rowsLog.length - 1; i >= 0; i--) {
        const row = rowsLog[i];
        const hasData = row && row.some(cell => cell && cell.trim() !== '');
        if (hasData) {
          lastFilledRowLog = i + 1;
          break;
        }
      }

      const nextRowLog = lastFilledRowLog + 1;

      await sheets.spreadsheets.values.update({
        spreadsheetId: SHEET_ID,
        range: `'Log Bot WA'!B${nextRowLog}:H${nextRowLog}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [sheet7] },
      });
    }

  } catch (err) {
    console.error('❌ Gagal menulis ke multi-sheet:', err.message);
  }
}



module.exports = { appendToSheetMulti };
