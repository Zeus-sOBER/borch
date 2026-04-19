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
  purple:  '#9b7fd4',
  text:    '#e8eaed',
  muted:   '#8b949e',
  subtle:  '#2a2a3a',
}

export default function HeismanWatch() {
  const [candidates, setCandidates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [formData, setFormData] = useState({
    player_name: '',
    position: '',
    team_id: '',
    coach_id: '',
    rank: 1,
    notes: '',
    trophy_screenshot_url: '',
  })

  // Fetch candidates on mount
  useEffect(() => {
    fetchCandidates()
  }, [])

  // Set first candidate as selected by default
  useEffect(() => {
    if (candidates.length > 0 && !selectedCandidate) {
      setSelectedCandidate(candidates[0])
    }
  }, [candidates])

  const fetchCandidates = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/heisman-watch')
      const data = await res.json()
      if (data.success) {
        setCandidates(data.candidates || [])
        setError(null)
      } else {
        setError(data.error || 'Failed to load candidates')
      }
    } catch (err) {
      setError(err.message)
      console.error('Error fetching candidates:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCandidate = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...formData,
        team_id: parseInt(formData.team_id),
        coach_id: parseInt(formData.coach_id),
        rank: parseInt(formData.rank),
      }

      const res = await fetch('/api/heisman-watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (data.success) {
        setCandidates([...candidates, data.candidate].sort((a, b) => a.rank - b.rank))
        setFormData({ player_name: '', position: '', team_id: '', coach_id: '', rank: 1, notes: '', trophy_screenshot_url: '' })
        setShowForm(false)
        setError(null)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this candidate?')) return
    try {
      const res = await fetch(`/api/heisman-watch?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setCandidates(candidates.filter(c => c.id !== id))
        if (selectedCandidate?.id === id) {
          setSelectedCandidate(candidates[0] || null)
        }
        setError(null)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const getMedal = (rank) => {
    const medals = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '4️⃣', 5: '5️⃣' }
    return medals[rank] || ''
  }

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: 1600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: C.text, fontFamily: "'Oswald', sans-serif", letterSpacing: 2, margin: 0, marginBottom: 8 }}>🏆 HEISMAN TROPHY WATCH</h1>
          <p style={{ fontSize: 12, color: C.muted, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, margin: 0 }}>Top 5 candidates competing for college football's most prestigious award</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: C.red + '22', border: `1px solid ${C.red}66`, color: C.red, padding: 12, borderRadius: 4, marginBottom: 24, fontFamily: "'Oswald', sans-serif", fontSize: 11, letterSpacing: 0.5 }}>
            {error}
          </div>
        )}

        {/* Add Button */}
        <div style={{ marginBottom: 24 }}>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: showForm ? C.red : C.accent,
              color: C.bg,
              border: 'none',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: "'Oswald', sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {showForm ? '✕ CANCEL' : '+ ADD CANDIDATE'}
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: 20, borderRadius: 4, marginBottom: 32 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: C.text, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, margin: '0 0 16px 0' }}>ADD CANDIDATE</h2>
            <form onSubmit={handleAddCandidate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <input type="text" placeholder="Player Name" required value={formData.player_name} onChange={(e) => setFormData({ ...formData, player_name: e.target.value })} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: 8, borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }} />
                <input type="text" placeholder="Position (QB, RB, WR)" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: 8, borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <input type="number" placeholder="Team ID" required value={formData.team_id} onChange={(e) => setFormData({ ...formData, team_id: e.target.value })} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: 8, borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }} />
                <input type="number" placeholder="Coach ID" required value={formData.coach_id} onChange={(e) => setFormData({ ...formData, coach_id: e.target.value })} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: 8, borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <select value={formData.rank} onChange={(e) => setFormData({ ...formData, rank: parseInt(e.target.value) })} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: 8, borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}>
                  <option value="1">Rank 1</option>
                  <option value="2">Rank 2</option>
                  <option value="3">Rank 3</option>
                  <option value="4">Rank 4</option>
                  <option value="5">Rank 5</option>
                </select>
                <input type="url" placeholder="Trophy Screenshot URL" value={formData.trophy_screenshot_url} onChange={(e) => setFormData({ ...formData, trophy_screenshot_url: e.target.value })} style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: 8, borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }} />
              </div>
              <textarea placeholder="Notes" rows="2" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: 8, borderRadius: 4, fontFamily: 'monospace', fontSize: 12, marginBottom: 12, boxSizing: 'border-box' }} />
              <button type="submit" style={{ background: C.green, color: C.bg, border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>✓ ADD</button>
            </form>
          </div>
        )}

        {/* Main Content */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
            {/* Left: Table */}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, overflow: 'hidden' }}>
              {/* Header Bar */}
              <div style={{ background: C.accent, color: C.bg, padding: '12px 16px', fontFamily: "'Oswald', sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: 2 }}>
                🏆 HEISMAN TROPHY
              </div>

              {/* Column Headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '40px 80px 1fr 100px 60px', background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '8px 16px', fontFamily: "'Oswald', sans-serif", fontSize: 10, letterSpacing: 1, color: C.muted, textTransform: 'uppercase', fontWeight: 700, gap: 12 }}>
                <div>RANK</div>
                <div>POS</div>
                <div>NAME / TEAM / COACH</div>
                <div>STAT</div>
                <div>TREND</div>
              </div>

              {/* Rows */}
              {candidates.length > 0 ? (
                <div>
                  {candidates.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCandidate(c)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 80px 1fr 100px 60px',
                        gap: 12,
                        padding: '12px 16px',
                        borderBottom: `1px solid ${C.border}`,
                        alignItems: 'center',
                        cursor: 'pointer',
                        background: selectedCandidate?.id === c.id ? C.subtle : 'transparent',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = C.subtle}
                      onMouseLeave={(e) => e.currentTarget.style.background = selectedCandidate?.id === c.id ? C.subtle : 'transparent'}
                    >
                      {/* Rank */}
                      <div style={{ fontSize: 20, fontWeight: 700, color: C.accent }}>
                        {getMedal(c.rank)}
                      </div>

                      {/* Position */}
                      <div style={{ fontSize: 11, fontFamily: "'Oswald', sans-serif", color: C.muted, fontWeight: 700, letterSpacing: 0.5 }}>
                        {c.position || '—'}
                      </div>

                      {/* Name / Team / Coach */}
                      <div>
                        <p style={{ fontSize: 13, fontFamily: "'Oswald', sans-serif", color: C.text, fontWeight: 700, letterSpacing: 0.5, margin: 0, marginBottom: 2 }}>
                          {c.player_name}
                        </p>
                        <p style={{ fontSize: 10, fontFamily: "'Oswald', sans-serif", color: C.accent, letterSpacing: 0.5, margin: 0, marginBottom: 2 }}>
                          {c.teams?.name || 'TEAM UNKNOWN'}
                        </p>
                        <p style={{ fontSize: 9, fontFamily: "'Oswald', sans-serif", color: C.muted, letterSpacing: 0.5, margin: 0 }}>
                          Coach: {c.coaches?.name || 'Unknown'}
                        </p>
                      </div>

                      {/* Key Stat */}
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 14, fontFamily: "'Oswald', sans-serif", color: C.blue, fontWeight: 700, margin: 0 }}>
                          {c.key_stats?.passing_yards || c.key_stats?.rushing_yards || '—'}
                        </p>
                        <p style={{ fontSize: 8, fontFamily: "'Oswald', sans-serif", color: C.muted, letterSpacing: 0.5, margin: 0 }}>
                          {c.key_stats?.passing_yards ? 'PASS YDS' : c.key_stats?.rushing_yards ? 'RUSH YDS' : ''}
                        </p>
                      </div>

                      {/* Delete Button */}
                      <div style={{ textAlign: 'right' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(c.id)
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: C.red,
                            cursor: 'pointer',
                            fontSize: 14,
                            padding: 0,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: C.muted, fontFamily: "'Oswald', sans-serif", fontSize: 11, letterSpacing: 1 }}>
                  NO CANDIDATES YET
                </div>
              )}
            </div>

            {/* Right: Detail Card */}
            {selectedCandidate && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 4, padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Player Name */}
                <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
                  <p style={{ fontSize: 9, fontFamily: "'Oswald', sans-serif", color: C.muted, letterSpacing: 1, margin: 0, marginBottom: 4, textTransform: 'uppercase' }}>
                    {selectedCandidate.rank === 1 ? '🏆 TOP CONTENDER' : `RANK #${selectedCandidate.rank}`}
                  </p>
                  <h3 style={{ fontSize: 18, fontFamily: "'Oswald', sans-serif", color: C.text, fontWeight: 700, letterSpacing: 1, margin: 0, marginBottom: 4 }}>
                    {selectedCandidate.player_name}
                  </h3>
                  <p style={{ fontSize: 11, fontFamily: "'Oswald', sans-serif", color: C.accent, letterSpacing: 0.5, margin: 0, marginBottom: 2 }}>
                    {selectedCandidate.teams?.name}
                  </p>
                  <p style={{ fontSize: 10, fontFamily: "'Oswald', sans-serif", color: C.muted, letterSpacing: 0.5, margin: 0 }}>
                    Coach: {selectedCandidate.coaches?.name}
                  </p>
                </div>

                {/* Key Stats */}
                {selectedCandidate.key_stats && Object.keys(selectedCandidate.key_stats).length > 0 && (
                  <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
                    <p style={{ fontSize: 9, fontFamily: "'Oswald', sans-serif", color: C.muted, letterSpacing: 1, margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      KEY STATS
                    </p>
                    {Object.entries(selectedCandidate.key_stats).slice(0, 4).map(([stat, value]) => (
                      <div key={stat} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <p style={{ fontSize: 10, fontFamily: "'Oswald', sans-serif", color: C.muted, letterSpacing: 0.5, margin: 0, textTransform: 'uppercase' }}>
                          {stat}
                        </p>
                        <p style={{ fontSize: 12, fontFamily: "'Oswald', sans-serif", color: C.blue, fontWeight: 700, margin: 0 }}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {selectedCandidate.notes && (
                  <div style={{ borderBottom: `1px solid ${C.border}`, paddingBottom: 12 }}>
                    <p style={{ fontSize: 9, fontFamily: "'Oswald', sans-serif", color: C.muted, letterSpacing: 1, margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      NOTES
                    </p>
                    <p style={{ fontSize: 10, fontFamily: "'Oswald', sans-serif", color: C.text, lineHeight: 1.4, margin: 0 }}>
                      {selectedCandidate.notes}
                    </p>
                  </div>
                )}

                {/* Screenshot */}
                {selectedCandidate.trophy_screenshot_url && (
                  <div>
                    <p style={{ fontSize: 9, fontFamily: "'Oswald', sans-serif", color: C.muted, letterSpacing: 1, margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      TROPHY SCREENSHOT
                    </p>
                    <img
                      src={selectedCandidate.trophy_screenshot_url}
                      alt={`${selectedCandidate.player_name} Heisman`}
                      style={{ width: '100%', borderRadius: 4, border: `1px solid ${C.border}`, cursor: 'pointer' }}
                      onClick={() => window.open(selectedCandidate.trophy_screenshot_url, '_blank')}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted, fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: 1 }}>
            ⏳ LOADING...
          </div>
        )}
      </div>
    </div>
  )
}
