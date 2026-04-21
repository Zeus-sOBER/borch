import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const season = req.query.season || 1

  const [teamsRes, gamesRes, playersRes, logRes, coachesRes, settingsRes, heismanRes, champsRes, apRankingsRes] = await Promise.all([
    supabase.from('teams').select('*').order('wins', { ascending: false }),
    supabase.from('games').select('*').order('week', { ascending: true }),
    supabase.from('players').select('*'),
    supabase.from('scan_log').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('coaches').select('name, team, team_id, coaching_style, overall_wins, overall_losses').eq('is_active', true),
    supabase.from('league_settings').select('*').eq('id', 1).single(),
    supabase.from('heisman_watch').select('*').order('rank', { ascending: true }).limit(5),
    supabase.from('championships').select('*').eq('championship_type', 'national').order('season', { ascending: false }),
    supabase.from('ap_rankings').select('*').order('rank', { ascending: true }),
  ])

  const coaches  = coachesRes.data  || []
  const rawSettings = settingsRes.data || { current_week: 0, current_season: 1 }

  // Inject ap_rankings from the dedicated table into settings so the frontend
  // can read settings.ap_rankings exactly as before — no frontend changes needed.
  const apRankingsRows = apRankingsRes.data || []
  // Filter to the current season; fall back to league_settings JSONB if table is empty
  const currentSeason = rawSettings.current_season ?? 1
  const apForSeason = apRankingsRows.filter(r => r.season === currentSeason)
  const settings = {
    ...rawSettings,
    ap_rankings: apForSeason.length > 0
      ? apForSeason.map(r => ({ rank: r.rank, team_name: r.team_name, record: r.record, points: r.points, lw: r.lw, last_week_result: r.last_week_result, this_week: r.this_week }))
      : (rawSettings.ap_rankings || []),
  }

  // ── Normalize teams: rename team_name → name, join coach from coaches table ──
  const teams = (teamsRes.data || []).map((t, i) => {
    // Support both column names: team_name (new schema) and name (original schema)
    const teamKey = (t.team_name || t.name || '').toLowerCase().trim()

    // Match by team_id first (authoritative), then fall back to name matching
    const matchedCoach = coaches.find(c => c.team_id != null && c.team_id === t.id)
      || coaches.find(c => c.team?.toLowerCase().trim() === teamKey)

    return {
      ...t,
      name:  t.team_name || t.name || 'Unknown',
      coach: matchedCoach?.name || (t.coach && t.coach !== 'Unknown' ? t.coach : null),
      coaching_style: matchedCoach?.coaching_style || null,
      rank:  t.rank || i + 1,
    }
  })

  // ── Normalize games: ensure home/away fields are consistent ──
  const games = (gamesRes.data || []).map(g => ({
    ...g,
    status: g.is_final ? 'Final' : (g.status || 'Scheduled'),
  }))

  // ── Normalize players: flatten stats JSONB for display ──
  const players = (playersRes.data || []).map(p => ({
    ...p,
    pos:   p.position || p.pos || null,
    stats: p.stats || {},
    yards: p.yards ?? p.stats?.pass_yds ?? p.stats?.rush_yds ?? p.stats?.rec_yds ?? 0,
  })).sort((a, b) => (b.yards || 0) - (a.yards || 0))

  res.status(200).json({
    teams,
    games,
    players,
    scanLog:           logRes.data    || [],
    settings,
    heismanCandidates: heismanRes.data || [],
    championships:     champsRes.data  || [],
  })
}
