import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import Head from 'next/head'

// Logo override context — lets commissioners fix wrong team logos without code changes
const LogoCtx = createContext({ overrides: {}, setOverride: () => {}, resetOverrides: () => {} })

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

const ALL_TABS = ['Dashboard', 'Standings', 'Season', 'Awards', 'Media', 'Sync']

// ── Game status helper ─────────────────────────────────────────
// A game is only "final" if it has real scores — not null, not 0-0
function gameIsFinal(g) {
  if (!g) return false
  const flagged = g.is_final || g.status === 'Final'
  if (!flagged) return false
  if (g.home_score == null || g.away_score == null) return false
  if (g.home_score === 0 && g.away_score === 0) return false
  return true
}

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

// ── ESPN CDN Team Logo ─────────────────────────────────────────
const ESPN_IDS = {
  'air force': 2005, 'akron': 2006, 'alabama': 333, 'appalachian state': 2026,
  'arizona': 12, 'arizona state': 9, 'arkansas': 8, 'army': 349,
  'auburn': 2, 'ball state': 2050, 'baylor': 239, 'boise state': 68,
  'bowling green': 189, 'brigham young': 252, 'byu': 252, 'buffalo': 2084,
  'california': 25, 'cal': 25, 'central florida': 2116, 'ucf': 2116,
  'central michigan': 2117, 'cincinnati': 2132, 'clemson': 228,
  'coastal carolina': 324, 'colorado': 38, 'colorado state': 36,
  'duke': 150, 'east carolina': 151, 'florida': 57, 'florida state': 52,
  'fsu': 52, 'fresno state': 278, 'georgia': 61, 'georgia southern': 290,
  'georgia tech': 59, 'houston': 248, 'illinois': 356, 'indiana': 84,
  'iowa': 2294, 'iowa state': 66, 'james madison': 2561, 'kansas': 2305,
  'kansas state': 2306, 'kent state': 2309, 'kentucky': 96,
  'liberty': 2335, 'louisiana': 309, 'louisville': 97, 'lsu': 99,
  'maryland': 120, 'memphis': 235, 'miami': 2390, 'miami fl': 2390,
  'miami (fl)': 2390, 'miami oh': 193, 'miami university': 193,
  'michigan': 130, 'michigan state': 127, 'minnesota': 135,
  'mississippi': 145, 'ole miss': 145, 'mississippi state': 344,
  'missouri': 142, 'navy': 2426, 'nebraska': 158, 'nc state': 152,
  'north carolina': 153, 'unc': 153, 'northern illinois': 2459,
  'notre dame': 87, 'ohio': 195, 'ohio state': 194, 'oklahoma': 201,
  'oklahoma state': 197, 'old dominion': 2427, 'oregon': 2483,
  'oregon state': 204, 'penn state': 213, 'pittsburgh': 221, 'pitt': 221,
  'purdue': 2509, 'rutgers': 164, 'sam houston': 2534, 'smu': 2567,
  'south alabama': 6, 'south carolina': 2579, 'southern california': 30,
  'usc': 30, 'stanford': 24, 'syracuse': 183, 'tcu': 2628,
  'temple': 218, 'tennessee': 2633, 'texas': 251, 'texas a&m': 245,
  'texas tech': 2641, 'toledo': 2649, 'troy': 2653, 'tulane': 2655,
  'tulsa': 202, 'ucla': 26, 'utah': 254, 'utah state': 328,
  'vanderbilt': 238, 'virginia': 258, 'virginia tech': 259,
  'wake forest': 154, 'washington': 264, 'washington state': 265,
  'west virginia': 277, 'western michigan': 269, 'wisconsin': 275,
  'wyoming': 278,
  // Sun Belt / C-USA / non-Power teams often missing
  'texas state': 326, 'texas state bobcats': 326,
  'utep': 2638, 'ut el paso': 2638,
  'north texas': 249, 'mean green': 249,
  'louisiana tech': 2348, 'la tech': 2348,
  'middle tennessee': 2393, 'mtsu': 2393,
  'western kentucky': 98, 'wku': 98,
  'marshall': 276,
  'southern miss': 2572, 'usm': 2572,
  'florida atlantic': 2226, 'fau': 2226,
  'florida international': 2229, 'fiu': 2229,
  'charlotte': 2429, 'uab': 2649,
  'rice': 242, 'utsa': 2636,
  'new mexico': 167, 'new mexico state': 166, 'nmsu': 166,
  'hawaii': 62, 'nevada': 2440, 'unlv': 2439,
  'boise state': 68, 'fresno state': 278, 'san diego state': 21,
  'san jose state': 23, 'air force': 2005,
  'army': 349, 'navy': 2426,
  'ohio': 195, 'miami oh': 193, 'miami ohio': 193,
  'ball state': 2050, 'bowling green': 189, 'buffalo': 2084,
  'central michigan': 2117, 'eastern michigan': 2199,
  'kent state': 2309, 'northern illinois': 2459,
  'western michigan': 269, 'toledo': 2649, 'akron': 2006,
}
function getEspnId(name, overrides = {}) {
  if (!name) return null
  const key = name.toLowerCase().trim()
  // Check per-team overrides first (commissioner-set)
  if (overrides[key] === 'none') return null
  if (typeof overrides[key] === 'number') return overrides[key]
  if (ESPN_IDS[key] != null) return ESPN_IDS[key]
  // Fuzzy: only match if the STORED key contains our search term (never the reverse,
  // which caused e.g. "texas state" → matching "texas" ID)
  for (const [k, id] of Object.entries(ESPN_IDS)) {
    if (k !== key && k.includes(key)) return id
  }
  return null
}
const BADGE_COLORS = ['#c9a84c','#9b7fd4','#4a90d9','#4caf7d','#e07b52','#52c0e0','#e052a0']
function teamBadgeColor(name) {
  let h = 0
  for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff
  return BADGE_COLORS[Math.abs(h) % BADGE_COLORS.length]
}
function TeamLogo({ team, size = 24 }) {
  const { overrides } = useContext(LogoCtx)
  const id = getEspnId(team, overrides)
  const [failed, setFailed] = useState(!id)
  const initials = (team || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const color = teamBadgeColor(team)
  if (failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: Math.round(size * 0.18),
        background: color + '22', border: `1px solid ${color}66`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: Math.round(size * 0.38),
        fontFamily: "'Oswald', sans-serif", fontWeight: 700, color,
      }}>{initials}</div>
    )
  }
  return (
    <img
      src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${id}.png`}
      alt={team} width={size} height={size}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  )
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
const ALL_NAV_ITEMS = [
  { id: 'Dashboard', icon: '🏠', label: 'Home' },
  { id: 'Standings', icon: '📊', label: 'Standings' },
  { id: 'Season',    icon: '📅', label: 'Season' },
  { id: 'Media',     icon: '📰', label: 'Media' },
  { id: 'Awards',    icon: '🏆', label: 'Awards' },
  { id: 'Coaches',   icon: '👤', label: 'Coaches', href: '/coaches' },
  { id: 'Sync',      icon: '🔄', label: 'Sync' },
]

function BottomNav({ tab, setTab, commPin }) {
  const navItems = commPin ? ALL_NAV_ITEMS : ALL_NAV_ITEMS.filter(i => i.id !== 'Sync')
  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: C.surface, borderTop: `2px solid ${C.border}`,
      display: 'flex', zIndex: 200,
      paddingBottom: 'env(safe-area-inset-bottom)',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.4)',
    }}>
      {navItems.map(item => {
        const isActive = item.href ? false : tab === item.id
        return (
          <button
            key={item.id}
            onClick={() => item.href ? (window.location.href = item.href) : setTab(item.id)}
            style={{
              flex: 1, background: isActive ? C.accent + '12' : 'transparent',
              border: 'none',
              padding: '10px 2px 8px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 3,
              color: isActive ? C.accent : C.muted,
              borderTop: `2px solid ${isActive ? C.accent : 'transparent'}`,
              transition: 'all 0.15s',
              minHeight: 58,
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
            <span style={{
              fontSize: 9, fontFamily: "'Oswald', sans-serif",
              letterSpacing: 0.5, textTransform: 'uppercase',
              fontWeight: isActive ? 700 : 400,
            }}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Score Ticker ────────────────────────────────────────────────
function ScoreTicker({ games, setTab, isMobile, settings }) {
  const currentWeek = settings?.current_week ?? 0

  // Prefer showing the current week's games (finals or upcoming).
  // If no games exist for the current week yet, fall back to recent finals.
  const weekGames    = games.filter(g => g.week === currentWeek && g.home_team && g.away_team)
  const weekFinals   = weekGames.filter(gameIsFinal)
  const weekUpcoming = weekGames.filter(g => !gameIsFinal(g))

  let displayGames, mode
  if (weekGames.length > 0) {
    // Show finals first, then upcoming for the current week
    displayGames = [...weekFinals, ...weekUpcoming]
    mode = weekFinals.length > 0 && weekUpcoming.length === 0 ? 'scores' : 'upcoming'
  } else {
    // No games for current week yet — show most recent finals across all weeks
    displayGames = [...games].filter(gameIsFinal).reverse().slice(0, 14)
    mode = 'scores'
  }

  if (displayGames.length === 0) return null

  const label = mode === 'upcoming' ? `WK ${currentWeek} UPCOMING` : 'SCORES'
  const labelBg = mode === 'upcoming' ? '#1a4fd6' : C.accent
  const labelColor = mode === 'upcoming' ? '#fff' : '#000'

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
        {/* Label pill */}
        <div style={{
          flexShrink: 0, padding: isMobile ? '7px 12px' : '8px 16px',
          background: labelBg,
          display: 'flex', alignItems: 'center',
          fontFamily: "'Oswald', sans-serif",
          fontSize: 10, fontWeight: 700, letterSpacing: 2.5, color: labelColor,
          textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>{label}</div>

        {displayGames.map((g, i) => {
          const isFinal = gameIsFinal(g)
          const homeWon = isFinal && g.home_score > g.away_score
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden', maxWidth: 85 }}>
                  <TeamLogo team={g.home_team} size={16} />
                  <span style={{ color: isFinal ? (homeWon ? C.text : C.muted) : C.text, fontSize: 11, fontWeight: homeWon ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.home_team}</span>
                </div>
                {isFinal
                  ? <span style={{ fontFamily: "'Oswald', sans-serif", color: homeWon ? C.accent : C.muted, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{g.home_score}</span>
                  : <span style={{ fontFamily: "'Oswald', sans-serif", color: '#1a4fd6', fontSize: 9, fontWeight: 700, flexShrink: 0, letterSpacing: 0.5 }}>HOME</span>
                }
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden', maxWidth: 85 }}>
                  <TeamLogo team={g.away_team} size={16} />
                  <span style={{ color: isFinal ? (!homeWon ? C.text : C.muted) : C.text, fontSize: 11, fontWeight: !homeWon && isFinal ? 700 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.away_team}</span>
                </div>
                {isFinal
                  ? <span style={{ fontFamily: "'Oswald', sans-serif", color: !homeWon ? C.accent : C.muted, fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{g.away_score}</span>
                  : <span style={{ fontFamily: "'Oswald', sans-serif", color: C.muted, fontSize: 9, fontWeight: 700, flexShrink: 0, letterSpacing: 0.5 }}>AWAY</span>
                }
              </div>
              <div style={{ fontSize: 8, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', fontFamily: "'Oswald', sans-serif" }}>
                WK {g.week} · {isFinal ? 'FINAL' : 'SCHEDULED'}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Dashboard (ESPN Style) ─────────────────────────────────────
const ARTICLE_TYPE_LABELS = {
  'power-rankings':    { label: 'Power Rankings',    icon: '🏆' },
  'weekly-recap':      { label: 'Weekly Recap',      icon: '📋' },
  'player-spotlight':  { label: 'Player Spotlight',  icon: '⭐' },
  'rivalry-breakdown': { label: 'Rivalry Breakdown', icon: '🔥' },
  'matchup-preview':   { label: 'Matchup Preview',   icon: '🏈' },
  'league-preview':    { label: 'League Preview',    icon: '📅' },
}

// ── AP Rankings helper ─────────────────────────────────────────────────────────
function getApRank(teamName, apRankings = []) {
  if (!teamName || !apRankings?.length) return null
  const n = teamName.toLowerCase().trim()
  const entry = apRankings.find(r => (r.team_name || '').toLowerCase().trim() === n)
  return entry ? entry.rank : null
}

function ApRankBadge({ rank, style = {} }) {
  if (!rank) return null
  return (
    <span style={{
      display: 'inline-block',
      fontFamily: "'Oswald', sans-serif",
      fontSize: 10,
      fontWeight: 700,
      color: '#b8960c',
      background: 'rgba(184,150,12,0.12)',
      border: '1px solid rgba(184,150,12,0.35)',
      borderRadius: 4,
      padding: '1px 5px',
      marginRight: 5,
      verticalAlign: 'middle',
      letterSpacing: 0.5,
      ...style,
    }}>#{rank}</span>
  )
}

function Dashboard({ teams, games, players, scanLog, isMobile, narrativeEntries, settings, setTab, articles = [], onArticlesChange, commPin, onArticleOpen, heismanCandidates = [], championships = [] }) {
  const finalGames  = games.filter(gameIsFinal)
  const currentWeek = settings?.current_week ?? 0

  const rankedTeams = [...teams]
    .filter(t => t.coach && t.coach.trim() !== '')  // only user-coached teams
    .sort((a, b) => {
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
  // Logo override UI state
  const [logoSearch,   setLogoSearch]   = useState('')
  const [logoCustomId, setLogoCustomId] = useState({})
  const { overrides: logoOverrides, setOverride: setLogoOverride, resetOverrides } = useContext(LogoCtx)

  // Derived values
  const featuredArticleId = settings?.featured_article_id ?? null
  const featuredArticle   = articles.find(a => a.id === featuredArticleId) || articles[0] || null
  const otherArticles     = articles.filter(a => a.id !== featuredArticle?.id).slice(0, 4)
  const heroImageId       = settings?.hero_image_id   ?? null
  const heroImageMime     = settings?.hero_image_mime ?? 'image/png'
  const heroImageSrc      = heroImageId ? `/api/drive-image?id=${heroImageId}&mime=${encodeURIComponent(heroImageMime)}` : null
  const featuredGameId    = settings?.featured_game_id != null ? Number(settings.featured_game_id) : null
  const featuredGame      = games.find(g => Number(g.id) === featuredGameId) || [...finalGames].reverse()[0] || null
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

  function openPicker(picTab) {
    const opening = !showPicker || pickerTab !== picTab
    setPickerTab(picTab); setShowPicker(opening)
    setShowPinEntry(false); setPinError('')
    if (opening && picTab === 'image') loadDriveFiles()
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
      else if (type === 'game')  runSave({ featured_game_id: Number(payload) }, commPin, setPinningId)
    } else {
      setPendingAction({ type, payload }); setShowPinEntry(true)
    }
  }

  function handlePinSubmit() {
    if (!pickerPin || !pendingAction) return
    const { type, payload } = pendingAction
    if (type === 'article') runSave({ featured_article_id: payload }, pickerPin, setPinningId)
    else if (type === 'image') runSave({ hero_image_id: payload.id, hero_image_mime: payload.mimeType }, pickerPin, setSavingImage)
    else if (type === 'game')  runSave({ featured_game_id: Number(payload) }, pickerPin, setPinningId)
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
      {commPin && (articles.length > 0 || finalGames.length > 0) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginRight: 4 }}>📌 Commissioner</span>
          {articles.length > 0 && (
            <button onClick={() => openPicker('article')} style={{ background: showPicker && pickerTab==='article' ? C.purple+'33' : 'transparent', color: showPicker && pickerTab==='article' ? C.purple : C.muted, border: `1px solid ${showPicker && pickerTab==='article' ? C.purple+'66' : C.border}`, borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>📰 Story</button>
          )}
          <button onClick={() => openPicker('image')} style={{ background: showPicker && pickerTab==='image' ? C.blue+'33' : 'transparent', color: showPicker && pickerTab==='image' ? C.blue : C.muted, border: `1px solid ${showPicker && pickerTab==='image' ? C.blue+'66' : C.border}`, borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>🖼️ Image</button>
          {finalGames.length > 0 && (
            <button onClick={() => openPicker('game')} style={{ background: showPicker && pickerTab==='game' ? C.green+'33' : 'transparent', color: showPicker && pickerTab==='game' ? C.green : C.muted, border: `1px solid ${showPicker && pickerTab==='game' ? C.green+'66' : C.border}`, borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>🏈 Game</button>
          )}
          <button onClick={() => openPicker('logos')} style={{ background: showPicker && pickerTab==='logos' ? C.red+'33' : 'transparent', color: showPicker && pickerTab==='logos' ? C.red : C.muted, border: `1px solid ${showPicker && pickerTab==='logos' ? C.red+'66' : C.border}`, borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 9, letterSpacing: 1.5, textTransform: 'uppercase' }}>🖼 Logos</button>
        </div>
      )}

      {/* ── COMMISSIONER PICKER PANEL ── */}
      {showPicker && (
        <Card style={{ marginBottom: 20, padding: '16px 18px', borderColor: pickerTab==='article' ? C.purple+'44' : pickerTab==='image' ? C.blue+'44' : pickerTab==='logos' ? C.red+'44' : C.green+'44', background: C.surface }}>
          {/* Tab row */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
            {articles.length > 0 && <button onClick={() => setPickerTab('article')} style={{ background: pickerTab==='article' ? C.purple+'33' : 'transparent', color: pickerTab==='article' ? C.purple : C.muted, border: `1px solid ${pickerTab==='article' ? C.purple+'55' : C.border}`, borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 10, letterSpacing: 1 }}>📰 Pick Story</button>}
            <button onClick={() => { setPickerTab('image'); loadDriveFiles() }} style={{ background: pickerTab==='image' ? C.blue+'33' : 'transparent', color: pickerTab==='image' ? C.blue : C.muted, border: `1px solid ${pickerTab==='image' ? C.blue+'55' : C.border}`, borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 10, letterSpacing: 1 }}>🖼️ Pick Image</button>
            {finalGames.length > 0 && <button onClick={() => setPickerTab('game')} style={{ background: pickerTab==='game' ? C.green+'33' : 'transparent', color: pickerTab==='game' ? C.green : C.muted, border: `1px solid ${pickerTab==='game' ? C.green+'55' : C.border}`, borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 10, letterSpacing: 1 }}>🏈 Pick Game</button>}
            <button onClick={() => setPickerTab('logos')} style={{ background: pickerTab==='logos' ? C.red+'33' : 'transparent', color: pickerTab==='logos' ? C.red : C.muted, border: `1px solid ${pickerTab==='logos' ? C.red+'55' : C.border}`, borderRadius: 5, padding: '5px 12px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 10, letterSpacing: 1 }}>🖼 Fix Logos</button>
          </div>

          <PinEntry />
          {/* Error banner — visible even when commPin already set */}
          {pinError && !showPinEntry && (
            <div style={{ color: C.red, fontSize: 12, background: C.red+'11', border: `1px solid ${C.red}33`, borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}>❌ {pinError}</div>
          )}

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
                const isActive = Number(g.id) === featuredGameId
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

          {/* LOGO OVERRIDES */}
          {pickerTab === 'logos' && (() => {
            // Collect all unique team names from games + standings
            const allTeamNames = [...new Set([
              ...teams.map(t => t.name),
              ...finalGames.flatMap(g => [g.home_team, g.away_team]),
            ].filter(Boolean))]
            const filtered = logoSearch.trim()
              ? allTeamNames.filter(n => n.toLowerCase().includes(logoSearch.toLowerCase()))
              : allTeamNames
            return (
              <div>
                <div style={{ color: C.muted, fontSize: 12, marginBottom: 10, lineHeight: 1.5 }}>
                  Find a team with a wrong logo and remove it or set a custom ESPN team ID. Changes save locally in your browser.
                </div>
                <input
                  placeholder="Search team…"
                  value={logoSearch}
                  onChange={e => setLogoSearch(e.target.value)}
                  style={{ width: '100%', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 13, marginBottom: 10, boxSizing: 'border-box' }}
                />
                {Object.keys(logoOverrides).length > 0 && (
                  <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: C.muted, fontSize: 11 }}>{Object.keys(logoOverrides).length} override{Object.keys(logoOverrides).length !== 1 ? 's' : ''} active</span>
                    <button onClick={() => resetOverrides()} style={{ background: 'transparent', color: C.red, border: `1px solid ${C.red}44`, borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontSize: 10, fontFamily: "'Oswald', sans-serif", letterSpacing: 1 }}>Reset All</button>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                  {filtered.slice(0, 40).map(name => {
                    const key = name.toLowerCase()
                    const override = logoOverrides[key]
                    const hasOverride = override != null
                    return (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 7, background: hasOverride ? C.red+'0a' : C.card, border: `1px solid ${hasOverride ? C.red+'44' : C.border}` }}>
                        <TeamLogo team={name} size={28} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: C.text, fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                          {hasOverride && <div style={{ color: C.red, fontSize: 10, fontFamily: "'Oswald', sans-serif", letterSpacing: 1 }}>{override === 'none' ? 'LOGO HIDDEN' : `CUSTOM ID: ${override}`}</div>}
                        </div>
                        {hasOverride
                          ? <button onClick={() => setLogoOverride(name, null)} style={{ background: 'transparent', color: C.green, border: `1px solid ${C.green}44`, borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 10, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, whiteSpace: 'nowrap' }}>↩ Restore</button>
                          : <>
                              <input
                                type="number"
                                placeholder="ESPN ID"
                                value={logoCustomId[name] || ''}
                                onChange={e => setLogoCustomId(p => ({ ...p, [name]: e.target.value }))}
                                style={{ width: 80, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 8px', color: C.text, fontSize: 11 }}
                              />
                              {logoCustomId[name] && (
                                <button onClick={() => { setLogoOverride(name, parseInt(logoCustomId[name])); setLogoCustomId(p => ({ ...p, [name]: '' })) }} style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 10, fontFamily: "'Oswald', sans-serif", fontWeight: 700, whiteSpace: 'nowrap' }}>Set ID</button>
                              )}
                              <button onClick={() => setLogoOverride(name, 'none')} style={{ background: 'transparent', color: C.red, border: `1px solid ${C.red}44`, borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontSize: 10, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, whiteSpace: 'nowrap' }}>✕ Remove</button>
                            </>
                        }
                      </div>
                    )
                  })}
                  {filtered.length === 0 && <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', padding: '16px 0' }}>No teams found</div>}
                </div>
              </div>
            )
          })()}
        </Card>
      )}

      {/* ── HERO ROW: Article (left) + Game Score (right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.55fr 1fr', gap: 20, marginBottom: 24, alignItems: 'stretch' }}>

        {/* LEFT: Featured Article Hero */}
        {featuredArticle ? (() => {
          const meta    = ARTICLE_TYPE_LABELS[featuredArticle.article_type] || { label: featuredArticle.article_type, icon: '📄' }
          const preview = (featuredArticle.content || '').replace(/[#*`_]/g, '').slice(0, 320).trim()
          return (
            <Card onClick={() => onArticleOpen && onArticleOpen(featuredArticle)} style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', borderLeft: `3px solid ${C.purple}`, cursor: 'pointer' }}>
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
                  <span style={{ color: C.purple, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: 'uppercase' }}>Read Full Story →</span>
                </div>
              </div>
            </Card>
          )
        })() : (
          <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', borderStyle: 'dashed', minHeight: 200 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📰</div>
            <div style={{ color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>Stories from the Media tab will appear here.<br />Use "📰 Story" above to pin one.</div>
            <button onClick={() => setTab('Media')} style={{ marginTop: 14, background: 'transparent', border: 'none', color: C.accent, fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, textTransform: 'uppercase', cursor: 'pointer', padding: 0 }}>Go to Media Tab →</button>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <TeamLogo team={featuredGame.home_team} size={isMobile ? 32 : 40} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 20 : 26, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 110 : 150 }}>{featuredGame.home_team}</div>
                    {fgHomeWon && <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 8, color: C.accent, letterSpacing: 2, marginTop: 2 }}>🏆 WINNER</div>}
                  </div>
                </div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 44 : 60, fontWeight: 700, color: fgHomeWon ? C.accent : '#3a3a4a', lineHeight: 1, flexShrink: 0 }}>{featuredGame.home_score}</div>
              </div>
              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: C.muted, letterSpacing: 3 }}>VS</span>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
              {/* Away */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: fgAwayWon ? 1 : 0.45 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <TeamLogo team={featuredGame.away_team} size={isMobile ? 32 : 40} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 20 : 26, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: isMobile ? 110 : 150 }}>{featuredGame.away_team}</div>
                    {fgAwayWon && <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 8, color: C.accent, letterSpacing: 2, marginTop: 2 }}>🏆 WINNER</div>}
                  </div>
                </div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 44 : 60, fontWeight: 700, color: fgAwayWon ? C.accent : '#3a3a4a', lineHeight: 1, flexShrink: 0 }}>{featuredGame.away_score}</div>
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
            ? <Card style={{ padding: '24px 16px', textAlign: 'center', borderStyle: 'dashed' }}><div style={{ fontSize: 28, marginBottom: 8 }}>📰</div><div style={{ color: C.muted, fontSize: 13 }}>More stories will appear here</div></Card>
            : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {otherArticles.map(a => {
                  const meta = ARTICLE_TYPE_LABELS[a.article_type] || { label: a.article_type, icon: '📄' }
                  const snippet = (a.content || '').replace(/[#*`_]/g,'').slice(0,140).trim()
                  return (
                    <Card key={a.id} onClick={() => onArticleOpen && onArticleOpen(a)} style={{ padding: '14px 16px', borderLeft: `3px solid ${C.purple}44`, cursor: 'pointer', transition: 'border-color 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.borderLeftColor = C.purple}
                      onMouseLeave={e => e.currentTarget.style.borderLeftColor = C.purple + '44'}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{meta.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 8, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 }}>{meta.label}{a.week ? ` · Wk ${a.week}` : ''}</div>
                          <div style={{ color: C.text, fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginBottom: 5 }}>{a.title || meta.label}</div>
                          <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.55 }}>{snippet}{snippet.length>=140?'…':''}</div>
                          <span style={{ display: 'inline-block', marginTop: 8, color: C.purple, fontSize: 10, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: 'uppercase' }}>Read →</span>
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

      {/* ── HEISMAN WATCH WIDGET ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <SectionLabel color={C.accent}>Heisman Watch</SectionLabel>
          <a href="/heisman-watch" style={{ fontSize: 11, color: C.muted, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textDecoration: 'none', textTransform: 'uppercase' }}>
            Full View →
          </a>
        </div>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {/* Gold header bar */}
          <div style={{ background: C.accent, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14 }}>🏆</span>
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, fontWeight: 700, color: C.bg, letterSpacing: 2 }}>HEISMAN TROPHY</span>
          </div>
          {heismanCandidates.length === 0 ? (
            <div style={{ padding: '20px 16px', color: C.muted, fontSize: 12, textAlign: 'center', fontFamily: "'Oswald', sans-serif", letterSpacing: 1 }}>
              No candidates yet — sync a Heisman Watch screenshot from the Sync tab
            </div>
          ) : (
            <div>
              {/* Column headers — RK | POS | NAME/TEAM | YEAR | CHANGE */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '36px 56px 1fr 90px 60px',
                padding: '7px 16px', gap: 12,
                background: C.surface, borderBottom: `1px solid ${C.border}`,
                fontFamily: "'Oswald', sans-serif", fontSize: 10, color: C.muted, letterSpacing: 1, fontWeight: 700,
              }}>
                <div>RK</div>
                <div>POS</div>
                <div>NAME / TEAM</div>
                <div style={{ textAlign: 'center' }}>YEAR</div>
                <div style={{ textAlign: 'center' }}>CHANGE</div>
              </div>
              {heismanCandidates.map((c, i) => (
                <div key={c.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 56px 1fr 90px 60px',
                  gap: 12, padding: '10px 16px',
                  borderBottom: i < heismanCandidates.length - 1 ? `1px solid ${C.border}` : 'none',
                  alignItems: 'center',
                  background: i === 0 ? C.accent + '09' : 'transparent',
                }}>
                  {/* Rank badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 22, height: 22,
                      background: i === 0 ? C.accent : C.subtle,
                      color: i === 0 ? C.bg : C.muted,
                      borderRadius: 3,
                      fontFamily: "'Oswald', sans-serif", fontSize: 11, fontWeight: 700,
                    }}>{c.rank}</span>
                  </div>
                  {/* Position */}
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: C.muted, fontWeight: 700, letterSpacing: 0.5 }}>
                    {c.position || '—'}
                  </div>
                  {/* Name / Team */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: C.text, fontWeight: 700, letterSpacing: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.player_name}
                    </div>
                    <div style={{ fontSize: 10, color: C.accent, letterSpacing: 0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.team_name}
                    </div>
                  </div>
                  {/* Class year */}
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: C.text, textAlign: 'center' }}>
                    {c.class_year || '—'}
                  </div>
                  {/* Trend arrow */}
                  <div style={{ textAlign: 'center', fontSize: 14 }}>
                    {c.trend === 'up'   && <span style={{ color: C.green }}>▲</span>}
                    {c.trend === 'down' && <span style={{ color: C.red }}>▼</span>}
                    {(!c.trend || c.trend === 'same') && <span style={{ color: C.muted, fontSize: 11 }}>—</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* ── NEXT MATCHUP PREVIEW ── */}
      {(() => {
        const upcoming = games.filter(g => !gameIsFinal(g) && g.home_team && g.away_team)
        if (upcoming.length === 0) return null
        const g = upcoming[0]
        const finalGs = games.filter(gameIsFinal)
        const h2h = finalGs.filter(x =>
          (x.home_team === g.home_team && x.away_team === g.away_team) ||
          (x.home_team === g.away_team && x.away_team === g.home_team)
        ).sort((a, b) => b.week - a.week)
        let homeH2H = 0, awayH2H = 0
        h2h.forEach(m => {
          const hw = m.home_score > m.away_score
          if ((m.home_team === g.home_team && hw) || (m.away_team === g.home_team && !hw)) homeH2H++
          else awayH2H++
        })
        const homeTeam = teams.find(t => t.name === g.home_team)
        const awayTeam = teams.find(t => t.name === g.away_team)
        const dashApRankings = settings?.ap_rankings || []
        const homeApRank = getApRank(g.home_team, dashApRankings)
        const awayApRank = getApRank(g.away_team, dashApRankings)
        return (
          <div style={{ marginBottom: 24 }}>
            <SectionLabel color={C.accent}>Next Matchup</SectionLabel>
            <Card style={{ padding: 0, overflow: 'hidden', borderLeft: `3px solid ${C.accent}` }}>
              <div style={{ padding: '10px 18px', borderBottom: `1px solid ${C.border}`, background: C.surface, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: C.muted, letterSpacing: 3, textTransform: 'uppercase' }}>Week {g.week} · Upcoming</span>
                <button onClick={() => setTab('Matchups')} style={{ background: 'transparent', border: 'none', color: C.accent, fontSize: 10, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer', padding: 0 }}>Full Preview →</button>
              </div>
              <div style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                {/* Home */}
                <div style={{ flex: 1, minWidth: 100 }}>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {homeApRank && <ApRankBadge rank={homeApRank} />}
                    {g.home_team}
                  </div>
                  {homeTeam && <div style={{ color: C.muted, fontSize: 11 }}>{homeTeam.wins}-{homeTeam.losses}</div>}
                </div>
                {/* VS + H2H */}
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 16, color: C.muted, fontWeight: 700 }}>VS</div>
                  {h2h.length > 0 && (
                    <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                      H2H: <span style={{ color: homeH2H > awayH2H ? C.green : C.muted }}>{homeH2H}</span>–<span style={{ color: awayH2H > homeH2H ? C.green : C.muted }}>{awayH2H}</span>
                    </div>
                  )}
                </div>
                {/* Away */}
                <div style={{ flex: 1, minWidth: 100, textAlign: isMobile ? 'left' : 'right' }}>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 18 : 22, fontWeight: 700, color: C.text, display: 'flex', alignItems: 'center', gap: 6, justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                    {awayApRank && <ApRankBadge rank={awayApRank} />}
                    {g.away_team}
                  </div>
                  {awayTeam && <div style={{ color: C.muted, fontSize: 11 }}>{awayTeam.wins}-{awayTeam.losses}</div>}
                </div>
              </div>
              {h2h.length > 0 && (() => {
                const last = h2h[0]
                const hw = last.home_score > last.away_score
                return (
                  <div style={{ padding: '8px 18px', borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.muted }}>
                    Last meeting Wk {last.week}: <span style={{ color: hw ? C.text : C.muted, fontWeight: hw ? 700 : 400 }}>{last.home_team} {last.home_score}</span> – <span style={{ color: !hw ? C.text : C.muted, fontWeight: !hw ? 700 : 400 }}>{last.away_team} {last.away_score}</span>
                  </div>
                )
              })()}
            </Card>
          </div>
        )
      })()}

      {/* DYNASTY CHAMPIONS */}
      {championships.length > 0 && (
        <div>
          <SectionLabel color='#b8960c'>🏆 Dynasty Champions</SectionLabel>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '60px 1fr 1fr' : '60px 1fr 1fr 90px 90px',
              padding: '7px 16px', borderBottom: `1px solid ${C.border}`,
              background: C.surface,
            }}>
              {['YEAR', 'CHAMPION', 'OPPONENT', ...(isMobile ? [] : ['RECORD', 'RESULT'])].map(h => (
                <span key={h} style={{ fontSize: 9, fontFamily: "'Oswald', sans-serif", letterSpacing: 1.5, color: C.muted, textTransform: 'uppercase' }}>{h}</span>
              ))}
            </div>
            {championships.map((c, i) => {
              // Highlight user-coached wins
              const userCoaches = ['Rusty Grimm','Justin Woljevach','Jordan Herzy','Jesus Laris','Adam Dock','Lane Botkin','James Malone','Ryan Madison','Andrew Grimm','Anthony Ramos','Cody Zwernemann']
              const isDynastyWin = userCoaches.some(n => n.toLowerCase() === (c.coach_name || '').toLowerCase())
              return (
                <div key={c.id || i} style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '60px 1fr 1fr' : '60px 1fr 1fr 90px 90px',
                  padding: '10px 16px',
                  borderBottom: i < championships.length - 1 ? `1px solid ${C.border}` : 'none',
                  background: isDynastyWin ? 'rgba(184,150,12,0.06)' : 'transparent',
                  alignItems: 'center',
                }}>
                  {/* Year */}
                  <div>
                    <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 15, color: isDynastyWin ? '#b8960c' : C.muted, fontWeight: 700 }}>{c.season}</span>
                  </div>
                  {/* Champion */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TeamLogo team={c.team_name} size={20} />
                    <div>
                      <div style={{ color: C.text, fontSize: 13, fontWeight: isDynastyWin ? 700 : 400 }}>{c.team_name}</div>
                      {c.coach_name && <div style={{ color: isDynastyWin ? '#b8960c' : C.muted, fontSize: 10 }}>{c.coach_name}{c.record ? ` · ${c.record}` : ''}</div>}
                    </div>
                  </div>
                  {/* Opponent */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {c.opponent_team && <TeamLogo team={c.opponent_team} size={16} />}
                    <div>
                      <div style={{ color: C.muted, fontSize: 12 }}>{c.opponent_team || '—'}</div>
                      {!isMobile && c.opponent_record && <div style={{ color: C.subtle, fontSize: 10 }}>{c.opponent_record}</div>}
                    </div>
                  </div>
                  {/* Record (desktop) */}
                  {!isMobile && (
                    <div style={{ color: C.muted, fontSize: 12 }}>{c.record || '—'}</div>
                  )}
                  {/* Result (desktop) */}
                  {!isMobile && (
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, color: isDynastyWin ? C.accent : C.muted, fontWeight: isDynastyWin ? 700 : 400 }}>
                      {c.result || '—'}
                    </div>
                  )}
                </div>
              )
            })}
          </Card>
        </div>
      )}

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
function Standings({ teams, isMobile, settings }) {
  const [view, setView] = useState('records')

  // ── Season Records view ────────────────────────────
  const sorted = [...teams].sort((a, b) =>
    b.wins - a.wins ||
    ((b.pts - b.pts_against) - (a.pts - a.pts_against)) ||
    (a.rank || 99) - (b.rank || 99)
  )
  const PLAYOFF_LINE = 4

  // ── AP Poll view ───────────────────────────────────
  const apRankings = [...(settings?.ap_rankings || [])].sort((a, b) => (b.points || 0) - (a.points || 0))

  // Build a live record lookup from the teams array so the AP poll always
  // shows current W-L rather than the stale record from the screenshot.
  const liveRecordMap = {}
  for (const t of teams) {
    const key = (t.name || t.team_name || '').toLowerCase().trim()
    if (key) liveRecordMap[key] = `${t.wins ?? 0}-${t.losses ?? 0}`
  }

  return (
    <div>
      {/* Header + view toggle */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <SectionTitle isMobile={isMobile} sub={view === 'records' ? 'Current Season Records' : 'Associated Press Top 25 Poll'} style={{ margin: 0 }}>
          {view === 'records' ? 'Standings' : 'AP Top 25'}
        </SectionTitle>
        <div style={{ display: 'flex', gap: 6 }}>
          <PillBtn small active={view === 'records'} onClick={() => setView('records')}>📊 Season Records</PillBtn>
          <PillBtn small active={view === 'ap_poll'} onClick={() => setView('ap_poll')}>🗳️ AP Top 25</PillBtn>
        </div>
      </div>

      {/* ── AP POLL VIEW ── */}
      {view === 'ap_poll' && (
        apRankings.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🗳️</div>
              <div style={{ color: C.muted, fontSize: 14, fontStyle: 'italic', lineHeight: 1.6 }}>
                No AP Poll loaded yet. Sync a screenshot of the AP Top 25 from the Sync tab to populate this view. The poll updates automatically when a new screenshot is parsed.
              </div>
            </div>
          </Card>
        ) : (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 16px', background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: 'uppercase' }}>Associated Press · Top 25</span>
              {settings?.ap_poll_updated_at && (
                <span style={{ fontSize: 10, color: C.muted }}>Updated {new Date(settings.ap_poll_updated_at).toLocaleDateString()}</span>
              )}
            </div>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 340 : 'auto' }}>
                <thead>
                  <tr style={{ background: C.surface }}>
                    {['Rank', 'Team', 'Record', 'Pts'].map(h => (
                      <th key={h} style={{
                        padding: isMobile ? '10px 10px' : '12px 16px',
                        textAlign: h === 'Team' ? 'left' : 'center',
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
                  {apRankings.map((entry, i) => {
                    const displayRank = i + 1
                    const teamKey = (entry.team_name || '').toLowerCase().trim()
                    const liveRecord = liveRecordMap[teamKey] || entry.record || '—'
                    return (
                    <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, background: i % 2 === 0 ? 'transparent' : C.surface + '66' }}>
                      <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', textAlign: 'center', width: 52 }}>
                        <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, color: displayRank <= 5 ? C.accent : displayRank <= 10 ? C.text : C.muted, fontWeight: 700 }}>{displayRank}</span>
                      </td>
                      <td style={{ padding: isMobile ? '10px 10px' : '13px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <TeamLogo team={entry.team_name} size={isMobile ? 22 : 26} />
                          <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{entry.team_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', textAlign: 'center', color: C.muted, fontFamily: "'Oswald', sans-serif", fontSize: 13 }}>{liveRecord}</td>
                      <td style={{ padding: isMobile ? '10px 10px' : '13px 16px', textAlign: 'center', color: C.muted, fontSize: 12 }}>{entry.points != null ? entry.points : '—'}</td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, background: C.surface + '88' }}>
              <span style={{ fontSize: 10, color: C.subtle, fontStyle: 'italic' }}>
                🔒 AP Poll updates automatically when a new poll screenshot is synced — cannot be edited manually.
              </span>
            </div>
          </Card>
        )
      )}

      {/* ── SEASON RECORDS VIEW ── */}
      {view === 'records' && (
        teams.length === 0 ? (
          <Card>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
              <div style={{ color: C.muted, fontSize: 14, fontStyle: 'italic' }}>
                The conference standings are still being written. Sync a standings screenshot to see who's rising and who's falling.
              </div>
            </div>
          </Card>
        ) : (
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
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <TeamLogo team={t.name} size={isMobile ? 22 : 26} />
                            <span style={{ color: C.text, fontWeight: 700, fontSize: 14 }}>{t.name}</span>
                          </div>
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
        )
      )}
    </div>
  )
}

// ── Share Card overlay ────────────────────────────────────────
function ShareCard({ game, onClose, apRankings = [] }) {
  if (!game) return null
  const homeWon = game.home_score > game.away_score
  const awayWon = game.away_score > game.home_score
  const gameLabel = game.game_type && game.game_type !== 'regular'
    ? game.game_type.replace(/_/g, ' ').toUpperCase()
    : null
  const isFinal = gameIsFinal(game)
  const homeRank = getApRank(game.home_team, apRankings)
  const awayRank = getApRank(game.away_team, apRankings)

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
      <div style={{ color: C.muted, fontSize: 11, marginBottom: 16, letterSpacing: 2, fontFamily: "'Oswald', sans-serif", textTransform: 'uppercase' }}>
        SCREENSHOT TO SHARE · TAP ANYWHERE TO CLOSE
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

        {/* Home team row */}
        <div style={{
          background: homeWon ? 'linear-gradient(90deg, ' + C.accent + '18 0%, transparent 100%)' : C.surface,
          borderRadius: 12, padding: '16px 20px',
          marginBottom: 4,
          border: `1px solid ${homeWon ? C.accent + '55' : C.border}`,
          position: 'relative', overflow: 'hidden',
        }}>
          {homeWon && (
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
              background: C.accent, borderRadius: '12px 0 0 12px',
            }} />
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <TeamLogo team={game.home_team} size={36} />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: homeWon ? 22 : 19,
                  fontWeight: 700,
                  color: homeWon ? C.text : C.muted,
                  lineHeight: 1.1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {homeRank && <ApRankBadge rank={homeRank} style={{ fontSize: 11 }} />}
                  {game.home_team}
                </div>
                <div style={{ fontSize: 10, letterSpacing: 2, marginTop: 3, textTransform: 'uppercase',
                  color: homeWon ? C.accent : C.muted, fontFamily: "'Oswald', sans-serif",
                }}>
                  {homeWon ? 'WINNER' : 'HOME'}
                </div>
              </div>
            </div>
            {isFinal && (
              <div style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: homeWon ? 50 : 38,
                color: homeWon ? C.accent : '#555566',
                lineHeight: 1, flexShrink: 0,
                textShadow: homeWon ? `0 0 30px ${C.accent}66` : 'none',
              }}>{game.home_score}</div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ textAlign: 'center', padding: '6px 0', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 20, right: 20, top: '50%', height: 1, background: C.border }} />
          <span style={{
            position: 'relative', background: '#0d0d12',
            padding: '0 14px',
            fontFamily: "'Oswald', sans-serif", fontSize: 11,
            color: C.muted, letterSpacing: 4,
          }}>
            {isFinal ? 'FINAL' : 'VS'}
          </span>
        </div>

        {/* Away team row */}
        <div style={{
          background: awayWon ? 'linear-gradient(90deg, ' + C.accent + '18 0%, transparent 100%)' : C.surface,
          borderRadius: 12, padding: '16px 20px',
          marginTop: 4,
          border: `1px solid ${awayWon ? C.accent + '55' : C.border}`,
          position: 'relative', overflow: 'hidden',
        }}>
          {awayWon && (
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
              background: C.accent, borderRadius: '12px 0 0 12px',
            }} />
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
              <TeamLogo team={game.away_team} size={36} />
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: awayWon ? 22 : 19,
                  fontWeight: 700,
                  color: awayWon ? C.text : C.muted,
                  lineHeight: 1.1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {awayRank && <ApRankBadge rank={awayRank} style={{ fontSize: 11 }} />}
                  {game.away_team}
                </div>
                <div style={{ fontSize: 10, letterSpacing: 2, marginTop: 3, textTransform: 'uppercase',
                  color: awayWon ? C.accent : C.muted, fontFamily: "'Oswald', sans-serif",
                }}>
                  {awayWon ? 'WINNER' : 'AWAY'}
                </div>
              </div>
            </div>
            {isFinal && (
              <div style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: awayWon ? 50 : 38,
                color: awayWon ? C.accent : '#555566',
                lineHeight: 1, flexShrink: 0,
                textShadow: awayWon ? `0 0 30px ${C.accent}66` : 'none',
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

function Season({ games, teams, isMobile, settings, articles, onArticleOpen, onArticlesChange, commPin, onPinSet }) {
  const humanNames = new Set(teams.map(t => (t.name || t.team_name || '').toLowerCase()))
  const currentWeek = settings?.current_week ?? 0
  const [subTab, setSubTab] = useState('schedule')
  const [selectedWeek, setSelectedWeek] = useState(currentWeek)
  const [sharingGame, setSharingGame] = useState(null)
  useEffect(() => { setSelectedWeek(currentWeek) }, [currentWeek])
  const seasonApRankings = settings?.ap_rankings || []

  const weeksWithGames = new Set(games.map(g => g.week).filter(w => w != null))
  const allWeeks = Array.from({ length: 19 }, (_, i) => i) // 0–18
  const weekGames = games.filter(g => g.week === selectedWeek)
  const phase = getPhase(selectedWeek)

  const SUB_TABS = [
    { id: 'schedule', label: '📅 Schedule' },
    { id: 'matchups', label: '🏈 Matchups' },
    { id: 'stats',    label: '📊 Team Stats' },
    { id: 'h2h',      label: '⚔️ H2H Records' },
  ]

  return (
    <div>
      {/* Sub-tab nav */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 4 }}>
        {SUB_TABS.map(s => (
          <button key={s.id} onClick={() => setSubTab(s.id)} style={{
            background: subTab === s.id ? C.accent : C.card,
            color: subTab === s.id ? '#000' : C.muted,
            border: `1px solid ${subTab === s.id ? C.accent : C.border}`,
            borderRadius: 20, padding: isMobile ? '8px 14px' : '8px 18px',
            cursor: 'pointer', fontFamily: "'Oswald', sans-serif",
            fontSize: isMobile ? 12 : 13, letterSpacing: 0.5,
            whiteSpace: 'nowrap', flexShrink: 0,
            transition: 'all 0.15s',
          }}>{s.label}</button>
        ))}
      </div>

      {/* ── Schedule view ── */}
      {subTab === 'schedule' && <>
      <SectionTitle isMobile={isMobile} sub={phase.sub}>{phase.label}</SectionTitle>

      {/* Week timeline bar */}
      <div style={{ overflowX: 'auto', marginBottom: 24, paddingBottom: 6, WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', gap: 5, minWidth: 'max-content' }}>
          {allWeeks.map(w => {
            const hasGames   = weeksWithGames.has(w)
            const hasFinal   = games.some(g => g.week === w && gameIsFinal(g))
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
            const isFinal   = gameIsFinal(g)
            const homeWon   = isFinal && g.home_score > g.away_score
            const awayWon   = isFinal && g.away_score > g.home_score
            const homeHuman = humanNames.has((g.home_team || '').toLowerCase())
            const awayHuman = humanNames.has((g.away_team || '').toLowerCase())
            const gameLabel = g.game_type && g.game_type !== 'regular' ? g.game_type.replace(/_/g, ' ') : null
            const homeRank  = getApRank(g.home_team, seasonApRankings)
            const awayRank  = getApRank(g.away_team, seasonApRankings)
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
                      <div style={{ color: homeWon ? C.text : isFinal ? C.muted : C.text, fontWeight: homeWon ? 700 : 400, fontSize: 15, display: 'flex', alignItems: 'center', gap: 5 }}>
                        {homeRank && <ApRankBadge rank={homeRank} />}
                        {g.home_team}
                      </div>
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
                      <div style={{ color: awayWon ? C.text : isFinal ? C.muted : C.text, fontWeight: awayWon ? 700 : 400, fontSize: 15, display: 'flex', alignItems: 'center', gap: 5 }}>
                        {awayRank && <ApRankBadge rank={awayRank} />}
                        {g.away_team}
                      </div>
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
      {sharingGame && <ShareCard game={sharingGame} onClose={() => setSharingGame(null)} apRankings={seasonApRankings} />}
      </>}

      {/* ── Matchups view ── */}
      {subTab === 'matchups' && (
        <CompactMatchupsView
          games={games} teams={teams} settings={settings}
          articles={articles || []} isMobile={isMobile}
          onArticleOpen={onArticleOpen} onArticlesChange={onArticlesChange}
          commPin={commPin} onPinSet={onPinSet}
        />
      )}

      {/* ── Team Stats view ── */}
      {subTab === 'stats' && (
        <TeamStatsView
          teams={teams} isMobile={isMobile}
          season={settings?.current_season ?? 1}
        />
      )}

      {/* ── Head-to-Head view ── */}
      {subTab === 'h2h' && (
        <HeadToHeadView games={games} teams={teams} isMobile={isMobile} />
      )}
    </div>
  )
}

// ── Compact Matchups View (inside Season tab) ───────────────────
function CompactMatchupsView({ games, teams, settings, articles, isMobile, onArticleOpen, onArticlesChange, commPin, onPinSet }) {
  const finalGames    = games.filter(gameIsFinal)
  const upcomingGames = games.filter(g => !gameIsFinal(g) && g.home_team && g.away_team)
  const apRankings    = settings?.ap_rankings || []

  const [generating,    setGenerating]    = useState(null)
  const [genError,      setGenError]      = useState({})
  const [pinInput,      setPinInput]      = useState('')
  const [pinError,      setPinError]      = useState('')
  const [showPinFor,    setShowPinFor]    = useState(null)
  const [localArticles, setLocalArticles] = useState([])

  const gameKey = (g) => `${g.home_team}|${g.away_team}|${g.week}`

  const allPreviewArticles = [
    ...localArticles,
    ...(articles || []).filter(a => a.article_type === 'matchup-preview'),
  ]

  const getGameBlurb = (g) => {
    const match = allPreviewArticles.find(a =>
      a.title?.includes(g.home_team) && a.title?.includes(g.away_team) &&
      (g.week == null || a.week == null || a.week === g.week)
    )
    if (!match?.content) return null
    const firstPara = match.content.split(/\n+/).find(p => p.trim().length > 30) || ''
    return firstPara.length > 220 ? firstPara.slice(0, 217) + '…' : firstPara
  }

  const generatePreview = async (g, pin) => {
    const key = gameKey(g)
    setGenerating(key)
    setGenError(e => ({ ...e, [key]: null }))
    try {
      const res = await fetch('/api/generate-article', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleType: 'matchup-preview', homeTeam: g.home_team, awayTeam: g.away_team, week: g.week, pin }),
      })
      const data = await res.json()
      if (!res.ok) { setGenError(e => ({ ...e, [key]: data.error || 'Generation failed' })); return }
      const newArticle = { title: `Matchup Preview: ${g.home_team} vs ${g.away_team}${g.week ? ` — Week ${g.week}` : ''}`, article_type: 'matchup-preview', week: g.week, content: data.article, created_at: new Date().toISOString() }
      setLocalArticles(prev => [newArticle, ...prev])
      onArticlesChange?.()
      if (onArticleOpen) onArticleOpen(newArticle)
    } catch (e) {
      setGenError(err => ({ ...err, [key]: 'Something went wrong. Try again.' }))
    } finally { setGenerating(null) }
  }

  const handleGenerate = (g) => {
    const key = gameKey(g)
    if (commPin) { generatePreview(g, commPin) }
    else { setShowPinFor(showPinFor === key ? null : key); setPinInput(''); setPinError('') }
  }

  const submitPin = (g) => {
    if (!pinInput.trim()) return
    fetch('/api/coaches/0', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pinInput }) })
      .then(r => {
        if (r.status === 403) { setPinError('Wrong PIN'); return }
        if (onPinSet) onPinSet(pinInput)
        setShowPinFor(null)
        generatePreview(g, pinInput)
      }).catch(() => setPinError('Something went wrong'))
  }

  const getH2H = (a, b) => finalGames
    .filter(g => (g.home_team === a && g.away_team === b) || (g.home_team === b && g.away_team === a))
    .sort((x, y) => y.week - x.week)

  const getRecent = (name) => finalGames
    .filter(g => g.home_team === name || g.away_team === name)
    .sort((a, b) => b.week - a.week).slice(0, 4)

  const findTeam = (name) => teams.find(t => t.name === name)

  if (upcomingGames.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: '48px 20px', borderStyle: 'dashed' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
        <div style={{ color: C.text, fontSize: 16, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, marginBottom: 8 }}>No Upcoming Matchups</div>
        <div style={{ color: C.muted, fontSize: 13 }}>Sync a schedule to see upcoming game previews here.</div>
      </Card>
    )
  }

  // Group upcoming games by week
  const weeks = [...new Set(upcomingGames.map(g => g.week))].sort((a, b) => a - b)
  const nextThreeWeeks = weeks.slice(0, 3)

  return (
    <div>
      <div style={{ color: C.muted, fontSize: 12, marginBottom: 16 }}>
        Showing upcoming matchups · <span style={{ color: C.accent }}>{upcomingGames.length} games scheduled</span>
      </div>
      {nextThreeWeeks.map(wk => {
        const wkGames = upcomingGames.filter(g => g.week === wk)
        return (
          <div key={wk} style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, color: C.muted, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>
              Week {wk} · {getPhase(wk).label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {wkGames.map((g, i) => {
                const key = gameKey(g)
                const h2h = getH2H(g.home_team, g.away_team)
                const homeRecent = getRecent(g.home_team)
                const awayRecent = getRecent(g.away_team)
                const homeTeam = findTeam(g.home_team)
                const awayTeam = findTeam(g.away_team)
                const homeRank = getApRank(g.home_team, apRankings)
                const awayRank = getApRank(g.away_team, apRankings)
                let homeH2H = 0, awayH2H = 0
                h2h.forEach(m => {
                  const hw = m.home_score > m.away_score
                  if ((m.home_team === g.home_team && hw) || (m.away_team === g.home_team && !hw)) homeH2H++
                  else awayH2H++
                })
                const blurb = getGameBlurb(g)
                const isGen = generating === key
                const showPin = showPinFor === key

                return (
                  <Card key={`${key}-${i}`} style={{ padding: 0, overflow: 'hidden' }}>
                    {/* Compact teams row */}
                    <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
                      {/* Home */}
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <TeamLogo team={g.home_team} size={22} />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {homeRank && <ApRankBadge rank={homeRank} />}
                              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 14 : 16, fontWeight: 700, color: C.text }}>{g.home_team}</span>
                            </div>
                            {homeTeam && <div style={{ color: C.muted, fontSize: 10 }}>{homeTeam.wins}-{homeTeam.losses}{homeTeam.coach ? ` · ${homeTeam.coach}` : ''}{homeTeam.pts ? ` · ${Math.round(homeTeam.pts / ((homeTeam.wins + homeTeam.losses) || 1))} ppg` : ''}</div>}
                          </div>
                        </div>
                        {homeRecent.length > 0 && (
                          <div style={{ display: 'flex', gap: 3 }}>
                            {homeRecent.map((m, j) => {
                              const won = m.home_team === g.home_team ? m.home_score > m.away_score : m.away_score > m.home_score
                              return <span key={j} style={{ width: 18, height: 18, borderRadius: 3, background: won ? C.green + '22' : C.red + '22', color: won ? C.green : C.red, fontSize: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Oswald', sans-serif", fontWeight: 700, border: `1px solid ${won ? C.green + '44' : C.red + '44'}` }}>{won ? 'W' : 'L'}</span>
                            })}
                          </div>
                        )}
                      </div>

                      {/* Center: VS + series */}
                      <div style={{ textAlign: 'center', minWidth: 70 }}>
                        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, color: C.subtle, fontWeight: 700, marginBottom: 4 }}>VS</div>
                        {h2h.length > 0 ? (
                          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, lineHeight: 1 }}>
                            <span style={{ color: homeH2H >= awayH2H ? C.green : C.muted }}>{homeH2H}</span>
                            <span style={{ color: C.subtle }}> – </span>
                            <span style={{ color: awayH2H > homeH2H ? C.green : C.muted }}>{awayH2H}</span>
                          </div>
                        ) : (
                          <div style={{ fontSize: 8, color: C.subtle, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5 }}>FIRST<br/>MTG</div>
                        )}
                      </div>

                      {/* Away */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, justifyContent: 'flex-end' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 14 : 16, fontWeight: 700, color: C.text }}>{g.away_team}</span>
                              {awayRank && <ApRankBadge rank={awayRank} />}
                            </div>
                            {awayTeam && <div style={{ color: C.muted, fontSize: 10 }}>{awayTeam.wins}-{awayTeam.losses}{awayTeam.coach ? ` · ${awayTeam.coach}` : ''}{awayTeam.pts ? ` · ${Math.round(awayTeam.pts / ((awayTeam.wins + awayTeam.losses) || 1))} ppg` : ''}</div>}
                          </div>
                          <TeamLogo team={g.away_team} size={22} />
                        </div>
                        {awayRecent.length > 0 && (
                          <div style={{ display: 'flex', gap: 3, justifyContent: 'flex-end' }}>
                            {awayRecent.map((m, j) => {
                              const won = m.home_team === g.away_team ? m.home_score > m.away_score : m.away_score > m.home_score
                              return <span key={j} style={{ width: 18, height: 18, borderRadius: 3, background: won ? C.green + '22' : C.red + '22', color: won ? C.green : C.red, fontSize: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Oswald', sans-serif", fontWeight: 700, border: `1px solid ${won ? C.green + '44' : C.red + '44'}` }}>{won ? 'W' : 'L'}</span>
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Blurb + generate row */}
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: '8px 14px', background: C.surface + '88', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      {blurb && <div style={{ flex: 1, color: C.muted, fontSize: 11, lineHeight: 1.5, minWidth: 120 }}>{blurb}</div>}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <button onClick={() => handleGenerate(g)} disabled={isGen} style={{
                          background: isGen ? C.subtle : commPin ? C.accent + '18' : 'transparent',
                          color: isGen ? C.muted : commPin ? C.accent : C.muted,
                          border: `1px solid ${isGen ? C.border : commPin ? C.accent + '55' : C.border}`,
                          borderRadius: 6, padding: '5px 12px', cursor: isGen ? 'not-allowed' : 'pointer',
                          fontFamily: "'Oswald', sans-serif", fontSize: 10, letterSpacing: 0.5,
                          textTransform: 'uppercase', whiteSpace: 'nowrap',
                        }}>
                          {isGen ? '⏳ Generating…' : '✦ Preview'}
                        </button>
                        {genError[key] && <span style={{ color: C.red, fontSize: 10 }}>❌ {genError[key]}</span>}
                      </div>
                    </div>

                    {/* Inline PIN */}
                    {showPin && (
                      <div style={{ borderTop: `1px solid ${C.border}`, padding: '8px 14px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <input type="password" placeholder="PIN" value={pinInput} onChange={e => { setPinInput(e.target.value); setPinError('') }} onKeyDown={e => e.key === 'Enter' && submitPin(g)} style={{ flex: 1, minWidth: 100, background: C.card, border: `1px solid ${pinError ? C.red : C.border}`, borderRadius: 5, padding: '6px 10px', color: C.text, fontSize: 12 }} autoFocus />
                        <button onClick={() => submitPin(g)} style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 5, padding: '6px 12px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 11, fontWeight: 700 }}>Generate →</button>
                        <button onClick={() => setShowPinFor(null)} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, padding: '6px 10px', cursor: 'pointer', fontSize: 11 }}>Cancel</button>
                        {pinError && <span style={{ color: C.red, fontSize: 11, width: '100%' }}>❌ {pinError}</span>}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Remaining weeks (collapsed / scrollable) */}
      {weeks.length > 3 && (
        <div style={{ marginTop: 8 }}>
          <details>
            <summary style={{ color: C.muted, fontSize: 12, cursor: 'pointer', fontFamily: "'Oswald', sans-serif", letterSpacing: 1, listStyle: 'none', userSelect: 'none' }}>
              ▸ Show {weeks.slice(3).length} more week{weeks.slice(3).length !== 1 ? 's' : ''} ({upcomingGames.filter(g => !nextThreeWeeks.includes(g.week)).length} games)
            </summary>
            <div style={{ marginTop: 12 }}>
              {weeks.slice(3).map(wk => {
                const wkGames = upcomingGames.filter(g => g.week === wk)
                return (
                  <div key={wk} style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, color: C.muted, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
                      Week {wk} · {getPhase(wk).label}
                    </div>
                    {wkGames.map((g, i) => {
                      const homeTeam = findTeam(g.home_team)
                      const awayTeam = findTeam(g.away_team)
                      const homeRank = getApRank(g.home_team, apRankings)
                      const awayRank = getApRank(g.away_team, apRankings)
                      return (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', background: C.card, borderRadius: 6, border: `1px solid ${C.border}`, marginBottom: 6 }}>
                          <TeamLogo team={g.home_team} size={18} />
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {homeRank && <ApRankBadge rank={homeRank} />}
                            <span style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{g.home_team}</span>
                            {homeTeam && <span style={{ color: C.muted, fontSize: 11 }}>{homeTeam.wins}-{homeTeam.losses}</span>}
                          </div>
                          <span style={{ color: C.subtle, fontSize: 11, fontFamily: "'Oswald', sans-serif" }}>vs</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {awayRank && <ApRankBadge rank={awayRank} />}
                            <span style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>{g.away_team}</span>
                            {awayTeam && <span style={{ color: C.muted, fontSize: 11 }}>{awayTeam.wins}-{awayTeam.losses}</span>}
                          </div>
                          <TeamLogo team={g.away_team} size={18} />
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </details>
        </div>
      )}
    </div>
  )
}

// ── Team Stats View (inside Season tab) ────────────────────────
function TeamStatsView({ teams, isMobile, season }) {
  const [view, setView] = useState('offense')
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/team-stats?season=${season}`)
      .then(r => r.json())
      .then(d => setStats(d.stats || []))
      .catch(() => setStats([]))
      .finally(() => setLoading(false))
  }, [season])

  const humanTeamNames = new Set(teams.map(t => (t.name || '').toLowerCase()))

  const findCoach = (teamName) => {
    const t = teams.find(t => t.name === teamName)
    return t?.coach || null
  }

  if (loading) return <div style={{ color: C.muted, textAlign: 'center', padding: 60, fontFamily: "'Oswald', sans-serif", letterSpacing: 2 }}>LOADING STATS...</div>

  if (stats.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: '48px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>📊</div>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, color: C.text, marginBottom: 8, letterSpacing: 1 }}>No Team Stats Yet</div>
        <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.7, maxWidth: 360, margin: '0 auto' }}>
          Sync a Team Stats screenshot from EA CFB using the Sync tab.<br />
          Select <strong style={{ color: C.accent }}>📊 Team Stats</strong> as the type before scanning.
        </div>
      </Card>
    )
  }

  const offenseSorted = [...stats].filter(s => s.ppg != null).sort((a, b) => (b.ppg || 0) - (a.ppg || 0))
  const defenseSorted = [...stats].filter(s => s.dppg != null).sort((a, b) => (a.dppg || 99) - (b.dppg || 99))

  const isHuman = (name) => humanTeamNames.has((name || '').toLowerCase())

  const StatTable = ({ rows, columns }) => (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 480 : 'auto' }}>
        <thead>
          <tr style={{ background: C.surface }}>
            <th style={{ padding: '10px 14px', textAlign: 'left', color: C.muted, fontSize: 10, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>#</th>
            <th style={{ padding: '10px 14px', textAlign: 'left', color: C.muted, fontSize: 10, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>Team</th>
            {columns.map(c => (
              <th key={c.key} style={{ padding: '10px 10px', textAlign: 'center', color: C.muted, fontSize: 10, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }} title={c.title}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const human = isHuman(s.team_name)
            const coach = findCoach(s.team_name)
            return (
              <tr key={s.id || i} style={{ borderBottom: `1px solid ${C.border}44`, background: human ? C.accent + '08' : (i % 2 === 0 ? 'transparent' : C.surface + '44') }}>
                <td style={{ padding: '10px 14px', color: C.muted, fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 700 }}>{i + 1}</td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TeamLogo team={s.team_name} size={22} />
                    <div>
                      <div style={{ color: human ? C.text : C.muted, fontWeight: human ? 700 : 400, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 }}>
                        {s.team_name}
                        {human && <span style={{ background: C.accent + '22', color: C.accent, fontSize: 8, padding: '1px 5px', borderRadius: 3, fontFamily: "'Oswald', sans-serif", letterSpacing: 0.5 }}>USER</span>}
                      </div>
                      {coach && <div style={{ color: C.muted, fontSize: 10 }}>{coach}</div>}
                    </div>
                  </div>
                </td>
                {columns.map(c => (
                  <td key={c.key} style={{ padding: '10px 10px', textAlign: 'center', color: s[c.key] != null ? (human ? C.text : C.muted) : C.subtle, fontSize: 13, fontFamily: s.key === 'team_name' ? 'inherit' : "'Oswald', sans-serif" }}>
                    {s[c.key] != null ? s[c.key] : '—'}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  const offCols = [
    { key: 'gp',        label: 'GP',   title: 'Games Played' },
    { key: 'ppg',       label: 'PPG',  title: 'Points Per Game' },
    { key: 'ypg',       label: 'YPG',  title: 'Yards Per Game' },
    { key: 'ypp',       label: 'YPP',  title: 'Yards Per Play' },
    { key: 'pass_yards',label: 'PASS', title: 'Total Passing Yards' },
    { key: 'pypg',      label: 'PYPG', title: 'Pass Yards Per Game' },
    { key: 'pass_tds',  label: 'PTD',  title: 'Passing Touchdowns' },
    { key: 'rush_yards',label: 'RUSH', title: 'Total Rushing Yards' },
  ]

  const defCols = [
    { key: 'gp',              label: 'GP',    title: 'Games Played' },
    { key: 'dppg',            label: 'DPPG',  title: 'Points Allowed Per Game' },
    { key: 'pts_allowed',     label: 'PTS-A', title: 'Total Points Allowed' },
    { key: 'ypga',            label: 'YPGA',  title: 'Yards Per Game Allowed' },
    { key: 'pass_yds_allowed',label: 'PASS-A',title: 'Passing Yards Allowed' },
    { key: 'rush_yds_allowed',label: 'RUSH-A',title: 'Rushing Yards Allowed' },
    { key: 'rypga',           label: 'RYPGA', title: 'Rush Yards Per Game Allowed' },
    { key: 'sacks',           label: 'SACK',  title: 'Sacks' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[{ id: 'offense', label: '⚡ Offense' }, { id: 'defense', label: '🛡️ Defense' }].map(v => (
          <button key={v.id} onClick={() => setView(v.id)} style={{
            background: view === v.id ? C.accent : C.card, color: view === v.id ? '#000' : C.muted,
            border: `1px solid ${view === v.id ? C.accent : C.border}`, borderRadius: 6,
            padding: '8px 18px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif",
            fontSize: 12, letterSpacing: 0.5, transition: 'all 0.15s',
          }}>{v.label}</button>
        ))}
        <span style={{ color: C.subtle, fontSize: 11, alignSelf: 'center', marginLeft: 4 }}>
          Season {season} · {stats.length} teams · USER teams highlighted
        </span>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {view === 'offense' ? (
          offenseSorted.length > 0 ? <StatTable rows={offenseSorted} columns={offCols} /> : (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: C.muted, fontSize: 13 }}>
              No offensive stats synced yet. Sync a Team Stats (Offense) screenshot.
            </div>
          )
        ) : (
          defenseSorted.length > 0 ? <StatTable rows={defenseSorted} columns={defCols} /> : (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: C.muted, fontSize: 13 }}>
              No defensive stats synced yet. Sync a Team Stats (Defense) screenshot.
            </div>
          )
        )}
      </Card>
    </div>
  )
}

// ── Head-to-Head Records View (inside Season tab) ───────────────
function HeadToHeadView({ games, teams, isMobile }) {
  const [selected, setSelected] = useState(null)

  const finalGames = games.filter(gameIsFinal)
  const humanTeamNames = teams.map(t => t.name).filter(Boolean)

  // Only games where BOTH teams are human-coached
  const h2hGames = finalGames.filter(g =>
    humanTeamNames.includes(g.home_team) && humanTeamNames.includes(g.away_team)
  )

  // Build records per team
  const records = teams.map(team => {
    const teamGames = h2hGames.filter(g => g.home_team === team.name || g.away_team === team.name)
    let wins = 0, losses = 0
    const opponents = {}
    teamGames.forEach(g => {
      const isHome = g.home_team === team.name
      const won = isHome ? g.home_score > g.away_score : g.away_score > g.home_score
      const opp = isHome ? g.away_team : g.home_team
      if (won) wins++; else losses++
      if (!opponents[opp]) opponents[opp] = { wins: 0, losses: 0, games: [] }
      if (won) opponents[opp].wins++; else opponents[opp].losses++
      opponents[opp].games.push(g)
    })
    return { ...team, h2hWins: wins, h2hLosses: losses, h2hGames: teamGames, opponents }
  })

  const sorted = [...records].sort((a, b) =>
    b.h2hWins - a.h2hWins || a.h2hLosses - b.h2hLosses
  )

  if (h2hGames.length === 0) {
    return (
      <Card style={{ textAlign: 'center', padding: '48px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>⚔️</div>
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, color: C.text, marginBottom: 8, letterSpacing: 1 }}>No Head-to-Head Games Yet</div>
        <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.7 }}>
          Head-to-head records appear automatically once user-coached teams have played each other. Keep syncing results!
        </div>
      </Card>
    )
  }

  const selectedRecord = selected ? sorted.find(r => r.name === selected) : null

  const pct = (w, l) => {
    const total = (w || 0) + (l || 0)
    if (!total) return '—'
    return ((w / total) * 100).toFixed(1) + '%'
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : selected ? '1fr 1fr' : '1fr', gap: 16 }}>
        {/* Leaderboard */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', background: C.surface, borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: 'uppercase' }}>⚔️ Head to Head Leaderboard</span>
            <span style={{ color: C.subtle, fontSize: 10, marginLeft: 8 }}>user vs user only · {h2hGames.length} games</span>
          </div>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.surface }}>
                  {['#', 'Coach / Team', 'W', 'L', '%'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: h === 'Coach / Team' ? 'left' : 'center', color: C.muted, fontSize: 10, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => {
                  const isSelected = selected === r.name
                  const teamData = teams.find(t => t.name === r.name)
                  return (
                    <tr key={r.name} onClick={() => setSelected(isSelected ? null : r.name)} style={{
                      borderBottom: `1px solid ${C.border}44`, cursor: 'pointer',
                      background: isSelected ? C.accent + '15' : i % 2 === 0 ? 'transparent' : C.surface + '44',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = C.subtle + '33' }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : C.surface + '44' }}
                    >
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        {i === 0 && <span style={{ fontSize: 14 }}>🥇</span>}
                        {i === 1 && <span style={{ fontSize: 14 }}>🥈</span>}
                        {i === 2 && <span style={{ fontSize: 14 }}>🥉</span>}
                        {i > 2 && <span style={{ color: C.subtle, fontFamily: "'Oswald', sans-serif", fontSize: 13 }}>{i + 1}</span>}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <TeamLogo team={r.name} size={22} />
                          <div>
                            <div style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{r.name}</div>
                            {teamData?.coach && <div style={{ color: C.muted, fontSize: 10 }}>{teamData.coach}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: C.green, fontFamily: "'Oswald', sans-serif", fontSize: 16, fontWeight: 700 }}>{r.h2hWins}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: C.red, fontFamily: "'Oswald', sans-serif", fontSize: 16, fontWeight: 700 }}>{r.h2hLosses}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: C.accent, fontFamily: "'Oswald', sans-serif", fontSize: 13 }}>{pct(r.h2hWins, r.h2hLosses)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Selected coach detail */}
        {selectedRecord && (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: C.surface, borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, color: C.accent, letterSpacing: 2, textTransform: 'uppercase' }}>
                {selectedRecord.name} — Breakdown
              </span>
              <button onClick={() => setSelected(null)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 16 }}>×</button>
            </div>
            <div style={{ padding: 14 }}>
              {Object.entries(selectedRecord.opponents).map(([opp, rec]) => {
                const oppTeam = teams.find(t => t.name === opp)
                return (
                  <div key={opp} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <TeamLogo team={opp} size={22} />
                        <div>
                          <div style={{ color: C.text, fontWeight: 700, fontSize: 13 }}>{opp}</div>
                          {oppTeam?.coach && <div style={{ color: C.muted, fontSize: 10 }}>{oppTeam.coach}</div>}
                        </div>
                      </div>
                      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18 }}>
                        <span style={{ color: rec.wins > rec.losses ? C.green : C.muted }}>{rec.wins}</span>
                        <span style={{ color: C.subtle }}> – </span>
                        <span style={{ color: rec.losses > rec.wins ? C.red : C.muted }}>{rec.losses}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {[...rec.games].sort((a, b) => b.week - a.week).map((g, gi) => {
                        const isHome = g.home_team === selectedRecord.name
                        const myScore = isHome ? g.home_score : g.away_score
                        const oppScore = isHome ? g.away_score : g.home_score
                        const won = myScore > oppScore
                        return (
                          <div key={gi} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '6px 10px', background: won ? C.green + '10' : C.red + '10', borderRadius: 5, border: `1px solid ${won ? C.green + '33' : C.red + '33'}` }}>
                            <span style={{ color: won ? C.green : C.red, fontFamily: "'Oswald', sans-serif", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{won ? 'W' : 'L'}</span>
                            <span style={{ color: C.muted, fontSize: 11, flexShrink: 0 }}>Wk {g.week}</span>
                            <span style={{ color: won ? C.text : C.muted, fontSize: 12, fontWeight: won ? 700 : 400 }}>{myScore} – {oppScore}</span>
                            {g.game_type && g.game_type !== 'regular' && <span style={{ color: C.accent, fontSize: 10, fontFamily: "'Oswald', sans-serif", marginLeft: 'auto' }}>{g.game_type.replace(/_/g, ' ')}</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

// ── Heisman Watch Tab ───────────────────────────────────────────
function HeismanTab({ heismanCandidates: initialCandidates = [], onRefresh, isMobile }) {
  const BLANK = { player_name: '', position: '', team_name: '', class_year: '', trend: 'same', rank: 1, notes: '' }
  const [candidates, setCandidates] = useState(initialCandidates)
  const [selected,   setSelected]   = useState(null)
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState(BLANK)
  const [error,      setError]      = useState(null)
  const [saving,     setSaving]     = useState(false)

  // Keep in sync when parent refreshes
  useEffect(() => {
    setCandidates(initialCandidates)
    if (initialCandidates.length > 0 && !selected) setSelected(initialCandidates[0])
  }, [initialCandidates])

  async function handleAdd(e) {
    e.preventDefault()
    setSaving(true); setError(null)
    try {
      const res  = await fetch('/api/heisman-watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, rank: parseInt(form.rank) }),
      })
      const data = await res.json()
      if (data.success) {
        const next = [...candidates, data.candidate].sort((a, b) => a.rank - b.rank)
        setCandidates(next)
        setSelected(data.candidate)
        setForm(BLANK)
        setShowForm(false)
        onRefresh?.()
      } else {
        setError(data.error || 'Failed to add')
      }
    } catch (err) { setError(err.message) }
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Remove this candidate from the Heisman Watch?')) return
    try {
      const res  = await fetch(`/api/heisman-watch?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        const next = candidates.filter(c => c.id !== id)
        setCandidates(next)
        setSelected(next[0] || null)
        onRefresh?.()
      } else { setError(data.error) }
    } catch (err) { setError(err.message) }
  }

  const inp = {
    background: C.surface, border: `1px solid ${C.border}`, color: C.text,
    padding: '9px 12px', borderRadius: 6, fontSize: 13, width: '100%', boxSizing: 'border-box',
  }

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <SectionTitle isMobile={isMobile} sub="Top 5 candidates for college football's most prestigious award">
          Heisman Watch
        </SectionTitle>
        <button
          onClick={() => { setShowForm(f => !f); setError(null) }}
          style={{
            background: showForm ? C.red + 'dd' : C.accent, color: C.bg,
            border: 'none', borderRadius: 6, padding: '10px 20px', cursor: 'pointer',
            fontFamily: "'Oswald', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 1, flexShrink: 0,
          }}
        >
          {showForm ? '✕ Cancel' : '+ Add Candidate'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <Card style={{ marginBottom: 16, borderColor: C.red + '55', background: C.red + '11' }}>
          <span style={{ color: C.red, fontSize: 13 }}>{error}</span>
        </Card>
      )}

      {/* Add form */}
      {showForm && (
        <Card style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 11, color: C.accent, letterSpacing: 2, marginBottom: 16 }}>ADD CANDIDATE</div>
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <input placeholder="Player Name *" required value={form.player_name} onChange={e => setForm({...form, player_name: e.target.value})} style={inp} />
              <input placeholder="Position (QB, HB, WR…)" value={form.position} onChange={e => setForm({...form, position: e.target.value})} style={inp} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <input placeholder="Team Name *" required value={form.team_name} onChange={e => setForm({...form, team_name: e.target.value})} style={inp} />
              <input placeholder="Class Year (JR, SR (RS)…)" value={form.class_year} onChange={e => setForm({...form, class_year: e.target.value})} style={inp} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              <select value={form.rank} onChange={e => setForm({...form, rank: e.target.value})} style={inp}>
                {[1,2,3,4,5].map(r => <option key={r} value={r}>Rank #{r}</option>)}
              </select>
              <select value={form.trend} onChange={e => setForm({...form, trend: e.target.value})} style={inp}>
                <option value="up">▲ Trending Up</option>
                <option value="same">— No Change</option>
                <option value="down">▼ Trending Down</option>
              </select>
            </div>
            <button type="submit" disabled={saving} style={{ background: C.green, color: '#000', border: 'none', borderRadius: 6, padding: '10px 22px', cursor: saving ? 'wait' : 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
              {saving ? 'Saving…' : '✓ Add Candidate'}
            </button>
          </form>
        </Card>
      )}

      {/* Main layout: table + detail panel */}
      <div style={{ display: 'grid', gridTemplateColumns: !isMobile && selected && candidates.length > 0 ? '1fr 280px' : '1fr', gap: 16, alignItems: 'start' }}>

        {/* Candidates table */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {/* Gold header */}
          <div style={{ background: C.accent, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🏆</span>
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 15, fontWeight: 700, color: C.bg, letterSpacing: 2 }}>HEISMAN TROPHY</span>
          </div>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '40px 64px 1fr 100px 60px', padding: '8px 18px', gap: 12, background: C.surface, borderBottom: `1px solid ${C.border}`, fontFamily: "'Oswald', sans-serif", fontSize: 10, color: C.muted, letterSpacing: 1, fontWeight: 700 }}>
            <div>RANK</div><div>POS</div><div>NAME / TEAM</div>
            <div style={{ textAlign: 'center' }}>YEAR</div>
            <div style={{ textAlign: 'center' }}>CHANGE</div>
          </div>
          {/* Rows or empty state */}
          {candidates.length === 0 ? (
            <div style={{ padding: '48px 18px', textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
              <div style={{ color: C.text, fontSize: 15, fontWeight: 700, marginBottom: 8 }}>No candidates yet</div>
              <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>
                Go to the <strong style={{ color: C.accent }}>Sync</strong> tab, select <strong style={{ color: C.accent }}>🏆 Heisman Watch</strong> as the scan mode,<br />
                then scan your Heisman Watch screenshot — it'll populate automatically.
              </div>
            </div>
          ) : candidates.map((c, i) => (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              style={{
                display: 'grid', gridTemplateColumns: '40px 64px 1fr 100px 60px',
                gap: 12, padding: '13px 18px',
                borderBottom: i < candidates.length - 1 ? `1px solid ${C.border}` : 'none',
                alignItems: 'center', cursor: 'pointer',
                background: selected?.id === c.id ? C.subtle : i === 0 ? C.accent + '08' : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.subtle }}
              onMouseLeave={e => { e.currentTarget.style.background = selected?.id === c.id ? C.subtle : i === 0 ? C.accent + '08' : 'transparent' }}
            >
              {/* Rank badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: 4, background: i === 0 ? C.accent : C.subtle, color: i === 0 ? C.bg : C.muted, fontFamily: "'Oswald', sans-serif", fontSize: 12, fontWeight: 700 }}>{c.rank}</span>
              </div>
              {/* Position */}
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.muted, fontWeight: 700, letterSpacing: 0.5 }}>{c.position || '—'}</div>
              {/* Name / Team */}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 14, color: C.text, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.player_name}</div>
                <div style={{ fontSize: 11, color: C.accent, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.team_name}</div>
              </div>
              {/* Year */}
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.text, textAlign: 'center' }}>{c.class_year || '—'}</div>
              {/* Trend arrow */}
              <div style={{ textAlign: 'center', fontSize: 16 }}>
                {c.trend === 'up'   && <span style={{ color: C.green }}>▲</span>}
                {c.trend === 'down' && <span style={{ color: C.red }}>▼</span>}
                {(!c.trend || c.trend === 'same') && <span style={{ color: C.muted, fontSize: 12 }}>—</span>}
              </div>
            </div>
          ))}
        </Card>

        {/* Detail panel */}
        {!isMobile && selected && (
          <Card style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 4, textTransform: 'uppercase' }}>
                {selected.rank === 1 ? '🏆 FRONTRUNNER' : `CANDIDATE #${selected.rank}`}
              </div>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, color: C.text, fontWeight: 700, lineHeight: 1.1, marginBottom: 4 }}>{selected.player_name}</div>
              <div style={{ fontSize: 12, color: C.accent }}>{selected.team_name}</div>
            </div>
            {/* Stat tiles */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'POSITION', value: selected.position || '—' },
                { label: 'CLASS',    value: selected.class_year || '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: C.surface, padding: '8px 10px', borderRadius: 6 }}>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 2 }}>{label}</div>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 15, color: C.text, fontWeight: 700 }}>{value}</div>
                </div>
              ))}
            </div>
            {/* Trend */}
            <div style={{ background: C.surface, padding: '10px 12px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20, color: selected.trend === 'up' ? C.green : selected.trend === 'down' ? C.red : C.muted }}>
                {selected.trend === 'up' ? '▲' : selected.trend === 'down' ? '▼' : '—'}
              </span>
              <div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: C.muted, letterSpacing: 1 }}>TREND</div>
                <div style={{ fontSize: 12, color: selected.trend === 'up' ? C.green : selected.trend === 'down' ? C.red : C.muted }}>
                  {selected.trend === 'up' ? 'Rising' : selected.trend === 'down' ? 'Falling' : 'Holding'}
                </div>
              </div>
            </div>
            {/* Key stats */}
            {selected.key_stats && Object.keys(selected.key_stats).length > 0 && (
              <div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: C.muted, letterSpacing: 2, marginBottom: 8 }}>KEY STATS</div>
                {Object.entries(selected.key_stats).slice(0, 5).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase' }}>{k.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: 13, color: C.blue, fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
            {/* Notes */}
            {selected.notes && (
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{selected.notes}</div>
            )}
            {/* Week updated */}
            {selected.week_updated && (
              <div style={{ fontSize: 10, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>Updated: Week {selected.week_updated}</div>
            )}
            {/* Remove button */}
            <button
              onClick={() => handleDelete(selected.id)}
              style={{ background: 'transparent', border: `1px solid ${C.red}55`, color: C.red, borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 11, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, fontWeight: 700, marginTop: 4 }}
            >
              ✕ REMOVE CANDIDATE
            </button>
          </Card>
        )}
      </div>
    </div>
  )
}

// ── Media Center (v2 — articles first, generator at bottom) ────
function MediaCenter({ teams, games, players, commPin, onPinSet, isMobile }) {
  const [pinInput,        setPinInput]        = useState('')
  const [pinError,        setPinError]        = useState(false)
  const [showPinBar,      setShowPinBar]      = useState(false)
  const [pastArticles,    setPastArticles]    = useState([])
  const [loadingHistory,  setLoadingHistory]  = useState(false)
  const [expandedId,      setExpandedId]      = useState(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState(null)
  const [isDeleting,      setIsDeleting]      = useState(false)
  const [isEditing,       setIsEditing]       = useState(false)
  const [editContent,     setEditContent]     = useState('')
  const [editTitle,       setEditTitle]       = useState('')
  const [isSaving,        setIsSaving]        = useState(false)
  const [showGenerator,   setShowGenerator]   = useState(false)
  const [genType,         setGenType]         = useState('power-rankings')
  const [genWeek,         setGenWeek]         = useState('')
  const [genCustomPrompt, setGenCustomPrompt] = useState('')
  const [isGenerating,    setIsGenerating]    = useState(false)
  const [genError,        setGenError]        = useState('')
  const [filterType,      setFilterType]      = useState('all')

  const TYPES = [
    { id: 'power-rankings',    label: 'Power Rankings',    icon: '📊' },
    { id: 'weekly-recap',      label: 'Weekly Recap',      icon: '📰' },
    { id: 'league-preview',    label: 'League Preview',    icon: '📅' },
    { id: 'player-spotlight',  label: 'Player Spotlight',  icon: '⭐' },
    { id: 'rivalry-breakdown', label: 'Rivalry Breakdown', icon: '🔥' },
    { id: 'custom',            label: 'Custom',            icon: '✍️' },
  ]

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const url = filterType === 'all' ? '/api/articles?limit=30' : `/api/articles?limit=30&article_type=${filterType}`
      const data = await fetch(url).then(r => r.json())
      setPastArticles(data.articles || [])
    } catch (e) { console.error(e) }
    setLoadingHistory(false)
  }, [filterType])

  useEffect(() => { loadHistory() }, [loadHistory])

  const tryPin = async () => {
    setPinError(false)
    const res = await fetch('/api/coaches/0', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinInput }),
    })
    if (res.status === 403) { setPinError(true); return }
    onPinSet(pinInput); setPinInput(''); setShowPinBar(false)
  }

  const generate = async () => {
    if (genType === 'custom' && !genCustomPrompt.trim()) {
      setGenError('Please describe what you want the article to cover.'); return
    }
    setIsGenerating(true); setGenError('')
    try {
      const res  = await fetch('/api/generate-article', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleType:  genType,
          week:         genWeek || undefined,
          pin:          commPin,
          customPrompt: genType === 'custom' ? genCustomPrompt : undefined,
        }),
      })
      const data = await res.json()
      if (data.error) { setGenError(data.error); return }
      setShowGenerator(false); loadHistory()
    } catch (e) { setGenError('Generation failed. Try again.') }
    finally { setIsGenerating(false) }
  }

  const deleteArticle = async (id) => {
    setIsDeleting(true)
    try {
      await fetch('/api/articles', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, pin: commPin }) })
      if (expandedId === id) setExpandedId(null)
      setDeleteConfirmId(null); loadHistory()
    } catch (e) { /* ignore */ }
    finally { setIsDeleting(false) }
  }

  const saveArticle = async (a) => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/articles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: a.id, article_type: a.article_type, week: a.week, title: editTitle.trim() || a.title || null, content: editContent, pin: commPin }) })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setIsEditing(false); loadHistory()
    } catch (e) { console.error('Save failed:', e.message) }
    finally { setIsSaving(false) }
  }

  const expandedArticle = pastArticles.find(a => a.id === expandedId)

  return (
    <div>
      {/* ── Header row ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
        <SectionTitle isMobile={isMobile} sub="Dynasty Universe · Stories, Previews & Power Rankings">Media Center</SectionTitle>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 4 }}>
          {commPin
            ? <><Badge color={C.green}>✓ Commissioner</Badge><button onClick={() => onPinSet(null)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 12 }}>Lock</button></>
            : <button onClick={() => setShowPinBar(b => !b)} style={{ background: 'transparent', color: C.accent, border: `1px solid ${C.accent}55`, borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 11, letterSpacing: 1 }}>🔒 Commissioner Login</button>
          }
        </div>
      </div>

      {/* ── Inline PIN bar ── */}
      {showPinBar && !commPin && (
        <Card style={{ marginBottom: 16, padding: '12px 16px' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.muted, letterSpacing: 1 }}>ENTER PIN:</span>
            <input type="password" placeholder="Commissioner PIN" value={pinInput}
              onChange={e => { setPinInput(e.target.value); setPinError(false) }}
              onKeyDown={e => e.key === 'Enter' && tryPin()}
              style={{ background: C.bg, border: `1px solid ${pinError ? C.red : C.border}`, borderRadius: 6, padding: '8px 14px', color: C.text, fontSize: 14, width: 160 }}
              autoFocus
            />
            <button onClick={tryPin} style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 12, fontWeight: 700 }}>Unlock</button>
            <button onClick={() => { setShowPinBar(false); setPinError(false); setPinInput('') }} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
            {pinError && <span style={{ color: C.red, fontSize: 12 }}>❌ Incorrect PIN</span>}
          </div>
        </Card>
      )}

      {/* ── Filter tabs ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', ...TYPES.filter(t => t.id !== 'custom').map(t => t.id), 'custom'].map(id => {
          const meta = id === 'all' ? { icon: '📚', label: 'All' } : TYPES.find(t => t.id === id)
          const active = filterType === id
          return (
            <button key={id} onClick={() => { setFilterType(id); setExpandedId(null) }} style={{
              background: active ? C.accent : C.card, color: active ? '#000' : C.muted,
              border: `1px solid ${active ? C.accent : C.border}`, borderRadius: 6,
              padding: '6px 14px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 11, letterSpacing: 0.5,
            }}>{meta.icon} {meta.label}</button>
          )
        })}
        <button onClick={loadHistory} disabled={loadingHistory} style={{ marginLeft: 'auto', background: C.card, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 11 }}>
          {loadingHistory ? '⏳' : '🔄 Refresh'}
        </button>
      </div>

      {/* ── Expanded article view ── */}
      {expandedArticle && (
        <Card style={{ marginBottom: 20, borderLeft: `4px solid ${C.purple}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                <Badge color={C.accent}>{TYPES.find(t => t.id === expandedArticle.article_type)?.icon} {(expandedArticle.article_type || '').replace(/-/g, ' ')}</Badge>
                {expandedArticle.week && <Badge color={C.blue}>Week {expandedArticle.week}</Badge>}
              </div>
              <div style={{ color: C.muted, fontSize: 11 }}>{new Date(expandedArticle.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {commPin && !isEditing && <button onClick={() => { setEditContent(expandedArticle.content); setEditTitle(expandedArticle.title || ''); setIsEditing(true) }} style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 11, fontWeight: 700 }}>✏️ Edit</button>}
              {commPin && isEditing && <><button onClick={() => saveArticle(expandedArticle)} disabled={isSaving} style={{ background: C.green, color: '#000', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 11, fontWeight: 700 }}>{isSaving ? 'Saving…' : '💾 Save'}</button><button onClick={() => setIsEditing(false)} style={{ background: 'transparent', color: C.red, border: `1px solid ${C.red}44`, borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontSize: 11 }}>Cancel</button></>}
              <button onClick={() => navigator.clipboard.writeText(isEditing ? editContent : expandedArticle.content)} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontSize: 11 }}>📋 Copy</button>
              <button onClick={() => { setExpandedId(null); setIsEditing(false) }} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', cursor: 'pointer', fontSize: 11 }}>✕</button>
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${C.border}`, marginBottom: 16 }} />
          {isEditing
            ? (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>HEADLINE</div>
                  <input
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="Article headline…"
                    style={{ width: '100%', background: C.bg, border: `1px solid ${C.accent}`, borderRadius: 6, padding: '10px 14px', color: C.text, fontSize: 17, fontFamily: "'Oswald', sans-serif", fontWeight: 700, boxSizing: 'border-box' }}
                  />
                </div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>BODY</div>
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} style={{ width: '100%', minHeight: 400, background: C.bg, color: C.text, border: `1px solid ${C.accent}`, borderRadius: 6, padding: 14, fontSize: 14, lineHeight: 1.8, fontFamily: 'Lato,sans-serif', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            )
            : (expandedArticle.content || '').split('\n').map((line, i) => {
                if (!line.trim()) return <div key={i} style={{ height: 10 }} />
                const clean = line.replace(/^#+\s*/, '')
                const isHead = i === 0 || (line.length < 90 && (line.startsWith('#') || line === line.toUpperCase()))
                return isHead
                  ? <div key={i} style={{ fontFamily: "'Oswald', sans-serif", fontSize: i === 0 ? (isMobile ? 20 : 24) : 14, color: i === 0 ? C.text : C.accent, letterSpacing: 1, marginBottom: 12, marginTop: i > 0 ? 18 : 0 }}>{clean}</div>
                  : <p key={i} style={{ color: C.text, fontSize: isMobile ? 14 : 15, margin: '0 0 12px', lineHeight: 1.85 }}>{line}</p>
              })
          }
        </Card>
      )}

      {/* ── Articles list ── */}
      {pastArticles.length === 0 && !loadingHistory && (
        <Card style={{ marginBottom: 20 }}>
          <p style={{ color: C.muted, margin: 0, fontSize: 13, fontStyle: 'italic' }}>
            {commPin ? 'No articles yet. Use "✦ Generate New Article" below to write your first dynasty story.' : 'Check back soon — the commissioner will publish articles here.'}
          </p>
        </Card>
      )}

      <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
        {pastArticles.map(a => {
          const meta      = TYPES.find(t => t.id === a.article_type) || { icon: '📄', label: a.article_type }
          const isOpen    = expandedId === a.id
          const confirmDel = deleteConfirmId === a.id
          return (
            <Card key={a.id} style={{ cursor: 'pointer' }}>
              <div onClick={() => { setExpandedId(isOpen ? null : a.id); setIsEditing(false) }} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{meta.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title || meta.label}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge color={C.blue}>{meta.label}</Badge>
                    {a.week && <Badge color={C.muted}>Wk {a.week}</Badge>}
                    <span style={{ color: C.muted, fontSize: 11 }}>{new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
                <span style={{ color: C.muted, fontSize: 14, flexShrink: 0 }}>{isOpen ? '▼' : '▶'}</span>
              </div>
              {commPin && (
                <div style={{ display: 'flex', gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
                  {!confirmDel
                    ? <button onClick={() => setDeleteConfirmId(a.id)} style={{ background: 'transparent', color: C.red, border: `1px solid ${C.red}44`, borderRadius: 5, padding: '4px 12px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 10, letterSpacing: 1 }}>🗑 Delete</button>
                    : <><span style={{ color: C.muted, fontSize: 12, alignSelf: 'center' }}>Sure?</span>
                        <button onClick={() => deleteArticle(a.id)} disabled={isDeleting} style={{ background: C.red, color: '#fff', border: 'none', borderRadius: 5, padding: '4px 12px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 10 }}>Yes, Delete</button>
                        <button onClick={() => setDeleteConfirmId(null)} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 5, padding: '4px 10px', cursor: 'pointer', fontSize: 11 }}>Cancel</button>
                      </>
                  }
                </div>
              )}
            </Card>
          )
        })}
      </div>

      {/* ── Generate panel (commissioner only, collapsed by default) ── */}
      {commPin && (
        <div>
          <button onClick={() => setShowGenerator(g => !g)} style={{
            background: showGenerator ? C.surface : C.green, color: showGenerator ? C.green : '#000',
            border: `1px solid ${C.green}`, borderRadius: 8, padding: '10px 24px',
            cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 13, fontWeight: 700,
            letterSpacing: 0.5, marginBottom: 12, width: isMobile ? '100%' : 'auto',
          }}>
            <span style={{ fontSize: 16 }}>✦</span> {showGenerator ? '✕ Close Generator' : 'Generate New Article'}
          </button>

          {showGenerator && (
            <Card style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: "'Oswald', sans-serif", color: C.accent, fontSize: 14, letterSpacing: 1, marginBottom: 14 }}>✦ GENERATE NEW ARTICLE</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                {TYPES.map(t => (
                  <button key={t.id} onClick={() => setGenType(t.id)} style={{
                    background: genType === t.id ? C.accent : C.card, color: genType === t.id ? '#000' : C.muted,
                    border: `1px solid ${genType === t.id ? C.accent : C.border}`, borderRadius: 6,
                    padding: '7px 14px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 11,
                  }}>{t.icon} {t.label}</button>
                ))}
              </div>
              {/* Custom prompt textarea — only shown when Custom type is selected */}
              {genType === 'custom' && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, color: C.accent, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
                    YOUR INSTRUCTIONS
                  </div>
                  <textarea
                    value={genCustomPrompt}
                    onChange={e => setGenCustomPrompt(e.target.value)}
                    placeholder={`Describe exactly what you want written. Be as specific as you like.\n\nExamples:\n• "Write a feature on the three biggest rivalries forming this season. Use a hype, trash-talk-heavy tone — something the group chat will go crazy over."\n• "Write a mid-season report card grading every coach A through F based on their records and expectations. Be brutally honest."\n• "Write an awards column — best offense, best defense, most improved, biggest flop so far."`}
                    rows={7}
                    style={{
                      width: '100%', background: C.bg,
                      border: `1px solid ${C.accent}55`, borderRadius: 6,
                      padding: '12px 14px', color: C.text, fontSize: 13,
                      lineHeight: 1.6, fontFamily: "'Lato', sans-serif",
                      resize: 'vertical', boxSizing: 'border-box',
                      outline: 'none',
                    }}
                    onFocus={e => e.target.style.borderColor = C.accent}
                    onBlur={e => e.target.style.borderColor = C.accent + '55'}
                  />
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 6 }}>
                    All real league data (coaches, records, scores, standings, championship history) is automatically included. Only write about things that have actually happened in the dynasty.
                  </div>
                </div>
              )}

              <input type="number" placeholder="Week # (optional)" value={genWeek} onChange={e => setGenWeek(e.target.value)}
                style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 14px', color: C.text, fontSize: 13, width: 160, marginBottom: 14 }}
              />
              {genError && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>❌ {genError}</div>}
              <button onClick={generate} disabled={isGenerating} style={{
                background: isGenerating ? C.surface : C.accent, color: isGenerating ? C.muted : '#000',
                border: 'none', borderRadius: 7, padding: '12px 28px',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                fontFamily: "'Oswald', sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 0.5,
                width: isMobile ? '100%' : 'auto',
              }}>{isGenerating ? '⏳ Generating… this takes ~20 sec' : '✦ Generate Article'}</button>
            </Card>
          )}
        </div>
      )}
      {!commPin && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: C.muted, fontSize: 13 }}>
          <button onClick={() => setShowPinBar(true)} style={{ background: 'transparent', color: C.accent, border: `1px solid ${C.accent}44`, borderRadius: 6, padding: '8px 20px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 12 }}>🔒 Commissioner Login to Generate Articles</button>
        </div>
      )}
    </div>
  )
}

// ── Article Slide-Up Panel ────────────────────────────────────
function ArticleSlideUp({ article, onClose, isMobile }) {
  useEffect(() => {
    if (article) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [article])

  if (!article) return null

  const meta = ARTICLE_TYPE_LABELS[article.article_type] || { label: article.article_type, icon: '📄' }

  // Render simple markdown-ish content
  const formatInline = (text) => {
    const parts = (text || '').split(/(\*\*[^*]+\*\*)/)
    return parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i} style={{ color: C.text, fontWeight: 700 }}>{p.slice(2, -2)}</strong>
        : p
    )
  }

  const renderContent = (text) => {
    return (text || '').split('\n').map((line, i) => {
      if (!line.trim()) return <div key={i} style={{ height: 10 }} />
      if (line.startsWith('### ')) return <h3 key={i} style={{ fontFamily: "'Oswald', sans-serif", fontSize: 13, color: C.accent, margin: '18px 0 6px', textTransform: 'uppercase', letterSpacing: 1.5 }}>{line.slice(4)}</h3>
      if (line.startsWith('## '))  return <h2 key={i} style={{ fontFamily: "'Oswald', sans-serif", fontSize: 19, color: C.text, margin: '22px 0 8px', fontWeight: 700 }}>{line.slice(3)}</h2>
      if (line.startsWith('# '))   return <h1 key={i} style={{ fontFamily: "'Oswald', sans-serif", fontSize: 24, color: C.text, margin: '24px 0 10px', fontWeight: 700 }}>{line.slice(2)}</h1>
      if (line.match(/^[-*] /)) return (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, paddingLeft: 8 }}>
          <span style={{ color: C.accent, flexShrink: 0, marginTop: 2 }}>·</span>
          <span style={{ color: C.muted, fontSize: isMobile ? 15 : 14, lineHeight: 1.8 }}>{formatInline(line.slice(2))}</span>
        </div>
      )
      return <p key={i} style={{ color: C.muted, fontSize: isMobile ? 15 : 14, lineHeight: 1.9, margin: '0 0 14px' }}>{formatInline(line)}</p>
    })
  }

  const copyText = () => {
    const txt = `${article.title || meta.label}\n\n${(article.content || '').replace(/[#*`_]/g, '')}`
    navigator.clipboard?.writeText(txt).catch(() => {})
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 400, backdropFilter: 'blur(3px)' }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: isMobile ? '93vh' : '86vh',
        background: C.surface,
        borderTop: `3px solid ${C.purple}`,
        borderRadius: '18px 18px 0 0',
        zIndex: 401,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        animation: 'articleSlideUp 0.28s cubic-bezier(0.22,1,0.36,1)',
      }}>
        <style>{`@keyframes articleSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }`}</style>

        {/* Header */}
        <div style={{ padding: isMobile ? '14px 16px' : '16px 24px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'flex-start', gap: 12, flexShrink: 0, background: C.surface }}>
          <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{meta.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 8, color: C.purple, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 4 }}>
              {meta.label}{article.week ? ` · Week ${article.week}` : ''}
            </div>
            <div style={{ color: C.text, fontWeight: 700, fontSize: isMobile ? 16 : 20, lineHeight: 1.25 }}>
              {article.title || meta.label}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={copyText} title="Copy article text" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: '8px 13px', cursor: 'pointer', color: C.muted, fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
              📋 <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, letterSpacing: 1 }}>Copy</span>
            </button>
            <button onClick={onClose} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 7, padding: '8px 13px', cursor: 'pointer', color: C.text, fontSize: 18, lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px 40px' : '28px 40px 48px', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            {renderContent(article.content)}
          </div>
        </div>
      </div>
    </>
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
        Set the official current week. The dashboard, articles, and narrative engine all use this as their anchor.
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
    { id: 'auto',        label: '✨ Auto-Detect',  desc: 'Smart detection — works for any screenshot or doc' },
    { id: 'schedule',    label: '📅 Schedule',     desc: 'Full season schedule — imports upcoming matchups. Works with Google Docs, Sheets, or schedule screenshots.' },
    { id: 'standings',   label: '📊 Standings',    desc: 'Win/loss records, conference standings' },
    { id: 'scores',      label: '🏈 Scores',       desc: 'Scoreboards, game results' },
    { id: 'player_stats',label: '⭐ Player Stats',  desc: 'Stat leaders, individual numbers' },
    { id: 'recruiting',  label: '📋 Recruiting',   desc: 'Commitments, visits, offers' },
    { id: 'championship',label: '🏆 Championship', desc: 'Trophy screens, bowl/CFP results' },
    { id: 'ap_poll',     label: '🗳️ AP Top 25',    desc: 'AP Top 25 poll screenshot — updates the Standings AP Poll view. Cannot be manually edited.' },
    { id: 'heisman_watch', label: '🏆 Heisman Watch', desc: 'Heisman Trophy Watch screen — replaces current candidates with the 5 shown in-game.' },
    { id: 'team_stats',   label: '📊 Team Stats',    desc: 'EA CFB Team Stats screen (Offense or Defense tab) — saves to the Season › Team Stats view.' },
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
    if (result.saved?.heisman) parts.push(`${result.saved.heisman} Heisman candidate${result.saved.heisman !== 1 ? 's' : ''}`)
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
          const result      = results[file.id]
          const isParsing   = parsing === file.id
          const isDoc       = file.mimeType === 'application/vnd.google-apps.document'
          const isSheet     = file.mimeType === 'application/vnd.google-apps.spreadsheet'
          const fileIcon    = isDoc ? '📄' : isSheet ? '📊' : '🖼️'
          const fileLabel   = isDoc ? 'Google Doc' : isSheet ? 'Spreadsheet' : 'Image'
          const savedSummary = getSavedSummary(result)

          return (
            <Card key={file.id} style={{
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: 14,
            }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{fileIcon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: C.text, fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                  <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>
                    {fileLabel} · {new Date(file.createdTime).toLocaleString()}
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
                  {result?.error && <div style={{ color: C.red, fontSize: 12, marginTop: 4 }}>❌ {result.error}{result.details ? `: ${result.details}` : ''}</div>}
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
                  {result?.success ? '✅ Synced' : isParsing ? '⏳ Reading...' : '🔍 Scan & Import'}
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
          <li>Click <strong style={{ color: C.text }}>Scan All New Files</strong> or <strong style={{ color: C.text }}>Scan & Import</strong> individually</li>
          <li>Standings, scores, stats, recruiting, and championships update automatically</li>
        </ol>
      </Card>
    </div>
  )
}

// ── Matchups Tab ───────────────────────────────────────────────
function MatchupsTab({ games, teams, settings, articles, isMobile, onArticleOpen, onArticlesChange, commPin, onPinSet }) {
  const finalGames    = games.filter(gameIsFinal)
  const upcomingGames = games.filter(g => !gameIsFinal(g) && g.home_team && g.away_team)

  // Generate state (keyed by "HomeTeam|AwayTeam|Week")
  const [generating,    setGenerating]    = useState(null)
  const [genError,      setGenError]      = useState({})
  const [pinInput,      setPinInput]      = useState('')
  const [pinError,      setPinError]      = useState('')
  const [showPinFor,    setShowPinFor]    = useState(null) // game key
  const [localArticles, setLocalArticles] = useState([])  // freshly generated this session

  const gameKey = (g) => `${g.home_team}|${g.away_team}|${g.week}`

  // Merge saved articles with any freshly generated ones from this session
  const allPreviewArticles = [
    ...localArticles,
    ...(articles || []).filter(a => a.article_type === 'matchup-preview'),
  ]

  // Get the blurb for a game — first paragraph of the most recent preview
  const getGameBlurb = (g) => {
    const title = `Matchup Preview: ${g.home_team} vs ${g.away_team}`
    const match = allPreviewArticles.find(a =>
      a.title?.includes(g.home_team) && a.title?.includes(g.away_team) &&
      (g.week == null || a.title?.includes(`Week ${g.week}`) || a.week == null || a.week === g.week)
    )
    if (!match?.content) return null
    // Return first non-empty paragraph (up to 280 chars)
    const firstPara = match.content.split(/\n+/).find(p => p.trim().length > 30) || ''
    return firstPara.length > 280 ? firstPara.slice(0, 277) + '…' : firstPara
  }

  const generatePreview = async (g, pin) => {
    const key = gameKey(g)
    setGenerating(key)
    setGenError(e => ({ ...e, [key]: null }))
    try {
      const res  = await fetch('/api/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articleType: 'matchup-preview',
          homeTeam: g.home_team,
          awayTeam: g.away_team,
          week: g.week,
          pin,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setGenError(e => ({ ...e, [key]: data.error || 'Generation failed' }))
        return
      }
      // Store article locally so blurb shows immediately
      const newArticle = {
        title: `Matchup Preview: ${g.home_team} vs ${g.away_team}${g.week ? ` — Week ${g.week}` : ''}`,
        article_type: 'matchup-preview',
        week: g.week,
        content: data.article,
        created_at: new Date().toISOString(),
      }
      setLocalArticles(prev => [newArticle, ...prev])
      // Refresh parent article list (so it persists on next load)
      onArticlesChange?.()
      // Open the article
      if (onArticleOpen) onArticleOpen(newArticle)
    } catch (e) {
      setGenError(err => ({ ...err, [key]: 'Something went wrong. Try again.' }))
    } finally {
      setGenerating(null)
    }
  }

  const handleGenerate = (g) => {
    const key = gameKey(g)
    if (commPin) {
      generatePreview(g, commPin)
    } else {
      setShowPinFor(showPinFor === key ? null : key)
      setPinInput('')
      setPinError('')
    }
  }

  const submitPin = (g) => {
    if (!pinInput.trim()) return
    const key = gameKey(g)
    setPinError('')
    // Verify PIN via the coaches endpoint then generate
    fetch('/api/coaches/0', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pinInput }),
    }).then(r => {
      if (r.status === 403) { setPinError('Wrong PIN'); return }
      if (onPinSet) onPinSet(pinInput)
      setShowPinFor(null)
      generatePreview(g, pinInput)
    }).catch(() => setPinError('Something went wrong'))
  }

  const getH2H = (a, b) =>
    finalGames
      .filter(g => (g.home_team === a && g.away_team === b) || (g.home_team === b && g.away_team === a))
      .sort((x, y) => y.week - x.week)

  const getRecentGames = (name) =>
    finalGames
      .filter(g => g.home_team === name || g.away_team === name)
      .sort((a, b) => b.week - a.week)
      .slice(0, 4)

  const findTeam = (name) => teams.find(t => t.name === name)

  const FormBadge = ({ recentGs, teamName }) => (
    <div style={{ display: 'flex', gap: 4 }}>
      {recentGs.map((m, i) => {
        const isHome = m.home_team === teamName
        const won = isHome ? m.home_score > m.away_score : m.away_score > m.home_score
        return (
          <span key={i} style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, borderRadius: 5,
            background: won ? C.green + '22' : C.red + '22',
            color: won ? C.green : C.red,
            fontSize: 10, fontFamily: "'Oswald', sans-serif", fontWeight: 700,
            border: `1px solid ${won ? C.green + '55' : C.red + '55'}`,
          }}>{won ? 'W' : 'L'}</span>
        )
      })}
    </div>
  )

  const GamePreviewCard = ({ g }) => {
    const h2h = getH2H(g.home_team, g.away_team)
    const homeRecent = getRecentGames(g.home_team)
    const awayRecent = getRecentGames(g.away_team)
    const homeTeam = findTeam(g.home_team)
    const awayTeam = findTeam(g.away_team)
    const cardApRankings = settings?.ap_rankings || []
    const homeApRank = getApRank(g.home_team, cardApRankings)
    const awayApRank = getApRank(g.away_team, cardApRankings)

    let homeH2HWins = 0, awayH2HWins = 0
    h2h.forEach(m => {
      const hw = m.home_score > m.away_score
      if ((m.home_team === g.home_team && hw) || (m.away_team === g.home_team && !hw)) homeH2HWins++
      else awayH2HWins++
    })

    return (
      <Card style={{ marginBottom: 18, padding: 0, overflow: 'hidden' }}>
        {/* Week label */}
        <div style={{ padding: '10px 20px', borderBottom: `1px solid ${C.border}`, background: C.surface, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: C.muted, letterSpacing: 3, textTransform: 'uppercase' }}>Week {g.week}</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 9, color: C.accent, background: C.accent + '18', border: `1px solid ${C.accent}33`, borderRadius: 3, padding: '2px 10px', letterSpacing: 2 }}>UPCOMING</span>
        </div>

        {/* Teams row */}
        <div style={{ padding: '22px 20px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 120px 1fr', gap: isMobile ? 20 : 16, alignItems: 'center' }}>

          {/* Home team */}
          <div>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, color: C.text, lineHeight: 1.1, marginBottom: 4, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              {homeApRank && <ApRankBadge rank={homeApRank} style={{ fontSize: 12 }} />}
              {g.home_team}
            </div>
            {homeTeam && (
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>
                {homeTeam.wins}-{homeTeam.losses}{homeTeam.coach ? ` · ${homeTeam.coach}` : ''}
                {homeTeam.pts ? <span style={{ color: C.subtle }}> · {Math.round(homeTeam.pts / ((homeTeam.wins + homeTeam.losses) || 1))} ppg</span> : null}
              </div>
            )}
            {homeRecent.length > 0 && (
              <div>
                <div style={{ fontSize: 8, color: C.muted, fontFamily: "'Oswald', sans-serif", letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>Last {homeRecent.length}</div>
                <FormBadge recentGs={homeRecent} teamName={g.home_team} />
              </div>
            )}
          </div>

          {/* Center: VS + H2H */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 20, color: C.subtle, fontWeight: 700, marginBottom: 10 }}>VS</div>
            {h2h.length > 0 ? (
              <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', display: 'inline-block' }}>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 7, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>All-Time Series</div>
                <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, lineHeight: 1 }}>
                  <span style={{ color: homeH2HWins >= awayH2HWins ? C.green : C.muted }}>{homeH2HWins}</span>
                  <span style={{ color: C.subtle }}> – </span>
                  <span style={{ color: awayH2HWins > homeH2HWins ? C.green : C.muted }}>{awayH2HWins}</span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 10, color: C.subtle, fontFamily: "'Oswald', sans-serif", letterSpacing: 1 }}>FIRST<br />MEETING</div>
            )}
          </div>

          {/* Away team */}
          <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 700, color: C.text, lineHeight: 1.1, marginBottom: 4, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
              {awayApRank && <ApRankBadge rank={awayApRank} style={{ fontSize: 12 }} />}
              {g.away_team}
            </div>
            {awayTeam && (
              <div style={{ color: C.muted, fontSize: 12, marginBottom: 10 }}>
                {awayTeam.wins}-{awayTeam.losses}{awayTeam.coach ? ` · ${awayTeam.coach}` : ''}
                {awayTeam.pts ? <span style={{ color: C.subtle }}> · {Math.round(awayTeam.pts / ((awayTeam.wins + awayTeam.losses) || 1))} ppg</span> : null}
              </div>
            )}
            {awayRecent.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMobile ? 'flex-start' : 'flex-end' }}>
                <div style={{ fontSize: 8, color: C.muted, fontFamily: "'Oswald', sans-serif", letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>Last {awayRecent.length}</div>
                <FormBadge recentGs={awayRecent} teamName={g.away_team} />
              </div>
            )}
          </div>
        </div>

        {/* H2H recent meetings */}
        {h2h.length > 0 && (
          <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 20px' }}>
            <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 8, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>Recent Meetings</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {h2h.slice(0, 3).map((m, i) => {
                const hw = m.home_score > m.away_score
                const winner = hw ? m.home_team : m.away_team
                return (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12 }}>
                    <span style={{ color: C.subtle, fontFamily: "'Oswald', sans-serif", fontSize: 9, letterSpacing: 1, flexShrink: 0 }}>Wk {m.week}</span>
                    <span style={{ color: hw ? C.text : C.muted, fontWeight: hw ? 700 : 400 }}>{m.home_team} {m.home_score}</span>
                    <span style={{ color: C.subtle }}>–</span>
                    <span style={{ color: !hw ? C.text : C.muted, fontWeight: !hw ? 700 : 400 }}>{m.away_team} {m.away_score}</span>
                    <span style={{ color: C.accent, fontSize: 9, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, marginLeft: 'auto' }}>
                      {winner === g.home_team ? g.home_team.split(' ')[0] : g.away_team.split(' ')[0]} won
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Saved preview blurb — visible to all users */}
        {(() => {
          const blurb = getGameBlurb(g)
          if (!blurb) return null
          return (
            <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 20px', background: C.surface + '66' }}>
              <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 8, color: C.accent, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8 }}>✦ Preview</div>
              <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.65, margin: 0 }}>{blurb}</p>
            </div>
          )
        })()}

        {/* Generate Preview Article */}
        {(() => {
          const key = gameKey(g)
          const isGeneratingThis = generating === key
          const err = genError[key]
          const showPin = showPinFor === key
          return (
            <div style={{ borderTop: `1px solid ${C.border}`, padding: '14px 20px', background: C.surface + 'aa' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleGenerate(g)}
                  disabled={isGeneratingThis}
                  style={{
                    background: isGeneratingThis ? C.subtle : commPin ? C.accent + '18' : 'transparent',
                    color: isGeneratingThis ? C.muted : commPin ? C.accent : C.muted,
                    border: `1px solid ${isGeneratingThis ? C.border : commPin ? C.accent + '55' : C.border}`,
                    borderRadius: 7, padding: '9px 18px',
                    cursor: isGeneratingThis ? 'not-allowed' : 'pointer',
                    fontFamily: "'Oswald', sans-serif", fontSize: 12, letterSpacing: 1,
                    textTransform: 'uppercase', whiteSpace: 'nowrap', minHeight: 38,
                  }}
                >
                  {isGeneratingThis ? '⏳ Generating… ~20s' : '✦ Generate Preview Article'}
                </button>
                {!commPin && !showPin && (
                  <span style={{ color: C.subtle, fontSize: 11 }}>Commissioner only</span>
                )}
              </div>

              {/* Inline PIN entry */}
              {showPin && (
                <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="password"
                    placeholder="Commissioner PIN"
                    value={pinInput}
                    onChange={e => { setPinInput(e.target.value); setPinError('') }}
                    onKeyDown={e => e.key === 'Enter' && submitPin(g)}
                    style={{ flex: 1, minWidth: 130, background: C.card, border: `1px solid ${pinError ? C.red : C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 13 }}
                    autoFocus
                  />
                  <button
                    onClick={() => submitPin(g)}
                    style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}
                  >Generate →</button>
                  <button
                    onClick={() => { setShowPinFor(null); setPinError('') }}
                    style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}
                  >Cancel</button>
                  {pinError && <span style={{ color: C.red, fontSize: 12, width: '100%' }}>❌ {pinError}</span>}
                </div>
              )}

              {err && <div style={{ marginTop: 8, color: C.red, fontSize: 12 }}>❌ {err}</div>}
            </div>
          )
        })()}
      </Card>
    )
  }

  return (
    <div>
      <SectionTitle isMobile={isMobile} sub="Game previews — series history, current records, and recent form">Matchups</SectionTitle>

      {/* Upcoming games */}
      {upcomingGames.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '48px 20px', borderStyle: 'dashed', marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 14 }}>📅</div>
          <div style={{ color: C.text, fontSize: 16, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, marginBottom: 8 }}>No Upcoming Matchups</div>
          <div style={{ color: C.muted, fontSize: 13, lineHeight: 1.7 }}>
            Sync a schedule from the Drive tab and upcoming<br />game cards will appear here automatically.
          </div>
        </Card>
      ) : (
        upcomingGames.map((g, i) => <GamePreviewCard key={`${g.home_team}-${g.away_team}-${g.week}-${i}`} g={g} />)
      )}

      {/* Stories */}
      {articles.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 4, height: 18, background: C.purple, borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 10, color: C.muted, letterSpacing: 3, textTransform: 'uppercase' }}>Latest Stories</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {articles.slice(0, 8).map(a => {
              const meta = ARTICLE_TYPE_LABELS[a.article_type] || { label: a.article_type, icon: '📄' }
              const snippet = (a.content || '').replace(/[#*`_]/g, '').slice(0, 130).trim()
              return (
                <Card
                  key={a.id}
                  onClick={() => onArticleOpen && onArticleOpen(a)}
                  style={{ padding: '14px 16px', borderLeft: `3px solid ${C.purple}44`, cursor: 'pointer', transition: 'border-left-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderLeftColor = C.purple}
                  onMouseLeave={e => e.currentTarget.style.borderLeftColor = C.purple + '44'}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{meta.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 8, color: C.purple, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 3 }}>{meta.label}{a.week ? ` · Wk ${a.week}` : ''}</div>
                      <div style={{ color: C.text, fontSize: 14, fontWeight: 700, lineHeight: 1.3, marginBottom: 5 }}>{a.title || meta.label}</div>
                      <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6 }}>{snippet}{snippet.length >= 130 ? '…' : ''}</div>
                    </div>
                    <span style={{ color: C.muted, fontSize: 22, flexShrink: 0, alignSelf: 'center', marginLeft: 4 }}>›</span>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Awards Tab (Heisman + Trophy Room combined) ────────────────
function AwardsTab({ heismanCandidates = [], onRefresh, championships = [], coaches = [], isMobile }) {
  const [subTab, setSubTab] = useState('heisman')
  return (
    <div>
      {/* Sub-tab pill selector */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {[
          { id: 'heisman', label: '🏆 Heisman Watch' },
          { id: 'trophy',  label: '🎖️ Trophy Room'   },
        ].map(s => (
          <button
            key={s.id}
            onClick={() => setSubTab(s.id)}
            style={{
              background: subTab === s.id ? C.accent : C.card,
              color:      subTab === s.id ? '#000'   : C.muted,
              border:     `1px solid ${subTab === s.id ? C.accent : C.border}`,
              borderRadius: 6, padding: '10px 20px', cursor: 'pointer',
              fontFamily: "'Oswald', sans-serif", fontSize: 13,
              letterSpacing: 0.5, transition: 'all 0.15s', minHeight: 40,
            }}
          >{s.label}</button>
        ))}
      </div>
      {subTab === 'heisman' && (
        <HeismanTab heismanCandidates={heismanCandidates} onRefresh={onRefresh} isMobile={isMobile} />
      )}
      {subTab === 'trophy' && (
        <TrophyRoom championships={championships} coaches={coaches} isMobile={isMobile} />
      )}
    </div>
  )
}

// ── Trophy Room ────────────────────────────────────────────────
function TrophyRoom({ championships = [], coaches = [], isMobile }) {
  const userCoachNames = new Set((coaches || []).map(c => (c.name || '').toLowerCase().trim()))
  const allChamps = [...championships]
    .filter(ch => ch.championship_type === 'national' || !ch.championship_type)
    .sort((a, b) => b.season - a.season)
  const userWins = allChamps.filter(ch => userCoachNames.has((ch.coach_name || '').toLowerCase().trim()))
  const cpuWins  = allChamps.filter(ch => !userCoachNames.has((ch.coach_name || '').toLowerCase().trim()))

  // Hall-of-fame stats
  const champCounts = {}
  allChamps.forEach(ch => { const k = ch.team_name || '?'; champCounts[k] = (champCounts[k] || 0) + 1 })
  const mostCrowns = Object.entries(champCounts).sort((a, b) => b[1] - a[1])[0]

  const trophyRoomCSS = `
    @keyframes trGoldShimmer {
      0%   { background-position: -300% center; }
      100% { background-position: 300% center; }
    }
    @keyframes trGlowPulse {
      0%, 100% { box-shadow: 0 0 24px #c9a84c2a, 0 4px 40px #c9a84c0f, inset 0 1px 0 #c9a84c22; }
      50%       { box-shadow: 0 0 40px #c9a84c44, 0 4px 60px #c9a84c1e, inset 0 1px 0 #c9a84c44; }
    }
    @keyframes trTrophyFloat {
      0%, 100% { transform: translateY(0px) rotate(-2deg); }
      50%       { transform: translateY(-8px) rotate(2deg); }
    }
    @keyframes trFadeSlideUp {
      from { opacity: 0; transform: translateY(30px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes trSpotlightSweep {
      0%   { opacity: 0.03; transform: translateX(-60%) skewX(-15deg); }
      50%  { opacity: 0.07; }
      100% { opacity: 0.03; transform: translateX(160%) skewX(-15deg); }
    }
    @keyframes trStarPop {
      0%   { transform: scale(0) rotate(0deg); opacity: 0; }
      60%  { transform: scale(1.2) rotate(180deg); opacity: 1; }
      100% { transform: scale(1) rotate(360deg); opacity: 1; }
    }
    .tr-user-card {
      animation: trFadeSlideUp 0.6s ease both, trGlowPulse 5s ease-in-out 0.6s infinite;
    }
    .tr-cpu-card {
      animation: trFadeSlideUp 0.5s ease both;
    }
    .tr-shimmer-text {
      background: linear-gradient(90deg, #c9a84c 0%, #f5d789 30%, #e8c060 50%, #f5d789 70%, #c9a84c 100%);
      background-size: 300% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: trGoldShimmer 4s linear infinite;
    }
  `

  const ChampCard = ({ ch, idx }) => {
    const isUser = userCoachNames.has((ch.coach_name || '').toLowerCase().trim())
    return (
      <div
        className={isUser ? 'tr-user-card' : 'tr-cpu-card'}
        style={{
          position: 'relative',
          background: isUser
            ? 'linear-gradient(145deg, #1a160b 0%, #211a0d 40%, #1a160b 100%)'
            : 'linear-gradient(145deg, #111116 0%, #14141c 100%)',
          border: `1px solid ${isUser ? '#c9a84c44' : '#1f1f2e'}`,
          borderRadius: 16,
          padding: isMobile ? '24px 18px' : '32px 36px',
          overflow: 'hidden',
          animationDelay: `${idx * 0.08}s`,
        }}
      >
        {/* Animated spotlight sweep (user wins only) */}
        {isUser && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            overflow: 'hidden', borderRadius: 16,
          }}>
            <div style={{
              position: 'absolute', top: '-20%', left: 0, right: 0,
              height: '140%', width: '60%',
              background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)',
              animation: 'trSpotlightSweep 6s ease-in-out infinite',
              animationDelay: `${idx * 1.2}s`,
            }} />
          </div>
        )}

        {/* Watermark year */}
        <div style={{
          position: 'absolute',
          right: isMobile ? -8 : 16,
          top: '50%', transform: 'translateY(-50%)',
          fontFamily: "'Oswald', sans-serif",
          fontSize: isMobile ? 90 : 130,
          fontWeight: 700,
          color: isUser ? '#c9a84c' : '#4444aa',
          opacity: 0.07,
          lineHeight: 1,
          userSelect: 'none', pointerEvents: 'none',
          letterSpacing: -4,
        }}>S{ch.season}</div>

        {/* Top label row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{
            fontFamily: "'Oswald', sans-serif",
            fontSize: 10, letterSpacing: 4,
            color: isUser ? '#c9a84c99' : '#55556688',
            textTransform: 'uppercase',
          }}>SEASON {ch.season} · NATIONAL CHAMPIONSHIP</div>
          {isUser && (
            <div style={{
              background: 'linear-gradient(135deg, #c9a84c, #e8c060)',
              color: '#000', fontFamily: "'Oswald', sans-serif",
              fontSize: 8, letterSpacing: 2, textTransform: 'uppercase',
              padding: '3px 10px', borderRadius: 3, fontWeight: 700,
              flexShrink: 0,
            }}>★ YOUR DYNASTY</div>
          )}
        </div>

        {/* Main layout: winner + vs + loser */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMobile ? 14 : 28,
          flexWrap: isMobile ? 'wrap' : 'nowrap',
        }}>

          {/* WINNER */}
          <div style={{ flex: 1, minWidth: isMobile ? '100%' : 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <TeamLogo team={ch.team_name} size={isMobile ? 48 : 60} />
              <div>
                <div
                  className={isUser ? 'tr-shimmer-text' : ''}
                  style={isUser ? {
                    fontFamily: "'Oswald', sans-serif",
                    fontSize: isMobile ? 22 : 28, fontWeight: 700, lineHeight: 1,
                  } : {
                    fontFamily: "'Oswald', sans-serif",
                    fontSize: isMobile ? 22 : 28, fontWeight: 700,
                    color: C.text, lineHeight: 1,
                  }}
                >{ch.team_name}</div>
                {ch.coach_name && (
                  <div style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Coach {ch.coach_name}</div>
                )}
                {ch.record && (
                  <div style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontSize: 15,
                    color: isUser ? C.accent : C.muted,
                    marginTop: 3,
                    letterSpacing: 0.5,
                  }}>{ch.record}</div>
                )}
              </div>
            </div>
          </div>

          {/* VS / Score divider */}
          {ch.opponent_team && (
            <div style={{
              flexShrink: 0, textAlign: 'center',
              padding: isMobile ? '4px 0' : '0 8px',
            }}>
              {ch.result ? (
                <div style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: isMobile ? 20 : 26, fontWeight: 700,
                  color: isUser ? C.accent : C.muted,
                  letterSpacing: 1, lineHeight: 1,
                  whiteSpace: 'nowrap',
                }}>{ch.result}</div>
              ) : null}
              <div style={{
                color: isUser ? '#c9a84c66' : '#44446688',
                fontSize: 10, letterSpacing: 3,
                textTransform: 'uppercase',
                marginTop: ch.result ? 4 : 0,
                fontFamily: "'Oswald', sans-serif",
              }}>DEF.</div>
            </div>
          )}

          {/* LOSER */}
          {ch.opponent_team && (
            <div style={{ flex: isMobile ? 'none' : 0.8, opacity: 0.55, minWidth: isMobile ? 0 : 150 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <TeamLogo team={ch.opponent_team} size={isMobile ? 32 : 40} />
                <div>
                  <div style={{
                    fontFamily: "'Oswald', sans-serif",
                    fontSize: isMobile ? 15 : 18,
                    color: C.muted, lineHeight: 1,
                  }}>{ch.opponent_team}</div>
                  {ch.opponent_record && (
                    <div style={{ color: C.muted, fontSize: 12, opacity: 0.8, marginTop: 2 }}>{ch.opponent_record}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom accent line (user wins only) */}
        {isUser && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: 2,
            background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)',
          }} />
        )}
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: isMobile ? 20 : 40 }}>
      <style>{trophyRoomCSS}</style>

      {/* ── Dramatic header ── */}
      <div style={{ textAlign: 'center', marginBottom: isMobile ? 40 : 56, paddingTop: 8 }}>
        <div style={{
          fontSize: isMobile ? 56 : 72,
          display: 'inline-block',
          animation: 'trTrophyFloat 3.5s ease-in-out infinite',
          marginBottom: 16,
        }}>🏆</div>

        <div style={{
          fontFamily: "'Oswald', sans-serif",
          fontSize: isMobile ? 26 : 40,
          fontWeight: 700,
          letterSpacing: isMobile ? 4 : 8,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
          className="tr-shimmer-text"
        >TROPHY ROOM</div>

        <div style={{ color: C.muted, fontSize: 12, letterSpacing: 3, textTransform: 'uppercase' }}>
          {allChamps.length} National Championship{allChamps.length !== 1 ? 's' : ''}
          {userWins.length > 0 && ` · ${userWins.length} User-Coached`}
        </div>
      </div>

      {/* ── Empty state ── */}
      {allChamps.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 64, opacity: 0.15, marginBottom: 20 }}>🏟️</div>
          <div style={{
            fontFamily: "'Oswald', sans-serif", fontSize: 22,
            color: C.muted, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8,
          }}>THE TROPHY CASE IS EMPTY</div>
          <div style={{ color: C.muted, fontSize: 13 }}>
            Import championship data to fill your trophy room.<br />
            Sync a screenshot tagged as "championship" to get started.
          </div>
        </div>
      )}

      {/* ── Championship cards (user wins first, then CPU) ── */}
      {allChamps.length > 0 && (
        <div style={{ maxWidth: isMobile ? '100%' : 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: isMobile ? 20 : 32 }}>

          {/* User-coached wins */}
          {userWins.length > 0 && (
            <>
              {userWins.length < allChamps.length && (
                <div style={{
                  fontFamily: "'Oswald', sans-serif", fontSize: 10,
                  letterSpacing: 4, color: C.accent,
                  textTransform: 'uppercase', paddingBottom: 4,
                  borderBottom: `1px solid ${C.accent}22`,
                }}>USER-COACHED CHAMPIONSHIPS</div>
              )}
              {userWins.map((ch, idx) => <ChampCard key={ch.id || ch.season} ch={ch} idx={idx} />)}
            </>
          )}

          {/* CPU wins (if any) */}
          {cpuWins.length > 0 && (
            <>
              <div style={{
                fontFamily: "'Oswald', sans-serif", fontSize: 10,
                letterSpacing: 4, color: C.muted,
                textTransform: 'uppercase', paddingBottom: 4, marginTop: 8,
                borderBottom: `1px solid ${C.border}`,
              }}>CPU DYNASTIES</div>
              {cpuWins.map((ch, idx) => <ChampCard key={ch.id || ch.season} ch={ch} idx={userWins.length + idx} />)}
            </>
          )}
        </div>
      )}

      {/* ── Hall of Fame stats row ── */}
      {allChamps.length > 0 && (
        <div style={{
          maxWidth: isMobile ? '100%' : 900, margin: `${isMobile ? 36 : 52}px auto 0`,
          background: C.card, borderRadius: 12,
          border: `1px solid ${C.border}`,
          padding: isMobile ? '24px 20px' : '28px 36px',
        }}>
          <div style={{
            fontFamily: "'Oswald', sans-serif", fontSize: 10,
            letterSpacing: 4, color: C.muted, textTransform: 'uppercase',
            marginBottom: 24,
          }}>DYNASTY HALL OF FAME</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${isMobile ? 2 : 4}, 1fr)`,
            gap: isMobile ? 20 : 28,
          }}>
            {[
              { icon: '🏆', label: 'Total Titles', value: allChamps.length },
              { icon: '🌟', label: 'User Titles', value: userWins.length },
              { icon: '👑', label: 'Winningest Program', value: mostCrowns ? `${mostCrowns[0]}` : '—', sub: mostCrowns && mostCrowns[1] > 1 ? `${mostCrowns[1]}× champion` : null },
              { icon: '🎖️', label: 'Reigning Champ', value: allChamps[0]?.team_name || '—', sub: allChamps[0] ? `Season ${allChamps[0].season}` : null },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                <div style={{
                  fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 16 : 20,
                  color: C.accent, fontWeight: 700, lineHeight: 1.2,
                }}>{s.value}</div>
                {s.sub && <div style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>{s.sub}</div>}
                <div style={{
                  color: C.muted, fontSize: 9,
                  textTransform: 'uppercase', letterSpacing: 1, marginTop: 4,
                }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Root App ───────────────────────────────────────────────────
export default function App() {
  const isMobile = useMobile()
  const [tab, setTab]                   = useState('Dashboard')
  const [data, setData]                 = useState({ teams: [], games: [], players: [], scanLog: [], settings: { current_week: 0, current_season: 1 }, heismanCandidates: [], championships: [] })
  const [loadingData, setLoadingData]   = useState(true)
  const [commPin, setCommPin]           = useState(null)
  const [showCommLogin, setShowCommLogin] = useState(false)
  const [commLoginInput, setCommLoginInput] = useState('')
  const [commLoginError, setCommLoginError] = useState('')
  const [narrativeEntries, setNarrativeEntries] = useState([])
  const [articles, setArticles]         = useState([])
  const [openArticle, setOpenArticle]   = useState(null)
  const [logoOverrides, setLogoOverrides] = useState({})

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

  // Sync logo overrides from Supabase settings (league-wide, not just local browser)
  useEffect(() => {
    if (data.settings?.logo_overrides) {
      setLogoOverrides(data.settings.logo_overrides)
    }
  }, [data.settings?.logo_overrides])

  async function setLogoOverride(teamName, value) {
    const key = (teamName || '').toLowerCase().trim()
    setLogoOverrides(prev => {
      const next = { ...prev }
      if (value == null) delete next[key]
      else next[key] = value
      // Save to Supabase so all users see the change
      if (commPin) {
        fetch('/api/league-settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: commPin, logo_overrides: next }),
        }).catch(() => {})
      }
      return next
    })
  }

  async function resetLogoOverrides() {
    setLogoOverrides({})
    if (commPin) {
      fetch('/api/league-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: commPin, logo_overrides: {} }),
      }).catch(() => {})
    }
  }

  // Commissioner login handler (used by top nav login bar)
  const handleCommLogin = async () => {
    if (!commLoginInput.trim()) return
    // Verify PIN against the coaches API
    try {
      const res = await fetch('/api/coaches/0', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: commLoginInput.trim() }),
      })
      if (res.status === 403) { setCommLoginError('Wrong PIN — try again'); return }
      const pin = commLoginInput.trim()
      setCommPin(pin)
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('dynasty_comm_pin', pin)
      setShowCommLogin(false); setCommLoginInput(''); setCommLoginError('')
    } catch {
      setCommLoginError('Connection error — try again')
    }
  }

  return (
    <LogoCtx.Provider value={{ overrides: logoOverrides, setOverride: setLogoOverride, resetOverrides: resetLogoOverrides }}>
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
          {!isMobile && (() => {
            const visibleTabs = commPin ? ALL_TABS : ALL_TABS.filter(t => t !== 'Sync')
            return (
              <div style={{ display: 'flex', gap: 2, flex: 1, overflowX: 'auto' }}>
                {visibleTabs.map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    background: 'transparent', color: tab === t ? C.accent : C.muted,
                    border: 'none', borderBottom: `2px solid ${tab === t ? C.accent : 'transparent'}`,
                    padding: '20px 14px', cursor: 'pointer',
                    fontFamily: "'Oswald', sans-serif", fontSize: 13, letterSpacing: 0.8,
                    textTransform: 'uppercase', transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
                  }}>{t}</button>
                ))}
              </div>
            )
          })()}

          {/* Mobile: show current tab name */}
          {isMobile && (
            <div style={{ flex: 1, fontFamily: "'Oswald', sans-serif", fontSize: 13, color: C.text, letterSpacing: 1, textTransform: 'uppercase' }}>
              {tab}
            </div>
          )}

          {/* Right side: external links + commissioner login */}
          <div style={{ display: 'flex', gap: isMobile ? 8 : 16, paddingLeft: isMobile ? 0 : 16, flexShrink: 0, alignItems: 'center' }}>
            {!isMobile && (
              <>
                <a href="/coaches" style={{ color: C.muted, fontSize: 13, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textDecoration: 'none', whiteSpace: 'nowrap' }}>👤 COACHES</a>
                <button onClick={() => setTab('Awards')} style={{ background: 'none', border: 'none', color: tab === 'Awards' ? C.accent : C.muted, fontSize: 13, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, cursor: 'pointer', whiteSpace: 'nowrap', padding: 0 }}>🏆 AWARDS</button>
                <a href="/stream-watcher" style={{ color: C.muted, fontSize: 13, fontFamily: "'Oswald', sans-serif", letterSpacing: 1, textDecoration: 'none', whiteSpace: 'nowrap' }}>📺 STREAM</a>
              </>
            )}
            {/* Commissioner login/status */}
            {commPin
              ? (
                <button
                  onClick={() => {
                    setCommPin(null)
                    if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('dynasty_comm_pin')
                    // If on Sync tab, bounce back to Dashboard
                    if (tab === 'Sync') setTab('Dashboard')
                  }}
                  style={{ background: C.green + '18', color: C.green, border: `1px solid ${C.green}44`, borderRadius: 6, padding: isMobile ? '5px 10px' : '6px 14px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 9 : 11, letterSpacing: 1, whiteSpace: 'nowrap' }}
                  title="Click to log out as commissioner"
                >✓ COMM</button>
              )
              : (
                <button
                  onClick={() => setShowCommLogin(v => !v)}
                  style={{ background: 'transparent', color: C.accent, border: `1px solid ${C.accent}44`, borderRadius: 6, padding: isMobile ? '5px 10px' : '6px 14px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: isMobile ? 9 : 11, letterSpacing: 1, whiteSpace: 'nowrap' }}
                >🔒 {isMobile ? 'COMM' : 'COMMISSIONER'}</button>
              )
            }
          </div>
        </div>

        {/* Commissioner login drop-down bar */}
        {showCommLogin && !commPin && (
          <div style={{ background: C.card, borderTop: `1px solid ${C.border}`, padding: '12px 24px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: C.muted, letterSpacing: 1 }}>COMMISSIONER PIN:</span>
            <input
              type="password"
              placeholder="Enter PIN…"
              value={commLoginInput}
              onChange={e => { setCommLoginInput(e.target.value); setCommLoginError('') }}
              onKeyDown={e => e.key === 'Enter' && handleCommLogin()}
              autoFocus
              style={{ background: C.bg, border: `1px solid ${commLoginError ? C.red : C.border}`, borderRadius: 6, padding: '8px 14px', color: C.text, fontSize: 14, width: 180, letterSpacing: 4 }}
            />
            <button onClick={handleCommLogin} style={{ background: C.accent, color: '#000', border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', fontFamily: "'Oswald', sans-serif", fontSize: 13, fontWeight: 700 }}>Unlock</button>
            <button onClick={() => { setShowCommLogin(false); setCommLoginError(''); setCommLoginInput('') }} style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
            {commLoginError && <span style={{ color: C.red, fontSize: 13 }}>❌ {commLoginError}</span>}
          </div>
        )}
      </div>

      {/* Score Ticker — only on the home tab */}
      {!loadingData && tab === 'Dashboard' && (
        <ScoreTicker games={data.games} setTab={setTab} isMobile={isMobile} settings={data.settings} />
      )}

      {/* Main content */}
      <div style={{
        maxWidth: 1160, margin: '0 auto',
        padding: isMobile ? '16px 12px 110px' : '36px 24px 40px',
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
              {tab === 'Dashboard' && <Dashboard  {...data} heismanCandidates={data.heismanCandidates || []} isMobile={isMobile} narrativeEntries={narrativeEntries} settings={data.settings} setTab={setTab} articles={articles} onArticlesChange={() => { fetchArticles(); fetchData(); }} commPin={commPin} onArticleOpen={setOpenArticle} />}
              {tab === 'Standings' && <Standings  teams={data.teams} isMobile={isMobile} settings={data.settings} />}
              {tab === 'Season'    && <Season games={data.games} teams={data.teams} isMobile={isMobile} settings={data.settings} articles={articles} onArticleOpen={setOpenArticle} onArticlesChange={() => { fetchArticles(); fetchData(); }} commPin={commPin} onPinSet={pin => { setCommPin(pin); if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('dynasty_comm_pin', pin || '') }} />}
              {tab === 'Awards'    && (
                <AwardsTab
                  heismanCandidates={data.heismanCandidates || []}
                  onRefresh={fetchData}
                  championships={data.championships || []}
                  coaches={data.coaches || []}
                  isMobile={isMobile}
                />
              )}
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
      {isMobile && <BottomNav tab={tab} setTab={setTab} commPin={commPin} />}

      {/* Article Slide-Up */}
      <ArticleSlideUp article={openArticle} onClose={() => setOpenArticle(null)} isMobile={isMobile} />
    </>
    </LogoCtx.Provider>
  )
}
