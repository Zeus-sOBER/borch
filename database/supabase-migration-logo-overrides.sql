-- ─────────────────────────────────────────────────────────────────────────────
-- Dynasty Universe — Migration: Logo Overrides column
-- Run this ONCE in: Supabase → SQL Editor → New query → Paste → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Adds a logo_overrides JSONB column to league_settings so commissioners can
-- fix wrong team logos and have the change apply for ALL users (league-wide),
-- not just their own browser.
--
-- Format stored: { "team name lowercase": "none" | espnNumericId }
-- Example: { "texas state": "none", "arizona": 12 }

ALTER TABLE league_settings
  ADD COLUMN IF NOT EXISTS logo_overrides jsonb DEFAULT '{}'::jsonb;

-- ─────────────────────────────────────────────────────────────────────────────
-- Done! The 🖼 Fix Logos tool on the dashboard will now save changes to the
-- database so every user sees the corrected logos automatically.
-- ─────────────────────────────────────────────────────────────────────────────
