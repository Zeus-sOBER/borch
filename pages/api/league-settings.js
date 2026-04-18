import { createClient } from '@supabase/supabase-js'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export default async function handler(req, res) {
  const db = adminDb()

  // ── GET: return current settings ─────────────────────────────────────────
  if (req.method === 'GET') {
    const { data, error } = await db
      .from('league_settings')
      .select('*')
      .eq('id', 1)
      .single()

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json(data || { current_week: 0, current_season: 1 })
  }

  // ── PATCH: update settings (commissioner PIN required) ───────────────────
  if (req.method === 'PATCH') {
    const { pin, current_week, current_season, featured_article_id, hero_image_id, hero_image_mime, featured_game_id } = req.body || {}

    if (pin !== process.env.COMMISSIONER_PIN) {
      return res.status(403).json({ error: 'Invalid commissioner PIN' })
    }

    const updates = { updated_at: new Date().toISOString() }
    if (current_week        !== undefined) updates.current_week        = current_week
    if (current_season      !== undefined) updates.current_season      = current_season
    if (featured_article_id !== undefined) updates.featured_article_id = featured_article_id
    if (hero_image_id       !== undefined) updates.hero_image_id       = hero_image_id
    if (hero_image_mime     !== undefined) updates.hero_image_mime     = hero_image_mime
    if (featured_game_id    !== undefined) updates.featured_game_id    = featured_game_id

    const { data, error } = await db
      .from('league_settings')
      .upsert({ id: 1, ...updates })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    return res.status(200).json(data)
  }

  res.status(405).end()
}
