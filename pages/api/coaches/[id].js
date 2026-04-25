import { createClient } from '@supabase/supabase-js'

function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// Coach self-service: allowed fields a coach can edit with their edit_token
const COACH_EDITABLE_FIELDS = ['bio', 'coaching_style', 'avatar_url', 'motto', 'favorite_play', 'social_links']

export default async function handler(req, res) {
  const { id } = req.query
  const { pin, edit_token, id: _id, created_at: _ca, edit_token: _et, ...body } = req.body || {}

  const db = adminDb()

  // ── GET: fetch a coach by id (public, or with token for self-service) ──
  if (req.method === 'GET') {
    const { token } = req.query
    const { data, error } = await db.from('coaches').select('*').eq('id', id).single()
    if (error) return res.status(404).json({ error: 'Coach not found' })

    // If token matches, return full profile (including edit_token confirmation)
    if (token && data.edit_token && token === data.edit_token) {
      return res.status(200).json({ coach: data, editable: true })
    }

    // Public: strip edit_token
    const { edit_token: _t, ...safe } = data
    return res.status(200).json({ coach: safe })
  }

  // ── Auth: commissioner PIN or coach edit_token ──
  const isCommissioner = pin && pin === process.env.COMMISSIONER_PIN
  let isCoachSelfEdit = false

  if (!isCommissioner && edit_token) {
    // Verify edit_token belongs to this coach
    const { data: coach } = await db.from('coaches').select('edit_token').eq('id', id).single()
    if (coach?.edit_token && coach.edit_token === edit_token) {
      isCoachSelfEdit = true
    }
  }

  if (!isCommissioner && !isCoachSelfEdit) {
    return res.status(403).json({ error: 'Invalid commissioner PIN or edit token' })
  }

  if (req.method === 'PATCH') {
    // If self-editing, only allow certain fields
    let updates = { ...body }
    if (isCoachSelfEdit) {
      updates = {}
      for (const field of COACH_EDITABLE_FIELDS) {
        if (body[field] !== undefined) updates[field] = body[field]
      }
    }

    const { data, error } = await db.from('coaches')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id).select().single()
    if (error) return res.status(500).json({ error: error.message })
    // Strip edit_token from response
    const { edit_token: _t, ...safe } = data
    return res.status(200).json({ coach: safe })
  }

  if (req.method === 'DELETE') {
    // Only commissioner can delete
    if (!isCommissioner) return res.status(403).json({ error: 'Only commissioner can remove coaches' })
    const { error } = await db.from('coaches')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ success: true })
  }

  res.status(405).end()
}
