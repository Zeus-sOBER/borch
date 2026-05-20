// pages/rules.js
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

const CATEGORIES = ['Gameplay', 'Scheduling', 'Voting', 'General']

const CATEGORY_COLORS = {
  Gameplay:   '#4a90d9',
  Scheduling: '#4caf7d',
  Voting:     '#c9a84c',
  General:    '#8b949e',
}

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

function Btn({ children, onClick, color = C.accent, disabled, outline, small }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: outline ? 'transparent' : disabled ? C.subtle : color,
      color: outline ? color : disabled ? C.muted : color === C.accent ? '#000' : '#fff',
      border: `1px solid ${disabled ? C.border : color}`,
      borderRadius: 6, padding: small ? '6px 14px' : '10px 20px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      fontFamily: "'Oswald', sans-serif", fontSize: small ? 12 : 14,
      letterSpacing: 0.5, textTransform: 'uppercase',
      transition: 'all 0.15s', whiteSpace: 'nowrap',
    }}>{children}</button>
  )
}

function Input({ label, value, onChange, placeholder, type = 'text', textarea }) {
  const shared = {
    width: '100%', background: C.surface,
    border: `1px solid ${C.border}`, borderRadius: 6,
    padding: '10px 12px', color: C.text,
    fontSize: 14, fontFamily: "'Lato', sans-serif",
    outline: 'none', resize: textarea ? 'vertical' : 'none',
    boxSizing: 'border-box',
  }
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <label style={{ color: C.muted, fontSize: 11, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</label>}
      {textarea
        ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={3} style={shared} />
        : <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={shared} />
      }
    </div>
  )
}

// ── Rule form (add / edit) ─────────────────────────────────────
function RuleForm({ initial = {}, pin, onSave, onCancel, isMobile }) {
  const [form, setForm] = useState({
    rule: initial.rule || '',
    established: initial.established || '',
    notes: initial.notes || '',
    category: initial.category || 'General',
    sort_order: initial.sort_order ?? 0,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const save = async () => {
    if (!form.rule.trim()) { setError('Rule text is required'); return }
    setSaving(true)
    setError(null)
    try {
      const method = initial.id ? 'PATCH' : 'POST'
      const res = await fetch('/api/rules', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, id: initial.id, pin }),
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setSaving(false); return }
      onSave(data.rule)
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: 20, marginBottom: 16 }}>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, color: C.accent, letterSpacing: 1, marginBottom: 16, textTransform: 'uppercase' }}>
        {initial.id ? 'Edit Rule' : 'Add New Rule'}
      </div>

      <Input label="Rule *" textarea value={form.rule} onChange={e => setForm(f => ({ ...f, rule: e.target.value }))} placeholder="Describe the rule..." />

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        <Input label="Established" value={form.established} onChange={e => setForm(f => ({ ...f, established: e.target.value }))} placeholder="e.g. 3/1/26 by majority vote" />
        <div style={{ marginBottom: 14 }}>
          <label style={{ color: C.muted, fontSize: 11, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 1 }}>Category</label>
          <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{
            width: '100%', background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 6, padding: '10px 12px', color: C.text, fontSize: 14,
          }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <Input label="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any extra context..." />

      {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>❌ {error}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn onClick={save} disabled={saving}>{saving ? 'Saving...' : '💾 Save Rule'}</Btn>
        <Btn outline color={C.muted} onClick={onCancel}>Cancel</Btn>
      </div>
    </div>
  )
}

// ── Rule row ───────────────────────────────────────────────────
function RuleRow({ rule, isCommissioner, pin, onUpdate, onDelete, isMobile }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const color = CATEGORY_COLORS[rule.category] || C.muted

  const handleDelete = async () => {
    if (!confirm('Remove this rule?')) return
    setDeleting(true)
    await fetch('/api/rules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: rule.id, pin }),
    })
    onDelete(rule.id)
  }

  if (editing) {
    return (
      <RuleForm
        initial={rule}
        pin={pin}
        onSave={updated => { onUpdate(updated); setEditing(false) }}
        onCancel={() => setEditing(false)}
        isMobile={isMobile}
      />
    )
  }

  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 8, padding: isMobile ? '14px 14px' : '16px 20px',
      display: 'flex', gap: 16, alignItems: 'flex-start',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
          {rule.category && <Badge color={color}>{rule.category}</Badge>}
        </div>
        <div style={{ fontFamily: "'Lato', sans-serif", fontSize: isMobile ? 14 : 15, color: C.text, lineHeight: 1.6, marginBottom: rule.established || rule.notes ? 10 : 0 }}>
          {rule.rule}
        </div>
        {rule.notes && (
          <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.5, marginBottom: 8, fontStyle: 'italic' }}>
            {rule.notes}
          </div>
        )}
        {rule.established && (
          <div style={{ color: C.muted, fontSize: 12, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5 }}>
            📋 {rule.established}
          </div>
        )}
      </div>
      {isCommissioner && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={() => setEditing(true)} style={{
            background: 'transparent', border: `1px solid ${C.border}`,
            borderRadius: 5, padding: '4px 10px', color: C.muted,
            cursor: 'pointer', fontSize: 12, fontFamily: "'Oswald', sans-serif",
          }}>✏️</button>
          <button onClick={handleDelete} disabled={deleting} style={{
            background: 'transparent', border: `1px solid ${C.red}44`,
            borderRadius: 5, padding: '4px 10px', color: C.red,
            cursor: 'pointer', fontSize: 12, fontFamily: "'Oswald', sans-serif",
          }}>✕</button>
        </div>
      )}
    </div>
  )
}

// ── PIN gate ───────────────────────────────────────────────────
function PinGate({ onUnlock }) {
  const [val, setVal] = useState('')
  const [err, setErr] = useState(false)

  const check = async () => {
    const res = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: val, rule: '__ping__' }),
    })
    if (res.status === 403) { setErr(true); return }
    onUnlock(val)
  }

  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 28, maxWidth: 340, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>🔐</div>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, color: C.text, marginBottom: 6, letterSpacing: 1 }}>COMMISSIONER MODE</div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 18 }}>Enter your PIN to edit rules</div>
      <input
        type="password" value={val}
        onChange={e => { setVal(e.target.value); setErr(false) }}
        onKeyDown={e => e.key === 'Enter' && check()}
        placeholder="Enter PIN"
        style={{ width: '100%', background: C.surface, border: `1px solid ${err ? C.red : C.border}`, borderRadius: 6, padding: '10px 14px', color: C.text, fontSize: 16, textAlign: 'center', outline: 'none', marginBottom: err ? 6 : 14, boxSizing: 'border-box' }}
      />
      {err && <div style={{ color: C.red, fontSize: 12, marginBottom: 10 }}>Incorrect PIN</div>}
      <Btn onClick={check}>Unlock</Btn>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export default function RulesPage() {
  const isMobile = useMobile()
  const [rules,        setRules]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [commPin,      setCommPin]      = useState(null)
  const [showPinGate,  setShowPinGate]  = useState(false)
  const [showAddForm,  setShowAddForm]  = useState(false)
  const [activeCategory, setActiveCategory] = useState('All')

  const load = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/rules')
    const data = await res.json()
    setRules(data.rules || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const p = sessionStorage.getItem('dynasty_comm_pin')
    if (p) setCommPin(p)
  }, [])

  const unlock = (pin) => {
    setCommPin(pin)
    sessionStorage.setItem('dynasty_comm_pin', pin)
    setShowPinGate(false)
  }

  const handleAdd    = (rule)    => { setRules(rs => [...rs, rule]); setShowAddForm(false) }
  const handleUpdate = (updated) => setRules(rs => rs.map(r => r.id === updated.id ? updated : r))
  const handleDelete = (id)      => setRules(rs => rs.filter(r => r.id !== id))

  // Category filter tabs
  const categories = ['All', ...Array.from(new Set(rules.map(r => r.category).filter(Boolean)))]
  const filtered   = activeCategory === 'All' ? rules : rules.filter(r => r.category === activeCategory)

  return (
    <>
      <Head>
        <title>League Rules · Dynasty Universe</title>
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
      </Head>
      <style>{`* { box-sizing: border-box; } body { margin: 0; background: ${C.bg}; font-family: 'Lato', sans-serif; color: ${C.text}; } ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: ${C.surface}; } ::-webkit-scrollbar-thumb { background: ${C.subtle}; border-radius: 3px; }`}</style>

      {/* Nav */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: isMobile ? '0 14px' : '0 24px', paddingTop: 'env(safe-area-inset-top)' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', alignItems: 'center', gap: isMobile ? 12 : 20 }}>
          <a href="/" style={{ textDecoration: 'none', padding: '14px 0', borderRight: `1px solid ${C.border}`, paddingRight: isMobile ? 12 : 20, marginRight: 4 }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 16 : 18, fontWeight: 700, letterSpacing: 2, color: C.accent, lineHeight: 1 }}>DYNASTY</div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, letterSpacing: 5, color: C.muted }}>UNIVERSE</div>
          </a>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 11 : 14, color: C.muted, letterSpacing: 1 }}>← BACK</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            {commPin
              ? <Badge color={C.green}>🔓 {isMobile ? 'Comm' : 'Commissioner Mode'}</Badge>
              : <button onClick={() => setShowPinGate(true)} style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px', color: C.muted, cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 11, letterSpacing: 1 }}>🔐 {isMobile ? 'Login' : 'Commissioner Login'}</button>
            }
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: isMobile ? '16px 14px 120px' : '32px 24px', width: '100%' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 24 : 32, fontWeight: 700, margin: 0, letterSpacing: 1, textTransform: 'uppercase' }}>
              📋 League Rules
            </h1>
            <p style={{ color: C.muted, margin: '6px 0 0', fontSize: 13 }}>
              {rules.length} rule{rules.length !== 1 ? 's' : ''} · Established by the Dynasty Universe
            </p>
          </div>
          {commPin && (
            <Btn small onClick={() => setShowAddForm(s => !s)}>
              {showAddForm ? 'Cancel' : '+ Add Rule'}
            </Btn>
          )}
        </div>

        {/* Add form */}
        {showAddForm && commPin && (
          <RuleForm pin={commPin} onSave={handleAdd} onCancel={() => setShowAddForm(false)} isMobile={isMobile} />
        )}

        {/* Category filter */}
        {categories.length > 2 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                background: activeCategory === cat ? (CATEGORY_COLORS[cat] || C.accent) : 'transparent',
                color: activeCategory === cat ? (cat === 'Voting' || cat === 'All' ? '#000' : '#fff') : C.muted,
                border: `1px solid ${activeCategory === cat ? (CATEGORY_COLORS[cat] || C.accent) : C.border}`,
                borderRadius: 20, padding: '5px 14px', cursor: 'pointer',
                fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: 0.5,
                textTransform: 'uppercase', transition: 'all 0.15s',
              }}>{cat}</button>
            ))}
          </div>
        )}

        {/* Rules list */}
        {loading ? (
          <div style={{ color: C.muted, textAlign: 'center', paddingTop: 60, fontFamily: "'Oswald', sans-serif", letterSpacing: 2 }}>
            LOADING RULES...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, color: C.text, marginBottom: 8 }}>No rules yet</div>
            <div style={{ color: C.muted, fontSize: 13 }}>
              {commPin ? 'Click "+ Add Rule" above to get started.' : 'Log in as commissioner to add rules.'}
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {filtered.map(rule => (
              <RuleRow
                key={rule.id}
                rule={rule}
                isCommissioner={!!commPin}
                pin={commPin}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                isMobile={isMobile}
              />
            ))}
          </div>
        )}

        {/* PIN gate modal */}
        {showPinGate && !commPin && (
          <div style={{ position: 'fixed', inset: 0, background: '#000000cc', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
            onClick={e => e.target === e.currentTarget && setShowPinGate(false)}>
            <PinGate onUnlock={unlock} />
          </div>
        )}
      </div>
    </>
  )
}
