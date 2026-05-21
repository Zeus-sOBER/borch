// /api/clips — receive a new clip from the Twitch bot, or fetch clips for a game
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Shared secret the bot sends so random people can't spam clips
const BOT_SECRET = process.env.CLIP_BOT_SECRET || 'dynasty-clip-secret'

export default async function handler(req, res) {
  // ── GET: fetch clips (optionally filtered by game_id, season, week) ──
  if (req.method === 'GET') {
    const { game_id, season, week, limit = 50 } = req.query
    let q = supabase
      .from('game_clips')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Number(limit))

    if (game_id) q = q.eq('game_id', game_id)
    if (season)  q = q.eq('season', season)
    if (week)    q = q.eq('week', week)

    const { data, error } = await q
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ clips: data || [] })
  }

  // ── POST: bot submits a new clip ──
  if (req.method === 'POST') {
    const { secret, clip_id, clip_url, embed_url, thumbnail_url, title,
            broadcaster, duration, season, week, home_team, away_team,
            triggered_by } = req.body

    if (secret !== BOT_SECRET) return res.status(403).json({ error: 'Forbidden' })
    if (!clip_url) return res.status(400).json({ error: 'clip_url required' })

    // Try to find the matching game row so we can hard-link the clip
    let game_id = null
    if (season && week && home_team && away_team) {
      const { data: matchingGame } = await supabase
        .from('games')
        .select('id')
        .eq('season', season)
        .eq('week', week)
        .or(`and(home_team.ilike.${home_team},away_team.ilike.${away_team}),and(home_team.ilike.${away_team},away_team.ilike.${home_team})`)
        .maybeSingle()
      if (matchingGame) game_id = matchingGame.id
    }

    const { data, error } = await supabase
      .from('game_clips')
      .upsert(
        { clip_id, clip_url, embed_url, thumbnail_url, title, broadcaster,
          duration, game_id, season: season ? Number(season) : null,
          week: week ? Number(week) : null, home_team, away_team, triggered_by },
        { onConflict: 'clip_id' }
      )
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ clip: data, game_id })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
