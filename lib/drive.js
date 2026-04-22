import { google } from 'googleapis'

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const credentials = typeof raw === 'string' ? JSON.parse(raw) : raw
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  })
}

// Fetch a specific sheet tab as CSV using a direct authenticated HTTP request.
// gid is the numeric sheet ID from the URL (e.g. ?gid=482403615).
export async function fetchSheetTabAsCsv(spreadsheetId, gid) {
  const auth = getAuth()
  const client = await auth.getClient()
  const tokenRes = await client.getAccessToken()
  const token = tokenRes.token

  const url = gid != null
    ? `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
    : `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Sheet export failed (${res.status}): ${body.slice(0, 200)}`)
  }

  return await res.text()
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
