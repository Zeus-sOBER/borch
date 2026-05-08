-- ════════════════════════════════════════════════════════════════════════════════
-- DYNASTY UNIVERSE — Complete Database Setup
-- ════════════════════════════════════════════════════════════════════════════════
-- Run this ONE file in Supabase SQL Editor to set up your entire database.
-- Safe to run multiple times — uses IF NOT EXISTS on everything.
-- ════════════════════════════════════════════════════════════════════════════════

-- ── Core Tables ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS teams (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_name   TEXT,
  name        TEXT,
  coach       TEXT,
  wins        INT DEFAULT 0,
  losses      INT DEFAULT 0,
  pts         INT DEFAULT 0,
  pts_against INT DEFAULT 0,
  streak      TEXT,
  rank        INT,
  conference  TEXT,
  season      INT DEFAULT 1,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS games (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  week           INT,
  home_team      TEXT,
  home_score     INT,
  away_team      TEXT,
  away_score     INT,
  status         TEXT DEFAULT 'Final',
  is_final       BOOLEAN DEFAULT FALSE,
  game_type      TEXT DEFAULT 'regular',
  game_notes     TEXT,
  featured_game  BOOLEAN DEFAULT FALSE,
  season         INT DEFAULT 1,
  source_file    TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS players (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       TEXT NOT NULL,
  team       TEXT,
  pos        TEXT,
  stats      JSONB DEFAULT '{}',
  season     INT DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scan_log (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  file_id        TEXT,
  file_name      TEXT,
  data_type      TEXT,
  records_parsed INT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Feature Tables ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coaches (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name            TEXT NOT NULL,
  team            TEXT,
  username        TEXT,
  team_id         BIGINT,
  hire_date       DATE,
  overall_wins    INT DEFAULT 0,
  overall_losses  INT DEFAULT 0,
  seasons_coached INT DEFAULT 1,
  bio             TEXT,
  coaching_style  TEXT,
  alma_mater      TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  is_commissioner BOOLEAN DEFAULT FALSE,
  achievements    JSONB DEFAULT '[]',
  season_records  JSONB DEFAULT '[]',
  mascot_emoji    TEXT,
  team_color      TEXT,
  edit_token      TEXT UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS league_settings (
  id                  INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_week        INT DEFAULT 0,
  current_season      INT DEFAULT 1,
  league_name         TEXT DEFAULT 'Dynasty Universe',
  league_subtitle     TEXT DEFAULT 'EA Sports CFB 26 Online Dynasty',
  accent_color        TEXT DEFAULT '#c9a84c',
  discord_webhook_url TEXT,
  featured_article_id TEXT,
  hero_image_id       TEXT,
  hero_image_mime      TEXT,
  featured_game_id    TEXT,
  ap_rankings         JSONB,
  ap_poll_updated_at  TIMESTAMPTZ,
  logo_overrides      JSONB DEFAULT '{}',
  sheet_csv_hash      TEXT,
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS championships (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  season            INT NOT NULL,
  team_name         TEXT NOT NULL,
  coach_name        TEXT,
  record            TEXT,
  opponent_team     TEXT,
  opponent_record   TEXT,
  result            TEXT,
  championship_type TEXT DEFAULT 'national',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS heisman_watch (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player_name             TEXT NOT NULL,
  position                TEXT,
  team_name               TEXT,
  coach_name              TEXT,
  rank                    INT NOT NULL,
  key_stats               JSONB,
  notes                   TEXT,
  trophy_screenshot_url   TEXT,
  trophy_screenshot_date  TIMESTAMPTZ DEFAULT NOW(),
  week_updated            INT,
  season                  INT DEFAULT 1,
  trend                   TEXT DEFAULT 'same',
  class_year              TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ap_rankings (
  id               SERIAL PRIMARY KEY,
  season           INT NOT NULL DEFAULT 1,
  rank             INT NOT NULL,
  lw               INT,
  team_name        TEXT NOT NULL,
  record           TEXT,
  points           INT,
  last_week_result TEXT,
  this_week        TEXT,
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_stats (
  id                SERIAL PRIMARY KEY,
  season            INT NOT NULL DEFAULT 1,
  team_name         TEXT NOT NULL,
  gp                INT DEFAULT 0,
  ppg               NUMERIC(5,1),
  pts_scored        INT DEFAULT 0,
  off_yards         INT DEFAULT 0,
  ypg               NUMERIC(5,1),
  ypp               NUMERIC(4,1),
  pass_yards        INT DEFAULT 0,
  pypg              NUMERIC(5,1),
  pass_tds          INT DEFAULT 0,
  rush_yards        INT DEFAULT 0,
  rypg              NUMERIC(5,1),
  rush_tds          INT DEFAULT 0,
  dppg              NUMERIC(5,1),
  pts_allowed       INT DEFAULT 0,
  total_yds_allowed INT DEFAULT 0,
  ypga              NUMERIC(5,1),
  pass_yds_allowed  INT DEFAULT 0,
  dyga              NUMERIC(5,1),
  rush_yds_allowed  INT DEFAULT 0,
  sacks             INT DEFAULT 0,
  interceptions     INT DEFAULT 0,
  fumbles_forced    INT DEFAULT 0,
  takeaways         INT DEFAULT 0,
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS articles (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  article_type TEXT NOT NULL,
  week         INT,
  title        TEXT,
  content      TEXT NOT NULL,
  edited_by    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── AI / Narrative Tables ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS narrative_log (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  season              INT DEFAULT 1,
  week                INT,
  event_type          TEXT NOT NULL,
  featured_coach      TEXT,
  featured_team       TEXT,
  opposing_coach      TEXT,
  opposing_team       TEXT,
  title               TEXT,
  summary             TEXT,
  content             TEXT,
  narrative_weight    INT DEFAULT 3 CHECK (narrative_weight BETWEEN 1 AND 5),
  momentum_tags       TEXT[] DEFAULT '{}',
  is_season_highlight BOOLEAN DEFAULT FALSE,
  include_in_context  BOOLEAN DEFAULT TRUE,
  source_id           TEXT,
  source_table        TEXT,
  raw_data            JSONB
);

CREATE TABLE IF NOT EXISTS stream_events (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  channel        TEXT,
  screen_type    TEXT,
  game_status    TEXT,
  home_team      TEXT,
  away_team      TEXT,
  home_score     INT,
  away_score     INT,
  quarter        TEXT,
  time_remaining TEXT,
  last_play      TEXT,
  atmosphere     TEXT,
  narrative      TEXT,
  raw_analysis   JSONB,
  season         INT DEFAULT 1,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS big_moments (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  channel        TEXT,
  type           TEXT,
  description    TEXT,
  team           TEXT,
  player         TEXT,
  home_team      TEXT,
  away_team      TEXT,
  home_score     INT,
  away_score     INT,
  quarter        TEXT,
  time_remaining TEXT,
  season         INT DEFAULT 1,
  week           INT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recruiting_events (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  channel            TEXT,
  type               TEXT,
  player_name        TEXT,
  position           TEXT,
  stars              INT,
  committing_to      TEXT,
  decommitting_from  TEXT,
  season             INT DEFAULT 1,
  week               INT,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ── Version Tracking ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS migration_version (
  id         INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  version    INT DEFAULT 1,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Safely add columns that may not exist yet ────────────────────────────────

ALTER TABLE coaches ADD COLUMN IF NOT EXISTS edit_token TEXT;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS mascot_emoji TEXT;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS team_color TEXT;
ALTER TABLE coaches ADD COLUMN IF NOT EXISTS team_id BIGINT;
ALTER TABLE league_settings ADD COLUMN IF NOT EXISTS league_name TEXT DEFAULT 'Dynasty Universe';
ALTER TABLE league_settings ADD COLUMN IF NOT EXISTS league_subtitle TEXT DEFAULT 'EA Sports CFB 26 Online Dynasty';
ALTER TABLE league_settings ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#c9a84c';
ALTER TABLE league_settings ADD COLUMN IF NOT EXISTS discord_webhook_url TEXT;
ALTER TABLE league_settings ADD COLUMN IF NOT EXISTS sheet_csv_hash TEXT;
ALTER TABLE league_settings ADD COLUMN IF NOT EXISTS logo_overrides JSONB DEFAULT '{}';
ALTER TABLE games ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT FALSE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_type TEXT DEFAULT 'regular';
ALTER TABLE games ADD COLUMN IF NOT EXISTS game_notes TEXT;
ALTER TABLE games ADD COLUMN IF NOT EXISTS featured_game BOOLEAN DEFAULT FALSE;

-- ── Row Level Security ───────────────────────────────────────────────────────

DO $$ BEGIN ALTER TABLE teams ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE games ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE players ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE scan_log ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE coaches ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE league_settings ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE championships ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE heisman_watch ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE ap_rankings ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE team_stats ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE articles ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE narrative_log ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE stream_events ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE big_moments ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE recruiting_events ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE migration_version ENABLE ROW LEVEL SECURITY; EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Public read policies (safe to re-run)
DO $$ BEGIN CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read games" ON games FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read players" ON players FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read scan_log" ON scan_log FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read coaches" ON coaches FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read league_settings" ON league_settings FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read championships" ON championships FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read heisman_watch" ON heisman_watch FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read ap_rankings" ON ap_rankings FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read team_stats" ON team_stats FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read articles" ON articles FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read narrative_log" ON narrative_log FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read stream_events" ON stream_events FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read big_moments" ON big_moments FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read recruiting_events" ON recruiting_events FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Public read migration_version" ON migration_version FOR SELECT USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_games_season_week ON games(season, week);
CREATE INDEX IF NOT EXISTS idx_teams_season ON teams(season);
CREATE INDEX IF NOT EXISTS idx_players_season ON players(season);
CREATE INDEX IF NOT EXISTS idx_narrative_season ON narrative_log(season);
CREATE INDEX IF NOT EXISTS idx_narrative_type ON narrative_log(event_type);
CREATE INDEX IF NOT EXISTS idx_coaches_active ON coaches(is_active);
CREATE INDEX IF NOT EXISTS idx_coaches_edit_token ON coaches(edit_token);
-- UNIQUE constraint required for upsert onConflict: 'season,rank' to work
CREATE UNIQUE INDEX IF NOT EXISTS idx_ap_rankings_season_rank ON ap_rankings(season, rank);
-- Also keep a plain season index for filtering
CREATE INDEX IF NOT EXISTS idx_ap_rankings_season ON ap_rankings(season);
CREATE INDEX IF NOT EXISTS idx_heisman_season ON heisman_watch(season);
CREATE INDEX IF NOT EXISTS idx_articles_type ON articles(article_type);

-- ── Seed Data ────────────────────────────────────────────────────────────────

INSERT INTO league_settings (id, current_week, current_season, league_name)
VALUES (1, 0, 1, 'Dynasty Universe')
ON CONFLICT (id) DO NOTHING;

INSERT INTO migration_version (id, version) VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════════
-- DONE! Your Dynasty Universe database is ready.
-- ════════════════════════════════════════════════════════════════════════════════
