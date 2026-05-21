// GET: fetch channel record (safe fields only) + POST: update game context
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { channel } = req.query

  if (req.method === 'GET') {
    if (!channel) {
      // Return all connected channels (safe fields only)
      const { data } = await supabase
        .from('twitch_channels')
        .select('channel_name, current_season, current_week, current_home_team, current_away_team, clip_reward_id, eventsub_id')
        .order('channel_name')
      return res.status(200).json({ channels: data || [] })
    }
    const { data } = await supabase
      .from('twitch_channels')
      .select('channel_name, current_season, current_week, current_home_team, current_away_team, clip_reward_id, eventsub_id')
      .eq('channel_name', channel.toLowerCase())
      .single()
    return res.status(200).json({ channel: data || null })
  }

  if (req.method === 'POST') {
    const { channel_name, current_season, current_week, current_home_team, current_away_team, pin } = req.body
    if (pin !== process.env.COMMISSIONER_PIN) return res.status(403).json({ error: 'Invalid PIN' })
    if (!channel_name) return res.status(400).json({ error: 'channel_name required' })

    const { data, error } = await supabase
      .from('twitch_channels')
      .update({ current_season, current_week, current_home_team, current_away_team, updated_at: new Date().toISOString() })
      .eq('channel_name', channel_name.toLowerCase())
      .select('channel_name, current_season, current_week, current_home_team, current_away_team')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ channel: data })
  }

  res.status(405).end()
}
