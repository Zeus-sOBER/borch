-- ─── Team Stats Table ────────────────────────────────────────────────────────
-- Stores team-level offensive and defensive statistics per season.
-- Populated by scanning the EA CFB Team Stats screen in the Sync tab.
-- Run in Supabase → SQL Editor

CREATE TABLE IF NOT EXISTS team_stats (
  id              SERIAL PRIMARY KEY,
  season          INT          NOT NULL DEFAULT 1,
  team_name       TEXT         NOT NULL,

  -- Offensive stats (from EA CFB "OFFENSE" view)
  gp              INT          DEFAULT 0,    -- Games Played
  ppg             NUMERIC(5,1),              -- Points Per Game
  pts_scored      INT          DEFAULT 0,    -- Total Points Scored (PTS)
  off_yards       INT          DEFAULT 0,    -- Total Offensive Yards (OFF)
  ypg             NUMERIC(5,1),              -- Yards Per Game (YPG)
  ypp             NUMERIC(4,1),              -- Yards Per Play (YPP)
  pass_yards      INT          DEFAULT 0,    -- Total Passing Yards (PASS)
  pypg            NUMERIC(5,1),              -- Passing Yards Per Game (PYPG)
  pass_tds        INT          DEFAULT 0,    -- Passing Touchdowns (PTD)
  rush_yards      INT          DEFAULT 0,    -- Total Rushing Yards (RUSH)

  -- Defensive stats (from EA CFB "DEFENSE" view)
  dppg            NUMERIC(5,1),              -- Defensive Points Per Game Allowed
  pts_allowed     INT          DEFAULT 0,    -- Total Points Allowed (PTS)
  total_yds_allowed INT        DEFAULT 0,    -- Total Yards Allowed (TOTAL)
  ypga            NUMERIC(5,1),              -- Yards Per Game Allowed (YPGA)
  pass_yds_allowed INT         DEFAULT 0,    -- Passing Yards Allowed (PASS)
  dyga            NUMERIC(5,1),              -- Defensive Yards Per Game Allowed
  rush_yds_allowed INT         DEFAULT 0,    -- Rushing Yards Allowed (RUSH)
  rypga           NUMERIC(5,1),              -- Rush Yards Per Game Allowed (RYPGA)
  sacks           INT          DEFAULT 0,    -- Sacks (SACK)

  created_at      TIMESTAMPTZ  DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  DEFAULT NOW(),

  UNIQUE(season, team_name)
);

-- Index for fast season lookups
CREATE INDEX IF NOT EXISTS team_stats_season_idx ON team_stats(season);

-- Example: after running, verify with:
-- SELECT * FROM team_stats ORDER BY season DESC, ppg DESC NULLS LAST LIMIT 20;
