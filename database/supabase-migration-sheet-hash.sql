-- Dynasty Universe — add sheet content hash to league_settings
-- Lets the server skip Claude entirely when the spreadsheet hasn't changed.
-- Run in: Supabase → SQL Editor

ALTER TABLE league_settings
  ADD COLUMN IF NOT EXISTS sheet_csv_hash TEXT;
