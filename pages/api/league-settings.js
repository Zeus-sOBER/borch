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
    const { pin, current_week, current_season, featured_article_id, hero_image_id, hero_image_mime, featured_game_id, ap_rankings, ap_poll_updated_at, logo_overrides, league_name, league_subtitle, accent_color, discord_webhook_url } = req.body || {}

    if (pin !== process.env.COMMISSIONER_PIN) {
      return res.status(403).json({ error: 'Invalid commissioner PIN' })
    }

    const updates = { updated_at: new Date().toISOString() }
    if (current_week         !== undefined) updates.current_week         = current_week
    if (current_season       !== undefined) updates.current_season       = current_season
    if (featured_article_id  !== undefined) updates.featured_article_id  = featured_article_id
    if (hero_image_id        !== undefined) updates.hero_image_id        = hero_image_id
    if (hero_image_mime      !== undefined) updates.hero_image_mime      = hero_image_mime
    if (featured_game_id     !== undefined) updates.featured_game_id     = featured_game_id
    if (ap_poll_updated_at   !== undefined) updates.ap_poll_updated_at   = ap_poll_updated_at
    if (logo_overrides       !== undefined) updates.logo_overrides       = logo_overrides
    if (league_name          !== undefined) updates.league_name          = league_name
    if (league_subtitle      !== undefined) updates.league_subtitle      = league_subtitle
    if (accent_color         !== undefined) updates.accent_color         = accent_color
    if (discord_webhook_url  !== undefined) updates.discord_webhook_url  = discord_webhook_url

    // ── If ap_rankings are being updated, write to the ap_rankings table instead of JSONB ──
    if (ap_rankings !== undefined && Array.isArray(ap_rankings) && ap_rankings.length > 0) {
      try {
        // Delete old rankings for this season
        const season = current_season !== undefined ? current_season : 1
        await db.from('ap_rankings').delete().eq('season', season)

        // Insert new rankings
        const rankingsToInsert = ap_rankings.map(r => ({
          season,
          rank: r.rank,
          lw: r.lw ?? null,
          team_name: r.team_name,
          record: r.record ?? null,
          points: r.points ?? null,
          last_week_result: r.last_week_result ?? null,
          this_week: r.this_week ?? null,
          updated_at: new Date().toISOString(),
        }))

        const { error: insertError } = await db
          .from('ap_rankings')
          .insert(rankingsToInsert)

        if (insertError) throw insertError
      } catch (err) {
        console.error('[league-settings] Error writing to ap_rankings table:', err)
        return res.status(500).json({ error: 'Failed to update AP rankings table', details: err.message })
      }
    }

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
