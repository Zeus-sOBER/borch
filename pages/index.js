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
  text:    '#e8eaed',
  muted:   '#8b949e',
  subtle:  '#2a2a3a',
}

const TABS = ['Dashboard', 'Standings', 'Scores', 'Player Stats', 'Media Center', 'Drive Sync']

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

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: 20, ...style,
    }}>{children}</div>
  )
}

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 24, fontWeight: 700, color: C.text, margin: 0, letterSpacing: 1, textTransform: 'uppercase' }}>{children}</h2>
      {sub && <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>{sub}</p>}
    </div>
  )
}

function PillBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      background: active ? C.accent : C.card,
      color: active ? '#000' : C.muted,
      border: `1px solid ${active ? C.accent : C.border}`,
      borderRadius: 6, padding: '8px 18px', cursor: 'pointer',
      fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: 0.5,
      transition: 'all 0.15s',
    }}>{children}</button>
  )
}

// ── Dashboard ──────────────────────────────────────────────────
function Dashboard({ teams, games, players, scanLog }) {
  const finalGames  = games.filter(g => g.status === 'Final')
  const recentGames = [...finalGames].reverse().slice(0, 3)
  const topTeam     = teams[0]
  const weeks       = games.length ? Math.max(...games.map(g => g.week)) : 0
  const topPasser   = players.find(p => p.pos === 'QB')
  const topRusher   = players.find(p => p.pos === 'RB')
  const topReceiver = players.find(p => p.pos === 'WR')

  return (
    <div>
      <SectionTitle sub={`Live Season Overview · ${teams.length} Teams`}>Dynasty Universe</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Current Week', value: `Wk ${weeks || '—'}`, icon: '📅' },
          { label: '#1 Ranked',    value: topTeam?.name || '—', icon: '🏆' },
          { label: 'Teams',        value: teams.length || '—',  icon: '🏟️' },
          { label: 'Games Played', value: finalGames.length,    icon: '🏈' },
        ].map(s => (
          <Card key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 26, color: C.accent, fontWeight: 700 }}>{s.value}</div>
            <div style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginTop: 6 }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Power Rankings</div>
          {teams.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>No data yet — sync screenshots from Drive.</div>}
          {teams.slice(0, 5).map((t, i) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none' }}>
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, color: i === 0 ? C.accent : C.muted, width: 28, textAlign: 'center', flexShrink: 0 }}>{i + 1}</span>
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
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Recent Results</div>
          {recentGames.length === 0 && <div style={{ color: C.muted, fontSize: 13 }}>No results yet.</div>}
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

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>Stat Leaders</div>
        {players.length === 0
          ? <div style={{ color: C.muted, fontSize: 13 }}>No player data yet.</div>
          : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20 }}>
              {[
                { label: 'Passing Yards',   player: topPasser,   stat: topPasser?.stats?.pass_yds },
                { label: 'Rushing Yards',   player: topRusher,   stat: topRusher?.stats?.rush_yds },
                { label: 'Receiving Yards', player: topReceiver, stat: topReceiver?.stats?.rec_yds },
              ].filter(x => x.player).map(x => (
                <div key={x.label}>
                  <div style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{x.label}</div>
                  <div style={{ color: C.text, fontWeight: 700 }}>{x.player.name}</div>
                  <div style={{ color: C.muted, fontSize: 12 }}>{x.player.team}</div>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 32, color: C.accent }}>{x.stat?.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
      </Card>

      {scanLog?.length > 0 && (
        <Card>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 }}>Recent Syncs</div>
          {scanLog.slice(0, 5).map((log, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0', borderBottom: i < 4 ? `1px solid ${C.border}` : 'none' }}>
              <span style={{ color: C.text }}>{log.file_name}</span>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Badge color={C.blue}>{log.data_type}</Badge>
                <span style={{ color: C.green }}>{log.records_parsed} records</span>
                <span style={{ color: C.muted, fontSize: 11 }}>{new Date(log.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}

// ── Standings ──────────────────────────────────────────────────
function Standings({ teams }) {
  const sorted = [...teams].sort((a, b) => (a.rank || 99) - (b.rank || 99) || b.wins - a.wins)
  return (
    <div>
      <SectionTitle sub="Current Season Records">Standings</SectionTitle>
      {teams.length === 0
        ? <Card><p style={{ color: C.muted }}>No standings data yet.</p></Card>
        : (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: C.surface }}>
                    {['#','Team','Coach','W','L','PF','PA','Diff','Streak'].map(h => (
                      <th key={h} style={{ padding: '13px 16px', textAlign: ['Team','Coach'].includes(h) ? 'left' : 'center', color: C.muted, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((t, i) => (
                    <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? 'transparent' : C.surface + '66' }}>
                      <td style={{ padding: '13px 16px', textAlign: 'center' }}><span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, color: i < 4 ? C.accent : C.muted }}>{i + 1}</span></td>
                      <td style={{ padding: '13px 16px' }}><span style={{ color: C.text, fontWeight: 700, fontSize: 15 }}>{t.name}</span></td>
                      <td style={{ padding: '13px 16px', color: t.coach ? C.muted : C.subtle, fontSize: 13 }}>{t.coach || '—'}</td>
                      <td style={{ padding: '13px 16px', textAlign: 'center', color: C.green, fontFamily: "'Oswald', sans-serif", fontSize: 17 }}>{t.wins}</td>
                      <td style={{ padding: '13px 16px', textAlign: 'center', color: C.red, fontFamily: "'Oswald', sans-serif", fontSize: 17 }}>{t.losses}</td>
                      <td style={{ padding: '13px 16px', textAlign: 'center', color: C.text, fontSize: 13 }}>{t.pts}</td>
                      <td style={{ padding: '13px 16px', textAlign: 'center', color: C.muted, fontSize: 13 }}>{t.pts_against}</td>
                      <td style={{ padding: '13px 16px', textAlign: 'center', fontSize: 13 }}><span style={{ color: (t.pts - t.pts_against) >= 0 ? C.green : C.red }}>{(t.pts - t.pts_against) >= 0 ? '+' : ''}{t.pts - t.pts_against}</span></td>
                      <td style={{ padding: '13px 16px', textAlign: 'center' }}><Badge color={t.streak?.startsWith('W') ? C.green : C.red}>{t.streak}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
    </div>
  )
}

// ── Scores ─────────────────────────────────────────────────────
function Scores({ games }) {
  const weeks = [...new Set(games.map(g => g.week))].sort((a, b) => b - a)
  const [week, setWeek] = useState(weeks[0] || 1)
  useEffect(() => { if (weeks.length) setWeek(weeks[0]) }, [games.length])
  const filtered = games.filter(g => g.week === week)

  return (
    <div>
      <SectionTitle sub="Game Results & Schedule">Scores & Schedule</SectionTitle>
      {games.length === 0
        ? <Card><p style={{ color: C.muted }}>No game data yet.</p></Card>
        : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {weeks.map(w => <PillBtn key={w} active={week === w} onClick={() => setWeek(w)}>Week {w}</PillBtn>)}
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {filtered.map(g => (
                <Card key={g.id}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <Badge color={g.status === 'Final' ? C.muted : C.blue}>{g.status}</Badge>
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: g.home_score > g.away_score ? C.text : C.muted, fontWeight: 700, fontSize: 18 }}>{g.home_team}</div>
                        <div style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Home</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        {g.status === 'Final'
                          ? <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 32, color: C.accent, letterSpacing: 2 }}>{g.home_score} – {g.away_score}</div>
                          : <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, color: C.muted }}>vs</div>}
                      </div>
                      <div>
                        <div style={{ color: g.away_score > g.home_score ? C.text : C.muted, fontWeight: 700, fontSize: 18 }}>{g.away_team}</div>
                        <div style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Away</div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
    </div>
  )
}

// ── Player Stats ───────────────────────────────────────────────
function PlayerStats({ players }) {
  const positions = ['ALL', ...new Set(players.map(p => p.pos))]
  const [pos, setPos] = useState('ALL')
  const filtered = pos === 'ALL' ? players : players.filter(p => p.pos === pos)
  const STAT_COLS = { QB: ['pass_yds','pass_td','int','rush_yds'], RB: ['rush_yds','rush_td','rec','rec_yds'], WR: ['rec','rec_yds','rec_td','yac'] }

  return (
    <div>
      <SectionTitle sub="Individual Season Statistics">Player Stats</SectionTitle>
      {players.length === 0
        ? <Card><p style={{ color: C.muted }}>No player data yet.</p></Card>
        : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {positions.map(p => <PillBtn key={p} active={pos === p} onClick={() => setPos(p)}>{p}</PillBtn>)}
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {filtered.map(p => {
                const cols = STAT_COLS[p.pos] || Object.keys(p.stats || {}).slice(0, 4)
                return (
                  <Card key={p.id}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 150 }}>
                        <Badge color={p.pos === 'QB' ? C.blue : p.pos === 'RB' ? C.green : C.accent}>{p.pos}</Badge>
                        <div style={{ color: C.text, fontWeight: 700, fontSize: 17, marginTop: 6 }}>{p.name}</div>
                        <div style={{ color: C.muted, fontSize: 12 }}>{p.team}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                        {cols.map(col => p.stats?.[col] !== undefined && (
                          <div key={col} style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 26, color: C.accent }}>{Number(p.stats[col]).toLocaleString()}</div>
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
function MediaCenter({ teams, games, players, commPin, onPinSet }) {
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
    // Validate pin against coaches endpoint (same pattern as coaches.js)
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
      <SectionTitle sub="AI-Powered ESPN-Style Coverage">Media Center</SectionTitle>

      {/* Commissioner PIN gate */}
      {!commPin && (
        <Card style={{ marginBottom: 20, maxWidth: 420 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>🔐 Commissioner Login</div>
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
                borderRadius: 6, padding: '10px 12px', color: C.text, fontSize: 14, outline: 'none',
              }}
            />
            <button onClick={tryPin} style={{
              background: C.accent, color: '#000', border: 'none', borderRadius: 6,
              padding: '10px 18px', cursor: 'pointer',
              fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: 0.5,
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

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {TYPES.map(t => <PillBtn key={t.id} active={type === t.id} onClick={() => setType(t.id)}>{t.icon} {t.label}</PillBtn>)}
      </div>
      <button onClick={generate} disabled={loading || !commPin} style={{
        background: !commPin ? C.subtle : loading ? C.subtle : C.accent,
        color: (!commPin || loading) ? C.muted : '#000',
        border: 'none', borderRadius: 8, padding: '14px 32px',
        cursor: (!commPin || loading) ? 'not-allowed' : 'pointer',
        fontFamily: "'Oswald', sans-serif", fontSize: 16, letterSpacing: 1,
        textTransform: 'uppercase', marginBottom: 24,
      }}>{loading ? '⏳ Generating...' : !commPin ? '🔒 Login to Generate' : '⚡ Generate Article'}</button>

      {article && (
        <Card style={{ marginBottom: 24 }}>
          {article.split('\n').map((line, i) => {
            if (!line.trim()) return <div key={i} style={{ height: 8 }} />
            const clean = line.replace(/^#+\s*/, '')
            const isHead = i === 0 || (line.length < 90 && (line.startsWith('#') || line === line.toUpperCase()))
            return isHead
              ? <div key={i} style={{ fontFamily: "'Oswald', sans-serif", fontSize: i === 0 ? 26 : 16, color: i === 0 ? C.text : C.accent, letterSpacing: 1, marginBottom: 14, marginTop: i > 0 ? 20 : 0 }}>{clean}</div>
              : <p key={i} style={{ color: C.text, fontSize: 15, margin: '0 0 12px', lineHeight: 1.8 }}>{line}</p>
          })}
        </Card>
      )}

      {/* ── Past Articles Archive ─────────────────────────────── */}
      <div style={{ marginTop: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, color: C.text, letterSpacing: 1, textTransform: 'uppercase' }}>
            📰 Article Archive
          </div>
          <button onClick={loadHistory} disabled={loadingHistory} style={{ background: C.card, color: loadingHistory ? C.muted : C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 12 }}>
            {loadingHistory ? '⏳' : '🔄 Refresh'}
          </button>
        </div>

        {pastArticles.length === 0 && !loadingHistory && (
          <Card><p style={{ color: C.muted, margin: 0, fontSize: 13 }}>No articles generated yet. Generate your first article above.</p></Card>
        )}

        {/* Viewing a past article */}
        {viewingArticle && (
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
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
                ? <div key={i} style={{ fontFamily: "'Oswald', sans-serif", fontSize: i === 0 ? 24 : 15, color: i === 0 ? C.text : C.accent, letterSpacing: 1, marginBottom: 12, marginTop: i > 0 ? 18 : 0 }}>{clean}</div>
                : <p key={i} style={{ color: C.text, fontSize: 14, margin: '0 0 10px', lineHeight: 1.8 }}>{line}</p>
            })}
          </Card>
        )}

        {/* Article list */}
        <div style={{ display: 'grid', gap: 8 }}>
          {pastArticles.map(a => {
            const typeLabel = (a.article_type || 'article').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            const isViewing = viewingArticle?.id === a.id
            return (
              <Card
                key={a.id}
                style={{ display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', borderColor: isViewing ? C.accent + '66' : C.border, transition: 'border-color 0.15s' }}
                onClick={() => setViewingArticle(isViewing ? null : a)}
              >
                <div style={{ fontSize: 24, flexShrink: 0 }}>📄</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
function DriveSync({ onRefresh }) {
  const [files, setFiles]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [parsing, setParsing]   = useState(null)
  const [results, setResults]   = useState({})

  // Type hint is optional — AI auto-detects regardless.
  // 'auto' = no hint given (recommended default)
  const [typeHint, setTypeHint] = useState('auto')

  const TYPE_HINTS = [
    { id: 'auto',        label: '✨ Auto-Detect',        desc: 'AI figures it out — works for any screenshot' },
    { id: 'standings',   label: '📊 Standings',           desc: 'Win/loss records, conference standings' },
    { id: 'scores',      label: '🏈 Scores',              desc: 'Scoreboards, game results' },
    { id: 'player_stats',label: '⭐ Player Stats',         desc: 'Stat leaders, individual numbers' },
    { id: 'recruiting',  label: '📋 Recruiting',          desc: 'Commitments, visits, offers' },
    { id: 'championship',label: '🏆 Championship',        desc: 'Trophy screens, bowl/CFP results' },
  ]

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
          // typeHint passes optional context to AI; 'auto' means no hint
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

  // Build a human-readable saved count from the API response
  const getSavedSummary = (result) => {
    if (!result?.saved) return ''
    const { games, players, standings, championship, recruiting } = result.saved
    const parts = []
    if (games)      parts.push(`${games} game${games !== 1 ? 's' : ''}`)
    if (standings)  parts.push(`${standings} team${standings !== 1 ? 's' : ''}`)
    if (players)    parts.push(`${players} player${players !== 1 ? 's' : ''}`)
    if (recruiting) parts.push(`${recruiting} recruit${recruiting !== 1 ? 's' : ''}`)
    if (championship) parts.push('1 championship')
    return parts.length ? parts.join(', ') + ' saved' : 'data saved'
  }

  return (
    <div>
      <SectionTitle sub="Pull screenshots and Google Docs from your shared Drive folder">Drive Sync</SectionTitle>

      {/* Type hint selector */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Scan Mode</div>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 14 }}>
          Auto-Detect works for everything — the AI reads the screenshot and decides. Use a specific type only if auto-detect is getting it wrong.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TYPE_HINTS.map(t => (
            <PillBtn key={t.id} active={typeHint === t.id} onClick={() => setTypeHint(t.id)}>
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ color: C.muted, fontSize: 14 }}>{files.length} file{files.length !== 1 ? 's' : ''} in Drive folder</div>
        <button onClick={loadFiles} disabled={loading} style={{ background: C.card, color: loading ? C.muted : C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 13 }}>
          {loading ? '⏳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {files.length === 0 && !loading && (
        <Card><p style={{ color: C.muted, margin: 0 }}>No files found. Upload any CFB26 screenshot or Google Doc to the shared Drive folder, then hit Refresh.</p></Card>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {files.map(file => {
          const result    = results[file.id]
          const isParsing = parsing === file.id
          const isDoc     = file.mimeType === 'application/vnd.google-apps.document'
          const savedSummary = getSavedSummary(result)

          return (
            <Card key={file.id} style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 32 }}>{isDoc ? '📄' : '🖼️'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.text, fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
                  {isDoc ? 'Google Doc' : 'Image'} · Uploaded {new Date(file.createdTime).toLocaleString()}
                </div>
                {result?.success && (
                  <div style={{ marginTop: 6 }}>
                    <span style={{ color: C.green, fontSize: 12 }}>✅ </span>
                    <span style={{ color: C.accent, fontSize: 12, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5, textTransform: 'uppercase' }}>
                      {result.detectedType || 'data'}
                    </span>
                    <span style={{ color: C.green, fontSize: 12 }}> — {savedSummary}</span>
                    {result.summary && (
                      <div style={{ color: C.muted, fontSize: 11, marginTop: 2, fontStyle: 'italic' }}>{result.summary}</div>
                    )}
                  </div>
                )}
                {result?.error && <div style={{ color: C.red, fontSize: 12, marginTop: 4 }}>❌ {result.error}</div>}
              </div>
              <button
                onClick={() => parse(file)}
                disabled={isParsing || result?.success}
                style={{
                  background: result?.success ? C.green + '22' : isParsing ? C.subtle : C.accent,
                  color:      result?.success ? C.green : isParsing ? C.muted : '#000',
                  border:     `1px solid ${result?.success ? C.green : C.accent}`,
                  borderRadius: 6, padding: '10px 20px',
                  cursor: result?.success || isParsing ? 'default' : 'pointer',
                  fontFamily: "'Oswald', sans-serif", fontSize: 13, whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                {result?.success ? '✅ Synced' : isParsing ? '⏳ Reading...' : '🔍 Scan with AI'}
              </button>
            </Card>
          )
        })}
      </div>

      <Card style={{ marginTop: 24, borderColor: C.accent + '33' }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>How Drive Sync works</div>
        <ol style={{ color: C.muted, fontSize: 13, lineHeight: 2, margin: 0, paddingLeft: 20 }}>
          <li>Upload <strong style={{ color: C.text }}>any</strong> CFB26 screenshot or Google Doc to the shared Drive folder</li>
          <li>Hit <strong style={{ color: C.text }}>Refresh</strong> to see new files appear above</li>
          <li>Click <strong style={{ color: C.text }}>Scan with AI</strong> — the AI reads it and saves what it finds</li>
          <li>Standings, scores, stats, recruiting, and championships all update automatically</li>
        </ol>
      </Card>
    </div>
  )
}

// ── Root App ───────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]         = useState('Dashboard')
  const [data, setData]       = useState({ teams: [], games: [], players: [], scanLog: [] })
  const [loadingData, setLoadingData] = useState(true)
  const [commPin, setCommPin] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch('/api/league-data')
      const json = await res.json()
      setData(json)
    } catch (e) { console.error(e) }
    setLoadingData(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Restore commissioner PIN from session
  useEffect(() => {
    const p = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('dynasty_comm_pin')
    if (p) setCommPin(p)
  }, [])

  return (
    <>
      <Head>
        <title>Dynasty Universe · CFB 26</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
      </Head>
      <style>{`* { box-sizing:border-box; } body { margin:0; background:${C.bg}; font-family:'Lato',sans-serif; color:${C.text}; } ::-webkit-scrollbar{width:6px;} ::-webkit-scrollbar-track{background:${C.surface};} ::-webkit-scrollbar-thumb{background:${C.subtle};border-radius:3px;}`}</style>

      {/* Nav */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center' }}>
          <div style={{ padding: '16px 24px 16px 0', borderRight: `1px solid ${C.border}`, marginRight: 24, flexShrink: 0 }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 21, fontWeight: 700, letterSpacing: 2, color: C.accent, lineHeight: 1 }}>DYNASTY</div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, letterSpacing: 5, color: C.muted }}>UNIVERSE</div>
          </div>
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
          <div style={{ display: 'flex', gap: 16, paddingLeft: 16, flexShrink: 0 }}>
            <a href="/coaches" style={{ color: C.muted, fontSize: 13, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textDecoration: 'none', whiteSpace: 'nowrap' }}>👤 COACHES</a>
            <a href="/stream-watcher" style={{ color: C.muted, fontSize: 13, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textDecoration: 'none', whiteSpace: 'nowrap' }}>📺 STREAM</a>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '36px 24px' }}>
        {loadingData
          ? <div style={{ color: C.muted, textAlign: 'center', paddingTop: 80, fontFamily: "'Oswald', sans-serif", letterSpacing: 2 }}>LOADING DYNASTY DATA...</div>
          : (
            <>
              {tab === 'Dashboard'    && <Dashboard   {...data} />}
              {tab === 'Standings'    && <Standings   teams={data.teams} />}
              {tab === 'Scores'       && <Scores      games={data.games} />}
              {tab === 'Player Stats' && <PlayerStats players={data.players} />}
              {tab === 'Media Center' && <MediaCenter teams={data.teams} games={data.games} players={data.players} commPin={commPin} onPinSet={pin => { setCommPin(pin); if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('dynasty_comm_pin', pin) }} />}
              {tab === 'Drive Sync'   && <DriveSync   onRefresh={fetchData} />}
            </>
          )}
      </div>
    </>
  )
}
