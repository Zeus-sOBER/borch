import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const season = req.query.season || 1

  const [teamsRes, gamesRes, playersRes, logRes] = await Promise.all([
    supabase.from('teams').select('*').eq('season', season).order('rank', { ascending: true }),
    supabase.from('games').select('*').eq('season', season).order('week', { ascending: true }),
    supabase.from('players').select('*').eq('season', season),
    supabase.from('scan_log').select('*').order('created_at', { ascending: false }).limit(20),
  ])

  res.status(200).json({
    teams: teamsRes.data || [],
    games: gamesRes.data || [],
    players: playersRes.data || [],
    scanLog: logRes.data || [],
  })
}
