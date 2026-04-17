-- ──────────────────────────────────────────────────────────────────────────────
-- MIGRATION: Add mascot and team color to coaches table
-- Run this in your Supabase SQL Editor (supabase.com → your project → SQL Editor)
-- ──────────────────────────────────────────────────────────────────────────────

alter table coaches
  add column if not exists mascot_emoji text,   -- e.g. "🐊" (Gators), "🐘" (Tide), "🐆" (Tigers)
  add column if not exists team_color   text,   -- hex color e.g. "#003087" or a name like "Crimson"
  add column if not exists team_id      bigint  references teams(id) on delete set null;

-- Optional: Add an index on team_id for faster lookups
create index if not exists coaches_team_id_idx on coaches(team_id);
