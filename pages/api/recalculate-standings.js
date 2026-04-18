/**
 * /api/recalculate-standings.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Commissioner tool — recomputes every team's W/L record, points for/against,
 * and win streak by counting actual final game results in the database.
 *
 * This is the source of truth: if the standings ever look wrong, run this.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pin } = req.body;
  if (!pin || pin !== process.env.COMMISSIONER_PIN) {
    return res.status(401).json({ error: 'Commissioner PIN required.' });
  }

  try {
    // ── Fetch all games that have actual scores (both sides non-null) ─────────
    const { data: finalGames, error } = await supabase
      .from('games')
      .select('home_team, away_team, home_score, away_score, week, season')
      .not('home_score', 'is', null)
      .not('away_score', 'is', null);

    if (error) throw error;

    if (!finalGames?.length) {
      return res.status(200).json({
        message: 'No completed games found — standings left unchanged.',
        teamsUpdated: 0,
      });
    }

    // ── Build per-team record from game results ───────────────────────────────
    const records = {};
    const teamGameHistory = {}; // teamName → [{ week, won }]

    for (const g of finalGames) {
      if (!g.home_team || !g.away_team) continue;
      const homeWon = (g.home_score ?? 0) > (g.away_score ?? 0);

      for (const [team, isHome] of [[g.home_team, true], [g.away_team, false]]) {
        if (!records[team]) {
          records[team] = { wins: 0, losses: 0, pts: 0, pts_against: 0, season: g.season ?? 1 };
        }
        if (!teamGameHistory[team]) teamGameHistory[team] = [];

        const won      = isHome ? homeWon : !homeWon;
        const scored   = isHome ? (g.home_score ?? 0) : (g.away_score ?? 0);
        const conceded = isHome ? (g.away_score ?? 0) : (g.home_score ?? 0);

        if (won) records[team].wins++;
        else     records[team].losses++;
        records[team].pts         += scored;
        records[team].pts_against += conceded;
        records[team].season       = g.season ?? 1;

        teamGameHistory[team].push({ week: g.week ?? 0, won });
      }
    }

    // ── Compute streak for each team ──────────────────────────────────────────
    let teamsUpdated = 0;
    for (const [team, rec] of Object.entries(records)) {
      const history = (teamGameHistory[team] || [])
        .sort((a, b) => (b.week ?? 0) - (a.week ?? 0));

      let streak = null;
      if (history.length > 0) {
        const lastResult = history[0].won;
        let count = 0;
        for (const g of history) {
          if (g.won === lastResult) count++;
          else break;
        }
        streak = (lastResult ? 'W' : 'L') + count;
      }

      const { error: upsertErr } = await supabase.from('teams').upsert({
        name:        team,
        season:      rec.season,
        wins:        rec.wins,
        losses:      rec.losses,
        pts:         rec.pts,
        pts_against: rec.pts_against,
        streak:      streak,
      }, { onConflict: 'name,season' });

      if (!upsertErr) teamsUpdated++;
    }

    return res.status(200).json({
      message: `Standings recalculated from ${finalGames.length} completed game${finalGames.length !== 1 ? 's' : ''}. ${teamsUpdated} team${teamsUpdated !== 1 ? 's' : ''} updated.`,
      gamesProcessed: finalGames.length,
      teamsUpdated,
    });

  } catch (err) {
    console.error('[recalculate-standings] error:', err);
    return res.status(500).json({ error: 'Failed to recalculate standings.', details: err.message });
  }
}
