import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { getNarrativeContext, logNarrativeEvent } from '../../lib/narrative';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Commissioner PIN check — only commissioner can generate articles
  const { articleType, week, pin } = req.body;

  if (!pin || pin !== process.env.COMMISSIONER_PIN) {
    return res.status(401).json({ error: 'Commissioner PIN required to generate articles.' });
  }

  if (!articleType) {
    return res.status(400).json({ error: 'articleType is required' });
  }

  try {
    // Pull coaches first — they are the foundation of everything
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

    // Get the list of teams being coached by real humans
    const humanTeams = coaches.map(c => c.team).filter(Boolean);

    // Pull standings — only for human-coached teams
    const { data: allTeams } = await supabase
      .from('teams')
      .select('*')
      .order('wins', { ascending: false });

    // Filter to only human teams (match by team name, case-insensitive)
    const teams = (allTeams || []).filter(t =>
      humanTeams.some(ht => ht.toLowerCase() === t.team_name?.toLowerCase())
    );

    // Pull recent games involving human teams only
    const { data: allGames } = await supabase
      .from('games')
      .select('*')
      .order('week', { ascending: false })
      .limit(40);

    const games = (allGames || []).filter(g =>
      humanTeams.some(ht =>
        ht.toLowerCase() === g.home_team?.toLowerCase() ||
        ht.toLowerCase() === g.away_team?.toLowerCase()
      )
    ).slice(0, 15);

    // Pull top players from human teams only
    const { data: allPlayers } = await supabase
      .from('players')
      .select('*')
      .order('yards', { ascending: false })
      .limit(50);

    const players = (allPlayers || []).filter(p =>
      humanTeams.some(ht => ht.toLowerCase() === p.team?.toLowerCase())
    ).slice(0, 15);

    // Build rich coach profiles for the prompt
    const coachProfiles = coaches.map(c => {
      // Find this coach's team record from standings
      const teamRecord = teams.find(t => t.team_name?.toLowerCase() === c.team?.toLowerCase());
      const record = teamRecord ? `${teamRecord.wins}-${teamRecord.losses}` : (c.record || 'record unknown');

      // Find this coach's recent games
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
        return `${result} vs ${opponent} (${myScore}-${oppScore}, Wk${g.week})`;
      }).join(', ');

      return [
        `Coach: ${c.name} | Team: ${c.team} | Record: ${record}`,
        c.coaching_style ? `  Style: ${c.coaching_style}` : '',
        c.bio ? `  Bio: ${c.bio}` : '',
        recentResults ? `  Recent: ${recentResults}` : ''
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    // Standings summary (human teams only)
    const standingsSummary = teams.length > 0
      ? teams.map((t, i) => {
          const coach = coaches.find(c => c.team?.toLowerCase() === t.team_name?.toLowerCase());
          return `#${i + 1} ${t.team_name} (${t.wins}-${t.losses})${coach ? ` — Coach: ${coach.name}` : ''}`;
        }).join('\n')
      : 'No standings data yet — going off coach records.';

    // Top players summary
    const playersSummary = players.length > 0
      ? players.map(p => {
          const coach = coaches.find(c => c.team?.toLowerCase() === p.team?.toLowerCase());
          return `${p.name} (${p.team}${coach ? `, Coach ${coach.name}` : ''}) — ${p.yards || 0} yds, ${p.touchdowns || 0} TDs`;
        }).join('\n')
      : 'No player stats tracked yet.';

    // Pull narrative context — the full season timeline for Claude
    const { contextText: narrativeContext } = await getNarrativeContext({
      season: 1,
      limit: 40,
      eventTypes: ['game', 'moment', 'article', 'lore'],
    });

    // System prompt — strict coach focus
    const systemPrompt = `You are the lead writer for Dynasty Universe, a college football dynasty league media hub.

This league has ${coaches.length} human coaches. They are the ONLY subjects you write about.

ABSOLUTE RULES:
1. Every article must reference every coach by name at least once. These are real people — make them feel like stars.
2. You only write about the ${coaches.length} human-coached teams listed below. CPU/AI teams do not exist in your world.
3. Never invent stats, scores, or facts. Only use data provided to you.
4. If data is thin, lean into narrative, personality, and coaching storylines rather than making things up.
5. Tone: balanced — professional ESPN quality with personality. Light rivalry trash talk is welcome but never mean-spirited.
6. These coaches read these articles. Write like you're covering the NFL — make them proud and entertained.

THE ${coaches.length} COACHES IN THIS LEAGUE:
${coachProfiles}

FULL SEASON NARRATIVE TIMELINE (use this to build continuity — reference streaks, upsets, and coaching arcs you see here):
${narrativeContext || 'No narrative history yet — this is the first article of the season.'}`;

    // Build article-type specific prompts
    let userPrompt = '';
    const weekLabel = week ? `Week ${week}` : 'the current week';

    if (articleType === 'power-rankings') {
      userPrompt = `Write Power Rankings for ${weekLabel} of the Dynasty Universe season.

CURRENT STANDINGS (human teams only):
${standingsSummary}

RECENT GAMES (human vs human matchups):
${games.length > 0 ? games.map(g => `Week ${g.week}: ${g.home_team} ${g.home_score} - ${g.away_score} ${g.away_team}`).join('\n') : 'No games recorded yet.'}

TOP PLAYERS:
${playersSummary}

FORMAT:
- Open with a punchy 2-sentence intro about the state of the league this week
- Rank ALL ${coaches.length} coaches/teams from #1 to last
- For each: rank number, team name, coach name, 2-3 sentences on their ranking — reference record, recent results, and coaching personality
- "Hot Seat" callout: name the coach most under pressure and exactly why
- Close with a spicy one-liner teasing next week's biggest matchup

Be opinionated. These coaches should feel like they're reading about themselves on ESPN.`;

    } else if (articleType === 'weekly-recap') {
      userPrompt = `Write a Weekly Recap for ${weekLabel} of the Dynasty Universe season.

RECENT GAMES (human teams only):
${games.length > 0 ? games.map(g => `Week ${g.week}: ${g.home_team} ${g.home_score} - ${g.away_score} ${g.away_team}`).join('\n') : 'No games recorded yet.'}

STANDINGS:
${standingsSummary}

TOP PLAYERS:
${playersSummary}

FORMAT:
- Headline referencing the biggest result or moment of the week
- "Game of the Week": break down the most significant matchup — name both coaches, describe the outcome dramatically
- "Winners & Losers": 2-3 coaches who helped themselves this week, 1-2 who hurt themselves — be specific
- "Stat of the Week": one standout player performance, tie it to their coach's strategy
- "Looking Ahead": preview next week's most important matchup, call out both coaches by name

Make every coach feel like a main character.`;

    } else if (articleType === 'player-spotlight') {
      userPrompt = `Write a Player Spotlight for Dynasty Universe.

TOP PLAYERS (human teams only):
${playersSummary}

COACH PROFILES:
${coachProfiles}

FORMAT:
- Pick the most statistically impressive player from the data above
- Headline naming the player and their team
- Opening paragraph: who is this player, what have they done this season
- "The Coach's Weapon": how has their coach (name them) deployed this player — reference the coach's style
- Stats breakdown using the real numbers from the data
- "Dynasty Impact": what does this player mean for their coach's championship hopes
- Simulated coach quote (label clearly as simulated): a realistic quote from the coach about the player

Write it like an ESPN feature profile.`;

    } else if (articleType === 'rivalry-breakdown') {
      userPrompt = `Write a Rivalry Breakdown for Dynasty Universe.

ALL COACHES & RECORDS:
${coachProfiles}

RECENT HEAD-TO-HEAD GAMES:
${games.length > 0 ? games.map(g => `Week ${g.week}: ${g.home_team} ${g.home_score} - ${g.away_score} ${g.away_team}`).join('\n') : 'No games recorded yet.'}

FORMAT:
- Identify the two coaches with the most compelling rivalry based on the data (closest records, recent matchup, contrasting styles, or standings proximity)
- Headline naming both coaches and teams
- "The Setup": how did this rivalry form? Reference their records and any head-to-head history
- "Coach vs Coach": compare styles, records, and competitive approaches — make it personal but respectful
- "The Stakes": what does each coach need from their next meeting
- "Prediction": pick a winner and explain why in 2-3 sentences
- Trash-talk-lite closer that both coaches would screenshot and send to the group chat

If no clear rivalry exists yet, frame the two closest coaches in the standings as an "emerging rivalry to watch."`;
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const article = response.content[0].text;

    // Auto-save the generated draft to the articles table
    const title = articleType
      .replace(/-/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase()) + (week ? ` — Week ${week}` : '');

    await supabase.from('articles').insert({
      article_type: articleType,
      week: week || null,
      title,
      content: article,
      edited_by: 'commissioner'
    });

    // ── Log article to Narrative Hub so future Claude calls know it exists ──
    await logNarrativeEvent({
      event_type:       'article',
      season:           1,
      week:             week || null,
      title,
      summary:          `${title} — generated by commissioner`,
      content:          article,
      narrative_weight: articleType === 'power-rankings' ? 4 : 3,
      momentum_tags:    [articleType],
      is_season_highlight: articleType === 'power-rankings',
      source_table:     'articles',
    }).catch(err => console.error('[narrative] article log error:', err.message));

    res.status(200).json({ article });

  } catch (error) {
    console.error('Article generation error:', error);
    res.status(500).json({ error: 'Failed to generate article', details: error.message });
  }
}
