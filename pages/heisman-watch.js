import { useEffect, useState } from 'react'

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

// Trend arrow — matches the game's CHANGE column
function TrendArrow({ trend }) {
  if (trend === 'up')   return <span style={{ color: C.green,  fontSize: 16 }}>▲</span>
  if (trend === 'down') return <span style={{ color: C.red,    fontSize: 16 }}>▼</span>
  return                       <span style={{ color: C.muted,  fontSize: 12 }}>—</span>
}

// Rank badge — styled like the game (no emoji, just the number)
function RankBadge({ rank }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: 24, height: 24,
      background: rank === 1 ? C.accent : C.subtle,
      color: rank === 1 ? C.bg : C.text,
      borderRadius: 2,
      fontFamily: "'Oswald', sans-serif",
      fontSize: 12, fontWeight: 700,
    }}>{rank}</span>
  )
}

export default function HeismanWatch() {
  const [candidates, setCandidates]   = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [selected, setSelected]       = useState(null)
  const [showForm, setShowForm]       = useState(false)
  const [showImport, setShowImport]   = useState(false)
  const [importFileId, setImportFileId] = useState('')
  const [importing, setImporting]     = useState(false)
  const [importMsg, setImportMsg]     = useState(null)

  const BLANK_FORM = {
    player_name: '', position: '', team_name: '', coach_name: '',
    class_year: '', trend: 'same', rank: 1, notes: '',
  }
  const [form, setForm] = useState(BLANK_FORM)

  useEffect(() => { fetchCandidates() }, [])

  useEffect(() => {
    if (candidates.length > 0 && !selected) setSelected(candidates[0])
  }, [candidates])

  // ── Fetch ────────────────────────────────────────────────────────────────────
  async function fetchCandidates() {
    try {
      setLoading(true)
      const res = await fetch('/api/heisman-watch')
      if (!res.ok) {
        const text = await res.text()
        setError(`API Error ${res.status}: ${text.substring(0, 120)}`)
        return
      }
      const data = await res.json()
      if (data.success) {
        setCandidates(data.candidates || [])
        setError(null)
      } else {
        setError(data.error || 'Unknown error')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Manual add ───────────────────────────────────────────────────────────────
  async function handleAdd(e) {
    e.preventDefault()
    try {
      const res = await fetch('/api/heisman-watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, rank: parseInt(form.rank) }),
      })
      const data = await res.json()
      if (data.success) {
        setCandidates(prev => [...prev, data.candidate].sort((a, b) => a.rank - b.rank))
        setForm(BLANK_FORM)
        setShowForm(false)
        setError(null)
      } else {
        setError(data.error || 'Failed to add candidate')
      }
    } catch (err) {
      setError(err.message)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function handleDelete(id) {
    if (!confirm('Remove this candidate?')) return
    try {
      const res = await fetch(`/api/heisman-watch?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setCandidates(prev => prev.filter(c => c.id !== id))
        if (selected?.id === id) setSelected(null)
        setError(null)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  // ── Screenshot import ────────────────────────────────────────────────────────
  async function handleImport(e) {
    e.preventDefault()
    if (!importFileId.trim()) return
    try {
      setImporting(true)
      setImportMsg(null)
      const res = await fetch('/api/heisman-watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: importFileId.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setCandidates(data.candidates || [])
        setSelected(data.candidates?.[0] || null)
        setImportMsg({ type: 'ok', text: data.message })
        setImportFileId('')
        setError(null)
      } else {
        setImportMsg({ type: 'err', text: data.error || 'Import failed' })
      }
    } catch (err) {
      setImportMsg({ type: 'err', text: err.message })
    } finally {
      setImporting(false)
    }
  }

  // ── Shared input style ───────────────────────────────────────────────────────
  const inp = {
    background: C.surface, border: `1px solid ${C.border}`, color: C.text,
    padding: 8, borderRadius: 4, fontFamily: 'monospace', fontSize: 12, width: '100%',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '24px', fontFamily: "'Oswald', sans-serif" }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* ── Back link ─────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <a href="/" style={{ color: C.muted, fontSize: 12, letterSpacing: 1, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            ← BACK TO DYNASTY UNIVERSE
          </a>
        </div>

        {/* ── Page Header ───────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: 2, margin: 0, marginBottom: 4 }}>
            🏆 HEISMAN TROPHY WATCH
          </h1>
          <p style={{ fontSize: 11, color: C.muted, letterSpacing: 1, margin: 0 }}>
            Top 5 candidates competing for college football's most prestigious award
          </p>
        </div>

        {/* ── Error banner ──────────────────────────────────────────────────── */}
        {error && (
          <div style={{ background: C.red + '22', border: `1px solid ${C.red}66`, color: C.red, padding: '10px 14px', borderRadius: 4, marginBottom: 20, fontSize: 11, letterSpacing: 0.5 }}>
            {error}
          </div>
        )}

        {/* ── Action bar ────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <button
            onClick={() => { setShowForm(f => !f); setShowImport(false) }}
            style={{ background: showForm ? C.red : C.accent, color: C.bg, border: 'none', padding: '7px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: "'Oswald', sans-serif" }}
          >
            {showForm ? '✕ CANCEL' : '+ ADD CANDIDATE'}
          </button>
          <button
            onClick={() => { setShowImport(i => !i); setShowForm(false); setImportMsg(null) }}
            style={{ background: showImport ? C.red : '#2a2a3a', color: C.text, border: `1px solid ${C.border}`, padding: '7px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: "'Oswald', sans-serif" }}
          >
            {showImport ? '✕ CANCEL' : '📸 IMPORT FROM SCREENSHOT'}
          </button>
        </div>

        {/* ── Screenshot import form ────────────────────────────────────────── */}
        {showImport && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: 16, borderRadius: 4, marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 1, margin: '0 0 4px 0' }}>IMPORT FROM GAME SCREENSHOT</p>
            <p style={{ fontSize: 10, color: C.muted, margin: '0 0 12px 0' }}>
              Share your Heisman Watch screenshot to Google Drive, then paste the file ID below (from the Drive URL: drive.google.com/file/d/<strong style={{color:C.accent}}>FILE_ID</strong>/view)
            </p>
            <form onSubmit={handleImport} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="Google Drive file ID"
                value={importFileId}
                onChange={e => setImportFileId(e.target.value)}
                required
                style={{ ...inp, flex: 1 }}
              />
              <button
                type="submit"
                disabled={importing}
                style={{ background: C.green, color: C.bg, border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: "'Oswald', sans-serif', whiteSpace: 'nowrap" }}
              >
                {importing ? '⏳ READING...' : '✓ IMPORT'}
              </button>
            </form>
            {importMsg && (
              <p style={{ fontSize: 11, color: importMsg.type === 'ok' ? C.green : C.red, margin: '8px 0 0 0' }}>
                {importMsg.text}
              </p>
            )}
          </div>
        )}

        {/* ── Manual add form ───────────────────────────────────────────────── */}
        {showForm && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: 16, borderRadius: 4, marginBottom: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: C.text, letterSpacing: 1, margin: '0 0 14px 0' }}>ADD CANDIDATE</p>
            <form onSubmit={handleAdd}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <input placeholder="Player Name *" required value={form.player_name} onChange={e => setForm({...form, player_name: e.target.value})} style={inp} />
                <input placeholder="Position (QB, HB, WR…)" value={form.position} onChange={e => setForm({...form, position: e.target.value})} style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <input placeholder="Team Name *" required value={form.team_name} onChange={e => setForm({...form, team_name: e.target.value})} style={inp} />
                <input placeholder="Coach Name (optional)" value={form.coach_name} onChange={e => setForm({...form, coach_name: e.target.value})} style={inp} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
                <input placeholder="Class Year (JR, SR (RS)…)" value={form.class_year} onChange={e => setForm({...form, class_year: e.target.value})} style={inp} />
                <select value={form.trend} onChange={e => setForm({...form, trend: e.target.value})} style={{ ...inp, fontFamily: 'monospace' }}>
                  <option value="up">▲ Trending Up</option>
                  <option value="same">— No Change</option>
                  <option value="down">▼ Trending Down</option>
                </select>
                <select value={form.rank} onChange={e => setForm({...form, rank: parseInt(e.target.value)})} style={{ ...inp, fontFamily: 'monospace' }}>
                  {[1,2,3,4,5].map(r => <option key={r} value={r}>Rank #{r}</option>)}
                </select>
              </div>
              <textarea
                placeholder="Notes (optional)"
                rows={2}
                value={form.notes}
                onChange={e => setForm({...form, notes: e.target.value})}
                style={{ ...inp, marginBottom: 10 }}
              />
              <button type="submit" style={{ background: C.green, color: C.bg, border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700, letterSpacing: 1, fontFamily: "'Oswald', sans-serif" }}>
                ✓ ADD
              </button>
            </form>
          </div>
        )}

        {/* ── Loading ───────────────────────────────────────────────────────── */}
        {loading && (
          <div style={{ padding: 48, textAlign: 'center', color: C.muted, fontSize: 12, letterSpacing: 1 }}>⏳ LOADING...</div>
        )}

        {/* ── Main layout: table + detail panel ────────────────────────────── */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: candidates.length > 0 ? '1fr 300px' : '1fr', gap: 20 }}>

            {/* ── Left: candidates table ─────────────────────────────────────── */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden' }}>
              {/* Gold header bar — matches the game */}
              <div style={{ background: C.accent, color: C.bg, padding: '12px 16px', fontSize: 16, fontWeight: 700, letterSpacing: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                🏆 HEISMAN TROPHY
              </div>

              {/* Column headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '44px 60px 1fr 100px 60px',
                background: C.surface, borderBottom: `1px solid ${C.border}`,
                padding: '8px 16px', gap: 12,
                fontSize: 10, letterSpacing: 1, color: C.muted, fontWeight: 700,
              }}>
                <div>RANK</div>
                <div>POS</div>
                <div>NAME / TEAM</div>
                <div style={{ textAlign: 'center' }}>YEAR</div>
                <div style={{ textAlign: 'center' }}>CHANGE</div>
              </div>

              {/* Rows */}
              {candidates.length > 0 ? candidates.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '44px 60px 1fr 100px 60px',
                    gap: 12,
                    padding: '12px 16px',
                    borderBottom: `1px solid ${C.border}`,
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: selected?.id === c.id ? C.subtle : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = C.subtle}
                  onMouseLeave={e => e.currentTarget.style.background = selected?.id === c.id ? C.subtle : 'transparent'}
                >
                  {/* Rank */}
                  <div><RankBadge rank={c.rank} /></div>

                  {/* Position */}
                  <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 0.5 }}>
                    {c.position || '—'}
                  </div>

                  {/* Name / Team */}
                  <div>
                    <p style={{ fontSize: 13, color: C.text, fontWeight: 700, letterSpacing: 0.5, margin: 0, marginBottom: 1 }}>
                      {c.player_name}
                    </p>
                    <p style={{ fontSize: 10, color: C.accent, letterSpacing: 0.5, margin: 0 }}>
                      {c.team_name}
                    </p>
                  </div>

                  {/* Class year */}
                  <div style={{ fontSize: 11, color: C.text, textAlign: 'center', letterSpacing: 0.5 }}>
                    {c.class_year || '—'}
                  </div>

                  {/* Trend */}
                  <div style={{ textAlign: 'center' }}>
                    <TrendArrow trend={c.trend} />
                  </div>
                </div>
              )) : (
                <div style={{ padding: '40px 16px', textAlign: 'center', color: C.muted, fontSize: 11, letterSpacing: 1 }}>
                  NO CANDIDATES YET — ADD ONE OR IMPORT FROM A SCREENSHOT
                </div>
              )}
            </div>

            {/* ── Right: detail panel ────────────────────────────────────────── */}
            {selected && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Rank label */}
                <div>
                  <p style={{ fontSize: 9, color: C.muted, letterSpacing: 1, margin: '0 0 4px 0', textTransform: 'uppercase' }}>
                    {selected.rank === 1 ? '🏆 HEISMAN FRONTRUNNER' : `CANDIDATE #${selected.rank}`}
                  </p>
                  <h3 style={{ fontSize: 20, color: C.text, fontWeight: 700, letterSpacing: 1, margin: 0, marginBottom: 2 }}>
                    {selected.player_name}
                  </h3>
                  <p style={{ fontSize: 11, color: C.accent, letterSpacing: 0.5, margin: 0, marginBottom: 2 }}>
                    {selected.team_name}
                  </p>
                  {selected.coach_name && (
                    <p style={{ fontSize: 10, color: C.muted, letterSpacing: 0.5, margin: 0 }}>
                      Coach: {selected.coach_name}
                    </p>
                  )}
                </div>

                {/* Quick stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                  <div style={{ background: C.surface, padding: '8px 10px', borderRadius: 4 }}>
                    <p style={{ fontSize: 9, color: C.muted, letterSpacing: 1, margin: '0 0 2px 0' }}>POSITION</p>
                    <p style={{ fontSize: 14, color: C.text, fontWeight: 700, margin: 0 }}>{selected.position || '—'}</p>
                  </div>
                  <div style={{ background: C.surface, padding: '8px 10px', borderRadius: 4 }}>
                    <p style={{ fontSize: 9, color: C.muted, letterSpacing: 1, margin: '0 0 2px 0' }}>CLASS</p>
                    <p style={{ fontSize: 14, color: C.text, fontWeight: 700, margin: 0 }}>{selected.class_year || '—'}</p>
                  </div>
                  <div style={{ background: C.surface, padding: '8px 10px', borderRadius: 4, gridColumn: '1 / -1' }}>
                    <p style={{ fontSize: 9, color: C.muted, letterSpacing: 1, margin: '0 0 4px 0' }}>TREND</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <TrendArrow trend={selected.trend} />
                      <span style={{ fontSize: 11, color: C.text }}>
                        {selected.trend === 'up' ? 'Rising' : selected.trend === 'down' ? 'Falling' : 'Holding'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Key stats */}
                {selected.key_stats && Object.keys(selected.key_stats).length > 0 && (
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    <p style={{ fontSize: 9, color: C.muted, letterSpacing: 1, margin: '0 0 8px 0' }}>KEY STATS</p>
                    {Object.entries(selected.key_stats).slice(0, 5).map(([stat, val]) => (
                      <div key={stat} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 10, color: C.muted, letterSpacing: 0.5, textTransform: 'uppercase' }}>{stat.replace(/_/g, ' ')}</span>
                        <span style={{ fontSize: 12, color: C.blue, fontWeight: 700 }}>{val}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {selected.notes && (
                  <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                    <p style={{ fontSize: 9, color: C.muted, letterSpacing: 1, margin: '0 0 6px 0' }}>NOTES</p>
                    <p style={{ fontSize: 10, color: C.text, lineHeight: 1.5, margin: 0 }}>{selected.notes}</p>
                  </div>
                )}

                {/* Week updated */}
                {selected.week_updated && (
                  <p style={{ fontSize: 9, color: C.muted, letterSpacing: 0.5, margin: 0, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>
                    LAST UPDATED: WEEK {selected.week_updated}
                  </p>
                )}

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(selected.id)}
                  style={{
                    background: 'transparent', border: `1px solid ${C.red}66`,
                    color: C.red, cursor: 'pointer', padding: '6px 12px',
                    borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: 1,
                    fontFamily: "'Oswald', sans-serif", marginTop: 4,
                  }}
                >
                  ✕ REMOVE CANDIDATE
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
