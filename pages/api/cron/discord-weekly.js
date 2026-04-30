/**
 * /api/cron/discord-weekly.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Vercel Cron Job — Posts a weekly digest to Discord summarizing the week's
 * biggest wins, upsets, and Heisman race.
 *
 * Runs every Monday at 10:00 AM UTC (configurable in vercel.json).
 * Also callable manually via POST with commissioner PIN.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js'
import { weeklyDigestEmbed } from '../../../lib/discord-embeds'

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
  if (req.method === 'POST') {
    const { pin } = req.body || {}
    if (pin !== process.env.COMMISSIONER_PIN) {
      return res.status(403).json({ error: 'Commissioner PIN required' })
    }
  }

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
  const settingsRes = await db.from('league_settings').select('*').eq('id', 1).single()
  const settings = settingsRes.data || {}
  const currentWeek = settings.current_week || 1

  // Get this week's completed games
  const { data: weekGames } = await db
    .from('games')
    .select('home_team, away_team, home_score, away_score')
    .eq('week', currentWeek)
    .not('home_score', 'is', null)
    .not('away_score', 'is', null)

  const games = weekGames || []

  // Find biggest win (largest margin)
  let topWin = null
  let biggestUpset = null
  let maxMargin = 0

  // Get team records for upset detection
  const { data: allTeams } = await db.from('teams').select('team_name, name, wins, losses').order('wins', { ascending: false })
  const teamRecords = {}
  for (const t of (allTeams || [])) {
    const name = (t.team_name || t.name || '').toLowerCase()
    teamRecords[name] = (t.wins || 0) - (t.losses || 0)
  }

  for (const g of games) {
    const margin = Math.abs((g.home_score || 0) - (g.away_score || 0))
    const homeWon = (g.home_score || 0) > (g.away_score || 0)
    const winner = homeWon ? g.home_team : g.away_team
    const loser = homeWon ? g.away_team : g.home_team
    const winnerScore = homeWon ? g.home_score : g.away_score
    const loserScore = homeWon ? g.away_score : g.home_score

    if (margin > maxMargin) {
      maxMargin = margin
      topWin = `${winner} ${winnerScore}-${loserScore} ${loser} (+${margin})`
    }

    // Detect upsets: worse team beats better team
    const winnerDiff = teamRecords[winner?.toLowerCase()] ?? 0
    const loserDiff = teamRecords[loser?.toLowerCase()] ?? 0
    if (winnerDiff < loserDiff) {
      biggestUpset = `${winner} ${winnerScore}-${loserScore} ${loser}`
    }
  }

  // Get Heisman leader
  const { data: heisman } = await db.from('heisman_watch').select('player_name, team').order('rank', { ascending: true }).limit(1)
  const heismanLeader = heisman?.[0] ? `${heisman[0].player_name} (${heisman[0].team || 'Unknown'})` : null

  const digestData = {
    weekNum: currentWeek,
    gamesPlayed: games.length,
    topWin,
    biggestUpset,
    heismanLeader,
  }

  const embed = weeklyDigestEmbed(digestData, settings)

  try {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embed),
    })
    return res.status(200).json({ sent: resp.ok, digest: digestData })
  } catch (err) {
    console.error('[discord-weekly] webhook error:', err.message)
    return res.status(500).json({ sent: false, error: err.message })
  }
}
