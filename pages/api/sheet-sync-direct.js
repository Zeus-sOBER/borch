/**
 * /api/sheet-sync-direct
 *
 * Called by the Google Apps Script — receives structured game rows
 * and writes them directly to Supabase using the service role key.
 * No Claude, no CSV parsing. Just fast, direct writes.
 *
 * POST body:
 *   {
 *     secret: string,          // must match SHEET_SYNC_SECRET env var
 *     games: [
 *       {
 *         season, week, home_team, away_team,
 *         home_score, away_score, is_final, game_type, notes
 *       }
 *     ]
 *   }
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // ── GET: pull finalized games back to sheet ───────────────────────────────
  if (req.method === 'GET') {
    const { secret, season = 1 } = req.query
    if (!secret || secret !== process.env.SHEET_SYNC_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    const { data, error } = await supabase
      .from('games')
      .select('week, home_team, away_team, home_score, away_score, notes')
      .eq('season', Number(season))
      .eq('is_final', true)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ games: data || [] })
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { secret, games } = req.body || {}

  if (!secret || secret !== process.env.SHEET_SYNC_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  if (!Array.isArray(games) || games.length === 0) {
    return res.status(400).json({ error: 'No games provided' })
  }

  // Fetch already-finalized games so we never un-finalize a completed result
  const season = games[0]?.season ?? 1
  const { data: finalizedRows } = await supabase
    .from('games')
    .select('week, home_team, away_team')
    .eq('season', season)
    .eq('is_final', true)

  const norm = s => (s || '').toLowerCase().trim()
  const makeKey = (week, t1, t2) =>
    `${week}|${[norm(t1), norm(t2)].sort().join('|')}`

  const finalizedSet = new Set((finalizedRows || []).map(g =>
    makeKey(g.week, g.home_team, g.away_team)
  ))

  let saved  = 0
  let skipped = 0
  const errors = []

  for (const game of games) {
    const key = makeKey(game.week, game.home_team, game.away_team)

    // Skip: don't flip a finalized game back to scheduled
    if (finalizedSet.has(key) && !game.is_final) {
      skipped++
      continue
    }

    const row = {
      season:     game.season,
      week:       game.week,
      home_team:  game.home_team,
      away_team:  game.away_team,
      home_score: game.is_final ? (game.home_score ?? null) : null,
      away_score: game.is_final ? (game.away_score ?? null) : null,
      is_final:   !!game.is_final,
      game_type:  game.game_type || 'regular',
      notes:      game.notes || null,
    }

    const { error } = await supabase
      .from('games')
      .upsert(row, { onConflict: 'home_team,away_team,week,season' })

    if (error) {
      errors.push({ game: `${game.home_team} vs ${game.away_team} Wk${game.week}`, error: error.message })
    } else {
      saved++
    }
  }

  return res.status(200).json({
    saved,
    skipped,
    errors,
    total: games.length,
  })
}
