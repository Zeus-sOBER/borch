import { google } from 'googleapis'

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const credentials = typeof raw === 'string' ? JSON.parse(raw) : raw
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ],
  })
}

// Fetch a specific sheet tab as CSV using the Sheets API.
// gid is the numeric sheet ID from the URL (e.g. ?gid=482403615).
// Falls back to the first sheet if gid is not found.
export async function fetchSheetTabAsCsv(spreadsheetId, gid) {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  // Get spreadsheet metadata to resolve the gid → tab name
  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const allSheets = meta.data.sheets || []

  let sheetName
  if (gid != null) {
    const match = allSheets.find(s => s.properties.sheetId === Number(gid))
    sheetName = match?.properties?.title
  }
  // Fall back to first sheet if not found
  if (!sheetName) sheetName = allSheets[0]?.properties?.title

  const valuesRes = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: sheetName,
  })

  const rows = valuesRes.data.values || []
  // Convert 2D array → CSV string
  return rows
    .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
}

export async function listDriveImages() {
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  const res = await drive.files.list({
    q: `'${folderId}' in parents and (mimeType contains 'image' or mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/vnd.google-apps.spreadsheet') and trashed = false`,
    fields: 'files(id, name, createdTime, mimeType)',
    orderBy: 'createdTime desc',
    pageSize: 50,
  })

  return res.data.files || []
}

export async function getDriveImageBase64(fileId, mimeType) {
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  )

  const buffer = Buffer.from(res.data)
  return {
    base64: buffer.toString('base64'),
    mediaType: mimeType || 'image/png',
  }
}
