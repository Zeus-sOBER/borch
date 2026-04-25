import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function generateEditToken() {
  return crypto.randomBytes(16).toString('hex')
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    // Don't expose edit_token in public GET — coaches see their own token via /api/coaches/[id]?token=...
    const { data, error } = await db.from('coaches').select('*').eq('is_active', true).order('overall_wins', { ascending: false })
    if (error) return res.status(500).json({ error: error.message })
    // Strip edit_token from public listing
    const safe = (data || []).map(({ edit_token, ...rest }) => rest)
    return res.status(200).json({ coaches: safe })
  }

  if (req.method === 'POST') {
    const { pin, coach } = req.body
    if (pin !== process.env.COMMISSIONER_PIN) return res.status(403).json({ error: 'Invalid commissioner PIN' })
    const db = adminDb()
    const editToken = generateEditToken()
    const { data, error } = await db.from('coaches')
      .insert({ ...coach, edit_token: editToken, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ coach: data })
  }

  // PUT: Generate/regenerate edit token for a coach (commissioner only)
  if (req.method === 'PUT') {
    const { pin, coachId } = req.body
    if (pin !== process.env.COMMISSIONER_PIN) return res.status(403).json({ error: 'Invalid commissioner PIN' })
    const db = adminDb()
    const editToken = generateEditToken()
    const { data, error } = await db.from('coaches')
      .update({ edit_token: editToken, updated_at: new Date().toISOString() })
      .eq('id', coachId).select().single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ coach: data, editToken })
  }

  res.status(405).end()
}
