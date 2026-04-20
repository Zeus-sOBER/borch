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

  const { articleType, week, pin, homeTeam, awayTeam } = req.body;

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
      .eq('is_active', true)
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

    // Upcoming (unplayed) games — null scores, ordered soonest first
    const { data: scheduledGames } = await supabase
      .from('games').select('*')
      .is('home_score', null).is('away_score', null)
      .eq('is_final', false)
      .order('week', { ascending: true }).limit(40);

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

    // ── AP Rankings ──────────────────────────────────────────────────────
    const { data: leagueSettings } = await supabase
      .from('league_settings').select('ap_rankings').eq('id', 1).single();
    const apRankings = leagueSettings?.ap_rankings || [];

    // Helper: get a team's AP rank (or null)
    const getApRank = (teamName) => {
      if (!teamName || !apRankings.length) return null;
      const entry = apRankings.find(r =>
        (r.team_name || '').toLowerCase().trim() === teamName.toLowerCase().trim()
      );
      return entry ? entry.rank : null;
    };

    // Build ranked team name string: e.g. "#4 Alabama" or just "Alabama"
    const withRank = (teamName) => {
      const rank = getApRank(teamName);
      return rank ? `#${rank} ${teamName}` : teamName;
    };

    const apRankingsSummary = apRankings.length > 0
      ? apRankings.slice(0, 25).map(r => `#${r.rank} ${r.team_name}${r.record ? ` (${r.record})` : ''}`).join('\n')
      : 'AP Poll not yet available.';

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
        ? `Championships (${coachChamps.length}): ` + coachChamps.map(ch => {
            const parts = [`Season ${ch.season}`, ch.record || null];
            if (ch.opponent_team) parts.push(`def. ${ch.opponent_team}${ch.opponent_record ? ` (${ch.opponent_record})` : ''} ${ch.result || ''}`);
            return parts.filter(Boolean).join(', ');
          }).join(' | ')
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
          const apRank = getApRank(tName);
          const apBadge = apRank ? ` [AP #${apRank}]` : '';
          return `#${i + 1} ${tName} (${t.wins}-${t.losses})${champBadge}${apBadge}${coach ? ` — Coach: ${coach.name}` : ''}`;
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
      ? championships.map(ch => {
          const parts = [`Season ${ch.season}: ${ch.team_name} (Coach: ${ch.coach_name || 'unknown'}, Record: ${ch.record || '?'})`];
          if (ch.opponent_team) parts.push(`def. ${ch.opponent_team}${ch.opponent_record ? ` (${ch.opponent_record})` : ''}`);
          if (ch.result) parts.push(ch.result);
          return parts.join(' — ');
        }).join('\n')
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

AP TOP 25 RANKINGS:
${apRankingsSummary}

ABSOLUTE RULES:
1. Reference every coach by name at least once — they are the stars.
2. Only write about the ${coaches.length} human-coached teams. CPU teams don't exist.
3. NEVER invent stats, scores, or game results. Only use data explicitly provided below. If a game is not in the data, it has NOT been played — do not speculate or fabricate a score.
4. If no games have been played yet for a given team or week, say so honestly — do not fill in fictional results.
5. Adjust tone to match season phase — early = hopeful, late = urgent, playoff = electric.
6. Reference championship history where relevant — it adds legacy and stakes.
7. Tone: ESPN-professional with personality. Light rivalry trash talk welcome.
8. AP RANKINGS: Whenever you mention a team that appears in the AP Top 25, always include their ranking inline — e.g. "#4 Alabama" or "No. 4 Alabama". This applies to every mention of every ranked team throughout the article.

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

    } else if (articleType === 'league-preview') {
      // All upcoming games involving at least one human team
      const upcomingHumanGames = (scheduledGames || []).filter(g =>
        humanTeams.some(ht =>
          ht.toLowerCase() === g.home_team?.toLowerCase() ||
          ht.toLowerCase() === g.away_team?.toLowerCase()
        )
      )

      // Build a detailed block per matchup
      const matchupBlocks = upcomingHumanGames.slice(0, 10).map(g => {
        const homeTeam  = teams.find(t => (t.name || t.team_name || '').toLowerCase() === g.home_team?.toLowerCase())
        const awayTeam  = teams.find(t => (t.name || t.team_name || '').toLowerCase() === g.away_team?.toLowerCase())
        const homeCoach = coaches.find(c => c.team?.toLowerCase() === g.home_team?.toLowerCase())
        const awayCoach = coaches.find(c => c.team?.toLowerCase() === g.away_team?.toLowerCase())

        // Head-to-head history
        const h2h = (allGames || []).filter(x =>
          x.home_score !== null && x.away_score !== null &&
          ((x.home_team?.toLowerCase() === g.home_team?.toLowerCase() && x.away_team?.toLowerCase() === g.away_team?.toLowerCase()) ||
           (x.home_team?.toLowerCase() === g.away_team?.toLowerCase() && x.away_team?.toLowerCase() === g.home_team?.toLowerCase()))
        ).sort((a, b) => b.week - a.week)

        let homeH2H = 0, awayH2H = 0
        h2h.forEach(m => {
          const hw = m.home_score > m.away_score
          if ((m.home_team?.toLowerCase() === g.home_team?.toLowerCase() && hw) ||
              (m.away_team?.toLowerCase() === g.home_team?.toLowerCase() && !hw)) homeH2H++
          else awayH2H++
        })

        // Recent form (last 3 results as W/L)
        const recentForm = (teamName) => (allGames || [])
          .filter(x => x.home_score !== null && x.away_score !== null &&
            (x.home_team?.toLowerCase() === teamName.toLowerCase() ||
             x.away_team?.toLowerCase() === teamName.toLowerCase()))
          .sort((a, b) => b.week - a.week).slice(0, 3)
          .map(x => {
            const isHome = x.home_team?.toLowerCase() === teamName.toLowerCase()
            const myScore = isHome ? x.home_score : x.away_score
            const oppScore = isHome ? x.away_score : x.home_score
            return myScore > oppScore ? 'W' : 'L'
          }).join('') || 'no games yet'

        const gameWeek = g.week ?? 'unknown'
        const gameLabel = g.game_type && g.game_type !== 'regular'
          ? ` [${g.game_type.replace(/_/g, ' ')}]` : ''
        const gameNote = g.notes ? ` ⚑ ${g.notes}` : ''

        const seriesSummary = h2h.length === 0
          ? 'First meeting between these programs'
          : homeH2H === awayH2H
            ? `Series tied ${homeH2H}-${awayH2H}`
            : `${homeH2H > awayH2H ? g.home_team : g.away_team} leads series ${Math.max(homeH2H, awayH2H)}-${Math.min(homeH2H, awayH2H)}`

        const lastMeeting = h2h[0]
          ? `Last meeting (Wk ${h2h[0].week}): ${h2h[0].home_team} ${h2h[0].home_score}–${h2h[0].away_score} ${h2h[0].away_team}`
          : null

        const homeRankedLabel = withRank(g.home_team);
        const awayRankedLabel = withRank(g.away_team);
        return [
          `MATCHUP: Week ${gameWeek}${gameLabel} — ${homeRankedLabel} vs ${awayRankedLabel}${gameNote}`,
          `  ${homeRankedLabel} (${homeTeam ? `${homeTeam.wins}-${homeTeam.losses}` : 'record unknown'}${homeCoach ? `, Coach ${homeCoach.name}` : ''}) · Recent form: ${recentForm(g.home_team)}`,
          `  ${awayRankedLabel} (${awayTeam ? `${awayTeam.wins}-${awayTeam.losses}` : 'record unknown'}${awayCoach ? `, Coach ${awayCoach.name}` : ''}) · Recent form: ${recentForm(g.away_team)}`,
          `  Series: ${seriesSummary}`,
          lastMeeting ? `  ${lastMeeting}` : null,
        ].filter(Boolean).join('\n')
      }).join('\n\n')

      userPrompt = `Write a League-Wide Matchup Preview for ${weekLabel} of the Dynasty Universe season.

UPCOMING MATCHUPS:
${matchupBlocks || 'No upcoming games found between user-coached teams.'}

CURRENT STANDINGS:
${standingsSummary}

CHAMPIONSHIP HISTORY:
${championshipHistory}

WRITING RULES — follow these exactly:
1. Cover every matchup listed. Do not skip any.
2. ONLY use facts from the data above. Zero invented scores, records, or stats.
3. Do NOT predict final scores — preview the story, not the scoreboard.
4. Reference every coach by name — they are the stars of this league.
5. If a series is a first meeting, say so — that's a story in itself.
6. If a team is on a winning or losing streak (visible in their recent form), mention it.
7. Tone: crisp ESPN Sunday morning preview energy — punchy, personal, competitive.

FORMAT:
- Headline: e.g. "Week ${week || '?'} Preview: What's On The Line"
- One-sentence intro capturing the stakes of ${weekContext.phase}
- For each matchup: 2-3 tight sentences — the narrative tension, momentum, and series context
- Close with "Game of the Week" — name the most compelling matchup and the one sentence reason why

${weekContext.isPlayoff ? '⚡ PLAYOFF — elimination stakes. Every sentence should feel like it matters.' : ''}
${weekContext.isChampionship ? '🏆 CHAMPIONSHIP WEEK — legacy on the line.' : ''}`

    } else if (articleType === 'matchup-preview') {
      if (!homeTeam || !awayTeam) {
        return res.status(400).json({ error: 'homeTeam and awayTeam are required for matchup previews.' });
      }

      // Find the two coaches
      const homeCoach = coaches.find(c => c.team?.toLowerCase() === homeTeam.toLowerCase());
      const awayCoach = coaches.find(c => c.team?.toLowerCase() === awayTeam.toLowerCase());
      const homeRecord = teams.find(t => (t.name || t.team_name || '').toLowerCase() === homeTeam.toLowerCase());
      const awayRecord = teams.find(t => (t.name || t.team_name || '').toLowerCase() === awayTeam.toLowerCase());

      // All H2H games between these two teams (played only)
      const h2hGames = (allGames || []).filter(g =>
        g.home_score !== null && g.away_score !== null &&
        ((g.home_team?.toLowerCase() === homeTeam.toLowerCase() && g.away_team?.toLowerCase() === awayTeam.toLowerCase()) ||
         (g.home_team?.toLowerCase() === awayTeam.toLowerCase() && g.away_team?.toLowerCase() === homeTeam.toLowerCase()))
      ).sort((a, b) => b.week - a.week);

      let homeH2HWins = 0, awayH2HWins = 0;
      h2hGames.forEach(g => {
        const homeWon = g.home_score > g.away_score;
        if ((g.home_team?.toLowerCase() === homeTeam.toLowerCase() && homeWon) ||
            (g.away_team?.toLowerCase() === homeTeam.toLowerCase() && !homeWon)) homeH2HWins++;
        else awayH2HWins++;
      });

      // Recent form for each team (last 4 games, played only)
      const getRecent = (teamName) => (allGames || [])
        .filter(g => g.home_score !== null && g.away_score !== null &&
          (g.home_team?.toLowerCase() === teamName.toLowerCase() || g.away_team?.toLowerCase() === teamName.toLowerCase()))
        .sort((a, b) => b.week - a.week).slice(0, 4)
        .map(g => {
          const isHome = g.home_team?.toLowerCase() === teamName.toLowerCase();
          const myScore = isHome ? g.home_score : g.away_score;
          const oppScore = isHome ? g.away_score : g.home_score;
          const opp = isHome ? g.away_team : g.home_team;
          const result = myScore > oppScore ? 'W' : 'L';
          const label = g.game_type && g.game_type !== 'regular' ? ` [${g.game_type.replace(/_/g, ' ')}]` : '';
          return `${result} vs ${opp} ${myScore}-${oppScore} (Wk${g.week}${label})`;
        }).join(', ');

      // Key players for both teams
      const homePlayers = players.filter(p => p.team?.toLowerCase() === homeTeam.toLowerCase()).slice(0, 5);
      const awayPlayers = players.filter(p => p.team?.toLowerCase() === awayTeam.toLowerCase()).slice(0, 5);

      const formatPlayers = (ps) => ps.length > 0
        ? ps.map(p => `${p.name} (${p.pos || 'unknown'}) — ${p.yards || 0} yds, ${p.touchdowns || 0} TDs`).join('\n')
        : 'No player stats on record.';

      const h2hSummary = h2hGames.length === 0
        ? 'No previous meetings on record — this would be the first time these programs have met.'
        : `Series record: ${homeTeam} leads ${homeH2HWins}-${awayH2HWins}` + (homeH2HWins === awayH2HWins ? ' (TIED)' : '') +
          `\n\nAll meetings:\n` +
          h2hGames.map(g => `  Week ${g.week}${g.game_type && g.game_type !== 'regular' ? ` [${g.game_type.replace(/_/g, ' ')}]` : ''}: ${g.home_team} ${g.home_score} — ${g.away_score} ${g.away_team}`).join('\n');

      const homeRanked = withRank(homeTeam);
      const awayRanked = withRank(awayTeam);
      const homeApRankNote = getApRank(homeTeam) ? `AP Rank: #${getApRank(homeTeam)}` : 'AP Rank: Unranked';
      const awayApRankNote = getApRank(awayTeam) ? `AP Rank: #${getApRank(awayTeam)}` : 'AP Rank: Unranked';

      // Find this specific matchup's notes from scheduled games
      const matchupGame = (scheduledGames || []).find(g =>
        (g.home_team?.toLowerCase() === homeTeam.toLowerCase() && g.away_team?.toLowerCase() === awayTeam.toLowerCase()) ||
        (g.home_team?.toLowerCase() === awayTeam.toLowerCase() && g.away_team?.toLowerCase() === homeTeam.toLowerCase())
      );
      const matchupNotes = matchupGame?.notes || null;

      userPrompt = `Write a Matchup Preview article for Week ${week || '?'} (${weekContext.phase}) of the Dynasty Universe season.

MATCHUP:
${homeRanked} (Home) vs ${awayRanked} (Away)
Week: ${week || 'unknown'} — ${weekContext.phase}${matchupNotes ? `\nCommissioner note: "${matchupNotes}" — work this context into the article.` : ''}

${homeTeam.toUpperCase()} — coached by ${homeCoach?.name || 'unknown'}:
${homeApRankNote}
Record: ${homeRecord ? `${homeRecord.wins}-${homeRecord.losses}` : 'unknown'}
Points For: ${homeRecord?.pts ?? 'not tracked'} | Points Against: ${homeRecord?.pts_against ?? 'not tracked'}
Coach style: ${homeCoach?.coaching_style || 'not on record'}
Recent form: ${getRecent(homeTeam) || 'no games on record'}
${homeCoach?.bio ? `Coach bio: ${homeCoach.bio}` : ''}
Key players:
${formatPlayers(homePlayers)}

${awayTeam.toUpperCase()} — coached by ${awayCoach?.name || 'unknown'}:
${awayApRankNote}
Record: ${awayRecord ? `${awayRecord.wins}-${awayRecord.losses}` : 'unknown'}
Points For: ${awayRecord?.pts ?? 'not tracked'} | Points Against: ${awayRecord?.pts_against ?? 'not tracked'}
Coach style: ${awayCoach?.coaching_style || 'not on record'}
Recent form: ${getRecent(awayTeam) || 'no games on record'}
${awayCoach?.bio ? `Coach bio: ${awayCoach.bio}` : ''}
Key players:
${formatPlayers(awayPlayers)}

HEAD-TO-HEAD HISTORY:
${h2hSummary}

CHAMPIONSHIP HISTORY (relevant to either team):
${(championships || []).filter(ch =>
  ch.team_name?.toLowerCase() === homeTeam.toLowerCase() ||
  ch.team_name?.toLowerCase() === awayTeam.toLowerCase()
).map(ch => `Season ${ch.season}: ${ch.team_name} (${ch.record || 'record unknown'})`).join('\n') || 'Neither team has a championship on record.'}

WRITING RULES (follow exactly):
1. Write 350-500 words. No fluff.
2. Only reference facts from the data above. Zero invented scores, stats, or game results.
3. If H2H history is empty, say clearly that these programs have never met and this is a first meeting.
4. Do NOT predict a final score — this is a preview, not a prediction column.
5. You CAN note which team has momentum based on their recent form.
6. Reference both coaches by name — they are the story.
7. Tone: sharp ESPN pregame energy. Build anticipation without making things up.
8. End with one sentence about what this game means in the context of ${weekContext.phase}.

FORMAT:
- Headline (no label needed, just write it)
- 2-3 paragraphs of preview copy
- "Keys to the Game" — 2 bullet points per team, grounded in the data
- One closing line`;

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
    const title = articleType === 'matchup-preview'
      ? `Matchup Preview: ${homeTeam} vs ${awayTeam}${week ? ` — Week ${week}` : ''}`
      : articleType === 'league-preview'
        ? `League Preview${week ? ` — Week ${week}` : ''} (${weekContext.phase})`
        : articleType.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) +
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
