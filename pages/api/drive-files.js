import { listDriveImages } from '../../lib/drive'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  try {
    const files = await listDriveImages()
    res.status(200).json({ files })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
