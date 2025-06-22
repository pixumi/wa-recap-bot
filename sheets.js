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
const SHEET_NAME = 'Sheet1';

async function getSheets() {
  if (!sheetsClient) {
    sheetsClient = await auth.getClient();
    sheetsAPI = google.sheets({ version: 'v4', auth: sheetsClient });
  }
  return sheetsAPI;
}

async function appendToSheet(dataArray) {
  try {
    const sheets = await getSheets();

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [dataArray],
      },
    });

  } catch (err) {
    console.error('❌ Gagal menulis ke spreadsheet:', err.message);
  }
}

module.exports = appendToSheet;
