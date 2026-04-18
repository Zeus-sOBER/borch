-- ─────────────────────────────────────────────────────────────────────────────
-- Dynasty Universe — Migration: League Settings + Rankings column
-- Run this ONCE in: Supabase → SQL Editor → New query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Create league_settings table (single-row config store)
CREATE TABLE IF NOT EXISTS league_settings (
  id              int         PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  current_week    int         DEFAULT 0,
  current_season  int         DEFAULT 1,
  updated_at      timestamptz DEFAULT now()
);

-- 2. Seed the one row if it doesn't exist
INSERT INTO league_settings (id, current_week, current_season)
VALUES (1, 0, 1)
ON CONFLICT DO NOTHING;

-- 3. Enable RLS + allow public read (your service role can write via API)
ALTER TABLE league_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Public read league_settings"
  ON league_settings FOR SELECT USING (true);

-- 4. Add rank column to teams (for storing actual CFP/AP poll positions)
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS rank int DEFAULT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Done! The dashboard can now track which week the commissioner has set,
-- and team rankings can be populated from in-game poll screenshots.
-- ─────────────────────────────────────────────────────────────────────────────
