/**
 * /api/discord-bot.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Discord Interactions Endpoint — handles slash commands via HTTP webhooks.
 * No separate bot server needed; runs as a Vercel serverless function.
 *
 * Discord sends POST requests here when users type slash commands.
 * We verify the signature, parse the command, fetch data, and respond.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js'
import {
  standingsEmbed,
  scoresEmbed,
  rankingsEmbed,
  heismanEmbed,
  predictionPollEmbed,
} from '../../lib/discord-embeds'

// ── Signature verification ───────────────────────────────────────────────────
// Discord requires ed25519 signature verification on all interaction requests.
// We use the Web Crypto API (available in Node 18+ / Vercel Edge).

async function verifyDiscordSignature(req, body) {
  const signature = req.headers['x-signature-ed25519']
  const timestamp = req.headers['x-signature-timestamp']
  const publicKey = process.env.DISCORD_PUBLIC_KEY

  if (!signature || !timestamp || !publicKey) return false

  try {
    // Import the public key
    const keyData = hexToUint8Array(publicKey)
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'Ed25519', namedCurve: 'Ed25519' }, false, ['verify']
    )

    // Verify the signature
    const message = new TextEncoder().encode(timestamp + body)
    const sig = hexToUint8Array(signature)
    return await crypto.subtle.verify('Ed25519', cryptoKey, sig, message)
  } catch (err) {
    console.error('[discord-bot] Signature verification error:', err.message)
    // Fallback: try tweetnacl if Web Crypto doesn't support Ed25519
    try {
      const nacl = require('tweetnacl')
      const msg = Buffer.from(timestamp + body)
      const sig = Buffer.from(signature, 'hex')
      const key = Buffer.from(publicKey, 'hex')
      return nacl.sign.detached.verify(msg, sig, key)
    } catch {
      return false
    }
  }
}

function hexToUint8Array(hex) {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return arr
}

// ── Supabase client ──────────────────────────────────────────────────────────
function getDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

// ── Disable Next.js body parsing so we can verify the raw signature ──────────
export const config = {
  api: { bodyParser: false },
}

// ── Read raw body ────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

// ── Discord Interaction Types ────────────────────────────────────────────────
const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
}

const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE: 4,
  DEFERRED_CHANNEL_MESSAGE: 5,
}

// ── Main Handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Read raw body for signature verification
  const rawBody = await readBody(req)

  // Verify signature (Discord requires this)
  const isValid = await verifyDiscordSignature(req, rawBody)
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid request signature' })
  }

  const interaction = JSON.parse(rawBody)

  // Handle PING (Discord sends this to verify the endpoint)
  if (interaction.type === InteractionType.PING) {
    return res.status(200).json({ type: InteractionResponseType.PONG })
  }

  // Handle slash commands
  if (interaction.type === InteractionType.APPLICATION_COMMAND) {
    const { name, options } = interaction.data
    const args = {}
    if (options) {
      for (const opt of options) {
        args[opt.name] = opt.value
      }
    }

    try {
      const response = await handleCommand(name, args)
      return res.status(200).json({
        type: InteractionResponseType.CHANNEL_MESSAGE,
        data: response,
      })
    } catch (err) {
      console.error(`[discord-bot] Error handling /${name}:`, err)
      return res.status(200).json({
        type: InteractionResponseType.CHANNEL_MESSAGE,
        data: {
          embeds: [{
            title: '❌ Error',
            description: `Something went wrong running \`/${name}\`. Try again in a moment.`,
            color: 0xE74C3C,
          }]
        },
      })
    }
  }

  return res.status(400).json({ error: 'Unknown interaction type' })
}

// ── Command Router ───────────────────────────────────────────────────────────
async function handleCommand(name, args) {
  switch (name) {
    case 'standings': return await cmdStandings()
    case 'scores':    return await cmdScores(args)
    case 'rankings':  return await cmdRankings()
    case 'heisman':   return await cmdHeisman()
    case 'predict':   return await cmdPredict(args)
    case 'record':    return await cmdRecord(args)
    case 'hottake':   return await cmdHotTake()
    default:
      return {
        embeds: [{
          title: '❓ Unknown Command',
          description: `\`/${name}\` isn't a recognized command.`,
          color: 0xE74C3C,
        }]
      }
  }
}

// ── /standings ───────────────────────────────────────────────────────────────
async function cmdStandings() {
  const db = getDb()
  const [teamsRes, settingsRes] = await Promise.all([
    db.from('teams').select('*').order('wins', { ascending: false }),
    db.from('league_settings').select('*').eq('id', 1).single(),
  ])
  const teams = teamsRes.data || []
  const settings = settingsRes.data || {}
  return standingsEmbed(teams, settings)
}

// ── /scores [week] ───────────────────────────────────────────────────────────
async function cmdScores(args) {
  const db = getDb()
  const settingsRes = await db.from('league_settings').select('*').eq('id', 1).single()
  const settings = settingsRes.data || {}
  const week = args.week ?? settings.current_week ?? 1

  const gamesRes = await db.from('games').select('*').eq('week', week)
  const games = gamesRes.data || []
  return scoresEmbed(games, week, settings)
}

// ── /rankings ────────────────────────────────────────────────────────────────
async function cmdRankings() {
  const db = getDb()
  const [rankingsRes, settingsRes] = await Promise.all([
    db.from('ap_rankings').select('*').order('rank', { ascending: true }),
    db.from('league_settings').select('*').eq('id', 1).single(),
  ])
  const settings = settingsRes.data || {}
  const season = settings.current_season || 1
  const rankings = (rankingsRes.data || [])
    .filter(r => r.season === season)
    .sort((a, b) => (Number(b.points) || 0) - (Number(a.points) || 0))
  return rankingsEmbed(rankings, settings)
}

// ── /heisman ─────────────────────────────────────────────────────────────────
async function cmdHeisman() {
  const db = getDb()
  const [heismanRes, settingsRes] = await Promise.all([
    db.from('heisman_watch').select('*').order('rank', { ascending: true }).limit(5),
    db.from('league_settings').select('*').eq('id', 1).single(),
  ])
  return heismanEmbed(heismanRes.data || [], settingsRes.data || {})
}

// ── /predict [week] ──────────────────────────────────────────────────────────
async function cmdPredict(args) {
  const db = getDb()
  const settingsRes = await db.from('league_settings').select('*').eq('id', 1).single()
  const settings = settingsRes.data || {}
  const week = args.week ?? settings.current_week ?? 1

  const gamesRes = await db.from('games').select('*').eq('week', week)
  return predictionPollEmbed(gamesRes.data || [], week, settings)
}

// ── /record [team] ───────────────────────────────────────────────────────────
async function cmdRecord(args) {
  const db = getDb()
  const teamName = args.team

  if (!teamName) {
    return {
      embeds: [{
        title: '❓ Missing Team',
        description: 'Usage: `/record team:Alabama`',
        color: 0xE74C3C,
      }]
    }
  }

  // Fuzzy match: case-insensitive contains
  const { data: teams } = await db
    .from('teams')
    .select('*')
    .ilike('team_name', `%${teamName}%`)

  // Also try the 'name' column for older schemas
  let team = teams?.[0]
  if (!team) {
    const { data: teams2 } = await db.from('teams').select('*').ilike('name', `%${teamName}%`)
    team = teams2?.[0]
  }

  if (!team) {
    return {
      embeds: [{
        title: '🔍 Team Not Found',
        description: `No team matching "${teamName}" was found.`,
        color: 0xE74C3C,
      }]
    }
  }

  const name = team.team_name || team.name || 'Unknown'
  const record = `${team.wins || 0}-${team.losses || 0}`
  const streak = team.streak || 'N/A'
  const pf = team.pts || 0
  const pa = team.pts_against || 0
  const gp = (team.wins || 0) + (team.losses || 0)
  const ppg = gp > 0 ? (pf / gp).toFixed(1) : '0.0'
  const dppg = gp > 0 ? (pa / gp).toFixed(1) : '0.0'

  // Try to find coach
  const { data: coaches } = await db
    .from('coaches')
    .select('name, coaching_style')
    .or(`team_id.eq.${team.id},team.ilike.%${name}%`)
    .eq('is_active', true)
    .limit(1)
  const coach = coaches?.[0]

  return {
    embeds: [{
      title: `🏈 ${name}`,
      color: 0xC5A03F,
      fields: [
        { name: 'Record', value: record, inline: true },
        { name: 'Streak', value: streak, inline: true },
        { name: 'PPG', value: ppg, inline: true },
        { name: 'Opp PPG', value: dppg, inline: true },
        { name: 'Points For', value: `${pf}`, inline: true },
        { name: 'Points Against', value: `${pa}`, inline: true },
        coach ? { name: 'Coach', value: `${coach.name}${coach.coaching_style ? ` (${coach.coaching_style})` : ''}`, inline: false } : null,
      ].filter(Boolean),
    }]
  }
}

// ── /hottake (AI-generated) ──────────────────────────────────────────────────
async function cmdHotTake() {
  const db = getDb()

  // Gather context for the AI
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
    'Top teams: ' + teams.slice(0, 5).map(t => `${t.team_name || t.name} (${t.wins}-${t.losses})`).join(', '),
    'Recent results: ' + recentGames.slice(0, 5).map(g => `${g.home_team} ${g.home_score}-${g.away_score} ${g.away_team}`).join(', '),
  ].join('\n')

  // Call Claude for the hot take
  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      embeds: [{
        title: '🌶️ Daily Hot Take',
        description: `${teams[0]?.team_name || 'The top team'} is ${teams[0]?.wins || 0}-${teams[0]?.losses || 0} but haven't proven anything yet. Change my mind.`,
        color: 0xE74C3C,
        footer: { text: 'AI unavailable — generic take generated' },
      }]
    }
  }

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
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: `You're a college football hot take artist for a dynasty league. Generate ONE spicy, provocative hot take (2-3 sentences max) based on this league data. Be bold, be controversial, pick sides. No hedging.\n\n${context}`,
        }],
      }),
    })
    const aiData = await aiRes.json()
    const take = aiData.content?.[0]?.text || 'The dynasty never sleeps. Neither should your trash talk.'

    return {
      embeds: [{
        title: '🌶️ Hot Take',
        description: take,
        color: 0xE74C3C,
        author: { name: `${settings.league_name || 'Dynasty Universe'} AI` },
        footer: { text: 'Agree? Disagree? React below 👇' },
        timestamp: new Date().toISOString(),
      }]
    }
  } catch (err) {
    console.error('[discord-bot] AI hot take error:', err)
    return {
      embeds: [{
        title: '🌶️ Hot Take',
        description: `${teams[0]?.team_name || 'Someone'} is overrated. There, I said it.`,
        color: 0xE74C3C,
      }]
    }
  }
}

