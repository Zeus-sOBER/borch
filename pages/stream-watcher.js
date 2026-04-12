import { useState, useEffect, useRef, useCallback } from 'react'
import Head from 'next/head'

// ── Design tokens (match main app) ────────────────────────────
const C = {
  bg:      '#09090b',
  surface: '#101014',
  card:    '#17171d',
  border:  '#1f1f2e',
  accent:  '#c9a84c',
  green:   '#4caf7d',
  red:     '#e05252',
  blue:    '#4a90d9',
  purple:  '#9b6dff',
  orange:  '#ff8c42',
  text:    '#e8eaed',
  muted:   '#8b949e',
  subtle:  '#2a2a3a',
}

const MOMENT_COLORS = {
  touchdown:     C.green,
  interception:  C.red,
  fumble:        C.red,
  fieldgoal:     C.accent,
  safety:        C.orange,
  sack:          C.purple,
  bigPlay:       C.blue,
  championship:  C.accent,
  upset:         C.orange,
  record:        C.purple,
  default:       C.muted,
}

const MOMENT_ICONS = {
  touchdown:    '🏈',
  interception: '🔄',
  fumble:       '💨',
  fieldgoal:    '🎯',
  safety:       '🛡️',
  sack:         '💥',
  bigPlay:      '⚡',
  championship: '🏆',
  upset:        '😱',
  record:       '📈',
  default:      '📌',
}

const RECRUIT_ICONS = {
  commitment: '✅',
  visit:      '✈️',
  offer:      '📋',
  decommit:   '❌',
}

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

function Card({ children, style = {}, glow }) {
  return (
    <div style={{
      background: C.card,
      border: `1px solid ${glow ? glow + '66' : C.border}`,
      borderRadius: 10,
      padding: 20,
      boxShadow: glow ? `0 0 20px ${glow}22` : 'none',
      transition: 'box-shadow 0.3s',
      ...style,
    }}>{children}</div>
  )
}

function PulsingDot({ color = C.green }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: 10, height: 10 }}>
      <span style={{
        position: 'absolute', inset: 0,
        background: color, borderRadius: '50%',
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
    </span>
  )
}

// ── Scoreboard display ─────────────────────────────────────────
function LiveScoreboard({ analysis }) {
  if (!analysis?.game?.homeTeam) return null
  const g = analysis.game
  const isActive = analysis.gameStatus === 'active'

  return (
    <Card glow={isActive ? C.green : null} style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isActive && <PulsingDot />}
          <Badge color={isActive ? C.green : C.muted}>{analysis.gameStatus?.toUpperCase() || 'UNKNOWN'}</Badge>
          {g.quarter && <Badge color={C.blue}>{g.quarter} QTR</Badge>}
          {g.timeRemaining && <span style={{ color: C.accent, fontFamily: "'Oswald', sans-serif", fontSize: 18 }}>{g.timeRemaining}</span>}
        </div>
        {g.down && <span style={{ color: C.muted, fontSize: 13 }}>{g.down} & {g.yardsToGo} · {g.yardLine ? `${g.yardLine} YD LINE` : ''}</span>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 20, alignItems: 'center' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, color: C.text, fontWeight: 700 }}>{g.homeTeam}</div>
          <div style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Home {g.possession === 'home' ? '🏈' : ''}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 52, color: C.accent, letterSpacing: 4, lineHeight: 1 }}>
            {g.homeScore ?? '—'} <span style={{ fontSize: 28, color: C.muted }}>–</span> {g.awayScore ?? '—'}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, color: C.text, fontWeight: 700 }}>{g.awayTeam}</div>
          <div style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Away {g.possession === 'away' ? '🏈' : ''}</div>
        </div>
      </div>

      {analysis.lastPlay?.description && (
        <div style={{ marginTop: 16, padding: '10px 14px', background: C.surface, borderRadius: 6, fontSize: 13, color: C.text, borderLeft: `3px solid ${C.accent}` }}>
          <span style={{ color: C.muted, marginRight: 8 }}>LAST PLAY:</span>{analysis.lastPlay.description}
          {analysis.lastPlay.isScoring && <span style={{ marginLeft: 8 }}>🏈 SCORING PLAY</span>}
          {analysis.lastPlay.isTurnover && <span style={{ marginLeft: 8, color: C.red }}>🔄 TURNOVER</span>}
        </div>
      )}

      {analysis.atmosphereNotes && (
        <div style={{ marginTop: 10, color: C.muted, fontSize: 12, fontStyle: 'italic' }}>
          🎙️ {analysis.atmosphereNotes}
        </div>
      )}

      {analysis.dynastyNarrative && (
        <div style={{ marginTop: 10, color: C.accent, fontSize: 13, fontStyle: 'italic', borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
          "{analysis.dynastyNarrative}"
        </div>
      )}
    </Card>
  )
}

// ── Big moment feed ────────────────────────────────────────────
function MomentFeed({ moments }) {
  if (!moments?.length) return (
    <div style={{ color: C.muted, fontSize: 13, padding: '20px 0' }}>No moments captured yet. Start watching a stream.</div>
  )
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {moments.slice(0, 25).map((m, i) => {
        const color = MOMENT_COLORS[m.type] || MOMENT_COLORS.default
        const icon  = MOMENT_ICONS[m.type]  || MOMENT_ICONS.default
        return (
          <div key={m.id || i} style={{
            display: 'flex', gap: 12, alignItems: 'flex-start',
            padding: '12px 14px',
            background: color + '0d',
            border: `1px solid ${color}33`,
            borderRadius: 8,
            animation: i === 0 ? 'fadeIn 0.4s ease' : 'none',
          }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                <Badge color={color}>{m.type}</Badge>
                {m.team && <span style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{m.team}</span>}
                {m.player && <span style={{ color: C.muted, fontSize: 12 }}>· {m.player}</span>}
                {m.quarter && <span style={{ color: C.muted, fontSize: 12 }}>Q{m.quarter}</span>}
              </div>
              <div style={{ color: C.text, fontSize: 14 }}>{m.description}</div>
              {(m.home_team && m.away_team) && (
                <div style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                  {m.home_team} {m.home_score ?? '?'} – {m.away_score ?? '?'} {m.away_team}
                </div>
              )}
            </div>
            <div style={{ color: C.muted, fontSize: 11, flexShrink: 0 }}>
              {new Date(m.created_at).toLocaleTimeString()}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Recruiting feed ────────────────────────────────────────────
function RecruitingFeed({ events }) {
  if (!events?.length) return (
    <div style={{ color: C.muted, fontSize: 13, padding: '20px 0' }}>No recruiting events captured yet.</div>
  )
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {events.slice(0, 20).map((ev, i) => (
        <div key={ev.id || i} style={{
          display: 'flex', gap: 12, alignItems: 'center',
          padding: '12px 14px',
          background: C.purple + '0d',
          border: `1px solid ${C.purple}33`,
          borderRadius: 8,
        }}>
          <span style={{ fontSize: 22 }}>{RECRUIT_ICONS[ev.type] || '📋'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Badge color={C.purple}>{ev.type}</Badge>
              <span style={{ color: C.text, fontWeight: 700 }}>{ev.player_name}</span>
              <span style={{ color: C.accent }}>{'⭐'.repeat(Math.min(ev.stars || 0, 5))}</span>
              <Badge color={C.blue}>{ev.pos}</Badge>
            </div>
            {ev.committing_to && (
              <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>→ {ev.committing_to}</div>
            )}
          </div>
          <div style={{ color: C.muted, fontSize: 11 }}>
            {new Date(ev.created_at).toLocaleTimeString()}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Lore generator panel ───────────────────────────────────────
function LorePanel({ moments, recruitingEvents, teams }) {
  const [loreType, setLoreType] = useState('game_lore')
  const [loading, setLoading] = useState(false)
  const [lore, setLore] = useState(null)

  const LORE_TYPES = [
    { id: 'breaking_news',    label: '🚨 Breaking News',    desc: 'Urgent recap of latest moments' },
    { id: 'game_lore',        label: '📖 Game Chronicle',   desc: 'SI-style narrative feature' },
    { id: 'recruiting_lore',  label: '🎯 Recruiting War',   desc: 'Class battles & commitments' },
    { id: 'season_chronicle', label: '📜 Season Chronicle', desc: 'Full dynasty history entry' },
  ]

  const generate = async () => {
    setLoading(true)
    setLore(null)
    try {
      const res = await fetch('/api/generate-lore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moments, recruitingEvents, teams, loreType }),
      })
      const data = await res.json()
      setLore(data.lore || data.error)
    } catch (e) {
      setLore('Error generating lore.')
    }
    setLoading(false)
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8, marginBottom: 16 }}>
        {LORE_TYPES.map(t => (
          <button key={t.id} onClick={() => setLoreType(t.id)} style={{
            background: loreType === t.id ? C.accent + '22' : C.surface,
            color: loreType === t.id ? C.accent : C.muted,
            border: `1px solid ${loreType === t.id ? C.accent : C.border}`,
            borderRadius: 8, padding: '10px 14px', cursor: 'pointer',
            textAlign: 'left', transition: 'all 0.15s',
          }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, letterSpacing: 0.5 }}>{t.label}</div>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{t.desc}</div>
          </button>
        ))}
      </div>

      <button onClick={generate} disabled={loading} style={{
        width: '100%',
        background: loading ? C.subtle : C.accent,
        color: loading ? C.muted : '#000',
        border: 'none', borderRadius: 8,
        padding: '13px 0', cursor: loading ? 'not-allowed' : 'pointer',
        fontFamily: "'Oswald', sans-serif", fontSize: 15, letterSpacing: 1,
        textTransform: 'uppercase', marginBottom: lore ? 16 : 0,
      }}>
        {loading ? '⏳ Generating Dynasty Lore...' : '✍️ Generate Lore'}
      </button>

      {lore && (
        <Card style={{ lineHeight: 1.85, maxHeight: 500, overflowY: 'auto' }}>
          {lore.split('\n').map((line, i) => {
            if (!line.trim()) return <div key={i} style={{ height: 8 }} />
            const clean = line.replace(/^#+\s*/, '')
            const isHead = i === 0 || (line.length < 90 && line.startsWith('#'))
            return isHead
              ? <div key={i} style={{ fontFamily: "'Oswald', sans-serif", fontSize: i === 0 ? 22 : 15, color: i === 0 ? C.text : C.accent, marginBottom: 12, marginTop: i > 0 ? 16 : 0 }}>{clean}</div>
              : <p key={i} style={{ color: C.text, fontSize: 14, margin: '0 0 10px' }}>{line}</p>
          })}
        </Card>
      )}
    </div>
  )
}

// ── Main Stream Watcher page ───────────────────────────────────
export default function StreamWatcher() {
  const [channel, setChannel]         = useState('')
  const [savedChannel, setSavedChannel] = useState('')
  const [watching, setWatching]       = useState(false)
  const [interval, setIntervalSecs]   = useState(60)
  const [week, setWeek]               = useState(1)
  const [lastScan, setLastScan]       = useState(null)
  const [scanning, setScanning]       = useState(false)
  const [countdown, setCountdown]     = useState(0)
  const [activeTab, setActiveTab]     = useState('scoreboard')
  const [history, setHistory]         = useState({ bigMoments: [], recruitingEvents: [], streamEvents: [] })

  const timerRef    = useRef(null)
  const countdownRef = useRef(null)

  // Load channel from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('dynasty_twitch_channel')
    if (saved) { setChannel(saved); setSavedChannel(saved) }
    fetchHistory()
  }, [])

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/stream-history')
      const data = await res.json()
      setHistory(data)
    } catch (e) { console.error(e) }
  }, [])

  const scan = useCallback(async (ch) => {
    if (!ch) return
    setScanning(true)
    try {
      const res = await fetch('/api/watch-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelName: ch,
          currentGameContext: { week },
        }),
      })
      const data = await res.json()
      setLastScan(data)
      await fetchHistory()
    } catch (e) {
      console.error(e)
    }
    setScanning(false)
  }, [week, fetchHistory])

  const startWatching = () => {
    if (!channel.trim()) return
    const ch = channel.trim().toLowerCase()
    setSavedChannel(ch)
    localStorage.setItem('dynasty_twitch_channel', ch)
    setWatching(true)
    scan(ch)

    // Countdown timer
    setCountdown(interval)
    countdownRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) return interval
        return c - 1
      })
    }, 1000)

    // Auto-scan timer
    timerRef.current = setInterval(() => {
      scan(ch)
    }, interval * 1000)
  }

  const stopWatching = () => {
    setWatching(false)
    clearInterval(timerRef.current)
    clearInterval(countdownRef.current)
    setCountdown(0)
  }

  useEffect(() => () => {
    clearInterval(timerRef.current)
    clearInterval(countdownRef.current)
  }, [])

  const TABS = [
    { id: 'scoreboard', label: '🏈 Live Game' },
    { id: 'moments',    label: `⚡ Moments (${history.bigMoments.length})` },
    { id: 'recruiting', label: `🎯 Recruiting (${history.recruitingEvents.length})` },
    { id: 'lore',       label: '📖 Dynasty Lore' },
  ]

  return (
    <>
      <Head>
        <title>Stream Watcher · Dynasty Universe</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
      </Head>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; font-family: 'Lato', sans-serif; color: ${C.text}; }
        @keyframes pulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.4; transform:scale(1.4); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
        ::-webkit-scrollbar { width:6px; } ::-webkit-scrollbar-track { background:${C.surface}; } ::-webkit-scrollbar-thumb { background:${C.subtle}; border-radius:3px; }
      `}</style>

      {/* Top nav */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 24px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="/" style={{ textDecoration: 'none', padding: '16px 0', borderRight: `1px solid ${C.border}`, paddingRight: 20, marginRight: 4 }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 2, color: C.accent, lineHeight: 1 }}>DYNASTY</div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, letterSpacing: 5, color: C.muted }}>UNIVERSE</div>
          </a>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, color: C.muted, letterSpacing: 1 }}>← BACK TO MAIN HUB</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {watching && (
              <>
                <PulsingDot color={C.green} />
                <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.green, letterSpacing: 1 }}>
                  WATCHING {savedChannel.toUpperCase()}
                </span>
                <span style={{ color: C.muted, fontSize: 12 }}>· next scan in {countdown}s</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: 1, textTransform: 'uppercase' }}>
            📺 Stream Watcher
          </h1>
          <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>
            AI watches your CFB26 Twitch stream and automatically updates dynasty data
          </p>
        </div>

        {/* Control panel */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
            Stream Controls
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <label style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Twitch Channel Name</label>
              <input
                value={channel}
                onChange={e => setChannel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !watching && startWatching()}
                placeholder="e.g. yourleaguename"
                disabled={watching}
                style={{
                  width: '100%', background: C.surface,
                  border: `1px solid ${C.border}`, borderRadius: 6,
                  padding: '10px 14px', color: C.text, fontSize: 14,
                  fontFamily: "'Lato', sans-serif",
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ minWidth: 140 }}>
              <label style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Scan Every</label>
              <select
                value={interval}
                onChange={e => setIntervalSecs(Number(e.target.value))}
                disabled={watching}
                style={{
                  width: '100%', background: C.surface,
                  border: `1px solid ${C.border}`, borderRadius: 6,
                  padding: '10px 14px', color: C.text, fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
                <option value={90}>90 seconds</option>
                <option value={120}>2 minutes</option>
              </select>
            </div>

            <div style={{ minWidth: 100 }}>
              <label style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>Week #</label>
              <input
                type="number" min={1} max={20} value={week}
                onChange={e => setWeek(Number(e.target.value))}
                style={{
                  width: '100%', background: C.surface,
                  border: `1px solid ${C.border}`, borderRadius: 6,
                  padding: '10px 14px', color: C.text, fontSize: 14,
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              {!watching ? (
                <button onClick={startWatching} disabled={!channel.trim()} style={{
                  background: channel.trim() ? C.green : C.subtle,
                  color: channel.trim() ? '#000' : C.muted,
                  border: 'none', borderRadius: 8,
                  padding: '10px 24px', cursor: channel.trim() ? 'pointer' : 'not-allowed',
                  fontFamily: "'Oswald', sans-serif", fontSize: 15, letterSpacing: 1,
                  whiteSpace: 'nowrap',
                }}>▶ Start Watching</button>
              ) : (
                <button onClick={stopWatching} style={{
                  background: C.red + '22', color: C.red,
                  border: `1px solid ${C.red}44`, borderRadius: 8,
                  padding: '10px 24px', cursor: 'pointer',
                  fontFamily: "'Oswald', sans-serif", fontSize: 15, letterSpacing: 1,
                  whiteSpace: 'nowrap',
                }}>⏹ Stop</button>
              )}

              <button
                onClick={() => scan(savedChannel || channel.trim())}
                disabled={scanning || (!savedChannel && !channel.trim())}
                style={{
                  background: scanning ? C.subtle : C.accent + '22',
                  color: scanning ? C.muted : C.accent,
                  border: `1px solid ${scanning ? C.border : C.accent + '66'}`,
                  borderRadius: 8, padding: '10px 20px',
                  cursor: scanning ? 'not-allowed' : 'pointer',
                  fontFamily: "'Oswald', sans-serif", fontSize: 15, letterSpacing: 0.5,
                  whiteSpace: 'nowrap',
                }}
              >
                {scanning ? '⏳ Scanning...' : '🔍 Manual Scan'}
              </button>
            </div>
          </div>

          {/* Stream status bar */}
          {lastScan && (
            <div style={{ marginTop: 16, padding: '10px 14px', background: C.surface, borderRadius: 6, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              {lastScan.live ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <PulsingDot color={C.green} />
                    <span style={{ color: C.green, fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: 1 }}>LIVE</span>
                  </div>
                  <span style={{ color: C.text, fontSize: 13 }}>{lastScan.streamTitle}</span>
                  {lastScan.viewerCount !== undefined && (
                    <span style={{ color: C.muted, fontSize: 12 }}>👁 {lastScan.viewerCount?.toLocaleString()} viewers</span>
                  )}
                </>
              ) : (
                <span style={{ color: C.red, fontSize: 13 }}>📴 {lastScan.message || 'Stream offline'}</span>
              )}
              <span style={{ color: C.muted, fontSize: 11, marginLeft: 'auto' }}>
                Last scan: {new Date(lastScan.timestamp).toLocaleTimeString()}
              </span>
            </div>
          )}
        </Card>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: `1px solid ${C.border}`, paddingBottom: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
              background: 'transparent',
              color: activeTab === t.id ? C.accent : C.muted,
              border: 'none',
              borderBottom: `2px solid ${activeTab === t.id ? C.accent : 'transparent'}`,
              padding: '12px 18px', cursor: 'pointer',
              fontFamily: "'Oswald', sans-serif", fontSize: 13,
              letterSpacing: 0.8, textTransform: 'uppercase',
              transition: 'all 0.15s', whiteSpace: 'nowrap',
              marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'scoreboard' && (
          <div>
            {lastScan?.analysis
              ? <LiveScoreboard analysis={lastScan.analysis} />
              : <Card><p style={{ color: C.muted, margin: 0 }}>No scan data yet. Enter a Twitch channel and start watching, or hit Manual Scan.</p></Card>
            }
            {/* Latest thumbnail */}
            {lastScan?.thumbnailUrl && (
              <Card style={{ padding: 12 }}>
                <div style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Latest Stream Frame</div>
                <img
                  src={`${lastScan.thumbnailUrl}&t=${Date.now()}`}
                  alt="Stream thumbnail"
                  style={{ width: '100%', borderRadius: 6, border: `1px solid ${C.border}` }}
                />
              </Card>
            )}
          </div>
        )}

        {activeTab === 'moments' && (
          <Card>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
              Big Moments Feed
            </div>
            <MomentFeed moments={history.bigMoments} />
          </Card>
        )}

        {activeTab === 'recruiting' && (
          <Card>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
              Recruiting Events
            </div>
            <RecruitingFeed events={history.recruitingEvents} />
          </Card>
        )}

        {activeTab === 'lore' && (
          <Card>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
              Dynasty Lore Generator
            </div>
            <LorePanel
              moments={history.bigMoments}
              recruitingEvents={history.recruitingEvents}
            />
          </Card>
        )}
      </div>
    </>
  )
}
