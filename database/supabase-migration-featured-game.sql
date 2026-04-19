-- ─────────────────────────────────────────────────────────────────────────────
-- Dynasty Universe — Migration: Featured Game column
-- Run this ONCE in: Supabase → SQL Editor → New query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Adds the featured_game_id column so the commissioner can pin a game score
-- to the dashboard hero section.
-- NOTE: game IDs in this project are bigint (not uuid), so we use bigint here.

ALTER TABLE league_settings
  ADD COLUMN IF NOT EXISTS featured_game_id bigint REFERENCES games(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Done! The 🏈 Game picker on the dashboard will now save correctly.
-- ─────────────────────────────────────────────────────────────────────────────
