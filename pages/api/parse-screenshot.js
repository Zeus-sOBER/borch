import { getDriveImageBase64 } from '../../lib/drive'
import { supabaseAdmin } from '../../lib/supabase'

const PROMPTS = {
  standings: `You are parsing an EA Sports CFB 26 online dynasty standings screenshot. Extract every team visible. Return ONLY valid JSON, no explanation, no markdown:
{"teams":[{"name":"Team Name","coach":"Coach Name or Unknown","wins":0,"losses":0,"pts":0,"ptsAgainst":0,"streak":"W1","rank":1}]}`,

  scores: `You are parsing an EA Sports CFB 26 dynasty scores or schedule screenshot. Extract every game visible. Return ONLY valid JSON, no explanation, no markdown:
{"scores":[{"week":1,"home":"Team A","homeScore":28,"away":"Team B","awayScore":14,"status":"Final"}]}
For upcoming/unplayed games use null for scores and status "Upcoming".`,

  player_stats: `You are parsing an EA Sports CFB 26 player stats screenshot. Extract every player visible. Return ONLY valid JSON, no explanation, no markdown:
{"players":[{"name":"Player Name","team":"Team Name","pos":"QB","stats":{"pass_yds":0,"pass_td":0,"int":0,"rush_yds":0}}]}
For RBs use rush_yds,rush_td,rec,rec_yds. For WRs use rec,rec_yds,rec_td. Include only stats actually visible.`,
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { fileId, mimeType, dataType, fileName } = req.body
  if (!fileId || !dataType) return res.status(400).json({ error: 'fileId and dataType required' })

  try {
    const { base64, mediaType } = await getDriveImageBase64(fileId, mimeType)

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text: PROMPTS[dataType] },
          ],
        }],
      }),
    })

    const claudeData = await claudeRes.json()
    const text = claudeData.content?.map(c => c.text || '').join('') || ''
    const cleaned = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    const db = supabaseAdmin()
    const season = 1
    const now = new Date().toISOString()

    if (dataType === 'standings' && parsed.teams) {
      for (const team of parsed.teams) {
        await db.from('teams').upsert({
          name: team.name, coach: team.coach,
          wins: team.wins, losses: team.losses,
          pts: team.pts, pts_against: team.ptsAgainst,
          streak: team.streak, rank: team.rank,
          season, updated_at: now,
        }, { onConflict: 'name,season' })
      }
    }

    if (dataType === 'scores' && parsed.scores) {
      for (const game of parsed.scores) {
        await db.from('games').insert({
          week: game.week, home_team: game.home, home_score: game.homeScore,
          away_team: game.away, away_score: game.awayScore,
          status: game.status, season, source_file: fileName, created_at: now,
        })
      }
    }

    if (dataType === 'player_stats' && parsed.players) {
      for (const player of parsed.players) {
        await db.from('players').upsert({
          name: player.name, team: player.team, pos: player.pos,
          stats: player.stats, season, updated_at: now,
        }, { onConflict: 'name,season' })
      }
    }

    await db.from('scan_log').insert({
      file_id: fileId, file_name: fileName, data_type: dataType,
      records_parsed: Object.values(parsed)[0]?.length || 0,
      created_at: now,
    })

    res.status(200).json({ success: true, data: parsed })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
