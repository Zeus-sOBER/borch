import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { google } from 'googleapis';

// Create client inside handler — never at module level — so env var issues
// don't cause a module-load crash that produces a 500 HTML page.
function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY  // service role bypasses RLS for writes
  );
}

export default async function handler(req, res) {
  const { method } = req;

  try {
    // ── GET: fetch top 5 candidates ────────────────────────────────────────────
    if (method === 'GET') {
      const { data, error } = await db()
        .from('heisman_watch')
        .select('*')
        .order('rank', { ascending: true })
        .limit(5);

      if (error) throw new Error(`Database error: ${error.message}`);

      return res.status(200).json({
        success: true,
        candidates: data || [],
        count: data?.length || 0,
      });
    }

    // ── POST: add candidate manually OR import from screenshot ─────────────────
    if (method === 'POST') {
      const body = req.body || {};

      // Screenshot import path: { fileId, season? }
      if (body.fileId) {
        return parseHeismanScreenshot(res, body.fileId);
      }

      // Manual add path
      const { player_name, position, team_name, coach_name, class_year, trend, rank, key_stats, notes, week_updated, season } = body;

      if (!player_name || !team_name || rank == null) {
        return res.status(400).json({
          error: 'Missing required fields: player_name, team_name, rank (1–5)',
        });
      }
      if (rank < 1 || rank > 5) {
        return res.status(400).json({ error: 'Rank must be between 1 and 5' });
      }

      // Check for duplicate
      const { data: existing } = await db()
        .from('heisman_watch')
        .select('id')
        .eq('player_name', player_name)
        .eq('team_name', team_name)
        .single();

      if (existing) {
        return res.status(409).json({ error: `${player_name} (${team_name}) is already on the Watch list` });
      }

      const { data, error } = await db()
        .from('heisman_watch')
        .insert([{
          player_name,
          position:     position     || null,
          team_name,
          coach_name:   coach_name   || null,
          class_year:   class_year   || null,
          trend:        trend        || 'same',
          rank,
          key_stats:    key_stats    || {},
          notes:        notes        || '',
          week_updated: week_updated || null,
          season:       season       || 1,
        }])
        .select();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        message: `${player_name} added to Heisman Watch!`,
        candidate: data[0],
      });
    }

    // ── PUT: update an existing candidate ──────────────────────────────────────
    if (method === 'PUT') {
      const { id, rank, position, class_year, trend, key_stats, notes, week_updated, coach_name } = req.body || {};

      if (!id) return res.status(400).json({ error: 'Missing candidate ID' });

      const patch = { updated_at: new Date().toISOString() };
      if (rank !== undefined) {
        if (rank < 1 || rank > 5) return res.status(400).json({ error: 'Rank must be 1–5' });
        patch.rank = rank;
      }
      if (position    !== undefined) patch.position    = position;
      if (class_year  !== undefined) patch.class_year  = class_year;
      if (trend       !== undefined) patch.trend       = trend;
      if (key_stats   !== undefined) patch.key_stats   = key_stats;
      if (notes       !== undefined) patch.notes       = notes;
      if (week_updated !== undefined) patch.week_updated = week_updated;
      if (coach_name  !== undefined) patch.coach_name  = coach_name;

      const { data, error } = await db()
        .from('heisman_watch')
        .update(patch)
        .eq('id', id)
        .select();

      if (error) throw error;
      if (!data?.length) return res.status(404).json({ error: 'Candidate not found' });

      return res.status(200).json({ success: true, candidate: data[0] });
    }

    // ── DELETE: remove a candidate ─────────────────────────────────────────────
    if (method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'Missing candidate ID' });

      const { data, error } = await db()
        .from('heisman_watch')
        .delete()
        .eq('id', id)
        .select();

      if (error) throw error;
      if (!data?.length) return res.status(404).json({ error: 'Candidate not found' });

      return res.status(200).json({ success: true, message: 'Candidate removed' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('Heisman Watch API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}

// ── Screenshot parser ──────────────────────────────────────────────────────────
async function parseHeismanScreenshot(res, fileId) {
  try {
    // Google Drive auth
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });
    const drive = google.drive({ version: 'v3', auth });

    // Fetch image metadata + content
    const metaRes = await drive.files.get({ fileId, fields: 'mimeType,name' });
    const mimeType = metaRes.data.mimeType;

    const fileRes = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    const base64 = Buffer.from(fileRes.data).toString('base64');

    // Ask Claude to read the Heisman Watch screen
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64 },
          },
          {
            type: 'text',
            text: `This is a Heisman Trophy Watch screen from EA Sports College Football dynasty mode.

Extract every visible candidate. Return ONLY a JSON array — no markdown, no extra text:
[
  {
    "rank": 1,
    "player_name": "Kerry Oher",
    "position": "QB",
    "team_name": "Giddings High",
    "class_year": "JR (RS)",
    "trend": "up"
  }
]

Rules:
- "rank" = position in the list (1 = top candidate)
- "position" = exactly what the POS column shows (QB, HB, WR, TE, etc.)
- "team_name" = exactly what the TEAM column shows
- "class_year" = exactly what the YEAR column shows (JR, SR, JR (RS), SR (RS), FR, SO, etc.)
- "trend" = "up" if the CHANGE arrow is green/pointing up, "down" if red/pointing down, "same" otherwise
- Do NOT invent or guess any data — only extract what is clearly visible`,
          },
        ],
      }],
    });

    const rawText = response.content[0].text.replace(/```json|```/g, '').trim();
    const candidates = JSON.parse(rawText);

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(422).json({ error: 'No candidates found in screenshot' });
    }

    // Get current season + week from league settings
    const supabase = db();
    const { data: leagueSettings } = await supabase
      .from('league_settings')
      .select('current_season, current_week')
      .eq('id', 1)
      .single();
    const season = leagueSettings?.current_season ?? 1;
    const week   = leagueSettings?.current_week   ?? null;

    // Replace all candidates for this season
    await supabase.from('heisman_watch').delete().eq('season', season);

    const toInsert = candidates.map(c => ({
      rank:         c.rank,
      player_name:  c.player_name,
      position:     c.position    || null,
      team_name:    c.team_name,
      coach_name:   c.coach_name  || null,
      class_year:   c.class_year  || null,
      trend:        c.trend       || 'same',
      key_stats:    {},
      season,
      week_updated: week,
    }));

    const { data, error } = await supabase
      .from('heisman_watch')
      .insert(toInsert)
      .select();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: `Imported ${data.length} Heisman candidates from screenshot`,
      candidates: data,
    });

  } catch (err) {
    console.error('Heisman screenshot parse error:', err);
    return res.status(500).json({ error: `Screenshot parse failed: ${err.message}` });
  }
}
