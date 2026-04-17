import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { logNarrativeEvent, analyzeGame } from '../../lib/narrative';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── CFB Schedule Context ────────────────────────────────────────────────────
// Used to help AI understand what week means what phase of the season
const CFB_SCHEDULE_CONTEXT = `
COLLEGE FOOTBALL SCHEDULE STRUCTURE (EA Sports CFB dynasty mode):
- Weeks 1-4: Early regular season. Non-conference games common. Records still forming.
- Weeks 5-9: Mid regular season. Conference play begins. Rivalry implications building.
- Weeks 10-13: Late regular season. Conference title races, rivalry week approaching.
- Week 14: Conference Championship Games. Top 2 teams in each conference.
- Week 15: CFP First Round / Bowl Selection. 12-team playoff bracket set.
- Weeks 16-17: CFP Quarterfinals and Semifinals.
- Week 18: National Championship Game. One team crowned champion.
- Bowl games run parallel for teams not in the CFP (weeks 15-17).

Use this context to interpret screenshots correctly:
- A trophy screen in week 18 = National Championship
- A trophy screen in week 14 = Conference Championship
- A bracket screen = CFP Playoff bracket
- Final scores with bowl game names = Bowl game results
`;

// ─── Google Auth ─────────────────────────────────────────────────────────────
function getGoogleAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/documents.readonly'
    ]
  });
}

// ─── Fetch Google Doc as plain text ──────────────────────────────────────────
async function fetchGoogleDocText(fileId) {
  const auth = getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });

  // Export Google Doc as plain text
  const res = await drive.files.export(
    { fileId, mimeType: 'text/plain' },
    { responseType: 'text' }
  );
  return res.data;
}

// ─── Fetch image from Drive as base64 ────────────────────────────────────────
async function fetchDriveImageAsBase64(fileId) {
  const auth = getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });

  const metaRes = await drive.files.get({ fileId, fields: 'mimeType,name' });
  const mimeType = metaRes.data.mimeType;

  const fileRes = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  const buffer = Buffer.from(fileRes.data);
  return { base64: buffer.toString('base64'), mimeType, name: metaRes.data.name };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { fileId, fileName, mimeType: inputMimeType } = req.body;

  if (!fileId) return res.status(400).json({ error: 'fileId is required' });

  try {
    // Pull coaches so AI knows who the human coaches are
    const { data: coaches } = await supabase.from('coaches').select('*');
    const humanTeams = (coaches || []).map(c => c.team).filter(Boolean);
    const coachList = (coaches || [])
      .map(c => `${c.name} (${c.team})`)
      .join(', ') || 'No coaches loaded yet';

    // Pull current season info for context
    const { data: recentGames } = await supabase
      .from('games')
      .select('week')
      .order('week', { ascending: false })
      .limit(1);
    const latestWeek = recentGames?.[0]?.week || 1;

    const isGoogleDoc =
      inputMimeType === 'application/vnd.google-apps.document' ||
      fileName?.toLowerCase().endsWith('.gdoc');

    let parsedResult;

    if (isGoogleDoc) {
      // ── GOOGLE DOC PATH ────────────────────────────────────────────────────
      const docText = await fetchGoogleDocText(fileId);
      parsedResult = await parseGoogleDoc(docText, coaches, humanTeams, latestWeek);
    } else {
      // ── IMAGE PATH ─────────────────────────────────────────────────────────
      const { base64, mimeType } = await fetchDriveImageAsBase64(fileId);
      parsedResult = await parseImage(base64, mimeType, coaches, humanTeams, latestWeek);
    }

    // Save results to Supabase
    const saveResult = await saveToSupabase(parsedResult, coaches, humanTeams);

    // ── Log to Narrative Hub ────────────────────────────────────────────────
    await logParsedResultToNarrative(parsedResult, coaches, humanTeams);

    // Log the scan
    await supabase.from('scan_log').insert({
      file_id: fileId,
      file_name: fileName || fileId,
      file_type: isGoogleDoc ? 'gdoc' : 'image',
      detected_type: parsedResult.type,
      status: 'success',
      parsed_data: parsedResult
    });

    res.status(200).json({
      success: true,
      detectedType: parsedResult.type,
      summary: parsedResult.summary,
      saved: saveResult
    });

  } catch (error) {
    console.error('Parse error:', error);

    await supabase.from('scan_log').insert({
      file_id: fileId,
      file_name: fileName || fileId,
      status: 'error',
      parsed_data: { error: error.message }
    }).catch(() => {});

    res.status(500).json({ error: 'Failed to parse file', details: error.message });
  }
}

// ─── Parse a Google Doc ───────────────────────────────────────────────────────
async function parseGoogleDoc(docText, coaches, humanTeams, latestWeek) {
  const coachList = coaches.map(c => `${c.name} (${c.team})`).join(', ');

  const prompt = `You are parsing a Google Doc uploaded by a dynasty league commissioner.

${CFB_SCHEDULE_CONTEXT}

HUMAN COACHES IN THIS LEAGUE: ${coachList}
CURRENT LATEST WEEK IN DATABASE: ${latestWeek}

The document may contain any combination of:
- Game scores and results
- Player stats
- Notes and commentary
- Standings updates
- Championship results
- General season notes

DOCUMENT CONTENT:
---
${docText.substring(0, 8000)}
---

Analyze this document and return ONLY a JSON object (no markdown, no explanation) with this structure:
{
  "type": "notes",
  "week": <number or null>,
  "summary": "<one sentence describing what this doc contains>",
  "games": [
    { "home_team": "", "away_team": "", "home_score": 0, "away_score": 0, "week": 0, "is_final": true }
  ],
  "players": [
    { "name": "", "team": "", "position": "", "yards": 0, "touchdowns": 0, "completions": 0, "attempts": 0, "interceptions": 0, "carries": 0, "receptions": 0 }
  ],
  "standings": [
    { "team_name": "", "wins": 0, "losses": 0, "conference_wins": 0, "conference_losses": 0 }
  ],
  "championship": null,
  "notes": "<any general notes or commentary from the doc worth preserving>",
  "cfb_context": "<brief note on what phase of the season this data is from based on the week number>"
}

For "championship": if the doc mentions a champion, use: { "team_name": "", "coach_name": "", "record": "", "season": <year or season number> }
Only include arrays that have actual data. Empty arrays are fine for sections with no data.
Match team names to the known human coaches where possible.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(text);
  parsed.source = 'gdoc';
  return parsed;
}

// ─── Parse an Image ───────────────────────────────────────────────────────────
async function parseImage(base64, mimeType, coaches, humanTeams, latestWeek) {
  const coachList = coaches.map(c => `${c.name} (${c.team})`).join(', ');

  const prompt = `You are analyzing a screenshot from EA Sports College Football (CFB) dynasty mode.

${CFB_SCHEDULE_CONTEXT}

HUMAN COACHES IN THIS LEAGUE: ${coachList}
HUMAN-COACHED TEAMS: ${humanTeams.join(', ') || 'unknown'}
CURRENT LATEST WEEK IN DATABASE: ${latestWeek}

STEP 1 — CLASSIFY: Determine exactly what type of screenshot this is:
- "standings" — shows team win/loss records, conference standings
- "scores" — shows game results, scoreboards, final scores
- "stats" — shows player statistics, leaders, stat overlays
- "championship" — shows a trophy, champion screen, title game result, bowl game winner, conference champion
- "recruiting" — shows recruiting board, commitments, offers
- "playoff_bracket" — shows CFP bracket or bowl game matchups
- "unknown" — cannot determine or menu/loading screen

STEP 2 — EXTRACT: Pull all visible data. Be precise with numbers. Only extract what you can clearly read.

STEP 3 — APPLY CFB CONTEXT: Based on the week number visible (if any) and the type of screen, determine what phase of the season this represents.

Return ONLY a JSON object (no markdown, no explanation):
{
  "type": "<classified type from above>",
  "week": <number or null>,
  "season": <season/year number if visible, else null>,
  "summary": "<one sentence: what is shown in this screenshot>",
  "cfb_context": "<what phase of season this is and why it matters>",
  "games": [
    { "home_team": "", "away_team": "", "home_score": 0, "away_score": 0, "week": 0, "is_final": true, "game_type": "regular|conference_championship|bowl|cfp_quarterfinal|cfp_semifinal|national_championship" }
  ],
  "players": [
    { "name": "", "team": "", "position": "", "yards": 0, "touchdowns": 0, "completions": 0, "attempts": 0, "interceptions": 0, "carries": 0, "receptions": 0 }
  ],
  "standings": [
    { "team_name": "", "wins": 0, "losses": 0, "conference_wins": 0, "conference_losses": 0 }
  ],
  "championship": null,
  "recruiting": [
    { "player_name": "", "position": "", "stars": 0, "school": "", "event_type": "commitment|decommitment|offer|visit" }
  ],
  "playoff_bracket": null
}

For "championship": { "team_name": "", "coach_name": "", "record": "", "season": 0, "championship_type": "national|conference|bowl" }
For "playoff_bracket": { "teams": [], "round": "" }
Only include arrays that have actual extracted data.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: mimeType, data: base64 }
        },
        { type: 'text', text: prompt }
      ]
    }]
  });

  const text = response.content[0].text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(text);
  parsed.source = 'image';
  return parsed;
}

// ─── Save Parsed Data to Supabase ─────────────────────────────────────────────
async function saveToSupabase(data, coaches, humanTeams) {
  const saved = { games: 0, players: 0, standings: 0, championship: false, recruiting: 0 };

  // Helper: find coach name for a team
  const findCoach = (teamName) => {
    if (!teamName) return null;
    return coaches.find(c => c.team?.toLowerCase() === teamName?.toLowerCase())?.name || null;
  };

  // Save games
  if (data.games?.length > 0) {
    for (const game of data.games) {
      if (!game.home_team || !game.away_team) continue;
      const { error } = await supabase.from('games').upsert({
        home_team: game.home_team,
        away_team: game.away_team,
        home_score: game.home_score ?? null,
        away_score: game.away_score ?? null,
        week: game.week ?? data.week ?? null,
        is_final: game.is_final ?? true,
        game_type: game.game_type ?? 'regular'
      }, { onConflict: 'home_team,away_team,week' });
      if (!error) saved.games++;
    }
  }

  // Save players (only from human teams if we know who they are)
  if (data.players?.length > 0) {
    for (const player of data.players) {
      if (!player.name) continue;
      const { error } = await supabase.from('players').upsert({
        name: player.name,
        team: player.team ?? null,
        position: player.position ?? null,
        yards: player.yards ?? 0,
        touchdowns: player.touchdowns ?? 0,
        completions: player.completions ?? null,
        attempts: player.attempts ?? null,
        interceptions: player.interceptions ?? null,
        carries: player.carries ?? null,
        receptions: player.receptions ?? null
      }, { onConflict: 'name,team' });
      if (!error) saved.players++;
    }
  }

  // Save standings
  if (data.standings?.length > 0) {
    for (const team of data.standings) {
      if (!team.team_name) continue;
      const { error } = await supabase.from('teams').upsert({
        team_name: team.team_name,
        wins: team.wins ?? 0,
        losses: team.losses ?? 0,
        conference_wins: team.conference_wins ?? null,
        conference_losses: team.conference_losses ?? null
      }, { onConflict: 'team_name' });
      if (!error) saved.standings++;
    }
  }

  // Save championship
  if (data.championship) {
    const champ = data.championship;
    const coachName = champ.coach_name || findCoach(champ.team_name);
    const { error } = await supabase.from('championships').upsert({
      season: champ.season ?? new Date().getFullYear(),
      team_name: champ.team_name,
      coach_name: coachName,
      record: champ.record ?? null,
      notes: champ.championship_type ?? null
    }, { onConflict: 'season,team_name' });
    if (!error) saved.championship = true;
  }

  // Save recruiting events
  if (data.recruiting?.length > 0) {
    for (const event of data.recruiting) {
      if (!event.player_name) continue;
      const { error } = await supabase.from('recruiting_events').insert({
        player_name: event.player_name,
        position: event.position ?? null,
        stars: event.stars ?? null,
        school: event.school ?? null,
        event_type: event.event_type ?? 'unknown'
      });
      if (!error) saved.recruiting++;
    }
  }

  return saved;
}

// ─── Log Parsed Results to Narrative Hub ─────────────────────────────────────
async function logParsedResultToNarrative(data, coaches, humanTeams) {
  try {
    // Pull standings to help detect upsets
    const { createClient: sc } = await import('@supabase/supabase-js');
    const db = sc(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: standings } = await db.from('teams').select('team_name, wins, losses').order('wins', { ascending: false });

    // Log each final game result
    if (data.games?.length > 0) {
      for (const game of data.games) {
        if (!game.home_team || !game.away_team || !game.is_final) continue;

        // Only log games involving at least one human-coached team
        const hasHumanTeam = humanTeams.some(ht =>
          ht.toLowerCase() === game.home_team?.toLowerCase() ||
          ht.toLowerCase() === game.away_team?.toLowerCase()
        );
        if (!hasHumanTeam) continue;

        const { tags, weight, featuredCoach, opposingCoach, winner, loser, winnerScore, loserScore }
          = analyzeGame(game, coaches, standings || []);

        const winnerStr = winnerScore !== undefined ? `${winnerScore}` : '?';
        const loserStr  = loserScore  !== undefined ? `${loserScore}` : '?';

        await logNarrativeEvent({
          event_type:       'game',
          season:           data.season ?? 1,
          week:             game.week ?? data.week ?? null,
          featured_coach:   featuredCoach,
          featured_team:    winner,
          opposing_coach:   opposingCoach,
          opposing_team:    loser,
          title:            `${winner} def. ${loser} ${winnerStr}-${loserStr}`,
          summary:          `Week ${game.week ?? data.week ?? '?'}: ${winner} defeated ${loser} ${winnerStr}-${loserStr}${game.game_type && game.game_type !== 'regular' ? ` (${game.game_type.replace(/_/g, ' ')})` : ''}`,
          narrative_weight: weight,
          momentum_tags:    tags,
          is_season_highlight: weight >= 4,
          source_table:     'games',
          raw_data:         game,
        });
      }
    }

    // Log championship
    if (data.championship) {
      const champ = data.championship;
      const coach = coaches.find(c => c.team?.toLowerCase() === champ.team_name?.toLowerCase());
      await logNarrativeEvent({
        event_type:          'game',
        season:              champ.season ?? data.season ?? 1,
        featured_coach:      champ.coach_name || coach?.name || null,
        featured_team:       champ.team_name,
        title:               `${champ.team_name} wins ${champ.championship_type || 'Championship'}`,
        summary:             `${champ.team_name} (Coach: ${champ.coach_name || coach?.name || 'unknown'}) wins the ${champ.championship_type || 'championship'} with a record of ${champ.record || '?'}`,
        narrative_weight:    champ.championship_type === 'national' ? 5 : 4,
        momentum_tags:       ['championship', champ.championship_type === 'national' ? 'national_title' : 'conference_title'],
        is_season_highlight: true,
        source_table:        'championships',
        raw_data:            champ,
      });
    }

    // Log recruiting commitments (only 4+ star or notable events)
    if (data.recruiting?.length > 0) {
      for (const recruit of data.recruiting) {
        if (!recruit.player_name) continue;
        if ((recruit.stars ?? 0) < 4 && recruit.event_type !== 'commitment') continue;

        const coach = coaches.find(c =>
          c.team?.toLowerCase() === recruit.school?.toLowerCase()
        );

        await logNarrativeEvent({
          event_type:       'recruiting',
          season:           data.season ?? 1,
          featured_coach:   coach?.name ?? null,
          featured_team:    recruit.school ?? null,
          title:            `${recruit.stars ?? '?'}⭐ ${recruit.position ?? ''} ${recruit.player_name} — ${recruit.event_type}`,
          summary:          `${recruit.player_name} (${recruit.stars ?? '?'}★ ${recruit.position ?? 'ATH'}) ${recruit.event_type === 'commitment' ? 'commits to' : recruit.event_type} ${recruit.school ?? 'unknown'}`,
          narrative_weight: (recruit.stars ?? 0) >= 5 ? 4 : 3,
          momentum_tags:    [recruit.event_type, recruit.stars >= 5 ? '5_star' : null].filter(Boolean),
          source_table:     'recruiting_events',
          raw_data:         recruit,
        });
      }
    }

  } catch (err) {
    // Narrative logging is non-critical — never crash the main flow
    console.error('[narrative] parse-screenshot log error:', err.message);
  }
}
