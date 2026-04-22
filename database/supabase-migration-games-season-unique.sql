-- ─────────────────────────────────────────────────────────────────────────────
-- Dynasty Universe — Migration: add season to games unique constraint
-- Prevents duplicate rows when the same matchup appears in different seasons.
--
-- Run ONCE in: Supabase → SQL Editor → New query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Ensure games has a season column (safe if it already exists)
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS season INT NOT NULL DEFAULT 1;

-- 2. Remove duplicate rows that differ only by season being the default.
--    Keep the row with the highest id (most recent) per (home_team, away_team, week, season).
DELETE FROM games
WHERE id NOT IN (
  SELECT MAX(id)
  FROM games
  GROUP BY home_team, away_team, week, season
);

-- 3. Drop the old constraint that was missing season
ALTER TABLE games
  DROP CONSTRAINT IF EXISTS games_home_away_week_unique;

-- 4. Add the correct constraint that includes season
ALTER TABLE games
  ADD CONSTRAINT games_home_away_week_season_unique
  UNIQUE (home_team, away_team, week, season);

-- ─────────────────────────────────────────────────────────────────────────────
-- Done! Duplicate games across seasons will no longer be created.
-- ─────────────────────────────────────────────────────────────────────────────
