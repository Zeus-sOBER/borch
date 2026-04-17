/**
 * /api/generate-lore.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Dynasty Lore Generator — Narrative-Aware
 *
 * Now pulls full season narrative context before writing, so Claude can:
 *  - Reference streaks and rivalries that have been building
 *  - Avoid repeating lore that was already written
 *  - Build on previous articles and moments
 *  - Grow the dynasty story coherently over time
 *
 * Types: game_lore | recruiting_lore | season_chronicle | breaking_news
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getNarrativeContext, logNarrativeEvent } from '../../lib/narrative';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { moments, recruitingEvents, teams, loreType, season = 1, week } = req.body;

  // ── Format the raw event data passed from the frontend ──────────────────
  const momentsText = moments?.slice(0, 10).map(m =>
    `[${m.type.toUpperCase()}] ${m.description} — ${m.team}${m.player ? ` (${m.player})` : ''} | ${m.home_team} vs ${m.away_team} Q${m.quarter}`
  ).join('\n') || 'No moments captured yet.';

  const recruitText = recruitingEvents?.slice(0, 10).map(r =>
    `${r.type.toUpperCase()}: ${r.stars}⭐ ${r.pos} ${r.player_name} → ${r.committing_to}`
  ).join('\n') || 'No recruiting events yet.';

  // ── Pull full narrative context from the hub ─────────────────────────────
  const { contextText: narrativeContext } = await getNarrativeContext({
    season,
    limit: 35,
    eventTypes: ['game', 'moment', 'recruiting', 'lore', 'article'],
    includeContent: false, // Keep prompts lean — use titles/summaries only
  });

  // ── Also grab previous lore titles to avoid repetition ──────────────────
  const { contextText: previousLoreContext } = await getNarrativeContext({
    season,
    limit: 10,
    eventTypes: ['lore'],
    includeContent: false,
  });

  // ── Build a self-awareness block so Claude doesn't repeat itself ─────────
  const selfAwarenessBlock = `
WHAT HAS ALREADY BEEN WRITTEN THIS SEASON (do not repeat these stories — build on them or reference them briefly):
${previousLoreContext || 'Nothing written yet — you are starting the dynasty story from scratch.'}
`;

  // ── Narrative timeline block ─────────────────────────────────────────────
  const narrativeBlock = `
FULL SEASON NARRATIVE TIMELINE (use this to build continuity, reference real events, name the coaches involved):
${narrativeContext || 'No season history recorded yet.'}
`;

  // ── Article-specific prompts ─────────────────────────────────────────────
  const PROMPTS = {
    game_lore: `You are a legendary college football storyteller and dynasty chronicler for an EA Sports CFB 26 online dynasty universe.

Based on the live game moments below AND the season narrative timeline, write a 500-word dramatic narrative piece.
Give it a bold headline. Write it like a historic Sports Illustrated long-form feature — vivid, emotional, with a sense of dynasty legacy and stakes.
Reference players, teams, coaches by name. Build on the season story already established.

${selfAwarenessBlock}
${narrativeBlock}

TONIGHT'S GAME MOMENTS:
${momentsText}

IMPORTANT: Reference coach names from the narrative timeline when they're involved. Connect this game to streaks, rivalries, or storylines already in progress.`,

    recruiting_lore: `You are a college football recruiting analyst and dynasty storyteller.

Based on the recruiting events below AND the season context, write a compelling 450-word piece about the recruiting battles, commitments, and class building in this dynasty.
Include a bold headline. Write it like ESPN's recruiting coverage — who's winning the recruiting wars, what these commitments mean for the future of each coach's program.

${selfAwarenessBlock}
${narrativeBlock}

TODAY'S RECRUITING EVENTS:
${recruitText}

Name the coaches whose programs are featured. Connect recruiting wins to on-field performance arcs you see in the narrative timeline.`,

    season_chronicle: `You are the official chronicler of a college football dynasty universe.

Based on the live game moments, recruiting events, AND the full season narrative timeline below, write a 600-word "Season Chronicle" entry.
This is a dramatic, immersive historical record of what has happened so far this season.
Bold headline required. Write it like a chapter from a dynasty history book.
Reference coaches, streaks, upsets, and rivalries by name.

${selfAwarenessBlock}
${narrativeBlock}

CURRENT GAME MOMENTS:
${momentsText}

RECRUITING:
${recruitText}

This is a cumulative record — synthesize the entire season arc, not just this week. Make each coach a main character in the story.`,

    breaking_news: `You are an ESPN breaking news anchor for a college football dynasty universe.

Based on the most recent game moments AND the season context, write a punchy 250-word breaking news alert.
Bold headline. Use urgent, breaking-news language.
Cover the biggest moments and connect them to ongoing storylines (streaks, rivalries, hot seats) from the narrative timeline.
End with a "What's Next" sentence.

${narrativeBlock}

MOST RECENT MOMENTS:
${momentsText}

If any of these moments are upsets, extensions of win/loss streaks, or rivalry results — say so explicitly.`,
  };

  const prompt = PROMPTS[loreType] || PROMPTS.game_lore;

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await claudeRes.json();
    const loreText = data.content?.map(c => c.text || '').join('') || '';

    // ── Extract a headline from the first line for the narrative title ──────
    const titleLine = loreText.split('\n').find(l => l.trim().length > 0) || '';
    const loreTitle = titleLine.replace(/^#+\s*/, '').replace(/\*+/g, '').trim().substring(0, 120);

    // ── Save the lore back to the Narrative Hub ───────────────────────────
    const loreTypeWeights = {
      season_chronicle: 5,
      game_lore:        3,
      recruiting_lore:  3,
      breaking_news:    4,
    };

    await logNarrativeEvent({
      event_type:          'lore',
      season,
      week:                week ?? null,
      title:               loreTitle || `${loreType.replace(/_/g, ' ')} — Season ${season}`,
      summary:             `${loreType.replace(/_/g, ' ')} generated for Season ${season}${week ? `, Week ${week}` : ''}`,
      content:             loreText,
      narrative_weight:    loreTypeWeights[loreType] ?? 3,
      momentum_tags:       [loreType],
      is_season_highlight: loreType === 'season_chronicle',
      source_table:        null,
    }).catch(err => console.error('[narrative] lore log error:', err.message));

    res.status(200).json({ lore: loreText });

  } catch (e) {
    console.error('[generate-lore] error:', e);
    res.status(500).json({ error: e.message });
  }
}
