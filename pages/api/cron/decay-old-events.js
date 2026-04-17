/**
 * /api/cron/decay-old-events.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Narrative Decay Job
 *
 * Fades old events out of Claude's context window so the AI focuses on
 * recent storylines instead of events from 5+ weeks ago.
 *
 * HOW TO RUN:
 *  Option A — Vercel Cron (recommended):
 *    Add to vercel.json:
 *      { "crons": [{ "path": "/api/cron/decay-old-events", "schedule": "0 3 * * 1" }] }
 *    This runs every Monday at 3am UTC (start of each new week).
 *
 *  Option B — Manual trigger:
 *    POST /api/cron/decay-old-events
 *    with body: { "pin": "<COMMISSIONER_PIN>", "weeksOld": 4 }
 *
 * LOGIC:
 *  - Events older than N weeks (default 4) → include_in_context = false
 *  - Season highlights are NEVER faded (is_season_highlight = true)
 *  - Articles/Lore with weight >= 4 are NEVER faded (too important)
 *  - Returns a summary of how many events were faded
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';

const DECAY_AFTER_WEEKS = 4; // events older than this fade from context

export default async function handler(req, res) {
  // Allow both GET (Vercel cron) and POST (manual trigger with PIN)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Manual POST trigger requires commissioner PIN
  if (req.method === 'POST') {
    const { pin, weeksOld } = req.body || {};
    if (!pin || pin !== process.env.COMMISSIONER_PIN) {
      return res.status(401).json({ error: 'Commissioner PIN required' });
    }
  }

  // Vercel Cron Authorization (when called via GET from Vercel)
  if (req.method === 'GET') {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Still allow if no CRON_SECRET is configured (development mode)
      if (process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }
  }

  const weeksOld = req.body?.weeksOld ?? DECAY_AFTER_WEEKS;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - weeksOld * 7);
  const cutoffISO = cutoffDate.toISOString();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Step 1: Count how many events are eligible to fade
    const { count: eligible } = await supabase
      .from('narrative_log')
      .select('id', { count: 'exact', head: true })
      .eq('include_in_context', true)
      .eq('is_season_highlight', false)
      .lt('narrative_weight', 4)
      .lt('created_at', cutoffISO);

    // Step 2: Fade them — set include_in_context = false
    const { error: fadeError, count: faded } = await supabase
      .from('narrative_log')
      .update({ include_in_context: false })
      .eq('include_in_context', true)
      .eq('is_season_highlight', false)
      .lt('narrative_weight', 4) // weight 4-5 events stay in context longer
      .lt('created_at', cutoffISO)
      .select('id', { count: 'exact' });

    if (fadeError) throw fadeError;

    // Step 3: For weight 4 events, use a longer decay window (8 weeks)
    const longCutoffDate = new Date();
    longCutoffDate.setDate(longCutoffDate.getDate() - 8 * 7);
    const longCutoffISO = longCutoffDate.toISOString();

    const { error: fadeHighError, count: fadedHigh } = await supabase
      .from('narrative_log')
      .update({ include_in_context: false })
      .eq('include_in_context', true)
      .eq('is_season_highlight', false)
      .eq('narrative_weight', 4)
      .lt('created_at', longCutoffISO)
      .select('id', { count: 'exact' });

    if (fadeHighError) throw fadeHighError;

    const totalFaded = (faded ?? 0) + (fadedHigh ?? 0);

    console.log(`[decay] Faded ${totalFaded} narrative events (cutoff: ${cutoffISO})`);

    return res.status(200).json({
      success: true,
      faded: totalFaded,
      cutoff: cutoffISO,
      message: `${totalFaded} old narrative events faded from context. Season highlights and weight-5 events are preserved.`,
    });

  } catch (error) {
    console.error('[decay] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
