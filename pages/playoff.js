import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#09090b', surface: '#101014', card: '#17171d', border: '#1f1f2e',
  accent: '#c9a84c', green: '#4caf7d', red: '#e05252', blue: '#4a90d9',
  purple: '#9b7fd4', text: '#e8eaed', muted: '#8b949e', subtle: '#2a2a3a',
}

// ── ESPN team logos (same map as index.js) ────────────────────────────────────
const ESPN_IDS = {
  'air force':2005,'akron':2006,'alabama':333,'appalachian state':2026,
  'arizona':12,'arizona state':9,'arkansas':8,'army':349,'auburn':2,
  'ball state':2050,'baylor':239,'boise state':68,'bowling green':189,
  'brigham young':252,'byu':252,'buffalo':2084,'california':25,'cal':25,
  'central florida':2116,'ucf':2116,'central michigan':2117,'cincinnati':2132,
  'clemson':228,'coastal carolina':324,'colorado':38,'colorado state':36,
  'duke':150,'east carolina':151,'florida':57,'florida state':52,'fsu':52,
  'fresno state':278,'georgia':61,'georgia southern':290,'georgia tech':59,
  'houston':248,'illinois':356,'indiana':84,'iowa':2294,'iowa state':66,
  'james madison':2561,'kansas':2305,'kansas state':2306,'kent state':2309,
  'kentucky':96,'liberty':2335,'louisiana':309,'louisville':97,'lsu':99,
  'maryland':120,'memphis':235,'miami':2390,'miami fl':2390,'miami (fl)':2390,
  'miami oh':193,'miami ohio':193,'miami university':193,'michigan':130,
  'michigan state':127,'minnesota':135,'mississippi':145,'ole miss':145,
  'mississippi state':344,'missouri':142,'navy':2426,'nebraska':158,
  'nc state':152,'north carolina':153,'unc':153,'northern illinois':2459,
  'notre dame':87,'ohio':195,'ohio state':194,'oklahoma':201,
  'oklahoma state':197,'old dominion':2427,'oregon':2483,'oregon state':204,
  'penn state':213,'pittsburgh':221,'pitt':221,'purdue':2509,'rutgers':164,
  'smu':2567,'south carolina':2579,'southern california':30,'usc':30,
  'stanford':24,'syracuse':183,'tcu':2628,'tennessee':2633,'texas':251,
  'texas a&m':245,'texas tech':2641,'toledo':2649,'troy':2653,'tulane':2655,
  'tulsa':202,'ucla':26,'utah':254,'utah state':328,'vanderbilt':238,
  'virginia':258,'virginia tech':259,'wake forest':154,'washington':264,
  'washington state':265,'west virginia':277,'western michigan':269,
  'wisconsin':275,'wyoming':278,
}
const BADGE_COLORS = ['#c9a84c','#9b7fd4','#4a90d9','#4caf7d','#e07b52','#52c0e0','#e052a0']
function badgeColor(name) {
  let h = 0
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return BADGE_COLORS[Math.abs(h) % BADGE_COLORS.length]
}
function getEspnId(name) {
  if (!name) return null
  const k = name.toLowerCase().trim()
  if (ESPN_IDS[k] != null) return ESPN_IDS[k]
  for (const [key, id] of Object.entries(ESPN_IDS)) {
    if (key !== k && key.includes(k)) return id
  }
  return null
}

function TeamLogo({ team, size = 28 }) {
  const id = getEspnId(team)
  const [failed, setFailed] = useState(!id)
  const initials = (team || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const color = badgeColor(team)
  if (failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: Math.round(size * 0.18),
        background: color + '22', border: `1px solid ${color}55`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: Math.round(size * 0.38),
        fontFamily: "'Oswald', sans-serif", fontWeight: 700, color,
      }}>{initials}</div>
    )
  }
  return (
    <img
      src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`}
      alt={team} width={size} height={size}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  )
}

// ── Game card used in all bracket columns ─────────────────────────────────────
function GameCard({ game, records, highlight = false, compact = false, fullWidth = false }) {
  if (!game) {
    return (
      <div style={{
        background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 8,
        padding: '14px 12px', opacity: 0.35, textAlign: 'center',
        fontSize: 12, color: C.muted, fontFamily: "'Oswald', sans-serif", letterSpacing: 1,
      }}>TBD</div>
    )
  }

  const { home_team, away_team, home_score, away_score, is_final, notes } = game
  const final = is_final && home_score != null && away_score != null && !(home_score === 0 && away_score === 0)
  const homeWon = final && home_score > away_score
  const awayWon = final && away_score > home_score
  const logoSize = fullWidth ? 26 : compact ? 18 : 22

  const TeamRow = ({ team, score, won, isAway }) => {
    const rec = records?.[team]
    const recStr = rec ? `${rec.wins}-${rec.losses}` : null
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: fullWidth ? '9px 0' : '6px 0',
        borderBottom: isAway ? `1px solid ${C.border}` : 'none',
        opacity: final && !won ? 0.5 : 1,
      }}>
        <TeamLogo team={team} size={logoSize} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: fullWidth ? 14 : compact ? 12 : 13,
            fontWeight: 700, color: won ? C.accent : C.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {team || 'TBD'}
          </div>
          {recStr && <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{recStr}</div>}
        </div>
        {final && (
          <div style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: fullWidth ? 22 : compact ? 16 : 18,
            fontWeight: 700, color: won ? C.accent : C.muted,
            minWidth: 32, textAlign: 'right', flexShrink: 0,
          }}>{score}</div>
        )}
      </div>
    )
  }

  return (
    <div style={{
      background: highlight ? C.accent + '0d' : C.card,
      border: `1px solid ${highlight ? C.accent + '55' : C.border}`,
      borderRadius: 8, padding: fullWidth ? '12px 16px' : compact ? '8px 10px' : '10px 12px',
    }}>
      <TeamRow team={away_team} score={away_score} won={awayWon} isAway />
      <TeamRow team={home_team} score={home_score} won={homeWon} isAway={false} />
      {notes && (
        <div style={{ fontSize: 10, color: C.muted, marginTop: 6, fontStyle: 'italic', textAlign: 'right' }}>
          {notes}
        </div>
      )}
      {!final && (
        <div style={{ fontSize: 10, color: C.muted, marginTop: 5, textAlign: 'right', fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5 }}>
          SCHEDULED
        </div>
      )}
    </div>
  )
}

// ── A single round column ─────────────────────────────────────────────────────
function RoundColumn({ label, sublabel, games, records, highlight = false, isMobile }) {
  return (
    <div style={{ flex: 1, minWidth: isMobile ? '100%' : 160, maxWidth: isMobile ? '100%' : 260 }}>
      <div style={{
        textAlign: 'center', marginBottom: 12,
        paddingBottom: 10, borderBottom: `1px solid ${C.border}`,
      }}>
        <div style={{
          fontFamily: "'Oswald', sans-serif", fontSize: 13, fontWeight: 700,
          letterSpacing: 1.5, textTransform: 'uppercase',
          color: highlight ? C.accent : C.text,
        }}>{label}</div>
        {sublabel && <div style={{ fontSize: 10, color: C.muted, marginTop: 3 }}>{sublabel}</div>}
        <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
          {games.filter(g => g?.is_final).length} / {games.length} played
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {games.length === 0
          ? <div style={{ textAlign: 'center', padding: 20, color: C.muted, fontSize: 12 }}>No games yet</div>
          : games.map((g, i) => (
            <GameCard key={g?.id ?? i} game={g} records={records} highlight={highlight} />
          ))
        }
      </div>
    </div>
  )
}

// ── Connector lines between rounds (desktop only) ─────────────────────────────
function Connector({ pairs }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-around', width: 28, flexShrink: 0, marginTop: 46 }}>
      {pairs.map((_, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', paddingTop: i === 0 ? 0 : 10, paddingBottom: 10 }}>
          <div style={{ width: '50%', borderRight: `1px solid ${C.border}`, borderTop: i % 2 === 0 ? `1px solid ${C.border}` : 'none', borderBottom: i % 2 === 1 ? `1px solid ${C.border}` : 'none', height: '50%', alignSelf: i % 2 === 0 ? 'flex-start' : 'flex-end' }} />
          {i % 2 === 1 && <div style={{ width: '50%', borderLeft: 'none', borderRight: `1px solid ${C.border}44`, height: 1, alignSelf: 'flex-end' }} />}
        </div>
      ))}
    </div>
  )
}

// ── Season records table ──────────────────────────────────────────────────────
function RecordsTable({ records, isMobile }) {
  const sorted = Object.entries(records)
    .map(([team, r]) => ({ team, ...r, pct: r.wins / (r.wins + r.losses || 1) }))
    .sort((a, b) => b.pct - a.pct || b.wins - a.wins)

  if (!sorted.length) return <div style={{ color: C.muted, fontSize: 13, padding: 20 }}>No completed games yet.</div>

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${C.border}` }}>
            {['#','Team','W','L','Pct','PF','PA','Diff'].map(h => (
              <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Team' ? 'left' : 'center', color: C.muted, fontFamily: "'Oswald', sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, i) => (
            <tr key={t.team} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? 'transparent' : C.surface + '55' }}>
              <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: "'Oswald', sans-serif", fontSize: 16, color: i < 4 ? C.accent : C.muted }}>{i + 1}</td>
              <td style={{ padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TeamLogo team={t.team} size={20} />
                  <span style={{ fontWeight: 600, color: C.text }}>{t.team}</span>
                </div>
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'center', color: C.green, fontFamily: "'Oswald', sans-serif", fontSize: 16, fontWeight: 700 }}>{t.wins}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', color: C.red, fontFamily: "'Oswald', sans-serif", fontSize: 16, fontWeight: 700 }}>{t.losses}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', color: C.muted, fontSize: 12 }}>{t.pct.toFixed(3).replace(/^0/, '')}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', color: C.text, fontSize: 12 }}>{t.pf}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', color: C.muted, fontSize: 12 }}>{t.pa}</td>
              <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12 }}>
                <span style={{ color: (t.pf - t.pa) >= 0 ? C.green : C.red }}>
                  {(t.pf - t.pa) >= 0 ? '+' : ''}{t.pf - t.pa}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Game log (all games, all weeks) ──────────────────────────────────────────
function GameLog({ games, records, isMobile }) {
  const [expandWeek, setExpandWeek] = useState(null)

  const byWeek = {}
  for (const g of games) {
    const w = g.week ?? 0
    if (!byWeek[w]) byWeek[w] = []
    byWeek[w].push(g)
  }
  const weeks = Object.keys(byWeek).map(Number).sort((a, b) => a - b)

  return (
    <div>
      {weeks.map(w => {
        const wGames = byWeek[w]
        const finished = wGames.filter(g => g.is_final).length
        const open = expandWeek === w
        return (
          <div key={w} style={{ marginBottom: 8 }}>
            <button
              onClick={() => setExpandWeek(open ? null : w)}
              style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: open ? C.card : C.surface, border: `1px solid ${open ? C.accent + '44' : C.border}`,
                borderRadius: open ? '6px 6px 0 0' : 6, padding: '10px 16px',
                color: C.text, cursor: 'pointer', fontSize: 13,
              }}
            >
              <span style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: 1 }}>WEEK {w}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: finished === wGames.length ? C.green : C.muted }}>
                  {finished}/{wGames.length} final
                </span>
                <span style={{ color: C.muted, fontSize: 14 }}>{open ? '▲' : '▼'}</span>
              </div>
            </button>
            {open && (
              <div style={{
                background: C.card, border: `1px solid ${C.accent + '44'}`,
                borderTop: 'none', borderRadius: '0 0 6px 6px', padding: 12,
                display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10,
              }}>
                {wGames.map(g => <GameCard key={g.id} game={g} records={records} compact />)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── National championship banner ──────────────────────────────────────────────
function ChampionBanner({ game }) {
  if (!game || !game.is_final) return null
  const homeWon = game.home_score > game.away_score
  const champ = homeWon ? game.home_team : game.away_team
  const score = homeWon
    ? `${game.home_score}–${game.away_score}`
    : `${game.away_score}–${game.home_score}`
  const loser = homeWon ? game.away_team : game.home_team
  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.accent}22 0%, ${C.surface} 100%)`,
      border: `2px solid ${C.accent}88`, borderRadius: 12,
      padding: '20px 16px', textAlign: 'center', marginBottom: 24,
    }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>🏆</div>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, letterSpacing: 3, color: C.accent, textTransform: 'uppercase', marginBottom: 8 }}>National Champion</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
        <TeamLogo team={champ} size={40} />
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, fontWeight: 700, color: C.accent }}>{champ}</div>
      </div>
      <div style={{ fontSize: 12, color: C.muted }}>
        def. <span style={{ color: C.text }}>{loser}</span> · <span style={{ color: C.text, fontWeight: 600 }}>{score}</span>
        {game.notes ? <span> · {game.notes}</span> : null}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PlayoffBracket() {
  const [data, setData]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [tab, setTab]           = useState('bracket')
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const loadData = useCallback(() => {
    fetch('/api/playoff-data')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => { loadData() }, [loadData])

  // Auto-refresh whenever Supabase game rows change
  useEffect(() => {
    const channel = supabase
      .channel('playoff-games-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
        loadData()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [loadData])

  const TABS = [
    { id: 'bracket',  label: '🏆 CFP Bracket' },
    { id: 'confchamp',label: '🎖 Conf. Championships' },
    { id: 'bowls',    label: '🏈 Bowl Games' },
    { id: 'records',  label: '📊 Season Records' },
    { id: 'log',      label: '📅 All Games' },
  ]

  return (
    <>
      <Head>
        <title>Playoff Bracket — Dynasty Universe</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: isMobile ? '12px 12px 80px' : '24px 24px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
            <div>
              <a href="/" style={{ fontSize: 11, color: C.muted, textDecoration: 'none', letterSpacing: 1, textTransform: 'uppercase' }}>← Dashboard</a>
              <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 24 : 32, margin: '8px 0 2px', color: C.accent }}>
                Playoff Bracket
              </h1>
              {data?.settings?.league_name && (
                <div style={{ fontSize: 12, color: C.muted }}>{data.settings.league_name} · Season {data?.season}</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <a href="/schedule-submit" style={{
                padding: '8px 16px', background: C.surface, border: `1px solid ${C.border}`,
                borderRadius: 4, color: C.text, textDecoration: 'none', fontSize: 12, fontWeight: 600,
              }}>+ Submit Result</a>
              <button onClick={() => { setLoading(true); loadData() }}
                style={{ padding: '8px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, color: C.muted, cursor: 'pointer', fontSize: 12 }}>
                ↻ Refresh
              </button>
            </div>
          </div>

          {/* Tab nav */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 24, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: tab === t.id ? C.accent : C.card,
                color: tab === t.id ? '#000' : C.muted,
                border: `1px solid ${tab === t.id ? C.accent : C.border}`,
                borderRadius: 20, padding: '8px 18px',
                cursor: 'pointer', fontFamily: "'Oswald', sans-serif",
                fontSize: 12, letterSpacing: 0.5, whiteSpace: 'nowrap', flexShrink: 0,
              }}>{t.label}</button>
            ))}
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: 80, color: C.muted }}>Loading bracket…</div>
          )}
          {error && (
            <div style={{ background: C.surface, border: `1px solid ${C.red}`, color: C.red, padding: 16, borderRadius: 6, marginBottom: 16 }}>
              Failed to load: {error}
            </div>
          )}

          {data && !loading && <>

            {/* ── CFP BRACKET tab ── */}
            {tab === 'bracket' && (() => {
              const { bracket, records } = data
              const ncgGames = bracket.national_championship
              const ncg = ncgGames?.[0] || null

              // Build the ordered list of rounds to display
              const rounds = [
                bracket.cfp_first_round.length > 0 && {
                  key: 'r1', label: 'Bowl Week 1', sub: 'Week 17',
                  games: bracket.cfp_first_round, highlight: false,
                },
                bracket.cfp_quarterfinal.length > 0 && {
                  key: 'qf', label: 'Bowl Week 2', sub: 'Week 18',
                  games: bracket.cfp_quarterfinal,
                  highlight: false,
                },
                bracket.cfp_semifinal.length > 0 && {
                  key: 'sf', label: 'Bowl Week 3', sub: 'Week 19',
                  games: bracket.cfp_semifinal,
                  highlight: false,
                },
                {
                  key: 'ncg', label: '🏆 National Championship', sub: 'Week 20',
                  games: ncgGames.length ? ncgGames : [null],
                  highlight: true,
                },
              ].filter(Boolean)

              if (isMobile) {
                // ── MOBILE: stacked full-width sections ──────────────────────
                return (
                  <div>
                    {ncg?.is_final && <ChampionBanner game={ncg} />}
                    {rounds.map(round => (
                      <div key={round.key} style={{ marginBottom: 28 }}>
                        {/* Round header */}
                        <div style={{
                          display: 'flex', alignItems: 'baseline', gap: 10,
                          marginBottom: 12, paddingBottom: 8,
                          borderBottom: `1px solid ${round.highlight ? C.accent + '44' : C.border}`,
                        }}>
                          <div style={{
                            fontFamily: "'Oswald', sans-serif", fontSize: 15, fontWeight: 700,
                            letterSpacing: 1, textTransform: 'uppercase',
                            color: round.highlight ? C.accent : C.text,
                          }}>{round.label}</div>
                          <div style={{ fontSize: 11, color: C.muted }}>{round.sub}</div>
                          <div style={{ marginLeft: 'auto', fontSize: 10, color: C.muted }}>
                            {round.games.filter(g => g?.is_final).length}/{round.games.filter(Boolean).length} final
                          </div>
                        </div>
                        {/* Full-width game cards */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {round.games.map((g, i) => (
                            <GameCard key={g?.id ?? i} game={g} records={records}
                              highlight={round.highlight} fullWidth />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }

              // ── DESKTOP: side-by-side columns ────────────────────────────
              return (
                <div>
                  {ncg?.is_final && <ChampionBanner game={ncg} />}
                  <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', overflowX: 'auto' }}>
                    {rounds.map(round => (
                      <div key={round.key} style={{ flex: 1, minWidth: 200, maxWidth: 280 }}>
                        <div style={{
                          textAlign: 'center', marginBottom: 12,
                          paddingBottom: 10,
                          borderBottom: `1px solid ${round.highlight ? C.accent + '44' : C.border}`,
                        }}>
                          <div style={{
                            fontFamily: "'Oswald', sans-serif", fontSize: 12, fontWeight: 700,
                            letterSpacing: 1.5, textTransform: 'uppercase',
                            color: round.highlight ? C.accent : C.text,
                          }}>{round.label}</div>
                          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{round.sub}</div>
                          <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>
                            {round.games.filter(g => g?.is_final).length}/{round.games.filter(Boolean).length} played
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {round.games.map((g, i) => (
                            <GameCard key={g?.id ?? i} game={g} records={records} highlight={round.highlight} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 20, padding: 10, background: C.surface, borderRadius: 6, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 11, color: C.muted }}><span style={{ color: C.accent, fontWeight: 700 }}>Gold name</span> = winner</div>
                    <div style={{ fontSize: 11, color: C.muted }}><span style={{ fontWeight: 700 }}>W-L</span> = full-season record</div>
                    <div style={{ fontSize: 11, color: C.muted }}>Updates automatically when scores are entered in the sheet</div>
                  </div>
                </div>
              )
            })()}

            {/* ── CONF. CHAMPIONSHIPS tab ── */}
            {tab === 'confchamp' && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, letterSpacing: 2, color: C.accent, textTransform: 'uppercase', marginBottom: 4 }}>Week 16</div>
                  <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, margin: 0 }}>Conference Championships</h2>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Winners earn automatic CFP bids</div>
                </div>
                {data.bracket.conference_championship.length === 0 ? (
                  <div style={{ color: C.muted, fontSize: 13, padding: 24, textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                    No conference championship games scheduled yet.<br />
                    <span style={{ fontSize: 11, marginTop: 6, display: 'block' }}>They'll appear here once added to the sheet or via the submit form.</span>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                    {data.bracket.conference_championship.map(g => (
                      <GameCard key={g.id} game={g} records={data.records} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── BOWL GAMES tab ── */}
            {tab === 'bowls' && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, margin: 0 }}>Bowl Games</h2>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Non-CFP postseason matchups</div>
                </div>
                {data.bracket.bowl.length === 0 ? (
                  <div style={{ color: C.muted, fontSize: 13, padding: 24, textAlign: 'center', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8 }}>
                    No bowl games scheduled yet.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                    {data.bracket.bowl.map(g => (
                      <GameCard key={g.id} game={g} records={data.records} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── SEASON RECORDS tab ── */}
            {tab === 'records' && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, margin: 0 }}>Season Records</h2>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                    Computed from all {data.allGames.filter(g => g.is_final).length} completed games · Season {data.season}
                  </div>
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                  <RecordsTable records={data.records} isMobile={isMobile} />
                </div>
              </div>
            )}

            {/* ── ALL GAMES LOG tab ── */}
            {tab === 'log' && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, margin: 0 }}>All Games</h2>
                  <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
                    {data.allGames.filter(g => g.is_final).length} final · {data.allGames.filter(g => !g.is_final).length} scheduled
                  </div>
                </div>
                <GameLog games={data.allGames} records={data.records} isMobile={isMobile} />
              </div>
            )}

          </>}
        </div>
      </div>
    </>
  )
}
