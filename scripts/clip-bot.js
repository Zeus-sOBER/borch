/**
 * Dynasty Universe — Twitch Clip Bot
 * ─────────────────────────────────────────────────────────────────────────────
 * Listens for !clip in Twitch chat (or type it yourself while streaming).
 * Pair with VoiceAttack so saying "clip it" types "!clip" in chat automatically.
 *
 * Setup:
 *   1. npm install tmi.js node-fetch dotenv  (one-time)
 *   2. Fill in the vars in .env.local (see below)
 *   3. node scripts/clip-bot.js
 *
 * Required env vars (add to .env.local):
 *   TWITCH_CLIENT_ID        — your Twitch app client ID
 *   TWITCH_CLIENT_SECRET    — your Twitch app client secret
 *   TWITCH_BOT_USERNAME     — the bot's Twitch username (can be your own account)
 *   TWITCH_BOT_OAUTH        — OAuth token for the bot, get from https://twitchapps.com/tmi/
 *   TWITCH_BROADCASTER_ID   — numeric user ID of the channel being streamed
 *   TWITCH_CHANNEL          — channel name to join (no #)
 *   CLIP_BOT_SECRET         — shared secret matching CLIP_BOT_SECRET in your app
 *   DYNASTY_API_URL         — your deployed site URL, e.g. https://yoursite.vercel.app
 *   CLIP_CURRENT_SEASON     — current dynasty season number
 *   CLIP_CURRENT_WEEK       — current game week (update each week)
 *   CLIP_HOME_TEAM          — home team for the current game
 *   CLIP_AWAY_TEAM          — away team for the current game
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config({ path: '.env.local' })
const tmi   = require('tmi.js')
const fetch = require('node-fetch')

const {
  TWITCH_CLIENT_ID,
  TWITCH_CLIENT_SECRET,
  TWITCH_BOT_USERNAME,
  TWITCH_BOT_OAUTH,
  TWITCH_BROADCASTER_ID,
  TWITCH_CHANNEL,
  CLIP_BOT_SECRET,
  DYNASTY_API_URL,
  CLIP_CURRENT_SEASON,
  CLIP_CURRENT_WEEK,
  CLIP_HOME_TEAM,
  CLIP_AWAY_TEAM,
} = process.env

// Validate required env vars
const required = ['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET', 'TWITCH_BOT_USERNAME',
                  'TWITCH_BOT_OAUTH', 'TWITCH_BROADCASTER_ID', 'TWITCH_CHANNEL',
                  'CLIP_BOT_SECRET', 'DYNASTY_API_URL']
for (const key of required) {
  if (!process.env[key]) { console.error(`Missing env var: ${key}`); process.exit(1) }
}

// ── Twitch app token cache ────────────────────────────────────
let appToken = null
let tokenExpiry = 0

async function getAppToken() {
  if (appToken && Date.now() < tokenExpiry - 60_000) return appToken
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${TWITCH_CLIENT_ID}&client_secret=${TWITCH_CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  )
  const d = await res.json()
  appToken    = d.access_token
  tokenExpiry = Date.now() + (d.expires_in || 3600) * 1000
  return appToken
}

// ── Create a Twitch clip via Helix API ────────────────────────
async function createTwitchClip() {
  const token = await getAppToken()
  const res = await fetch(
    `https://api.twitch.tv/helix/clips?broadcaster_id=${TWITCH_BROADCASTER_ID}`,
    {
      method: 'POST',
      headers: {
        'Client-Id': TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${token}`,
      }
    }
  )
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Twitch clip creation failed: ${res.status} ${err}`)
  }
  const { data } = await res.json()
  return data?.[0] // { id, edit_url }
}

// ── Fetch clip details (takes ~15s for Twitch to process) ─────
async function fetchClipDetails(clipId, retries = 8) {
  const token = await getAppToken()
  for (let i = 0; i < retries; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const res = await fetch(
      `https://api.twitch.tv/helix/clips?id=${clipId}`,
      { headers: { 'Client-Id': TWITCH_CLIENT_ID, 'Authorization': `Bearer ${token}` } }
    )
    const { data } = await res.json()
    if (data?.[0]?.url) return data[0]
  }
  return null
}

// ── Send clip to Dynasty Universe website ────────────────────
async function sendClipToSite(clipDetails, triggeredBy) {
  const payload = {
    secret:        CLIP_BOT_SECRET,
    clip_id:       clipDetails.id,
    clip_url:      clipDetails.url,
    embed_url:     `https://clips.twitch.tv/embed?clip=${clipDetails.id}&parent=${new URL(DYNASTY_API_URL).hostname}`,
    thumbnail_url: clipDetails.thumbnail_url,
    title:         clipDetails.title || 'Dynasty Universe Clip',
    broadcaster:   TWITCH_CHANNEL,
    duration:      clipDetails.duration,
    season:        CLIP_CURRENT_SEASON  ? Number(CLIP_CURRENT_SEASON)  : null,
    week:          CLIP_CURRENT_WEEK    ? Number(CLIP_CURRENT_WEEK)    : null,
    home_team:     CLIP_HOME_TEAM  || null,
    away_team:     CLIP_AWAY_TEAM  || null,
    triggered_by:  triggeredBy,
  }

  const res = await fetch(`${DYNASTY_API_URL}/api/clips`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return res.json()
}

// ── Cooldown: prevent clip spam (30s between clips) ──────────
const cooldowns = new Map()
function isOnCooldown(user) {
  const last = cooldowns.get(user) || 0
  return Date.now() - last < 30_000
}
function setCooldown(user) { cooldowns.set(user, Date.now()) }

// ── Authorized users (add Twitch usernames that can trigger) ─
// Empty = broadcaster + mods only. Add names to expand access.
const AUTHORIZED_USERS = []

// ── TMI (Twitch chat) client ──────────────────────────────────
const client = new tmi.Client({
  options: { debug: false },
  identity: { username: TWITCH_BOT_USERNAME, password: TWITCH_BOT_OAUTH },
  channels: [TWITCH_CHANNEL],
})

client.on('message', async (channel, tags, message, self) => {
  if (self) return
  const msg      = message.trim().toLowerCase()
  const username = tags.username || ''
  const isMod    = tags.mod || tags.badges?.broadcaster === '1'

  // Only respond to !clip
  if (msg !== '!clip') return

  // Auth check — broadcaster and mods always allowed; others need to be in the list
  if (!isMod && AUTHORIZED_USERS.length > 0 && !AUTHORIZED_USERS.includes(username)) {
    return client.say(channel, `@${username} Only mods can clip right now.`)
  }

  if (isOnCooldown(username)) {
    return client.say(channel, `@${username} Clip cooldown active — wait a moment.`)
  }
  setCooldown(username)

  client.say(channel, `✂️ Clipping... @${username}`)

  try {
    const created = await createTwitchClip()
    if (!created?.id) throw new Error('No clip ID returned')

    // Twitch takes ~15s to process — fetch details once ready
    const details = await fetchClipDetails(created.id)
    if (!details) throw new Error('Clip details not available after retries')

    const result = await sendClipToSite(details, username)
    const gameTag = (CLIP_HOME_TEAM && CLIP_AWAY_TEAM)
      ? ` (${CLIP_HOME_TEAM} vs ${CLIP_AWAY_TEAM})`
      : ''
    client.say(channel, `📎 Clip saved!${gameTag} ${details.url}`)
    console.log('Clip saved:', result)
  } catch (err) {
    console.error('Clip error:', err)
    client.say(channel, `⚠️ Clip failed: ${err.message}`)
  }
})

client.connect().then(() => {
  console.log(`✅ Clip bot connected to #${TWITCH_CHANNEL}`)
  console.log(`   Game context: S${CLIP_CURRENT_SEASON} W${CLIP_CURRENT_WEEK} — ${CLIP_HOME_TEAM || '?'} vs ${CLIP_AWAY_TEAM || '?'}`)
  console.log(`   Sending clips to: ${DYNASTY_API_URL}`)
}).catch(console.error)
