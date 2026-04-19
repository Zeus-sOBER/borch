-- Heisman Watch V2 Migration
-- Replaces the FK-based schema with a simpler text-field-based table.
-- Run this in your Supabase SQL Editor.

-- Drop old table (had foreign key constraints to teams/coaches by integer ID)
DROP TABLE IF EXISTS heisman_watch;

-- Create new simplified table — no FK constraints, just text fields
CREATE TABLE heisman_watch (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  rank        INTEGER     NOT NULL CHECK (rank >= 1 AND rank <= 5),
  player_name TEXT        NOT NULL,
  position    TEXT,                       -- QB, HB, WR, TE, etc.
  team_name   TEXT        NOT NULL,       -- team name as string (e.g. "Baylor", "Kansas State")
  coach_name  TEXT,                       -- coach name as string (optional)
  class_year  TEXT,                       -- JR, SR, JR (RS), SR (RS), FR, SO, etc.
  trend       TEXT        DEFAULT 'same', -- 'up', 'down', 'same'
  key_stats   JSONB       DEFAULT '{}',   -- {passing_yards, passing_tds, rushing_yards, etc.}
  notes       TEXT,
  week_updated INTEGER,
  season      INTEGER     DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX ON heisman_watch(rank);
CREATE INDEX ON heisman_watch(season);
CREATE INDEX ON heisman_watch(week_updated);

-- RLS
ALTER TABLE heisman_watch ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read heisman_watch" ON heisman_watch FOR SELECT USING (true);

-- Comments
COMMENT ON TABLE heisman_watch IS 'Top 5 Heisman Trophy candidates — populated via in-game screenshot or manual entry';
COMMENT ON COLUMN heisman_watch.trend IS 'up = rising, down = falling, same = no change';
COMMENT ON COLUMN heisman_watch.class_year IS 'Player class: FR, SO, JR, SR, JR (RS), SR (RS), etc.';
