/**
 * lib/discord.js — Discord Webhook Notifications
 * ─────────────────────────────────────────────────────────────────────────────
 * Sends rich formatted embeds to a Discord channel when events happen.
 * Uses formatters from discord-embeds.js for consistent, beautiful posts.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { createClient } from '@supabase/supabase-js'
import { articleEmbed, bigMomentEmbed } from './discord-embeds'

function getDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

async function getWebhookUrl() {
  // Check env var first (faster), fall back to league_settings
  if (process.env.DISCORD_WEBHOOK_URL) return process.env.DISCORD_WEBHOOK_URL
  try {
    const { data } = await getDb().from('league_settings').select('discord_webhook_url').eq('id', 1).single()
    return data?.discord_webhook_url || null
  } catch { return null }
}

async function getSettings() {
  try {
    const { data } = await getDb().from('league_settings').select('league_name, current_season, current_week').eq('id', 1).single()
    return data || {}
  } catch { return {} }
}

export async function sendDiscordEmbed(embedPayload) {
  const webhookUrl = await getWebhookUrl()
  if (!webhookUrl) return { sent: false, reason: 'No webhook configured' }

  try {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(embedPayload),
    })
    return { sent: resp.ok }
  } catch (e) {
    console.error('[discord] webhook error:', e.message)
    return { sent: false, reason: e.message }
  }
}

// Legacy function — still works for custom one-off notifications
export async function sendDiscordNotification({ title, description, color = 0xC9A84C, fields = [], url, imageUrl }) {
  const embed = { title, description, color, timestamp: new Date().toISOString() }
  if (fields.length) embed.fields = fields.map(f => ({ name: f.name, value: f.value, inline: f.inline ?? true }))
  if (url) embed.url = url
  if (imageUrl) embed.image = { url: imageUrl }
  return sendDiscordEmbed({ embeds: [embed] })
}

export async function notifyNewArticle(article) {
  const settings = await getSettings()
  const embed = articleEmbed(article, settings)
  return sendDiscordEmbed(embed)
}

export async function notifyBigMoment(moment) {
  const embed = bigMomentEmbed(moment)
  return sendDiscordEmbed(embed)
}

export async function notifyWeeklyRecap(weekNum, summary) {
  return sendDiscordNotification({
    title: `📋 Week ${weekNum} Recap`,
    description: summary || 'Check the website for the full recap!',
    color: 0x4A90D9,
  })
}
