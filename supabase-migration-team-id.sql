-- ─────────────────────────────────────────────────────────────────────────────
-- Dynasty Universe — Migration: Add team_id to coaches
-- Run this in: Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Add team_id column to coaches (nullable, references teams.id)
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS team_id bigint REFERENCES teams(id) ON DELETE SET NULL;

-- 2. Index for fast joins
CREATE INDEX IF NOT EXISTS idx_coaches_team_id ON coaches(team_id);

-- 3. Auto-populate team_id for any coaches whose team name already matches
--    a row in the teams table (best-effort backfill on name match)
UPDATE coaches c
SET team_id = t.id
FROM teams t
WHERE c.team_id IS NULL
  AND lower(trim(c.team)) = lower(trim(COALESCE(t.team_name, t.name)));

-- Done! team_id is now the authoritative link.
-- String-based team name is kept as a display fallback for coaches not yet linked.
