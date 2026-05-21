-- Dynasty Universe — Game Clips table
-- Stores Twitch clips triggered by voice/chat command, filed under a specific game

CREATE TABLE IF NOT EXISTS game_clips (
  id              bigint generated always as identity primary key,
  clip_id         text unique,                 -- Twitch clip ID
  clip_url        text        not null,        -- Full Twitch clip URL
  embed_url       text,                        -- Twitch embed URL
  thumbnail_url   text,                        -- Preview image
  title           text,                        -- Clip title (auto or custom)
  broadcaster     text,                        -- Twitch channel name
  duration        numeric,                     -- Clip length in seconds
  -- Game linkage (matched by season + week + teams)
  game_id         bigint references games(id) on delete set null,
  season          int,
  week            int,
  home_team       text,
  away_team       text,
  -- Metadata
  triggered_by    text,                        -- who triggered it (chat user)
  created_at      timestamptz default now()
);

ALTER TABLE game_clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read game_clips" ON game_clips FOR SELECT USING (true);
