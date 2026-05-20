-- Add hire_week to coaches so mid-season joins can show a personal record
-- separate from the team's full season record.
alter table coaches add column if not exists hire_week int default null;
