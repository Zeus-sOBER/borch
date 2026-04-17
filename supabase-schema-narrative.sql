-- ============================================================
-- NARRATIVE LOG — Master Timeline Table
-- Dynasty Universe: Centralized narrative hub
-- Run this in your Supabase SQL editor
-- ============================================================

CREATE TABLE IF NOT EXISTS narrative_log (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  season              INTEGER     DEFAULT 1,
  week                INTEGER,

  -- What kind of event is this?
  -- 'game' | 'moment' | 'recruiting' | 'article' | 'lore'
  event_type          TEXT        NOT NULL,

  -- Coach-centric focus
  featured_coach      TEXT,
  featured_team       TEXT,
  opposing_coach      TEXT,
  opposing_team       TEXT,

  -- Content
  title               TEXT,
  summary             TEXT,
  content             TEXT,  -- Full article / lore text (for article/lore types)

  -- Narrative scoring
  -- 1 = minor, 3 = notable, 5 = season-defining
  narrative_weight    INTEGER     DEFAULT 3 CHECK (narrative_weight BETWEEN 1 AND 5),

  -- Tags that drive narrative tone
  -- e.g. ['upset', 'coach_duel', 'rivalry_heat', 'streak', 'blowout', 'championship', 'comeback']
  momentum_tags       TEXT[]      DEFAULT '{}',

  -- Context control
  -- Set to false by decay job to fade old events from Claude's context window
  include_in_context  BOOLEAN     DEFAULT TRUE,

  -- Season highlight: true = pulled into end-of-season summary
  is_season_highlight BOOLEAN     DEFAULT FALSE,

  -- Cross-referencing between entries
  references          UUID[]      DEFAULT '{}', -- IDs this entry builds on
  referenced_by       UUID[]      DEFAULT '{}', -- IDs that reference this entry (updated later)

  -- Link back to original source record
  source_id           TEXT,       -- e.g. game id, big_moment id, article id
  source_table        TEXT,       -- e.g. 'games', 'big_moments', 'articles'

  -- Original raw data for debugging / reprocessing
  raw_data            JSONB
);

-- ─── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_narrative_log_season        ON narrative_log (season);
CREATE INDEX IF NOT EXISTS idx_narrative_log_event_type    ON narrative_log (event_type);
CREATE INDEX IF NOT EXISTS idx_narrative_log_in_context    ON narrative_log (include_in_context);
CREATE INDEX IF NOT EXISTS idx_narrative_log_highlight     ON narrative_log (is_season_highlight);
CREATE INDEX IF NOT EXISTS idx_narrative_log_featured_coach ON narrative_log (featured_coach);
CREATE INDEX IF NOT EXISTS idx_narrative_log_created_at    ON narrative_log (created_at DESC);

-- ─── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE narrative_log ENABLE ROW LEVEL SECURITY;

-- Public can read
CREATE POLICY "Public read narrative_log"
  ON narrative_log FOR SELECT
  USING (true);

-- Only service role can write (handled server-side)
CREATE POLICY "Service role write narrative_log"
  ON narrative_log FOR ALL
  USING (auth.role() = 'service_role');
