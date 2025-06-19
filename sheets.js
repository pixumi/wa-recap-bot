require('dotenv').config();
const { google } = require('googleapis');
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

// Flag silent mode dari env
const silent = process.env.SILENT_MODE === 'true';

// Fungsi log aman
function log(...args) {
  if (!silent) console.log(...args);
}
function error(...args) {
  if (!silent) console.error(...args);
}

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES
});

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'Sheet1';

async function appendToSheet(dataArray) {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    log('🧾 Data yang dikirim:', dataArray);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [dataArray],
      },
    });

    log('📤 Recap berhasil ditambahkan ke Google Sheet');
  } catch (err) {
    error('❌ Gagal kirim ke Google Sheet:', err.message || err);
  }
}

module.exports = appendToSheet;
