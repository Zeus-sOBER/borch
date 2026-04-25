/**
 * lib/discord.js — Discord Webhook Notifications
 * Sends formatted embeds to a Discord channel when events happen.
 */
import { createClient } from '@supabase/supabase-js'

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

export async function sendDiscordNotification({ title, description, color = 0xC9A84C, fields = [], url, imageUrl }) {
  const webhookUrl = await getWebhookUrl()
  if (!webhookUrl) return { sent: false, reason: 'No webhook configured' }

  const embed = { title, description, color, timestamp: new Date().toISOString() }
  if (fields.length) embed.fields = fields.map(f => ({ name: f.name, value: f.value, inline: f.inline ?? true }))
  if (url) embed.url = url
  if (imageUrl) embed.image = { url: imageUrl }

  try {
    const resp = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })
    return { sent: resp.ok }
  } catch (e) {
    console.error('[discord] webhook error:', e.message)
    return { sent: false, reason: e.message }
  }
}

export async function notifyNewArticle(article) {
  const typeLabels = { 'power-rankings': 'Power Rankings', 'weekly-recap': 'Weekly Recap', 'player-spotlight': 'Player Spotlight', 'rivalry-breakdown': 'Rivalry Breakdown' }
  return sendDiscordNotification({
    title: article.title || typeLabels[article.article_type] || 'New Article',
    description: (article.content || '').substring(0, 300) + '...',
    color: 0xC9A84C,
    fields: [{ name: 'Type', value: typeLabels[article.article_type] || article.article_type }],
  })
}

export async function notifyBigMoment(moment) {
  const icons = { touchdown: '🏈', interception: '🔄', fumble: '💨', championship: '🏆', upset: '😱' }
  return sendDiscordNotification({
    title: `${icons[moment.type] || '⚡'} ${moment.type?.toUpperCase() || 'BIG MOMENT'}`,
    description: moment.description || 'A big moment just happened!',
    color: 0x4CAF7D,
    fields: [
      { name: 'Matchup', value: `${moment.home_team || '?'} vs ${moment.away_team || '?'}` },
      moment.player ? { name: 'Player', value: moment.player } : null,
    ].filter(Boolean),
  })
}

export async function notifyWeeklyRecap(weekNum, summary) {
  return sendDiscordNotification({
    title: `📋 Week ${weekNum} Recap`,
    description: summary || 'Check the website for the full recap!',
    color: 0x4A90D9,
  })
}
