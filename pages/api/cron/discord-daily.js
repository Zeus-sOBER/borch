/**
 * /api/cron/discord-daily.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Vercel Cron Job — Posts a daily AI-generated hot take to Discord.
 * Runs every day at 12:00 PM UTC (configurable in vercel.json).
 *
 * Also serves as an API endpoint: POST with commissioner PIN to trigger manually.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js'
import { hotTakeEmbed } from '../../../lib/discord-embeds'

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function getWebhookUrl() {
  if (process.env.DISCORD_WEBHOOK_URL) return process.env.DISCORD_WEBHOOK_URL
  try {
    const { data } = await getDb().from('league_settings').select('discord_webhook_url').eq('id', 1).single()
    return data?.discord_webhook_url || null
  } catch { return null }
}

export default async function handler(req, res) {
  // Allow both GET (Vercel cron) and POST (manual trigger)
  if (req.method === 'POST') {
    const { pin } = req.body || {}
    if (pin !== process.env.COMMISSIONER_PIN) {
      return res.status(403).json({ error: 'Commissioner PIN required' })
    }
  }

  // Verify cron secret for GET requests (Vercel sends this header)
  if (req.method === 'GET') {
    const authHeader = req.headers.authorization
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
  }

  const webhookUrl = await getWebhookUrl()
  if (!webhookUrl) {
    return res.status(200).json({ sent: false, reason: 'No Discord webhook configured' })
  }

  const db = getDb()

  // Gather league context for the AI
  const [teamsRes, settingsRes, gamesRes] = await Promise.all([
    db.from('teams').select('team_name, name, wins, losses, streak, pts, pts_against').order('wins', { ascending: false }).limit(10),
    db.from('league_settings').select('*').eq('id', 1).single(),
    db.from('games').select('home_team, away_team, home_score, away_score, week')
      .not('home_score', 'is', null).order('week', { ascending: false }).limit(10),
  ])

  const teams = teamsRes.data || []
  const settings = settingsRes.data || {}
  const recentGames = gamesRes.data || []

  const context = [
    'Top teams: ' + teams.slice(0, 6).map(t => `${t.team_name || t.name} (${t.wins}-${t.losses}, streak: ${t.streak || 'N/A'})`).join(', '),
    'Recent results: ' + recentGames.slice(0, 5).map(g => `${g.home_team} ${g.home_score}-${g.away_score} ${g.away_team} (Week ${g.week})`).join(', '),
    `Current week: ${settings.current_week || 0}, Season: ${settings.current_season || 1}`,
  ].join('\n')

  let take = `${teams[0]?.team_name || 'The top team'} is ${teams[0]?.wins || 0}-${teams[0]?.losses || 0} — but are they for real? Only time will tell.`

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 200,
          messages: [{
            role: 'user',
            content: `You're a college football hot take artist for a dynasty league called "${settings.league_name || 'Dynasty Universe'}". Generate ONE spicy, provocative hot take (2-3 sentences max) based on the league data below. Be bold, pick a side, make it debatable. Reference specific teams and records. No hedging, no "time will tell."\n\n${context}`,
          }],
        }),
      })
      const aiData = await aiRes.json()
      take = aiData.content?.[0]?.text || take
    } catch (err) {
      console.error('[discord-daily] AI error:', err.message)
    }
  }

  // Post to Discord
  const embed = hotTakeEmbed(take, settings)
  try {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed),
    })
    return res.status(200).json({ sent: resp.ok, take })
  } catch (err) {
    console.error('[discord-daily] webhook error:', err.message)
    return res.status(500).json({ sent: false, error: err.message })
  }
}
