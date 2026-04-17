import { google } from 'googleapis'

function getAuth() {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const credentials = typeof raw === 'string' ? JSON.parse(raw) : raw
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
}

export async function listDriveImages() {
  const auth = getAuth()
  const drive = google.drive({ version: 'v3', auth })
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  const res = await drive.files.list({
    q: `'${folderId}' in parents and (mimeType contains 'image' or mimeType = 'application/vnd.google-apps.document') and trashed = false`,
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
