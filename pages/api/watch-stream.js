export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { channelName, currentGameContext } = req.body
  if (!channelName) return res.status(400).json({ error: 'channelName required' })

  try {
    const twitchToken = await getTwitchToken()
    const streamData  = await getStreamData(channelName, twitchToken)

    if (!streamData) {
      return res.status(200).json({ live: false, message: `${channelName} is not currently live.` })
    }

    const thumbUrl = streamData.thumbnail_url
      .replace('{width}', '1280')
      .replace('{height}', '720')

    const imgRes    = await fetch(thumbUrl)
    const imgBuffer = await imgRes.arrayBuffer()
    const base64    = Buffer.from(imgBuffer).toString('base64')

    const contextBlock = currentGameContext
      ? `\n\nCurrent known game context:\n${JSON.stringify(currentGameContext, null, 2)}`
      : ''

    const prompt = `You are an AI analyst watching a live EA Sports College Football 26 dynasty stream on Twitch. Analyze this screenshot carefully.

Extract EVERYTHING you can see relevant to a dynasty universe. Return ONLY valid JSON — no explanation, no markdown fences.

Return this exact structure (use null for fields you cannot determine):
{
  "isGameScreen": true,
  "screenType": "gameplay|scoreboard|stats|recruiting|halftime|postgame|menu|cutscene|other",
  "game": {
    "homeTeam": null, "awayTeam": null,
    "homeScore": 0, "awayScore": 0,
    "quarter": null, "timeRemaining": null,
    "possession": null, "down": null, "yardsToGo": 0, "yardLine": 0
  },
  "lastPlay": { "description": null, "yardsGained": 0, "isScoring": false, "isTurnover": false },
  "playerStats": [{ "name": "Player Name", "team": "Team", "pos": "QB", "stat": "passing", "value": "234 YDS 2 TD" }],
  "recruitingEvents": [{ "type": "commitment|visit|offer|decommit", "playerName": "Name", "stars": 5, "pos": "QB", "committingTo": "Team" }],
  "bigMoments": [{ "type": "touchdown|interception|fumble|fieldgoal|safety|sack|bigPlay|championship|upset|record", "description": "what happened", "team": "Team Name", "player": null }],
  "gameStatus": "pregame|active|halftime|final|unknown",
  "finalResult": { "winner": null, "loser": null, "winnerScore": 0, "loserScore": 0, "isUpset": false, "isShutout": false, "wasOT": false },
  "atmosphereNotes": "crowd, weather, stadium, uniforms, bowl logos, trophies, ranked matchup indicators, etc.",
  "dynastyNarrative": "1-2 sentence dramatic ESPN-style description of this moment"
}${contextBlock}`

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: prompt },
          ],
        }],
      }),
    })

    const claudeData = await claudeRes.json()
    const raw = claudeData.content?.map(c => c.text || '').join('') || ''
    const analysis = JSON.parse(raw.replace(/```json|```/g, '').trim())

    const { createClient } = await import('@supabase/supabase-js')
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
    const season = 1
    const now = new Date().toISOString()

    await db.from('stream_events').insert({
      channel: channelName, screen_type: analysis.screenType,
      game_status: analysis.gameStatus,
      home_team: analysis.game?.homeTeam, away_team: analysis.game?.awayTeam,
      home_score: analysis.game?.homeScore, away_score: analysis.game?.awayScore,
      quarter: analysis.game?.quarter, time_remaining: analysis.game?.timeRemaining,
      last_play: analysis.lastPlay?.description,
      atmosphere: analysis.atmosphereNotes, narrative: analysis.dynastyNarrative,
      raw_analysis: analysis, season, created_at: now,
    })

    if (analysis.bigMoments?.length) {
      for (const moment of analysis.bigMoments) {
        await db.from('big_moments').insert({
          channel: channelName, type: moment.type, description: moment.description,
          team: moment.team, player: moment.player,
          home_team: analysis.game?.homeTeam, away_team: analysis.game?.awayTeam,
          home_score: analysis.game?.homeScore, away_score: analysis.game?.awayScore,
          quarter: analysis.game?.quarter, season, created_at: now,
        })
      }
    }

    if (analysis.recruitingEvents?.length) {
      for (const ev of analysis.recruitingEvents) {
        await db.from('recruiting_events').insert({
          type: ev.type, player_name: ev.playerName, stars: ev.stars,
          pos: ev.pos, committing_to: ev.committingTo, season, created_at: now,
        })
      }
    }

    if (analysis.gameStatus === 'final' && analysis.finalResult?.winner) {
      await db.from('games').insert({
        week: currentGameContext?.week || null,
        home_team: analysis.game?.homeTeam, home_score: analysis.game?.homeScore,
        away_team: analysis.game?.awayTeam, away_score: analysis.game?.awayScore,
        status: 'Final', season,
        source_file: `twitch:${channelName}`, created_at: now,
      })
    }

    if (analysis.playerStats?.length) {
      for (const ps of analysis.playerStats) {
        const parsed = parseStatString(ps.pos, ps.stat, ps.value)
        if (parsed) {
          await db.from('players').upsert({
            name: ps.name, team: ps.team, pos: ps.pos,
            stats: parsed, season, updated_at: now,
          }, { onConflict: 'name,season' })
        }
      }
    }

    return res.status(200).json({
      live: true,
      streamTitle: streamData.title,
      viewerCount: streamData.viewer_count,
      thumbnailUrl: thumbUrl,
      analysis,
      timestamp: now,
    })

  } catch (e) {
    console.error('watch-stream error:', e)
    return res.status(500).json({ error: e.message })
  }
}

async function getTwitchToken() {
  const r = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  )
  const d = await r.json()
  return d.access_token
}

async function getStreamData(channelName, token) {
  const r = await fetch(`https://api.twitch.tv/helix/streams?user_login=${channelName}`, {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${token}`,
    },
  })
  const d = await r.json()
  return d.data?.[0] || null
}

function parseStatString(pos, statType, value) {
  const nums = (value || '').match(/\d+/g)?.map(Number) || []
  if (pos === 'QB') return { pass_yds: nums[0] || 0, pass_td: nums[1] || 0, int: nums[2] || 0 }
  if (pos === 'RB') return { rush_yds: nums[0] || 0, rush_td: nums[1] || 0 }
  if (pos === 'WR') return { rec: nums[0] || 0, rec_yds: nums[1] || 0, rec_td: nums[2] || 0 }
  return { value }
}
