-- Run this in your Supabase SQL Editor to add stream watcher tables
-- (Run this IN ADDITION to supabase-schema.sql, not instead of it)

create table if not exists stream_events (
  id            bigint generated always as identity primary key,
  channel       text,
  screen_type   text,
  game_status   text,
  home_team     text,
  away_team     text,
  home_score    int,
  away_score    int,
  quarter       text,
  time_remaining text,
  last_play     text,
  atmosphere    text,
  narrative     text,
  raw_analysis  jsonb,
  season        int default 1,
  created_at    timestamptz default now()
);

create table if not exists big_moments (
  id          bigint generated always as identity primary key,
  channel     text,
  type        text,   -- touchdown, interception, fumble, etc.
  description text,
  team        text,
  player      text,
  home_team   text,
  away_team   text,
  home_score  int,
  away_score  int,
  quarter     text,
  season      int default 1,
  created_at  timestamptz default now()
);

create table if not exists recruiting_events (
  id           bigint generated always as identity primary key,
  type         text,   -- commitment, visit, offer, decommit
  player_name  text,
  stars        int,
  pos          text,
  committing_to text,
  season       int default 1,
  created_at   timestamptz default now()
);

-- Public read policies
alter table stream_events    enable row level security;
alter table big_moments      enable row level security;
alter table recruiting_events enable row level security;

create policy "Public read stream_events"     on stream_events     for select using (true);
create policy "Public read big_moments"       on big_moments       for select using (true);
create policy "Public read recruiting_events" on recruiting_events for select using (true);
