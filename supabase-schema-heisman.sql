-- Heisman Watch Table
CREATE TABLE IF NOT EXISTS heisman_watch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name VARCHAR(255) NOT NULL,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL, -- 1-5 for top 5 candidates
  key_stats JSONB, -- {passing_yards, passing_tds, rushing_yards, rushing_tds, etc}
  notes TEXT, -- Commentary: "Hot streak after 400 passing yards"
  trophy_screenshot_url TEXT, -- Google Drive link to Heisman trophy screenshot
  trophy_screenshot_date TIMESTAMP DEFAULT NOW(),
  week_updated INTEGER, -- Which week this was updated
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS heisman_watch_rank_idx ON heisman_watch(rank);
CREATE INDEX IF NOT EXISTS heisman_watch_team_idx ON heisman_watch(team_id);
CREATE INDEX IF NOT EXISTS heisman_watch_week_idx ON heisman_watch(week_updated);

-- Add comments for clarity
COMMENT ON TABLE heisman_watch IS 'Top 5 Heisman Trophy candidates for the season';
COMMENT ON COLUMN heisman_watch.key_stats IS 'JSON object storing key statistics: {passing_yards, passing_tds, rushing_yards, rushing_tds, receptions, rec_yards, rec_tds}';
COMMENT ON COLUMN heisman_watch.notes IS 'Commentary/context about the candidate (e.g., streak info, recent performances)';
COMMENT ON COLUMN heisman_watch.trophy_screenshot_url IS 'Direct URL to Heisman trophy screenshot from Google Drive';
