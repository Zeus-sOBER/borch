export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { moments, recruitingEvents, teams, loreType } = req.body

  const momentsText = moments?.slice(0, 10).map(m =>
    `[${m.type.toUpperCase()}] ${m.description} — ${m.team}${m.player ? ` (${m.player})` : ''} | ${m.home_team} vs ${m.away_team} Q${m.quarter}`
  ).join('\n') || 'No moments captured yet.'

  const recruitText = recruitingEvents?.slice(0, 10).map(r =>
    `${r.type.toUpperCase()}: ${r.stars}⭐ ${r.pos} ${r.player_name} → ${r.committing_to}`
  ).join('\n') || 'No recruiting events yet.'

  const PROMPTS = {
    game_lore: `You are a legendary college football storyteller and dynasty chronicler for an EA Sports CFB 26 online dynasty universe. Based on the live game moments captured below, write a 500-word dramatic narrative piece. Give it a bold headline. Write it like a historic Sports Illustrated long-form feature — vivid, emotional, with a sense of dynasty legacy and stakes. Reference players, teams, and moments specifically.\n\nGame Moments:\n${momentsText}`,
    recruiting_lore: `You are a college football recruiting analyst and dynasty storyteller. Based on the recruiting events below, write a compelling 450-word piece about the recruiting battles, commitments, and class building happening in this dynasty. Include a bold headline. Write it like ESPN's recruiting coverage — who's winning the recruiting wars, what these commitments mean for the future.\n\nRecruiting Events:\n${recruitText}`,
    season_chronicle: `You are the official chronicler of a college football dynasty universe. Based on the live game moments and recruiting events below, write a 600-word "Season Chronicle" entry — a dramatic, immersive historical record of what has happened so far this season. Bold headline required. Write it like a chapter from a dynasty history book.\n\nGame Moments:\n${momentsText}\n\nRecruiting:\n${recruitText}`,
    breaking_news: `You are an ESPN breaking news anchor for a college football dynasty universe. Based on the most recent game moments below, write a punchy 250-word breaking news alert. Bold headline. Use urgent, breaking-news language. Cover the biggest moments. End with a "What's Next" sentence.\n\nMost Recent Moments:\n${momentsText}`,
  }

  const prompt = PROMPTS[loreType] || PROMPTS.game_lore

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
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await claudeRes.json()
    const text = data.content?.map(c => c.text || '').join('') || ''
    res.status(200).json({ lore: text })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
