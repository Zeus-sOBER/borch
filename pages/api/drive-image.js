import { getDriveImageBase64 } from '../../lib/drive'

export default async function handler(req, res) {
  if (req.method \!== 'GET') return res.status(405).end()

  const { id, mime } = req.query
  if (\!id) return res.status(400).json({ error: 'Missing file id' })

  try {
    const mimeType = mime || 'image/png'
    const { base64, mediaType } = await getDriveImageBase64(id, mimeType)

    res.setHeader('Content-Type', mediaType)
    res.setHeader('Cache-Control', 'public, max-age=3600')
    res.send(Buffer.from(base64, 'base64'))
  } catch (e) {
    console.error('drive-image error:', e)
    res.status(500).json({ error: e.message })
  }
}
