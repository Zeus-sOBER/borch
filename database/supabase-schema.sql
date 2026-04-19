-- Run this entire file in your Supabase SQL Editor (supabase.com → your project → SQL Editor)

create table if not exists teams (
  id          bigint generated always as identity primary key,
  name        text        not null,
  coach       text,
  wins        int         default 0,
  losses      int         default 0,
  pts         int         default 0,
  pts_against int         default 0,
  streak      text,
  rank        int,
  season      int         default 1,
  updated_at  timestamptz default now(),
  unique (name, season)
);

create table if not exists games (
  id          bigint generated always as identity primary key,
  week        int,
  home_team   text,
  home_score  int,
  away_team   text,
  away_score  int,
  status      text        default 'Final',
  season      int         default 1,
  source_file text,
  created_at  timestamptz default now()
);

create table if not exists players (
  id          bigint generated always as identity primary key,
  name        text        not null,
  team        text,
  pos         text,
  stats       jsonb       default '{}',
  season      int         default 1,
  updated_at  timestamptz default now(),
  unique (name, season)
);

create table if not exists scan_log (
  id              bigint generated always as identity primary key,
  file_id         text,
  file_name       text,
  data_type       text,
  records_parsed  int,
  created_at      timestamptz default now()
);

-- Allow public read access (your app uses the anon key on the frontend)
alter table teams    enable row level security;
alter table games    enable row level security;
alter table players  enable row level security;
alter table scan_log enable row level security;

create policy "Public read teams"    on teams    for select using (true);
create policy "Public read games"    on games    for select using (true);
create policy "Public read players"  on players  for select using (true);
create policy "Public read scan_log" on scan_log for select using (true);

-- Service role (used by your API) can do everything — no extra policy needed
-- because service role bypasses RLS by default.
