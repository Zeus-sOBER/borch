/**
 * /api/upload-screenshot — Direct image upload
 * Accepts base64 image data, stores it, and forwards to parse-screenshot logic.
 * This replaces the need for Google Drive for screenshot uploads.
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { imageData, mimeType, fileName, preview } = req.body || {}
  if (!imageData) return res.status(400).json({ error: 'imageData (base64) is required' })

  const db = getDb()

  try {
    // Step 1: Auto-detect what type of screenshot this is
    const detectResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/png', data: imageData } },
          { type: 'text', text: 'What type of EA Sports College Football 26 screen is this? Respond with ONLY one word: standings, scores, stats, schedule, ap_poll, team_stats, heisman, championship, recruiting, or unknown.' },
        ],
      }],
    })

    const detectedType = (detectResponse.content[0]?.text || 'unknown').trim().toLowerCase()

    // Step 2: Parse the screenshot based on detected type
    const { data: coaches } = await db.from('coaches').select('*')
    const humanTeams = (coaches || []).map(c => c.team).filter(Boolean)
    const coachList = (coaches || []).map(c => `${c.name} (${c.team})`).join(', ') || 'No coaches yet'
    const { data: settings } = await db.from('league_settings').select('current_week, current_season').eq('id', 1).single()
    const currentWeek = settings?.current_week ?? 0
    const currentSeason = settings?.current_season ?? 1

    const parseResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType || 'image/png', data: imageData } },
          { type: 'text', text: `You are parsing an EA Sports CFB 26 dynasty screenshot. Detected type: ${detectedType}.
Human coaches in this league: ${coachList}
Current week: ${currentWeek}, Season: ${currentSeason}

Extract ALL data visible on screen. Return ONLY valid JSON (no markdown, no explanation).

For standings: { "type": "standings", "summary": "...", "standings": [{ "team_name": "...", "wins": 0, "losses": 0, "pts": 0, "pts_against": 0, "conference": "..." }] }
For scores: { "type": "scores", "summary": "...", "week": ${currentWeek}, "games": [{ "home_team": "...", "away_team": "...", "home_score": 0, "away_score": 0, "is_final": true }] }
For stats: { "type": "stats", "summary": "...", "players": [{ "name": "...", "team": "...", "pos": "QB/RB/WR", "stats": { "pass_yds": 0, "pass_td": 0, "rush_yds": 0, "rush_td": 0, "rec_yds": 0, "rec_td": 0 } }] }
For other types, use the most appropriate structure above.` },
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
        summary: parsed.summary || `Detected ${parsed.type || detectedType} screenshot`,
      })
    }

    // Step 3: Save to database
    let saved = { total: 0 }

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
      saved.total = parsed.standings.length
    }

    if (parsed.type === 'scores' && parsed.games?.length) {
      for (const game of parsed.games) {
        await db.from('games').upsert({
          week: parsed.week || currentWeek,
          home_team: game.home_team, away_team: game.away_team,
          home_score: game.home_score, away_score: game.away_score,
          is_final: game.is_final ?? true, status: game.is_final ? 'Final' : 'Scheduled',
          season: currentSeason,
        }, { onConflict: 'season,week,home_team,away_team' })

        // Narrative logging for final games
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
      saved.total = parsed.games.length
    }

    if (parsed.type === 'stats' && parsed.players?.length) {
      for (const p of parsed.players) {
        await db.from('players').upsert({
          name: p.name, team: p.team, pos: p.pos,
          stats: p.stats || {}, season: currentSeason,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'name,season' })
      }
      saved.players = parsed.players.length
      saved.total = parsed.players.length
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
