-- ─────────────────────────────────────────────────────────────────────────────
-- Dynasty Universe — Migration: Fix featured_game_id column type
-- Run this ONCE in: Supabase → SQL Editor → New query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- The previous migration accidentally created featured_game_id as UUID.
-- Games use integer (bigint) primary keys, so we need to fix the column type.

-- Step 1: Drop the old (wrong-type) column
ALTER TABLE league_settings
  DROP COLUMN IF EXISTS featured_game_id;

-- Step 2: Re-add it with the correct type (bigint, matching games.id)
ALTER TABLE league_settings
  ADD COLUMN IF NOT EXISTS featured_game_id bigint REFERENCES games(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Done! The 🏈 Game picker will now save correctly.
-- ─────────────────────────────────────────────────────────────────────────────
