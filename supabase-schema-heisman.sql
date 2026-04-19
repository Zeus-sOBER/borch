-- Heisman Watch Table
-- Tracks top 5 Heisman Trophy candidates linked to their team and coach
CREATE TABLE IF NOT EXISTS heisman_watch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name VARCHAR(255) NOT NULL,
  position VARCHAR(50), -- QB, RB, WR, etc.
  team_id BIGINT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  coach_id BIGINT NOT NULL REFERENCES coaches(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 5), -- 1-5 for top 5 candidates
  key_stats JSONB, -- {passing_yards, passing_tds, rushing_yards, rushing_tds, receptions, rec_yards, rec_tds, interceptions}
  notes TEXT, -- Commentary/context: "Leading nation in passing yards", "Hot streak after 400 yards"
  trophy_screenshot_url TEXT, -- Google Drive direct link to Heisman trophy screenshot
  trophy_screenshot_date TIMESTAMP DEFAULT NOW(),
  week_updated INTEGER, -- Which week this was updated
  season INTEGER DEFAULT 1, -- Which season
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for quick lookups
CREATE INDEX IF NOT EXISTS heisman_watch_rank_idx ON heisman_watch(rank);
CREATE INDEX IF NOT EXISTS heisman_watch_team_idx ON heisman_watch(team_id);
CREATE INDEX IF NOT EXISTS heisman_watch_coach_idx ON heisman_watch(coach_id);
CREATE INDEX IF NOT EXISTS heisman_watch_week_idx ON heisman_watch(week_updated);
CREATE INDEX IF NOT EXISTS heisman_watch_season_idx ON heisman_watch(season);

-- Table and column comments
COMMENT ON TABLE heisman_watch IS 'Top 5 Heisman Trophy candidates for the season, linked to their team and coach';
COMMENT ON COLUMN heisman_watch.coach_id IS 'Foreign key to coaches table - the coach who produced this Heisman candidate';
COMMENT ON COLUMN heisman_watch.team_id IS 'Foreign key to teams table - the team the candidate plays for';
COMMENT ON COLUMN heisman_watch.key_stats IS 'JSON object: {passing_yards, passing_tds, rushing_yards, rushing_tds, receptions, rec_yards, rec_tds, interceptions}';
COMMENT ON COLUMN heisman_watch.notes IS 'Commentary about candidate performance and status in the race';
COMMENT ON COLUMN heisman_watch.trophy_screenshot_url IS 'Direct Google Drive link to in-game Heisman trophy screenshot';
