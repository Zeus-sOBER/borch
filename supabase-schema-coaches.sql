-- Run this in your Supabase SQL Editor to add coach tracking
-- (In addition to your existing schema files)

create table if not exists coaches (
  id              bigint generated always as identity primary key,
  name            text        not null,
  team            text,                        -- current team
  username        text,                        -- gamertag / discord handle
  hire_date       date,                        -- when they joined the dynasty
  overall_wins    int         default 0,
  overall_losses  int         default 0,
  seasons_coached int         default 1,
  bio             text,                        -- commissioner-written blurb
  coaching_style  text,                        -- e.g. "Air Raid Offense", "Defensive Minded"
  alma_mater      text,                        -- their favorite real-life school
  is_active       boolean     default true,    -- false = left the dynasty
  is_commissioner boolean     default false,
  achievements    jsonb       default '[]',    -- array of achievement objects
  season_records  jsonb       default '[]',    -- array of {season, wins, losses, finish} objects
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Public read
alter table coaches enable row level security;
create policy "Public read coaches" on coaches for select using (true);

-- Sample: insert yourself as commissioner
-- UPDATE the values below before running
-- insert into coaches (name, team, username, is_commissioner, is_active, bio, coaching_style)
-- values ('Your Name', 'Your Team', 'YourGamertag', true, true, 'Commissioner of Dynasty Universe.', 'Balanced');
