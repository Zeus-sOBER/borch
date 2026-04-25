/**
 * /api/health — Setup Validator
 * Checks all env vars, Supabase connection, and required tables.
 * No auth required — diagnostic tool for setup.
 */
import { createClient } from '@supabase/supabase-js'

const REQUIRED_ENV = [
  { key: 'ANTHROPIC_API_KEY', label: 'Claude AI API Key' },
  { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase Project URL' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase Service Role Key' },
  { key: 'COMMISSIONER_PIN', label: 'Commissioner PIN' },
]

const OPTIONAL_ENV = [
  { key: 'GOOGLE_SERVICE_ACCOUNT_JSON', label: 'Google Drive (screenshots)' },
  { key: 'GOOGLE_DRIVE_FOLDER_ID', label: 'Google Drive Folder ID' },
  { key: 'TWITCH_CLIENT_ID', label: 'Twitch Stream Watcher' },
  { key: 'TWITCH_CLIENT_SECRET', label: 'Twitch Secret' },
  { key: 'DYNASTY_SHEET_ID', label: 'Google Sheet Auto-Sync' },
  { key: 'SHEET_SYNC_SECRET', label: 'Sheet Sync Secret' },
  { key: 'DISCORD_WEBHOOK_URL', label: 'Discord Notifications' },
]

const REQUIRED_TABLES = [
  'teams', 'games', 'players', 'coaches', 'scan_log',
  'league_settings', 'narrative_log', 'championships',
  'heisman_watch', 'ap_rankings', 'team_stats', 'articles',
  'stream_events', 'big_moments', 'recruiting_events',
]

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')

  const checks = { required: [], optional: [], tables: [], connection: null, overall: 'ready' }

  // 1. Required env vars
  for (const { key, label } of REQUIRED_ENV) {
    const exists = !!process.env[key]
    checks.required.push({ name: label, status: exists ? 'pass' : 'fail', message: exists ? 'Configured' : `Missing env var: ${key}` })
    if (!exists) checks.overall = 'error'
  }

  // 2. Optional env vars
  for (const { key, label } of OPTIONAL_ENV) {
    const exists = !!process.env[key]
    checks.optional.push({ name: label, status: exists ? 'pass' : 'warn', message: exists ? 'Configured' : `Not configured (optional)` })
    if (!exists && checks.overall === 'ready') checks.overall = 'partial'
  }

  // 3. Supabase connection test
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
      const { data, error } = await db.from('league_settings').select('id').eq('id', 1).single()
      if (error && error.code !== 'PGRST116') throw error
      checks.connection = { status: 'pass', message: 'Connected to Supabase' }

      // 4. Check tables
      for (const table of REQUIRED_TABLES) {
        try {
          const { error: tErr } = await db.from(table).select('*').limit(1)
          if (tErr) throw tErr
          checks.tables.push({ name: table, status: 'pass' })
        } catch (e) {
          checks.tables.push({ name: table, status: 'fail', message: e.message })
          checks.overall = 'error'
        }
      }
    } catch (e) {
      checks.connection = { status: 'fail', message: `Connection failed: ${e.message}` }
      checks.overall = 'error'
    }
  } else {
    checks.connection = { status: 'fail', message: 'Cannot test — Supabase env vars missing' }
  }

  res.status(200).json(checks)
}
