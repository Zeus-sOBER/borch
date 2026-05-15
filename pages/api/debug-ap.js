import { supabase, supabaseAdmin } from '../../lib/supabase'

export default async function handler(req, res) {
  const admin = supabaseAdmin()

  const [adminRes, settingsRes, teamsRes] = await Promise.all([
    admin.from('ap_rankings').select('*').order('rank', { ascending: true }),
    supabase.from('league_settings').select('current_season, ap_rankings').eq('id', 1).single(),
    supabase.from('teams').select('name, team_name, wins, losses').order('wins', { ascending: false }),
  ])

  const currentSeason = Number(settingsRes.data?.current_season ?? 1)
  const allRows = adminRes.data || []
  const filtered = allRows.filter(r => Number(r.season) === currentSeason)

  // Simulate what league-data.js does: sort by points, assign ranks
  const apSorted = (filtered.length > 0 ? filtered : allRows)
    .slice()
    .sort((a, b) => {
      const ptsDiff = (Number(b.points) || 0) - (Number(a.points) || 0)
      return ptsDiff !== 0 ? ptsDiff : (Number(a.rank) || 999) - (Number(b.rank) || 999)
    })
    .map((r, i) => ({
      rank: i + 1,
      team_name: r.team_name,
      record: r.record || null,
      points: Number(r.points) || null,
    }))

  // Show teams that would match AP names (the live record override)
  const teams = (teamsRes.data || []).map(t => ({
    name: t.name || t.team_name,
    record: `${t.wins ?? 0}-${t.losses ?? 0}`,
  }))

  // Find AP teams and what their live record would be
  const apWithLiveOverride = apSorted.map(ap => {
    const key = (ap.team_name || '').toLowerCase().trim()
    const matchedTeam = teams.find(t => (t.name || '').toLowerCase().trim() === key)
    return {
      rank: ap.rank,
      team_name: ap.team_name,
      ap_record: ap.record,
      live_record: matchedTeam ? matchedTeam.record : 'NO MATCH',
      would_display: matchedTeam && (parseInt(matchedTeam.record) > 0 || matchedTeam.record.includes('-')) ? matchedTeam.record : ap.record,
    }
  })

  // Also check: does JSONB still exist and what does rawSettings spread do?
  const jsonbData = settingsRes.data?.ap_rankings

  res.status(200).json({
    table_row_count: allRows.length,
    filtered_for_season: filtered.length,
    current_season: currentSeason,
    final_ap_rankings_top5: apSorted.slice(0, 5),
    ap_with_live_override_top10: apWithLiveOverride.slice(0, 10),
    teams_with_games: teams.filter(t => t.record !== '0-0').slice(0, 10),
    jsonb_still_exists: !!jsonbData,
    jsonb_count: Array.isArray(jsonbData) ? jsonbData.length : 0,
    jsonb_first_3: Array.isArray(jsonbData) ? jsonbData.slice(0, 3) : null,
  })
}
