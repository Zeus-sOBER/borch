-- ─── Fix Miami team name duplicates ────────────────────────────────────────────
-- Run in Supabase → SQL Editor
--
-- Background: The same Miami (FL) game was imported multiple times with different
-- team name spellings ("University of Miami", "Miami", "Miami University").
-- Because the upsert key is (home_team, away_team, week), these were stored as
-- separate rows instead of being deduplicated.
--
-- Step 1 — Preview what you're about to fix:
-- Run this first to see the affected rows before making any changes.

SELECT id, week, home_team, away_team, home_score, away_score, is_final
FROM games
WHERE LOWER(home_team) LIKE '%miami%'
   OR LOWER(away_team) LIKE '%miami%'
ORDER BY week, id;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2 — Delete variant rows WHERE a canonical version already exists.
-- Must run BEFORE the UPDATE to avoid the unique-constraint conflict.
-- A "variant" home_team row is redundant when a (Miami, same_away, same_week)
-- row already exists in the table.

DELETE FROM games
WHERE LOWER(home_team) IN (
  'university of miami', 'miami fl', 'miami (fl)', 'miami florida', 'u of miami'
)
AND EXISTS (
  SELECT 1 FROM games g2
  WHERE g2.home_team = 'Miami'
    AND g2.away_team = games.away_team
    AND g2.week      = games.week
);

DELETE FROM games
WHERE LOWER(away_team) IN (
  'university of miami', 'miami fl', 'miami (fl)', 'miami florida', 'u of miami'
)
AND EXISTS (
  SELECT 1 FROM games g2
  WHERE g2.away_team = 'Miami'
    AND g2.home_team = games.home_team
    AND g2.week      = games.week
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3 — Now it's safe to rename whatever variants are left
-- (no canonical row exists for these yet, so no conflict).

UPDATE games
SET home_team = 'Miami'
WHERE LOWER(home_team) IN (
  'university of miami', 'miami fl', 'miami (fl)', 'miami florida', 'u of miami'
);

UPDATE games
SET away_team = 'Miami'
WHERE LOWER(away_team) IN (
  'university of miami', 'miami fl', 'miami (fl)', 'miami florida', 'u of miami'
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 4 — Verify: confirm only one row per matchup now exists.

SELECT week, home_team, away_team, COUNT(*) as cnt
FROM games
WHERE LOWER(home_team) LIKE '%miami%'
   OR LOWER(away_team) LIKE '%miami%'
GROUP BY week, home_team, away_team
ORDER BY week;
-- Every row in the result should show cnt = 1
