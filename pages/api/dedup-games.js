/**
 * /api/dedup-games.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Commissioner tool — finds and removes duplicate game rows from the database.
 *
 * Two rows are considered duplicates if they share the same season, week, and
 * the same pair of teams — regardless of which team is listed as home vs away.
 * e.g. "Alabama vs Auburn Wk7 S1" and "Auburn vs Alabama Wk7 S1" are the same game.
 *
 * When duplicates are found, the "best" row is kept using this priority:
 *   1. is_final = true  AND  has real scores  (highest priority — the real result)
 *   2. is_final = true  but  scores are null  (flagged final but incomplete)
 *   3. is_final = false                        (just a scheduled placeholder)
 *   Tiebreak: lowest database id (oldest insert) wins.
 *
 * Also cleans the narrative_log table of duplicate game entries.
 *
 * POST /api/dedup-games   { pin: "<COMMISSIONER_PIN>" }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pin, dryRun = false } = req.body || {};
  if (!pin || pin !== process.env.COMMISSIONER_PIN) {
    return res.status(401).json({ error: 'Commissioner PIN required.' });
  }

  try {
    // ── 1. Fetch every game row ───────────────────────────────────────────────
    const { data: allGames, error: fetchErr } = await supabase
      .from('games')
      .select('id, season, week, home_team, away_team, home_score, away_score, is_final, game_type, notes, created_at')
      .order('id', { ascending: true }); // oldest first so tiebreak prefers the original insert

    if (fetchErr) throw fetchErr;
    if (!allGames?.length) {
      return res.status(200).json({ message: 'No games found.', duplicatesRemoved: 0 });
    }

    // ── 2. Group rows by canonical key ────────────────────────────────────────
    // Key = "season|week|teamA|teamB" where teams are sorted so home/away order
    // doesn't matter.
    const norm     = (s) => (s || '').toLowerCase().trim();
    const makeKey  = (g) =>
      `${g.season ?? 1}|${g.week ?? 0}|${[norm(g.home_team), norm(g.away_team)].sort().join('|')}`;

    const groups = {}; // key → [row, ...]
    for (const g of allGames) {
      if (!g.home_team || !g.away_team) continue;
      const key = makeKey(g);
      if (!groups[key]) groups[key] = [];
      groups[key].push(g);
    }

    // ── 3. Within each group, pick the best row and collect the rest to delete ─
    const toDelete = [];
    const duplicateGroups = [];

    for (const [key, rows] of Object.entries(groups)) {
      if (rows.length <= 1) continue; // no dupe — skip

      // Score each row: higher = better to keep
      const score = (r) => {
        const hasReal = r.home_score !== null && r.away_score !== null &&
          !(r.home_score === 0 && r.away_score === 0);
        if (r.is_final && hasReal) return 3;
        if (r.is_final)            return 2;
        return 1;
      };

      // Sort descending by score; tiebreak by id ascending (oldest first)
      const sorted = [...rows].sort((a, b) => {
        const scoreDiff = score(b) - score(a);
        if (scoreDiff !== 0) return scoreDiff;
        return (a.id ?? 0) - (b.id ?? 0); // lower id = older = preferred
      });

      const [keep, ...dupes] = sorted;
      duplicateGroups.push({
        key,
        kept: { id: keep.id, home: keep.home_team, away: keep.away_team, week: keep.week, is_final: keep.is_final, scores: `${keep.home_score}-${keep.away_score}` },
        removing: dupes.map(d => ({ id: d.id, home: d.home_team, away: d.away_team, is_final: d.is_final, scores: `${d.home_score}-${d.away_score}` })),
      });
      toDelete.push(...dupes.map(d => d.id));
    }

    if (toDelete.length === 0) {
      return res.status(200).json({
        message: 'No duplicate games found — database is clean ✓',
        duplicatesRemoved: 0,
        groupsChecked: Object.keys(groups).length,
      });
    }

    // ── 4. Delete duplicates (unless dry run) ─────────────────────────────────
    let deletedGames = 0;
    let deletedNarrative = 0;

    if (!dryRun) {
      // Delete in batches of 50 to stay within Supabase URL length limits
      const BATCH = 50;
      for (let i = 0; i < toDelete.length; i += BATCH) {
        const batch = toDelete.slice(i, i + BATCH);
        const { error: delErr } = await supabase
          .from('games')
          .delete()
          .in('id', batch);
        if (delErr) {
          console.error('[dedup-games] delete error:', delErr.message);
        } else {
          deletedGames += batch.length;
        }
      }

      // ── 5. Dedup narrative_log game entries too ────────────────────────────
      // Same logic: group by season|week|teamA|teamB sorted, keep highest weight,
      // delete the rest.
      const { data: narrativeRows } = await supabase
        .from('narrative_log')
        .select('id, season, week, featured_team, opposing_team, narrative_weight, created_at')
        .eq('event_type', 'game')
        .order('id', { ascending: true });

      if (narrativeRows?.length) {
        const nGroups = {};
        for (const n of narrativeRows) {
          if (!n.featured_team || !n.opposing_team) continue;
          const nKey = `${n.season ?? 1}|${n.week ?? 0}|${[norm(n.featured_team), norm(n.opposing_team)].sort().join('|')}`;
          if (!nGroups[nKey]) nGroups[nKey] = [];
          nGroups[nKey].push(n);
        }

        const nToDelete = [];
        for (const rows of Object.values(nGroups)) {
          if (rows.length <= 1) continue;
          // Keep the one with highest narrative_weight; tiebreak oldest id
          const sorted = [...rows].sort((a, b) => {
            const wDiff = (b.narrative_weight ?? 0) - (a.narrative_weight ?? 0);
            if (wDiff !== 0) return wDiff;
            return (a.id ?? '').localeCompare(b.id ?? '');
          });
          const [, ...dupes] = sorted;
          nToDelete.push(...dupes.map(d => d.id));
        }

        for (let i = 0; i < nToDelete.length; i += BATCH) {
          const batch = nToDelete.slice(i, i + BATCH);
          const { error: nDelErr } = await supabase
            .from('narrative_log')
            .delete()
            .in('id', batch);
          if (!nDelErr) deletedNarrative += batch.length;
        }
      }
    }

    return res.status(200).json({
      success: true,
      dryRun,
      message: dryRun
        ? `Dry run: would remove ${toDelete.length} duplicate game row(s) across ${duplicateGroups.length} matchup(s).`
        : `Removed ${deletedGames} duplicate game row(s) across ${duplicateGroups.length} matchup(s). Also cleaned ${deletedNarrative} duplicate narrative log entries.`,
      duplicatesRemoved: dryRun ? 0 : deletedGames,
      narrativeEntriesRemoved: dryRun ? 0 : deletedNarrative,
      duplicateGroups, // full detail of what was (or would be) removed
    });

  } catch (err) {
    console.error('[dedup-games] error:', err);
    return res.status(500).json({ error: 'Dedup failed', details: err.message });
  }
}
