import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

const ARTICLE_TYPES = [
  { value: 'power-rankings', label: 'Power Rankings', icon: '🏆' },
  { value: 'weekly-recap', label: 'Weekly Recap', icon: '📋' },
  { value: 'player-spotlight', label: 'Player Spotlight', icon: '⭐' },
  { value: 'rivalry-breakdown', label: 'Rivalry Breakdown', icon: '🔥' },
];

const TYPE_LABELS = Object.fromEntries(ARTICLE_TYPES.map(t => [t.value, t.label]));

export default function MediaCenter() {
  // Commissioner
  const [pin, setPin] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [isCommissioner, setIsCommissioner] = useState(false);

  // Article generation
  const [selectedType, setSelectedType] = useState('power-rankings');
  const [week, setWeek] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  // Current article (draft or loaded)
  const [currentArticle, setCurrentArticle] = useState(null); // { id, content, title, article_type, week }
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Article database
  const [articles, setArticles] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
  const [activeView, setActiveView] = useState('database'); // 'database' | 'article'
  const [isDeleting, setIsDeleting] = useState(false);

  // Load articles on mount and when filter changes
  useEffect(() => {
    fetchArticles();
  }, [filterType]);

  async function fetchArticles() {
    setIsLoadingArticles(true);
    try {
      const url = filterType === 'all'
        ? '/api/articles'
        : `/api/articles?article_type=${filterType}`;
      const res = await fetch(url);
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err) {
      console.error('Failed to load articles:', err);
    } finally {
      setIsLoadingArticles(false);
    }
  }

  function handlePinSubmit() {
    if (!pinInput.trim()) return;
    setPin(pinInput.trim());
    setIsCommissioner(true);
    setShowPinModal(false);
    setPinError('');
    setPinInput('');
  }

  function handlePinKeyDown(e) {
    if (e.key === 'Enter') handlePinSubmit();
  }

  async function generateArticle() {
    if (!isCommissioner) {
      setShowPinModal(true);
      return;
    }
    setIsGenerating(true);
    setGenerateError('');
    setCurrentArticle(null);
    setIsEditing(false);
    setActiveView('article');

    try {
      const res = await fetch('/api/generate-article', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleType: selectedType, week: week ? parseInt(week) : null, pin })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');

      // Refresh articles list to get the auto-saved draft
      await fetchArticles();

      // Find the newly saved article (most recent of this type)
      const refreshed = await fetch(`/api/articles?article_type=${selectedType}&limit=1`);
      const refreshedData = await refreshed.json();
      const newest = refreshedData.articles?.[0];

      setCurrentArticle(newest || { content: data.article, article_type: selectedType, week });
      setEditContent(newest?.content || data.article);
    } catch (err) {
      setGenerateError(err.message);
      setActiveView('database');
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveArticle() {
    if (!isCommissioner) return;
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentArticle?.id,
          article_type: currentArticle?.article_type || selectedType,
          week: currentArticle?.week || (week ? parseInt(week) : null),
          title: currentArticle?.title,
          content: editContent,
          pin
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCurrentArticle(data.article);
      setIsEditing(false);
      setSaveSuccess(true);
      fetchArticles();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteArticle(id) {
    if (!isCommissioner) return;
    if (!confirm('Delete this article? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/articles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, pin })
      });
      if (!res.ok) throw new Error('Delete failed');
      // If we were viewing the deleted article, go back to database
      if (currentArticle?.id === id) {
        setCurrentArticle(null);
        setActiveView('database');
      }
      fetchArticles();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  }

  function loadArticle(article) {
    setCurrentArticle(article);
    setEditContent(article.content);
    setIsEditing(false);
    setActiveView('article');
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  function getTypeIcon(type) {
    return ARTICLE_TYPES.find(t => t.value === type)?.icon || '📄';
  }

  // ─── Styles ────────────────────────────────────────────────────────────────
  const s = {
    page: {
      minHeight: '100vh',
      background: '#09090b',
      color: '#e0e0e0',
      fontFamily: 'Lato, sans-serif',
    },
    topBar: {
      background: '#111114',
      borderBottom: '2px solid #c9a84c',
      padding: '0 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '56px',
    },
    logo: {
      fontFamily: 'Oswald, sans-serif',
      color: '#c9a84c',
      fontSize: '20px',
      fontWeight: 700,
      textDecoration: 'none',
    },
    backLink: {
      color: '#888',
      textDecoration: 'none',
      fontSize: '13px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    container: {
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '32px 24px',
    },
    heading: {
      fontFamily: 'Oswald, sans-serif',
      color: '#c9a84c',
      fontSize: '28px',
      fontWeight: 700,
      marginBottom: '4px',
    },
    subheading: {
      color: '#666',
      fontSize: '14px',
      marginBottom: '28px',
    },
    card: {
      background: '#111114',
      border: '1px solid #222',
      borderRadius: '10px',
      padding: '24px',
      marginBottom: '20px',
    },
    sectionLabel: {
      fontFamily: 'Oswald, sans-serif',
      color: '#c9a84c',
      fontSize: '13px',
      letterSpacing: '1px',
      marginBottom: '12px',
    },
    row: {
      display: 'flex',
      gap: '10px',
      flexWrap: 'wrap',
      alignItems: 'center',
    },
    typeBtn: (active) => ({
      padding: '8px 16px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      fontFamily: 'Oswald, sans-serif',
      fontSize: '13px',
      background: active ? '#c9a84c' : '#1a1a1f',
      color: active ? '#09090b' : '#ccc',
      transition: 'all 0.15s',
    }),
    input: {
      padding: '8px 12px',
      background: '#1a1a1f',
      border: '1px solid #333',
      borderRadius: '6px',
      color: '#e0e0e0',
      fontSize: '14px',
      width: '80px',
    },
    btn: (color, outline) => ({
      padding: '10px 20px',
      background: outline ? 'transparent' : color,
      color: outline ? color : '#fff',
      border: outline ? `1px solid ${color}` : 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontFamily: 'Oswald, sans-serif',
      fontSize: '14px',
      fontWeight: 600,
      transition: 'opacity 0.15s',
    }),
    articleCard: {
      background: '#16161a',
      border: '1px solid #2a2a2f',
      borderRadius: '8px',
      padding: '16px 20px',
      marginBottom: '12px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: '12px',
    },
    articleMeta: {
      color: '#555',
      fontSize: '12px',
      marginTop: '4px',
    },
    articleTitle: {
      fontFamily: 'Oswald, sans-serif',
      color: '#e0e0e0',
      fontSize: '16px',
      marginBottom: '2px',
    },
    articlePreview: {
      color: '#777',
      fontSize: '13px',
      marginTop: '6px',
      lineHeight: '1.5',
    },
    textarea: {
      width: '100%',
      minHeight: '520px',
      background: '#09090b',
      color: '#e0e0e0',
      border: '1px solid #c9a84c',
      borderRadius: '6px',
      padding: '16px',
      fontSize: '14px',
      lineHeight: '1.8',
      fontFamily: 'Lato, sans-serif',
      resize: 'vertical',
      boxSizing: 'border-box',
    },
    articleBody: {
      color: '#d0d0d0',
      fontSize: '15px',
      lineHeight: '1.85',
      whiteSpace: 'pre-wrap',
      fontFamily: 'Lato, sans-serif',
    },
    badge: (color) => ({
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontFamily: 'Oswald, sans-serif',
      background: color + '22',
      color: color,
      marginRight: '6px',
    }),
    divider: {
      borderTop: '1px solid #222',
      margin: '20px 0',
    },
    emptyState: {
      textAlign: 'center',
      padding: '48px 24px',
      color: '#444',
    },
    modal: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modalBox: {
      background: '#16161a',
      border: '1px solid #c9a84c',
      borderRadius: '10px',
      padding: '32px',
      width: '320px',
    },
    pinInput: {
      width: '100%',
      padding: '10px 14px',
      background: '#09090b',
      border: '1px solid #444',
      borderRadius: '6px',
      color: '#e0e0e0',
      fontSize: '16px',
      marginBottom: '12px',
      boxSizing: 'border-box',
      letterSpacing: '4px',
    },
  };

  return (
    <>
      <Head>
        <title>Media Center — Dynasty Universe</title>
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600;700&family=Lato:wght@400;700&display=swap" rel="stylesheet" />
      </Head>

      {/* PIN Modal */}
      {showPinModal && (
        <div style={s.modal} onClick={() => setShowPinModal(false)}>
          <div style={s.modalBox} onClick={e => e.stopPropagation()}>
            <p style={{ fontFamily: 'Oswald, sans-serif', color: '#c9a84c', fontSize: '18px', marginBottom: '8px' }}>
              Commissioner Access
            </p>
            <p style={{ color: '#888', fontSize: '13px', marginBottom: '20px' }}>
              Enter your PIN to generate and edit articles.
            </p>
            <input
              type="password"
              placeholder="PIN"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              onKeyDown={handlePinKeyDown}
              style={s.pinInput}
              autoFocus
            />
            {pinError && <p style={{ color: '#e05252', fontSize: '13px', marginBottom: '8px' }}>{pinError}</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handlePinSubmit} style={s.btn('#c9a84c', false)}>Unlock</button>
              <button onClick={() => setShowPinModal(false)} style={s.btn('#888', true)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={s.page}>
        {/* Top Bar */}
        <div style={s.topBar}>
          <Link href="/" style={s.logo}>DYNASTY UNIVERSE</Link>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <Link href="/" style={s.backLink}>← Back to Hub</Link>
            {isCommissioner
              ? <span style={{ color: '#4caf7d', fontSize: '12px', fontFamily: 'Oswald, sans-serif' }}>✓ COMMISSIONER</span>
              : <button onClick={() => setShowPinModal(true)} style={{ ...s.btn('#c9a84c', true), padding: '6px 14px', fontSize: '12px' }}>Commissioner Login</button>
            }
          </div>
        </div>

        <div style={s.container}>
          <h1 style={s.heading}>MEDIA CENTER</h1>
          <p style={s.subheading}>
            AI-generated dynasty coverage, edited and published by the commissioner.
          </p>

          {/* Generate Panel */}
          <div style={s.card}>
            <div style={s.sectionLabel}>GENERATE NEW ARTICLE</div>
            <div style={{ ...s.row, marginBottom: '16px' }}>
              {ARTICLE_TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setSelectedType(t.value)}
                  style={s.typeBtn(selectedType === t.value)}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
            <div style={s.row}>
              <input
                type="number"
                placeholder="Week #"
                value={week}
                onChange={e => setWeek(e.target.value)}
                style={s.input}
                min="1"
                max="20"
              />
              <button
                onClick={generateArticle}
                disabled={isGenerating}
                style={{ ...s.btn('#c9a84c', false), opacity: isGenerating ? 0.6 : 1 }}
              >
                {isGenerating ? '⏳ Generating...' : isCommissioner ? '✦ Generate Article' : '🔒 Generate Article'}
              </button>
              {!isCommissioner && (
                <span style={{ color: '#555', fontSize: '12px' }}>Commissioner PIN required</span>
              )}
              {generateError && (
                <span style={{ color: '#e05252', fontSize: '13px' }}>{generateError}</span>
              )}
            </div>
          </div>

          {/* View Toggle */}
          <div style={{ ...s.row, marginBottom: '20px' }}>
            <button
              onClick={() => setActiveView('database')}
              style={s.typeBtn(activeView === 'database')}
            >
              📚 Article Archive ({articles.length})
            </button>
            {currentArticle && (
              <button
                onClick={() => setActiveView('article')}
                style={s.typeBtn(activeView === 'article')}
              >
                📄 {currentArticle.title || TYPE_LABELS[currentArticle.article_type] || 'Current Article'}
              </button>
            )}
          </div>

          {/* ── DATABASE VIEW ── */}
          {activeView === 'database' && (
            <div style={s.card}>
              <div style={{ ...s.row, marginBottom: '16px', justifyContent: 'space-between' }}>
                <div style={s.sectionLabel}>PUBLISHED ARTICLES</div>
                <div style={s.row}>
                  {['all', ...ARTICLE_TYPES.map(t => t.value)].map(type => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      style={{
                        ...s.typeBtn(filterType === type),
                        padding: '5px 12px',
                        fontSize: '12px',
                      }}
                    >
                      {type === 'all' ? 'All' : ARTICLE_TYPES.find(t => t.value === type)?.icon + ' ' + TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              {isLoadingArticles ? (
                <p style={{ color: '#555', textAlign: 'center', padding: '32px' }}>Loading articles...</p>
              ) : articles.length === 0 ? (
                <div style={s.emptyState}>
                  <p style={{ fontSize: '32px', marginBottom: '8px' }}>📭</p>
                  <p style={{ color: '#555' }}>No articles yet. Generate your first one above.</p>
                </div>
              ) : (
                articles.map(article => (
                  <div key={article.id} style={s.articleCard}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={s.badge('#c9a84c')}>
                          {getTypeIcon(article.article_type)} {TYPE_LABELS[article.article_type] || article.article_type}
                        </span>
                        {article.week && (
                          <span style={s.badge('#4a90d9')}>Week {article.week}</span>
                        )}
                      </div>
                      <div style={s.articleTitle}>
                        {article.title || TYPE_LABELS[article.article_type]}
                      </div>
                      <div style={s.articleMeta}>
                        Published {formatDate(article.updated_at)}
                      </div>
                      <div style={s.articlePreview}>
                        {article.content.substring(0, 160).trim()}...
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                      <button
                        onClick={() => loadArticle(article)}
                        style={s.btn('#4a90d9', true)}
                      >
                        Read
                      </button>
                      {isCommissioner && (
                        <button
                          onClick={() => deleteArticle(article.id)}
                          disabled={isDeleting}
                          style={{ ...s.btn('#e05252', true), padding: '8px 16px', fontSize: '12px' }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── ARTICLE VIEW ── */}
          {activeView === 'article' && currentArticle && (
            <div style={s.card}>
              {/* Article Header */}
              <div style={{ ...s.row, justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <span style={s.badge('#c9a84c')}>
                      {getTypeIcon(currentArticle.article_type)} {TYPE_LABELS[currentArticle.article_type]}
                    </span>
                    {currentArticle.week && (
                      <span style={s.badge('#4a90d9')}>Week {currentArticle.week}</span>
                    )}
                    {saveSuccess && (
                      <span style={s.badge('#4caf7d')}>✓ Saved & Published</span>
                    )}
                  </div>
                  <div style={{ fontFamily: 'Oswald, sans-serif', color: '#e0e0e0', fontSize: '18px' }}>
                    {currentArticle.title || TYPE_LABELS[currentArticle.article_type]}
                  </div>
                  {currentArticle.updated_at && (
                    <div style={s.articleMeta}>Last updated {formatDate(currentArticle.updated_at)}</div>
                  )}
                </div>

                {/* Commissioner Controls */}
                {isCommissioner && (
                  <div style={s.row}>
                    {!isEditing ? (
                      <button
                        onClick={() => { setEditContent(currentArticle.content); setIsEditing(true); }}
                        style={s.btn('#c9a84c', false)}
                      >
                        ✏️ Edit
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={saveArticle}
                          disabled={isSaving}
                          style={{ ...s.btn('#4caf7d', false), opacity: isSaving ? 0.6 : 1 }}
                        >
                          {isSaving ? 'Saving...' : '💾 Save & Publish'}
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          style={s.btn('#e05252', true)}
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => navigator.clipboard.writeText(isEditing ? editContent : currentArticle.content)}
                      style={s.btn('#888', true)}
                    >
                      📋 Copy
                    </button>
                  </div>
                )}

                {/* Non-commissioner copy */}
                {!isCommissioner && (
                  <button
                    onClick={() => navigator.clipboard.writeText(currentArticle.content)}
                    style={s.btn('#888', true)}
                  >
                    📋 Copy
                  </button>
                )}
              </div>

              <div style={s.divider} />

              {/* Article Body */}
              {isEditing ? (
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  style={s.textarea}
                />
              ) : (
                <div style={s.articleBody}>
                  {currentArticle.content}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
