/**
 * lib/narrative.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Narrative Log Hub — Shared Utility
 *
 * All API routes use these helpers to read from and write to the narrative_log
 * table. This keeps the logic in one place instead of scattered across files.
 *
 * Usage:
 *   import { logNarrativeEvent, getNarrativeContext } from '../../lib/narrative'
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ─── Log a single narrative event ────────────────────────────────────────────
/**
 * Insert one entry into narrative_log.
 *
 * @param {Object} event
 * @param {string} event.event_type      'game' | 'moment' | 'recruiting' | 'article' | 'lore'
 * @param {number} [event.season]        Season number (default 1)
 * @param {number} [event.week]          Week number
 * @param {string} [event.featured_coach]
 * @param {string} [event.featured_team]
 * @param {string} [event.opposing_coach]
 * @param {string} [event.opposing_team]
 * @param {string} [event.title]
 * @param {string} [event.summary]
 * @param {string} [event.content]       Full text for articles/lore
 * @param {number} [event.narrative_weight]  1–5 (default 3)
 * @param {string[]} [event.momentum_tags]   e.g. ['upset', 'streak']
 * @param {boolean} [event.is_season_highlight]
 * @param {string}  [event.source_id]    ID of the originating record
 * @param {string}  [event.source_table] Table of the originating record
 * @param {Object}  [event.raw_data]     Original data blob
 * @returns {Promise<{id: string}|null>}
 */
export async function logNarrativeEvent(event) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('narrative_log')
    .insert({
      event_type:          event.event_type,
      season:              event.season ?? 1,
      week:                event.week ?? null,
      featured_coach:      event.featured_coach ?? null,
      featured_team:       event.featured_team ?? null,
      opposing_coach:      event.opposing_coach ?? null,
      opposing_team:       event.opposing_team ?? null,
      title:               event.title ?? null,
      summary:             event.summary ?? null,
      content:             event.content ?? null,
      narrative_weight:    event.narrative_weight ?? 3,
      momentum_tags:       event.momentum_tags ?? [],
      is_season_highlight: event.is_season_highlight ?? false,
      source_id:           event.source_id ?? null,
      source_table:        event.source_table ?? null,
      raw_data:            event.raw_data ?? null,
      include_in_context:  true,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[narrative] logNarrativeEvent error:', error.message);
    return null;
  }

  return data;
}

// ─── Fetch narrative context for Claude ──────────────────────────────────────
/**
 * Build a context block to inject into Claude prompts.
 * Returns the most recent, context-worthy entries as a formatted string.
 *
 * @param {Object} options
 * @param {number}  [options.season]          Filter to this season (default 1)
 * @param {number}  [options.limit]           Max entries (default 30)
 * @param {string[]} [options.eventTypes]     Filter by type, e.g. ['game', 'moment']
 * @param {boolean} [options.includeContent]  Include full article/lore content (default false)
 * @param {boolean} [options.highlightsOnly]  Only return is_season_highlight=true entries
 * @returns {Promise<{entries: Object[], contextText: string}>}
 */
export async function getNarrativeContext({
  season = 1,
  limit = 30,
  eventTypes = null,
  includeContent = false,
  highlightsOnly = false,
} = {}) {
  const supabase = getSupabase();

  let query = supabase
    .from('narrative_log')
    .select('*')
    .eq('season', season)
    .eq('include_in_context', true)
    .order('narrative_weight', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (eventTypes?.length) {
    query = query.in('event_type', eventTypes);
  }

  if (highlightsOnly) {
    query = query.eq('is_season_highlight', true);
  }

  const { data: entries, error } = await query;

  if (error) {
    console.error('[narrative] getNarrativeContext error:', error.message);
    return { entries: [], contextText: '' };
  }

  if (!entries?.length) {
    return { entries: [], contextText: 'No narrative history recorded yet.' };
  }

  // Build a human-readable context block for Claude
  const lines = [];

  // Group by event type for readability
  const games      = entries.filter(e => e.event_type === 'game');
  const moments    = entries.filter(e => e.event_type === 'moment');
  const recruiting = entries.filter(e => e.event_type === 'recruiting');
  const articles   = entries.filter(e => e.event_type === 'article');
  const lore       = entries.filter(e => e.event_type === 'lore');

  if (games.length) {
    lines.push('── RECENT GAME RESULTS ──');
    for (const g of games) {
      const tags = g.momentum_tags?.length ? ` [${g.momentum_tags.join(', ')}]` : '';
      const coaches = g.featured_coach && g.opposing_coach
        ? ` (${g.featured_coach} vs ${g.opposing_coach})`
        : (g.featured_coach ? ` (${g.featured_coach})` : '');
      lines.push(`  Wk${g.week ?? '?'}: ${g.title || g.summary}${coaches}${tags}`);
    }
  }

  if (moments.length) {
    lines.push('── KEY MOMENTS ──');
    for (const m of moments) {
      const tags = m.momentum_tags?.length ? ` [${m.momentum_tags.join(', ')}]` : '';
      lines.push(`  ${m.title || m.summary}${tags}`);
    }
  }

  if (recruiting.length) {
    lines.push('── RECRUITING ──');
    for (const r of recruiting) {
      lines.push(`  ${r.summary || r.title}`);
    }
  }

  if (articles.length) {
    lines.push('── PREVIOUSLY PUBLISHED ──');
    for (const a of articles) {
      const snippet = includeContent && a.content
        ? `\n    ${a.content.substring(0, 300)}...`
        : '';
      lines.push(`  "${a.title}"${snippet}`);
    }
  }

  if (lore.length) {
    lines.push('── DYNASTY LORE ALREADY WRITTEN ──');
    for (const l of lore) {
      const snippet = includeContent && l.content
        ? `\n    ${l.content.substring(0, 300)}...`
        : '';
      lines.push(`  "${l.title}"${snippet}`);
    }
  }

  // Build a coach streak/momentum summary
  const coachMomentum = buildCoachMomentum(entries);
  if (coachMomentum) {
    lines.push('── COACH MOMENTUM ──');
    lines.push(coachMomentum);
  }

  return {
    entries,
    contextText: lines.join('\n'),
  };
}

// ─── Mark an event as a season highlight ─────────────────────────────────────
/**
 * Elevate a narrative entry to a season highlight (included in final summary).
 *
 * @param {string} narrativeId  UUID of the narrative_log entry
 */
export async function markSeasonHighlight(narrativeId) {
  const supabase = getSupabase();
  await supabase
    .from('narrative_log')
    .update({ is_season_highlight: true })
    .eq('id', narrativeId);
}

// ─── Determine momentum tags for a game ──────────────────────────────────────
/**
 * Given a parsed game object and the coaches list, return momentum_tags and
 * narrative_weight so we don't repeat this logic everywhere.
 *
 * @param {Object} game          { home_team, away_team, home_score, away_score, week, game_type }
 * @param {Object[]} coaches     Array of coach records from Supabase
 * @param {Object[]} standings   Array of team records { team_name, wins, losses }
 * @returns {{ tags: string[], weight: number, featuredCoach: string|null, opposingCoach: string|null, winner: string|null, loser: string|null }}
 */
export function analyzeGame(game, coaches = [], standings = []) {
  const tags = [];
  let weight = 2; // default for a regular season game

  const homeScore = game.home_score ?? 0;
  const awayScore = game.away_score ?? 0;
  const margin = Math.abs(homeScore - awayScore);

  const winner     = homeScore > awayScore ? game.home_team : game.away_team;
  const loser      = homeScore > awayScore ? game.away_team : game.home_team;
  const winnerScore = Math.max(homeScore, awayScore);
  const loserScore  = Math.min(homeScore, awayScore);

  // Margin-based tags
  if (margin <= 7)  tags.push('close_game');
  if (margin >= 28) tags.push('blowout');
  if (loserScore === 0) tags.push('shutout');

  // Comeback (rough heuristic — if we only have final score, we flag close games)
  if (margin <= 3) tags.push('last_second');

  // Upset detection — loser was ranked above winner in standings
  const winnerRank = getTeamRank(winner, standings);
  const loserRank  = getTeamRank(loser, standings);
  if (winnerRank !== null && loserRank !== null && winnerRank > loserRank) {
    tags.push('upset');
    weight = Math.min(weight + 1, 5);
  }

  // Game-type weights
  if (game.game_type === 'conference_championship') {
    tags.push('championship'); weight = 4;
  } else if (game.game_type === 'bowl') {
    tags.push('bowl_game'); weight = 3;
  } else if (game.game_type === 'cfp_quarterfinal' || game.game_type === 'cfp_semifinal') {
    tags.push('playoff'); weight = 4;
  } else if (game.game_type === 'national_championship') {
    tags.push('championship'); tags.push('national_title'); weight = 5;
  }

  // Coach-duel tag — both teams are human-coached
  const findCoachByTeam = (teamName) =>
    coaches.find(c => c.team?.toLowerCase() === teamName?.toLowerCase())?.name || null;

  const featuredCoach = findCoachByTeam(winner);
  const opposingCoach = findCoachByTeam(loser);

  if (featuredCoach && opposingCoach) {
    tags.push('coach_duel');
    weight = Math.min(weight + 1, 5);
  }

  return { tags, weight, featuredCoach, opposingCoach, winner, loser, winnerScore, loserScore };
}

// ─── Internal Helpers ─────────────────────────────────────────────────────────

function getTeamRank(teamName, standings) {
  if (!teamName || !standings?.length) return null;
  const idx = standings.findIndex(
    s => s.team_name?.toLowerCase() === teamName.toLowerCase()
  );
  return idx === -1 ? null : idx + 1;
}

/**
 * Scan recent game entries and build a short coach-by-coach momentum summary.
 * e.g. "Coach A: 3-game win streak | Coach B: lost last 2"
 */
function buildCoachMomentum(entries) {
  const gameEntries = entries
    .filter(e => e.event_type === 'game' && e.featured_coach)
    .sort((a, b) => (a.week ?? 0) - (b.week ?? 0));

  if (!gameEntries.length) return null;

  // Build per-coach recent result map
  const coachResults = {};
  for (const entry of gameEntries) {
    const coach = entry.featured_coach;
    if (!coachResults[coach]) coachResults[coach] = [];
    // featured_coach is the winner
    coachResults[coach].push('W');
    if (entry.opposing_coach) {
      if (!coachResults[entry.opposing_coach]) coachResults[entry.opposing_coach] = [];
      coachResults[entry.opposing_coach].push('L');
    }
  }

  const lines = [];
  for (const [coach, results] of Object.entries(coachResults)) {
    const last = results.slice(-5);
    const streak = calcStreak(last);
    lines.push(`  ${coach}: ${last.join('-')} (${streak})`);
  }

  return lines.join('\n');
}

function calcStreak(results) {
  if (!results.length) return 'no games';
  const last = results[results.length - 1];
  let count = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    if (results[i] === last) count++;
    else break;
  }
  return count === 1 ? `1 ${last}` : `${count}-game ${last === 'W' ? 'win' : 'loss'} streak`;
}
