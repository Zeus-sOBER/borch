/**
 * /api/twitch-eventsub
 * Receives Twitch EventSub webhook notifications.
 * Verifies the HMAC signature, handles the challenge handshake,
 * then creates + saves a clip when the "Clip It!" reward is redeemed.
 */
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { getValidUserToken } from './twitch-oauth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CLIENT_ID      = process.env.TWITCH_CLIENT_ID
const WEBHOOK_SECRET = process.env.TWITCH_EVENTSUB_SECRET || process.env.CLIP_BOT_SECRET || 'dynasty-eventsub-secret'

// Twitch requires the raw body for signature verification
export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', c => chunks.push(c))
    req.on('end',  () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

function verifySignature(rawBody, headers) {
  const msgId        = headers['twitch-eventsub-message-id']        || ''
  const msgTimestamp = headers['twitch-eventsub-message-timestamp']  || ''
  const msgSignature = headers['twitch-eventsub-message-signature']  || ''

  const hmacMessage = msgId + msgTimestamp + rawBody
  const hmac = 'sha256=' + crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(hmacMessage)
    .digest('hex')

  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(msgSignature))
}

// ── Create clip via Helix API ─────────────────────────────────
async function createClip(broadcasterId, userToken) {
  const res = await fetch(
    `https://api.twitch.tv/helix/clips?broadcaster_id=${broadcasterId}`,
    {
      method: 'POST',
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${userToken}`,
      },
    }
  )
  const d = await res.json()
  return d.data?.[0] // { id, edit_url }
}

// ── Poll for clip details (Twitch takes ~15s to process) ──────
async function fetchClipDetails(clipId, userToken, retries = 10) {
  for (let i = 0; i < retries; i++) {
    await new Promise(r => setTimeout(r, 3000))
    const res = await fetch(
      `https://api.twitch.tv/helix/clips?id=${clipId}`,
      { headers: { 'Client-Id': CLIENT_ID, 'Authorization': `Bearer ${userToken}` } }
    )
    const d = await res.json()
    if (d.data?.[0]?.url) return d.data[0]
  }
  return null
}

// ── Save clip to Supabase ─────────────────────────────────────
async function saveClip(clipDetails, channelRecord, redeemedBy) {
  const { current_season, current_week, current_home_team, current_away_team, channel_name, broadcaster_id } = channelRecord

  // Try to find the matching game row
  let game_id = null
  if (current_season && current_week && current_home_team && current_away_team) {
    const ht = current_home_team, at = current_away_team
    const { data: g } = await supabase
      .from('games').select('id')
      .eq('season', current_season).eq('week', current_week)
      .or(`and(home_team.ilike.${ht},away_team.ilike.${at}),and(home_team.ilike.${at},away_team.ilike.${ht})`)
      .maybeSingle()
    if (g) game_id = g.id
  }

  const hostname = process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL).hostname
    : 'localhost'

  await supabase.from('game_clips').upsert({
    clip_id:       clipDetails.id,
    clip_url:      clipDetails.url,
    embed_url:     `https://clips.twitch.tv/embed?clip=${clipDetails.id}&parent=${hostname}`,
    thumbnail_url: clipDetails.thumbnail_url,
    title:         clipDetails.title || 'Dynasty Universe Clip',
    broadcaster:   channel_name,
    duration:      clipDetails.duration,
    game_id,
    season:        current_season  || null,
    week:          current_week    || null,
    home_team:     current_home_team  || null,
    away_team:     current_away_team  || null,
    triggered_by:  redeemedBy,
  }, { onConflict: 'clip_id' })
}

// ── Main handler ──────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const rawBody = await getRawBody(req)
  const body    = JSON.parse(rawBody.toString())
  const headers = req.headers

  // Verify Twitch signature
  if (!verifySignature(rawBody, headers)) {
    return res.status(403).json({ error: 'Invalid signature' })
  }

  const msgType = headers['twitch-eventsub-message-type']

  // Twitch challenge handshake (sent when registering the subscription)
  if (msgType === 'webhook_callback_verification') {
    return res.status(200).send(body.challenge)
  }

  // Subscription revoked (token expired, etc.)
  if (msgType === 'revocation') {
    const channelId = body.subscription?.condition?.broadcaster_user_id
    if (channelId) {
      await supabase.from('twitch_channels')
        .update({ eventsub_id: null })
        .eq('broadcaster_id', channelId)
    }
    return res.status(200).end()
  }

  // Actual event — channel point redeemed
  if (msgType === 'notification') {
    const event = body.event
    const broadcasterId = event?.broadcaster_user_id
    const redeemedBy    = event?.user_name || event?.user_login || 'unknown'

    // Fire-and-forget — respond to Twitch immediately, process async
    res.status(200).end()

    try {
      // Load channel record
      const { data: channelRecord } = await supabase
        .from('twitch_channels')
        .select('*')
        .eq('broadcaster_id', broadcasterId)
        .single()

      if (!channelRecord) throw new Error(`No channel record for broadcaster ${broadcasterId}`)

      // Get valid user token (auto-refreshes if expired)
      const userToken = await getValidUserToken(channelRecord.channel_name)

      // Create the clip
      const created = await createClip(broadcasterId, userToken)
      if (!created?.id) throw new Error('Clip creation returned no ID')

      // Wait for Twitch to process it, then fetch details
      const details = await fetchClipDetails(created.id, userToken)
      if (!details) throw new Error('Clip details not available after retries')

      // Save to DB
      await saveClip(details, channelRecord, redeemedBy)
      console.log(`✅ Clip saved for ${channelRecord.channel_name}: ${details.url}`)
    } catch (err) {
      console.error('EventSub clip error:', err)
    }

    return
  }

  res.status(200).end()
}
