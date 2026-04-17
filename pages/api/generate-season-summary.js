/**
 * /api/generate-season-summary.js
 * ─────────────────────────────────────────────────────────────────────────────
 * End-of-Season Summary Generator
 *
 * Pulls all is_season_highlight=true entries from narrative_log and generates
 * a cinematic, 30-for-30-style season retrospective covering:
 *   - The coaches who defined the season
 *   - The biggest upsets and momentum swings
 *   - Championship arcs
 *   - Who rose, who fell, who surprised everyone
 *
 * Commissioner PIN required.
 *
 * POST /api/generate-season-summary
 * Body: { pin: "...", season: 1 }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { getNarrativeContext, logNarrativeEvent } from '../../lib/narrative';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { pin, season = 1 } = req.body;

  if (!pin || pin !== process.env.COMMISSIONER_PIN) {
    return res.status(401).json({ error: 'Commissioner PIN required to generate season summary.' });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // ── Pull season highlights (the moments that mattered) ────────────────
    const { entries: highlights, contextText: highlightContext } = await getNarrativeContext({
      season,
      limit: 50,
      highlightsOnly: true,
    });

    if (!highlights.length) {
      return res.status(400).json({
        error: 'No season highlights found. Play some games and generate content first — the system will automatically mark major moments as highlights.',
      });
    }

    // ── Pull all coaches for character context ────────────────────────────
    const { data: coaches } = await supabase
      .from('coaches')
      .select('name, team, coaching_style, bio, overall_wins, overall_losses, season_records, achievements')
      .order('overall_wins', { ascending: false });

    const coachProfiles = (coaches || []).map(c => {
      const thisSeasonRecord = c.season_records?.find(s => s.season === season);
      const record = thisSeasonRecord
        ? `${thisSeasonRecord.wins}-${thisSeasonRecord.losses} (finished ${thisSeasonRecord.finish || 'unknown'})`
        : (c.overall_wins !== undefined ? `${c.overall_wins}-${c.overall_losses} overall` : 'record unknown');

      return [
        `${c.name} (${c.team}) — Season Record: ${record}`,
        c.coaching_style ? `  Style: ${c.coaching_style}` : '',
        c.bio ? `  Background: ${c.bio}` : '',
      ].filter(Boolean).join('\n');
    }).join('\n\n');

    // ── Pull final standings ──────────────────────────────────────────────
    const { data: standings } = await supabase
      .from('teams')
      .select('team_name, wins, losses')
      .order('wins', { ascending: false });

    const humanTeams = (coaches || []).map(c => c.team?.toLowerCase()).filter(Boolean);
    const finalStandings = (standings || [])
      .filter(t => humanTeams.includes(t.team_name?.toLowerCase()))
      .map((t, i) => {
        const coach = coaches?.find(c => c.team?.toLowerCase() === t.team_name?.toLowerCase());
        return `#${i + 1} ${t.team_name} (${t.wins}-${t.losses})${coach ? ` — ${coach.name}` : ''}`;
      }).join('\n');

    // ── Pull championship record ──────────────────────────────────────────
    const { data: championships } = await supabase
      .from('championships')
      .select('*')
      .eq('season', season);

    const champText = championships?.length
      ? championships.map(c => `${c.championship_type || 'Championship'}: ${c.team_name} (Coach: ${c.coach_name || 'unknown'}, ${c.record || '?'})`).join('\n')
      : 'No championship data recorded.';

    // ── Build the prompt ──────────────────────────────────────────────────
    const prompt = `You are writing the official Dynasty Universe Season ${season} retrospective.

This is the 30-for-30. The definitive record. The document future coaches will point to when they talk about what happened this season.

Write approximately 800-1000 words. Bold headline. No fluff — every paragraph earns its place.

THE COACHES WHO PLAYED THIS SEASON:
${coachProfiles}

FINAL STANDINGS:
${finalStandings || 'Standings data unavailable.'}

SEASON CHAMPIONS:
${champText}

THE MOMENTS THAT DEFINED THIS SEASON (your source material — these are the real events, upsets, and turning points):
${highlightContext}

WRITING INSTRUCTIONS:
- Open with a single dramatic sentence that captures the essence of the entire season
- Write act-by-act: early season establishment → mid-season drama → late-season climax → championship / denouement
- Every coach must appear by name. Some rose. Some fell. Tell both stories.
- Name the upsets, the streaks, the rivalries. Reference the actual titles/summaries from the highlight moments above.
- Close with a "Where do we go from here?" paragraph — set up next season's storylines based on what just happened
- Tone: ESPN Films documentary narrator. Cinematic but factual. Earned emotion, not manufactured drama.
- Do NOT invent events that aren't in the highlights list. If data is thin on a coach, acknowledge it briefly and move on.

This is the document that lives forever in the dynasty archives. Make it worth reading in Season 10.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }]
    });

    const summary = response.content[0].text;

    // Extract headline
    const headlineLine = summary.split('\n').find(l => l.trim().length > 0) || '';
    const headline = headlineLine.replace(/^#+\s*/, '').replace(/\*+/g, '').trim().substring(0, 150);

    // Save the season summary to the articles table
    await supabase.from('articles').insert({
      article_type: 'season-summary',
      week: null,
      title: headline || `Season ${season} — The Dynasty Chronicle`,
      content: summary,
      edited_by: 'commissioner',
    });

    // Log it to narrative hub as the highest-weight entry of the season
    await logNarrativeEvent({
      event_type:          'lore',
      season,
      title:               headline || `Season ${season} — The Dynasty Chronicle`,
      summary:             `End-of-season retrospective for Season ${season} — ${highlights.length} highlights synthesized`,
      content:             summary,
      narrative_weight:    5,
      momentum_tags:       ['season_chronicle', 'season_finale'],
      is_season_highlight: true,
      source_table:        'articles',
    });

    return res.status(200).json({
      summary,
      highlightsUsed: highlights.length,
      title: headline,
    });

  } catch (error) {
    console.error('[season-summary] error:', error);
    return res.status(500).json({ error: error.message });
  }
}
