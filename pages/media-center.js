import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const C = {
  bg: '#09090b', surface: '#101014', card: '#17171d', border: '#1f1f2e',
  accent: '#c9a84c', green: '#4caf7d', red: '#e05252', blue: '#4a90d9',
  purple: '#9b7fd4', text: '#e8eaed', muted: '#8b949e',
}

const ARTICLE_TYPES = [
  { value: 'power-rankings',    label: 'Power Rankings',    icon: '🏆' },
  { value: 'weekly-recap',      label: 'Weekly Recap',      icon: '📋' },
  { value: 'player-spotlight',  label: 'Player Spotlight',  icon: '⭐' },
  { value: 'rivalry-breakdown', label: 'Rivalry Breakdown', icon: '🔥' },
]
const TYPE_MAP = Object.fromEntries(ARTICLE_TYPES.map(t => [t.value, t]))

function Badge({ children, color = C.accent }) {
  return (
    <span style={{ background: color+'22', color, border: `1px solid ${color}44`, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontFamily: 'Oswald,sans-serif', letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

export default function MediaCenter() {
  const [articles,        setArticles]        = useState([])
  const [loading,         setLoading]         = useState(true)
  const [filterType,      setFilterType]      = useState('all')
  const [expandedId,      setExpandedId]      = useState(null)   // which article is open
  const [isEditing,       setIsEditing]       = useState(false)
  const [editContent,     setEditContent]     = useState('')
  const [isSaving,        setIsSaving]        = useState(false)
  const [saveSuccess,     setSaveSuccess]     = useState(false)
  const [isDeleting,      setIsDeleting]      = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)

  // Commissioner
  const [pin,             setPin]             = useState('')
  const [pinInput,        setPinInput]        = useState('')
  const [pinError,        setPinError]        = useState('')
  const [showPinBar,      setShowPinBar]      = useState(false)
  const [isCommissioner,  setIsCommissioner]  = useState(false)

  // Generator
  const [showGenerator,   setShowGenerator]   = useState(false)
  const [genType,         setGenType]         = useState('power-rankings')
  const [genWeek,         setGenWeek]         = useState('')
  const [isGenerating,    setIsGenerating]    = useState(false)
  const [genError,        setGenError]        = useState('')

  const fetchArticles = useCallback(async () => {
    setLoading(true)
    try {
      const url = filterType === 'all' ? '/api/articles' : `/api/articles?article_type=${filterType}`
      const data = await fetch(url).then(r => r.json())
      setArticles(data.articles || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [filterType])

  useEffect(() => { fetchArticles() }, [fetchArticles])

  function handlePinSubmit() {
    if (!pinInput.trim()) return
    setPin(pinInput.trim()); setIsCommissioner(true)
    setShowPinBar(false); setPinError(''); setPinInput('')
  }

  async function generateArticle() {
    if (!isCommissioner) { setShowPinBar(true); return }
    setIsGenerating(true); setGenError('')
    try {
      const res  = await fetch('/api/generate-article', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleType: genType, week: genWeek ? parseInt(genWeek) : null, pin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      await fetchArticles()
      // Open the newest article of this type
      const r2   = await fetch(`/api/articles?article_type=${genType}&limit=1`).then(r => r.json())
      const newest = r2.articles?.[0]
      if (newest) { setExpandedId(newest.id); setEditContent(newest.content); setIsEditing(false) }
      setShowGenerator(false)
    } catch (err) { setGenError(err.message) }
    finally { setIsGenerating(false) }
  }

  async function saveArticle(article) {
    if (!isCommissioner) return
    setIsSaving(true); setSaveSuccess(false)
    try {
      const res  = await fetch('/api/articles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: article.id, article_type: article.article_type, week: article.week, title: article.title, content: editContent, pin }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setIsEditing(false); setSaveSuccess(true)
      fetchArticles()
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err) { alert('Save failed: ' + err.message) }
    finally { setIsSaving(false) }
  }

  async function deleteArticle(id) {
    setIsDeleting(true)
    try {
      const res = await fetch('/api/articles', {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pin }),
      })
      if (!res.ok) throw new Error('Delete failed')
      if (expandedId === id) setExpandedId(null)
      setDeleteConfirmId(null)
      fetchArticles()
    } catch (err) { alert(err.message) }
    finally { setIsDeleting(false) }
  }

  function formatDate(d) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const expandedArticle = articles.find(a => a.id === expandedId)

  return (
    <>
      <Head>
        <title>Media Center — Dynasty Universe</title>
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; color: ${C.text}; font-family: Lato, sans-serif; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        button { -webkit-tap-highlight-color: transparent; }
        a { color: ${C.accent}; }
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{ background: C.surface, borderBottom: `2px solid ${C.accent}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, position: 'sticky', top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: 'Oswald,sans-serif', color: C.accent, fontSize: 20, fontWeight: 700, textDecoration: 'none' }}>DYNASTY UNIVERSE</Link>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Link href="/" style={{ color: C.muted, textDecoration: 'none', fontSize: 13, fontFamily: 'Oswald,sans-serif', letterSpacing: 1 }}>← Hub</Link>
          {isCommissioner
            ? <span style={{ color: C.green, fontSize: 12, fontFamily: 'Oswald,sans-serif', letterSpacing: 1 }}>✓ COMMISSIONER</span>
            : <button onClick={() => setShowPinBar(b => !b)} style={{ background: 'transparent', color: C.accent, border: `1px solid ${C.accent}55`, borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 12, letterSpacing: 1 }}>
                🔒 Commissioner Login
              </button>
          }
        </div>
      </div>

      {/* ── PIN BAR ── */}
      {showPinBar && !isCommissioner && (
        <div style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Oswald,sans-serif', fontSize: 13, color: C.muted, letterSpacing: 1 }}>ENTER PIN:</span>
          <input type="password" placeholder="Commissioner PIN" value={pinInput}
            onChange={e => setPinInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
            style={{ background: C.bg, border: `1px solid ${pinError ? C.red : C.border}`, borderRadius: 6, padding: '8px 14px', color: C.text, fontSize: 14, width: 180, letterSpacing: 4 }}
            autoFocus
          />
          <button onClick={handlePinSubmit} style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 700 }}>Unlock</button>
          <button onClick={() => { setShowPinBar(false); setPinError(''); setPinInput('') }} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 12 }}>Cancel</button>
          {pinError && <span style={{ color: C.red, fontSize: 13 }}>❌ {pinError}</span>}
        </div>
      )}

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: 'Oswald,sans-serif', color: C.accent, fontSize: 32, fontWeight: 700, margin: '0 0 4px', letterSpacing: 1 }}>MEDIA CENTER</h1>
          <p style={{ color: C.muted, fontSize: 14, margin: 0 }}>Dynasty coverage — written by AI, published by the commissioner.</p>
        </div>

        {/* ── FILTER TABS + NEW ARTICLE BUTTON ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', ...ARTICLE_TYPES.map(t => t.value)].map(type => {
              const meta = type === 'all' ? { icon: '📚', label: 'All' } : TYPE_MAP[type]
              const active = filterType === type
              return (
                <button key={type} onClick={() => { setFilterType(type); setExpandedId(null) }} style={{
                  background: active ? C.accent : C.card, color: active ? '#000' : C.muted,
                  border: `1px solid ${active ? C.accent : C.border}`, borderRadius: 6,
                  padding: '7px 14px', cursor: 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 12, letterSpacing: 0.5,
                }}>
                  {meta.icon} {meta.label}
                </button>
              )
            })}
          </div>
          {isCommissioner && (
            <button onClick={() => setShowGenerator(g => !g)} style={{
              background: showGenerator ? C.green+'22' : C.green, color: showGenerator ? C.green : '#000',
              border: `1px solid ${C.green}`, borderRadius: 6, padding: '8px 18px',
              cursor: 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 13, fontWeight: 700, letterSpacing: 0.5,
            }}>
              {showGenerator ? '✕ Close Generator' : '✦ Generate New Article'}
            </button>
          )}
        </div>

        {/* ── EXPANDED ARTICLE VIEW ── */}
        {expandedArticle && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.purple}`, borderRadius: 10, padding: '24px', marginBottom: 24 }}>
            {/* Article header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                  <Badge color={C.accent}>{TYPE_MAP[expandedArticle.article_type]?.icon} {TYPE_MAP[expandedArticle.article_type]?.label || expandedArticle.article_type}</Badge>
                  {expandedArticle.week && <Badge color={C.blue}>Week {expandedArticle.week}</Badge>}
                  {saveSuccess && <Badge color={C.green}>✓ Saved</Badge>}
                </div>
                <h2 style={{ fontFamily: 'Oswald,sans-serif', color: C.text, fontSize: 22, margin: '0 0 4px', fontWeight: 700 }}>
                  {expandedArticle.title || TYPE_MAP[expandedArticle.article_type]?.label}
                </h2>
                <div style={{ color: C.muted, fontSize: 12 }}>Updated {formatDate(expandedArticle.updated_at)}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
                {isCommissioner && !isEditing && (
                  <button onClick={() => { setEditContent(expandedArticle.content); setIsEditing(true) }} style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 700 }}>✏️ Edit</button>
                )}
                {isCommissioner && isEditing && (
                  <>
                    <button onClick={() => saveArticle(expandedArticle)} disabled={isSaving} style={{ background: C.green, color: '#000', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 12, fontWeight: 700, opacity: isSaving ? 0.6 : 1 }}>{isSaving ? 'Saving…' : '💾 Save & Publish'}</button>
                    <button onClick={() => setIsEditing(false)} style={{ background: 'transparent', color: C.red, border: `1px solid ${C.red}44`, borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 12 }}>Cancel</button>
                  </>
                )}
                <button onClick={() => navigator.clipboard.writeText(isEditing ? editContent : expandedArticle.content)} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 12 }}>📋 Copy</button>
                <button onClick={() => { setExpandedId(null); setIsEditing(false) }} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 12 }}>✕</button>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, marginBottom: 20 }} />

            {isEditing
              ? <textarea value={editContent} onChange={e => setEditContent(e.target.value)} style={{ width: '100%', minHeight: 480, background: C.bg, color: C.text, border: `1px solid ${C.accent}`, borderRadius: 6, padding: 16, fontSize: 14, lineHeight: 1.8, fontFamily: 'Lato,sans-serif', resize: 'vertical', boxSizing: 'border-box' }} />
              : <div style={{ color: '#d0d0d0', fontSize: 15, lineHeight: 1.85, whiteSpace: 'pre-wrap', fontFamily: 'Lato,sans-serif' }}>{expandedArticle.content}</div>
            }
          </div>
        )}

        {/* ── ARTICLES LIST ── */}
        {loading
          ? <div style={{ color: C.muted, textAlign: 'center', padding: '48px 0', fontFamily: 'Oswald,sans-serif', letterSpacing: 2 }}>Loading articles…</div>
          : articles.length === 0
            ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', color: C.muted }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 18, letterSpacing: 1, marginBottom: 8 }}>No articles yet</div>
                <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                  {isCommissioner ? 'Use "Generate New Article" below to write your first dynasty story.' : 'Check back soon — the commissioner will publish articles here.'}
                </div>
              </div>
            )
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
                {articles.map(article => {
                  const meta      = TYPE_MAP[article.article_type] || { icon: '📄', label: article.article_type }
                  const isOpen    = article.id === expandedId
                  const snippet   = (article.content || '').replace(/[#*`_]/g, '').slice(0, 180).trim()
                  const confirmDel = deleteConfirmId === article.id

                  return (
                    <div key={article.id} style={{
                      background: isOpen ? C.purple+'0a' : C.card,
                      border: `1px solid ${isOpen ? C.purple+'55' : C.border}`,
                      borderLeft: `3px solid ${isOpen ? C.purple : C.border}`,
                      borderRadius: 10, overflow: 'hidden',
                      transition: 'all 0.15s',
                    }}>
                      {/* Card row */}
                      <div
                        onClick={() => { setExpandedId(isOpen ? null : article.id); setIsEditing(false); setEditContent(article.content) }}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '18px 20px', cursor: 'pointer' }}
                      >
                        {/* Icon */}
                        <div style={{ fontSize: 26, flexShrink: 0, lineHeight: 1, marginTop: 2 }}>{meta.icon}</div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                            <Badge color={C.accent}>{meta.label}</Badge>
                            {article.week && <Badge color={C.blue}>Week {article.week}</Badge>}
                          </div>
                          <div style={{ fontFamily: 'Oswald,sans-serif', color: C.text, fontSize: 17, fontWeight: 700, marginBottom: 5, lineHeight: 1.3 }}>
                            {article.title || meta.label}
                          </div>
                          <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.55 }}>
                            {snippet}{snippet.length >= 180 ? '…' : ''}
                          </div>
                          <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>
                            Published {formatDate(article.updated_at)}
                          </div>
                        </div>

                        {/* Chevron */}
                        <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 18, color: isOpen ? C.purple : C.muted, flexShrink: 0, transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</div>
                      </div>

                      {/* Action row (commissioner) */}
                      {isCommissioner && (
                        <div onClick={e => e.stopPropagation()} style={{ borderTop: `1px solid ${C.border}`, padding: '10px 20px', display: 'flex', gap: 8, alignItems: 'center', background: C.surface }}>
                          <button onClick={() => { setExpandedId(article.id); setEditContent(article.content); setIsEditing(true) }} style={{ background: 'transparent', color: C.accent, border: `1px solid ${C.accent}44`, borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 11, letterSpacing: 1 }}>✏️ Edit</button>
                          <button onClick={() => navigator.clipboard.writeText(article.content)} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 11, letterSpacing: 1 }}>📋 Copy</button>

                          {!confirmDel
                            ? <button onClick={() => setDeleteConfirmId(article.id)} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 11, letterSpacing: 1, marginLeft: 'auto' }}>🗑 Delete</button>
                            : (
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 'auto' }}>
                                <span style={{ color: C.red, fontSize: 12 }}>Delete this article?</span>
                                <button onClick={() => deleteArticle(article.id)} disabled={isDeleting} style={{ background: C.red, color: '#fff', border: 'none', borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 11, fontWeight: 700 }}>{isDeleting ? '…' : 'Yes, Delete'}</button>
                                <button onClick={() => setDeleteConfirmId(null)} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, padding: '5px 10px', cursor: 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 11 }}>Cancel</button>
                              </div>
                            )
                          }
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
        }

        {/* ── GENERATE PANEL (BOTTOM, commissioner only) ── */}
        {isCommissioner && (
          <div>
            {/* Collapsed trigger */}
            {!showGenerator && (
              <button onClick={() => setShowGenerator(true)} style={{
                width: '100%', background: C.card, border: `1px dashed ${C.border}`, borderRadius: 10,
                padding: '18px', cursor: 'pointer', color: C.muted,
                fontFamily: 'Oswald,sans-serif', fontSize: 13, letterSpacing: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 18 }}>✦</span> Generate New Article
              </button>
            )}

            {/* Expanded generator */}
            {showGenerator && (
              <div style={{ background: C.card, border: `1px solid ${C.accent}44`, borderRadius: 10, padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div style={{ fontFamily: 'Oswald,sans-serif', color: C.accent, fontSize: 16, letterSpacing: 1 }}>✦ GENERATE NEW ARTICLE</div>
                  <button onClick={() => { setShowGenerator(false); setGenError('') }} style={{ background: 'transparent', color: C.muted, border: 'none', cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>

                {/* Type selector */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Article Type</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {ARTICLE_TYPES.map(t => (
                      <button key={t.value} onClick={() => setGenType(t.value)} style={{
                        background: genType === t.value ? C.accent : C.surface, color: genType === t.value ? '#000' : C.muted,
                        border: `1px solid ${genType === t.value ? C.accent : C.border}`, borderRadius: 6,
                        padding: '8px 16px', cursor: 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 13,
                      }}>
                        {t.icon} {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Week input */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: 'Oswald,sans-serif', fontSize: 11, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>Week (optional)</div>
                  <input type="number" placeholder="e.g. 3" value={genWeek} onChange={e => setGenWeek(e.target.value)} min="0" max="20"
                    style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: '9px 14px', color: C.text, fontSize: 14, width: 100 }}
                  />
                </div>

                {/* Generate button + error */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <button onClick={generateArticle} disabled={isGenerating} style={{
                    background: isGenerating ? C.surface : C.accent, color: isGenerating ? C.muted : '#000',
                    border: `1px solid ${C.accent}`, borderRadius: 6, padding: '11px 24px',
                    cursor: isGenerating ? 'wait' : 'pointer', fontFamily: 'Oswald,sans-serif', fontSize: 14, fontWeight: 700, letterSpacing: 0.5,
                  }}>
                    {isGenerating ? '⏳ Generating… this takes ~20 sec' : '✦ Generate Article'}
                  </button>
                  {genError && <span style={{ color: C.red, fontSize: 13 }}>❌ {genError}</span>}
                </div>

                <div style={{ marginTop: 16, color: C.muted, fontSize: 12, lineHeight: 1.6 }}>
                  The AI will analyze your current season data — standings, scores, and stats — then write a full article. You can edit and publish it after.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Non-commissioner: subtle generate CTA */}
        {!isCommissioner && (
          <div style={{ textAlign: 'center', padding: '24px', color: C.muted, fontSize: 13, borderTop: `1px solid ${C.border}` }}>
            Commissioner login required to generate or edit articles.{' '}
            <button onClick={() => setShowPinBar(true)} style={{ background: 'transparent', color: C.accent, border: 'none', cursor: 'pointer', fontSize: 13, textDecoration: 'underline', fontFamily: 'Lato,sans-serif' }}>Login</button>
          </div>
        )}
      </div>
    </>
  )
}
