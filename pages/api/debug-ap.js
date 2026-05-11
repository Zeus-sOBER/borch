import { supabase } from '../../lib/supabase'

export default async function handler(req, res) {
  // Quick debug endpoint to see what's happening with AP rankings
  const [apRes, settingsRes] = await Promise.all([
    supabase.from('ap_rankings').select('*').order('rank', { ascending: true }),
    supabase.from('league_settings').select('current_season, ap_rankings').eq('id', 1).single(),
  ])

  const currentSeason = Number(settingsRes.data?.current_season ?? 1)
  const allRows = apRes.data || []
  const filtered = allRows.filter(r => Number(r.season) === currentSeason)

  res.status(200).json({
    ap_query_error: apRes.error || null,
    settings_query_error: settingsRes.error || null,
    current_season_from_settings: settingsRes.data?.current_season,
    current_season_as_number: currentSeason,
    ap_rankings_table_total_rows: allRows.length,
    ap_rankings_filtered_for_season: filtered.length,
    first_3_rows_raw: allRows.slice(0, 3),
    has_jsonb_ap_rankings: !!settingsRes.data?.ap_rankings,
    jsonb_ap_rankings_count: Array.isArray(settingsRes.data?.ap_rankings) ? settingsRes.data.ap_rankings.length : 0,
  })
}
