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
- Week 0: Kickoff weekend. Early non-conference openers. Valid week — do NOT skip it.
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

// ─── Fetch Google Sheet as CSV text ──────────────────────────────────────────
async function fetchGoogleSheetAsCsv(fileId) {
  const auth = getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });

  // Export the first sheet as CSV
  const res = await drive.files.export(
    { fileId, mimeType: 'text/csv' },
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

  const { fileId, fileName, mimeType: inputMimeType, typeHint } = req.body;

  if (!fileId) return res.status(400).json({ error: 'fileId is required' });

  try {
    // Pull coaches so AI knows who the human coaches are
    const { data: coaches } = await supabase.from('coaches').select('*');
    const humanTeams = (coaches || []).map(c => c.team).filter(Boolean);
    const coachList = (coaches || [])
      .map(c => `${c.name} (${c.team})`)
      .join(', ') || 'No coaches loaded yet';

    // Pull current week from league settings (commissioner-set, authoritative)
    const { data: leagueSettings } = await supabase
      .from('league_settings')
      .select('current_week, current_season')
      .eq('id', 1)
      .single();
    const currentWeek  = leagueSettings?.current_week  ?? 0;
    const currentSeason = leagueSettings?.current_season ?? 1;

    const isGoogleDoc   = inputMimeType === 'application/vnd.google-apps.document'  || fileName?.toLowerCase().endsWith('.gdoc');
    const isGoogleSheet = inputMimeType === 'application/vnd.google-apps.spreadsheet' || fileName?.toLowerCase().endsWith('.gsheet');

    const isScheduleImport = typeHint === 'schedule'
    const isApPollHint = typeHint === 'ap_poll';

    let parsedResult;

    if (isGoogleSheet) {
      // ── GOOGLE SHEET → always treated as schedule import ─────────────────
      const sheetCsv = await fetchGoogleSheetAsCsv(fileId);
      parsedResult = await parseScheduleDoc(sheetCsv, coaches, humanTeams);
    } else if (isScheduleImport && isGoogleDoc) {
      // ── SCHEDULE DOC → pre-populate upcoming matchups ─────────────────────
      const docText = await fetchGoogleDocText(fileId);
      parsedResult = await parseScheduleDoc(docText, coaches, humanTeams);
    } else if (isScheduleImport) {
      // ── SCHEDULE SCREENSHOT → upcoming matchups from game screen ──────────
      const { base64, mimeType } = await fetchDriveImageAsBase64(fileId);
      parsedResult = await parseScheduleImage(base64, mimeType, coaches, humanTeams);
    } else if (isGoogleDoc) {
      // ── GOOGLE DOC (general) → scores, notes, stats, etc. ────────────────
      const docText = await fetchGoogleDocText(fileId);
      parsedResult = await parseGoogleDoc(docText, coaches, humanTeams, currentWeek);
    } else {
      // ── IMAGE PATH ────────────────────────────────────────────────────────
      const { base64, mimeType } = await fetchDriveImageAsBase64(fileId);
      parsedResult = await parseImage(base64, mimeType, coaches, humanTeams, currentWeek, typeHint);
    }

    // Save results to Supabase
    const saveResult = await saveToSupabase(parsedResult, coaches, humanTeams);

    // ── Log to Narrative Hub ────────────────────────────────────────────────
    await logParsedResultToNarrative(parsedResult, coaches, humanTeams);

    // Log the scan — only insert columns that exist in the schema
    const totalRecords =
      (saveResult?.games     || 0) +
      (saveResult?.players   || 0) +
      (saveResult?.standings || 0) +
      (saveResult?.recruiting|| 0) +
      (saveResult?.rankings  || 0) +
      (saveResult?.heisman   || 0) +
      (saveResult?.championship ? 1 : 0);

    await supabase.from('scan_log').insert({
      file_id:        fileId,
      file_name:      fileName || fileId,
      data_type:      parsedResult.type,
      records_parsed: totalRecords,
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
      file_id:        fileId,
      file_name:      fileName || fileId,
      data_type:      'error',
      records_parsed: 0,
    }).catch(() => {});

    res.status(500).json({ error: 'Failed to parse file', details: error.message });
  }
}

// ─── Parse a Schedule Doc (Google Doc or Sheet) ──────────────────────────────
async function parseScheduleDoc(docText, coaches, humanTeams) {
  const coachList = coaches.map(c => `${c.name} (${c.team})`).join(', ');

  const prompt = `You are importing a college football dynasty league schedule/results from a spreadsheet or document.

HUMAN COACHES IN THIS LEAGUE: ${coachList}
HUMAN-COACHED TEAMS: ${humanTeams.join(', ') || 'unknown'}

The document may contain BOTH upcoming scheduled games AND completed games with scores.
You must handle both types:

TYPE 1 — COMPLETED GAME (has a score anywhere in the row — Notes column, Score column, or inline):
  Examples of score indicators: "70-3 Alabama Win", "50-24", "W 21-7", "Alabama 70, USF 3"
  - Set "is_final": true
  - Parse the score carefully. The format is usually "WinnerScore-LoserScore WinnerName Win"
  - Determine which team won, then assign:
    - If home_team won: home_score = higher number, away_score = lower number
    - If away_team won: away_score = higher number, home_score = lower number
  - Always double-check: the winner's score should be HIGHER than the loser's score

TYPE 2 — UPCOMING GAME (no score present):
  - Set "is_final": false
  - Set "home_score": null, "away_score": null

SKIP these rows entirely:
  - Section header rows like "WEEK 3 — EARLY SEASON", "WEEK 14 — CONF. CHAMPIONSHIPS"
  - Empty rows (no team names)
  - Rows with only "BYE WEEK" in Opponent Type

DOCUMENT CONTENT:
---
${docText.substring(0, 12000)}
---

Return ONLY a JSON object (no markdown, no explanation):
{
  "type": "schedule",
  "summary": "Imported X scheduled games and Y completed results",
  "games": [
    {
      "home_team": "Team Name",
      "away_team": "Team Name",
      "week": 1,
      "is_final": true,
      "home_score": 70,
      "away_score": 3,
      "game_type": "regular",
      "notes": "Rivalry Game"
    },
    {
      "home_team": "Team Name",
      "away_team": "Team Name",
      "week": 2,
      "is_final": false,
      "home_score": null,
      "away_score": null,
      "game_type": "regular",
      "notes": null
    }
  ]
}

Rules:
- "game_type" must be one of: "regular", "conference_championship", "bowl", "cfp_quarterfinal", "cfp_semifinal", "national_championship"
- Week 14 = "conference_championship", weeks 15-18 = playoff/bowl
- Include ALL game rows, not just human-team games
- Week 0 is valid — keep it as week 0
- Be precise with scores — a 70-3 score means the winner had 70 points, loser had 3
- "notes": copy any text from the Notes / Bowl Game Name column verbatim (e.g. "Rivalry Game", "Heated coaches rivalry", "Armed Forces Bowl"). Set to null if the cell is empty.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 6000,
    messages: [{ role: 'user', content: prompt }]
  });

  const text = response.content[0].text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(text);
  parsed.source = 'schedule_doc';
  return parsed;
}

// ─── Parse a Schedule Screenshot ─────────────────────────────────────────────
async function parseScheduleImage(base64, mimeType, coaches, humanTeams) {
  const coachList = coaches.map(c => `${c.name} (${c.team})`).join(', ');

  const prompt = `You are reading a screenshot of the EA Sports CFB26 dynasty schedule screen.

HUMAN COACHES IN THIS LEAGUE: ${coachList}
HUMAN-COACHED TEAMS: ${humanTeams.join(', ') || 'unknown'}

HOME vs AWAY RULE (critical):
In this game's UI, matchups are displayed as "Team A  at  Team B".
This means Team A is the AWAY team and Team B is the HOME team.
Always assign: away_team = the team listed BEFORE "at", home_team = the team listed AFTER "at".

TEAM NAME CLEANUP:
- Strip rankings/numbers before team names (e.g. "21 Texas Tech" → "Texas Tech", "2 Miami University" → "Miami (OH)")
- "Miami University" = "Miami (OH)"
- Use clean, standard team names without any rank prefix

Extract all visible matchups from this schedule screen.
Read the week number from the top of the screen (e.g. "WEEK 6").

Return ONLY a JSON object (no markdown, no explanation):
{
  "type": "schedule",
  "summary": "Imported schedule from screenshot: N games, Week W",
  "games": [
    {
      "home_team": "Team Name",
      "away_team": "Team Name",
      "week": 6,
      "is_final": false,
      "home_score": null,
      "away_score": null,
      "game_type": "regular"
    }
  ]
}

Rules:
- Set "is_final": false for ALL games (these are upcoming matchups)
- Set "home_score": null and "away_score": null
- Use the week number shown on screen for every game
- "game_type": use "regular" unless context clearly indicates conference_championship, bowl, cfp_quarterfinal, cfp_semifinal, or national_championship
- Only include games that are fully visible — skip any cut-off rows at the bottom`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } },
        { type: 'text', text: prompt }
      ]
    }]
  });

  const text = response.content[0].text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(text);
  parsed.source = 'schedule_image';
  return parsed;
}

// ─── Parse a Google Doc ───────────────────────────────────────────────────────
async function parseGoogleDoc(docText, coaches, humanTeams, currentWeek) {
  const coachList = coaches.map(c => `${c.name} (${c.team})`).join(', ');

  const prompt = `You are parsing a Google Doc uploaded by a dynasty league commissioner.

${CFB_SCHEDULE_CONTEXT}

HUMAN COACHES IN THIS LEAGUE: ${coachList}
CURRENT OFFICIAL WEEK (commissioner-set): ${currentWeek}
IMPORTANT: Only reference or update data from week ${currentWeek} or earlier.

CRITICAL RULE ABOUT SCORES:
- A game is ONLY "is_final": true if it has REAL scores (both teams scored something, at least one score > 0)
- If a row has blank/empty/missing score fields → "is_final": false, "home_score": null, "away_score": null
- NEVER use 0 as a placeholder for a missing score — use null
- A game with scores of 0-0 almost certainly means the scores were blank — set is_final: false

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
    { "home_team": "", "away_team": "", "home_score": null, "away_score": null, "week": 0, "is_final": false }
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
async function parseImage(base64, mimeType, coaches, humanTeams, currentWeek, typeHint) {
  const coachList = coaches.map(c => `${c.name} (${c.team})`).join(', ');

  const typeHintLine = typeHint && typeHint !== 'auto'
    ? `\nCOMMISSIONER TYPE HINT: "${typeHint}" — treat this as a strong signal for classification.`
    : ''

  const prompt = `You are analyzing a screenshot from EA Sports College Football (CFB) dynasty mode.${typeHintLine}

${CFB_SCHEDULE_CONTEXT}

HUMAN COACHES IN THIS LEAGUE: ${coachList}
HUMAN-COACHED TEAMS: ${humanTeams.join(', ') || 'unknown'}
CURRENT OFFICIAL WEEK (commissioner-set): ${currentWeek}
IMPORTANT: Only process/save data that belongs to week ${currentWeek} or earlier. Do not generate rankings, standings, or narrative for future weeks.

STEP 1 — CLASSIFY: Determine exactly what type of screenshot this is:
- "standings" — shows team win/loss records, conference standings
- "ap_poll" — shows specifically the AP Top 25 Poll (Associated Press media poll, NOT CFP committee rankings)
- "rankings" — shows CFP Rankings, CFP Top 25, or any numbered poll that is NOT the AP Poll
- "scores" — shows game results, scoreboards, final scores
- "stats" — shows player statistics, leaders, stat overlays
- "championship" — shows a trophy, champion screen, title game result, bowl game winner, conference champion
- "recruiting" — shows recruiting board, commitments, offers
- "playoff_bracket" — shows CFP bracket or bowl game matchups
- "heisman_watch" — shows the Heisman Trophy Watch screen listing top 5 candidates with POS, NAME, TEAM, YEAR, CHANGE columns
- "unknown" — cannot determine or menu/loading screen

IMPORTANT: If the typeHint is "ap_poll", classify this as "ap_poll" regardless of what you see.
An "ap_poll" screenshot shows the Associated Press media poll ranking — it lists teams by rank number with records and poll points.

IMPORTANT: If the typeHint is "heisman_watch", classify this as "heisman_watch" regardless of what you see.
A "heisman_watch" screenshot shows the in-game Heisman Trophy Watch list with columns: POS, NAME, TEAM, YEAR, CHANGE.

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
    { "home_team": "", "away_team": "", "home_score": 42, "away_score": 17, "week": 0, "is_final": true, "game_type": "regular|conference_championship|bowl|cfp_quarterfinal|cfp_semifinal|national_championship" }
  ],
  "players": [
    { "name": "", "team": "", "position": "", "yards": 0, "touchdowns": 0, "completions": 0, "attempts": 0, "interceptions": 0, "carries": 0, "receptions": 0 }
  ],
  "standings": [
    { "team_name": "", "wins": 0, "losses": 0, "conference_wins": 0, "conference_losses": 0 }
  ],
  "championship": null,
  "rankings": [
    { "rank": 1, "team_name": "Alabama", "record": "5-0" }
  ],
  "recruiting": [
    { "player_name": "", "position": "", "stars": 0, "school": "", "event_type": "commitment|decommitment|offer|visit" }
  ],
  "playoff_bracket": null,
  "heisman_candidates": [
    { "rank": 1, "player_name": "", "position": "", "team_name": "", "class_year": "", "trend": "up|down|same" }
  ]
}

HEISMAN WATCH INSTRUCTIONS (type = "heisman_watch"):
- Extract every candidate visible: rank (1=best), player_name, position, team_name, class_year (JR, SR, JR (RS), SR (RS), etc.), trend (up/down/same from the CHANGE arrow color)
- Leave games, standings, players, rankings all empty
- "trend" = "up" if arrow is green/pointing up, "down" if red/pointing down, "same" otherwise

RANKINGS INSTRUCTIONS (type = "rankings" or "ap_poll"):
- Extract every ranked team visible: rank number, team name, record if shown, and poll points if shown
- Use the "rankings" array. For ap_poll type, include a "points" field per entry if visible.
- Leave "games", "standings", "players" empty for a pure rankings screenshot
- Example ap_poll entry: { "rank": 1, "team_name": "Alabama", "record": "5-0", "points": 1550 }

For "championship": { "team_name": "", "coach_name": "", "record": "", "opponent_team": "", "opponent_record": "", "result": "56-29", "season": 0, "championship_type": "national|conference|bowl" }
- result = final score of the championship game (winning score first, e.g. "56-29")
- opponent_team = the losing team in the championship game
- opponent_record = the losing team's season record
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

// ─── Recompute standings from all final game results ──────────────────────────
// Called any time new final scores are saved so the teams table stays in sync
// without needing a separate standings screenshot.
async function recomputeStandingsFromGames() {
  try {
    // Fetch all games that have actual scores (both columns non-null)
    const { data: finalGames, error } = await supabase
      .from('games')
      .select('home_team, away_team, home_score, away_score, week, season')
      .not('home_score', 'is', null)
      .not('away_score', 'is', null);

    if (error || !finalGames?.length) return;

    // Build per-team record map
    const records = {};
    // Track game order for streak (week asc)
    const teamGameHistory = {}; // teamName → [{week, won}]

    for (const g of finalGames) {
      if (!g.home_team || !g.away_team) continue;
      const homeWon = (g.home_score ?? 0) > (g.away_score ?? 0);

      for (const [team, isHome] of [[g.home_team, true], [g.away_team, false]]) {
        if (!records[team]) records[team] = { wins: 0, losses: 0, pts: 0, pts_against: 0, season: g.season ?? 1 };
        if (!teamGameHistory[team]) teamGameHistory[team] = [];

        const won = isHome ? homeWon : !homeWon;
        const scored    = isHome ? (g.home_score ?? 0) : (g.away_score ?? 0);
        const conceded  = isHome ? (g.away_score ?? 0) : (g.home_score ?? 0);

        if (won) records[team].wins++;
        else     records[team].losses++;
        records[team].pts         += scored;
        records[team].pts_against += conceded;
        records[team].season       = g.season ?? 1;

        teamGameHistory[team].push({ week: g.week ?? 0, won });
      }
    }

    // Compute streak for each team (most recent N consecutive same result)
    for (const [team, rec] of Object.entries(records)) {
      const history = (teamGameHistory[team] || []).sort((a, b) => (b.week ?? 0) - (a.week ?? 0));
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

      await supabase.from('teams').upsert({
        name:        team,
        season:      rec.season,
        wins:        rec.wins,
        losses:      rec.losses,
        pts:         rec.pts,
        pts_against: rec.pts_against,
        streak:      streak,
      }, { onConflict: 'name,season' });
    }

    // After teams are updated, sync win/loss totals back to coaches table
    await syncCoachRecordsFromTeams(records);

  } catch (err) {
    // Non-critical — never crash the main flow
    console.error('[recomputeStandings] error:', err.message);
  }
}

// ─── Sync coach overall records from freshly-computed team records ────────────
// Called automatically after recomputeStandingsFromGames so coach cards
// stay in sync whenever a scores screenshot is imported.
async function syncCoachRecordsFromTeams(records) {
  try {
    const { data: coaches } = await supabase
      .from('coaches')
      .select('id, name, team, overall_wins, overall_losses, season_records');

    if (!coaches?.length) return;

    for (const coach of coaches) {
      if (!coach.team) continue;
      const teamKey = coach.team.toLowerCase().trim();

      // Find the recalculated record for this coach's team
      const teamRecord = Object.entries(records).find(
        ([name]) => name.toLowerCase().trim() === teamKey
      );
      if (!teamRecord) continue;

      const [, rec] = teamRecord;

      // Build / update season_records array (one entry per season)
      const existingSeasonRecords = Array.isArray(coach.season_records) ? coach.season_records : [];
      const season = rec.season ?? 1;
      const updatedSeasonRecords = [
        ...existingSeasonRecords.filter(r => r.season !== season),
        { season, wins: rec.wins, losses: rec.losses },
      ].sort((a, b) => a.season - b.season);

      await supabase.from('coaches').update({
        overall_wins:   rec.wins,
        overall_losses: rec.losses,
        season_records: updatedSeasonRecords,
        updated_at:     new Date().toISOString(),
      }).eq('id', coach.id);
    }
  } catch (err) {
    console.error('[syncCoachRecords] error:', err.message);
  }
}

// ─── Save Parsed Data to Supabase ─────────────────────────────────────────────
async function saveToSupabase(data, coaches, humanTeams) {
  const saved = { games: 0, players: 0, standings: 0, championship: false, recruiting: 0, rankings: 0, heisman: 0 };

  // Helper: find coach name for a team
  const findCoach = (teamName) => {
    if (!teamName) return null;
    return coaches.find(c => c.team?.toLowerCase() === teamName?.toLowerCase())?.name || null;
  };

  // Save games
  let hasFinalGames = false;
  if (data.games?.length > 0) {
    for (const game of data.games) {
      if (!game.home_team || !game.away_team) continue;
      const rawFinal = game.is_final !== undefined && game.is_final !== null
        ? game.is_final
        : (data.source !== 'schedule_doc' && data.source !== 'schedule_image');

      // A game is ONLY final if it has real non-null, non-zero-zero scores
      const homeScore = game.home_score ?? null;
      const awayScore = game.away_score ?? null;
      const hasRealScores = homeScore !== null && awayScore !== null &&
        !(homeScore === 0 && awayScore === 0);
      const isFinal = rawFinal && hasRealScores;

      if (isFinal) hasFinalGames = true;
      const { error } = await supabase.from('games').upsert({
        home_team:  game.home_team,
        away_team:  game.away_team,
        home_score: hasRealScores ? homeScore : null,
        away_score: hasRealScores ? awayScore : null,
        week:       game.week ?? data.week ?? null,
        is_final:   isFinal,
        game_type:  game.game_type ?? 'regular',
        notes:      game.notes     ?? null,
      }, { onConflict: 'home_team,away_team,week' });
      if (!error) saved.games++;
    }

    // Any time we save final scores, rebuild team standings from all game results
    if (hasFinalGames) {
      await recomputeStandingsFromGames();
    }
  }

  // Save players (only from human teams if we know who they are)
  if (data.players?.length > 0) {
    for (const player of data.players) {
      if (!player.name) continue;
      const { error } = await supabase.from('players').upsert({
        name: player.name,
        team: player.team ?? null,
        pos: player.position ?? null,  // correct column: pos (not position)
        season: data.season ?? 1,
        yards: player.yards ?? 0,
        touchdowns: player.touchdowns ?? 0,
        stats: {
          pass_yds: player.yards ?? 0,
          pass_td: player.touchdowns ?? 0,
          int: player.interceptions ?? 0,
          completions: player.completions ?? 0,
          attempts: player.attempts ?? 0,
          rush_yds: 0,
          rec_yds: 0,
        },
      }, { onConflict: 'name,season' }); // matches unique (name, season) constraint
      if (!error) saved.players++;
    }
  }

  // Save standings
  if (data.standings?.length > 0) {
    for (const team of data.standings) {
      if (!team.team_name) continue;
      const { error } = await supabase.from('teams').upsert({
        name: team.team_name,          // correct column: name (not team_name)
        season: data.season ?? 1,
        wins: team.wins ?? 0,
        losses: team.losses ?? 0,
        conference_wins: team.conference_wins ?? null,
        conference_losses: team.conference_losses ?? null
      }, { onConflict: 'name,season' }); // matches unique (name, season) constraint
      if (!error) saved.standings++;
    }

    // Sync coach win/loss records from updated standings
    if (coaches?.length > 0) {
      // Fetch saved team IDs so we can match by id first
      const { data: savedTeams } = await supabase
        .from('teams')
        .select('id, name');

      for (const team of data.standings) {
        if (!team.team_name) continue;
        const teamKey = team.team_name.toLowerCase().trim();

        // Find the DB team row for this standing
        const dbTeam = (savedTeams || []).find(
          t => (t.name || '').toLowerCase().trim() === teamKey
        );

        // Match coach: prefer team_id link, fall back to name string
        const matchedCoach = dbTeam
          ? coaches.find(c => c.team_id != null && c.team_id === dbTeam.id)
            || coaches.find(c => c.team?.toLowerCase().trim() === teamKey)
          : coaches.find(c => c.team?.toLowerCase().trim() === teamKey);

        if (!matchedCoach?.id) continue;

        // Only update if standings have actual games played
        const hasGames = (team.wins ?? 0) + (team.losses ?? 0) > 0;
        if (!hasGames) continue;

        await supabase.from('coaches')
          .update({
            overall_wins: team.wins ?? matchedCoach.overall_wins,
            overall_losses: team.losses ?? matchedCoach.overall_losses,
            updated_at: new Date().toISOString()
          })
          .eq('id', matchedCoach.id);
      }
    }
  }

  // Save championship
  if (data.championship) {
    const champ = data.championship;
    const coachName = champ.coach_name || findCoach(champ.team_name);
    const champType = champ.championship_type || 'national';
    const { error } = await supabase.from('championships').upsert({
      season:            champ.season ?? new Date().getFullYear(),
      team_name:         champ.team_name,
      coach_name:        coachName,
      record:            champ.record            ?? null,
      opponent_team:     champ.opponent_team      ?? null,
      opponent_record:   champ.opponent_record    ?? null,
      result:            champ.result             ?? null,
      championship_type: champType,
      notes:             champ.notes             ?? null,
    }, { onConflict: 'season,championship_type' });
    if (!error) saved.championship = true;
  }

  // Save AP Poll → league_settings.ap_rankings (read-only in UI, only updated via screenshot)
  if (data.type === 'ap_poll' && data.rankings?.length > 0) {
    const apEntries = data.rankings.map(e => ({
      rank:      e.rank,
      team_name: e.team_name,
      record:    e.record ?? null,
      points:    e.points ?? null,
    }));
    await supabase.from('league_settings').upsert({
      id:                 1,
      ap_rankings:        apEntries,
      ap_poll_updated_at: new Date().toISOString(),
      updated_at:         new Date().toISOString(),
    }, { onConflict: 'id' });
    saved.rankings = apEntries.length;
  }

  // Save CFP/game poll rankings → update rank column on teams
  if (data.type !== 'ap_poll' && data.rankings?.length > 0) {
    for (const entry of data.rankings) {
      if (!entry.team_name || entry.rank == null) continue;
      const season = data.season ?? 1;
      // Upsert team row with rank — create if not exists
      const { error } = await supabase.from('teams').upsert({
        name:   entry.team_name,
        season: season,
        rank:   entry.rank,
      }, { onConflict: 'name,season' });
      if (!error) saved.rankings++;
    }
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

  // Save Heisman Watch candidates
  if (data.type === 'heisman_watch' && data.heisman_candidates?.length > 0) {
    // Replace all candidates for this season
    const season = data.season ?? 1;
    await supabase.from('heisman_watch').delete().eq('season', season);

    for (const c of data.heisman_candidates) {
      if (!c.player_name || !c.team_name || !c.rank) continue;
      const { error } = await supabase.from('heisman_watch').insert({
        rank:         c.rank,
        player_name:  c.player_name,
        position:     c.position    || null,
        team_name:    c.team_name,
        class_year:   c.class_year  || null,
        trend:        c.trend       || 'same',
        key_stats:    {},
        season,
        week_updated: data.week ?? null,
      });
      if (!error) saved.heisman++;
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
    const { data: standings } = await db.from('teams').select('name, wins, losses').order('wins', { ascending: false });

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
