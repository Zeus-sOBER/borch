-- Stores per-channel Twitch OAuth tokens and EventSub state
CREATE TABLE IF NOT EXISTS twitch_channels (
  id                  bigint generated always as identity primary key,
  channel_name        text unique not null,
  broadcaster_id      text not null,
  access_token        text not null,
  refresh_token       text not null,
  token_expires_at    timestamptz,
  clip_reward_id      text,        -- Channel Points reward ID we created
  eventsub_id         text,        -- EventSub subscription ID
  -- Current game context (commissioner sets before going live)
  current_season      int,
  current_week        int,
  current_home_team   text,
  current_away_team   text,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

ALTER TABLE twitch_channels ENABLE ROW LEVEL SECURITY;
-- Only service role can read (contains tokens) — no public read
