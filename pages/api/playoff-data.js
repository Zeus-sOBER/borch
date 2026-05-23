/**
 * /api/playoff-data
 *
 * Returns everything the playoff bracket page needs in one query:
 *   - All games for the current season (to compute records and fill the bracket)
 *   - League settings (current_season, current_week)
 *   - Coaches (for team display names)
 *
 * GET /api/playoff-data?season=1
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const PLAYOFF_TYPES = new Set([
  'conference_championship',
  'cfp_first_round',
  'cfp_quarterfinal',
  'cfp_semifinal',
  'national_championship',
  'bowl',
])

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const [settingsRes, coachesRes] = await Promise.all([
    supabase.from('league_settings').select('current_season, current_week, league_name').eq('id', 1).single(),
    supabase.from('coaches').select('name, team').eq('is_active', true),
  ])

  const settings = settingsRes.data || { current_season: 1, current_week: 0 }
  const season = Number(req.query.season || settings.current_season || 1)

  const { data: games, error } = await supabase
    .from('games')
    .select('*')
    .eq('season', season)
    .order('week', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })

  const allGames = games || []

  // ── Compute W-L record for every team from all completed games ───────────
  const records = {}
  for (const g of allGames) {
    if (!g.is_final || g.home_score == null || g.away_score == null) continue
    if (g.home_score === 0 && g.away_score === 0) continue

    for (const [team, scored, conceded] of [
      [g.home_team, g.home_score, g.away_score],
      [g.away_team, g.away_score, g.home_score],
    ]) {
      if (!team) continue
      if (!records[team]) records[team] = { wins: 0, losses: 0, pf: 0, pa: 0 }
      if (scored > conceded) records[team].wins++
      else records[team].losses++
      records[team].pf += scored
      records[team].pa += conceded
    }
  }

  // ── Split games into playoff and regular ─────────────────────────────────
  const playoffGames = allGames.filter(g => PLAYOFF_TYPES.has(g.game_type))
  const regularGames = allGames.filter(g => !PLAYOFF_TYPES.has(g.game_type))

  // Group playoff games by type, preserving order
  const byType = {
    conference_championship: [],
    cfp_first_round:         [],
    cfp_quarterfinal:        [],
    cfp_semifinal:           [],
    national_championship:   [],
    bowl:                    [],
  }
  for (const g of playoffGames) {
    if (byType[g.game_type]) byType[g.game_type].push(g)
  }

  // Fallback: if no explicit game_type set, infer from week number
  for (const g of allGames) {
    if (g.game_type && g.game_type !== 'regular') continue
    const w = g.week ?? 0
    let inferred = null
    if (w === 16) inferred = 'conference_championship'
    else if (w === 17) inferred = 'cfp_first_round'
    else if (w === 18) inferred = 'cfp_quarterfinal'
    else if (w === 19) inferred = 'cfp_semifinal'
    else if (w >= 20) inferred = 'national_championship'
    if (inferred && byType[inferred]) byType[inferred].push({ ...g, game_type: inferred })
  }

  return res.status(200).json({
    season,
    settings,
    coaches:      coachesRes.data || [],
    records,
    bracket:      byType,
    regularGames,
    allGames,
  })
}
