-- Fix AP Rankings: Add UNIQUE constraint on (season, rank)
-- Without this, the upsert in parse-screenshot.js silently fails
-- because Postgres needs a unique index to resolve onConflict.

-- First, remove any duplicate rows (keep the most recently updated one)
DELETE FROM ap_rankings a
USING ap_rankings b
WHERE a.season = b.season
  AND a.rank = b.rank
  AND a.id < b.id;

-- Drop the old non-unique index if it exists
DROP INDEX IF EXISTS idx_ap_rankings_season;

-- Create the UNIQUE index that upsert needs
CREATE UNIQUE INDEX IF NOT EXISTS idx_ap_rankings_season_rank ON ap_rankings(season, rank);

-- Re-create a plain season index for filtering
CREATE INDEX IF NOT EXISTS idx_ap_rankings_season ON ap_rankings(season);
