-- Dynasty Universe — League Rules table
-- Run once in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS league_rules (
  id          bigint generated always as identity primary key,
  rule        text        not null,
  established text,           -- e.g. "3/1/26 by majority vote"
  notes       text,           -- optional extra detail
  category    text,           -- e.g. "Gameplay", "Scheduling", "Voting"
  sort_order  int  default 0,
  created_at  timestamptz default now()
);

ALTER TABLE league_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read league_rules" ON league_rules FOR SELECT USING (true);

-- Seed from existing spreadsheet
INSERT INTO league_rules (rule, established, category, sort_order) VALUES
  ('Play cooldown', '3/1/26 by majority vote', 'Gameplay', 10),
  ('2 or more starts requires photo evidence', '3/1/26 by majority vote', 'Gameplay', 20),
  ('No chew clock allowed until 4th quarter. You can run out the clock but you gotta do it manually.', '3/1/26 by majority vote', 'Gameplay', 30),
  ('Vote needs 6 votes to pass within time frame to pass. Or the vote fails.', '1/27/26 by majority vote', 'Voting', 40),
  ('Natural sim', '4/12/26', 'Scheduling', 50),
  ('1 emergency restart per season', '3/14/26 — Rustin, Cody, Andrew, Jesus, Ryan', 'Gameplay', 60),
  ('League advance schedule: 72 hrs', '4/12/26 majority', 'Scheduling', 70),
  ('User games have a 72-hour time limit. If one user can play and the other cannot: user vs autopilot CPU. If both users cannot play: natural sim.', '4/12/26 majority', 'Scheduling', 80)
ON CONFLICT DO NOTHING;
