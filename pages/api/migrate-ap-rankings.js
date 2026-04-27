/**
 * /api/migrate-ap-rankings.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Commissioner tool — migrates AP rankings from the legacy league_settings.ap_rankings
 * JSONB field to the dedicated ap_rankings table. Requires COMMISSIONER_PIN.
 *
 * Safe to run multiple times — checks for existing records before inserting.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { pin } = req.body || {}
  if (!pin || pin !== process.env.COMMISSIONER_PIN) {
    return res.status(403).json({ error: 'Commissioner PIN required.' })
  }

  try {
    // Fetch league_settings to get the ap_rankings JSONB field
    const { data: settings, error: settingsError } = await supabase
      .from('league_settings')
      .select('ap_rankings, current_season')
      .eq('id', 1)
      .single()

    if (settingsError) throw settingsError
    if (!settings) return res.status(404).json({ error: 'League settings not found' })

    const apRankingsJsonb = settings.ap_rankings || []
    const season = settings.current_season || 1

    if (!Array.isArray(apRankingsJsonb) || apRankingsJsonb.length === 0) {
      return res.status(200).json({
        message: 'No AP rankings found in league_settings JSONB to migrate.',
        migrated: 0,
      })
    }

    // Transform JSONB rankings to table format
    const rankingsToInsert = apRankingsJsonb.map(r => ({
      season,
      rank: r.rank || null,
      lw: r.lw || null,
      team_name: r.team_name,
      record: r.record || null,
      points: r.points || null,
      last_week_result: r.last_week_result || null,
      this_week: r.this_week || null,
      updated_at: new Date().toISOString(),
    }))

    // Delete old records for this season (fresh migration)
    const { error: deleteError } = await supabase
      .from('ap_rankings')
      .delete()
      .eq('season', season)

    if (deleteError) throw deleteError

    // Insert migrated rankings
    const { error: insertError } = await supabase
      .from('ap_rankings')
      .insert(rankingsToInsert)

    if (insertError) throw insertError

    return res.status(200).json({
      message: `Successfully migrated ${rankingsToInsert.length} AP rankings to table for season ${season}.`,
      migrated: rankingsToInsert.length,
      season,
    })
  } catch (err) {
    console.error('[migrate-ap-rankings] error:', err)
    return res.status(500).json({
      error: 'Migration failed.',
      details: err.message,
    })
  }
}
