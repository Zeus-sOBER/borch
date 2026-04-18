/**
 * /api/generate-article.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Dynasty Universe — Article Generator (Definitive Version)
 *
 * Merges:
 *  - CFB schedule phase awareness (getCFBWeekContext)
 *  - Championship history in coach profiles + standings
 *  - Playoff/regular game separation
 *  - Full narrative timeline context (lib/narrative)
 *  - Saves article back to narrative hub for continuity
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { getNarrativeContext, logNarrativeEvent } from '../../lib/narrative';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── CFB Schedule Phase Awareness ────────────────────────────────────────────
function getCFBWeekContext(week) {
  if (!week) return { phase: 'regular season', description: 'mid-season', isBowl: false, isPlayoff: false, isChampionship: false };

  const w = parseInt(week);
  if (w <= 4) return {
    phase: 'early regular season',
    description: 'Teams are still establishing identity. Non-conference matchups dominate. Records are fresh.',
    isBowl: false, isPlayoff: false, isChampionship: false
  };
  if (w <= 9) return {
    phase: 'mid regular season',
    description: 'Conference play is underway. Division races are taking shape. Every loss stings more now.',
    isBowl: false, isPlayoff: false, isChampionship: false
  };
  if (w <= 13) return {
    phase: 'late regular season',
    description: 'Conference title races are heating up. Rivalry week looms. CFP positioning is everything.',
    isBowl: false, isPlayoff: false, isChampionship: false
  };
  if (w === 14) return {
    phase: 'conference championships',
    description: 'Conference championship week. Only the best two teams in each conference are here. Trophies and CFP bids on the line.',
    isBowl: false, isPlayoff: false, isChampionship: true
  };
  if (w === 15) return {
    phase: 'CFP first round / bowl selection',
    description: 'The CFP bracket is set. 12 teams remain. Bowl matchups announced for the rest. The road to the national title begins.',
    isBowl: true, isPlayoff: true, isChampionship: false
  };
  if (w === 16) return {
    phase: 'CFP quarterfinals',
    description: 'CFP Quarterfinals. Only 8 teams left. One loss and your season is over.',
    isBowl: true, isPlayoff: true, isChampionship: false
  };
  if (w === 17) return {
    phase: 'CFP semifinals',
    description: 'CFP Semifinals. Four teams. Two spots in the National Championship.',
    isBowl: true, isPlayoff: true, isChampionship: false
  };
  if (w >= 18) return {
    phase: 'national championship',
    description: 'The National Championship Game. One game. One champion. Dynasty legacy on the line.',
    isBowl: true, isPlayoff: true, isChampionship: true
  };
  return { phase: 'regular season', description: '', isBowl: false, isPlayoff: false, isChampionship: false };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { articleType, week, pin } = req.body;

  if (!pin || pin !== process.env.COMMISSIONER_PIN) {
    return res.status(401).json({ error: 'Commissioner PIN required to generate articles.' });
  }
  if (!articleType) {
    return res.status(400).json({ error: 'articleType is required' });
  }

  try {
    // ── Coaches — the foundation of everything ───────────────────────────
    const { data: coaches, error: coachErr } = await supabase
      .from('coaches')
      .select('*')
      .order('created_at', { ascending: true });

    if (coachErr) throw coachErr;
    if (!coaches || coaches.length === 0) {
      return res.status(400).json({
        error: 'No coaches found. Add your coaches on the Coaches page before generating articles.'
      });
    }

    const humanTeams = coaches.map(c => c.team).filter(Boolean);

    // ── CFB schedule phase for this week ─────────────────────────────────
    const weekContext = getCFBWeekContext(week);

    // ── Standings (human teams only) ─────────────────────────────────────
    const { data: allTeams } = await supabase
      .from('teams').select('*').order('wins', { ascending: false });

    const teams = (allTeams || []).filter(t =>
      humanTeams.some(ht => ht.toLowerCase() === (t.name || t.team_name || '').toLowerCase())
    );

    // ── Games (human teams, separated by type) ───────────────────────────
    const { data: allGames } = await supabase
      .from('games').select('*').order('week', { ascending: false }).limit(60);

    const games = (allGames || []).filter(g =>
      humanTeams.some(ht =>
        ht.toLowerCase() === g.home_team?.toLowerCase() ||
        ht.toLowerCase() === g.away_team?.toLowerCase()
      ) && g.home_score !== null && g.away_score !== null  // Only include games that have been played
    );

    const regularGames = games.filter(g => !g.game_type || g.game_type === 'regular').slice(0, 15);
    const playoffGames = games.filter(g => g.game_type && g.game_type !== 'regular').slice(0, 10);

    // ── Players (human teams only) ───────────────────────────────────────
    const { data: allPlayers } = await supabase
      .from('players').select('*').order('yards', { ascending: false }).limit(50);

    const players = (allPlayers || []).filter(p =>
      humanTeams.some(ht => ht.toLowerCase() === p.team?.toLowerCase())
    ).slice(0, 15);

    // ── Championship history ─────────────────────────────────────────────
    const { data: championships } = await supabase
      .from('championships').select('*').order('season', { ascending: false }).limit(10);

    // ── Build rich coach profiles ────────────────────────────────────────
    const coachProfiles = coaches.map(c => {
      const teamRecord = teams.find(t => (t.name || t.team_name || '').toLowerCase() === c.team?.toLowerCase());
      const record = teamRecord
        ? `${teamRecord.wins}-${teamRecord.losses}`
        : (c.record || 'record unknown');

      const coachGames = games.filter(g =>
        (g.home_team?.toLowerCase() === c.team?.toLowerCase() ||
        g.away_team?.toLowerCase() === c.team?.toLowerCase()) &&
        g.home_score !== null && g.away_score !== null  // Only played games
      ).slice(0, 5);

      const recentResults = coachGames.map(g => {
        const isHome = g.home_team?.toLowerCase() === c.team?.toLowerCase();
        const myScore  = isHome ? g.home_score : g.away_score;
        const oppScore = isHome ? g.away_score : g.home_score;
        const opponent = isHome ? g.away_team : g.home_team;
        const result   = myScore > oppScore ? 'W' : 'L';
        const gameLabel = g.game_type && g.game_type !== 'regular'
          ? ` [${g.game_type.replace(/_/g, ' ')}]` : '';
        return `${result} vs ${opponent} (${myScore}-${oppScore}, Wk${g.week}${gameLabel})`;
      }).join(', ');

      // Past championships for this coach
      const coachChamps = (championships || []).filter(ch =>
        ch.team_name?.toLowerCase() === c.team?.toLowerCase() ||
        ch.coach_name?.toLowerCase() === c.name?.toLowerCase()
      );
      const champStr = coachChamps.length > 0
        ? `Championships: ${coachChamps.map(ch => `Season ${ch.season} ${ch.notes ? `(${ch.notes})` : ''} — ${ch.record || ''}`).join(', ')}`
        : 'No championships yet';

      return [
        `Coach: ${c.name} | Team: ${c.team} | Record: ${record}`,
        c.coaching_style ? `  Style: ${c.coaching_style}` : '',
        c.bio        ? `  Bio: ${c.bio}` : '',
        recentResults ? `  Recent: ${recentResults}` : '',
        `  ${champStr}`
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    // ── Standings summary with championship badges ────────────────────────
    const standingsSummary = teams.length > 0
      ? teams.map((t, i) => {
          const tName = t.name || t.team_name || ''
          const coach = coaches.find(c => c.team?.toLowerCase() === tName.toLowerCase());
          const champs = (championships || []).filter(
            ch => ch.team_name?.toLowerCase() === tName.toLowerCase()
          );
          const champBadge = champs.length > 0 ? ` 🏆x${champs.length}` : '';
          return `#${i + 1} ${tName} (${t.wins}-${t.losses})${champBadge}${coach ? ` — Coach: ${coach.name}` : ''}`;
        }).join('\n')
      : 'No standings data yet.';

    // ── Players summary ───────────────────────────────────────────────────
    const playersSummary = players.length > 0
      ? players.map(p => {
          const coach = coaches.find(c => c.team?.toLowerCase() === p.team?.toLowerCase());
          return `${p.name} (${p.team}${coach ? `, Coach ${coach.name}` : ''}) — ${p.yards || 0} yds, ${p.touchdowns || 0} TDs`;
        }).join('\n')
      : 'No player stats tracked yet.';

    // ── Championship history text ─────────────────────────────────────────
    const championshipHistory = (championships || []).length > 0
      ? championships.map(ch =>
          `Season ${ch.season}: ${ch.team_name} (Coach: ${ch.coach_name || 'unknown'}, Record: ${ch.record || 'unknown'})`
        ).join('\n')
      : 'No championships recorded yet.';

    // ── Games formatted by type ───────────────────────────────────────────
    const allGamesSummary = [
      ...(playoffGames.length > 0
        ? [`PLAYOFF/BOWL GAMES:\n${playoffGames.map(g => `Week ${g.week} [${g.game_type?.replace(/_/g, ' ')}]: ${g.home_team} ${g.home_score} - ${g.away_score} ${g.away_team}`).join('\n')}`]
        : []),
      ...(regularGames.length > 0
        ? [`REGULAR SEASON GAMES:\n${regularGames.map(g => `Week ${g.week}: ${g.home_team} ${g.home_score} - ${g.away_score} ${g.away_team}`).join('\n')}`]
        : []),
    ].join('\n\n') || 'No games recorded yet.';

    // ── Pull full narrative timeline (the season story so far) ────────────
    const { contextText: narrativeContext } = await getNarrativeContext({
      season: 1,
      limit:  40,
      eventTypes: ['game', 'moment', 'article', 'lore'],
    });

    // ── System prompt: CFB-aware + narrative-aware ────────────────────────
    const systemPrompt = `You are the lead writer for Dynasty Universe, a college football dynasty league media hub.

CURRENT SEASON CONTEXT:
- Week: ${week || 'unknown'} — ${weekContext.phase.toUpperCase()}
- ${weekContext.description}
- Playoff/bowl period: ${weekContext.isPlayoff ? 'YES' : 'NO'}
- Championship week: ${weekContext.isChampionship ? 'YES' : 'NO'}

COLLEGE FOOTBALL SCHEDULE:
- Weeks 1-4: Early regular season, non-conference, records forming
- Weeks 5-9: Conference play, division races taking shape
- Weeks 10-13: Late regular season, rivalry week, CFP positioning critical
- Week 14: Conference Championships — only top 2 per conference qualify
- Week 15: CFP bracket set (12-team playoff), bowls announced
- Weeks 16-17: CFP Quarterfinals and Semifinals
- Week 18+: National Championship Game

ABSOLUTE RULES:
1. Reference every coach by name at least once — they are the stars.
2. Only write about the ${coaches.length} human-coached teams. CPU teams don't exist.
3. NEVER invent stats, scores, or game results. Only use data explicitly provided below. If a game is not in the data, it has NOT been played — do not speculate or fabricate a score.
4. If no games have been played yet for a given team or week, say so honestly — do not fill in fictional results.
5. Adjust tone to match season phase — early = hopeful, late = urgent, playoff = electric.
6. Reference championship history where relevant — it adds legacy and stakes.
7. Tone: ESPN-professional with personality. Light rivalry trash talk welcome.

THE ${coaches.length} COACHES IN THIS LEAGUE:
${coachProfiles}

FULL SEASON NARRATIVE TIMELINE (reference streaks, upsets, and arcs — build continuity, don't repeat what's already been written):
${narrativeContext || 'No narrative history yet — this is the first article of the season.'}`;

    // ── Article-specific prompts ──────────────────────────────────────────
    let userPrompt = '';
    const weekLabel = week ? `Week ${week} (${weekContext.phase})` : 'the current week';

    if (articleType === 'power-rankings') {
      userPrompt = `Write Power Rankings for ${weekLabel} of the Dynasty Universe season.

STANDINGS:
${standingsSummary}

GAMES:
${allGamesSummary}

TOP PLAYERS:
${playersSummary}

CHAMPIONSHIP HISTORY:
${championshipHistory}

FORMAT:
- Open with a 2-sentence intro that captures the mood of ${weekContext.phase}
- Rank ALL ${coaches.length} coaches from #1 to last
- For each: rank, team, coach name, 2-3 sentences — reference record, recent results, coaching style, and ${weekContext.isPlayoff ? 'playoff positioning' : 'upcoming schedule difficulty'}
- If any coach has a championship, acknowledge their legacy
- "Hot Seat": coach most under pressure given week ${week || '?'} and why
- Closing teaser: the most important upcoming matchup for ${weekContext.phase}

${weekContext.isChampionship ? '⚡ CHAMPIONSHIP WEEK — write with championship-level drama.' : ''}
${weekContext.isPlayoff && !weekContext.isChampionship ? '🏈 PLAYOFF — every game is elimination. Write with urgency.' : ''}`;

    } else if (articleType === 'weekly-recap') {
      userPrompt = `Write a Weekly Recap for ${weekLabel} of the Dynasty Universe season.

GAMES:
${allGamesSummary}

STANDINGS:
${standingsSummary}

TOP PLAYERS:
${playersSummary}

FORMAT:
- Headline capturing the biggest moment of ${weekContext.phase}
- Season context opener: one sentence on what this week meant in the bigger picture
- "Game of the Week": most significant result — name both coaches, describe dramatically
- "Winners & Losers": 2-3 coaches who helped themselves, 1-2 who hurt themselves
- "Stat of the Week": standout player performance tied to their coach's scheme
- "The Road Ahead": which coaches face must-win situations in week ${(parseInt(week) || 1) + 1} given ${weekContext.phase}

${weekContext.isPlayoff ? '🏈 Playoff time — eliminated coaches mentioned with dignity, advancing coaches get the drama treatment.' : ''}`;

    } else if (articleType === 'player-spotlight') {
      userPrompt = `Write a Player Spotlight for ${weekLabel} of the Dynasty Universe season.

TOP PLAYERS:
${playersSummary}

COACH PROFILES:
${coachProfiles}

FORMAT:
- Pick the most statistically impressive player
- Headline naming player and team
- Opening: who is this player, what have they done — framed within ${weekContext.phase}
- "The Coach's Weapon": how their coach has built the offense around this player
- Stats breakdown from real data only
- "Dynasty Impact": what does this player mean for their coach's ${weekContext.isPlayoff ? 'playoff run' : 'championship hopes'}
- Simulated coach quote (labeled clearly as simulated)`;

    } else if (articleType === 'rivalry-breakdown') {
      userPrompt = `Write a Rivalry Breakdown for ${weekLabel} of the Dynasty Universe season.

ALL COACHES:
${coachProfiles}

GAMES:
${allGamesSummary}

CHAMPIONSHIP HISTORY:
${championshipHistory}

FORMAT:
- Identify the two coaches with the best rivalry (head-to-head, standings proximity, contrasting styles, championship competition)
- Headline naming both coaches
- "The Setup": how did this rivalry form — records, history, ${weekContext.phase} implications
- "Coach vs Coach": styles, records, approaches — personal but respectful
- "The Stakes": what each coach needs from their next meeting at this point in ${weekContext.phase}
- If either has a championship, use it — dynasties raise rivalry stakes
- "Prediction": pick a winner, explain why
- One closing line both coaches would screenshot and send to the group chat

${weekContext.isPlayoff ? '⚡ If these coaches could meet in the playoffs, make that the central tension.' : ''}`;
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const article = response.content[0].text;

    // ── Save to articles table ────────────────────────────────────────────
    const title = articleType
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase()) +
      (week ? ` — Week ${week} (${weekContext.phase})` : '');

    await supabase.from('articles').insert({
      article_type: articleType,
      week:         week || null,
      title,
      content:      article,
      edited_by:    'commissioner'
    });

    // ── Log to Narrative Hub so future Claude calls build on this ─────────
    await logNarrativeEvent({
      event_type:          'article',
      season:              1,
      week:                week || null,
      title,
      summary:             `${title} — generated by commissioner`,
      content:             article,
      narrative_weight:    articleType === 'power-rankings' ? 4 : 3,
      momentum_tags:       [articleType, weekContext.phase.replace(/\s/g, '_')],
      is_season_highlight: articleType === 'power-rankings' || weekContext.isChampionship,
      source_table:        'articles',
    }).catch(err => console.error('[narrative] article log error:', err.message));

    res.status(200).json({ article, weekContext });

  } catch (error) {
    console.error('Article generation error:', error);
    res.status(500).json({ error: 'Failed to generate article', details: error.message });
  }
}
