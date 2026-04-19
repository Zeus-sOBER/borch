import { supabase } from '@/lib/supabase';

/**
 * GET: Fetch top 5 Heisman candidates
 * POST: Add/update a Heisman candidate
 * PUT: Update candidate rank or notes
 * DELETE: Remove candidate from watch list
 */

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return getHeismanCandidates(req, res);
      case 'POST':
        return addHeismanCandidate(req, res);
      case 'PUT':
        return updateHeismanCandidate(req, res);
      case 'DELETE':
        return deleteHeismanCandidate(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Heisman Watch API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * GET: Fetch top 5 Heisman candidates with team info
 */
async function getHeismanCandidates(req, res) {
  const { data, error } = await supabase
    .from('heisman_watch')
    .select(`
      *,
      teams:team_id(id, name, logo_url)
    `)
    .order('rank', { ascending: true })
    .limit(5);

  if (error) throw error;

  return res.status(200).json({
    success: true,
    candidates: data || [],
    count: data?.length || 0
  });
}

/**
 * POST: Add a new Heisman candidate
 * Body: {
 *   player_name: string,
 *   team_id: uuid,
 *   rank: number (1-5),
 *   key_stats: object,
 *   notes: string,
 *   trophy_screenshot_url: string,
 *   week_updated: number
 * }
 */
async function addHeismanCandidate(req, res) {
  const { player_name, team_id, rank, key_stats, notes, trophy_screenshot_url, week_updated } = req.body;

  // Validate required fields
  if (!player_name || !team_id || !rank) {
    return res.status(400).json({ error: 'Missing required fields: player_name, team_id, rank' });
  }

  if (rank < 1 || rank > 5) {
    return res.status(400).json({ error: 'Rank must be between 1 and 5' });
  }

  // Check if player already exists
  const { data: existing } = await supabase
    .from('heisman_watch')
    .select('id')
    .eq('player_name', player_name)
    .eq('team_id', team_id)
    .single();

  if (existing) {
    return res.status(409).json({ error: 'Player already on Heisman Watch list' });
  }

  const { data, error } = await supabase
    .from('heisman_watch')
    .insert([
      {
        player_name,
        team_id,
        rank,
        key_stats: key_stats || {},
        notes: notes || '',
        trophy_screenshot_url: trophy_screenshot_url || null,
        week_updated: week_updated || null
      }
    ])
    .select();

  if (error) throw error;

  return res.status(201).json({
    success: true,
    message: `${player_name} added to Heisman Watch!`,
    candidate: data[0]
  });
}

/**
 * PUT: Update candidate info
 * Body: {
 *   id: uuid,
 *   rank?: number,
 *   key_stats?: object,
 *   notes?: string,
 *   trophy_screenshot_url?: string,
 *   week_updated?: number
 * }
 */
async function updateHeismanCandidate(req, res) {
  const { id, rank, key_stats, notes, trophy_screenshot_url, week_updated } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Missing candidate ID' });
  }

  const updatePayload = {};
  if (rank !== undefined) {
    if (rank < 1 || rank > 5) {
      return res.status(400).json({ error: 'Rank must be between 1 and 5' });
    }
    updatePayload.rank = rank;
  }
  if (key_stats !== undefined) updatePayload.key_stats = key_stats;
  if (notes !== undefined) updatePayload.notes = notes;
  if (trophy_screenshot_url !== undefined) updatePayload.trophy_screenshot_url = trophy_screenshot_url;
  if (week_updated !== undefined) updatePayload.week_updated = week_updated;

  updatePayload.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('heisman_watch')
    .update(updatePayload)
    .eq('id', id)
    .select();

  if (error) throw error;

  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'Candidate not found' });
  }

  return res.status(200).json({
    success: true,
    message: 'Candidate updated!',
    candidate: data[0]
  });
}

/**
 * DELETE: Remove a Heisman candidate
 * Query: ?id=uuid
 */
async function deleteHeismanCandidate(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Missing candidate ID' });
  }

  const { data, error } = await supabase
    .from('heisman_watch')
    .delete()
    .eq('id', id)
    .select();

  if (error) throw error;

  if (!data || data.length === 0) {
    return res.status(404).json({ error: 'Candidate not found' });
  }

  return res.status(200).json({
    success: true,
    message: `Candidate removed from Heisman Watch`,
    deleted: data[0]
  });
}
