// pages/coaches.js
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
  purple:  '#9b6dff',
  orange:  '#ff8c42',
  text:    '#e8eaed',
  muted:   '#8b949e',
  subtle:  '#2a2a3a',
}

const ACHIEVEMENT_ICONS = {
  championship:   '🏆',
  conference:     '🥇',
  bowl:           '🏟️',
  undefeated:     '💎',
  recruiting:     '🎯',
  upset:          '😱',
  record:         '📈',
  mvp:            '⭐',
  custom:         '📌',
}

const COACHING_STYLES = [
  'Air Raid Offense', 'Pro Style Offense', 'Triple Option', 'Spread Offense',
  'Run Heavy', 'Defensive Minded', 'Balanced', 'Hurry Up No Huddle',
  'West Coast Offense', 'Power Run Game',
]

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
    <div onClick={onClick} style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 10, padding: 20,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'border-color 0.2s',
      ...style,
    }}
    onMouseEnter={onClick ? e => e.currentTarget.style.borderColor = C.accent + '66' : null}
    onMouseLeave={onClick ? e => e.currentTarget.style.borderColor = C.border : null}
    >{children}</div>
  )
}

function Input({ label, value, onChange, placeholder, type = 'text', disabled, textarea }) {
  const shared = {
    width: '100%', background: C.surface,
    border: `1px solid ${C.border}`, borderRadius: 6,
    padding: '10px 12px', color: disabled ? C.muted : C.text,
    fontSize: 14, fontFamily: "'Lato', sans-serif",
    outline: 'none', resize: textarea ? 'vertical' : 'none',
    opacity: disabled ? 0.6 : 1,
  }
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ color: C.muted, fontSize: 11, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</label>}
      {textarea
        ? <textarea value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} rows={3} style={shared} />
        : <input type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} style={shared} />
      }
    </div>
  )
}

function Btn({ children, onClick, color = C.accent, disabled, outline, small, fullWidth }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: outline ? 'transparent' : disabled ? C.subtle : color,
      color: outline ? color : disabled ? C.muted : color === C.accent ? '#000' : '#fff',
      border: `1px solid ${disabled ? C.border : color}`,
      borderRadius: 6, padding: small ? '6px 14px' : '10px 20px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: "'Oswald', sans-serif", fontSize: small ? 12 : 14,
      letterSpacing: 0.5, textTransform: 'uppercase',
      width: fullWidth ? '100%' : 'auto',
      transition: 'all 0.15s', whiteSpace: 'nowrap',
    }}>{children}</button>
  )
}

// ── Win % calc ─────────────────────────────────────────────────
function winPct(w, l) {
  const total = (w || 0) + (l || 0)
  if (!total) return '—'
  return ((w / total) * 100).toFixed(1) + '%'
}

// ── Coach Card (summary view) ──────────────────────────────────
function CoachCard({ coach, onSelect, isCommissioner }) {
  const achievements = coach.achievements || []
  const latestSeason = (coach.season_records || []).slice(-1)[0]
  const accentColor  = coach.team_color || C.accent

  return (
    <Card onClick={() => onSelect(coach)} style={{ position: 'relative', borderColor: coach.team_color ? coach.team_color + '55' : C.border }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
            {coach.is_commissioner && <Badge color={C.accent}>Commissioner</Badge>}
            {!coach.is_active && <Badge color={C.red}>Inactive</Badge>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {coach.mascot_emoji && (
              <span style={{
                fontSize: 32, lineHeight: 1,
                background: accentColor + '22',
                border: `1px solid ${accentColor}44`,
                borderRadius: 8, padding: '4px 8px',
                flexShrink: 0,
              }}>{coach.mascot_emoji}</span>
            )}
            <div>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, fontWeight: 700, color: C.text, lineHeight: 1 }}>{coach.name}</div>
              <div style={{ color: accentColor, fontSize: 13, marginTop: 4 }}>{coach.team || 'No team assigned'}</div>
              {coach.username && <div style={{ color: C.muted, fontSize: 12 }}>@{coach.username}</div>}
            </div>
          </div>
        </div>
        {/* Overall record */}
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, color: C.text, lineHeight: 1 }}>
            <span style={{ color: C.green }}>{coach.overall_wins}</span>
            <span style={{ color: C.muted }}> – </span>
            <span style={{ color: C.red }}>{coach.overall_losses}</span>
          </div>
          <div style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 }}>All-Time</div>
          <div style={{ color: accentColor, fontSize: 13, marginTop: 2 }}>{winPct(coach.overall_wins, coach.overall_losses)}</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
        <div>
          <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Seasons</div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, color: C.text }}>{coach.seasons_coached}</div>
        </div>
        {coach.coaching_style && (
          <div>
            <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>Style</div>
            <div style={{ fontSize: 13, color: C.text }}>{coach.coaching_style}</div>
          </div>
        )}
        {latestSeason && (
          <div>
            <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>S{latestSeason.season}</div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, color: C.text }}>
              <span style={{ color: C.green }}>{latestSeason.wins}</span>–<span style={{ color: C.red }}>{latestSeason.losses}</span>
            </div>
          </div>
        )}
      </div>

      {/* Achievements strip */}
      {achievements.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {achievements.slice(0, 5).map((a, i) => (
            <span key={i} title={a.description} style={{
              background: C.accent + '15', border: `1px solid ${C.accent}33`,
              borderRadius: 4, padding: '3px 8px', fontSize: 12,
            }}>
              {ACHIEVEMENT_ICONS[a.type] || '📌'} {a.title}
            </span>
          ))}
          {achievements.length > 5 && (
            <span style={{ color: C.muted, fontSize: 12, padding: '3px 4px' }}>+{achievements.length - 5} more</span>
          )}
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 14, right: 16, color: C.muted, fontSize: 12 }}>
        Click to view →
      </div>
    </Card>
  )
}

// ── Achievement editor ─────────────────────────────────────────
function AchievementEditor({ achievements = [], onChange }) {
  const [adding, setAdding] = useState(false)
  const [newA, setNewA] = useState({ type: 'championship', title: '', description: '', season: 1 })

  const add = () => {
    if (!newA.title.trim()) return
    onChange([...achievements, { ...newA, id: Date.now() }])
    setNewA({ type: 'championship', title: '', description: '', season: 1 })
    setAdding(false)
  }

  const remove = (id) => onChange(achievements.filter(a => a.id !== id))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <label style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Achievements & Trophies</label>
        <Btn small outline onClick={() => setAdding(!adding)}>+ Add</Btn>
      </div>

      {adding && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={{ color: C.muted, fontSize: 11, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Type</label>
              <select value={newA.type} onChange={e => setNewA({ ...newA, type: e.target.value })} style={{
                width: '100%', background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 6, padding: '8px 10px', color: C.text, fontSize: 13,
              }}>
                {Object.keys(ACHIEVEMENT_ICONS).map(k => (
                  <option key={k} value={k}>{ACHIEVEMENT_ICONS[k]} {k.charAt(0).toUpperCase() + k.slice(1)}</option>
                ))}
              </select>
            </div>
            <Input label="Season #" type="number" value={newA.season}
              onChange={e => setNewA({ ...newA, season: Number(e.target.value) })} />
          </div>
          <Input label="Title (e.g. National Champion)" value={newA.title}
            onChange={e => setNewA({ ...newA, title: e.target.value })} placeholder="National Champion" />
          <Input label="Description (optional)" value={newA.description}
            onChange={e => setNewA({ ...newA, description: e.target.value })} placeholder="Went 15-0, beat Alabama in the CFP Final" />
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn small onClick={add}>Save Achievement</Btn>
            <Btn small outline color={C.muted} onClick={() => setAdding(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {achievements.length === 0 && !adding && (
        <div style={{ color: C.muted, fontSize: 13 }}>No achievements yet.</div>
      )}

      <div style={{ display: 'grid', gap: 6 }}>
        {achievements.map((a, i) => (
          <div key={a.id || i} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: C.surface, borderRadius: 6, padding: '8px 12px',
            border: `1px solid ${C.border}`,
          }}>
            <span style={{ fontSize: 20 }}>{ACHIEVEMENT_ICONS[a.type] || '📌'}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{a.title}</div>
              {a.description && <div style={{ color: C.muted, fontSize: 12 }}>{a.description}</div>}
              {a.season && <Badge color={C.blue}>Season {a.season}</Badge>}
            </div>
            <button onClick={() => remove(a.id || i)} style={{
              background: 'transparent', border: 'none', color: C.red,
              cursor: 'pointer', fontSize: 16, padding: 4,
            }}>×</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Season record editor ───────────────────────────────────────
function SeasonRecordEditor({ records = [], onChange }) {
  const [newR, setNewR] = useState({ season: records.length + 1, wins: 0, losses: 0, finish: '' })
  const [adding, setAdding] = useState(false)

  const add = () => {
    onChange([...records, { ...newR, id: Date.now() }])
    setNewR({ season: records.length + 2, wins: 0, losses: 0, finish: '' })
    setAdding(false)
  }

  const remove = (id) => onChange(records.filter(r => r.id !== id))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <label style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Season-by-Season Records</label>
        <Btn small outline onClick={() => setAdding(!adding)}>+ Add Season</Btn>
      </div>

      {adding && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, marginBottom: 10 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            <Input label="Season" type="number" value={newR.season} onChange={e => setNewR({ ...newR, season: Number(e.target.value) })} />
            <Input label="Wins" type="number" value={newR.wins} onChange={e => setNewR({ ...newR, wins: Number(e.target.value) })} />
            <Input label="Losses" type="number" value={newR.losses} onChange={e => setNewR({ ...newR, losses: Number(e.target.value) })} />
          </div>
          <Input label="Season Finish (e.g. CFP Runner-Up, 8-4 Bowl Win)" value={newR.finish}
            onChange={e => setNewR({ ...newR, finish: e.target.value })} placeholder="e.g. National Champion" />
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn small onClick={add}>Save Season</Btn>
            <Btn small outline color={C.muted} onClick={() => setAdding(false)}>Cancel</Btn>
          </div>
        </div>
      )}

      {records.length === 0 && !adding && (
        <div style={{ color: C.muted, fontSize: 13 }}>No seasons recorded yet.</div>
      )}

      <div style={{ display: 'grid', gap: 6 }}>
        {[...records].reverse().map((r, i) => (
          <div key={r.id || i} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: C.surface, borderRadius: 6, padding: '10px 14px',
            border: `1px solid ${C.border}`,
          }}>
            <Badge color={C.blue}>S{r.season}</Badge>
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, color: C.text }}>
              <span style={{ color: C.green }}>{r.wins}</span>–<span style={{ color: C.red }}>{r.losses}</span>
            </span>
            <span style={{ color: C.accent, fontSize: 12 }}>{winPct(r.wins, r.losses)}</span>
            {r.finish && <span style={{ color: C.muted, fontSize: 13, flex: 1 }}>{r.finish}</span>}
            <button onClick={() => remove(r.id || i)} style={{
              background: 'transparent', border: 'none', color: C.red, cursor: 'pointer', fontSize: 16, padding: 4,
            }}>×</button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Coach detail / edit modal ──────────────────────────────────
function CoachDetail({ coach, teams = [], isCommissioner, pin, onSave, onClose }) {
  const [editing, setEditing]   = useState(false)
  const [saving,  setSaving]    = useState(false)
  const [form,    setForm]      = useState({ ...coach })
  const [error,   setError]     = useState(null)

  // Auto-link team_id if coach has a team name but no team_id yet
  useEffect(() => {
    if (form.team && !form.team_id && teams.length > 0) {
      const match = teams.find(t => (t.name || '').toLowerCase() === form.team.toLowerCase())
      if (match) setForm(f => ({ ...f, team_id: match.id }))
    }
  }, [teams])

  const field = (key) => ({
    value: form[key] ?? '',
    onChange: e => setForm(f => ({ ...f, [key]: e.target.value })),
  })

  const save = async () => {
    setSaving(true)
    setError(null)

    // Auto-compute overall record from season records
    const records = form.season_records || []
    const totalW = records.reduce((s, r) => s + (r.wins || 0), 0)
    const totalL = records.reduce((s, r) => s + (r.losses || 0), 0)

    const payload = {
      ...form,
      overall_wins: totalW || form.overall_wins,
      overall_losses: totalL || form.overall_losses,
      seasons_coached: records.length || form.seasons_coached,
      pin,
    }

    try {
      const res = await fetch(`/api/coaches/${coach.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setSaving(false); return }
      onSave(data.coach)
      setEditing(false)
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  const deactivate = async () => {
    if (!confirm(`Remove ${coach.name} from active roster? They'll still appear in history.`)) return
    await fetch(`/api/coaches/${coach.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    onClose(true)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000000cc',
      zIndex: 200, display: 'flex', alignItems: 'flex-start',
      justifyContent: 'center', padding: '40px 20px', overflowY: 'auto',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 12, width: '100%', maxWidth: 700,
        padding: 28, position: 'relative',
      }}>
        {/* Close */}
        <button onClick={() => onClose()} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'transparent', border: 'none',
          color: C.muted, fontSize: 22, cursor: 'pointer',
        }}>×</button>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, paddingRight: 40 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            {form.mascot_emoji && (
              <div style={{
                fontSize: 48, lineHeight: 1,
                background: (form.team_color || C.accent) + '22',
                border: `1px solid ${(form.team_color || C.accent)}44`,
                borderRadius: 12, padding: '10px 14px',
                flexShrink: 0,
              }}>{form.mascot_emoji}</div>
            )}
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                {form.is_commissioner && <Badge color={C.accent}>Commissioner</Badge>}
                {!form.is_active && <Badge color={C.red}>Inactive</Badge>}
              </div>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, fontWeight: 700, color: C.text }}>{form.name}</div>
              <div style={{ color: form.team_color || C.accent, fontSize: 15 }}>{form.team}</div>
              {form.username && <div style={{ color: C.muted, fontSize: 13 }}>@{form.username}</div>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 36, color: C.text, lineHeight: 1 }}>
              <span style={{ color: C.green }}>{form.overall_wins}</span>
              <span style={{ color: C.muted }}> – </span>
              <span style={{ color: C.red }}>{form.overall_losses}</span>
            </div>
            <div style={{ color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Overall Record</div>
            <div style={{ color: C.accent, fontSize: 15 }}>{winPct(form.overall_wins, form.overall_losses)}</div>
          </div>
        </div>

        {/* Read view */}
        {!editing && (
          <div>
            {form.bio && (
              <div style={{ color: C.text, fontSize: 14, lineHeight: 1.7, marginBottom: 20, padding: '14px 16px', background: C.surface, borderRadius: 8, borderLeft: `3px solid ${C.accent}` }}>
                {form.bio}
              </div>
            )}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
              {form.coaching_style && <div><div style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Style</div><div style={{ color: C.text, fontSize: 14 }}>{form.coaching_style}</div></div>}
              {form.alma_mater    && <div><div style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Alma Mater</div><div style={{ color: C.text, fontSize: 14 }}>{form.alma_mater}</div></div>}
              {form.hire_date     && <div><div style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Joined Dynasty</div><div style={{ color: C.text, fontSize: 14 }}>{new Date(form.hire_date).toLocaleDateString()}</div></div>}
              <div><div style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>Seasons</div><div style={{ color: C.text, fontSize: 14 }}>{form.seasons_coached}</div></div>
            </div>

            {/* Achievements */}
            {(form.achievements || []).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Achievements & Trophies</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(form.achievements || []).map((a, i) => (
                    <div key={i} style={{
                      background: C.accent + '15', border: `1px solid ${C.accent}33`,
                      borderRadius: 6, padding: '8px 12px', fontSize: 13,
                    }}>
                      <div>{ACHIEVEMENT_ICONS[a.type] || '📌'} <strong style={{ color: C.text }}>{a.title}</strong></div>
                      {a.description && <div style={{ color: C.muted, fontSize: 12 }}>{a.description}</div>}
                      {a.season && <Badge color={C.blue}>Season {a.season}</Badge>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Season records */}
            {(form.season_records || []).length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Season Records</div>
                <div style={{ display: 'grid', gap: 6 }}>
                  {[...(form.season_records || [])].reverse().map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '8px 12px', background: C.surface, borderRadius: 6 }}>
                      <Badge color={C.blue}>S{r.season}</Badge>
                      <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18 }}>
                        <span style={{ color: C.green }}>{r.wins}</span>–<span style={{ color: C.red }}>{r.losses}</span>
                      </span>
                      <span style={{ color: C.accent, fontSize: 13 }}>{winPct(r.wins, r.losses)}</span>
                      {r.finish && <span style={{ color: C.muted, fontSize: 13 }}>{r.finish}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isCommissioner && (
              <div style={{ display: 'flex', gap: 8, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
                <Btn onClick={() => setEditing(true)}>✏️ Edit Profile</Btn>
                {form.is_active && <Btn outline color={C.red} onClick={deactivate}>Remove Coach</Btn>}
              </div>
            )}
          </div>
        )}

        {/* Edit form */}
        {editing && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input label="Coach Name" {...field('name')} />
              <div>
                <label style={{ color: C.muted, fontSize: 11, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>Current Team</label>
                <select
                  value={form.team_id || ''}
                  onChange={e => {
                    const id = e.target.value ? Number(e.target.value) : null
                    const t  = teams.find(t => t.id === id)
                    setForm(f => ({ ...f, team_id: id, team: t?.name || f.team }))
                  }}
                  style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', color: C.text, fontSize: 14 }}
                >
                  <option value="">— select team —</option>
                  {teams.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {form.team && !form.team_id && (
                  <div style={{ color: C.accent, fontSize: 11, marginTop: 4 }}>Currently: {form.team} (not linked by ID yet)</div>
                )}
              </div>
              <Input label="Gamertag / Username" {...field('username')} placeholder="@handle" />
              <Input label="Joined Dynasty (date)" type="date" {...field('hire_date')} />
              <Input label="Alma Mater (fav real school)" {...field('alma_mater')} placeholder="e.g. Alabama" />
              <div>
                <label style={{ color: C.muted, fontSize: 11, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>Coaching Style</label>
                <select value={form.coaching_style || ''} onChange={e => setForm(f => ({ ...f, coaching_style: e.target.value }))} style={{
                  width: '100%', background: C.surface, border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: '10px 12px', color: C.text, fontSize: 14,
                }}>
                  <option value="">Select style...</option>
                  {COACHING_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Mascot + Team Color */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 }}>
              <div>
                <label style={{ color: C.muted, fontSize: 11, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>Mascot Emoji</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={form.mascot_emoji || ''}
                    onChange={e => setForm(f => ({ ...f, mascot_emoji: e.target.value }))}
                    placeholder="🐊"
                    maxLength={4}
                    style={{
                      width: 60, background: C.surface, border: `1px solid ${C.border}`,
                      borderRadius: 6, padding: '10px 8px', color: C.text,
                      fontSize: 22, textAlign: 'center', outline: 'none',
                    }}
                  />
                  <div style={{ color: C.muted, fontSize: 12 }}>Paste any emoji to represent your team mascot</div>
                </div>
              </div>
              <div>
                <label style={{ color: C.muted, fontSize: 11, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>Team Color</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="color"
                    value={form.team_color || '#c9a84c'}
                    onChange={e => setForm(f => ({ ...f, team_color: e.target.value }))}
                    style={{
                      width: 44, height: 42, padding: 2, cursor: 'pointer',
                      background: C.surface, border: `1px solid ${C.border}`,
                      borderRadius: 6, outline: 'none',
                    }}
                  />
                  <input
                    type="text"
                    value={form.team_color || ''}
                    onChange={e => setForm(f => ({ ...f, team_color: e.target.value }))}
                    placeholder="#003087"
                    style={{
                      flex: 1, background: C.surface, border: `1px solid ${C.border}`,
                      borderRadius: 6, padding: '10px 12px', color: C.text,
                      fontSize: 13, outline: 'none', fontFamily: 'monospace',
                    }}
                  />
                </div>
              </div>
            </div>

            <Input label="Bio / Coach Profile" textarea {...field('bio')} placeholder="Write a short bio or coaching philosophy..." />

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginTop: 4, marginBottom: 16 }}>
              <SeasonRecordEditor
                records={form.season_records || []}
                onChange={records => setForm(f => ({ ...f, season_records: records }))}
              />
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, marginBottom: 16 }}>
              <AchievementEditor
                achievements={form.achievements || []}
                onChange={achievements => setForm(f => ({ ...f, achievements }))}
              />
            </div>

            {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>❌ {error}</div>}

            <div style={{ display: 'flex', gap: 8 }}>
              <Btn onClick={save} disabled={saving}>{saving ? 'Saving...' : '💾 Save Changes'}</Btn>
              <Btn outline color={C.muted} onClick={() => { setForm({ ...coach }); setEditing(false) }}>Cancel</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Add coach form ─────────────────────────────────────────────
function AddCoachForm({ pin, teams = [], onAdd, onClose }) {
  const [form, setForm]   = useState({ name: '', team: '', team_id: null, username: '', coaching_style: '', alma_mater: '', bio: '', hire_date: '', is_active: true, is_commissioner: false, overall_wins: 0, overall_losses: 0, seasons_coached: 1, achievements: [], season_records: [] })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const field = (key) => ({ value: form[key] ?? '', onChange: e => setForm(f => ({ ...f, [key]: e.target.value })) })

  const save = async () => {
    if (!form.name.trim()) { setError('Coach name is required'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/coaches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, coach: form }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setSaving(false); return }
      onAdd(data.coach)
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000cc', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, width: '100%', maxWidth: 560, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, color: C.text, marginBottom: 20, letterSpacing: 1 }}>ADD NEW COACH</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <Input label="Coach Name *" {...field('name')} />
          <div>
            <label style={{ color: C.muted, fontSize: 11, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>Team</label>
            <select
              value={form.team_id || ''}
              onChange={e => {
                const id = e.target.value ? Number(e.target.value) : null
                const t  = teams.find(t => t.id === id)
                setForm(f => ({ ...f, team_id: id, team: t?.name || '' }))
              }}
              style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', color: C.text, fontSize: 14 }}
            >
              <option value="">— select team —</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <Input label="Gamertag" {...field('username')} />
          <Input label="Joined Dynasty" type="date" {...field('hire_date')} />
          <Input label="Alma Mater" {...field('alma_mater')} />
          <div>
            <label style={{ color: C.muted, fontSize: 11, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>Coaching Style</label>
            <select value={form.coaching_style} onChange={e => setForm(f => ({ ...f, coaching_style: e.target.value }))} style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 12px', color: C.text, fontSize: 14 }}>
              <option value="">Select...</option>
              {COACHING_STYLES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <Input label="Bio" textarea {...field('bio')} placeholder="Short coaching bio or philosophy..." />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <input type="checkbox" checked={form.is_commissioner} onChange={e => setForm(f => ({ ...f, is_commissioner: e.target.checked }))} id="isComm" />
          <label htmlFor="isComm" style={{ color: C.muted, fontSize: 13 }}>Mark as Commissioner</label>
        </div>
        {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>❌ {error}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={save} disabled={saving}>{saving ? 'Adding...' : '+ Add Coach'}</Btn>
          <Btn outline color={C.muted} onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </div>
  )
}

// ── Commissioner PIN gate ──────────────────────────────────────
function PinGate({ onUnlock }) {
  const [val, setVal] = useState('')
  const [err, setErr] = useState(false)

  const check = async () => {
    // Quick check: try fetching something that requires the pin
    const res = await fetch('/api/coaches/0', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: val }),
    })
    // 403 = wrong pin, anything else means pin was accepted by server
    if (res.status === 403) { setErr(true); return }
    onUnlock(val)
  }

  return (
    <Card style={{ maxWidth: 360, margin: '60px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>🔐</div>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, color: C.text, marginBottom: 6, letterSpacing: 1 }}>COMMISSIONER MODE</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Enter your commissioner PIN to edit profiles</div>
      <input
        type="password" value={val}
        onChange={e => { setVal(e.target.value); setErr(false) }}
        onKeyDown={e => e.key === 'Enter' && check()}
        placeholder="Enter PIN"
        style={{ width: '100%', background: C.surface, border: `1px solid ${err ? C.red : C.border}`, borderRadius: 6, padding: '10px 14px', color: C.text, fontSize: 16, textAlign: 'center', outline: 'none', marginBottom: err ? 6 : 16 }}
      />
      {err && <div style={{ color: C.red, fontSize: 12, marginBottom: 12 }}>Incorrect PIN</div>}
      <Btn fullWidth onClick={check}>Unlock</Btn>
    </Card>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function CoachesPage() {
  const [coaches,     setCoaches]     = useState([])
  const [teams,       setTeams]       = useState([])   // all teams from DB
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState(null)
  const [showAdd,     setShowAdd]     = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [commPin,     setCommPin]     = useState(null)
  const [showPinGate, setShowPinGate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [coachRes, teamRes] = await Promise.all([
      fetch('/api/coaches'),
      fetch('/api/league-data'),
    ])
    const coachData = await coachRes.json()
    const teamData  = await teamRes.json()
    setCoaches(coachData.coaches || [])
    setTeams(teamData.teams || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Persist pin in session
  useEffect(() => {
    const p = sessionStorage.getItem('dynasty_comm_pin')
    if (p) setCommPin(p)
  }, [])

  const unlock = (pin) => {
    setCommPin(pin)
    sessionStorage.setItem('dynasty_comm_pin', pin)
    setShowPinGate(false)
  }

  const handleSave = (updated) => {
    setCoaches(cs => cs.map(c => c.id === updated.id ? updated : c))
    setSelected(updated)
  }

  const handleAdd = (coach) => {
    setCoaches(cs => [...cs, coach])
    setShowAdd(false)
  }

  const handleClose = (refresh) => {
    setSelected(null)
    if (refresh) load()
  }

  const active   = coaches.filter(c => c.is_active)
  const inactive = coaches.filter(c => !c.is_active)
  const shown    = showInactive ? coaches : active

  // Summary stats
  const totalGames = coaches.reduce((s, c) => s + (c.overall_wins || 0) + (c.overall_losses || 0), 0)
  const topWins    = coaches.reduce((best, c) => c.overall_wins > (best?.overall_wins || 0) ? c : best, null)

  return (
    <>
      <Head>
        <title>Coaches · Dynasty Universe</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
      </Head>
      <style>{`* { box-sizing:border-box; } body { margin:0; background:${C.bg}; font-family:'Lato',sans-serif; color:${C.text}; } ::-webkit-scrollbar{width:6px;} ::-webkit-scrollbar-track{background:${C.surface};} ::-webkit-scrollbar-thumb{background:${C.subtle};border-radius:3px;}`}</style>

      {/* Nav */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 24px' }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 20 }}>
          <a href="/" style={{ textDecoration: 'none', padding: '16px 0', borderRight: `1px solid ${C.border}`, paddingRight: 20, marginRight: 4 }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 2, color: C.accent, lineHeight: 1 }}>DYNASTY</div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, letterSpacing: 5, color: C.muted }}>UNIVERSE</div>
          </a>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, color: C.muted, letterSpacing: 1 }}>← BACK TO MAIN HUB</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            {commPin
              ? <Badge color={C.green}>🔓 Commissioner Mode</Badge>
              : <button onClick={() => setShowPinGate(true)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 14px', color: C.muted, cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: 1 }}>🔐 Commissioner Login</button>
            }
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, fontWeight: 700, margin: 0, letterSpacing: 1, textTransform: 'uppercase' }}>Coaches</h1>
            <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>User coach profiles, records, and dynasty history</p>
          </div>
          {commPin && <Btn onClick={() => setShowAdd(true)}>+ Add Coach</Btn>}
        </div>

        {/* Summary stats */}
        {coaches.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 28 }}>
            {[
              { label: 'Active Coaches', value: active.length, icon: '👤' },
              { label: 'Total Games', value: totalGames, icon: '🏈' },
              { label: 'Winningest Coach', value: topWins?.name || '—', icon: '🏆' },
              { label: 'Seasons Tracked', value: Math.max(...coaches.map(c => c.seasons_coached || 1)), icon: '📅' },
            ].map(s => (
              <Card key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, color: C.accent, fontWeight: 700 }}>{s.value}</div>
                <div style={{ color: C.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>{s.label}</div>
              </Card>
            ))}
          </div>
        )}

        {/* Filter */}
        {inactive.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <button onClick={() => setShowInactive(!showInactive)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 14px', color: C.muted, cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: 1 }}>
              {showInactive ? 'Hide Inactive' : `Show Inactive (${inactive.length})`}
            </button>
          </div>
        )}

        {/* Coach grid */}
        {loading
          ? <div style={{ color: C.muted, textAlign: 'center', paddingTop: 60, fontFamily: "'Oswald', sans-serif", letterSpacing: 2 }}>LOADING COACHES...</div>
          : shown.length === 0
            ? (
              <Card style={{ textAlign: 'center', padding: 48 }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, color: C.text, marginBottom: 8 }}>No coaches yet</div>
                <div style={{ color: C.muted, fontSize: 13, marginBottom: 20 }}>Add your league's coaches to start tracking their records and history.</div>
                {commPin && <Btn onClick={() => setShowAdd(true)}>+ Add First Coach</Btn>}
                {!commPin && <div style={{ color: C.muted, fontSize: 13 }}>Log in as commissioner to add coaches.</div>}
              </Card>
            )
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                {shown.map(c => (
                  <CoachCard key={c.id} coach={c} onSelect={setSelected} isCommissioner={!!commPin} />
                ))}
              </div>
            )
        }

        {/* PIN gate prompt */}
        {showPinGate && !commPin && (
          <div style={{ position: 'fixed', inset: 0, background: '#000000cc', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => e.target === e.currentTarget && setShowPinGate(false)}>
            <PinGate onUnlock={unlock} />
          </div>
        )}

        {/* Detail modal */}
        {selected && (
          <CoachDetail
            coach={selected}
            teams={teams}
            isCommissioner={!!commPin}
            pin={commPin}
            onSave={handleSave}
            onClose={handleClose}
          />
        )}

        {/* Add modal */}
        {showAdd && (
          <AddCoachForm pin={commPin} teams={teams} onAdd={handleAdd} onClose={() => setShowAdd(false)} />
        )}
      </div>
    </>
  )
}
