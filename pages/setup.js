import { useState, useEffect } from 'react'
import Head from 'next/head'

const C = {
  bg: '#09090b', surface: '#101014', card: '#17171d', border: '#1f1f2e',
  accent: '#c9a84c', green: '#4caf7d', red: '#e05252', blue: '#4a90d9',
  text: '#e8eaed', muted: '#8b949e',
}

const COACHING_STYLES = [
  'Air Raid Offense', 'Pro Style Offense', 'Triple Option', 'Spread Offense',
  'Run Heavy', 'Defensive Minded', 'Balanced', 'Hurry Up No Huddle',
  'West Coast Offense', 'Power Run Game',
]

export default function SetupWizard() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Step 2
  const [health, setHealth] = useState(null)
  const [healthLoading, setHealthLoading] = useState(false)

  // Step 3
  const [leagueName, setLeagueName] = useState('')
  const [leagueSubtitle, setLeagueSubtitle] = useState('')
  const [accentColor, setAccentColor] = useState('#c9a84c')
  const [pin, setPin] = useState('')

  // Step 4
  const [coachName, setCoachName] = useState('')
  const [coachTeam, setCoachTeam] = useState('')
  const [coachGT, setCoachGT] = useState('')
  const [coachStyle, setCoachStyle] = useState('Balanced')

  useEffect(() => {
    if (step === 2 && !health) runHealth()
  }, [step])

  const runHealth = async () => {
    setHealthLoading(true)
    try {
      const r = await fetch('/api/health')
      const d = await r.json()
      setHealth(d)
    } catch { setHealth({ overall: 'error', required: [], optional: [], tables: [] }) }
    setHealthLoading(false)
  }

  const saveLeague = async () => {
    if (!leagueName.trim() || !pin.trim()) return setError('League name and PIN are required')
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/league-settings', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, league_name: leagueName, league_subtitle: leagueSubtitle, accent_color: accentColor }),
      })
      if (!r.ok) throw new Error((await r.json()).error || 'Failed')
      setSuccess('Saved!'); setTimeout(() => { setSuccess(null); setStep(4) }, 800)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const addCoach = async () => {
    if (!coachName.trim() || !coachTeam.trim()) return setError('Name and team are required')
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/coaches', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, coach: { name: coachName, team: coachTeam, username: coachGT, coaching_style: coachStyle, is_commissioner: true } }),
      })
      if (!r.ok) throw new Error((await r.json()).error || 'Failed')
      setSuccess('Coach added!'); setTimeout(() => { setSuccess(null); setStep(5) }, 800)
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  const copyUrl = () => {
    navigator.clipboard.writeText(window.location.origin)
    setSuccess('Copied!'); setTimeout(() => setSuccess(null), 1500)
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px', background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 4, color: C.text, fontSize: 14, boxSizing: 'border-box',
  }
  const btnPrimary = {
    padding: '10px 24px', background: C.accent, color: C.bg, border: 'none', borderRadius: 4,
    fontWeight: 600, fontSize: 14, cursor: 'pointer',
  }
  const btnSecondary = {
    ...btnPrimary, background: C.surface, color: C.text, border: `1px solid ${C.border}`,
  }

  return (
    <>
      <Head>
        <title>Setup — Dynasty Universe</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text, fontFamily: 'system-ui, sans-serif', padding: 20 }}>
        <div style={{ maxWidth: 640, margin: '0 auto', paddingTop: 40 }}>
          {/* Progress */}
          <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginBottom: 8 }}>Step {step} of 5</div>
          <div style={{ height: 6, background: C.surface, borderRadius: 3, marginBottom: 32, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(step / 5) * 100}%`, background: C.accent, transition: 'width 0.3s', borderRadius: 3 }} />
          </div>

          {error && <div style={{ background: C.surface, border: `1px solid ${C.red}`, color: C.red, padding: 12, borderRadius: 4, marginBottom: 16, fontSize: 13 }}>{error}</div>}
          {success && <div style={{ background: C.surface, border: `1px solid ${C.green}`, color: C.green, padding: 12, borderRadius: 4, marginBottom: 16, fontSize: 13 }}>{success}</div>}

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 32 }}>
            {/* Step 1: Welcome */}
            {step === 1 && <>
              <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, marginBottom: 16, marginTop: 0 }}>Welcome to Dynasty Universe</h1>
              <p style={{ color: C.muted, lineHeight: 1.6, marginBottom: 24 }}>This wizard will check your setup and help you get your league running in minutes. You'll configure your league branding and add your first coach profile.</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => { setError(null); setStep(2) }} style={btnPrimary}>Get Started</button>
              </div>
            </>}

            {/* Step 2: Health Check */}
            {step === 2 && <>
              <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, marginBottom: 16, marginTop: 0 }}>System Check</h1>
              {healthLoading ? <p style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Running checks...</p> : health && <>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Required</div>
                  {health.required?.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ color: c.status === 'pass' ? C.green : C.red, fontWeight: 700, width: 20, textAlign: 'center' }}>{c.status === 'pass' ? '✓' : '✕'}</span>
                      <div><div style={{ fontSize: 13 }}>{c.name}</div><div style={{ fontSize: 11, color: C.muted }}>{c.message}</div></div>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Optional</div>
                  {health.optional?.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ color: c.status === 'pass' ? C.green : C.muted, fontWeight: 700, width: 20, textAlign: 'center' }}>{c.status === 'pass' ? '✓' : '—'}</span>
                      <div><div style={{ fontSize: 13 }}>{c.name}</div><div style={{ fontSize: 11, color: C.muted }}>{c.message}</div></div>
                    </div>
                  ))}
                </div>
                {health.connection && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                    <span style={{ color: health.connection.status === 'pass' ? C.green : C.red, fontWeight: 700 }}>{health.connection.status === 'pass' ? '✓' : '✕'}</span>
                    <span style={{ fontSize: 13 }}>{health.connection.message}</span>
                  </div>
                )}
              </>}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button onClick={() => setStep(1)} style={btnSecondary}>Back</button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={runHealth} style={btnSecondary}>Re-check</button>
                  <button onClick={() => setStep(3)} style={btnPrimary}>Next</button>
                </div>
              </div>
            </>}

            {/* Step 3: League Identity */}
            {step === 3 && <>
              <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, marginBottom: 16, marginTop: 0 }}>League Identity</h1>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>League Name *</label>
                <input value={leagueName} onChange={e => setLeagueName(e.target.value)} placeholder="e.g., The Borch Dynasty" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Subtitle</label>
                <input value={leagueSubtitle} onChange={e => setLeagueSubtitle(e.target.value)} placeholder="e.g., Where Legends Are Made" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Accent Color</label>
                <input type="color" value={accentColor} onChange={e => setAccentColor(e.target.value)} style={{ ...inputStyle, height: 40, padding: 4, cursor: 'pointer' }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Commissioner PIN *</label>
                <input type="password" value={pin} onChange={e => setPin(e.target.value)} placeholder="Your PIN from Vercel env vars" style={inputStyle} />
              </div>
              {/* Preview */}
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Preview</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, fontWeight: 700, color: accentColor }}>{leagueName || 'Your League Name'}</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{leagueSubtitle || 'Your subtitle here'}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button onClick={() => setStep(2)} style={btnSecondary}>Back</button>
                <button onClick={saveLeague} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.5 : 1 }}>{loading ? 'Saving...' : 'Save & Next'}</button>
              </div>
            </>}

            {/* Step 4: First Coach */}
            {step === 4 && <>
              <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, marginBottom: 16, marginTop: 0 }}>Add Your Coach</h1>
              <p style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Create your coach profile — you'll be the first member of your dynasty.</p>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>Coach Name *</label>
                <input value={coachName} onChange={e => setCoachName(e.target.value)} placeholder="Your name" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>Team *</label>
                <input value={coachTeam} onChange={e => setCoachTeam(e.target.value)} placeholder="e.g., Alabama" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>Gamertag</label>
                <input value={coachGT} onChange={e => setCoachGT(e.target.value)} placeholder="PSN / Xbox gamertag" style={inputStyle} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>Coaching Style</label>
                <select value={coachStyle} onChange={e => setCoachStyle(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {COACHING_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                <button onClick={() => setStep(3)} style={btnSecondary}>Back</button>
                <button onClick={addCoach} disabled={loading} style={{ ...btnPrimary, opacity: loading ? 0.5 : 1 }}>{loading ? 'Adding...' : 'Add Coach & Finish'}</button>
              </div>
            </>}

            {/* Step 5: Done! */}
            {step === 5 && <>
              <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, marginBottom: 16, marginTop: 0, color: C.accent }}>Your Dynasty is Live!</h1>
              <p style={{ color: C.muted, lineHeight: 1.6, marginBottom: 24 }}>Congratulations! Dynasty Universe is ready. Share the link below with your league members.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                <a href="/" style={{ color: C.accent, textDecoration: 'none', padding: '8px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 14 }}>→ Dashboard</a>
                <a href="/coaches" style={{ color: C.accent, textDecoration: 'none', padding: '8px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 14 }}>→ Coaches</a>
                <a href="/media-center" style={{ color: C.accent, textDecoration: 'none', padding: '8px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 14 }}>→ Media Center</a>
                <a href="/timeline" style={{ color: C.accent, textDecoration: 'none', padding: '8px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 14 }}>→ Dynasty Timeline</a>
                <a href="/stream-watcher" style={{ color: C.accent, textDecoration: 'none', padding: '8px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, fontSize: 14 }}>→ Stream Watcher</a>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: C.muted, marginBottom: 8 }}>Share Your League</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 4, padding: '10px 14px' }}>
                <span style={{ flex: 1, fontSize: 13, color: C.muted, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>{typeof window !== 'undefined' ? window.location.origin : ''}</span>
                <button onClick={copyUrl} style={{ ...btnPrimary, padding: '6px 14px', fontSize: 12 }}>Copy</button>
              </div>
            </>}
          </div>
        </div>
      </div>
    </>
  )
}
