/**
 * /api/sync-sheet
 *
 * Called by the Google Apps Script trigger installed in the Dynasty Schedule
 * spreadsheet. Fires automatically whenever the sheet is edited or saved.
 *
 * Request body (POST):
 *   { secret: string, spreadsheetId?: string, gid?: string|number }
 *
 * The `secret` must match SHEET_SYNC_SECRET in your env vars.
 * spreadsheetId and gid default to the values in DYNASTY_SHEET_ID / DYNASTY_SHEET_GID.
 *
 * Required env vars:
 *   SHEET_SYNC_SECRET          — shared secret set in Apps Script too
 *   DYNASTY_SHEET_ID           — Google Sheets file ID
 *   DYNASTY_SHEET_GID          — numeric gid of the schedule tab (e.g. 482403615)
 *   NEXT_PUBLIC_APP_URL        — full URL of this app (e.g. https://yourapp.vercel.app)
 *   GOOGLE_SERVICE_ACCOUNT_JSON
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   ANTHROPIC_API_KEY
 */

import { fetchSheetTabAsCsv } from '../../lib/drive'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SPREADSHEET_ID = process.env.DYNASTY_SHEET_ID || '1tLDA6wPZZWe9B45fDTRL0YV4sf_TEibwyKvHoDm2Nzg'
const SHEET_GID      = process.env.DYNASTY_SHEET_GID || '482403615'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // ── Authenticate the webhook ──────────────────────────────────────────────
  const { secret, spreadsheetId, gid } = req.body || {}
  const expectedSecret = process.env.SHEET_SYNC_SECRET
  if (!expectedSecret || secret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const sheetId = spreadsheetId || SPREADSHEET_ID
  const sheetGid = gid != null ? gid : SHEET_GID

  try {
    // ── 1. Fetch coaches + league settings ───────────────────────────────────
    const [{ data: coaches }, { data: leagueSettings }] = await Promise.all([
      supabase.from('coaches').select('*'),
      supabase.from('league_settings').select('current_week, current_season').eq('id', 1).single(),
    ])
    const humanTeams = (coaches || []).map(c => c.team).filter(Boolean)
    const currentSeason = leagueSettings?.current_season ?? 1

    // ── 2. Read the spreadsheet ───────────────────────────────────────────────
    const csvText = await fetchSheetTabAsCsv(sheetId, sheetGid)

    if (!csvText || csvText.trim().length === 0) {
      return res.status(200).json({ success: true, message: 'Sheet is empty — nothing to parse' })
    }

    // ── 3. Parse with AI ──────────────────────────────────────────────────────
    const coachList = (coaches || []).map(c => `${c.name} (${c.team})`).join(', ') || 'No coaches loaded yet'
    const parsedResult = await parseScheduleSheet(csvText, coaches || [], humanTeams, coachList)

    // ── 4. Save to Supabase ───────────────────────────────────────────────────
    const saveResult = await saveGames(parsedResult.games || [], currentSeason)

    // ── 5. Log the sync ───────────────────────────────────────────────────────
    await supabase.from('scan_log').insert({
      file_id:        sheetId,
      file_name:      'Dynasty_Schedule_Template (auto-sync)',
      data_type:      'schedule',
      records_parsed: saveResult.upserted,
    })

    return res.status(200).json({
      success:  true,
      summary:  parsedResult.summary,
      upserted: saveResult.upserted,
      errors:   saveResult.errors,
    })

  } catch (err) {
    console.error('[sync-sheet] error:', err)
    await supabase.from('scan_log').insert({
      file_id:        sheetId,
      file_name:      'Dynasty_Schedule_Template (auto-sync)',
      data_type:      'error',
      records_parsed: 0,
    }).catch(() => {})
    return res.status(500).json({ error: 'Sync failed', details: err.message })
  }
}

// ─── AI Parser ────────────────────────────────────────────────────────────────
async function parseScheduleSheet(csvText, coaches, humanTeams, coachList) {
  const prompt = `You are importing a college football dynasty league schedule/results from a spreadsheet.

HUMAN COACHES IN THIS LEAGUE: ${coachList}
HUMAN-COACHED TEAMS: ${humanTeams.join(', ') || 'unknown'}

The spreadsheet may contain BOTH upcoming scheduled games AND completed games with scores.
Handle both types:

TYPE 1 — COMPLETED GAME (has a score anywhere in the row — Notes column, Score column, or inline):
  Examples of score indicators: "70-3 Alabama Win", "50-24", "W 21-7", "Alabama 70, USF 3"
  - Set "is_final": true
  - Parse the score carefully. The format is usually "WinnerScore-LoserScore WinnerName Win"
  - Determine which team won, then assign:
    - If home_team won: home_score = higher number, away_score = lower number
    - If away_team won: away_score = higher number, home_score = lower number
  - Always double-check: the winner's score should be HIGHER than the loser's score

TYPE 2 — UPCOMING GAME (no score present):
  - Set "is_final": false
  - Set "home_score": null, "away_score": null

SKIP these rows entirely:
  - Section header rows like "WEEK 3 — EARLY SEASON", "WEEK 14 — CONF. CHAMPIONSHIPS"
  - Empty rows (no team names)
  - Rows with only "BYE WEEK" in Opponent Type

SPREADSHEET CSV CONTENT:
---
${csvText.substring(0, 14000)}
---

Return ONLY a JSON object (no markdown, no explanation):
{
  "type": "schedule",
  "summary": "Imported X scheduled games and Y completed results",
  "games": [
    {
      "home_team": "Team Name",
      "away_team": "Team Name",
      "week": 1,
      "is_final": true,
      "home_score": 70,
      "away_score": 3,
      "game_type": "regular",
      "notes": "Rivalry Game"
    }
  ]
}

Rules:
- "game_type" must be one of: "regular", "conference_championship", "bowl", "cfp_quarterfinal", "cfp_semifinal", "national_championship"
- Week 14 = "conference_championship", weeks 15-18 = playoff/bowl
- Include ALL game rows, not just human-team games
- Week 0 is valid — keep it as 0
- Be precise with scores — a 70-3 score means the winner had 70 points, loser had 3
- "notes": copy any text from Notes / Bowl Game Name column verbatim. Set null if empty.
TEAM NAME RULES:
- "University of Miami" = "Miami"
- "Miami University" = "Miami (OH)"
- "Miami FL", "Miami (FL)", "U of Miami" = "Miami"
- Use clean standard names — no "University of X" prefix forms`

  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-20250514',
    max_tokens: 6000,
    messages:   [{ role: 'user', content: prompt }],
  })

  const text   = response.content[0].text.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(text)
  parsed.source = 'sheet_auto_sync'
  return parsed
}

// ─── Save / upsert games ──────────────────────────────────────────────────────
// Fetches all existing games for the season upfront, then matches locally
// using normalized team names. This avoids the fragile PostgREST .or(ilike)
// syntax that breaks on team names with spaces or parentheses (e.g. "Miami (OH)").
async function saveGames(games, season) {
  if (!games || games.length === 0) return { upserted: 0, errors: 0 }

  // Fetch all existing games for this season in one query
  const { data: existingGames } = await supabase
    .from('games')
    .select('id, week, home_team, away_team, is_final')
    .eq('season', season)

  // Build a lookup map: "week|teamA|teamB" → row (teams sorted so order doesn't matter)
  const norm  = (s) => (s || '').toLowerCase().trim()
  const makeKey = (week, t1, t2) => `${week}|${[norm(t1), norm(t2)].sort().join('|')}`

  const existingMap = {}
  for (const row of existingGames || []) {
    existingMap[makeKey(row.week, row.home_team, row.away_team)] = row
  }

  let upserted = 0
  let errors   = 0

  for (const game of games) {
    if (!game.home_team || !game.away_team) continue

    const week    = game.week ?? 0
    const key     = makeKey(week, game.home_team, game.away_team)
    const existing = existingMap[key]

    // Never overwrite a finalized game with a non-final (scheduled) row
    if (existing?.is_final && !game.is_final) {
      upserted++
      continue
    }

    const row = {
      season,
      week,
      home_team:  game.home_team,
      away_team:  game.away_team,
      home_score: game.is_final ? (game.home_score ?? null) : null,
      away_score: game.is_final ? (game.away_score ?? null) : null,
      is_final:   !!game.is_final,
      status:     game.is_final ? 'Final' : 'Scheduled',
      game_type:  game.game_type || 'regular',
      notes:      game.notes || null,
    }

    let err
    if (existing) {
      ;({ error: err } = await supabase.from('games').update(row).eq('id', existing.id))
    } else {
      ;({ error: err } = await supabase.from('games').upsert(
        { ...row },
        { onConflict: 'home_team,away_team,week,season' }
      ))
    }

    if (err) {
      console.error('[sync-sheet] game save error:', err.message, row)
      errors++
    } else {
      upserted++
    }
  }

  return { upserted, errors }
}
