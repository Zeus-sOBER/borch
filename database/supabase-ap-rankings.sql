-- ─── AP Rankings Table ───────────────────────────────────────────────────────
-- Replaces the JSONB blob in league_settings.ap_rankings with individual rows.
-- This makes it easy to edit any ranking directly in the Supabase table editor.
-- Run in Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS ap_rankings (
  id               SERIAL       PRIMARY KEY,
  season           INT          NOT NULL DEFAULT 1,
  rank             INT          NOT NULL,          -- Current AP rank (the RANK column, NOT Last Week)
  lw               INT,                            -- Last Week's rank (LW column, for reference only)
  team_name        TEXT         NOT NULL,
  record           TEXT,                           -- W-L record shown in poll
  points           INT,                            -- Voting points (PTS column)
  last_week_result TEXT,                           -- What they did last week (LAST WEEK column)
  this_week        TEXT,                           -- Upcoming opponent (THIS WEEK column)
  updated_at       TIMESTAMPTZ  DEFAULT NOW(),

  UNIQUE(season, rank)
);

-- Index for fast season + rank lookups
CREATE INDEX IF NOT EXISTS ap_rankings_season_idx ON ap_rankings(season, rank);

-- ─── Migrate existing data (if any) ──────────────────────────────────────────
-- If you already have ap_rankings data in league_settings, you can migrate it
-- by running the insert below after adjusting the season number.
-- (Only run if you have existing data to preserve — safe to skip otherwise)
--
-- INSERT INTO ap_rankings (season, rank, team_name, record, points)
-- SELECT
--   1 AS season,
--   (entry->>'rank')::int,
--   entry->>'team_name',
--   entry->>'record',
--   (entry->>'points')::int
-- FROM league_settings,
--      jsonb_array_elements(ap_rankings) AS entry
-- WHERE id = 1 AND ap_rankings IS NOT NULL
-- ON CONFLICT (season, rank) DO NOTHING;

-- After running, verify with:
-- SELECT * FROM ap_rankings ORDER BY season DESC, rank ASC LIMIT 30;
