# Database — Supabase Setup

## Quick Start (New Leagues)

Run **one file** to set up everything:

**`dynasty-universe-complete.sql`**

This single file creates all 15+ tables, columns, indexes, RLS policies, and seed data. It's fully idempotent — safe to run multiple times without breaking anything.

### How to Run

1. Go to your Supabase project → **SQL Editor**
2. Click **New Query**
3. Copy-paste the entire contents of `dynasty-universe-complete.sql`
4. Click **Run**
5. Done — your database is ready

## Legacy Migration Files

The individual `supabase-schema-*.sql` and `supabase-migration-*.sql` files are the original incremental migrations that were used during development. They've all been merged into the complete file above. They're kept here for git history reference but **you don't need to touch them** — just use `dynasty-universe-complete.sql`.

## Tables Created

teams, games, players, coaches, scan_log, league_settings, narrative_log, championships, heisman_watch, ap_rankings, team_stats, articles, stream_events, big_moments, recruiting_events
