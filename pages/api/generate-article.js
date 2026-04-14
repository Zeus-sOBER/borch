import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { articleType, week } = req.body;

  try {
    // Pull all the data Claude needs
    const [teamsRes, gamesRes, playersRes, coachesRes] = await Promise.all([
      supabase.from('teams').select('*').order('wins', { ascending: false }),
      supabase.from('games').select('*').order('week', { ascending: false }).limit(20),
      supabase.from('players').select('*').order('yards', { ascending: false }).limit(20),
      supabase.from('coaches').select('*')
    ]);

    const teams = teamsRes.data || [];
    const games = gamesRes.data || [];
    const players = playersRes.data || [];
    const coaches = coachesRes.data || [];

    // Build a coach lookup so we can map teams to their human coaches
    const coachByTeam = {};
    coaches.forEach(c => {
      if (c.team) coachByTeam[c.team.toLowerCase()] = c;
    });

    // Format coach context for the prompt
    const coachContext = coaches.length > 0
      ? coaches.map(c =>
          `- ${c.name} coaches ${c.team}` +
          (c.record ? ` (Record: ${c.record})` : '') +
          (c.coaching_style ? ` | Style: ${c.coaching_style}` : '') +
          (c.bio ? ` | Bio: ${c.bio}` : '')
        ).join('\n')
      : 'No coach profiles loaded yet.';

    const leagueContext = `
DYNASTY UNIVERSE LEAGUE — HUMAN COACHES (these are real people in the league, always reference them by name):
${coachContext}

CURRENT STANDINGS (most recent first):
${teams.map(t => `${t.team_name}: ${t.wins}-${t.losses}`).join('\n')}

RECENT GAMES:
${games.slice(0, 10).map(g => `Week ${g.week}: ${g.home_team} ${g.home_score} - ${g.away_score} ${g.away_team}`).join('\n')}

TOP PLAYERS:
${players.slice(0, 10).map(p => `${p.name} (${p.team}) — ${p.yards || 0} yds, ${p.touchdowns || 0} TDs`).join('\n')}
`;

    const systemPrompt = `You are the lead writer for Dynasty Universe, a college football dynasty league media hub. 
Your job is to cover this specific league — not college football in general.

CRITICAL RULES:
1. Always reference the human coaches by name. They are real people running real teams in this league. Make them the stars of every piece.
2. Never write generic college football content. Every sentence should be grounded in this league's actual data.
3. If two coaches have played each other, reference that history.
4. Invent zero stats or scores — only use what's in the data provided.
5. Tone: balanced. Mix ESPN-level professionalism with personality. Light trash talk and rivalries are welcome but never mean-spirited.
6. Write like this league matters — because to these coaches, it does.`;

    let userPrompt = '';

    if (articleType === 'power-rankings') {
      userPrompt = `Write a Power Rankings article for Week ${week || 'latest'} of the Dynasty Universe season.

${leagueContext}

Format:
- Open with a punchy 2-sentence intro about the state of the league
- Rank ALL teams from #1 to last place
- For each team: rank number, team name, coach name in bold, 2-3 sentences about why they're ranked here — reference their record, recent results, and coaching style/personality where relevant
- Close with a "Hot Seat" callout naming the coach most under pressure and why
- End with a spicy one-liner teasing next week

Keep it tight, opinionated, and fun. These coaches should feel like they're reading about themselves on ESPN.`;

    } else if (articleType === 'weekly-recap') {
      userPrompt = `Write a Weekly Recap article for Week ${week || 'latest'} of the Dynasty Universe season.

${leagueContext}

Format:
- Headline that references the biggest game or moment of the week
- "Game of the Week" section: break down the most significant matchup, name both coaches, describe the outcome dramatically
- "Winners & Losers" section: 2-3 coaches who helped themselves this week, 1-2 who hurt themselves
- "Stat of the Week": one standout player performance, tie it to their coach's strategy if possible
- "Looking Ahead": 2-3 sentences previewing next week's most important matchup, call out the coaches by name

Make the coaches feel like celebrities in their own league.`;

    } else if (articleType === 'player-spotlight') {
      userPrompt = `Write a Player Spotlight article for the Dynasty Universe season.

${leagueContext}

Pick the most statistically impressive player from the data above. Format:
- Headline naming the player and their team
- Opening paragraph: who is this player, what have they done this season
- "The Coach's Weapon" section: describe how their coach (name them) has used this player — reference the coach's style
- Stats breakdown: highlight their key numbers from the data
- "Dynasty Impact" section: what does this player mean for their team's championship chances this season
- Quote-style closer: write a fictional but realistic quote from the coach about the player (label it clearly as a simulation)

Tone: feature-story style, like an ESPN profile piece.`;

    } else if (articleType === 'rivalry-breakdown') {
      userPrompt = `Write a Rivalry Breakdown article for the Dynasty Universe season.

${leagueContext}

Identify the two coaches/teams with the most interesting rivalry based on the data (close records, recent head-to-head games, or contrasting styles). Format:
- Headline naming both coaches and teams
- "The Setup": how did this rivalry form? Reference their records and any head-to-head history in the data
- "Coach vs Coach": compare their styles, records, and approaches — make it personal but respectful
- "The Stakes": what does each coach need from this rivalry game for their season
- "Prediction": pick a winner and explain why in 2-3 sentences
- End with a trash-talk-lite closer that both coaches would appreciate

If no clear rivalry exists yet, frame it as an "emerging rivalry to watch" based on their standings position.`;
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const article = response.content[0].text;
    res.status(200).json({ article });

  } catch (error) {
    console.error('Article generation error:', error);
    res.status(500).json({ error: 'Failed to generate article', details: error.message });
  }
}