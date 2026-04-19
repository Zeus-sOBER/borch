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
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: C.text, fontFamily: "'Oswald', sans-serif", letterSpacing: 2, margin: 0, marginBottom: 8 }}>🏆 HEISMAN WATCH</h1>
          <p style={{ color: C.muted, fontSize: 13, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, margin: 0 }}>Top 5 candidates competing for college football's most prestigious award</p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: C.red + '22', border: `1px solid ${C.red}66`, color: C.red, padding: 16, borderRadius: 6, marginBottom: 24, fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: 0.5 }}>
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
              padding: '10px 20px',
              borderRadius: 6,
              cursor: 'pointer',
              fontFamily: "'Oswald', sans-serif",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {showForm ? '✕ CANCEL' : '+ ADD CANDIDATE'}
          </button>
        </div>

        {/* Add Form */}
        {showForm && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: 24, borderRadius: 6, marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: C.text, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, margin: '0 0 16px 0' }}>ADD NEW CANDIDATE</h2>
            <form onSubmit={handleAddCandidate}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <input
                  type="text"
                  placeholder="Player Name"
                  required
                  value={formData.player_name}
                  onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: 10, borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}
                />
                <input
                  type="text"
                  placeholder="Position (QB, RB, WR, etc.)"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: 10, borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <input
                  type="number"
                  placeholder="Team ID"
                  required
                  value={formData.team_id}
                  onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: 10, borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}
                />
                <input
                  type="number"
                  placeholder="Coach ID"
                  required
                  value={formData.coach_id}
                  onChange={(e) => setFormData({ ...formData, coach_id: e.target.value })}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: 10, borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <select
                  value={formData.rank}
                  onChange={(e) => setFormData({ ...formData, rank: parseInt(e.target.value) })}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: 10, borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}
                >
                  <option value="1">Rank 1 (Top Contender)</option>
                  <option value="2">Rank 2</option>
                  <option value="3">Rank 3</option>
                  <option value="4">Rank 4</option>
                  <option value="5">Rank 5</option>
                </select>
                <input
                  type="url"
                  placeholder="Trophy Screenshot URL (Google Drive)"
                  value={formData.trophy_screenshot_url}
                  onChange={(e) => setFormData({ ...formData, trophy_screenshot_url: e.target.value })}
                  style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: 10, borderRadius: 4, fontFamily: 'monospace', fontSize: 12 }}
                />
              </div>

              <textarea
                placeholder="Notes/Commentary"
                rows="3"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, color: C.text, padding: 10, borderRadius: 4, fontFamily: 'monospace', fontSize: 12, marginBottom: 12, boxSizing: 'border-box' }}
              />

              <button
                type="submit"
                style={{
                  background: C.green,
                  color: C.bg,
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1,
                  width: '100%',
                }}
              >
                ✓ ADD CANDIDATE
              </button>
            </form>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48, color: C.muted, fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: 1 }}>
            ⏳ LOADING...
          </div>
        )}

        {/* Candidates */}
        {!loading && candidates.length > 0 && (
          <div style={{ display: 'grid', gap: 20 }}>
            {candidates.map((c) => (
              <div
                key={c.id}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderLeft: `4px solid ${C.accent}`,
                  padding: 20,
                  borderRadius: 6,
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 32 }}>{getMedal(c.rank)}</span>
                    <div>
                      <h3 style={{ fontSize: 20, fontWeight: 700, color: C.text, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, margin: 0, marginBottom: 4 }}>
                        {c.player_name} {c.position && `(${c.position})`}
                      </h3>
                      <p style={{ fontSize: 13, color: C.accent, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5, margin: 0, marginBottom: 2 }}>
                        {c.teams?.name || 'TEAM UNKNOWN'}
                      </p>
                      <p style={{ fontSize: 11, color: C.muted, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5, margin: 0 }}>
                        Coach: {c.coaches?.name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(c.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: C.red,
                      cursor: 'pointer',
                      fontSize: 20,
                      padding: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>

                {/* Stats */}
                {c.key_stats && Object.keys(c.key_stats).length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 16, padding: 12, background: C.surface, borderRadius: 4 }}>
                    {Object.entries(c.key_stats).map(([stat, value]) => (
                      <div key={stat}>
                        <p style={{ fontSize: 10, color: C.muted, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, margin: 0, marginBottom: 4, textTransform: 'uppercase' }}>
                          {stat}
                        </p>
                        <p style={{ fontSize: 16, fontWeight: 700, color: C.blue, fontFamily: "'Oswald', sans-serif", margin: 0 }}>
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes */}
                {c.notes && (
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: 12, borderRadius: 4, marginBottom: 16 }}>
                    <p style={{ fontSize: 11, color: C.muted, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5, margin: 0, lineHeight: 1.5 }}>
                      💭 {c.notes}
                    </p>
                  </div>
                )}

                {/* Screenshot */}
                {c.trophy_screenshot_url && (
                  <div>
                    <p style={{ fontSize: 10, color: C.muted, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, margin: '0 0 8px 0', textTransform: 'uppercase' }}>
                      Heisman Trophy Screenshot
                    </p>
                    <img
                      src={c.trophy_screenshot_url}
                      alt={`${c.player_name} Heisman Trophy`}
                      style={{
                        maxHeight: 200,
                        borderRadius: 4,
                        border: `1px solid ${C.border}`,
                        cursor: 'pointer',
                      }}
                      onClick={() => window.open(c.trophy_screenshot_url, '_blank')}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && candidates.length === 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, padding: 48, borderRadius: 6, textAlign: 'center' }}>
            <p style={{ fontSize: 20, color: C.text, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, margin: '0 0 16px 0' }}>
              🏆 NO CANDIDATES YET
            </p>
            <p style={{ fontSize: 12, color: C.muted, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5, margin: 0 }}>
              Start adding players to the Heisman Trophy Watch
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
