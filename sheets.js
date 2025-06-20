require('dotenv').config();
const { google } = require('googleapis');

let raw = process.env.GOOGLE_CREDENTIALS;
if (!raw) {
  console.error('Missing GOOGLE_CREDENTIALS environment variable.');
  process.exit(1);
}

if (!raw.trim().startsWith('{')) {
  try {
    raw = Buffer.from(raw, 'base64').toString('utf8');
  } catch (err) {
    console.error('Invalid base64 in GOOGLE_CREDENTIALS:', err.message);
    process.exit(1);
  }
}

let credentials;
try {
  credentials = JSON.parse(raw);
} catch (err) {
  console.error('Invalid GOOGLE_CREDENTIALS JSON:', err.message);
  process.exit(1);
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

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:F`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [dataArray],
      },
    });
  } catch (_) {
    // Silent: abaikan error tanpa mencetak apapun
  }
}

module.exports = appendToSheet;
