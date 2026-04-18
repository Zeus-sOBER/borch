import { createClient } from '@supabase/supabase-js'

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    const { data, error } = await db.from('coaches').select('*').eq('is_active', true).order('overall_wins', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ coaches: data })
  }

  if (req.method === 'POST') {
    const { pin, coach } = req.body
    if (pin !== process.env.COMMISSIONER_PIN) return res.status(403).json({ error: 'Invalid commissioner PIN' })
    const db = adminDb()
    const { data, error } = await db.from('coaches')
      .insert({ ...coach, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ coach: data })
  }

  res.status(405).end()
}
