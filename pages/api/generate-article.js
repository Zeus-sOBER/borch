export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { articleType, teams, scores, players } = req.body

  const standingsText = teams?.map((t, i) =>
    `${i + 1}. ${t.name} (${t.wins}-${t.losses}), coached by ${t.coach}, streak: ${t.streak}`
  ).join('\n') || 'No standings data yet.'

  const scoresText = scores?.filter(s => s.status === 'Final').map(g =>
    `${g.home_team} ${g.home_score}, ${g.away_team} ${g.away_score} (Week ${g.week})`
  ).join('\n') || 'No completed games yet.'

  const upcomingText = scores?.filter(s => s.status === 'Upcoming').map(g =>
    `${g.home_team} vs ${g.away_team} (Week ${g.week})`
  ).join('\n') || 'No upcoming games listed.'

  const playerText = players?.map(p => {
    const s = p.stats || {}
    if (p.pos === 'QB') return `${p.name} (${p.team}, QB): ${s.pass_yds} pass yds, ${s.pass_td} TDs, ${s.int} INTs, ${s.rush_yds} rush yds`
    if (p.pos === 'RB') return `${p.name} (${p.team}, RB): ${s.rush_yds} rush yds, ${s.rush_td} TDs, ${s.rec} rec, ${s.rec_yds} rec yds`
    if (p.pos === 'WR') return `${p.name} (${p.team}, WR): ${s.rec} rec, ${s.rec_yds} yds, ${s.rec_td} TDs`
    return `${p.name} (${p.team}, ${p.pos})`
  }).join('\n') || 'No player data yet.'

  const PROMPTS = {
    power_rankings: `You are an ESPN senior college football analyst covering an EA Sports CFB 26 online dynasty league. Write a compelling, analytical 500-word power rankings article. Include a bold headline, a brief intro paragraph, then rank the top 5 teams with 2-3 sentences of analysis each. Close with a "Teams to Watch" blurb. Use a polished, authoritative ESPN tone.\n\nLeague Standings:\n${standingsText}\n\nRecent Results:\n${scoresText}`,
    weekly_recap: `You are an ESPN college football journalist recapping the latest week in an EA Sports CFB 26 online dynasty. Write a 500-word game recap. Lead with a dramatic headline and lede. Cover each game with 2-3 sentences. End with a "Storylines Heading Into Next Week" section.\n\nScores:\n${scoresText}\n\nStandings Context:\n${standingsText}`,
    player_spotlight: `You are an ESPN analyst writing a player spotlight feature for an EA Sports CFB 26 dynasty. Based on the stats below, pick the most impressive player and write a 450-word feature. Include a compelling headline, a narrative intro, stat breakdown, what makes them elite this season, and what their performance means for their team.\n\nPlayer Stats:\n${playerText}`,
    rivalry_breakdown: `You are an ESPN analyst previewing the most compelling upcoming matchup in an EA Sports CFB 26 online dynasty. Write a 500-word rivalry breakdown. Include a dramatic headline, invent compelling dynasty backstory for these two programs, what's at stake, key matchups, and a final prediction.\n\nUpcoming Games:\n${upcomingText}\n\nStandings:\n${standingsText}`,
  }

  const prompt = PROMPTS[articleType]
  if (!prompt) return res.status(400).json({ error: 'Invalid article type' })

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
    res.status(200).json({ article: text })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
}
