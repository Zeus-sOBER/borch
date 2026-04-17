import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'

const C = {
  bg:      '#09090b',
  surface: '#101014',
  card:    '#17171d',
  border:  '#1f1f2e',
  accent:  '#c9a84c',
  green:   '#4caf7d',
  red:     '#e05252',
  blue:    '#4a90d9',
  purple:  '#9b7fd4',
  text:    '#e8eaed',
  muted:   '#8b949e',
  subtle:  '#2a2a3a',
}

const TABS = ['Dashboard', 'Standings', 'Season', 'Stats', 'Media', 'Sync']

// ── Responsive hook ────────────────────────────────────────────
function useMobile() {
  const [m, setM] = useState(false)
  useEffect(() => {
    const check = () => setM(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return m
}

// ── Shared components ──────────────────────────────────────────
function Badge({ children, color = C.accent }) {
  return (
    <span style={{
      background: color + '22', color,
      border: `1px solid ${color}44`,
      borderRadius: 4, padding: '2px 8px',
      fontSize: 11, fontFamily: "'Oswald', sans-serif",
      letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap',
    }}>{children}</span>
  )
}

function Card({ children, style = {}, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: 16,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >{children}</div>
  )
}

function SectionTitle({ children, sub, isMobile }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{
        fontFamily: "'Oswald', sans-serif",
        fontSize: isMobile ? 18 : 24,
        fontWeight: 700, color: C.text, margin: 0,
        letterSpacing: 1, textTransform: 'uppercase',
      }}>{children}</h2>
      {sub && <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 12 }}>{sub}</p>}
    </div>
  )
}

function PillBtn({ active, onClick, children, small }) {
  return (
    <button onClick={onClick} style={{
      background: active ? C.accent : C.card,
      color: active ? '#000' : C.muted,
      border: `1px solid ${active ? C.accent : C.border}`,
      borderRadius: 6,
      padding: small ? '6px 12px' : '10px 18px',
      cursor: 'pointer',
      fontFamily: "'Oswald', sans-serif",
      fontSize: small ? 12 : 13,
      letterSpacing: 0.5,
      transition: 'all 0.15s',
      minHeight: 40,
    }}>{children}</button>
  )
}

// ── Bottom Nav (mobile only) ───────────────────────────────────
const NAV_ITEMS = [
  { id: 'Dashboard', icon: '🏠', label: 'Home' },
  { id: 'Standings', icon: '📊', label: 'Standings' },
  { id: 'Season',    icon: '📅', label: 'Season' },
  { id: 'Stats',     icon: '⭐', label: 'Stats' },
  { id: 'Media',     icon: '📰', label: 'Media' },
  { id: 'Sync',      icon: '🔄', label: 'Sync' },
]

function BottomNav({ tab, setTab }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: C.surface, borderTop: `1px solid ${C.border}`,
      display: 'flex', zIndex: 200,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {NAV_ITEMS.map(item => (
        <button key={item.id} onClick={() => setTab(item.id)} style={{
          flex: 1, background: 'transparent', border: 'none',
          padding: '8px 2px 6px', cursor: 'pointer',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 2,
          color: tab === item.id ? C.accent : C.muted,
          borderTop: `2px solid ${tab === item.id ? C.accent : 'transparent'}`,
          transition: 'all 0.1s',
        }}>
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span style={{
            fontSize: 9, fontFamily: "'Oswald', sans-serif",
            letterSpacing: 0.5, textTransform: 'uppercase',
          }}>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

// ── Dashboard ──────────────────────────────────────────────────
function Dashboard({ teams, games, players, scanLog, isMobile, narrativeEntries }) {
  const finalGames  = games.filter(g => g.status === 'Final')
  const recentGames = [...finalGames].reverse().slice(0, 3)
  const topTeam     = teams[0]
  const weeks       = games.length ? Math.max(...games.map(g => g.week)) : 0
  const topPasser   = players.find(p => p.pos === 'QB')
  const topRusher   = players.find(p => p.pos === 'RB')
  const topReceiver = players.find(p => p.pos === 'WR')

  const statCards = [
    { label: 'Current Week', value: `Wk ${weeks || '—'}`, icon: '📅' },
    { label: '#1 Ranked',    value: topTeam?.name || '—', icon: '🏆' },
    { label: 'Teams',        value: teams.length || '—',  icon: '🏟️' },
    { label: 'Games Played', value: finalGames.length,    icon: '🏈' },
  ]

  return (
    <div>
      <SectionTitle isMobile={isMobile} sub={`Live Season Overview · ${teams.length} Teams`}>Dynasty Universe</SectionTitle>

      {/* Stat cards — 4 col desktop / 2 col mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
        gap: isMobile ? 8 : 12,
        marginBottom: 20,
      }}>
        {statCards.map(s => (
          <Card key={s.label} style={{ textAlign: 'center', padding: isMobile ? '12px 8px' : 16 }}>
            <div style={{ fontSize: isMobile ? 22 : 28, marginBottom: 6 }}>{s.icon}</div>
            <div style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: isMobile ? 18 : 24,
              color: C.accent, fontWeight: 700,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{s.value}</div>
            <div style={{
              color: C.muted, fontSize: 10,
              textTransform: 'uppercase', letterSpacing: 1, marginTop: 4,
            }}>{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Power Rankings + Recent Results — 2 col desktop / 1 col mobile */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gap: 16, marginBottom: 16,
      }}>
        <Card>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
            ⚔️ Power Rankings
          </div>
          {teams.length === 0 && (
            <div style={{ color: C.muted, fontSize: 13, fontStyle: 'italic' }}>
              No dynasties have emerged yet. Sync your first screenshot to start the chronicle.
            </div>
          )}
          {teams.slice(0, 5).map((t, i) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none' }}>
              <span style={{
                fontFamily: "'Oswald', sans-serif", fontSize: 20,
                color: i === 0 ? C.accent : C.muted,
                width: 28, textAlign: 'center', flexShrink: 0,
              }}>{i + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.text, fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                <div style={{ color: C.muted, fontSize: 12 }}>{t.coach || '—'}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Oswald', sans-serif", color: C.text, fontSize: 14 }}>{t.wins}-{t.losses}</div>
                <Badge color={t.streak?.startsWith('W') ? C.green : C.red}>{t.streak}</Badge>
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
            🏈 Recent Results
          </div>
          {recentGames.length === 0 && (
            <div style={{ color: C.muted, fontSize: 13, fontStyle: 'italic' }}>
              The scoreboard is silent. Your first battle results will appear here.
            </div>
          )}
          {recentGames.map(g => (
            <div key={g.id} style={{ padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: g.home_score > g.away_score ? C.text : C.muted, fontWeight: g.home_score > g.away_score ? 700 : 400, fontSize: 14 }}>{g.home_team}</span>
                <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, color: C.accent }}>{g.home_score}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                <span style={{ color: g.away_score > g.home_score ? C.text : C.muted, fontWeight: g.away_score > g.home_score ? 700 : 400, fontSize: 14 }}>{g.away_team}</span>
                <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, color: C.accent }}>{g.away_score}</span>
              </div>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>Week {g.week}</div>
            </div>
          ))}
        </Card>
      </div>

      {/* Stat Leaders — 3 col desktop / 1 col mobile */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>⭐ Stat Leaders</div>
        {players.length === 0
          ? <div style={{ color: C.muted, fontSize: 13, fontStyle: 'italic' }}>
              No legends have been written yet. Scan a player stats screenshot to begin.
            </div>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: 16 }}>
              {[
                { label: 'Passing Yards',   player: topPasser,   stat: topPasser?.stats?.pass_yds },
                { label: 'Rushing Yards',   player: topRusher,   stat: topRusher?.stats?.rush_yds },
                { label: 'Receiving Yards', player: topReceiver, stat: topReceiver?.stats?.rec_yds },
              ].filter(x => x.player).map(x => (
                <div key={x.label}>
                  <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{x.label}</div>
                  <div style={{ color: C.text, fontWeight: 700 }}>{x.player.name}</div>
                  <div style={{ color: C.muted, fontSize: 12 }}>{x.player.team}</div>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 24 : 32, color: C.accent }}>{x.stat?.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
      </Card>

      {/* Dynasty Chronicle — narrative events */}
      {narrativeEntries?.length > 0 && (
        <Card style={{ marginBottom: 16, borderColor: C.purple + '44' }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.purple, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>
            📖 Dynasty Chronicle
          </div>
          {narrativeEntries.slice(0, 4).map((entry, i) => (
            <div key={entry.id || i} style={{
              padding: '10px 0',
              borderBottom: i < Math.min(narrativeEntries.length, 4) - 1 ? `1px solid ${C.border}` : 'none',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>
                {entry.event_type === 'game' ? '🏈' : entry.event_type === 'recruiting' ? '📋' : '📌'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.text, fontSize: 13, fontWeight: 700 }}>{entry.title}</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 2, lineHeight: 1.5 }}>{entry.summary}</div>
                {entry.week && <div style={{ color: C.subtle, fontSize: 10, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Week {entry.week}</div>}
              </div>
              {entry.narrative_weight >= 4 && (
                <Badge color={C.accent}>🔥 Big</Badge>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* Recent Syncs */}
      {scanLog?.length > 0 && (
        <Card>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>Recent Syncs</div>
          {scanLog.slice(0, 5).map((log, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 12, padding: '6px 0',
              borderBottom: i < 4 ? `1px solid ${C.border}` : 'none',
              flexWrap: 'wrap', gap: 6,
            }}>
              <span style={{ color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 130 : 'none' }}>{log.file_name}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                {log.data_type && <Badge color={C.blue}>{log.data_type}</Badge>}
                {log.records_parsed > 0 && <span style={{ color: C.green }}>{log.records_parsed} records</span>}
                <span style={{ color: C.muted, fontSize: 10 }}>{new Date(log.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

// ── Standings ──────────────────────────────────────────────────
function Standings({ teams, isMobile }) {
  const sorted = [...teams].sort((a, b) => (a.rank || 99) - (b.rank || 99) || b.wins - a.wins)
  const PLAYOFF_LINE = 4 // top 4 make playoff

  return (
    <div>
      <SectionTitle isMobile={isMobile} sub="Current Season Records">Standings</SectionTitle>
      {teams.length === 0
        ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div style={{ color: C.muted, fontSize: 14, fontStyle: 'italic' }}>
                The conference standings are still being written. Sync a standings screenshot to see who's rising and who's falling.
              </div>
            </div>
          </Card>
        )
        : (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 480 : 'auto' }}>
                <thead>
                  <tr style={{ background: C.surface }}>
                    {['#','Team','Coach','W','L','PF','PA','Diff','Streak'].map(h => (
                      <th key={h} style={{
                        padding: isMobile ? '10px 10px' : '13px 16px',
                        textAlign: ['Team','Coach'].includes(h) ? 'left' : 'center',
                        color: C.muted, fontSize: 11,
                        fontFamily: "'Oswald', sans-serif", letterSpacing: 1,
                        textTransform: 'uppercase',
                        borderBottom: `1px solid ${C.border}`,
                        whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((t, i) => (
                    <>
                      {i === PLAYOFF_LINE && (
                        <tr key="playoff-line">
                          <td colSpan={9} style={{
                            padding: '4px 16px',
                            background: C.accent + '11',
                            borderTop: `1px dashed ${C.accent}55`,
                            borderBottom: `1px dashed ${C.accent}55`,
                          }}>
                            <span style={{ color: C.accent, fontSize: 10, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: 'uppercase' }}>
                              ── Playoff Line ──
                            </span>
                          </td>
                        </tr>
                      )}
                      <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? 'transparent' : C.surface + '66' }}>
                        <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', textAlign: 'center' }}>
                          <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, color: i < PLAYOFF_LINE ? C.accent : C.muted }}>{i + 1}</span>
                        </td>
                        <td style={{ padding: isMobile ? '10px 10px' : '13px 16px' }}>
                          <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{t.name}</span>
                        </td>
                        <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', color: t.coach ? C.muted : C.subtle, fontSize: 12 }}>{t.coach || '—'}</td>
                        <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', textAlign: 'center', color: C.green, fontFamily: "'Oswald', sans-serif", fontSize: 16 }}>{t.wins}</td>
                        <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', textAlign: 'center', color: C.red, fontFamily: "'Oswald', sans-serif", fontSize: 16 }}>{t.losses}</td>
                        <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', textAlign: 'center', color: C.text, fontSize: 12 }}>{t.pts}</td>
                        <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', textAlign: 'center', color: C.muted, fontSize: 12 }}>{t.pts_against}</td>
                        <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', textAlign: 'center', fontSize: 12 }}>
                          <span style={{ color: (t.pts - t.pts_against) >= 0 ? C.green : C.red }}>
                            {(t.pts - t.pts_against) >= 0 ? '+' : ''}{t.pts - t.pts_against}
                          </span>
                        </td>
                        <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', textAlign: 'center' }}>
                          <Badge color={t.streak?.startsWith('W') ? C.green : C.red}>{t.streak}</Badge>
                        </td>
                      </tr>
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
    </div>
  )
}

// ── Season ─────────────────────────────────────────────────────
const WEEK_SHORT = { 14: 'Conf Champ', 15: 'CFP R1', 16: 'CFP QF', 17: 'CFP SF', 18: 'Natl Champ' }
const SEASON_PHASES = [
  { range: [1,  4],  label: 'EARLY SEASON',         sub: 'Non-conference play · Records still forming' },
  { range: [5,  9],  label: 'CONFERENCE PLAY',       sub: 'Division races taking shape · Every loss stings' },
  { range: [10, 13], label: 'LATE SEASON',           sub: 'Rivalry week incoming · CFP positioning is everything' },
  { range: [14, 14], label: 'CONF. CHAMPIONSHIPS',   sub: 'Top 2 per conference · Trophies and CFP bids on the line' },
  { range: [15, 15], label: 'CFP FIRST ROUND',       sub: '12-team playoff begins · Road to the national title starts here' },
  { range: [16, 16], label: 'CFP QUARTERFINALS',     sub: '8 teams remain · One loss and your season is over' },
  { range: [17, 17], label: 'CFP SEMIFINALS',        sub: 'Final four · Two spots in the National Championship' },
  { range: [18, 99], label: 'NATIONAL CHAMPIONSHIP', sub: 'One game · One champion · Dynasty legacy on the line' },
]
function getPhase(w) {
  return SEASON_PHASES.find(p => w >= p.range[0] && w <= p.range[1]) || { label: `WEEK ${w}`, sub: '' }
}

function Season({ games, teams, isMobile }) {
  const humanNames = new Set(teams.map(t => (t.name || t.team_name || '').toLowerCase()))
  const finalGames = games.filter(g => g.is_final || g.status === 'Final')
  const currentWeek = finalGames.length ? Math.max(...finalGames.map(g => g.week).filter(Boolean)) : 1
  const [selectedWeek, setSelectedWeek] = useState(currentWeek)
  useEffect(() => { setSelectedWeek(currentWeek) }, [currentWeek])

  const weeksWithGames = new Set(games.map(g => g.week).filter(Boolean))
  const allWeeks = Array.from({ length: 18 }, (_, i) => i + 1)
  const weekGames = games.filter(g => g.week === selectedWeek)
  const phase = getPhase(selectedWeek)

  return (
    <div>
      <SectionTitle isMobile={isMobile} sub={phase.sub}>{phase.label}</SectionTitle>

      {/* Week timeline bar */}
      <div style={{ overflowX: 'auto', marginBottom: 24, paddingBottom: 6, WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', gap: 5, minWidth: 'max-content' }}>
          {allWeeks.map(w => {
            const hasGames   = weeksWithGames.has(w)
            const hasFinal   = games.some(g => g.week === w && (g.is_final || g.status === 'Final'))
            const isSelected = w === selectedWeek
            const isCurrent  = w === currentWeek
            const label      = WEEK_SHORT[w] || `Wk ${w}`
            return (
              <button key={w} onClick={() => setSelectedWeek(w)} style={{
                position: 'relative', padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                whiteSpace: 'nowrap', fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: 0.4,
                border: `2px solid ${isSelected ? C.accent : isCurrent ? C.accent + '66' : hasGames ? C.border : C.subtle + '44'}`,
                background: isSelected ? C.accent : hasFinal ? C.surface : 'transparent',
                color: isSelected ? '#000' : hasGames ? C.text : C.subtle,
                fontWeight: isSelected || isCurrent ? 700 : 400,
                minHeight: 36,
              }}>
                {label}
                {isCurrent && !isSelected && (
                  <span style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: '50%', background: C.accent, border: `2px solid ${C.bg}` }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Games grid */}
      {weekGames.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '36px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
          <div style={{ color: C.text, fontFamily: "'Oswald', sans-serif", fontSize: 16, letterSpacing: 1, marginBottom: 8 }}>
            No games for Week {selectedWeek}
          </div>
          <div style={{ color: C.muted, fontSize: 13 }}>
            Scan a screenshot or upload a schedule Google Doc/Sheet to Drive, then import it from the Sync tab.
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {weekGames.map(g => {
            const isFinal   = g.is_final || g.status === 'Final'
            const homeWon   = isFinal && g.home_score > g.away_score
            const awayWon   = isFinal && g.away_score > g.home_score
            const homeHuman = humanNames.has((g.home_team || '').toLowerCase())
            const awayHuman = humanNames.has((g.away_team || '').toLowerCase())
            const gameLabel = g.game_type && g.game_type !== 'regular' ? g.game_type.replace(/_/g, ' ') : null
            return (
              <Card key={g.id} style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Badge color={isFinal ? C.muted : C.blue}>{isFinal ? 'Final' : 'Scheduled'}</Badge>
                  {gameLabel && <Badge color={C.accent}>{gameLabel}</Badge>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isFinal ? 8 : 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {homeHuman && <span style={{ color: C.accent, fontSize: 9 }}>◆</span>}
                    <div>
                      <div style={{ color: homeWon ? C.text : isFinal ? C.muted : C.text, fontWeight: homeWon ? 700 : 400, fontSize: 15 }}>{g.home_team}</div>
                      <div style={{ color: C.subtle, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Home</div>
                    </div>
                  </div>
                  {isFinal && <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, color: homeWon ? C.accent : C.muted, lineHeight: 1 }}>{g.home_score}</span>}
                </div>
                {!isFinal && <div style={{ textAlign: 'center', fontFamily: "'Oswald', sans-serif", color: C.subtle, fontSize: 12, letterSpacing: 3, margin: '4px 0' }}>VS</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {awayHuman && <span style={{ color: C.accent, fontSize: 9 }}>◆</span>}
                    <div>
                      <div style={{ color: awayWon ? C.text : isFinal ? C.muted : C.text, fontWeight: awayWon ? 700 : 400, fontSize: 15 }}>{g.away_team}</div>
                      <div style={{ color: C.subtle, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Away</div>
                    </div>
                  </div>
                  {isFinal && <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, color: awayWon ? C.accent : C.muted, lineHeight: 1 }}>{g.away_score}</span>}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Season phase legend */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 24 }}>
        {SEASON_PHASES.map(p => {
          const active = selectedWeek >= p.range[0] && selectedWeek <= p.range[1]
          return (
            <div key={p.label} onClick={() => setSelectedWeek(p.range[0])} style={{
              padding: '5px 10px', borderRadius: 4, cursor: 'pointer',
              background: active ? C.accent + '22' : 'transparent',
              border: `1px solid ${active ? C.accent + '55' : C.subtle + '44'}`,
              color: active ? C.accent : C.subtle, fontSize: 11,
              fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5,
            }}>
              {p.range[0] === p.range[1] ? `Wk ${p.range[0]}` : `Wks ${p.range[0]}–${p.range[1]}`} · {p.label}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Player Stats ───────────────────────────────────────────────
function PlayerStats({ players, isMobile }) {
  const positions = ['ALL', ...new Set(players.map(p => p.pos))]
  const [pos, setPos] = useState('ALL')
  const filtered = pos === 'ALL' ? players : players.filter(p => p.pos === pos)
  const STAT_COLS = { QB: ['pass_yds','pass_td','int','rush_yds'], RB: ['rush_yds','rush_td','rec','rec_yds'], WR: ['rec','rec_yds','rec_td','yac'] }

  return (
    <div>
      <SectionTitle isMobile={isMobile} sub="Individual Season Statistics">Player Stats</SectionTitle>
      {players.length === 0
        ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
              <div style={{ color: C.muted, fontSize: 14, fontStyle: 'italic' }}>
                No legends have risen yet. Sync a player stats screenshot to begin tracking dynasty greats.
              </div>
            </div>
          </Card>
        )
        : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {positions.map(p => <PillBtn key={p} small={isMobile} active={pos === p} onClick={() => setPos(p)}>{p}</PillBtn>)}
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {filtered.map(p => {
                const cols = STAT_COLS[p.pos] || Object.keys(p.stats || {}).slice(0, 4)
                return (
                  <Card key={p.id}>
                    <div style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'flex-start' : 'center',
                      gap: isMobile ? 12 : 16,
                    }}>
                      <div style={{ minWidth: 140 }}>
                        <Badge color={p.pos === 'QB' ? C.blue : p.pos === 'RB' ? C.green : C.accent}>{p.pos}</Badge>
                        <div style={{ color: C.text, fontWeight: 700, fontSize: 16, marginTop: 6 }}>{p.name}</div>
                        <div style={{ color: C.muted, fontSize: 12 }}>{p.team}</div>
                      </div>
                      <div style={{ display: 'flex', gap: isMobile ? 16 : 24, flexWrap: 'wrap' }}>
                        {cols.map(col => p.stats?.[col] !== undefined && (
                          <div key={col} style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 22 : 26, color: C.accent }}>{Number(p.stats[col]).toLocaleString()}</div>
                            <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{col.replace(/_/g, ' ')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </>
        )}
    </div>
  )
}

// ── Media Center ───────────────────────────────────────────────
function MediaCenter({ teams, games, players, commPin, onPinSet, isMobile }) {
  const [type, setType]       = useState('power_rankings')
  const [loading, setLoading] = useState(false)
  const [article, setArticle] = useState(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [pastArticles, setPastArticles]     = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [viewingArticle, setViewingArticle] = useState(null)

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res  = await fetch('/api/articles?limit=30')
      const data = await res.json()
      setPastArticles(data.articles || [])
    } catch (e) { console.error(e) }
    setLoadingHistory(false)
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const TYPES = [
    { id: 'power-rankings',    label: 'Power Rankings',    icon: '📊' },
    { id: 'weekly-recap',      label: 'Weekly Recap',      icon: '📰' },
    { id: 'player-spotlight',  label: 'Player Spotlight',  icon: '⭐' },
    { id: 'rivalry-breakdown', label: 'Rivalry Breakdown', icon: '🔥' },
  ]

  const generate = async () => {
    setLoading(true); setArticle(null); setViewingArticle(null)
    try {
      const res = await fetch('/api/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleType: type, pin: commPin }),
      })
      const data = await res.json()
      if (data.error) {
        setArticle('❌ ' + data.error)
      } else {
        setArticle(data.article)
        loadHistory()
      }
    } catch (e) { setArticle('Error generating article.') }
    setLoading(false)
  }

  const tryPin = async () => {
    setPinError(false)
    const res = await fetch('/api/coaches/0', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinInput }),
    })
    if (res.status === 403) { setPinError(true); return }
    onPinSet(pinInput)
    setPinInput('')
  }

  return (
    <div>
      <SectionTitle isMobile={isMobile} sub="AI-Powered ESPN-Style Coverage">Media Center</SectionTitle>

      {!commPin && (
        <Card style={{ marginBottom: 20, maxWidth: 420 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>🔐 Commissioner Login</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Article generation requires commissioner access.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              value={pinInput}
              onChange={e => { setPinInput(e.target.value); setPinError(false) }}
              onKeyDown={e => e.key === 'Enter' && tryPin()}
              placeholder="Enter commissioner PIN"
              style={{
                flex: 1, background: C.surface, border: `1px solid ${pinError ? C.red : C.border}`,
                borderRadius: 6, padding: '12px 12px', color: C.text, fontSize: 14, outline: 'none',
              }}
            />
            <button onClick={tryPin} style={{
              background: C.accent, color: '#000', border: 'none', borderRadius: 6,
              padding: '12px 18px', cursor: 'pointer',
              fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: 0.5,
              minHeight: 48,
            }}>Unlock</button>
          </div>
          {pinError && <div style={{ color: C.red, fontSize: 12, marginTop: 6 }}>Incorrect PIN</div>}
        </Card>
      )}
      {commPin && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Badge color={C.green}>🔓 Commissioner Mode Active</Badge>
          <button onClick={() => onPinSet(null)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12 }}>Lock</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TYPES.map(t => <PillBtn key={t.id} small={isMobile} active={type === t.id} onClick={() => setType(t.id)}>{t.icon} {t.label}</PillBtn>)}
      </div>
      <button onClick={generate} disabled={loading || !commPin} style={{
        background: !commPin ? C.subtle : loading ? C.subtle : C.accent,
        color: (!commPin || loading) ? C.muted : '#000',
        border: 'none', borderRadius: 8, padding: '14px 32px',
        cursor: (!commPin || loading) ? 'not-allowed' : 'pointer',
        fontFamily: "'Oswald', sans-serif", fontSize: 16, letterSpacing: 1,
        textTransform: 'uppercase', marginBottom: 24, width: isMobile ? '100%' : 'auto',
      }}>{loading ? '⏳ Generating...' : !commPin ? '🔒 Login to Generate' : '⚡ Generate Article'}</button>

      {article && (
        <Card style={{ marginBottom: 24 }}>
          {article.split('\n').map((line, i) => {
            if (!line.trim()) return <div key={i} style={{ height: 8 }} />
            const clean = line.replace(/^#+\s*/, '')
            const isHead = i === 0 || (line.length < 90 && (line.startsWith('#') || line === line.toUpperCase()))
            return isHead
              ? <div key={i} style={{ fontFamily: "'Oswald', sans-serif", fontSize: i === 0 ? (isMobile ? 20 : 26) : 15, color: i === 0 ? C.text : C.accent, letterSpacing: 1, marginBottom: 12, marginTop: i > 0 ? 18 : 0 }}>{clean}</div>
              : <p key={i} style={{ color: C.text, fontSize: isMobile ? 14 : 15, margin: '0 0 12px', lineHeight: 1.8 }}>{line}</p>
          })}
        </Card>
      )}

      <div style={{ marginTop: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, color: C.text, letterSpacing: 1, textTransform: 'uppercase' }}>📰 Article Archive</div>
          <button onClick={loadHistory} disabled={loadingHistory} style={{ background: C.card, color: loadingHistory ? C.muted : C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 12 }}>
            {loadingHistory ? '⏳' : '🔄 Refresh'}
          </button>
        </div>

        {pastArticles.length === 0 && !loadingHistory && (
          <Card><p style={{ color: C.muted, margin: 0, fontSize: 13, fontStyle: 'italic' }}>No articles generated yet. Generate your first article above.</p></Card>
        )}

        {viewingArticle && (
          <Card style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <Badge color={C.blue}>{viewingArticle.article_type?.replace(/-/g, ' ')}</Badge>
                {viewingArticle.week && <Badge color={C.muted} style={{ marginLeft: 6 }}>Week {viewingArticle.week}</Badge>}
              </div>
              <button onClick={() => setViewingArticle(null)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, cursor: 'pointer', padding: '4px 10px', fontSize: 12 }}>✕ Close</button>
            </div>
            {viewingArticle.content.split('\n').map((line, i) => {
              if (!line.trim()) return <div key={i} style={{ height: 8 }} />
              const clean = line.replace(/^#+\s*/, '')
              const isHead = i === 0 || (line.length < 90 && (line.startsWith('#') || line === line.toUpperCase()))
              return isHead
                ? <div key={i} style={{ fontFamily: "'Oswald', sans-serif", fontSize: i === 0 ? (isMobile ? 18 : 24) : 14, color: i === 0 ? C.text : C.accent, letterSpacing: 1, marginBottom: 10, marginTop: i > 0 ? 16 : 0 }}>{clean}</div>
                : <p key={i} style={{ color: C.text, fontSize: isMobile ? 13 : 14, margin: '0 0 10px', lineHeight: 1.8 }}>{line}</p>
            })}
          </Card>
        )}

        <div style={{ display: 'grid', gap: 8 }}>
          {pastArticles.map(a => {
            const typeLabel = (a.article_type || 'article').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            const isViewing = viewingArticle?.id === a.id
            return (
              <Card
                key={a.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderColor: isViewing ? C.accent + '66' : C.border }}
                onClick={() => setViewingArticle(isViewing ? null : a)}
              >
                <div style={{ fontSize: 22, flexShrink: 0 }}>📄</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.title || typeLabel}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge color={C.blue}>{typeLabel}</Badge>
                    {a.week && <Badge color={C.muted}>Wk {a.week}</Badge>}
                    <span style={{ color: C.muted, fontSize: 11 }}>{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
                <div style={{ color: isViewing ? C.accent : C.muted, fontSize: 18, flexShrink: 0 }}>{isViewing ? '▲' : '▼'}</div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Drive Sync ─────────────────────────────────────────────────
function DriveSync({ onRefresh, existingScanLog, isMobile }) {
  const [files, setFiles]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [parsing, setParsing]   = useState(null)
  const [results, setResults]   = useState({})
  const [autoScanning, setAutoScanning] = useState(false)
  const [autoScanResult, setAutoScanResult] = useState(null)
  const [typeHint, setTypeHint] = useState('auto')

  const TYPE_HINTS = [
    { id: 'auto',        label: '✨ Auto-Detect',  desc: 'AI figures it out — works for any screenshot or doc' },
    { id: 'schedule',    label: '📅 Schedule',     desc: 'Full season schedule — imports upcoming matchups. Works with Google Docs, Sheets, or schedule screenshots.' },
    { id: 'standings',   label: '📊 Standings',    desc: 'Win/loss records, conference standings' },
    { id: 'scores',      label: '🏈 Scores',       desc: 'Scoreboards, game results' },
    { id: 'player_stats',label: '⭐ Player Stats',  desc: 'Stat leaders, individual numbers' },
    { id: 'recruiting',  label: '📋 Recruiting',   desc: 'Commitments, visits, offers' },
    { id: 'championship',label: '🏆 Championship', desc: 'Trophy screens, bowl/CFP results' },
  ]

  // Pre-populate results from existing scan_log on mount
  useEffect(() => {
    if (existingScanLog?.length > 0) {
      const prePopulated = {}
      existingScanLog.forEach(log => {
        if (log.file_id) {
          prePopulated[log.file_id] = {
            success: true,
            detectedType: log.data_type || 'data',
            preloaded: true,
            summary: log.records_parsed > 0
              ? `${log.records_parsed} record${log.records_parsed !== 1 ? 's' : ''} synced`
              : 'Previously synced',
          }
        }
      })
      setResults(prePopulated)
    }
  }, [existingScanLog])

  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/drive-files')
      const data = await res.json()
      setFiles(data.files || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => { loadFiles() }, [loadFiles])

  const parse = async (file) => {
    setParsing(file.id)
    try {
      const res = await fetch('/api/parse-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId:   file.id,
          mimeType: file.mimeType,
          fileName: file.name,
          typeHint: typeHint !== 'auto' ? typeHint : undefined,
        }),
      })
      const data = await res.json()
      setResults(r => ({ ...r, [file.id]: data }))
      if (data.success) onRefresh()
    } catch (e) {
      setResults(r => ({ ...r, [file.id]: { error: e.message } }))
    }
    setParsing(null)
  }

  const autoScanAll = async () => {
    setAutoScanning(true)
    setAutoScanResult(null)
    try {
      const res = await fetch('/api/auto-scan', { method: 'POST' })
      const data = await res.json()
      setAutoScanResult(data)
      if (data.processed > 0) {
        onRefresh()
        loadFiles()
      }
    } catch (e) {
      setAutoScanResult({ error: e.message })
    }
    setAutoScanning(false)
  }

  const getSavedSummary = (result) => {
    if (!result?.saved) return result?.summary || ''
    const { games, players, standings, championship, recruiting } = result.saved
    const parts = []
    if (games)      parts.push(`${games} game${games !== 1 ? 's' : ''}`)
    if (standings)  parts.push(`${standings} team${standings !== 1 ? 's' : ''}`)
    if (players)    parts.push(`${players} player${players !== 1 ? 's' : ''}`)
    if (recruiting) parts.push(`${recruiting} recruit${recruiting !== 1 ? 's' : ''}`)
    if (championship) parts.push('1 championship')
    if (result.preloaded) return result.summary || 'Previously synced'
    return parts.length ? parts.join(', ') + ' saved' : 'data saved'
  }

  const unscannedCount = files.filter(f => !results[f.id]?.success).length

  return (
    <div>
      <SectionTitle isMobile={isMobile} sub="Pull screenshots and Google Docs from your shared Drive folder">Drive Sync</SectionTitle>

      {/* Auto-Scan All */}
      <Card style={{ marginBottom: 16, borderColor: C.accent + '33' }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
          ⚡ Quick Scan
        </div>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
          Automatically scan all new files in your Drive folder at once. Previously synced files are skipped.
          {unscannedCount > 0 && <span style={{ color: C.accent }}> · {unscannedCount} new file{unscannedCount !== 1 ? 's' : ''} ready</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={autoScanAll} disabled={autoScanning || unscannedCount === 0} style={{
            background: autoScanning || unscannedCount === 0 ? C.subtle : C.accent,
            color: autoScanning || unscannedCount === 0 ? C.muted : '#000',
            border: 'none', borderRadius: 6, padding: '12px 22px',
            cursor: autoScanning || unscannedCount === 0 ? 'not-allowed' : 'pointer',
            fontFamily: "'Oswald', sans-serif", fontSize: 14, letterSpacing: 0.5, minHeight: 44,
          }}>
            {autoScanning ? '⏳ Scanning...' : unscannedCount === 0 ? '✅ All Synced' : `🔍 Scan ${unscannedCount} New File${unscannedCount !== 1 ? 's' : ''}`}
          </button>
          {autoScanResult && (
            <span style={{ color: autoScanResult.error ? C.red : C.green, fontSize: 13 }}>
              {autoScanResult.error ? `❌ ${autoScanResult.error}` : `✅ ${autoScanResult.message}`}
            </span>
          )}
        </div>
      </Card>

      {/* Type hint selector */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Scan Mode</div>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
          Auto-Detect works for everything. Use a specific type only if auto-detect gets it wrong.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TYPE_HINTS.map(t => (
            <PillBtn key={t.id} small active={typeHint === t.id} onClick={() => setTypeHint(t.id)}>
              {t.label}
            </PillBtn>
          ))}
        </div>
        {typeHint !== 'auto' && (
          <div style={{ marginTop: 10, color: C.muted, fontSize: 12 }}>
            {TYPE_HINTS.find(t => t.id === typeHint)?.desc}
          </div>
        )}
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ color: C.muted, fontSize: 13 }}>{files.length} file{files.length !== 1 ? 's' : ''} in Drive folder</div>
        <button onClick={loadFiles} disabled={loading} style={{ background: C.card, color: loading ? C.muted : C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 16px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 13, minHeight: 40 }}>
          {loading ? '⏳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {files.length === 0 && !loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
            <div style={{ color: C.muted, fontSize: 13, fontStyle: 'italic' }}>
              No files found. Upload any CFB26 screenshot or Google Doc to the shared Drive folder, then hit Refresh.
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {files.map(file => {
          const result    = results[file.id]
          const isParsing = parsing === file.id
          const isDoc     = file.mimeType === 'application/vnd.google-apps.document'
          const savedSummary = getSavedSummary(result)

          return (
            <Card key={file.id} style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: 14,
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{isDoc ? '📄' : '🖼️'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                    {isDoc ? 'Google Doc' : 'Image'} · {new Date(file.createdTime).toLocaleString()}
                  </div>
                  {result?.success && (
                    <div style={{ marginTop: 5 }}>
                      <span style={{ color: C.green, fontSize: 12 }}>✅ </span>
                      <span style={{ color: C.accent, fontSize: 12, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        {result.detectedType || 'data'}
                      </span>
                      <span style={{ color: C.green, fontSize: 12 }}> — {savedSummary}</span>
                    </div>
                  )}
                  {result?.error && <div style={{ color: C.red, fontSize: 12, marginTop: 4 }}>❌ {result.error}</div>}
                </div>
              </div>
              <button
                onClick={() => parse(file)}
                disabled={isParsing || result?.success}
                style={{
                  background: result?.success ? C.green + '22' : isParsing ? C.subtle : C.accent,
                  color:      result?.success ? C.green : isParsing ? C.muted : '#000',
                  border:     `1px solid ${result?.success ? C.green : C.accent}`,
                  borderRadius: 6,
                  padding: '10px 18px',
                  cursor: result?.success || isParsing ? 'default' : 'pointer',
                  fontFamily: "'Oswald', sans-serif", fontSize: 13, whiteSpace: 'nowrap',
                  flexShrink: 0, minHeight: 44,
                  alignSelf: isMobile ? 'stretch' : 'center',
                  width: isMobile ? '100%' : 'auto',
                }}
              >
                {result?.success ? '✅ Synced' : isParsing ? '⏳ Reading...' : '🔍 Scan with AI'}
              </button>
            </Card>
          )
        })}
      </div>

      <Card style={{ marginTop: 20, borderColor: C.accent + '33' }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>How Drive Sync works</div>
        <ol style={{ color: C.muted, fontSize: 13, lineHeight: 2, margin: 0, paddingLeft: 20 }}>
          <li>Upload <strong style={{ color: C.text }}>any</strong> CFB26 screenshot or Google Doc to the shared Drive folder</li>
          <li>Hit <strong style={{ color: C.text }}>Refresh</strong> to see new files appear above</li>
          <li>Click <strong style={{ color: C.text }}>Scan All New Files</strong> or <strong style={{ color: C.text }}>Scan with AI</strong> individually</li>
          <li>Standings, scores, stats, recruiting, and championships update automatically</li>
        </ol>
      </Card>
    </div>
  )
}

// ── Root App ───────────────────────────────────────────────────
export default function App() {
  const isMobile = useMobile()
  const [tab, setTab]         = useState('Dashboard')
  const [data, setData]       = useState({ teams: [], games: [], players: [], scanLog: [] })
  const [loadingData, setLoadingData] = useState(true)
  const [commPin, setCommPin] = useState(null)
  const [narrativeEntries, setNarrativeEntries] = useState([])

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch('/api/league-data')
      const json = await res.json()
      setData(json)
    } catch (e) { console.error(e) }
    setLoadingData(false)
  }, [])

  const fetchNarrative = useCallback(async () => {
    try {
      const res = await fetch('/api/narrative?limit=6&types=game,recruiting')
      const json = await res.json()
      setNarrativeEntries(json.entries || [])
    } catch (e) { /* narrative is non-critical */ }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchNarrative() }, [fetchNarrative])

  // Restore commissioner PIN from session
  useEffect(() => {
    const p = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('dynasty_comm_pin')
    if (p) setCommPin(p)
  }, [])

  return (
    <>
      <Head>
        <title>Dynasty Universe · CFB 26</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#09090b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: ${C.bg}; font-family: 'Lato', sans-serif; color: ${C.text}; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${C.surface}; }
        ::-webkit-scrollbar-thumb { background: ${C.subtle}; border-radius: 3px; }
        button { -webkit-tap-highlight-color: transparent; }
        input { -webkit-appearance: none; }
      `}</style>

      {/* Top Nav */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: isMobile ? '0 12px' : '0 24px', display: 'flex', alignItems: 'center' }}>

          {/* Logo */}
          <div style={{ padding: isMobile ? '12px 12px 12px 0' : '16px 24px 16px 0', borderRight: `1px solid ${C.border}`, marginRight: isMobile ? 12 : 24, flexShrink: 0 }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 16 : 21, fontWeight: 700, letterSpacing: 2, color: C.accent, lineHeight: 1 }}>DYNASTY</div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, letterSpacing: 4, color: C.muted }}>UNIVERSE</div>
          </div>

          {/* Tabs — hidden on mobile (use bottom nav instead) */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: 2, flex: 1, overflowX: 'auto' }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  background: 'transparent', color: tab === t ? C.accent : C.muted,
                  border: 'none', borderBottom: `2px solid ${tab === t ? C.accent : 'transparent'}`,
                  padding: '20px 14px', cursor: 'pointer',
                  fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: 0.8,
                  textTransform: 'uppercase', transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
                }}>{t}</button>
              ))}
            </div>
          )}

          {/* Mobile: show current tab name */}
          {isMobile && (
            <div style={{ flex: 1, fontFamily: "'Oswald', sans-serif", fontSize: 13, color: C.text, letterSpacing: 1, textTransform: 'uppercase' }}>
              {tab}
            </div>
          )}

          {/* External links */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: 16, paddingLeft: 16, flexShrink: 0 }}>
              <a href="/coaches" style={{ color: C.muted, fontSize: 13, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textDecoration: 'none', whiteSpace: 'nowrap' }}>👤 COACHES</a>
              <a href="/stream-watcher" style={{ color: C.muted, fontSize: 13, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textDecoration: 'none', whiteSpace: 'nowrap' }}>📺 STREAM</a>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{
        maxWidth: 1160, margin: '0 auto',
        padding: isMobile ? '20px 12px 90px' : '36px 24px 40px',
      }}>
        {loadingData
          ? (
            <div style={{ color: C.muted, textAlign: 'center', paddingTop: 80, fontFamily: "'Oswald', sans-serif", letterSpacing: 2 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🏟️</div>
              LOADING DYNASTY DATA...
            </div>
          )
          : (
            <>
              {tab === 'Dashboard' && <Dashboard  {...data} isMobile={isMobile} narrativeEntries={narrativeEntries} />}
              {tab === 'Standings' && <Standings  teams={data.teams} isMobile={isMobile} />}
              {tab === 'Season'    && <Season     games={data.games} teams={data.teams} isMobile={isMobile} />}
              {tab === 'Stats'     && <PlayerStats players={data.players} isMobile={isMobile} />}
              {tab === 'Media'     && (
                <MediaCenter
                  teams={data.teams} games={data.games} players={data.players}
                  commPin={commPin} isMobile={isMobile}
                  onPinSet={pin => {
                    setCommPin(pin)
                    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('dynasty_comm_pin', pin || '')
                  }}
                />
              )}
              {tab === 'Sync' && (
                <DriveSync
                  onRefresh={fetchData}
                  existingScanLog={data.scanLog}
                  isMobile={isMobile}
                />
              )}
            </>
          )}
      </div>

      {/* Bottom nav — mobile only */}
      {isMobile && <BottomNav tab={tab} setTab={setTab} />}
    </>
  )
}
