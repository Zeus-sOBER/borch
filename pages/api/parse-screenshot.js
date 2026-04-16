import { getDriveImageBase64 } from '../../lib/drive'
import { supabaseAdmin } from '../../lib/supabase'

const PROMPTS = {
  // Added logic to enforce realistic CFB season win/loss totals
  standings: `You are parsing an EA Sports CFB 26 online dynasty standings screenshot. 
  Extract every team visible. Return ONLY valid JSON.
  LOGIC RULES: 
  1. Total games (wins + losses) should typically be between 0 and 16. 
  2. If a number looks like '60' but the team is 6-0, use 6 and 0.
  
  {"teams":[{"name":"Team Name","coach":"Coach Name or Unknown","wins":0,"losses":0,"pts":0,"ptsAgainst":0,"streak":"W1","rank":1}]}`,

  scores: `You are parsing an EA Sports CFB 26 dynasty scores or schedule screenshot. 
  Extract every game visible. Return ONLY valid JSON.
  LOGIC RULES:
  1. Scores are usually increments of 2, 3, 6, 7, or 8. 
  2. A score over 100 is highly unlikely; verify OCR accuracy if seen.
  
  {"scores":[{"week":1,"home":"Team A","homeScore":28,"away":"Team B","awayScore":14,"status":"Final"}]}
  For upcoming/unplayed games use null for scores and status "Upcoming".`,

  player_stats: `You are parsing an EA Sports CFB 26 player stats screenshot. 
  Extract every player visible. Return ONLY valid JSON.
  LOGIC RULES:
  1. Passing yards for a single game rarely exceed 600.
  2. Passing TDs rarely exceed 7.
  
  {"players":[{"name":"Player Name","team":"Team Name","pos":"QB","stats":{"pass_yds":0,"pass_td":0,"int":0,"rush_yds":0}}]}
  For RBs use rush_yds,rush_td,rec,rec_yds. For WRs use rec,rec_yds,rec_td.`,

  // NEW: Championship History Parsing
  championships: `You are parsing a "National Champions" history screen from EA Sports CFB 26.
  Extract the year and the winning team. Return ONLY valid JSON.
  
  {"championships":[{"year":2025,"team":"Georgia","score":"34-21","runnerUp":"Ohio State"}]}`
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
        // System instruction provides the "Football Context" guardrails
        system: "You are a specialized OCR assistant for College Football video games. You understand that a season is short (approx 12-16 games), scores are usually under 70, and team names are American universities.",
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

    // ... [Previous logic for standings, scores, and player_stats remains the same] ...

    // NEW: Database logic for Championships
    if (dataType === 'championships' && parsed.championships) {
      for (const champ of parsed.championships) {
        await db.from('championship_history').upsert({
          year: champ.year,
          winner: champ.team,
          score: champ.score,
          runner_up: champ.runnerUp,
          updated_at: now,
        }, { onConflict: 'year' })
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