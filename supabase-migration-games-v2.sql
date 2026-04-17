-- ─────────────────────────────────────────────────────────────────────────────
-- Dynasty Universe — Migration: Fix games table for schedule imports
-- Run this ONCE in: Supabase → SQL Editor → New query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add is_final column (maps from existing "status" column so old data is preserved)
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS is_final boolean DEFAULT false;

-- Backfill: any existing row where status = 'Final' is already a final game
UPDATE games SET is_final = true WHERE status = 'Final' AND is_final IS DISTINCT FROM true;

-- 2. Add game_type column
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS game_type text DEFAULT 'regular';

-- 3. Add yards and touchdowns columns to players if missing
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS yards int DEFAULT 0;
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS touchdowns int DEFAULT 0;

-- 4. Remove any duplicate game rows before adding the unique constraint
--    (keeps the row with the highest id — i.e. the most recent upsert attempt)
DELETE FROM games
WHERE id NOT IN (
  SELECT MAX(id)
  FROM games
  GROUP BY home_team, away_team, week
);

-- 5. Add the unique constraint that upsert depends on
--    (this is what was missing — without it every schedule import silently saved nothing)
ALTER TABLE games
  ADD CONSTRAINT games_home_away_week_unique
  UNIQUE (home_team, away_team, week);

-- ─────────────────────────────────────────────────────────────────────────────
-- Done! Now go to the Sync tab → Re-scan your schedule sheet → games will save.
-- ─────────────────────────────────────────────────────────────────────────────
