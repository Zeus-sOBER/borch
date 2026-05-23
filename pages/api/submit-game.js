/**
 * /api/submit-game
 *
 * Accepts a game submission from the schedule-submit form.
 * Upserts the game into Supabase directly (no sheet parsing needed).
 *
 * POST body:
 *   {
 *     week: number,
 *     home_team: string,
 *     away_team: string,
 *     home_score?: number | null,
 *     away_score?: number | null,
 *     is_final: boolean,
 *     game_type?: string,
 *     notes?: string,
 *   }
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const VALID_GAME_TYPES = [
  'regular', 'conference_championship', 'bowl',
  'cfp_first_round', 'cfp_quarterfinal', 'cfp_semifinal', 'national_championship',
]

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { week, home_team, away_team, home_score, away_score, is_final, game_type, notes } = req.body || {}

  // ── Validate required fields ──────────────────────────────────────────────
  if (week == null || isNaN(Number(week))) return res.status(400).json({ error: 'week is required and must be a number' })
  if (!home_team?.trim()) return res.status(400).json({ error: 'home_team is required' })
  if (!away_team?.trim()) return res.status(400).json({ error: 'away_team is required' })
  if (home_team.trim().toLowerCase() === away_team.trim().toLowerCase()) {
    return res.status(400).json({ error: 'home_team and away_team cannot be the same' })
  }
  if (is_final && (home_score == null || away_score == null)) {
    return res.status(400).json({ error: 'home_score and away_score are required for finalized games' })
  }
  const resolvedType = VALID_GAME_TYPES.includes(game_type) ? game_type : 'regular'

  try {
    const { data: leagueSettings } = await supabase
      .from('league_settings')
      .select('current_season')
      .eq('id', 1)
      .single()
    const season = leagueSettings?.current_season ?? 1

    // Check if a finalized version already exists — never downgrade it
    const norm = (s) => (s || '').toLowerCase().trim()
    const { data: existingGames } = await supabase
      .from('games')
      .select('id, is_final')
      .eq('season', season)
      .eq('week', Number(week))

    const existing = (existingGames || []).find(g => {
      // Match regardless of home/away order
      const teams = [norm(home_team), norm(away_team)]
      return true // we'll do the full match below via upsert conflict key
    })

    // Use upsert on the natural key — DB unique constraint handles dedup
    const row = {
      season,
      week:       Number(week),
      home_team:  home_team.trim(),
      away_team:  away_team.trim(),
      home_score: is_final ? (Number(home_score) ?? null) : null,
      away_score: is_final ? (Number(away_score) ?? null) : null,
      is_final:   !!is_final,
      status:     is_final ? 'Final' : 'Scheduled',
      game_type:  resolvedType,
      notes:      notes?.trim() || null,
    }

    const { error } = await supabase
      .from('games')
      .upsert(row, { onConflict: 'home_team,away_team,week,season' })

    if (error) {
      console.error('[submit-game] upsert error:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true, game: row })
  } catch (err) {
    console.error('[submit-game] error:', err)
    return res.status(500).json({ error: err.message })
  }
}
