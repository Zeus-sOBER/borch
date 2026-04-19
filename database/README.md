# Database Files — Supabase

All SQL files for setting up and updating the Dynasty Universe database.

## Initial Setup (Run in this order)

These three files must be run first to create the core database structure:

1. **supabase-schema.sql** — Core tables (teams, leagues, standings, player stats)
2. **supabase-schema-stream.sql** — Stream watching tables (moments, recruiting, events)
3. **supabase-schema-coaches.sql** — Coach profiles and achievements

Run each one in Supabase SQL Editor, one at a time.

## Feature Schemas (Optional)

These add additional tables for specific features:

- **supabase-schema-mascot.sql** — Team mascot data (optional)
- **supabase-schema-narrative.sql** — Dynasty narrative & storylines (optional)

## Migrations (Applied to existing databases)

These files update existing databases with new features. Run in order if updating an existing database:

1. supabase-migration-games-v2.sql
2. supabase-migration-team-id.sql
3. supabase-migration-league-settings.sql
4. supabase-migration-featured-game.sql
5. supabase-migration-ap-poll.sql
6. supabase-migration-logo-overrides.sql
7. supabase-migration-fix-featured-game-type.sql

## How to Run

1. Go to **Supabase → SQL Editor**
2. Click **New Query**
3. Copy-paste the entire contents of the SQL file
4. Click **Run**
5. Wait for success confirmation

**Do not run multiple files at once** — run them one at a time in order.
