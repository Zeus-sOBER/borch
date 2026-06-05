/**
 * /api/finalize-season
 * ─────────────────────────────────────────────────────────────────────────────
 * Commissioner-only. Called at the end of a season to:
 *
 *  1. Find the finalized National Championship game
 *  2. Auto-create the championships table record
 *  3. Backfill narrative_log with every game from the season that isn't
 *     already logged (so the Dynasty Timeline is fully populated)
 *  4. Generate the AI season summary article (the "30-for-30")
 *  5. Advance current_season by 1 in league_settings
 *
 * POST body: { pin, season }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { logNarrativeEvent } from '../../lib/narrative'

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

  const supabase = db()
  const steps = []

  // ── 1. Load all games for the season ──────────────────────────────────────
  const { data: allGames, error: gamesErr } = await supabase
    .from('games')
    .select('*')
    .eq('season', season)
    .order('week', { ascending: true })

  if (gamesErr) return res.status(500).json({ error: gamesErr.message })
  if (!allGames?.length) return res.status(400).json({ error: `No games found for Season ${season}` })

  const finalGames = allGames.filter(g =>
    g.is_final && g.home_score != null && g.away_score != null
    && !(g.home_score === 0 && g.away_score === 0)
  )

  // ── 2. Find the National Championship game ────────────────────────────────
  const ncg = finalGames.find(g => g.game_type === 'national_championship')
    || finalGames.find(g => g.week >= 20)

  if (!ncg) {
    return res.status(400).json({
      error: 'No finalized National Championship game found. Make sure the NCG result is entered before finalizing.'
    })
  }

  const champTeam  = ncg.home_score > ncg.away_score ? ncg.home_team : ncg.away_team
  const runnerUp   = ncg.home_score > ncg.away_score ? ncg.away_team : ncg.home_team
  const champScore = Math.max(ncg.home_score, ncg.away_score)
  const loserScore = Math.min(ncg.home_score, ncg.away_score)

  // ── 3. Load coaches ───────────────────────────────────────────────────────
  const { data: coaches } = await supabase
    .from('coaches')
    .select('name, team, overall_wins, overall_losses, season_records')
    .eq('is_active', true)

  const champCoach  = (coaches || []).find(c => c.team?.toLowerCase() === champTeam.toLowerCase())
  const runnerCoach = (coaches || []).find(c => c.team?.toLowerCase() === runnerUp.toLowerCase())

  const champRecord = (() => {
    const sr = champCoach?.season_records?.find(r => Number(r.season) === Number(season))
    return sr ? `${sr.wins}-${sr.losses}` : (champCoach ? `${champCoach.overall_wins}-${champCoach.overall_losses}` : null)
  })()

  // ── 4. Upsert championship record ──────────────────────────────────────────
  const { error: champErr } = await supabase
    .from('championships')
    .upsert({
      season,
      team_name:        champTeam,
      coach_name:       champCoach?.name || null,
      record:           champRecord,
      opponent_team:    runnerUp,
      opponent_record:  (() => {
        const sr = runnerCoach?.season_records?.find(r => Number(r.season) === Number(season))
        return sr ? `${sr.wins}-${sr.losses}` : null
      })(),
      result:           `${champScore}-${loserScore}`,
      championship_type: 'national',
      notes:            ncg.notes || null,
    }, { onConflict: 'season,championship_type' })

  if (champErr) {
    steps.push({ step: 'championship_record', ok: false, error: champErr.message })
  } else {
    steps.push({ step: 'championship_record', ok: true, champion: champTeam, coach: champCoach?.name })
  }

  // ── 5. Backfill narrative_log for every game not yet logged ────────────────
  // Check which game IDs are already in the log so we don't duplicate
  const { data: existingLogs } = await supabase
    .from('narrative_log')
    .select('source_id')
    .eq('season', season)
    .eq('source_table', 'games')

  const loggedIds = new Set((existingLogs || []).map(r => String(r.source_id)))
  const unloggedGames = finalGames.filter(g => !loggedIds.has(String(g.id)))

  // Build compact game summaries for the AI to narrate
  const gameLines = unloggedGames.map(g => {
    const winner = g.home_score > g.away_score ? g.home_team : g.away_team
    const loser  = g.home_score > g.away_score ? g.away_team : g.home_team
    const wScore = Math.max(g.home_score, g.away_score)
    const lScore = Math.min(g.home_score, g.away_score)
    const margin = wScore - lScore
    const typeLabel = g.game_type === 'national_championship' ? 'NATIONAL CHAMPIONSHIP'
      : g.game_type === 'cfp_semifinal' ? 'CFP SEMIFINAL'
      : g.game_type === 'cfp_quarterfinal' ? 'CFP QUARTERFINAL'
      : g.game_type === 'cfp_first_round' ? 'CFP FIRST ROUND'
      : g.game_type === 'conference_championship' ? 'CONF. CHAMPIONSHIP'
      : g.game_type === 'bowl' ? 'BOWL GAME'
      : `WEEK ${g.week}`
    return `[${typeLabel}] ${winner} def. ${loser} ${wScore}-${lScore} (margin: ${margin})${g.notes ? ' — ' + g.notes : ''}`
  }).join('\n')

  let timelineLogged = 0

  if (unloggedGames.length > 0) {
    // Ask AI to write a one-line dramatic summary for each game
    const narrativePrompt = `You are generating Dynasty Timeline entries for Season ${season} of a college football dynasty league.

For each game below, write a single punchy sentence (15-25 words) that captures the drama of the result.
Focus on: blowouts, upsets, close games, postseason significance, shutouts.
Identify which teams are "user-coached" from this list: ${(coaches || []).map(c => c.team).join(', ')}.

Games (one per line):
${gameLines}

Return ONLY a JSON array, one entry per game, in the same order:
[
  { "title": "short headline", "summary": "one dramatic sentence", "weight": 1-5, "tags": ["tag1"] }
]

Weight guide: 1=routine, 3=notable, 4=big upset or rivalry, 5=championship/historic
Tags options: upset, blowout, close, shutout, rivalry, bowl, cfp, championship, comeback`

    let narrativeError = null
    try {
      const aiRes = await anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 3000,
        messages: [{ role: 'user', content: narrativePrompt }],
      })

      const raw = aiRes.content[0].text.replace(/```json|```/g, '').trim()
      const match = raw.match(/\[[\s\S]*\]/)
      if (!match) throw new Error('AI did not return valid JSON array')

      const narratives = JSON.parse(match[0])
      const insertErrors = []

      for (let i = 0; i < unloggedGames.length; i++) {
        const g = unloggedGames[i]
        const n = narratives[i] || {}
        const winner = g.home_score > g.away_score ? g.home_team : g.away_team
        const loser  = g.home_score > g.away_score ? g.away_team : g.home_team
        const winCoach  = (coaches || []).find(c => c.team?.toLowerCase() === winner.toLowerCase())
        const loseCoach = (coaches || []).find(c => c.team?.toLowerCase() === loser.toLowerCase())

        const { error: insertErr } = await supabase.from('narrative_log').insert({
          event_type:          'game',
          season:              Number(season),
          week:                g.week,
          featured_team:       winner,
          featured_coach:      winCoach?.name || null,
          opposing_team:       loser,
          opposing_coach:      loseCoach?.name || null,
          title:               n.title || `${winner} def. ${loser}`,
          summary:             n.summary || `${winner} defeated ${loser} ${Math.max(g.home_score,g.away_score)}-${Math.min(g.home_score,g.away_score)}.`,
          narrative_weight:    n.weight || 3,
          momentum_tags:       n.tags || [],
          is_season_highlight: (n.weight || 3) >= 4,
          source_id:           String(g.id),
          source_table:        'games',
          include_in_context:  true,
        })

        if (insertErr) {
          insertErrors.push(`game ${g.id}: ${insertErr.message}`)
        } else {
          timelineLogged++
        }
      }

      if (insertErrors.length) narrativeError = insertErrors.join(' | ')
    } catch (e) {
      narrativeError = e.message
      console.error('[finalize-season] narrative backfill error:', e.message)
    }
  }

  steps.push({ step: 'timeline_backfill', ok: !narrativeError, logged: timelineLogged, alreadyExisted: loggedIds.size, error: narrativeError || undefined })

  // ── 6. Generate season summary article (the "30-for-30") ──────────────────
  let summaryTitle = null
  try {
    const { data: standings } = await supabase
      .from('teams')
      .select('name, wins, losses')
      .order('wins', { ascending: false })

    const humanTeams = new Set((coaches || []).map(c => c.team?.toLowerCase()).filter(Boolean))
    const standingStr = (standings || [])
      .filter(t => humanTeams.has(t.name?.toLowerCase()))
      .map((t, i) => {
        const c = (coaches || []).find(co => co.team?.toLowerCase() === t.name?.toLowerCase())
        return `#${i+1} ${t.name} (${t.wins}-${t.losses})${c ? ' — ' + c.name : ''}`
      }).join('\n')

    const gamesSummary = finalGames.map(g => {
      const winner = g.home_score > g.away_score ? g.home_team : g.away_team
      const loser  = g.home_score > g.away_score ? g.away_team : g.home_team
      return `Wk${g.week} ${g.game_type !== 'regular' ? '['+g.game_type+'] ' : ''}${winner} def. ${loser} ${Math.max(g.home_score,g.away_score)}-${Math.min(g.home_score,g.away_score)}`
    }).join('\n')

    const summaryPrompt = `You are writing the official Season ${season} retrospective for a college football dynasty league called Dynasty Universe.

This is the permanent historical record — the "30-for-30" document future coaches will read for years.

CHAMPION: ${champTeam} (Coach: ${champCoach?.name || 'unknown'}, Record: ${champRecord || '?'})
  def. ${runnerUp} ${champScore}-${loserScore} in the National Championship

COACHES THIS SEASON:
${(coaches || []).map(c => {
  const sr = c.season_records?.find(r => Number(r.season) === Number(season))
  return `${c.name} — ${c.team}${sr ? ` (${sr.wins}-${sr.losses})` : ''}`
}).join('\n')}

FINAL STANDINGS (user-coached teams):
${standingStr || 'Unavailable'}

ALL RESULTS THIS SEASON:
${gamesSummary}

Write 600-900 words. Include:
- A bold opening headline
- Dramatic opening sentence
- Early season overview
- Key storylines and turning points
- Postseason journey to the championship
- The championship game itself
- Final reflections and setup for next season
- Tone: ESPN 30-for-30 documentary narrator — cinematic, earned, factual`

    const aiSummary = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: summaryPrompt }],
    })

    const summaryText = aiSummary.content[0].text
    const headline = summaryText.split('\n').find(l => l.trim())?.replace(/^#+\s*|\*+/g, '').trim().substring(0, 150)
      || `Season ${season} — The Dynasty Chronicle`

    await supabase.from('articles').insert({
      article_type: 'season-summary',
      week:         null,
      title:        headline,
      content:      summaryText,
      edited_by:    'commissioner',
    })

    // Log as a top-weight lore entry so it appears in the Timeline → Lore tab
    const { error: loreErr } = await supabase.from('narrative_log').insert({
      event_type:          'lore',
      season:              Number(season),
      week:                99,
      featured_team:       champTeam,
      featured_coach:      champCoach?.name || null,
      title:               `Season ${season} Chronicle — ${champTeam}`,
      summary:             `${champTeam} claimed the Season ${season} national championship. Full season retrospective now available.`,
      content:             summaryText,
      narrative_weight:    5,
      momentum_tags:       ['championship', 'season-end', 'lore'],
      is_season_highlight: true,
      include_in_context:  true,
    })
    if (loreErr) {
      console.error('[finalize-season] lore insert error:', loreErr.message)
      steps.push({ step: 'lore_insert', ok: false, error: loreErr.message })
    }

    summaryTitle = headline
    steps.push({ step: 'season_summary', ok: true, title: headline })
  } catch (e) {
    steps.push({ step: 'season_summary', ok: false, error: e.message })
  }

  // ── 7. Advance current_season ──────────────────────────────────────────────
  const nextSeason = Number(season) + 1
  const { error: settingsErr } = await supabase
    .from('league_settings')
    .update({ current_season: nextSeason, current_week: 0 })
    .eq('id', 1)

  steps.push({
    step: 'advance_season',
    ok: !settingsErr,
    from: Number(season),
    to: nextSeason,
    error: settingsErr?.message,
  })

  return res.status(200).json({
    success: true,
    champion: champTeam,
    coach: champCoach?.name,
    score: `${champScore}-${loserScore}`,
    summaryTitle,
    nextSeason,
    steps,
  })
}
