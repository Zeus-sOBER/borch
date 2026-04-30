/**
 * lib/discord-embeds.js — Rich Discord Embed Formatters
 * ─────────────────────────────────────────────────────────────────────────────
 * Transforms Dynasty Universe data into beautiful Discord embeds.
 * Used by both slash commands and webhook notifications.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const COLORS = {
  gold:    0xC5A03F,
  green:   0x27AE60,
  blue:    0x2E75B6,
  red:     0xE74C3C,
  purple:  0x9B59B6,
  orange:  0xF39C12,
  dark:    0x1A1A2E,
  discord: 0x5865F2,
}

// ── Standings Embed ──────────────────────────────────────────────────────────
export function standingsEmbed(teams, settings = {}) {
  const leagueName = settings.league_name || 'Dynasty Universe'
  const sorted = [...teams].sort((a, b) => (b.wins || 0) - (a.wins || 0) || (a.losses || 0) - (b.losses || 0))
  const top15 = sorted.slice(0, 15)

  const lines = top15.map((t, i) => {
    const rank = i + 1
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `\`${String(rank).padStart(2)}\``
    const name = (t.team_name || t.name || 'Unknown').substring(0, 20)
    const record = `${t.wins || 0}-${t.losses || 0}`
    const streak = t.streak ? ` (${t.streak})` : ''
    return `${medal} **${name}** — ${record}${streak}`
  })

  return {
    embeds: [{
      title: `🏈 ${leagueName} Standings`,
      description: lines.join('\n'),
      color: COLORS.gold,
      footer: { text: `Season ${settings.current_season || 1} • Week ${settings.current_week || 0}` },
      timestamp: new Date().toISOString(),
    }]
  }
}

// ── Scores Embed ─────────────────────────────────────────────────────────────
export function scoresEmbed(games, week, settings = {}) {
  const leagueName = settings.league_name || 'Dynasty Universe'
  const weekGames = games.filter(g => g.week === week)

  if (!weekGames.length) {
    return {
      embeds: [{
        title: `📺 Week ${week} Scores`,
        description: 'No games found for this week.',
        color: COLORS.blue,
      }]
    }
  }

  const lines = weekGames.map(g => {
    const homeScore = g.home_score ?? '—'
    const awayScore = g.away_score ?? '—'
    const status = g.is_final ? '**FINAL**' : (g.status || 'Scheduled')
    const homeWin = (g.home_score ?? 0) > (g.away_score ?? 0)
    const awayWin = (g.away_score ?? 0) > (g.home_score ?? 0)
    const homeName = g.is_final && homeWin ? `**${g.home_team}**` : g.home_team
    const awayName = g.is_final && awayWin ? `**${g.away_team}**` : g.away_team
    return `${homeName} ${homeScore} — ${awayScore} ${awayName}  *(${status})*`
  })

  return {
    embeds: [{
      title: `📺 ${leagueName} — Week ${week} Scores`,
      description: lines.join('\n'),
      color: COLORS.blue,
      footer: { text: `Season ${settings.current_season || 1}` },
      timestamp: new Date().toISOString(),
    }]
  }
}

// ── AP Rankings Embed ────────────────────────────────────────────────────────
export function rankingsEmbed(rankings, settings = {}) {
  const leagueName = settings.league_name || 'Dynasty Universe'
  const top25 = rankings.slice(0, 25)

  if (!top25.length) {
    return {
      embeds: [{
        title: '🏆 AP Top 25',
        description: 'No rankings available yet.',
        color: COLORS.purple,
      }]
    }
  }

  const lines = top25.map((r, i) => {
    const rank = i + 1
    const movement = r.lw != null
      ? (r.lw > rank ? ` ⬆${r.lw - rank}` : r.lw < rank ? ` ⬇${rank - r.lw}` : ' ➖')
      : ' 🆕'
    const record = r.record ? ` (${r.record})` : ''
    const pts = r.points ? ` — ${r.points} pts` : ''
    return `**${rank}.** ${r.team_name}${record}${pts}${movement}`
  })

  // Split into two fields if 25 teams (Discord field value max 1024 chars)
  const mid = Math.ceil(top25.length / 2)
  const fields = [
    { name: `#1 – #${mid}`, value: lines.slice(0, mid).join('\n'), inline: true },
    { name: `#${mid + 1} – #${top25.length}`, value: lines.slice(mid).join('\n'), inline: true },
  ]

  return {
    embeds: [{
      title: `🏆 ${leagueName} AP Top 25`,
      color: COLORS.purple,
      fields,
      footer: { text: `Season ${settings.current_season || 1} • Week ${settings.current_week || 0}` },
      timestamp: new Date().toISOString(),
    }]
  }
}

// ── Heisman Watch Embed ──────────────────────────────────────────────────────
export function heismanEmbed(candidates, settings = {}) {
  const leagueName = settings.league_name || 'Dynasty Universe'

  if (!candidates.length) {
    return {
      embeds: [{
        title: '🏅 Heisman Watch',
        description: 'No Heisman candidates yet.',
        color: COLORS.orange,
      }]
    }
  }

  const trendIcon = { up: '🔺', down: '🔻', same: '➖' }
  const lines = candidates.map((c, i) => {
    const rank = i + 1
    const trophy = rank === 1 ? '🏆' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`
    const trend = trendIcon[c.trend] || ''
    const team = c.team ? ` (${c.team})` : ''
    const pos = c.position ? ` — ${c.position}` : ''
    const classYear = c.class_year ? ` | ${c.class_year}` : ''
    return `${trophy} **${c.player_name}**${team}${pos}${classYear} ${trend}`
  })

  return {
    embeds: [{
      title: `🏅 ${leagueName} Heisman Watch`,
      description: lines.join('\n'),
      color: COLORS.orange,
      footer: { text: `Season ${settings.current_season || 1}` },
      timestamp: new Date().toISOString(),
    }]
  }
}

// ── Article Embed (rich version) ─────────────────────────────────────────────
export function articleEmbed(article, settings = {}) {
  const leagueName = settings.league_name || 'Dynasty Universe'
  const typeLabels = {
    'power-rankings': '📊 Power Rankings',
    'weekly-recap': '📋 Weekly Recap',
    'player-spotlight': '⭐ Player Spotlight',
    'rivalry-breakdown': '🔥 Rivalry Breakdown',
    'matchup-preview': '🎯 Matchup Preview',
    'league-preview': '🏈 League Preview',
    'custom': '📝 Feature Story',
  }
  const typeLabel = typeLabels[article.article_type] || '📰 Article'

  // Extract first ~280 chars of content as preview
  const preview = (article.content || '')
    .replace(/[#*_~`>]/g, '')
    .substring(0, 280)
    .trim() + '...'

  return {
    embeds: [{
      title: article.title || typeLabel,
      description: preview,
      color: COLORS.gold,
      author: { name: `${leagueName} Media` },
      fields: [
        { name: 'Type', value: typeLabel, inline: true },
        article.week ? { name: 'Week', value: `Week ${article.week}`, inline: true } : null,
      ].filter(Boolean),
      footer: { text: `${leagueName} • AI-Generated` },
      timestamp: new Date().toISOString(),
    }]
  }
}

// ── Big Moment Embed (rich version) ──────────────────────────────────────────
export function bigMomentEmbed(moment) {
  const icons = {
    touchdown: '🏈', interception: '🔄', fumble: '💨',
    championship: '🏆', upset: '😱', big_play: '⚡',
    recruiting: '📋', clutch: '🎯',
  }
  const icon = icons[moment.type] || '⚡'

  return {
    embeds: [{
      title: `${icon} ${(moment.type || 'BIG MOMENT').replace(/_/g, ' ').toUpperCase()}`,
      description: moment.description || 'A big moment just happened in the dynasty!',
      color: COLORS.green,
      fields: [
        moment.home_team && moment.away_team
          ? { name: 'Matchup', value: `${moment.home_team} vs ${moment.away_team}`, inline: true }
          : null,
        moment.player ? { name: 'Player', value: moment.player, inline: true } : null,
        moment.score ? { name: 'Score', value: moment.score, inline: true } : null,
      ].filter(Boolean),
      timestamp: new Date().toISOString(),
    }]
  }
}

// ── Prediction Poll Embed ────────────────────────────────────────────────────
export function predictionPollEmbed(games, week, settings = {}) {
  const leagueName = settings.league_name || 'Dynasty Universe'
  const upcoming = games.filter(g => g.week === week && !g.is_final)

  if (!upcoming.length) {
    return {
      embeds: [{
        title: `🔮 Week ${week} Predictions`,
        description: 'No upcoming games to predict!',
        color: COLORS.discord,
      }]
    }
  }

  const lines = upcoming.map((g, i) => {
    return `**Game ${i + 1}:** ${g.away_team} @ ${g.home_team}`
  })

  return {
    embeds: [{
      title: `🔮 ${leagueName} — Week ${week} Predictions`,
      description: 'Who wins each matchup? React below!\n\n' + lines.join('\n'),
      color: COLORS.discord,
      footer: { text: 'React with the game number to vote for the home team, or 🅰️ for away!' },
      timestamp: new Date().toISOString(),
    }]
  }
}

// ── Hot Take Embed ───────────────────────────────────────────────────────────
export function hotTakeEmbed(take, settings = {}) {
  const leagueName = settings.league_name || 'Dynasty Universe'
  return {
    embeds: [{
      title: '🌶️ Daily Hot Take',
      description: take,
      color: COLORS.red,
      author: { name: `${leagueName} AI` },
      footer: { text: 'Agree? Disagree? React below 👇' },
      timestamp: new Date().toISOString(),
    }]
  }
}

// ── Weekly Digest Embed ──────────────────────────────────────────────────────
export function weeklyDigestEmbed(data, settings = {}) {
  const leagueName = settings.league_name || 'Dynasty Universe'
  const { topWin, biggestUpset, heismanLeader, weekNum, gamesPlayed } = data

  const fields = [
    gamesPlayed ? { name: '🎮 Games Played', value: `${gamesPlayed}`, inline: true } : null,
    topWin ? { name: '💪 Top Performance', value: topWin, inline: true } : null,
    biggestUpset ? { name: '😱 Biggest Upset', value: biggestUpset, inline: true } : null,
    heismanLeader ? { name: '🏅 Heisman Leader', value: heismanLeader, inline: true } : null,
  ].filter(Boolean)

  return {
    embeds: [{
      title: `📰 ${leagueName} — Week ${weekNum} Digest`,
      description: `Here's everything that happened in Week ${weekNum} of the dynasty.`,
      color: COLORS.gold,
      fields,
      footer: { text: `Season ${settings.current_season || 1}` },
      timestamp: new Date().toISOString(),
    }]
  }
}
