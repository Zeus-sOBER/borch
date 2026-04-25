# Dynasty Universe

A live web app for EA Sports CFB 26 online dynasty leagues. Your whole league visits one site to see standings, scores, stats, AI-generated articles, live stream analysis, and more — all powered by screenshots and zero manual data entry.

## Quick Start

1. Create a free Supabase project and run `database/dynasty-universe-complete.sql` in the SQL Editor
2. Deploy to Vercel and set the 5 required environment variables (see below)
3. Visit `/setup` on your live site — the setup wizard walks you through everything else

## Tech Stack

Next.js 14 (Pages Router), React 18, Supabase (PostgreSQL), Claude AI (Anthropic SDK), Google Drive API, Twitch API, Vercel, Discord Webhooks

## Project Structure

```
borch/
├── pages/
│   ├── index.js              Main hub — 6-tab interface (Dashboard, Standings, Season, Awards, Media, Sync)
│   ├── coaches.js            Coach profiles with records, bios, achievements
│   ├── heisman-watch.js      Heisman Trophy top 5 showcase
│   ├── media-center.js       Standalone article browser
│   ├── stream-watcher.js     Live Twitch stream analysis + dynasty lore
│   ├── timeline.js           Visual narrative timeline of dynasty events
│   ├── setup.js              5-step setup wizard for new commissioners
│   └── api/
│       ├── health.js              Setup validator — checks env, DB, tables
│       ├── league-data.js         Single call fetching all dashboard data
│       ├── league-settings.js     League branding, week/season, AP poll
│       ├── parse-screenshot.js    Google Drive screenshot → AI → database
│       ├── upload-screenshot.js   Direct image upload with preview mode
│       ├── generate-article.js    ESPN-style AI article generator
│       ├── generate-lore.js       Dynasty lore from stream moments
│       ├── watch-stream.js        Twitch thumbnail → Claude analysis
│       ├── coaches.js             Coach CRUD + edit token generation
│       ├── coaches/[id].js        Coach detail + self-service editing
│       ├── articles.js            Article CRUD
│       ├── heisman-watch.js       Heisman candidate CRUD
│       ├── championships.js       Championship records
│       ├── team-stats.js          Offense/defense team stats
│       ├── narrative.js           Narrative log queries
│       ├── auto-scan.js           Batch scan all Drive files
│       ├── sync-sheet.js          Google Sheets webhook receiver
│       ├── drive-files.js         List Drive folder contents
│       ├── drive-image.js         Fetch Drive image for parsing
│       ├── stream-history.js      Stream event history
│       ├── recalculate-standings.js  Recompute W/L from games
│       ├── generate-season-summary.js  End-of-season AI summary
│       ├── media-center.js        Media center data endpoint
│       └── cron/decay-old-events.js  Daily narrative weight decay
├── lib/
│   ├── supabase.js           Database client helpers
│   ├── narrative.js          Narrative engine — momentum, weight, context
│   ├── drive.js              Google Drive/Sheets integration
│   └── discord.js            Discord webhook notifications
├── database/
│   └── dynasty-universe-complete.sql   One-file database setup (run this)
├── dynasty-sheet-trigger.gs  Google Apps Script for spreadsheet auto-sync
├── vercel.json               Deployment config + daily cron
└── package.json
```

## Features

**Dashboard** — Live standings, score ticker, stat leaders, recent articles, narrative feed. Dynamic league branding (name, colors) from settings.

**Screenshot Sync** — Upload a CFB 26 screenshot (or drop it into Google Drive), AI auto-detects the type (standings, scores, stats, AP poll, Heisman, team stats, recruiting, championship), shows a preview, and saves to the database on confirm.

**AI Articles** — ESPN-style articles with full narrative awareness: Power Rankings, Weekly Recap, Player Spotlight, Rivalry Breakdown, Matchup Preview, League Preview, and custom prompts. Every article references coaches by name and builds on previous storylines.

**Stream Watcher** — Connects to a Twitch stream, captures thumbnails, Claude analyzes gameplay in real-time. Detects scores, big moments, recruiting events. Auto-skips menu screens. Generates dynasty lore.

**Coaches** — Full profiles with records, bios, coaching style, achievements. Commissioner manages via PIN. Coaches can self-edit their own profiles using a personal edit token.

**Narrative Engine** — Every game result, big moment, and article feeds into a narrative log with momentum tagging and weighted importance. This gives Claude memory across the entire season so articles get richer over time.

**Discord Notifications** — Articles and big stream moments automatically post to a Discord channel via webhook.

**Timeline** — Visual history of all dynasty events, color-coded by type, filterable, grouped by week.

**Awards** — Heisman Watch (top 5 with screenshots), championship history, AP Top 25 rankings.

**URL Hash Routing** — Shareable tab links like `yoursite.com/#standings`.

**Setup Wizard** — `/setup` walks new commissioners through health check, league identity, and first coach creation.

## Environment Variables

**Required (5):**
```
ANTHROPIC_API_KEY           Claude AI API key
NEXT_PUBLIC_SUPABASE_URL    Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY  Supabase anon key
SUPABASE_SERVICE_ROLE_KEY   Supabase service role key
COMMISSIONER_PIN            PIN you choose for admin access
```

**Optional (7):**
```
GOOGLE_SERVICE_ACCOUNT_JSON   Google service account (for Drive screenshots)
GOOGLE_DRIVE_FOLDER_ID        Shared Drive folder ID
TWITCH_CLIENT_ID              Twitch app (for stream watcher)
TWITCH_CLIENT_SECRET          Twitch app secret
DYNASTY_SHEET_ID              Google Sheet ID (for auto-sync)
SHEET_SYNC_SECRET             Secret for sheet sync webhook
DISCORD_WEBHOOK_URL           Discord channel webhook URL
```

## Development

```bash
npm install
npm run dev        # http://localhost:3000
```

Create `.env.local` with the variables above. Database setup: run `database/dynasty-universe-complete.sql` in your Supabase SQL Editor.

## Deployment

Push to GitHub → Vercel auto-deploys. Set environment variables in Vercel dashboard under Settings → Environment Variables. Visit `/setup` on your live site to verify everything is connected.
