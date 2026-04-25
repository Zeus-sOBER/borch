import { useState, useEffect } from 'react'
import Head from 'next/head'
import Link from 'next/link'

const C = {
  bg: '#09090b', surface: '#101014', card: '#17171d', border: '#1f1f2e',
  accent: '#c9a84c', green: '#4caf7d', red: '#e05252', blue: '#4a90d9',
  purple: '#9b7fd4', orange: '#ff8c42', text: '#e8eaed', muted: '#8b949e',
  subtle: '#2a2a3a',
}

const TYPE_CONFIG = {
  game:       { color: C.green,  icon: '🏈', label: 'Games' },
  moment:     { color: C.blue,   icon: '⚡', label: 'Moments' },
  recruiting: { color: C.purple, icon: '🎯', label: 'Recruiting' },
  article:    { color: C.accent, icon: '📰', label: 'Articles' },
  lore:       { color: C.orange, icon: '📖', label: 'Lore' },
}

function useMobile() {
  const [m, setM] = useState(false)
  useEffect(() => {
    const check = () => setM(window.innerWidth < 768)
    check(); window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return m
}

export default function Timeline() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [season, setSeason] = useState(1)
  const [filters, setFilters] = useState({ game: true, moment: true, recruiting: true, article: true, lore: true })
  const mobile = useMobile()

  useEffect(() => {
    setLoading(true)
    fetch(`/api/narrative?season=${season}&limit=200&includeContent=false`)
      .then(r => r.json())
      .then(d => { setEntries(d.entries || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [season])

  const filtered = entries.filter(e => filters[e.event_type])
  const weeks = {}
  for (const e of filtered) {
    const w = e.week ?? 0
    if (!weeks[w]) weeks[w] = []
    weeks[w].push(e)
  }
  const sortedWeeks = Object.keys(weeks).map(Number).sort((a, b) => b - a)

  const toggleFilter = (type) => setFilters(f => ({ ...f, [type]: !f[type] }))

  return (
    <>
      <Head>
        <title>Dynasty Timeline</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: "system-ui, -apple-system, sans-serif" }}>
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${C.border}`, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/" style={{ color: C.muted, textDecoration: 'none', fontSize: 14 }}>← Back to Hub</Link>
            <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: mobile ? 22 : 28, fontWeight: 700, color: C.accent, margin: 0 }}>DYNASTY TIMELINE</h1>
          </div>
          <select value={season} onChange={e => setSeason(Number(e.target.value))} style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 4, padding: '6px 12px', fontSize: 14 }}>
            {[1, 2, 3, 4, 5].map(s => <option key={s} value={s}>Season {s}</option>)}
          </select>
        </div>

        {/* Filters */}
        <div style={{ padding: '12px 24px', display: 'flex', gap: 8, flexWrap: 'wrap', borderBottom: `1px solid ${C.border}` }}>
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
            <button key={type} onClick={() => toggleFilter(type)} style={{
              background: filters[type] ? cfg.color + '22' : 'transparent',
              border: `1px solid ${filters[type] ? cfg.color : C.border}`,
              color: filters[type] ? cfg.color : C.muted,
              borderRadius: 20, padding: '4px 14px', fontSize: 12, cursor: 'pointer',
              fontWeight: 600, transition: 'all 0.15s',
            }}>
              {cfg.icon} {cfg.label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        <div style={{ maxWidth: 800, margin: '0 auto', padding: mobile ? '16px' : '32px 24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Loading timeline...</div>
          ) : sortedWeeks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>No events found for Season {season}. Play some games and sync your data!</div>
          ) : (
            sortedWeeks.map(weekNum => (
              <div key={weekNum} style={{ marginBottom: 32 }}>
                {/* Week Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{
                    background: C.accent, color: C.bg, fontFamily: "'Oswald', sans-serif",
                    fontWeight: 700, fontSize: 13, padding: '4px 12px', borderRadius: 4,
                    letterSpacing: 1, whiteSpace: 'nowrap',
                  }}>
                    {weekNum === 0 ? 'PRE-SEASON' : `WEEK ${weekNum}`}
                  </div>
                  <div style={{ flex: 1, height: 1, background: C.border }} />
                  <span style={{ fontSize: 11, color: C.muted }}>{weeks[weekNum].length} event{weeks[weekNum].length !== 1 ? 's' : ''}</span>
                </div>

                {/* Event Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: mobile ? 0 : 16 }}>
                  {weeks[weekNum].map(entry => {
                    const cfg = TYPE_CONFIG[entry.event_type] || { color: C.muted, icon: '📌', label: '?' }
                    const isHighlight = entry.is_season_highlight
                    const isBig = (entry.narrative_weight || 3) >= 4
                    return (
                      <div key={entry.id} style={{
                        background: C.card, border: `1px solid ${isHighlight ? C.accent : C.border}`,
                        borderLeft: `3px solid ${cfg.color}`, borderRadius: 6,
                        padding: isBig ? '14px 16px' : '10px 14px',
                        transition: 'border-color 0.2s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <span style={{ fontSize: isBig ? 20 : 16, flexShrink: 0 }}>{cfg.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              {isHighlight && <span style={{ fontSize: 12 }}>⭐</span>}
                              <span style={{ fontWeight: 600, fontSize: isBig ? 15 : 13, color: C.text }}>
                                {entry.title || entry.summary || 'Untitled event'}
                              </span>
                            </div>
                            {entry.featured_coach && (
                              <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                                {entry.featured_coach}{entry.opposing_coach ? ` vs ${entry.opposing_coach}` : ''}
                                {entry.featured_team ? ` (${entry.featured_team})` : ''}
                              </div>
                            )}
                            {entry.momentum_tags?.length > 0 && (
                              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                                {entry.momentum_tags.map((tag, i) => (
                                  <span key={i} style={{
                                    background: cfg.color + '22', color: cfg.color,
                                    border: `1px solid ${cfg.color}44`, borderRadius: 3,
                                    padding: '1px 6px', fontSize: 10, fontWeight: 600,
                                  }}>{tag.replace(/_/g, ' ')}</span>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Narrative weight indicator */}
                          <div style={{ display: 'flex', gap: 2, flexShrink: 0, alignItems: 'center' }}>
                            {[1, 2, 3, 4, 5].map(w => (
                              <div key={w} style={{
                                width: 4, height: w <= (entry.narrative_weight || 3) ? 12 : 6,
                                background: w <= (entry.narrative_weight || 3) ? cfg.color : C.subtle,
                                borderRadius: 1, transition: 'all 0.2s',
                              }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
