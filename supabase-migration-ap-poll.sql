-- ── AP Poll + featured_game_id migrations ────────────────────────────────────
-- Run these in the Supabase SQL Editor (one at a time or all at once).

-- 1) Add the AP Top 25 rankings column to league_settings
--    Stores an array of { rank, team_name, record, points } objects as JSONB
ALTER TABLE league_settings
  ADD COLUMN IF NOT EXISTS ap_rankings jsonb;

-- 2) Track when the AP poll was last updated (via screenshot parse)
ALTER TABLE league_settings
  ADD COLUMN IF NOT EXISTS ap_poll_updated_at timestamptz;

-- 3) featured_game_id — links to a game row for the Dashboard hero card
--    (may already exist from a prior migration; IF NOT EXISTS is safe to re-run)
ALTER TABLE league_settings
  ADD COLUMN IF NOT EXISTS featured_game_id bigint REFERENCES games(id) ON DELETE SET NULL;

-- 4) Ensure the base league_settings row exists (id = 1) so upserts work
INSERT INTO league_settings (id, current_week, current_season)
VALUES (1, 0, 1)
ON CONFLICT (id) DO NOTHING;
