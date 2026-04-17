/**
 * /api/narrative.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Narrative Log Hub — REST Endpoint
 *
 * GET  /api/narrative?season=1&limit=30&types=game,moment
 *   → Returns narrative context (entries + formatted text for Claude)
 *
 * POST /api/narrative
 *   → Inserts a new narrative_log entry
 *   Body: { event_type, season, week, featured_coach, ... }
 *
 * GET  /api/narrative?highlights=true&season=1
 *   → Returns only season highlight entries (for end-of-season summary)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { logNarrativeEvent, getNarrativeContext } from '../../lib/narrative';

export default async function handler(req, res) {

  // ── GET — fetch context ──────────────────────────────────────────────────
  if (req.method === 'GET') {
    const {
      season        = '1',
      limit         = '30',
      types,
      highlights    = 'false',
      includeContent = 'false',
    } = req.query;

    try {
      const eventTypes = types ? types.split(',') : null;

      const { entries, contextText } = await getNarrativeContext({
        season:         parseInt(season, 10),
        limit:          parseInt(limit, 10),
        eventTypes,
        includeContent: includeContent === 'true',
        highlightsOnly: highlights === 'true',
      });

      return res.status(200).json({ entries, contextText, count: entries.length });

    } catch (error) {
      console.error('[narrative GET] error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ── POST — insert entry ──────────────────────────────────────────────────
  if (req.method === 'POST') {
    const {
      event_type,
      season,
      week,
      featured_coach,
      featured_team,
      opposing_coach,
      opposing_team,
      title,
      summary,
      content,
      narrative_weight,
      momentum_tags,
      is_season_highlight,
      source_id,
      source_table,
      raw_data,
    } = req.body;

    if (!event_type) {
      return res.status(400).json({ error: 'event_type is required' });
    }

    try {
      const result = await logNarrativeEvent({
        event_type,
        season,
        week,
        featured_coach,
        featured_team,
        opposing_coach,
        opposing_team,
        title,
        summary,
        content,
        narrative_weight,
        momentum_tags,
        is_season_highlight,
        source_id,
        source_table,
        raw_data,
      });

      if (!result) {
        return res.status(500).json({ error: 'Failed to insert narrative entry' });
      }

      return res.status(201).json({ id: result.id, success: true });

    } catch (error) {
      console.error('[narrative POST] error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
