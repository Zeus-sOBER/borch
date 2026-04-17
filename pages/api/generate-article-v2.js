import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── CFB Schedule Logic ───────────────────────────────────────────────────────
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
    // Pull coaches — foundation of everything
    const { data: coaches, error: coachErr } = await supabase
      .from('coaches').select('*').order('created_at', { ascending: true });

    if (coachErr) throw coachErr;
    if (!coaches || coaches.length === 0) {
      return res.status(400).json({
        error: 'No coaches found. Add your coaches on the Coaches page before generating articles.'
      });
    }

    const humanTeams = coaches.map(c => c.team).filter(Boolean);

    // Get week context for CFB schedule awareness
    const weekContext = getCFBWeekContext(week);

    // Pull standings for human teams only
    const { data: allTeams } = await supabase
      .from('teams').select('*').order('wins', { ascending: false });
    const teams = (allTeams || []).filter(t =>
      humanTeams.some(ht => ht.toLowerCase() === t.team_name?.toLowerCase())
    );

    // Pull recent games involving human teams
    const { data: allGames } = await supabase
      .from('games').select('*').order('week', { ascending: false }).limit(60);
    const games = (allGames || []).filter(g =>
      humanTeams.some(ht =>
        ht.toLowerCase() === g.home_team?.toLowerCase() ||
        ht.toLowerCase() === g.away_team?.toLowerCase()
      )
    );

    // Separate games by type for CFB context
    const regularGames = games.filter(g => !g.game_type || g.game_type === 'regular').slice(0, 15);
    const playoffGames = games.filter(g => g.game_type && g.game_type !== 'regular').slice(0, 10);

    // Pull players from human teams
    const { data: allPlayers } = await supabase
      .from('players').select('*').order('yards', { ascending: false }).limit(50);
    const players = (allPlayers || []).filter(p =>
      humanTeams.some(ht => ht.toLowerCase() === p.team?.toLowerCase())
    ).slice(0, 15);

    // Pull past championships
    const { data: championships } = await supabase
      .from('championships').select('*').order('season', { ascending: false }).limit(10);

    // Build coach profiles with records + recent results
    const coachProfiles = coaches.map(c => {
      const teamRecord = teams.find(t => t.team_name?.toLowerCase() === c.team?.toLowerCase());
      const record = teamRecord ? `${teamRecord.wins}-${teamRecord.losses}` : (c.record || 'record unknown');

      const coachGames = games.filter(g =>
        g.home_team?.toLowerCase() === c.team?.toLowerCase() ||
        g.away_team?.toLowerCase() === c.team?.toLowerCase()
      ).slice(0, 5);

      const recentResults = coachGames.map(g => {
        const isHome = g.home_team?.toLowerCase() === c.team?.toLowerCase();
        const myScore = isHome ? g.home_score : g.away_score;
        const oppScore = isHome ? g.away_score : g.home_score;
        const opponent = isHome ? g.away_team : g.home_team;
        const result = myScore > oppScore ? 'W' : 'L';
        const gameLabel = g.game_type && g.game_type !== 'regular' ? ` [${g.game_type}]` : '';
        return `${result} vs ${opponent} (${myScore}-${oppScore}, Wk${g.week}${gameLabel})`;
      }).join(', ');

      // Past championships for this coach
      const coachChamps = (championships || []).filter(ch =>
        ch.team_name?.toLowerCase() === c.team?.toLowerCase() ||
        ch.coach_name?.toLowerCase() === c.name?.toLowerCase()
      );
      const champStr = coachChamps.length > 0
        ? `Championships: ${coachChamps.map(ch => `Season ${ch.season} (${ch.record || ''})`).join(', ')}`
        : 'No championships yet';

      return [
        `Coach: ${c.name} | Team: ${c.team} | Record: ${record}`,
        c.coaching_style ? `  Style: ${c.coaching_style}` : '',
        c.bio ? `  Bio: ${c.bio}` : '',
        recentResults ? `  Recent: ${recentResults}` : '',
        `  ${champStr}`
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    const standingsSummary = teams.length > 0
      ? teams.map((t, i) => {
          const coach = coaches.find(c => c.team?.toLowerCase() === t.team_name?.toLowerCase());
          const champs = (championships || []).filter(ch => ch.team_name?.toLowerCase() === t.team_name?.toLowerCase());
          const champBadge = champs.length > 0 ? ` 🏆x${champs.length}` : '';
          return `#${i + 1} ${t.team_name} (${t.wins}-${t.losses})${champBadge}${coach ? ` — Coach: ${coach.name}` : ''}`;
        }).join('\n')
      : 'No standings data yet.';

    const playersSummary = players.length > 0
      ? players.map(p => {
          const coach = coaches.find(c => c.team?.toLowerCase() === p.team?.toLowerCase());
          return `${p.name} (${p.team}${coach ? `, Coach ${coach.name}` : ''}) — ${p.yards || 0} yds, ${p.touchdowns || 0} TDs`;
        }).join('\n')
      : 'No player stats tracked yet.';

    const championshipHistory = (championships || []).length > 0
      ? championships.map(ch =>
          `Season ${ch.season}: ${ch.team_name} (Coach: ${ch.coach_name || 'unknown'}, Record: ${ch.record || 'unknown'})`
        ).join('\n')
      : 'No championships recorded yet.';

    const allGamesSummary = [
      ...(playoffGames.length > 0 ? [`PLAYOFF/BOWL GAMES:\n${playoffGames.map(g => `Week ${g.week} [${g.game_type}]: ${g.home_team} ${g.home_score} - ${g.away_score} ${g.away_team}`).join('\n')}`] : []),
      ...(regularGames.length > 0 ? [`REGULAR SEASON GAMES:\n${regularGames.map(g => `Week ${g.week}: ${g.home_team} ${g.home_score} - ${g.away_score} ${g.away_team}`).join('\n')}`] : []),
    ].join('\n\n') || 'No games recorded yet.';

    // System prompt with full CFB awareness
    const systemPrompt = `You are the lead writer for Dynasty Universe, a college football dynasty league media hub.

CURRENT SEASON CONTEXT:
- Week: ${week || 'unknown'} — ${weekContext.phase.toUpperCase()}
- ${weekContext.description}
- Is playoff/bowl period: ${weekContext.isPlayoff ? 'YES' : 'NO'}
- Is championship week: ${weekContext.isChampionship ? 'YES' : 'NO'}

COLLEGE FOOTBALL SCHEDULE KNOWLEDGE:
- Weeks 1-4: Early regular season, non-conference games, records forming
- Weeks 5-9: Conference play, division races taking shape
- Weeks 10-13: Late regular season, rivalry week, CFP positioning critical
- Week 14: Conference Championships — only top 2 per conference qualify
- Week 15: CFP bracket set, 12-team playoff begins, bowls announced
- Weeks 16-17: CFP Quarterfinals and Semifinals
- Week 18+: National Championship Game

Use this knowledge to make articles feel seasonally accurate. A Week 2 article sounds different from a Week 14 article.

THE ${coaches.length} HUMAN COACHES (these are the ONLY subjects of your coverage):
${coachProfiles}

ABSOLUTE RULES:
1. Reference every coach by name. They are the stars of this league.
2. Only write about the ${coaches.length} human-coached teams. CPU teams are background noise.
3. Never invent stats or scores. Use only data provided.
4. Adjust tone to match the season phase — early season is hopeful, late season is urgent, playoff is electric.
5. Reference championship history where relevant — it adds legacy and stakes.
6. Balanced tone: ESPN-professional with personality. Light rivalry trash talk welcome.`;

    let userPrompt = '';
    const weekLabel = week ? `Week ${week} (${weekContext.phase})` : 'current week';

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
- Open with a 2-sentence intro that captures the mood of ${weekContext.phase} — what's at stake right now
- Rank ALL ${coaches.length} coaches from #1 to last
- For each: rank, team, coach name, 2-3 sentences — reference record, recent results, ${weekContext.isPlayoff ? 'playoff positioning' : 'schedule difficulty ahead'}, and coaching style
- If any coach has a championship, acknowledge their legacy
- "Hot Seat": name the coach most under pressure given where we are in the season (week ${week || '?'}) and why
- Closing line: tease the most important upcoming matchup given the ${weekContext.phase}

${weekContext.isChampionship ? '⚡ THIS IS CHAMPIONSHIP WEEK — write with championship-level drama and stakes.' : ''}
${weekContext.isPlayoff && !weekContext.isChampionship ? '🏈 PLAYOFF SEASON — every game is elimination. Write with urgency.' : ''}`;

    } else if (articleType === 'weekly-recap') {
      userPrompt = `Write a Weekly Recap for ${weekLabel} of the Dynasty Universe season.

GAMES THIS WEEK:
${allGamesSummary}

STANDINGS:
${standingsSummary}

TOP PLAYERS:
${playersSummary}

FORMAT:
- Headline that captures the biggest moment of ${weekContext.phase}
- Season context opener: one sentence on what this week meant in the bigger picture (${weekContext.description})
- "Game of the Week": most significant result — name both coaches, describe dramatically
- "Winners & Losers": 2-3 coaches who helped themselves, 1-2 who hurt themselves
- "Stat of the Week": standout player performance tied to their coach's scheme
- "The Road Ahead": what does week ${(parseInt(week) || 1) + 1} look like? Name the coaches facing must-win situations given the ${weekContext.phase}

${weekContext.isPlayoff ? '🏈 Note: This is playoff time. Eliminated coaches should be mentioned with dignity. Advancing coaches get the drama treatment.' : ''}`;

    } else if (articleType === 'player-spotlight') {
      userPrompt = `Write a Player Spotlight for ${weekLabel} of the Dynasty Universe season.

TOP PLAYERS:
${playersSummary}

COACH PROFILES:
${coachProfiles}

FORMAT:
- Pick the most statistically impressive player
- Headline naming player and team
- Opening: who is this player, what have they done — frame it within ${weekContext.phase} context
- "The Coach's Weapon": how their coach (name them) has built the offense/defense around this player
- Stats breakdown from real data
- "Dynasty Impact": what does this player mean for their coach's ${weekContext.isPlayoff ? 'playoff run' : 'championship hopes'} this season
- Simulated coach quote (labeled as simulated)

Write like an ESPN feature. The season phase (${weekContext.phase}) should inform the urgency.`;

    } else if (articleType === 'rivalry-breakdown') {
      userPrompt = `Write a Rivalry Breakdown for ${weekLabel} of the Dynasty Universe season.

ALL COACHES:
${coachProfiles}

RECENT GAMES:
${allGamesSummary}

CHAMPIONSHIP HISTORY:
${championshipHistory}

FORMAT:
- Identify the two coaches with the best rivalry (head-to-head history, standings proximity, contrasting styles, or championship competition)
- Headline naming both coaches
- "The Setup": how did this rivalry form — reference records, history, and ${weekContext.phase} implications
- "Coach vs Coach": styles, records, approaches — personal but respectful
- "The Stakes": what does each need from their next meeting, especially given we're in ${weekContext.phase}
- If either coach has a championship, use it — dynasties add rivalry stakes
- "Prediction": pick a winner, explain why
- Closer: one line both coaches would send to the group chat

${weekContext.isPlayoff ? '⚡ If these coaches could meet in the playoffs, make that the central tension.' : ''}`;
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const article = response.content[0].text;

    // Auto-save to articles table
    const title = articleType
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase()) +
      (week ? ` — Week ${week} (${weekContext.phase})` : '');

    await supabase.from('articles').insert({
      article_type: articleType,
      week: week || null,
      title,
      content: article,
      edited_by: 'commissioner'
    });

    res.status(200).json({ article, weekContext });

  } catch (error) {
    console.error('Article generation error:', error);
    res.status(500).json({ error: 'Failed to generate article', details: error.message });
  }
}
