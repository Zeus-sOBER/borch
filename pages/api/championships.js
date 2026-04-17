import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {

  // GET — fetch all championships ordered by season
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('championships')
      .select('*')
      .order('season', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ championships: data || [] });
  }

  // POST — manually add or update a championship (commissioner only)
  if (req.method === 'POST') {
    const { season, team_name, coach_name, record, notes, pin } = req.body;

    if (!pin || pin !== process.env.COMMISSIONER_PIN) {
      return res.status(401).json({ error: 'Commissioner PIN required.' });
    }

    if (!season || !team_name) {
      return res.status(400).json({ error: 'season and team_name are required.' });
    }

    const { data, error } = await supabase
      .from('championships')
      .upsert({ season, team_name, coach_name, record, notes }, { onConflict: 'season,team_name' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ championship: data });
  }

  // DELETE — remove a championship entry (commissioner only)
  if (req.method === 'DELETE') {
    const { id, pin } = req.body;

    if (!pin || pin !== process.env.COMMISSIONER_PIN) {
      return res.status(401).json({ error: 'Commissioner PIN required.' });
    }

    if (!id) return res.status(400).json({ error: 'id is required.' });

    const { error } = await supabase.from('championships').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
