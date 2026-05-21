/**
 * /api/twitch-oauth
 * Handles the OAuth callback from Twitch after a streamer authorizes.
 * On success: stores tokens, creates the "Clip It!" Channel Points reward,
 * and registers the EventSub subscription — all server-side, no bot needed.
 */
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CLIENT_ID     = process.env.TWITCH_CLIENT_ID
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET
const BASE_URL      = process.env.NEXT_PUBLIC_SITE_URL || process.env.DYNASTY_API_URL
const REDIRECT_URI  = `${BASE_URL}/api/twitch-oauth`

// The scopes we need: create clips + manage channel point rewards
export const TWITCH_SCOPES = 'clips:edit channel:manage:redemptions'

// ── App token helper (for EventSub registration) ─────────────
async function getAppToken() {
  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
    { method: 'POST' }
  )
  const d = await res.json()
  return d.access_token
}

// ── Refresh a stored user token ───────────────────────────────
export async function refreshUserToken(channelName) {
  const { data: ch } = await supabase
    .from('twitch_channels')
    .select('refresh_token')
    .eq('channel_name', channelName)
    .single()

  if (!ch?.refresh_token) throw new Error('No refresh token stored')

  const res = await fetch(
    `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=refresh_token&refresh_token=${encodeURIComponent(ch.refresh_token)}`,
    { method: 'POST' }
  )
  const d = await res.json()
  if (!d.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(d))

  const expires_at = new Date(Date.now() + (d.expires_in || 14400) * 1000).toISOString()
  await supabase.from('twitch_channels').update({
    access_token:     d.access_token,
    refresh_token:    d.refresh_token || ch.refresh_token,
    token_expires_at: expires_at,
    updated_at:       new Date().toISOString(),
  }).eq('channel_name', channelName)

  return d.access_token
}

// ── Get a valid user token, refreshing if needed ──────────────
export async function getValidUserToken(channelName) {
  const { data: ch } = await supabase
    .from('twitch_channels')
    .select('access_token, token_expires_at')
    .eq('channel_name', channelName)
    .single()

  if (!ch) throw new Error(`No Twitch auth found for channel: ${channelName}`)

  // Refresh if expiring within 10 minutes
  const expiresAt = ch.token_expires_at ? new Date(ch.token_expires_at) : new Date(0)
  if (Date.now() > expiresAt.getTime() - 600_000) {
    return refreshUserToken(channelName)
  }
  return ch.access_token
}

// ── Create "🎬 Clip It!" Channel Points reward ────────────────
async function createClipReward(broadcasterId, userToken) {
  const res = await fetch(
    `https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=${broadcasterId}`,
    {
      method: 'POST',
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title:                    '🎬 Clip It!',
        cost:                     100,
        prompt:                   'Clip the last 30 seconds and save it to Dynasty Universe',
        is_enabled:               true,
        should_redemptions_skip_request_queue: true,
      }),
    }
  )
  const d = await res.json()
  return d.data?.[0]?.id || null
}

// ── Register EventSub subscription ───────────────────────────
async function registerEventSub(broadcasterId, rewardId, appToken) {
  const webhookUrl = `${BASE_URL}/api/twitch-eventsub`
  const secret     = process.env.TWITCH_EVENTSUB_SECRET || process.env.CLIP_BOT_SECRET || 'dynasty-eventsub-secret'

  const res = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
    method: 'POST',
    headers: {
      'Client-Id': CLIENT_ID,
      'Authorization': `Bearer ${appToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type:    'channel.channel_points_custom_reward_redemption.add',
      version: '1',
      condition: {
        broadcaster_user_id: broadcasterId,
        reward_id:           rewardId,
      },
      transport: {
        method:   'webhook',
        callback: webhookUrl,
        secret,
      },
    }),
  })
  const d = await res.json()
  return d.data?.[0]?.id || null
}

// ── Main handler ──────────────────────────────────────────────
export default async function handler(req, res) {
  const { code, state, error: oauthError } = req.query

  // Step 1: redirect to Twitch (GET with no code = start flow)
  if (!code && !oauthError) {
    const state = crypto.randomBytes(16).toString('hex')
    const params = new URLSearchParams({
      client_id:     CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      response_type: 'code',
      scope:         TWITCH_SCOPES,
      state,
    })
    return res.redirect(`https://id.twitch.tv/oauth2/authorize?${params}`)
  }

  if (oauthError) {
    return res.redirect('/stream-watcher?clip_setup=denied')
  }

  try {
    // Step 2: exchange code for tokens
    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type:    'authorization_code',
        redirect_uri:  REDIRECT_URI,
      }),
    })
    const tokens = await tokenRes.json()
    if (!tokens.access_token) throw new Error('Token exchange failed: ' + JSON.stringify(tokens))

    // Step 3: get broadcaster info
    const userRes = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Client-Id': CLIENT_ID,
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    })
    const userData = await userRes.json()
    const user = userData.data?.[0]
    if (!user) throw new Error('Could not fetch Twitch user info')

    const channelName   = user.login
    const broadcasterId = user.id

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 14400) * 1000).toISOString()

    // Step 4: upsert channel record
    await supabase.from('twitch_channels').upsert({
      channel_name:     channelName,
      broadcaster_id:   broadcasterId,
      access_token:     tokens.access_token,
      refresh_token:    tokens.refresh_token,
      token_expires_at: expiresAt,
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'channel_name' })

    // Step 5: create the Channel Points reward (skip if already exists)
    const { data: existing } = await supabase
      .from('twitch_channels')
      .select('clip_reward_id, eventsub_id')
      .eq('channel_name', channelName)
      .single()

    let rewardId    = existing?.clip_reward_id
    let eventsubId  = existing?.eventsub_id
    const appToken  = await getAppToken()

    if (!rewardId) {
      rewardId = await createClipReward(broadcasterId, tokens.access_token)
      if (rewardId) {
        await supabase.from('twitch_channels')
          .update({ clip_reward_id: rewardId })
          .eq('channel_name', channelName)
      }
    }

    // Step 6: register EventSub (skip if already registered)
    if (!eventsubId && rewardId) {
      eventsubId = await registerEventSub(broadcasterId, rewardId, appToken)
      if (eventsubId) {
        await supabase.from('twitch_channels')
          .update({ eventsub_id: eventsubId })
          .eq('channel_name', channelName)
      }
    }

    return res.redirect(`/stream-watcher?clip_setup=success&channel=${channelName}`)
  } catch (err) {
    console.error('Twitch OAuth error:', err)
    return res.redirect(`/stream-watcher?clip_setup=error&msg=${encodeURIComponent(err.message)}`)
  }
}
