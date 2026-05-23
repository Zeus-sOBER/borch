import { useState, useEffect } from 'react'
import Head from 'next/head'

const C = {
  bg: '#09090b', surface: '#101014', card: '#17171d', border: '#1f1f2e',
  accent: '#c9a84c', green: '#4caf7d', red: '#e05252', blue: '#4a90d9',
  text: '#e8eaed', muted: '#8b949e',
}

const GAME_TYPES = [
  { value: 'regular',                label: 'Regular Season' },
  { value: 'conference_championship', label: 'Conference Championship' },
  { value: 'bowl',                   label: 'Bowl Game' },
  { value: 'cfp_first_round',        label: 'CFP First Round' },
  { value: 'cfp_quarterfinal',       label: 'CFP Quarterfinal' },
  { value: 'cfp_semifinal',          label: 'CFP Semifinal' },
  { value: 'national_championship',  label: 'National Championship' },
]

const inputStyle = {
  width: '100%', padding: '10px 12px', background: C.surface,
  border: `1px solid ${C.border}`, borderRadius: 4, color: C.text,
  fontSize: 14, boxSizing: 'border-box',
}
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6,
  textTransform: 'uppercase', letterSpacing: 0.8, color: C.muted,
}
const btnPrimary = {
  padding: '11px 28px', background: C.accent, color: C.bg, border: 'none',
  borderRadius: 4, fontWeight: 700, fontSize: 14, cursor: 'pointer',
}
const btnSecondary = {
  ...btnPrimary, background: C.surface, color: C.text, border: `1px solid ${C.border}`,
}

export default function ScheduleSubmit() {
  const [teams, setTeams]     = useState([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError]     = useState(null)

  // Form state
  const [week, setWeek]           = useState('')
  const [homeTeam, setHomeTeam]   = useState('')
  const [awayTeam, setAwayTeam]   = useState('')
  const [isFinal, setIsFinal]     = useState(false)
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [gameType, setGameType]   = useState('regular')
  const [notes, setNotes]         = useState('')

  // Recent submissions shown in session
  const [submitted, setSubmitted] = useState([])

  useEffect(() => {
    fetch('/api/coaches')
      .then(r => r.json())
      .then(d => {
        const list = (d.coaches || d || []).map(c => c.team).filter(Boolean).sort()
        setTeams(list)
      })
      .catch(() => {})
  }, [])

  const reset = () => {
    setWeek(''); setHomeTeam(''); setAwayTeam('')
    setIsFinal(false); setHomeScore(''); setAwayScore('')
    setGameType('regular'); setNotes('')
  }

  const submit = async () => {
    setError(null)
    if (!week.trim() || isNaN(Number(week))) return setError('Week is required')
    if (!homeTeam) return setError('Home team is required')
    if (!awayTeam) return setError('Away team is required')
    if (homeTeam === awayTeam) return setError('Home and away teams must be different')
    if (isFinal && (homeScore === '' || awayScore === '')) return setError('Both scores are required for a finalized game')

    setLoading(true)
    try {
      const r = await fetch('/api/submit-game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week:       Number(week),
          home_team:  homeTeam,
          away_team:  awayTeam,
          is_final:   isFinal,
          home_score: isFinal ? Number(homeScore) : null,
          away_score: isFinal ? Number(awayScore) : null,
          game_type:  gameType,
          notes:      notes.trim() || null,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'Submission failed')

      const entry = {
        week: Number(week), homeTeam, awayTeam, isFinal,
        homeScore: isFinal ? Number(homeScore) : null,
        awayScore: isFinal ? Number(awayScore) : null,
        gameType, notes: notes.trim() || null,
      }
      setSubmitted(prev => [entry, ...prev])
      setSuccess(`Game submitted: ${awayTeam} @ ${homeTeam} — Week ${week}`)
      setTimeout(() => setSuccess(null), 4000)
      reset()
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const winner = isFinal && homeScore !== '' && awayScore !== ''
    ? Number(homeScore) > Number(awayScore) ? homeTeam
    : Number(awayScore) > Number(homeScore) ? awayTeam
    : 'Tie'
    : null

  return (
    <>
      <Head>
        <title>Submit Game — Dynasty Universe</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui, sans-serif', padding: '20px 16px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', paddingTop: 32 }}>

          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <a href="/" style={{ fontSize: 11, color: C.muted, textDecoration: 'none', letterSpacing: 1, textTransform: 'uppercase' }}>← Dashboard</a>
            <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, margin: '10px 0 4px', color: C.accent }}>Submit Game</h1>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>Enter your scheduled game or post a final result.</p>
          </div>

          {error && (
            <div style={{ background: C.surface, border: `1px solid ${C.red}`, color: C.red, padding: '10px 14px', borderRadius: 4, marginBottom: 16, fontSize: 13 }}>
              {error}
            </div>
          )}
          {success && (
            <div style={{ background: C.surface, border: `1px solid ${C.green}`, color: C.green, padding: '10px 14px', borderRadius: 4, marginBottom: 16, fontSize: 13 }}>
              ✓ {success}
            </div>
          )}

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 28 }}>

            {/* Week + Game Type row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14, marginBottom: 18 }}>
              <div>
                <label style={labelStyle}>Week *</label>
                <input
                  type="number" min="0" max="20" value={week}
                  onChange={e => setWeek(e.target.value)}
                  placeholder="e.g. 5"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Game Type</label>
                <select value={gameType} onChange={e => setGameType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {GAME_TYPES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
            </div>

            {/* Away team */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Away Team *</label>
              {teams.length > 0 ? (
                <select value={awayTeam} onChange={e => setAwayTeam(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">— Select away team —</option>
                  {teams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : (
                <input value={awayTeam} onChange={e => setAwayTeam(e.target.value)} placeholder="Away team name" style={inputStyle} />
              )}
            </div>

            {/* Home team */}
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Home Team *</label>
              {teams.length > 0 ? (
                <select value={homeTeam} onChange={e => setHomeTeam(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="">— Select home team —</option>
                  {teams.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : (
                <input value={homeTeam} onChange={e => setHomeTeam(e.target.value)} placeholder="Home team name" style={inputStyle} />
              )}
            </div>

            {/* Matchup preview */}
            {awayTeam && homeTeam && awayTeam !== homeTeam && (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '10px 14px', marginBottom: 18, fontSize: 13, textAlign: 'center', color: C.muted }}>
                <span style={{ color: C.text, fontWeight: 600 }}>{awayTeam}</span>
                <span style={{ margin: '0 10px', color: C.accent }}>@</span>
                <span style={{ color: C.text, fontWeight: 600 }}>{homeTeam}</span>
                {week && <span style={{ marginLeft: 12, fontSize: 11, color: C.muted }}>Week {week}</span>}
              </div>
            )}

            {/* Final result toggle */}
            <div style={{ marginBottom: isFinal ? 18 : 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <div
                  onClick={() => setIsFinal(p => !p)}
                  style={{
                    width: 40, height: 22, borderRadius: 11, background: isFinal ? C.accent : C.border,
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer',
                  }}
                >
                  <div style={{
                    position: 'absolute', top: 3, left: isFinal ? 21 : 3, width: 16, height: 16,
                    borderRadius: '50%', background: isFinal ? C.bg : C.muted, transition: 'left 0.2s',
                  }} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: isFinal ? C.accent : C.text }}>
                  {isFinal ? 'Final Result' : 'Schedule Only (no score yet)'}
                </span>
              </label>
            </div>

            {/* Score inputs */}
            {isFinal && (
              <div style={{ marginBottom: 22 }}>
                <label style={labelStyle}>Final Score *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textAlign: 'center' }}>{awayTeam || 'Away'}</div>
                    <input
                      type="number" min="0" value={awayScore}
                      onChange={e => setAwayScore(e.target.value)}
                      placeholder="0"
                      style={{ ...inputStyle, textAlign: 'center', fontSize: 22, fontWeight: 700, padding: '12px 8px' }}
                    />
                  </div>
                  <div style={{ color: C.muted, fontWeight: 700, fontSize: 18, paddingTop: 22 }}>–</div>
                  <div>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textAlign: 'center' }}>{homeTeam || 'Home'}</div>
                    <input
                      type="number" min="0" value={homeScore}
                      onChange={e => setHomeScore(e.target.value)}
                      placeholder="0"
                      style={{ ...inputStyle, textAlign: 'center', fontSize: 22, fontWeight: 700, padding: '12px 8px' }}
                    />
                  </div>
                </div>
                {winner && (
                  <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: C.green }}>
                    {winner === 'Tie' ? 'Tie game' : `${winner} wins`}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Notes / Bowl Name</label>
              <input
                value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Rose Bowl, Rivalry Game, …"
                style={inputStyle}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={reset} style={btnSecondary} disabled={loading}>Clear</button>
              <button onClick={submit} style={{ ...btnPrimary, opacity: loading ? 0.6 : 1 }} disabled={loading}>
                {loading ? 'Submitting…' : isFinal ? 'Post Final Result' : 'Schedule Game'}
              </button>
            </div>
          </div>

          {/* Recent submissions */}
          {submitted.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.muted, marginBottom: 12 }}>
                Submitted This Session
              </div>
              {submitted.map((g, i) => (
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {g.awayTeam} @ {g.homeTeam}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                      Week {g.week} · {GAME_TYPES.find(t => t.value === g.gameType)?.label ?? g.gameType}
                      {g.notes ? ` · ${g.notes}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {g.isFinal ? (
                      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, color: C.accent }}>
                        {g.awayScore} – {g.homeScore}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: C.muted, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 3, padding: '3px 8px' }}>
                        Scheduled
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  )
}
