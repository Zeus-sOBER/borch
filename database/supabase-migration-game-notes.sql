-- Add notes column to games table
-- Run in Supabase → SQL Editor
-- Stores commissioner notes like "Rivalry Game", "Heated coaches rivalry", bowl game names, etc.

alter table games add column if not exists notes text;
