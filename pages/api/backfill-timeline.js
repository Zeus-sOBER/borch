/**
 * /api/backfill-timeline
 *
 * Safely backfills narrative_log with game entries for any past season
 * that was finalized before the timeline system was in place.
 *
 * SAFE TO RUN AT ANY TIME — it never touches championships, articles,
 * current_season, or any other state. It only inserts into narrative_log,
 * and only for games that aren't already there.
 *
 * POST body: { pin, season }
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { pin, season } = req.body || {}
  if (!pin || pin !== process.env.COMMISSIONER_PIN) {
    return res.status(401).json({ error: 'Commissioner PIN required' })
  }
  if (!season) return res.status(400).json({ error: 'season is required' })

  const supabase = db()

  // ── Load all finalized games for this season ───────────────────────────────
  const { data: allGames, error: gamesErr } = await supabase
    .from('games')
    .select('*')
    .eq('season', Number(season))
    .eq('is_final', true)
    .order('week', { ascending: true })

  if (gamesErr) return res.status(500).json({ error: gamesErr.message })

  const finalGames = (allGames || []).filter(g =>
    g.home_score != null && g.away_score != null &&
    !(g.home_score === 0 && g.away_score === 0)
  )

  if (!finalGames.length) {
    return res.status(200).json({ message: `No finalized games found for Season ${season}`, logged: 0 })
  }

  // ── Find which games are already in narrative_log ──────────────────────────
  const { data: existingLogs } = await supabase
    .from('narrative_log')
    .select('source_id')
    .eq('season', Number(season))
    .eq('source_table', 'games')

  const loggedIds = new Set((existingLogs || []).map(r => String(r.source_id)))
  const unlogged  = finalGames.filter(g => !loggedIds.has(String(g.id)))

  if (!unlogged.length) {
    return res.status(200).json({
      message: `All ${finalGames.length} games for Season ${season} are already in the timeline.`,
      logged: 0,
      alreadyExists: finalGames.length,
    })
  }

  // ── Load coaches for name matching ─────────────────────────────────────────
  const { data: coaches } = await supabase
    .from('coaches')
    .select('name, team')

  // ── Ask AI to write one-liners for each unlogged game ─────────────────────
  const gameLines = unlogged.map(g => {
    const winner = g.home_score > g.away_score ? g.home_team : g.away_team
    const loser  = g.home_score > g.away_score ? g.away_team : g.home_team
    const wScore = Math.max(g.home_score, g.away_score)
    const lScore = Math.min(g.home_score, g.away_score)
    const typeLabel = {
      national_championship:  'NATIONAL CHAMPIONSHIP',
      cfp_semifinal:          'CFP SEMIFINAL',
      cfp_quarterfinal:       'CFP QUARTERFINAL',
      cfp_first_round:        'CFP FIRST ROUND',
      conference_championship:'CONF. CHAMPIONSHIP',
      bowl:                   'BOWL GAME',
    }[g.game_type] || `WEEK ${g.week}`
    return `[${typeLabel}] ${winner} def. ${loser} ${wScore}-${lScore}${g.notes ? ' — '+g.notes : ''}`
  }).join('\n')

  const humanTeams = (coaches || []).map(c => c.team).filter(Boolean).join(', ')

  let narratives = []
  let aiError = null
  try {
    const aiRes = await anthropic.messages.create({
      model: 'claude-haiku-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `Write Dynasty Timeline entries for Season ${season} of a college football dynasty league.
Human-coached teams: ${humanTeams}

For each game, write a punchy one-sentence summary (15-25 words) capturing the drama.
Weight: 1=routine, 3=notable, 4=upset/rivalry/close, 5=championship/historic
Tags: upset, blowout, close, shutout, rivalry, bowl, cfp, championship, comeback

Games:
${gameLines}

Return ONLY a JSON array, same order as the games:
[{"title":"short headline","summary":"one sentence","weight":3,"tags":["tag"]}]`,
      }],
    })
    const raw   = aiRes.content[0].text.replace(/```json|```/g, '').trim()
    const match = raw.match(/\[[\s\S]*\]/)
    if (match) narratives = JSON.parse(match[0])
    else aiError = 'AI response was not valid JSON — using fallback titles'
  } catch (e) {
    aiError = e.message
  }

  // ── Insert into narrative_log ──────────────────────────────────────────────
  let logged  = 0
  const insertErrors = []

  for (let i = 0; i < unlogged.length; i++) {
    const g = unlogged[i]
    const n = narratives[i] || {}
    const winner    = g.home_score > g.away_score ? g.home_team : g.away_team
    const loser     = g.home_score > g.away_score ? g.away_team : g.home_team
    const wScore    = Math.max(g.home_score, g.away_score)
    const lScore    = Math.min(g.home_score, g.away_score)
    const winCoach  = (coaches || []).find(c => c.team?.toLowerCase() === winner.toLowerCase())
    const loseCoach = (coaches || []).find(c => c.team?.toLowerCase() === loser.toLowerCase())

    const row = {
      event_type:          'game',
      season:              Number(season),
      week:                g.week,
      featured_team:       winner,
      featured_coach:      winCoach?.name  || null,
      opposing_team:       loser,
      opposing_coach:      loseCoach?.name || null,
      title:               n.title   || `${winner} def. ${loser}`,
      summary:             n.summary || `${winner} defeated ${loser} ${wScore}-${lScore}.`,
      narrative_weight:    n.weight  || 3,
      momentum_tags:       n.tags    || [],
      is_season_highlight: (n.weight || 3) >= 4,
      source_id:           String(g.id),
      source_table:        'games',
      include_in_context:  true,
    }

    const { error: insertErr } = await supabase.from('narrative_log').insert(row)

    if (insertErr) {
      insertErrors.push(`Game ${g.id} (${winner} vs ${loser}): ${insertErr.message}`)
    } else {
      logged++
    }
  }

  return res.status(200).json({
    success:      insertErrors.length === 0,
    season:       Number(season),
    total:        finalGames.length,
    alreadyHad:   loggedIds.size,
    logged,
    failed:       insertErrors.length,
    insertErrors: insertErrors.length ? insertErrors : undefined,
    aiError:      aiError || undefined,
    message:      `Logged ${logged} of ${unlogged.length} new games into the Season ${season} timeline.`,
  })
}
