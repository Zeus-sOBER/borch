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
  purple:  '#9b7fd4',
  text:    '#e8eaed',
  muted:   '#8b949e',
  subtle:  '#2a2a3a',
}

const TABS = ['Dashboard', 'Standings', 'Season', 'Stats', 'Media', 'Sync']

// ── Responsive hook ────────────────────────────────────────────
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
    <div
      onClick={onClick}
      style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: 16,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >{children}</div>
  )
}

function SectionTitle({ children, sub, isMobile }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{
        fontFamily: "'Oswald', sans-serif",
        fontSize: isMobile ? 18 : 24,
        fontWeight: 700, color: C.text, margin: 0,
        letterSpacing: 1, textTransform: 'uppercase',
      }}>{children}</h2>
      {sub && <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 12 }}>{sub}</p>}
    </div>
  )
}

function PillBtn({ active, onClick, children, small }) {
  return (
    <button onClick={onClick} style={{
      background: active ? C.accent : C.card,
      color: active ? '#000' : C.muted,
      border: `1px solid ${active ? C.accent : C.border}`,
      borderRadius: 6,
      padding: small ? '6px 12px' : '10px 18px',
      cursor: 'pointer',
      fontFamily: "'Oswald', sans-serif",
      fontSize: small ? 12 : 13,
      letterSpacing: 0.5,
      transition: 'all 0.15s',
      minHeight: 40,
    }}>{children}</button>
  )
}

// ── Bottom Nav (mobile only) ───────────────────────────────────
const NAV_ITEMS = [
  { id: 'Dashboard', icon: '🏠', label: 'Home' },
  { id: 'Standings', icon: '📊', label: 'Standings' },
  { id: 'Season',    icon: '📅', label: 'Season' },
  { id: 'Stats',     icon: '⭐', label: 'Stats' },
  { id: 'Media',     icon: '📰', label: 'Media' },
  { id: 'Sync',      icon: '🔄', label: 'Sync' },
]

function BottomNav({ tab, setTab }) {
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: C.surface, borderTop: `1px solid ${C.border}`,
      display: 'flex', zIndex: 200,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {NAV_ITEMS.map(item => (
        <button key={item.id} onClick={() => setTab(item.id)} style={{
          flex: 1, background: 'transparent', border: 'none',
          padding: '8px 2px 6px', cursor: 'pointer',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 2,
          color: tab === item.id ? C.accent : C.muted,
          borderTop: `2px solid ${tab === item.id ? C.accent : 'transparent'}`,
          transition: 'all 0.1s',
        }}>
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span style={{
            fontSize: 9, fontFamily: "'Oswald', sans-serif",
            letterSpacing: 0.5, textTransform: 'uppercase',
          }}>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

// ── Score Ticker ────────────────────────────────────────────────
function ScoreTicker({ games, setTab, isMobile }) {
  const finalGames = [...games].filter(g => g.status === 'Final' || g.is_final).reverse().slice(0, 14)
  if (finalGames.length === 0) return null

  return (
    <div style={{
      background: '#07070c',
      borderBottom: `1px solid ${C.border}`,
      position: 'sticky', top: isMobile ? 57 : 69, zIndex: 90,
    }}>
      <style>{`.ticker-strip::-webkit-scrollbar { display: none; }`}</style>
      <div className="ticker-strip" style={{
        display: 'flex', overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>
        {/* "SCORES" label */}
        <div style={{
          flexShrink: 0, padding: isMobile ? '7px 12px' : '8px 16px',
          background: C.accent,
          display: 'flex', alignItems: 'center',
          fontFamily: "'Oswald', sans-serif",
          fontSize: 10, fontWeight: 700, letterSpacing: 2.5, color: '#000',
          textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>SCORES</div>

        {finalGames.map((g, i) => {
          const homeWon = g.home_score > g.away_score
          return (
            <div
              key={g.id || i}
              onClick={() => setTab('Season')}
              style={{
                flexShrink: 0, padding: isMobile ? '5px 12px' : '6px 16px',
                borderRight: `1px solid ${C.border}`,
                cursor: 'pointer', minWidth: isMobile ? 120 : 140,
                display: 'flex', flexDirection: 'column', gap: 1,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = C.subtle + '44'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ color: homeWon ? C.text : C.muted, fontSize: 11, fontWeight: homeWon ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 85 }}>{g.home_team}</span>
                <span style={{ fontFamily: "'Oswald', sans-serif", color: homeWon ? C.accent : C.muted, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{g.home_score}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <span style={{ color: !homeWon ? C.text : C.muted, fontSize: 11, fontWeight: !homeWon ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 85 }}>{g.away_team}</span>
                <span style={{ fontFamily: "'Oswald', sans-serif", color: !homeWon ? C.accent : C.muted, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{g.away_score}</span>
              </div>
              <div style={{ fontSize: 8, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', fontFamily: "'Oswald', sans-serif" }}>WK {g.week} · FINAL</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Dashboard (ESPN Style) ─────────────────────────────────────
const ARTICLE_TYPE_LABELS = {
  'power-rankings':    { label: 'Power Rankings', icon: '🏆' },
  'weekly-recap':      { label: 'Weekly Recap',   icon: '📋' },
  'player-spotlight':  { label: 'Player Spotlight', icon: '⭐' },
  'rivalry-breakdown': { label: 'Rivalry Breakdown', icon: '🔥' },
}

function Dashboard({ teams, games, players, scanLog, isMobile, narrativeEntries, settings, setTab, articles = [], onArticlesChange, commPin }) {
  const finalGames  = games.filter(g => g.status === 'Final' || g.is_final)
  const currentWeek = settings?.current_week ?? 0

  const rankedTeams = [...teams].sort((a, b) => {
    const aRank = a.rank ?? 9999; const bRank = b.rank ?? 9999
    if (aRank !== bRank) return aRank - bRank
    return (b.wins - a.wins) || ((b.pts - b.pts_against) - (a.pts - a.pts_against))
  })

  const topPasser   = players.find(p => p.pos === 'QB')
  const topRusher   = players.find(p => p.pos === 'RB')
  const topReceiver = players.find(p => p.pos === 'WR')

  // Picker state
  const [showPicker,   setShowPicker]   = useState(false)
  const [pickerTab,    setPickerTab]    = useState('article')
  const [pinningId,    setPinningId]    = useState(null)
  const [pickerPin,    setPickerPin]    = useState('')
  const [pinError,     setPinError]     = useState('')
  const [showPinEntry, setShowPinEntry] = useState(false)
  const [pendingAction,setPendingAction]= useState(null)
  const [driveFiles,   setDriveFiles]   = useState([])
  const [driveLoading, setDriveLoading] = useState(false)
  const [driveError,   setDriveError]   = useState('')
  const [savingImage,  setSavingImage]  = useState(false)

  // Derived values
  const featuredArticleId = settings?.featured_article_id ?? null
  const featuredArticle   = articles.find(a => a.id === featuredArticleId) || articles[0] || null
  const otherArticles     = articles.filter(a => a.id !== featuredArticle?.id).slice(0, 4)
  const heroImageId       = settings?.hero_image_id   ?? null
  const heroImageMime     = settings?.hero_image_mime ?? 'image/png'
  const heroImageSrc      = heroImageId ? `/api/drive-image?id=${heroImageId}&mime=${encodeURIComponent(heroImageMime)}` : null
  const featuredGameId    = settings?.featured_game_id ?? null
  const featuredGame      = games.find(g => g.id === featuredGameId) || [...finalGames].reverse()[0] || null
  const fgHomeWon         = featuredGame && featuredGame.home_score > featuredGame.away_score
  const fgAwayWon         = featuredGame && featuredGame.away_score > featuredGame.home_score

  async function loadDriveFiles() {
    if (driveFiles.length > 0) return
    setDriveLoading(true); setDriveError('')
    try {
      const json = await fetch('/api/drive-files').then(r => r.json())
      setDriveFiles((json.files || []).filter(f => f.mimeType && f.mimeType.startsWith('image/')))
    } catch { setDriveError('Could not load Drive files.') }
    finally { setDriveLoading(false) }
  }

  function openPicker(tab) {
    const opening = !showPicker || pickerTab !== tab
    setPickerTab(tab); setShowPicker(opening)
    setShowPinEntry(false); setPinError('')
    if (opening && tab === 'image') loadDriveFiles()
  }

  async function saveSettings(patch, pin) {
    const res  = await fetch('/api/league-settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin, ...patch }) })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Failed')
    Object.assign(settings, json)
    if (onArticlesChange) onArticlesChange()
  }

  async function runSave(patch, pin, setWorking) {
    setWorking(true); setPinError('')
    try {
      await saveSettings(patch, pin)
      setShowPicker(false); setShowPinEntry(false); setPickerPin(''); setPendingAction(null)
    } catch (err) { setPinError(err.message === 'Invalid commissioner PIN' ? 'Wrong PIN' : err.message) }
    finally { setWorking(null) }
  }

  function pickItem(type, payload) {
    if (commPin) {
      if (type === 'article') runSave({ featured_article_id: payload }, commPin, setPinningId)
      else if (type === 'image') runSave({ hero_image_id: payload.id, hero_image_mime: payload.mimeType }, commPin, setSavingImage)
      else if (type === 'game')  runSave({ featured_game_id: payload }, commPin, setPinningId)
    } else {
      setPendingAction({ type, payload }); setShowPinEntry(true)
    }
  }

  function handlePinSubmit() {
    if (!pickerPin || !pendingAction) return
    const { type, payload } = pendingAction
    if (type === 'article') runSave({ featured_article_id: payload }, pickerPin, setPinningId)
    else if (type === 'image') runSave({ hero_image_id: payload.id, hero_image_mime: payload.mimeType }, pickerPin, setSavingImage)
    else if (type === 'game')  runSave({ featured_game_id: payload }, pickerPin, setPinningId)
  }

  const SectionLabel = ({ color = C.accent, children }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{ width: 4, height: 18, background: color, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, color: C.muted, letterSpacing: 3, textTransform: 'uppercase' }}>{children}</span>
    </div>
  )

  // Reusable PIN entry row
  const PinEntry = () => showPinEntry ? (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
      <input type="password" placeholder="Commissioner PIN" value={pickerPin}
        onChange={e => setPickerPin(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePinSubmit()}
        style={{ flex: 1, minWidth: 130, background: C.card, border: `1px solid ${pinError ? C.red : C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 13 }}
      />
      <button onClick={handlePinSubmit} style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 12, fontWeight: 700 }}>Confirm</button>
      {pinError && <span style={{ color: C.red, fontSize: 12, width: '100%' }}>❌ {pinError}</span>}
    </div>
  ) : null

  return (
    <div>

      {/* ── COMMISSIONER PICKER BAR ── */}
      {(articles.length > 0 || finalGames.length > 0) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginRight: 4 }}>📌 Commissioner</span>
          {articles.length > 0 && (
            <button onClick={() => openPicker('article')} style={{ background: showPicker && pickerTab==='article' ? C.purple+'33' : 'transparent', color: showPicker && pickerTab==='article' ? C.purple : C.muted, border: `1px solid ${showPicker && pickerTab==='article' ? C.purple+'66' : C.border}`, borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>📰 Story</button>
          )}
          <button onClick={() => openPicker('image')} style={{ background: showPicker && pickerTab==='image' ? C.blue+'33' : 'transparent', color: showPicker && pickerTab==='image' ? C.blue : C.muted, border: `1px solid ${showPicker && pickerTab==='image' ? C.blue+'66' : C.border}`, borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>🖼️ Image</button>
          {finalGames.length > 0 && (
            <button onClick={() => openPicker('game')} style={{ background: showPicker && pickerTab==='game' ? C.green+'33' : 'transparent', color: showPicker && pickerTab==='game' ? C.green : C.muted, border: `1px solid ${showPicker && pickerTab==='game' ? C.green+'66' : C.border}`, borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>🏈 Game</button>
          )}
        </div>
      )}

      {/* ── COMMISSIONER PICKER PANEL ── */}
      {showPicker && (
        <Card style={{ marginBottom: 20, padding: '16px 18px', borderColor: pickerTab==='article' ? C.purple+'44' : pickerTab==='image' ? C.blue+'44' : C.green+'44', background: C.surface }}>
          {/* Tab row */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {articles.length > 0 && <button onClick={() => setPickerTab('article')} style={{ background: pickerTab==='article' ? C.purple+'33' : 'transparent', color: pickerTab==='article' ? C.purple : C.muted, border: `1px solid ${pickerTab==='article' ? C.purple+'55' : C.border}`, borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 10, letterSpacing: 1 }}>📰 Pick Story</button>}
            <button onClick={() => { setPickerTab('image'); loadDriveFiles() }} style={{ background: pickerTab==='image' ? C.blue+'33' : 'transparent', color: pickerTab==='image' ? C.blue : C.muted, border: `1px solid ${pickerTab==='image' ? C.blue+'55' : C.border}`, borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 10, letterSpacing: 1 }}>🖼️ Pick Image</button>
            {finalGames.length > 0 && <button onClick={() => setPickerTab('game')} style={{ background: pickerTab==='game' ? C.green+'33' : 'transparent', color: pickerTab==='game' ? C.green : C.muted, border: `1px solid ${pickerTab==='game' ? C.green+'55' : C.border}`, borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 10, letterSpacing: 1 }}>🏈 Pick Game</button>}
          </div>

          <PinEntry />

          {/* STORY LIST */}
          {pickerTab === 'article' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
              {articles.map(a => {
                const meta = ARTICLE_TYPE_LABELS[a.article_type] || { label: a.article_type, icon: '📄' }
                const isFeatured = a.id === featuredArticle?.id
                return (
                  <div key={a.id} onClick={() => pickItem('article', a.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 7, cursor: 'pointer', background: isFeatured ? C.purple+'18' : C.card, border: `1px solid ${isFeatured ? C.purple+'55' : C.border}` }}>
                    <span style={{ fontSize: 15, flexShrink: 0 }}>{meta.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: C.text, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || meta.label}</div>
                      <div style={{ color: C.muted, fontSize: 10 }}>{meta.label}{a.week ? ` · Week ${a.week}` : ''}</div>
                    </div>
                    <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: isFeatured ? C.purple : C.muted, letterSpacing: 1, textTransform: 'uppercase', flexShrink: 0 }}>{isFeatured ? '📌 Featured' : 'Pin →'}</span>
                  </div>
                )
              })}
            </div>
          )}

          {/* IMAGE LIST */}
          {pickerTab === 'image' && (
            <div>
              {driveLoading && <div style={{ color: C.muted, fontSize: 13, padding: '8px 0' }}>⏳ Loading Drive images…</div>}
              {driveError   && <div style={{ color: C.red,  fontSize: 13, padding: '8px 0' }}>❌ {driveError}</div>}
              {!driveLoading && driveFiles.length === 0 && !driveError && <div style={{ color: C.muted, fontSize: 13 }}>No images found in Drive folder.</div>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                {driveFiles.map(f => {
                  const isActive = f.id === heroImageId
                  return (
                    <div key={f.id} onClick={() => pickItem('image', f)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 7, cursor: 'pointer', background: isActive ? C.blue+'18' : C.card, border: `1px solid ${isActive ? C.blue+'55' : C.border}` }}>
                      <div style={{ width: 44, height: 30, borderRadius: 4, overflow: 'hidden', flexShrink: 0, background: C.border }}>
                        <img src={`/api/drive-image?id=${f.id}&mime=${encodeURIComponent(f.mimeType)}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display='none' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: C.text, fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                        <div style={{ color: C.muted, fontSize: 10 }}>{new Date(f.createdTime).toLocaleDateString()}</div>
                      </div>
                      <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: isActive ? C.blue : C.muted, letterSpacing: 1, textTransform: 'uppercase', flexShrink: 0 }}>{isActive ? '✓ Active' : 'Set →'}</span>
                    </div>
                  )
                })}
              </div>
              {heroImageId && <button onClick={() => pickItem('image', { id: null, mimeType: null })} style={{ marginTop: 8, background: 'transparent', color: C.red, border: `1px solid ${C.red}44`, borderRadius: 5, padding: '4px 12px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 10 }}>Remove Image</button>}
            </div>
          )}

          {/* GAME LIST */}
          {pickerTab === 'game' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
              {[...finalGames].reverse().map(g => {
                const isActive = g.id === featuredGame?.id
                const homeWon  = g.home_score > g.away_score
                return (
                  <div key={g.id} onClick={() => pickItem('game', g.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 7, cursor: 'pointer', background: isActive ? C.green+'12' : C.card, border: `1px solid ${isActive ? C.green+'55' : C.border}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: homeWon ? C.text : C.muted, fontSize: 13, fontWeight: homeWon ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{g.home_team}</span>
                        <span style={{ fontFamily: "'Oswald', sans-serif", color: homeWon ? C.accent : C.muted, fontSize: 14 }}>{g.home_score}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                        <span style={{ color: !homeWon ? C.text : C.muted, fontSize: 13, fontWeight: !homeWon ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{g.away_team}</span>
                        <span style={{ fontFamily: "'Oswald', sans-serif", color: !homeWon ? C.accent : C.muted, fontSize: 14 }}>{g.away_score}</span>
                      </div>
                      <div style={{ color: C.muted, fontSize: 9, marginTop: 3, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: 'uppercase' }}>Week {g.week} · Final{g.game_type && g.game_type !== 'regular' ? ' · '+g.game_type.replace(/_/g,' ') : ''}</div>
                    </div>
                    <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: isActive ? C.green : C.muted, letterSpacing: 1, textTransform: 'uppercase', flexShrink: 0 }}>{isActive ? '✓ Shown' : 'Show →'}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── HERO ROW: Article (left) + Game Score (right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.55fr 1fr', gap: 20, marginBottom: 24, alignItems: 'stretch' }}>

        {/* LEFT: Featured Article Hero */}
        {featuredArticle ? (() => {
          const meta    = ARTICLE_TYPE_LABELS[featuredArticle.article_type] || { label: featuredArticle.article_type, icon: '📄' }
          const preview = (featuredArticle.content || '').replace(/[#*`_]/g, '').slice(0, 320).trim()
          return (
            <Card style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderLeft: `3px solid ${C.purple}` }}>
              {/* Hero image */}
              {heroImageSrc && (
                <div style={{ width: '100%', height: isMobile ? 180 : 220, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                  <img src={heroImageSrc} alt="Featured" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} onError={e => { e.target.parentElement.style.display='none' }} />
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 80, background: 'linear-gradient(to bottom, transparent, ' + C.card + ')' }} />
                </div>
              )}
              <div style={{ padding: isMobile ? '16px' : '22px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: 14 }}>{meta.icon}</span>
                  <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: C.purple, letterSpacing: 3, textTransform: 'uppercase' }}>📰 Featured Story</span>
                  {featuredArticle.week && <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: C.muted, letterSpacing: 1, marginLeft: 'auto' }}>Week {featuredArticle.week}</span>}
                </div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 20 : 26, fontWeight: 700, color: C.text, lineHeight: 1.25, marginBottom: 12 }}>
                  {featuredArticle.title || meta.label}
                </div>
                <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.7, flex: 1 }}>
                  {preview}{preview.length >= 320 ? '…' : ''}
                </div>
                <div style={{ marginTop: 16 }}>
                  <a href="/media-center" style={{ color: C.purple, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: 'uppercase', textDecoration: 'none' }}>Read Full Article →</a>
                </div>
              </div>
            </Card>
          )
        })() : (
          <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', borderStyle: 'dashed', minHeight: 200 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📰</div>
            <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>Articles from Media Center will appear here.<br />Use "📰 Story" above to pick one.</div>
            <a href="/media-center" style={{ marginTop: 14, color: C.accent, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: 'uppercase', textDecoration: 'none' }}>Go to Media Center →</a>
          </Card>
        )}

        {/* RIGHT: Featured Game Scoreboard */}
        {featuredGame ? (
          <Card style={{
            background: 'linear-gradient(160deg, #12121a 0%, #0c0c13 100%)',
            borderLeft: `4px solid ${C.accent}`, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          }}>
            {/* Game header */}
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: C.muted, letterSpacing: 3, textTransform: 'uppercase' }}>
                {featuredGame.game_type && featuredGame.game_type !== 'regular' ? featuredGame.game_type.replace(/_/g,' ').toUpperCase() : `Week ${featuredGame.week}`}
              </span>
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, background: C.accent+'22', color: C.accent, border: `1px solid ${C.accent}44`, borderRadius: 3, padding: '2px 10px', letterSpacing: 2 }}>FINAL</span>
            </div>
            {/* Scores */}
            <div style={{ padding: '20px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
              {/* Home */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: fgHomeWon ? 1 : 0.45 }}>
                <div>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 20 : 26, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 140 : 180 }}>{featuredGame.home_team}</div>
                  {fgHomeWon && <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 8, color: C.accent, letterSpacing: 2, marginTop: 2 }}>🏆 WINNER</div>}
                </div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 44 : 60, fontWeight: 700, color: fgHomeWon ? C.accent : '#3a3a4a', lineHeight: 1 }}>{featuredGame.home_score}</div>
              </div>
              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: C.muted, letterSpacing: 3 }}>VS</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
              {/* Away */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: fgAwayWon ? 1 : 0.45 }}>
                <div>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 20 : 26, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 140 : 180 }}>{featuredGame.away_team}</div>
                  {fgAwayWon && <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 8, color: C.accent, letterSpacing: 2, marginTop: 2 }}>🏆 WINNER</div>}
                </div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 44 : 60, fontWeight: 700, color: fgAwayWon ? C.accent : '#3a3a4a', lineHeight: 1 }}>{featuredGame.away_score}</div>
              </div>
            </div>
            <div style={{ padding: '10px 20px', borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => setTab('Season')} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, padding: '5px 14px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>See All Scores →</button>
            </div>
          </Card>
        ) : (
          <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', borderStyle: 'dashed', minHeight: 200 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏈</div>
            <div style={{ color: C.muted, fontSize: 13, textAlign: 'center' }}>Use "🏈 Game" above to pin a game score here.</div>
          </Card>
        )}
      </div>

      {/* ── THREE COLUMNS: Top Teams | Recent Articles | Stat Leaders ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr 240px', gap: 20, marginBottom: 24, alignItems: 'start' }}>

        {/* TOP TEAMS */}
        <div>
          <SectionLabel color={C.accent}>Top Teams</SectionLabel>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {teams.length === 0
              ? <div style={{ padding: '20px 16px', color: C.muted, fontSize: 13, textAlign: 'center' }}><div style={{ fontSize: 28, marginBottom: 8 }}>🏆</div>Sync standings to see rankings</div>
              : rankedTeams.slice(0, 8).map((t, i) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '11px 14px', borderBottom: i < Math.min(rankedTeams.length,8)-1 ? `1px solid ${C.border}` : 'none', background: i===0 ? C.accent+'09' : 'transparent', gap: 10 }}>
                  <div style={{ width: 24, flexShrink: 0, textAlign: 'center', fontFamily: "'Oswald', sans-serif", fontSize: i===0?20:15, color: i===0?C.accent:C.muted, fontWeight: 700 }}>{t.rank ?? i+1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: C.text, fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                    <div style={{ color: C.muted, fontSize: 11 }}>{t.coach || 'No coach'}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: C.text }}>{t.wins}-{t.losses}</div>
                    {t.streak && t.streak !== 'unknown' && /^[WL]\d+$/.test(t.streak) && <Badge color={t.streak.startsWith('W') ? C.green : C.red}>{t.streak}</Badge>}
                  </div>
                </div>
              ))
            }
          </Card>
        </div>

        {/* RECENT ARTICLES */}
        <div>
          <SectionLabel color={C.purple}>More Stories</SectionLabel>
          {otherArticles.length === 0
            ? <Card style={{ padding: '24px 16px', textAlign: 'center', borderStyle: 'dashed' }}><div style={{ fontSize: 28, marginBottom: 8 }}>📰</div><div style={{ color: C.muted, fontSize: 13 }}>More articles will appear here</div></Card>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {otherArticles.map(a => {
                  const meta = ARTICLE_TYPE_LABELS[a.article_type] || { label: a.article_type, icon: '📄' }
                  const snippet = (a.content || '').replace(/[#*`_]/g,'').slice(0,140).trim()
                  return (
                    <Card key={a.id} style={{ padding: '14px 16px', borderLeft: `3px solid ${C.border}` }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{meta.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 8, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 }}>{meta.label}{a.week ? ` · Wk ${a.week}` : ''}</div>
                          <div style={{ color: C.text, fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginBottom: 5 }}>{a.title || meta.label}</div>
                          <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.55 }}>{snippet}{snippet.length>=140?'…':''}</div>
                          <a href="/media-center" style={{ display: 'inline-block', marginTop: 8, color: C.purple, fontSize: 10, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: 'uppercase', textDecoration: 'none' }}>Read →</a>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
          }
        </div>

        {/* STAT LEADERS */}
        <div>
          <SectionLabel color={C.green}>Stat Leaders</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {players.length === 0
              ? <Card style={{ padding: '24px 16px', textAlign: 'center' }}><div style={{ fontSize: 28, marginBottom: 8 }}>⭐</div><div style={{ color: C.muted, fontSize: 13 }}>Sync player stats to see leaders</div></Card>
              : [
                  { label: 'Passing',   icon: '🎯', player: topPasser,   stat: topPasser?.stats?.pass_yds,  color: C.blue   },
                  { label: 'Rushing',   icon: '💨', player: topRusher,   stat: topRusher?.stats?.rush_yds,  color: C.green  },
                  { label: 'Receiving', icon: '🙌', player: topReceiver, stat: topReceiver?.stats?.rec_yds, color: C.purple },
                ].filter(x => x.player).map(x => (
                  <Card key={x.label} style={{ padding: '14px 16px', borderLeft: `3px solid ${x.color}` }}>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: x.color, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>{x.icon} {x.label}</div>
                    <div style={{ color: C.text, fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{x.player.name}</div>
                    <div style={{ color: C.muted, fontSize: 11, marginBottom: 8 }}>{x.player.team}</div>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 30, color: x.color, lineHeight: 1 }}>
                      {x.stat?.toLocaleString()}<span style={{ fontSize: 11, color: C.muted, marginLeft: 4 }}>YDS</span>
                    </div>
                  </Card>
                ))
            }
          </div>
        </div>
      </div>

      {/* RECENT SYNCS */}
      {scanLog?.length > 0 && (
        <div>
          <SectionLabel color={C.blue}>Recent Syncs</SectionLabel>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {scanLog.slice(0, 4).map((log, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: i < 3 ? `1px solid ${C.border}` : 'none', flexWrap: 'wrap', gap: 6 }}>
                <span style={{ color: C.text, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 140 : 300 }}>{log.file_name}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  {log.data_type && <Badge color={C.blue}>{log.data_type}</Badge>}
                  {log.records_parsed > 0 && <span style={{ color: C.green, fontSize: 12 }}>{log.records_parsed} records</span>}
                  <span style={{ color: C.muted, fontSize: 10 }}>{new Date(log.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}

// ── Standings ──────────────────────────────────────────────────
function Standings({ teams, isMobile }) {
  // Sort: most wins first, then point differential as tiebreaker, then rank if set
  const sorted = [...teams].sort((a, b) =>
    b.wins - a.wins ||
    ((b.pts - b.pts_against) - (a.pts - a.pts_against)) ||
    (a.rank || 99) - (b.rank || 99)
  )
  const PLAYOFF_LINE = 4 // top 4 make playoff

  return (
    <div>
      <SectionTitle isMobile={isMobile} sub="Current Season Records">Standings</SectionTitle>
      {teams.length === 0
        ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div style={{ color: C.muted, fontSize: 14, fontStyle: 'italic' }}>
                The conference standings are still being written. Sync a standings screenshot to see who's rising and who's falling.
              </div>
            </div>
          </Card>
        )
        : (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 480 : 'auto' }}>
                <thead>
                  <tr style={{ background: C.surface }}>
                    {['#','Team','Coach','W','L','PF','PA','Diff','Streak'].map(h => (
                      <th key={h} style={{
                        padding: isMobile ? '10px 10px' : '13px 16px',
                        textAlign: ['Team','Coach'].includes(h) ? 'left' : 'center',
                        color: C.muted, fontSize: 11,
                        fontFamily: "'Oswald', sans-serif", letterSpacing: 1,
                        textTransform: 'uppercase',
                        borderBottom: `1px solid ${C.border}`,
                        whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((t, i) => (
                    <>
                      {i === PLAYOFF_LINE && (
                        <tr key="playoff-line">
                          <td colSpan={9} style={{
                            padding: '4px 16px',
                            background: C.accent + '11',
                            borderTop: `1px dashed ${C.accent}55`,
                            borderBottom: `1px dashed ${C.accent}55`,
                          }}>
                            <span style={{ color: C.accent, fontSize: 10, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: 'uppercase' }}>
                              ── Playoff Line ──
                            </span>
                          </td>
                        </tr>
                      )}
                      <tr key={t.id} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? 'transparent' : C.surface + '66' }}>
                        <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', textAlign: 'center' }}>
                          <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, color: i < PLAYOFF_LINE ? C.accent : C.muted }}>{i + 1}</span>
                        </td>
                        <td style={{ padding: isMobile ? '10px 10px' : '13px 16px' }}>
                          <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{t.name}</span>
                        </td>
                        <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', color: t.coach ? C.muted : C.subtle, fontSize: 12 }}>{t.coach || '—'}</td>
                        <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', textAlign: 'center', color: C.green, fontFamily: "'Oswald', sans-serif", fontSize: 16 }}>{t.wins}</td>
                        <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', textAlign: 'center', color: C.red, fontFamily: "'Oswald', sans-serif", fontSize: 16 }}>{t.losses}</td>
                        <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', textAlign: 'center', color: C.text, fontSize: 12 }}>{t.pts}</td>
                        <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', textAlign: 'center', color: C.muted, fontSize: 12 }}>{t.pts_against}</td>
                        <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', textAlign: 'center', fontSize: 12 }}>
                          <span style={{ color: (t.pts - t.pts_against) >= 0 ? C.green : C.red }}>
                            {(t.pts - t.pts_against) >= 0 ? '+' : ''}{t.pts - t.pts_against}
                          </span>
                        </td>
                        <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', textAlign: 'center' }}>
                          {t.streak && t.streak !== 'unknown' && t.streak !== '—' && /^[WL]\d+$/.test(t.streak)
                            ? <Badge color={t.streak.startsWith('W') ? C.green : C.red}>{t.streak}</Badge>
                            : <span style={{ color: C.subtle, fontSize: 12 }}>—</span>
                          }
                        </td>
                      </tr>
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
    </div>
  )
}

// ── Share Card overlay ────────────────────────────────────────
function ShareCard({ game, onClose }) {
  if (!game) return null
  const homeWon = game.home_score > game.away_score
  const awayWon = game.away_score > game.home_score
  const gameLabel = game.game_type && game.game_type !== 'regular'
    ? game.game_type.replace(/_/g, ' ').toUpperCase()
    : null
  const isFinal = game.is_final || game.status === 'Final'

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      {/* Hint */}
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 16, letterSpacing: 1, fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase' }}>
        📸 Screenshot to share · Tap anywhere to close
      </div>

      {/* The shareable card — designed for portrait phone screenshots */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'linear-gradient(160deg, #17171d 0%, #0d0d12 100%)',
          border: `2px solid ${C.accent}55`,
          borderRadius: 20,
          width: '100%', maxWidth: 360,
          padding: '32px 28px',
          boxShadow: `0 0 60px ${C.accent}22, 0 20px 60px rgba(0,0,0,0.8)`,
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Background texture lines */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          background: 'repeating-linear-gradient(45deg, #c9a84c 0px, #c9a84c 1px, transparent 1px, transparent 12px)',
          borderRadius: 20,
        }} />

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 28, position: 'relative' }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: C.muted, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
            DYNASTY UNIVERSE · {gameLabel || `WEEK ${game.week || '—'}`}
          </div>
          {gameLabel && (
            <div style={{
              display: 'inline-block',
              background: C.accent + '22', color: C.accent,
              border: `1px solid ${C.accent}55`,
              borderRadius: 4, padding: '3px 12px',
              fontSize: 11, fontFamily: "'Oswald', sans-serif",
              letterSpacing: 2, textTransform: 'uppercase',
            }}>{gameLabel}</div>
          )}
        </div>

        {/* Winner team */}
        <div style={{
          background: homeWon ? C.accent + '15' : awayWon ? C.accent + '15' : C.surface,
          borderRadius: 12, padding: '20px 20px',
          marginBottom: 4,
          border: `1px solid ${(homeWon || awayWon) ? C.accent + '44' : C.border}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: homeWon ? 26 : 22,
                fontWeight: 700,
                color: homeWon ? C.text : C.muted,
                lineHeight: 1.1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{game.home_team}</div>
              <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 }}>
                {homeWon ? '🏆 Winner · Home' : 'Home'}
              </div>
            </div>
            {isFinal && (
              <div style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: homeWon ? 52 : 40,
                color: homeWon ? C.accent : C.muted,
                lineHeight: 1, flexShrink: 0, marginLeft: 12,
              }}>{game.home_score}</div>
            )}
          </div>
        </div>

        {/* VS divider */}
        <div style={{ textAlign: 'center', padding: '8px 0', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 20, right: 20, top: '50%', height: 1, background: C.border }} />
          <span style={{
            position: 'relative', background: '#0d0d12',
            padding: '0 12px',
            fontFamily: "'Oswald', sans-serif", fontSize: 12,
            color: C.muted, letterSpacing: 3,
          }}>
            {isFinal ? 'FINAL' : 'VS'}
          </span>
        </div>

        {/* Away team */}
        <div style={{
          background: awayWon ? C.accent + '15' : C.surface,
          borderRadius: 12, padding: '20px 20px',
          marginTop: 4,
          border: `1px solid ${awayWon ? C.accent + '44' : C.border}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: awayWon ? 26 : 22,
                fontWeight: 700,
                color: awayWon ? C.text : C.muted,
                lineHeight: 1.1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{game.away_team}</div>
              <div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 3 }}>
                {awayWon ? '🏆 Winner · Away' : 'Away'}
              </div>
            </div>
            {isFinal && (
              <div style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: awayWon ? 52 : 40,
                color: awayWon ? C.accent : C.muted,
                lineHeight: 1, flexShrink: 0, marginLeft: 12,
              }}>{game.away_score}</div>
            )}
          </div>
        </div>

        {/* Footer branding */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 24, paddingTop: 16,
          borderTop: `1px solid ${C.border}`,
        }}>
          <div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: C.accent, letterSpacing: 2, fontWeight: 700 }}>DYNASTY</div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 8, color: C.muted, letterSpacing: 4 }}>UNIVERSE</div>
          </div>
          {game.week && (
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: C.muted, letterSpacing: 1 }}>
              WEEK {game.week}
            </div>
          )}
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, color: C.subtle, letterSpacing: 1 }}>
            CFB 26
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Season ─────────────────────────────────────────────────────
const WEEK_SHORT = { 0: 'Wk 0', 14: 'Conf Champ', 15: 'CFP R1', 16: 'CFP QF', 17: 'CFP SF', 18: 'Natl Champ' }
const SEASON_PHASES = [
  { range: [0,  0],  label: 'WEEK 0 — KICKOFF',      sub: 'Early openers · Non-conference · Dynasty begins here' },
  { range: [1,  4],  label: 'EARLY SEASON',           sub: 'Non-conference play · Records still forming' },
  { range: [5,  9],  label: 'CONFERENCE PLAY',        sub: 'Division races taking shape · Every loss stings' },
  { range: [10, 13], label: 'LATE SEASON',            sub: 'Rivalry week incoming · CFP positioning is everything' },
  { range: [14, 14], label: 'CONF. CHAMPIONSHIPS',    sub: 'Top 2 per conference · Trophies and CFP bids on the line' },
  { range: [15, 15], label: 'CFP FIRST ROUND',        sub: '12-team playoff begins · Road to the national title starts here' },
  { range: [16, 16], label: 'CFP QUARTERFINALS',      sub: '8 teams remain · One loss and your season is over' },
  { range: [17, 17], label: 'CFP SEMIFINALS',         sub: 'Final four · Two spots in the National Championship' },
  { range: [18, 99], label: 'NATIONAL CHAMPIONSHIP',  sub: 'One game · One champion · Dynasty legacy on the line' },
]
function getPhase(w) {
  return SEASON_PHASES.find(p => w >= p.range[0] && w <= p.range[1]) || { label: `WEEK ${w}`, sub: '' }
}

function Season({ games, teams, isMobile, settings }) {
  const humanNames = new Set(teams.map(t => (t.name || t.team_name || '').toLowerCase()))
  const currentWeek = settings?.current_week ?? 0
  const [selectedWeek, setSelectedWeek] = useState(currentWeek)
  const [sharingGame, setSharingGame] = useState(null)
  useEffect(() => { setSelectedWeek(currentWeek) }, [currentWeek])

  const weeksWithGames = new Set(games.map(g => g.week).filter(w => w != null))
  const allWeeks = Array.from({ length: 19 }, (_, i) => i) // 0–18
  const weekGames = games.filter(g => g.week === selectedWeek)
  const phase = getPhase(selectedWeek)

  return (
    <div>
      <SectionTitle isMobile={isMobile} sub={phase.sub}>{phase.label}</SectionTitle>

      {/* Week timeline bar */}
      <div style={{ overflowX: 'auto', marginBottom: 24, paddingBottom: 6, WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', gap: 5, minWidth: 'max-content' }}>
          {allWeeks.map(w => {
            const hasGames   = weeksWithGames.has(w)
            const hasFinal   = games.some(g => g.week === w && (g.is_final || g.status === 'Final'))
            const isSelected = w === selectedWeek
            const isCurrent  = w === currentWeek
            const label      = WEEK_SHORT[w] || `Wk ${w}`
            return (
              <button key={w} onClick={() => setSelectedWeek(w)} style={{
                position: 'relative', padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                whiteSpace: 'nowrap', fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: 0.4,
                border: `2px solid ${isSelected ? C.accent : isCurrent ? C.accent + '66' : hasGames ? C.border : C.subtle + '44'}`,
                background: isSelected ? C.accent : hasFinal ? C.surface : 'transparent',
                color: isSelected ? '#000' : hasGames ? C.text : C.subtle,
                fontWeight: isSelected || isCurrent ? 700 : 400,
                minHeight: 36,
              }}>
                {label}
                {isCurrent && !isSelected && (
                  <span style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: '50%', background: C.accent, border: `2px solid ${C.bg}` }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Games grid */}
      {weekGames.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '36px 20px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📅</div>
          <div style={{ color: C.text, fontFamily: "'Oswald', sans-serif", fontSize: 16, letterSpacing: 1, marginBottom: 8 }}>
            No games for Week {selectedWeek}
          </div>
          <div style={{ color: C.muted, fontSize: 13 }}>
            Scan a screenshot or upload a schedule Google Doc/Sheet to Drive, then import it from the Sync tab.
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {weekGames.map(g => {
            const isFinal   = g.is_final || g.status === 'Final'
            const homeWon   = isFinal && g.home_score > g.away_score
            const awayWon   = isFinal && g.away_score > g.home_score
            const homeHuman = humanNames.has((g.home_team || '').toLowerCase())
            const awayHuman = humanNames.has((g.away_team || '').toLowerCase())
            const gameLabel = g.game_type && g.game_type !== 'regular' ? g.game_type.replace(/_/g, ' ') : null
            return (
              <Card key={g.id} style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <Badge color={isFinal ? C.muted : C.blue}>{isFinal ? 'Final' : 'Scheduled'}</Badge>
                    {gameLabel && <Badge color={C.accent}>{gameLabel}</Badge>}
                  </div>
                  {isFinal && (
                    <button
                      onClick={() => setSharingGame(g)}
                      title="Share result"
                      style={{
                        background: 'transparent', border: `1px solid ${C.border}`,
                        borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
                        color: C.muted, fontSize: 13,
                        fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5,
                        transition: 'all 0.15s',
                      }}
                    >📤 Share</button>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isFinal ? 8 : 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {homeHuman && <span style={{ color: C.accent, fontSize: 9 }}>◆</span>}
                    <div>
                      <div style={{ color: homeWon ? C.text : isFinal ? C.muted : C.text, fontWeight: homeWon ? 700 : 400, fontSize: 15 }}>{g.home_team}</div>
                      <div style={{ color: C.subtle, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Home</div>
                    </div>
                  </div>
                  {isFinal && <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, color: homeWon ? C.accent : C.muted, lineHeight: 1 }}>{g.home_score}</span>}
                </div>
                {!isFinal && <div style={{ textAlign: 'center', fontFamily: "'Oswald', sans-serif", color: C.subtle, fontSize: 12, letterSpacing: 3, margin: '4px 0' }}>VS</div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    {awayHuman && <span style={{ color: C.accent, fontSize: 9 }}>◆</span>}
                    <div>
                      <div style={{ color: awayWon ? C.text : isFinal ? C.muted : C.text, fontWeight: awayWon ? 700 : 400, fontSize: 15 }}>{g.away_team}</div>
                      <div style={{ color: C.subtle, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' }}>Away</div>
                    </div>
                  </div>
                  {isFinal && <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 28, color: awayWon ? C.accent : C.muted, lineHeight: 1 }}>{g.away_score}</span>}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Season phase legend */}
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 24 }}>
        {SEASON_PHASES.map(p => {
          const active = selectedWeek >= p.range[0] && selectedWeek <= p.range[1]
          return (
            <div key={p.label} onClick={() => setSelectedWeek(p.range[0])} style={{
              padding: '5px 10px', borderRadius: 4, cursor: 'pointer',
              background: active ? C.accent + '22' : 'transparent',
              border: `1px solid ${active ? C.accent + '55' : C.subtle + '44'}`,
              color: active ? C.accent : C.subtle, fontSize: 11,
              fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5,
            }}>
              {p.range[0] === p.range[1] ? `Wk ${p.range[0]}` : `Wks ${p.range[0] === 0 ? '0' : p.range[0]}–${p.range[1]}`} · {p.label}
            </div>
          )
        })}
      </div>

      {/* Share card overlay */}
      {sharingGame && <ShareCard game={sharingGame} onClose={() => setSharingGame(null)} />}
    </div>
  )
}

// ── Player Stats ───────────────────────────────────────────────
function PlayerStats({ players, isMobile }) {
  const positions = ['ALL', ...new Set(players.map(p => p.pos))]
  const [pos, setPos] = useState('ALL')
  const filtered = pos === 'ALL' ? players : players.filter(p => p.pos === pos)
  const STAT_COLS = { QB: ['pass_yds','pass_td','int','rush_yds'], RB: ['rush_yds','rush_td','rec','rec_yds'], WR: ['rec','rec_yds','rec_td','yac'] }

  return (
    <div>
      <SectionTitle isMobile={isMobile} sub="Individual Season Statistics">Player Stats</SectionTitle>
      {players.length === 0
        ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
              <div style={{ color: C.muted, fontSize: 14, fontStyle: 'italic' }}>
                No legends have risen yet. Sync a player stats screenshot to begin tracking dynasty greats.
              </div>
            </div>
          </Card>
        )
        : (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {positions.map(p => <PillBtn key={p} small={isMobile} active={pos === p} onClick={() => setPos(p)}>{p}</PillBtn>)}
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {filtered.map(p => {
                const cols = STAT_COLS[p.pos] || Object.keys(p.stats || {}).slice(0, 4)
                return (
                  <Card key={p.id}>
                    <div style={{
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      alignItems: isMobile ? 'flex-start' : 'center',
                      gap: isMobile ? 12 : 16,
                    }}>
                      <div style={{ minWidth: 140 }}>
                        <Badge color={p.pos === 'QB' ? C.blue : p.pos === 'RB' ? C.green : C.accent}>{p.pos}</Badge>
                        <div style={{ color: C.text, fontWeight: 700, fontSize: 16, marginTop: 6 }}>{p.name}</div>
                        <div style={{ color: C.muted, fontSize: 12 }}>{p.team}</div>
                      </div>
                      <div style={{ display: 'flex', gap: isMobile ? 16 : 24, flexWrap: 'wrap' }}>
                        {cols.map(col => p.stats?.[col] !== undefined && (
                          <div key={col} style={{ textAlign: 'center' }}>
                            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 22 : 26, color: C.accent }}>{Number(p.stats[col]).toLocaleString()}</div>
                            <div style={{ color: C.muted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{col.replace(/_/g, ' ')}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </>
        )}
    </div>
  )
}

// ── Media Center ───────────────────────────────────────────────
function MediaCenter({ teams, games, players, commPin, onPinSet, isMobile }) {
  const [type, setType]       = useState('power_rankings')
  const [loading, setLoading] = useState(false)
  const [article, setArticle] = useState(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState(false)
  const [pastArticles, setPastArticles]     = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [viewingArticle, setViewingArticle] = useState(null)

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const res  = await fetch('/api/articles?limit=30')
      const data = await res.json()
      setPastArticles(data.articles || [])
    } catch (e) { console.error(e) }
    setLoadingHistory(false)
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  const TYPES = [
    { id: 'power-rankings',    label: 'Power Rankings',    icon: '📊' },
    { id: 'weekly-recap',      label: 'Weekly Recap',      icon: '📰' },
    { id: 'player-spotlight',  label: 'Player Spotlight',  icon: '⭐' },
    { id: 'rivalry-breakdown', label: 'Rivalry Breakdown', icon: '🔥' },
  ]

  const generate = async () => {
    setLoading(true); setArticle(null); setViewingArticle(null)
    try {
      const res = await fetch('/api/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleType: type, pin: commPin }),
      })
      const data = await res.json()
      if (data.error) {
        setArticle('❌ ' + data.error)
      } else {
        setArticle(data.article)
        loadHistory()
      }
    } catch (e) { setArticle('Error generating article.') }
    setLoading(false)
  }

  const tryPin = async () => {
    setPinError(false)
    const res = await fetch('/api/coaches/0', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinInput }),
    })
    if (res.status === 403) { setPinError(true); return }
    onPinSet(pinInput)
    setPinInput('')
  }

  return (
    <div>
      <SectionTitle isMobile={isMobile} sub="AI-Powered ESPN-Style Coverage">Media Center</SectionTitle>

      {!commPin && (
        <Card style={{ marginBottom: 20, maxWidth: 420 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>🔐 Commissioner Login</div>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 12 }}>Article generation requires commissioner access.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="password"
              value={pinInput}
              onChange={e => { setPinInput(e.target.value); setPinError(false) }}
              onKeyDown={e => e.key === 'Enter' && tryPin()}
              placeholder="Enter commissioner PIN"
              style={{
                flex: 1, background: C.surface, border: `1px solid ${pinError ? C.red : C.border}`,
                borderRadius: 6, padding: '12px 12px', color: C.text, fontSize: 14, outline: 'none',
              }}
            />
            <button onClick={tryPin} style={{
              background: C.accent, color: '#000', border: 'none', borderRadius: 6,
              padding: '12px 18px', cursor: 'pointer',
              fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: 0.5,
              minHeight: 48,
            }}>Unlock</button>
          </div>
          {pinError && <div style={{ color: C.red, fontSize: 12, marginTop: 6 }}>Incorrect PIN</div>}
        </Card>
      )}
      {commPin && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Badge color={C.green}>🔓 Commissioner Mode Active</Badge>
          <button onClick={() => onPinSet(null)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12 }}>Lock</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {TYPES.map(t => <PillBtn key={t.id} small={isMobile} active={type === t.id} onClick={() => setType(t.id)}>{t.icon} {t.label}</PillBtn>)}
      </div>
      <button onClick={generate} disabled={loading || !commPin} style={{
        background: !commPin ? C.subtle : loading ? C.subtle : C.accent,
        color: (!commPin || loading) ? C.muted : '#000',
        border: 'none', borderRadius: 8, padding: '14px 32px',
        cursor: (!commPin || loading) ? 'not-allowed' : 'pointer',
        fontFamily: "'Oswald', sans-serif", fontSize: 16, letterSpacing: 1,
        textTransform: 'uppercase', marginBottom: 24, width: isMobile ? '100%' : 'auto',
      }}>{loading ? '⏳ Generating...' : !commPin ? '🔒 Login to Generate' : '⚡ Generate Article'}</button>

      {article && (
        <Card style={{ marginBottom: 24 }}>
          {article.split('\n').map((line, i) => {
            if (!line.trim()) return <div key={i} style={{ height: 8 }} />
            const clean = line.replace(/^#+\s*/, '')
            const isHead = i === 0 || (line.length < 90 && (line.startsWith('#') || line === line.toUpperCase()))
            return isHead
              ? <div key={i} style={{ fontFamily: "'Oswald', sans-serif", fontSize: i === 0 ? (isMobile ? 20 : 26) : 15, color: i === 0 ? C.text : C.accent, letterSpacing: 1, marginBottom: 12, marginTop: i > 0 ? 18 : 0 }}>{clean}</div>
              : <p key={i} style={{ color: C.text, fontSize: isMobile ? 14 : 15, margin: '0 0 12px', lineHeight: 1.8 }}>{line}</p>
          })}
        </Card>
      )}

      <div style={{ marginTop: 36 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, color: C.text, letterSpacing: 1, textTransform: 'uppercase' }}>📰 Article Archive</div>
          <button onClick={loadHistory} disabled={loadingHistory} style={{ background: C.card, color: loadingHistory ? C.muted : C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 12 }}>
            {loadingHistory ? '⏳' : '🔄 Refresh'}
          </button>
        </div>

        {pastArticles.length === 0 && !loadingHistory && (
          <Card><p style={{ color: C.muted, margin: 0, fontSize: 13, fontStyle: 'italic' }}>No articles generated yet. Generate your first article above.</p></Card>
        )}

        <div style={{ display: 'grid', gap: 8 }}>
          {pastArticles.map(a => {
            const typeLabel = (a.article_type || 'article').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            return (
              <Card
                key={a.id}
                onClick={() => setViewingArticle(a)}
                style={{ display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <div style={{ fontSize: 22, flexShrink: 0 }}>📄</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.title || typeLabel}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge color={C.blue}>{typeLabel}</Badge>
                    {a.week && <Badge color={C.muted}>Wk {a.week}</Badge>}
                    <span style={{ color: C.muted, fontSize: 11 }}>{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
                <div style={{ color: C.muted, fontSize: 16, flexShrink: 0 }}>▶</div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* ── Article reader overlay ── */}
      {viewingArticle && (
        <div
          onClick={() => setViewingArticle(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 500,
            background: 'rgba(0,0,0,0.88)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: isMobile ? '0' : '32px 20px',
            overflowY: 'auto',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: isMobile ? 0 : 14,
              width: '100%', maxWidth: 740,
              minHeight: isMobile ? '100vh' : 'auto',
              padding: isMobile ? '24px 16px' : '32px 36px',
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge color={C.blue}>{(viewingArticle.article_type || '').replace(/-/g, ' ')}</Badge>
                {viewingArticle.week && <Badge color={C.accent}>Week {viewingArticle.week}</Badge>}
                <span style={{ color: C.subtle, fontSize: 11, alignSelf: 'center' }}>
                  {new Date(viewingArticle.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <button
                onClick={() => setViewingArticle(null)}
                style={{
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6,
                  color: C.text, cursor: 'pointer', padding: '6px 14px',
                  fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: 0.5,
                  flexShrink: 0, marginLeft: 12,
                }}
              >✕ Close</button>
            </div>

            {/* Article content */}
            {(viewingArticle.content || '').split('\n').map((line, i) => {
              if (!line.trim()) return <div key={i} style={{ height: 10 }} />
              const clean = line.replace(/^#+\s*/, '')
              const isHead = i === 0 || (line.length < 90 && (line.startsWith('#') || line === line.toUpperCase()))
              return isHead
                ? <div key={i} style={{ fontFamily: "'Oswald', sans-serif", fontSize: i === 0 ? (isMobile ? 22 : 28) : (isMobile ? 14 : 16), color: i === 0 ? C.text : C.accent, letterSpacing: 1, marginBottom: 14, marginTop: i > 0 ? 22 : 0 }}>{clean}</div>
                : <p key={i} style={{ color: C.text, fontSize: isMobile ? 14 : 15, margin: '0 0 14px', lineHeight: 1.85 }}>{line}</p>
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Week Controls (commissioner-only) ─────────────────────────
function WeekControls({ settings, commPin, onSettingsUpdate, isMobile, onRefresh }) {
  const [saving, setSaving]           = useState(false)
  const [msg, setMsg]                 = useState(null)
  const [recalculating, setRecalculating] = useState(false)
  const [recalcMsg, setRecalcMsg]     = useState(null)

  const recalcStandings = async () => {
    setRecalculating(true)
    setRecalcMsg(null)
    try {
      const res  = await fetch('/api/recalculate-standings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: commPin }),
      })
      const data = await res.json()
      if (res.ok) {
        setRecalcMsg({ ok: true, text: data.message })
        if (onRefresh) onRefresh()
      } else {
        setRecalcMsg({ ok: false, text: data.error || 'Failed to recalculate' })
      }
    } catch (e) {
      setRecalcMsg({ ok: false, text: e.message })
    }
    setRecalculating(false)
    setTimeout(() => setRecalcMsg(null), 4000)
  }
  const week = settings?.current_week ?? 0

  const setWeek = async (newWeek) => {
    if (newWeek < 0 || newWeek > 18) return
    setSaving(true); setMsg(null)
    try {
      const res = await fetch('/api/league-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: commPin, current_week: newWeek }),
      })
      const data = await res.json()
      if (res.ok) {
        onSettingsUpdate(data)
        setMsg({ ok: true, text: `Week set to ${newWeek}` })
      } else {
        setMsg({ ok: false, text: data.error || 'Failed to save' })
      }
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    }
    setSaving(false)
    setTimeout(() => setMsg(null), 2500)
  }

  const PHASE_LABEL = (w) => {
    if (w === 0) return 'Kickoff Weekend'
    if (w <= 4)  return 'Early Season'
    if (w <= 9)  return 'Conference Play'
    if (w <= 13) return 'Late Season'
    if (w === 14) return 'Conf. Championships'
    if (w === 15) return 'CFP First Round'
    if (w === 16) return 'CFP Quarterfinals'
    if (w === 17) return 'CFP Semifinals'
    return 'National Championship'
  }

  return (
    <Card style={{ marginBottom: 16, borderColor: C.purple + '44' }}>
      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.purple, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
        📅 Season Week Controls
      </div>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
        Set the official current week. The dashboard, AI articles, and narrative engine all use this as their anchor.
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {/* Decrement */}
        <button
          onClick={() => setWeek(week - 1)}
          disabled={saving || week <= 0}
          style={{
            background: C.surface, color: week <= 0 ? C.subtle : C.text,
            border: `1px solid ${C.border}`, borderRadius: 8,
            width: 44, height: 44, fontSize: 22, cursor: week <= 0 ? 'not-allowed' : 'pointer',
            fontFamily: "'Oswald', sans-serif", flexShrink: 0,
          }}
        >−</button>

        {/* Week display */}
        <div style={{ textAlign: 'center', minWidth: 120 }}>
          <div style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 42, fontWeight: 700,
            color: C.accent, lineHeight: 1,
          }}>
            {saving ? '…' : `Wk ${week}`}
          </div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
            {PHASE_LABEL(week)}
          </div>
        </div>

        {/* Increment */}
        <button
          onClick={() => setWeek(week + 1)}
          disabled={saving || week >= 18}
          style={{
            background: week >= 18 ? C.surface : C.accent,
            color: week >= 18 ? C.subtle : '#000',
            border: `1px solid ${week >= 18 ? C.border : C.accent}`,
            borderRadius: 8, width: 44, height: 44, fontSize: 22,
            cursor: week >= 18 ? 'not-allowed' : 'pointer',
            fontFamily: "'Oswald', sans-serif", flexShrink: 0,
          }}
        >+</button>

        {/* Quick-set buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {[0,1,5,10,14].map(w => (
            <button
              key={w}
              onClick={() => setWeek(w)}
              disabled={saving}
              style={{
                background: week === w ? C.purple + '33' : C.surface,
                color: week === w ? C.purple : C.muted,
                border: `1px solid ${week === w ? C.purple + '66' : C.border}`,
                borderRadius: 6, padding: '6px 12px',
                cursor: 'pointer',
                fontFamily: "'Oswald', sans-serif", fontSize: 12,
              }}
            >Wk {w}</button>
          ))}
        </div>
      </div>

      {msg && (
        <div style={{ marginTop: 12, color: msg.ok ? C.green : C.red, fontSize: 12 }}>
          {msg.ok ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {/* ── Recalculate Standings ── */}
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
          🔧 Fix Standings
        </div>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>
          If standings look wrong (wrong win count, missing teams, etc.), this recalculates everything from scratch using actual game results.
        </div>
        <button
          onClick={recalcStandings}
          disabled={recalculating}
          style={{
            background: recalculating ? C.subtle : C.surface,
            color: recalculating ? C.muted : C.text,
            border: `1px solid ${recalculating ? C.border : C.accent + '88'}`,
            borderRadius: 6, padding: '10px 20px',
            cursor: recalculating ? 'not-allowed' : 'pointer',
            fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: 0.5,
            minHeight: 42,
          }}
        >
          {recalculating ? '⏳ Recalculating...' : '🔄 Recalculate Standings'}
        </button>
        {recalcMsg && (
          <div style={{ marginTop: 8, color: recalcMsg.ok ? C.green : C.red, fontSize: 12 }}>
            {recalcMsg.ok ? '✅' : '❌'} {recalcMsg.text}
          </div>
        )}
      </div>
    </Card>
  )
}

// ── Drive Sync ─────────────────────────────────────────────────
function DriveSync({ onRefresh, existingScanLog, isMobile, settings, commPin, onSettingsUpdate }) {
  const [files, setFiles]       = useState([])
  const [loading, setLoading]   = useState(false)
  const [parsing, setParsing]   = useState(null)
  const [results, setResults]   = useState({})
  const [autoScanning, setAutoScanning] = useState(false)
  const [autoScanResult, setAutoScanResult] = useState(null)
  const [typeHint, setTypeHint] = useState('auto')

  const TYPE_HINTS = [
    { id: 'auto',        label: '✨ Auto-Detect',  desc: 'AI figures it out — works for any screenshot or doc' },
    { id: 'schedule',    label: '📅 Schedule',     desc: 'Full season schedule — imports upcoming matchups. Works with Google Docs, Sheets, or schedule screenshots.' },
    { id: 'standings',   label: '📊 Standings',    desc: 'Win/loss records, conference standings' },
    { id: 'scores',      label: '🏈 Scores',       desc: 'Scoreboards, game results' },
    { id: 'player_stats',label: '⭐ Player Stats',  desc: 'Stat leaders, individual numbers' },
    { id: 'recruiting',  label: '📋 Recruiting',   desc: 'Commitments, visits, offers' },
    { id: 'championship',label: '🏆 Championship', desc: 'Trophy screens, bowl/CFP results' },
  ]

  // Pre-populate results from existing scan_log on mount
  useEffect(() => {
    if (existingScanLog?.length > 0) {
      const prePopulated = {}
      existingScanLog.forEach(log => {
        if (log.file_id) {
          prePopulated[log.file_id] = {
            success: true,
            detectedType: log.data_type || 'data',
            preloaded: true,
            summary: log.records_parsed > 0
              ? `${log.records_parsed} record${log.records_parsed !== 1 ? 's' : ''} synced`
              : 'Previously synced',
          }
        }
      })
      setResults(prePopulated)
    }
  }, [existingScanLog])

  const loadFiles = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch('/api/drive-files')
      const data = await res.json()
      setFiles(data.files || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => { loadFiles() }, [loadFiles])

  const parse = async (file) => {
    setParsing(file.id)
    try {
      const res = await fetch('/api/parse-screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId:   file.id,
          mimeType: file.mimeType,
          fileName: file.name,
          typeHint: typeHint !== 'auto' ? typeHint : undefined,
        }),
      })
      const data = await res.json()
      setResults(r => ({ ...r, [file.id]: data }))
      if (data.success) onRefresh()
    } catch (e) {
      setResults(r => ({ ...r, [file.id]: { error: e.message } }))
    }
    setParsing(null)
  }

  const autoScanAll = async () => {
    setAutoScanning(true)
    setAutoScanResult(null)
    try {
      const res = await fetch('/api/auto-scan', { method: 'POST' })
      const data = await res.json()
      setAutoScanResult(data)
      if (data.processed > 0) {
        onRefresh()
        loadFiles()
      }
    } catch (e) {
      setAutoScanResult({ error: e.message })
    }
    setAutoScanning(false)
  }

  const getSavedSummary = (result) => {
    if (!result?.saved) return result?.summary || ''
    const { games, players, standings, championship, recruiting } = result.saved
    const parts = []
    if (games)      parts.push(`${games} game${games !== 1 ? 's' : ''}`)
    if (standings)  parts.push(`${standings} team${standings !== 1 ? 's' : ''}`)
    if (players)    parts.push(`${players} player${players !== 1 ? 's' : ''}`)
    if (recruiting) parts.push(`${recruiting} recruit${recruiting !== 1 ? 's' : ''}`)
    if (championship) parts.push('1 championship')
    if (result.preloaded) return result.summary || 'Previously synced'
    return parts.length ? parts.join(', ') + ' saved' : 'data saved'
  }

  const unscannedCount = files.filter(f => !results[f.id]?.success).length

  return (
    <div>
      <SectionTitle isMobile={isMobile} sub="Pull screenshots and Google Docs from your shared Drive folder">Drive Sync</SectionTitle>

      {/* Week Controls — commissioner only */}
      {commPin && (
        <WeekControls
          settings={settings}
          commPin={commPin}
          onSettingsUpdate={onSettingsUpdate}
          isMobile={isMobile}
          onRefresh={onRefresh}
        />
      )}
      {!commPin && (
        <Card style={{ marginBottom: 16, borderColor: C.purple + '22' }}>
          <div style={{ color: C.subtle, fontSize: 13, fontStyle: 'italic' }}>
            🔐 Log in as commissioner (Media tab) to access week controls and season settings.
          </div>
        </Card>
      )}

      {/* Auto-Scan All */}
      <Card style={{ marginBottom: 16, borderColor: C.accent + '33' }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>
          ⚡ Quick Scan
        </div>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
          Automatically scan all new files in your Drive folder at once. Previously synced files are skipped.
          {unscannedCount > 0 && <span style={{ color: C.accent }}> · {unscannedCount} new file{unscannedCount !== 1 ? 's' : ''} ready</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={autoScanAll} disabled={autoScanning || unscannedCount === 0} style={{
            background: autoScanning || unscannedCount === 0 ? C.subtle : C.accent,
            color: autoScanning || unscannedCount === 0 ? C.muted : '#000',
            border: 'none', borderRadius: 6, padding: '12px 22px',
            cursor: autoScanning || unscannedCount === 0 ? 'not-allowed' : 'pointer',
            fontFamily: "'Oswald', sans-serif", fontSize: 14, letterSpacing: 0.5, minHeight: 44,
          }}>
            {autoScanning ? '⏳ Scanning...' : unscannedCount === 0 ? '✅ All Synced' : `🔍 Scan ${unscannedCount} New File${unscannedCount !== 1 ? 's' : ''}`}
          </button>
          {autoScanResult && (
            <span style={{ color: autoScanResult.error ? C.red : C.green, fontSize: 13 }}>
              {autoScanResult.error ? `❌ ${autoScanResult.error}` : `✅ ${autoScanResult.message}`}
            </span>
          )}
        </div>
      </Card>

      {/* Type hint selector */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Scan Mode</div>
        <div style={{ color: C.muted, fontSize: 12, marginBottom: 12 }}>
          Auto-Detect works for everything. Use a specific type only if auto-detect gets it wrong.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TYPE_HINTS.map(t => (
            <PillBtn key={t.id} small active={typeHint === t.id} onClick={() => setTypeHint(t.id)}>
              {t.label}
            </PillBtn>
          ))}
        </div>
        {typeHint !== 'auto' && (
          <div style={{ marginTop: 10, color: C.muted, fontSize: 12 }}>
            {TYPE_HINTS.find(t => t.id === typeHint)?.desc}
          </div>
        )}
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ color: C.muted, fontSize: 13 }}>{files.length} file{files.length !== 1 ? 's' : ''} in Drive folder</div>
        <button onClick={loadFiles} disabled={loading} style={{ background: C.card, color: loading ? C.muted : C.text, border: `1px solid ${C.border}`, borderRadius: 6, padding: '10px 16px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 13, minHeight: 40 }}>
          {loading ? '⏳ Loading...' : '🔄 Refresh'}
        </button>
      </div>

      {files.length === 0 && !loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
            <div style={{ color: C.muted, fontSize: 13, fontStyle: 'italic' }}>
              No files found. Upload any CFB26 screenshot or Google Doc to the shared Drive folder, then hit Refresh.
            </div>
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gap: 10 }}>
        {files.map(file => {
          const result    = results[file.id]
          const isParsing = parsing === file.id
          const isDoc     = file.mimeType === 'application/vnd.google-apps.document'
          const savedSummary = getSavedSummary(result)

          return (
            <Card key={file.id} style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: 14,
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{isDoc ? '📄' : '🖼️'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                    {isDoc ? 'Google Doc' : 'Image'} · {new Date(file.createdTime).toLocaleString()}
                  </div>
                  {result?.success && (
                    <div style={{ marginTop: 5 }}>
                      <span style={{ color: C.green, fontSize: 12 }}>✅ </span>
                      <span style={{ color: C.accent, fontSize: 12, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5, textTransform: 'uppercase' }}>
                        {result.detectedType || 'data'}
                      </span>
                      <span style={{ color: C.green, fontSize: 12 }}> — {savedSummary}</span>
                    </div>
                  )}
                  {result?.error && <div style={{ color: C.red, fontSize: 12, marginTop: 4 }}>❌ {result.error}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignSelf: isMobile ? 'stretch' : 'center', flexDirection: isMobile ? 'column' : 'row' }}>
                {/* Re-scan button — always visible for synced files so schedule can be updated anytime */}
                {result?.success && !isParsing && (
                  <button
                    onClick={() => setResults(r => { const n = { ...r }; delete n[file.id]; return n })}
                    style={{
                      background: 'transparent',
                      color: C.muted,
                      border: `1px solid ${C.border}`,
                      borderRadius: 6, padding: '10px 14px',
                      cursor: 'pointer',
                      fontFamily: "'Oswald', sans-serif", fontSize: 12,
                      whiteSpace: 'nowrap', minHeight: 44,
                      width: isMobile ? '100%' : 'auto',
                    }}
                    title="Clear sync status and re-scan this file"
                  >
                    ↩ Re-scan
                  </button>
                )}
                <button
                  onClick={() => parse(file)}
                  disabled={isParsing || result?.success}
                  style={{
                    background: result?.success ? C.green + '22' : isParsing ? C.subtle : C.accent,
                    color:      result?.success ? C.green : isParsing ? C.muted : '#000',
                    border:     `1px solid ${result?.success ? C.green : C.accent}`,
                    borderRadius: 6, padding: '10px 18px',
                    cursor: result?.success || isParsing ? 'default' : 'pointer',
                    fontFamily: "'Oswald', sans-serif", fontSize: 13, whiteSpace: 'nowrap',
                    minHeight: 44,
                    width: isMobile ? '100%' : 'auto',
                  }}
                >
                  {result?.success ? '✅ Synced' : isParsing ? '⏳ Reading...' : '🔍 Scan with AI'}
                </button>
              </div>
            </Card>
          )
        })}
      </div>

      <Card style={{ marginTop: 20, borderColor: C.accent + '33' }}>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>How Drive Sync works</div>
        <ol style={{ color: C.muted, fontSize: 13, lineHeight: 2, margin: 0, paddingLeft: 20 }}>
          <li>Upload <strong style={{ color: C.text }}>any</strong> CFB26 screenshot or Google Doc to the shared Drive folder</li>
          <li>Hit <strong style={{ color: C.text }}>Refresh</strong> to see new files appear above</li>
          <li>Click <strong style={{ color: C.text }}>Scan All New Files</strong> or <strong style={{ color: C.text }}>Scan with AI</strong> individually</li>
          <li>Standings, scores, stats, recruiting, and championships update automatically</li>
        </ol>
      </Card>
    </div>
  )
}

// ── Root App ───────────────────────────────────────────────────
export default function App() {
  const isMobile = useMobile()
  const [tab, setTab]         = useState('Dashboard')
  const [data, setData]       = useState({ teams: [], games: [], players: [], scanLog: [], settings: { current_week: 0, current_season: 1 } })
  const [loadingData, setLoadingData] = useState(true)
  const [commPin, setCommPin] = useState(null)
  const [narrativeEntries, setNarrativeEntries] = useState([])
  const [articles, setArticles] = useState([])

  const fetchData = useCallback(async () => {
    try {
      const res  = await fetch('/api/league-data')
      const json = await res.json()
      setData(json)
    } catch (e) { console.error(e) }
    setLoadingData(false)
  }, [])

  const fetchNarrative = useCallback(async () => {
    try {
      const res = await fetch('/api/narrative?limit=6&types=game,recruiting')
      const json = await res.json()
      setNarrativeEntries(json.entries || [])
    } catch (e) { /* narrative is non-critical */ }
  }, [])

  const fetchArticles = useCallback(async () => {
    try {
      const res  = await fetch('/api/articles?limit=20')
      const json = await res.json()
      setArticles(json.articles || [])
    } catch (e) { /* articles are non-critical */ }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchNarrative() }, [fetchNarrative])
  useEffect(() => { fetchArticles() }, [fetchArticles])

  // Restore commissioner PIN from session
  useEffect(() => {
    const p = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('dynasty_comm_pin')
    if (p) setCommPin(p)
  }, [])

  return (
    <>
      <Head>
        <title>Dynasty Universe · CFB 26</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#09090b" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
      </Head>
      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body { margin: 0; background: ${C.bg}; font-family: 'Lato', sans-serif; color: ${C.text}; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${C.surface}; }
        ::-webkit-scrollbar-thumb { background: ${C.subtle}; border-radius: 3px; }
        button { -webkit-tap-highlight-color: transparent; }
        input { -webkit-appearance: none; }
      `}</style>

      {/* Top Nav */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1160, margin: '0 auto', padding: isMobile ? '0 12px' : '0 24px', display: 'flex', alignItems: 'center' }}>

          {/* Logo */}
          <div style={{ padding: isMobile ? '12px 12px 12px 0' : '16px 24px 16px 0', borderRight: `1px solid ${C.border}`, marginRight: isMobile ? 12 : 24, flexShrink: 0 }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 16 : 21, fontWeight: 700, letterSpacing: 2, color: C.accent, lineHeight: 1 }}>DYNASTY</div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, letterSpacing: 4, color: C.muted }}>UNIVERSE</div>
          </div>

          {/* Tabs — hidden on mobile (use bottom nav instead) */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: 2, flex: 1, overflowX: 'auto' }}>
              {TABS.map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  background: 'transparent', color: tab === t ? C.accent : C.muted,
                  border: 'none', borderBottom: `2px solid ${tab === t ? C.accent : 'transparent'}`,
                  padding: '20px 14px', cursor: 'pointer',
                  fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: 0.8,
                  textTransform: 'uppercase', transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
                }}>{t}</button>
              ))}
            </div>
          )}

          {/* Mobile: show current tab name */}
          {isMobile && (
            <div style={{ flex: 1, fontFamily: "'Oswald', sans-serif", fontSize: 13, color: C.text, letterSpacing: 1, textTransform: 'uppercase' }}>
              {tab}
            </div>
          )}

          {/* External links */}
          {!isMobile && (
            <div style={{ display: 'flex', gap: 16, paddingLeft: 16, flexShrink: 0 }}>
              <a href="/coaches" style={{ color: C.muted, fontSize: 13, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textDecoration: 'none', whiteSpace: 'nowrap' }}>👤 COACHES</a>
              <a href="/stream-watcher" style={{ color: C.muted, fontSize: 13, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textDecoration: 'none', whiteSpace: 'nowrap' }}>📺 STREAM</a>
            </div>
          )}
        </div>
      </div>

      {/* Score Ticker — only on the home tab */}
      {!loadingData && tab === 'Dashboard' && (
        <ScoreTicker games={data.games} setTab={setTab} isMobile={isMobile} />
      )}

      {/* Main content */}
      <div style={{
        maxWidth: 1160, margin: '0 auto',
        padding: isMobile ? '20px 12px 90px' : '36px 24px 40px',
      }}>
        {loadingData
          ? (
            <div style={{ color: C.muted, textAlign: 'center', paddingTop: 80, fontFamily: "'Oswald', sans-serif", letterSpacing: 2 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🏟️</div>
              LOADING DYNASTY DATA...
            </div>
          )
          : (
            <>
              {tab === 'Dashboard' && <Dashboard  {...data} isMobile={isMobile} narrativeEntries={narrativeEntries} settings={data.settings} setTab={setTab} articles={articles} onArticlesChange={fetchArticles} commPin={commPin} />}
              {tab === 'Standings' && <Standings  teams={data.teams} isMobile={isMobile} />}
              {tab === 'Season'    && <Season     games={data.games} teams={data.teams} isMobile={isMobile} settings={data.settings} />}
              {tab === 'Stats'     && <PlayerStats players={data.players} isMobile={isMobile} />}
              {tab === 'Media'     && (
                <MediaCenter
                  teams={data.teams} games={data.games} players={data.players}
                  commPin={commPin} isMobile={isMobile}
                  onPinSet={pin => {
                    setCommPin(pin)
                    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('dynasty_comm_pin', pin || '')
                  }}
                />
              )}
              {tab === 'Sync' && (
                <DriveSync
                  onRefresh={fetchData}
                  existingScanLog={data.scanLog}
                  isMobile={isMobile}
                  settings={data.settings}
                  commPin={commPin}
                  onSettingsUpdate={updated => setData(d => ({ ...d, settings: updated }))}
                />
              )}
            </>
          )}
      </div>

      {/* Bottom nav — mobile only */}
      {isMobile && <BottomNav tab={tab} setTab={setTab} />}
    </>
  )
}
