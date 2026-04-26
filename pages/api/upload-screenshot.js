/**
 * /api/upload-screenshot — Direct image upload
 * Accepts base64 image data, stores it, and forwards to parse-screenshot logic.
 * This replaces the need for Google Drive for screenshot uploads.
 *
 * AP Poll two-screenshot support:
 *   Each upload UPSERTS rankings by season+rank — so uploading screenshot 1
 *   (ranks 1-14) and screenshot 2 (ranks 15-25) both survive: the second upload
 *   fills in the missing ranks rather than wiping the first batch.
 */
export const config = { api: { bodyParser: { sizeLimit: '10mb' } } }

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { logNarrativeEvent, analyzeGame } from '../../lib/narrative'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function extractJson(rawText) {
  const stripped = rawText.replace(/```json|```/g, '').trim()
  const match = stripped.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON object found in AI response')
  return JSON.parse(match[0])
}

// Shared AP poll parse prompt — mirrors the logic in parse-screenshot.js
const AP_POLL_PARSE_PROMPT = `You are parsing an EA Sports CFB 26 AP Top 25 poll screenshot.

Extract EVERY row visible. Return ONLY valid JSON, no markdown.

IMPORTANT name rules:
- "Miami University" = the Ohio school (Miami OH / RedHawks). Keep as "Miami University".
- "University of Miami" / "Miami FL" / "Miami (FL)" = the Florida school. Use just "Miami".
- Strip vote counts from team names: "UTSA (28)" → team_name = "UTSA"

Return this exact shape:
{
  "type": "ap_poll",
  "season": <season number if visible, else 1>,
  "summary": "AP Top 25 — ranks X-Y",
  "rankings": [
    {
      "rank": 1,
      "lw": 1,
      "team_name": "Miami University",
      "record": "3-0",
      "points": 1602,
      "last_week_result": "W 31-16 vs 12 Alabama",
      "this_week": "at Kansas"
    }
  ]
}

Fields:
- rank: current rank number (the RANK column)
- lw: last week rank (the LW column), null if not shown
- team_name: school name (strip vote counts in parentheses)
- record: W-L string e.g. "3-0"
- points: integer poll points (PTS column)
- last_week_result: text from LAST WEEK column, null if blank
- this_week: text from THIS WEEK column, null if blank`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { imageData, mimeType, fileName, preview, typeHint } = req.body || {}
  if (!imageData) return res.status(400).json({ error: 'imageData (base64) is required' })

  const db = getDb()

  try {
    // Step 1: Determine type — use typeHint if provided, otherwise auto-detect
    let detectedType = typeHint || null
    if (!detectedType) {
      const detectResponse = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/png', data: imageData } },
            { type: 'text', text: 'What type of EA Sports College Football 26 screen is this? Respond with ONLY one word: standings, scores, stats, schedule, ap_poll, team_stats, heisman, championship, recruiting, or unknown.' },
          ],
        }],
      })
      detectedType = (detectResponse.content[0]?.text || 'unknown').trim().toLowerCase()
    }

    // Step 2: Parse the screenshot based on type
    const { data: coaches } = await db.from('coaches').select('*')
    const coachList = (coaches || []).map(c => `${c.name} (${c.team})`).join(', ') || 'No coaches yet'
    const { data: settings } = await db.from('league_settings').select('current_week, current_season').eq('id', 1).single()
    const currentWeek   = settings?.current_week   ?? 0
    const currentSeason = settings?.current_season ?? 1

    // Use the dedicated AP poll prompt for that type, generic prompt for everything else
    const parsePromptText = detectedType === 'ap_poll'
      ? AP_POLL_PARSE_PROMPT
      : `You are parsing an EA Sports CFB 26 dynasty screenshot. Detected type: ${detectedType}.
Human coaches in this league: ${coachList}
Current week: ${currentWeek}, Season: ${currentSeason}

Extract ALL data visible on screen. Return ONLY valid JSON (no markdown, no explanation).

For standings: { "type": "standings", "summary": "...", "standings": [{ "team_name": "...", "wins": 0, "losses": 0, "pts": 0, "pts_against": 0, "conference": "..." }] }
For scores: { "type": "scores", "summary": "...", "week": ${currentWeek}, "games": [{ "home_team": "...", "away_team": "...", "home_score": 0, "away_score": 0, "is_final": true }] }
For stats: { "type": "stats", "summary": "...", "players": [{ "name": "...", "team": "...", "pos": "QB/RB/WR", "stats": { "pass_yds": 0, "pass_td": 0, "rush_yds": 0, "rush_td": 0, "rec_yds": 0, "rec_td": 0 } }] }
For other types, use the most appropriate structure above.`

    const parseResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/png', data: imageData } },
          { type: 'text', text: parsePromptText },
        ],
      }],
    })

    const parsed = extractJson(parseResponse.content[0]?.text || '{}')

    // If preview mode, return parsed data without saving
    if (preview) {
      return res.status(200).json({
        success: true,
        preview: true,
        detectedType: parsed.type || detectedType,
        data: parsed,
        summary: parsed.summary || `Detected ${parsed.type || detectedType} — ${
          parsed.rankings?.length ? `${parsed.rankings.length} teams (ranks ${parsed.rankings[0]?.rank}–${parsed.rankings[parsed.rankings.length-1]?.rank})` :
          parsed.standings?.length ? `${parsed.standings.length} teams` :
          parsed.games?.length ? `${parsed.games.length} games` : 'ready to save'
        }`,
      })
    }

    // Step 3: Save to database
    let saved = { total: 0 }

    // ── AP POLL (upsert by season+rank — safe for two-screenshot uploads) ──
    if ((parsed.type === 'ap_poll') && parsed.rankings?.length) {
      const season = parsed.season ?? currentSeason
      // UPSERT (not delete+insert) so a second screenshot fills in missing ranks
      // instead of wiping the first batch
      for (const e of parsed.rankings) {
        if (!e.team_name || e.rank == null) continue
        await db.from('ap_rankings').upsert({
          season,
          rank:             e.rank,
          lw:               e.lw               ?? null,
          team_name:        e.team_name,
          record:           e.record           ?? null,
          points:           e.points           ?? null,
          last_week_result: e.last_week_result ?? null,
          this_week:        e.this_week        ?? null,
          updated_at:       new Date().toISOString(),
        }, { onConflict: 'season,rank' })
        saved.total++
      }
      saved.rankings = saved.total
      // Stamp the updated_at on league_settings so the "Updated on" header stays current
      await db.from('league_settings').upsert({
        id: 1, ap_poll_updated_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
    }

    // ── STANDINGS ──
    if (parsed.type === 'standings' && parsed.standings?.length) {
      for (const team of parsed.standings) {
        await db.from('teams').upsert({
          team_name: team.team_name, name: team.team_name,
          wins: team.wins, losses: team.losses,
          pts: team.pts || 0, pts_against: team.pts_against || 0,
          conference: team.conference, season: currentSeason,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'team_name,season' })
      }
      saved.standings = parsed.standings.length
      saved.total += parsed.standings.length
    }

    // ── SCORES ──
    if (parsed.type === 'scores' && parsed.games?.length) {
      for (const game of parsed.games) {
        await db.from('games').upsert({
          week: parsed.week || currentWeek,
          home_team: game.home_team, away_team: game.away_team,
          home_score: game.home_score, away_score: game.away_score,
          is_final: game.is_final ?? true, status: game.is_final ? 'Final' : 'Scheduled',
          season: currentSeason,
        }, { onConflict: 'season,week,home_team,away_team' })

        if (game.is_final && game.home_score != null) {
          const analysis = analyzeGame(game, coaches || [])
          await logNarrativeEvent({
            event_type: 'game', season: currentSeason, week: parsed.week || currentWeek,
            featured_coach: analysis.featuredCoach, featured_team: analysis.winner,
            opposing_coach: analysis.opposingCoach, opposing_team: analysis.loser,
            title: `${analysis.winner} ${analysis.winnerScore} - ${analysis.loser} ${analysis.loserScore}`,
            summary: `Week ${parsed.week || currentWeek}: ${analysis.winner} defeats ${analysis.loser}`,
            narrative_weight: analysis.weight, momentum_tags: analysis.tags,
          })
        }
      }
      saved.games = parsed.games.length
      saved.total += parsed.games.length
    }

    // ── STATS ──
    if (parsed.type === 'stats' && parsed.players?.length) {
      for (const p of parsed.players) {
        await db.from('players').upsert({
          name: p.name, team: p.team, pos: p.pos,
          stats: p.stats || {}, season: currentSeason,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'name,season' })
      }
      saved.players = parsed.players.length
      saved.total += parsed.players.length
    }

    // Log the scan
    await db.from('scan_log').insert({
      file_name: fileName || 'direct-upload',
      data_type: parsed.type || detectedType,
      records_parsed: saved.total,
    })

    res.status(200).json({
      success: true,
      detectedType: parsed.type || detectedType,
      summary: parsed.summary || `Saved ${saved.total} records`,
      saved,
    })
  } catch (error) {
    console.error('[upload-screenshot] Error:', error)
    res.status(500).json({ error: 'Failed to process screenshot', details: error.message })
  }
}
