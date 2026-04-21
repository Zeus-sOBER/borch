import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const season = req.query.season ? parseInt(req.query.season) : null;
    let query = supabase
      .from('team_stats')
      .select('*')
      .order('ppg', { ascending: false, nullsFirst: false });

    if (season) query = query.eq('season', season);

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ stats: data || [] });
  }

  if (req.method === 'POST') {
    const { pin, stats } = req.body;
    if (!pin || pin !== process.env.COMMISSIONER_PIN) {
      return res.status(403).json({ error: 'Commissioner PIN required' });
    }
    if (!Array.isArray(stats) || stats.length === 0) {
      return res.status(400).json({ error: 'stats array is required' });
    }

    let saved = 0;
    for (const s of stats) {
      if (!s.team_name || !s.season) continue;
      const { error } = await supabase.from('team_stats').upsert({
        season:          s.season,
        team_name:       s.team_name,
        gp:              s.gp              ?? null,
        ppg:             s.ppg             ?? null,
        pts_scored:      s.pts_scored      ?? null,
        off_yards:       s.off_yards       ?? null,
        ypg:             s.ypg             ?? null,
        ypp:             s.ypp             ?? null,
        pass_yards:      s.pass_yards      ?? null,
        pypg:            s.pypg            ?? null,
        pass_tds:        s.pass_tds        ?? null,
        rush_yards:      s.rush_yards      ?? null,
        dppg:            s.dppg            ?? null,
        pts_allowed:     s.pts_allowed     ?? null,
        total_yds_allowed: s.total_yds_allowed ?? null,
        ypga:            s.ypga            ?? null,
        pass_yds_allowed: s.pass_yds_allowed ?? null,
        dyga:            s.dyga            ?? null,
        rush_yds_allowed: s.rush_yds_allowed ?? null,
        rypga:           s.rypga           ?? null,
        sacks:           s.sacks           ?? null,
        updated_at:      new Date().toISOString(),
      }, { onConflict: 'season,team_name' });
      if (!error) saved++;
    }

    return res.status(200).json({ saved });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
