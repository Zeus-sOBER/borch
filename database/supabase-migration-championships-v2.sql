-- ============================================================
-- Championship + Team Stats Migration
-- Run this in: Supabase → SQL Editor
-- ============================================================

-- ── 1. Championships table (create or extend) ────────────────
-- Creates the table if it doesn't exist yet, with all fields.
-- If it already exists, the ALTER statements below add the new columns.

create table if not exists championships (
  id                 bigint generated always as identity primary key,
  season             int         not null,
  team_name          text        not null,
  coach_name         text,
  record             text,
  opponent_team      text,
  opponent_record    text,
  result             text,        -- e.g. "56-29"
  championship_type  text        default 'national',  -- national | conference | bowl
  notes              text,
  created_at         timestamptz default now(),
  unique (season, championship_type)   -- one national champ per season, one conf champ per conf per season
);

-- If the table already existed without these columns, add them safely:
alter table championships add column if not exists opponent_team     text;
alter table championships add column if not exists opponent_record   text;
alter table championships add column if not exists result            text;
alter table championships add column if not exists championship_type text default 'national';

-- Drop old unique constraint on (season, team_name) if it exists, replace with (season, championship_type)
-- (comment out if this causes an error — only needed if you had the old constraint)
-- alter table championships drop constraint if exists championships_season_team_name_key;
-- alter table championships add constraint if not exists championships_season_type_key unique (season, championship_type);

alter table championships enable row level security;
create policy "Public read championships" on championships for select using (true);

-- ── 2. Team stats JSONB column ────────────────────────────────
-- Stores per-team offensive/defensive stats as flexible JSON so
-- the AI can reference rushing yards, passing yards, etc.
-- Shape: { rush_yards, rush_tds, pass_yards, pass_tds, yards_allowed,
--           rush_yards_allowed, pass_yards_allowed, turnovers, sacks }

alter table teams add column if not exists team_stats jsonb default '{}';

-- ── 3. Seed historical national championship data ─────────────
-- From the CFB History screenshot. User-coached seasons: 2026-2030.
-- CPU-coached seasons: 2018-2025 included for full historical record.

insert into championships (season, team_name, coach_name, record, opponent_team, opponent_record, result, championship_type)
values
  -- Dynasty era (user-coached wins)
  (2030, 'UTSA',       'Rusty Grimm',        '14-3', 'Miami (OH)',  '13-2', '56-29', 'national'),
  (2029, 'Stanford',   'Justin Woljevach',   '14-1', 'Ohio State',  '15-1', '45-21', 'national'),
  (2028, 'Stanford',   'Justin Woljevach',   '15-1', 'UTSA',        '13-3', '13-10', 'national'),
  (2027, 'Miami (OH)', 'Jordan Herzy',       '16-0', 'Ohio State',  '14-3', '58-36', 'national'),
  (2026, 'Stanford',   'Justin Woljevach',   '14-2', 'Boise State', '14-3', '59-27', 'national'),
  -- Pre-dynasty (CPU coaches)
  (2025, 'Clemson',    'Dabo Swinney',       '16-0', 'Texas',       '13-3', '38-28', 'national'),
  (2024, 'Ohio State', 'Ryan Day',           '14-2', 'Notre Dame',  '14-2', '34-23', 'national'),
  (2023, 'Michigan',   'Jim Harbaugh',       '15-0', 'Washington',  '14-1', '34-13', 'national'),
  (2022, 'Georgia',    'Kirby Smart',        '15-0', 'TCU',         '13-2', '65-7',  'national'),
  (2021, 'Georgia',    'Kirby Smart',        '14-1', 'Alabama',     '13-2', '33-18', 'national'),
  (2020, 'Alabama',    'Nick Saban',         '13-0', 'Ohio State',  '7-1',  '52-24', 'national'),
  (2019, 'LSU',        'Ed Orgeron',         '15-0', 'Clemson',     '14-1', '42-25', 'national'),
  (2018, 'Clemson',    'Dabo Swinney',       '15-0', 'Alabama',     '14-1', '44-16', 'national')
on conflict (season, championship_type) do nothing;
