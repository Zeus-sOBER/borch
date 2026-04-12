import { createClient } from '@supabase/supabase-js'

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export default async function handler(req, res) {
  const { id } = req.query
  const { pin, ...body } = req.body || {}

  if (pin !== process.env.COMMISSIONER_PIN) {
    return res.status(403).json({ error: 'Invalid commissioner PIN' })
  }

  const db = adminDb()

  if (req.method === 'PATCH') {
    const { data, error } = await db.from('coaches')
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ coach: data })
  }

  if (req.method === 'DELETE') {
    const { error } = await db.from('coaches')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  res.status(405).end()
}
