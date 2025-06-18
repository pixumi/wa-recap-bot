require('dotenv').config();
const { google } = require('googleapis');
const credentials = require('./credentials.json');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES
});

// ID Sheet diambil dari environment
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'Sheet1'; // atau ganti jika tab kamu bukan Sheet1

async function appendToSheet(dataArray) {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });

    console.log('🧾 Data yang dikirim:', dataArray); // DEBUG

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [dataArray],
      },
    });

    console.log('📤 Recap berhasil ditambahkan ke Google Sheet');
  } catch (error) {
    console.error('❌ Gagal kirim ke Google Sheet:', error.message);
  }
}

module.exports = appendToSheet;

// Test manual
// Jalankan dengan: node sheets.js

// Uncomment untuk test manual
// appendToSheet(['TestSender', '', '2025-06-18 21:00:00', '', 'https://bit.ly/RESPONSE_TIME', 'Testing kirim ke Sheet']);
