# Dynasty Universe — Project Summary

## What This Is
A live website for EA Sports CFB 26 Online Dynasty leagues. Team standings, scores, stats, AI-generated media articles, Twitch stream watching with live dynasty lore generation, and coach profile management.

**Live URL:** `yourdynasty.vercel.app`

---

## Tech Stack
- **Frontend:** Next.js, React
- **Database:** Supabase (PostgreSQL)
- **AI:** Claude API (screenshot parsing, article generation, stream analysis)
- **APIs:** Google Drive (screenshot uploads), Twitch (stream capture)
- **Hosting:** Vercel

---

## Project Structure
```
borch/
├── pages/
│   ├── index.js                      ← Main hub (Dashboard, Standings, Scores, Stats, Media, Drive Sync)
│   ├── stream-watcher.js             ← Stream watching & dynasty lore generation
│   ├── coaches.js                    ← Coach profiles & management
│   ├── heisman-watch.js              ← Heisman Trophy top 5 candidates showcase
│   └── api/                          ← API endpoints for all features
│       └── heisman-watch.js          ← Heisman Watch CRUD endpoints
├── lib/
│   ├── supabase.js                   ← Database client
│   └── drive.js                      ← Google Drive integration
├── supabase-schema.sql               ← Core database tables
├── supabase-schema-stream.sql        ← Stream event tracking
├── supabase-schema-coaches.sql       ← Coach data
├── supabase-schema-heisman.sql       ← Heisman Trophy candidates table
├── HEISMAN_WATCH.md                  ← Complete Heisman Watch guide (see this for setup)
├── package.json
├── next.config.js
└── .env.local.example                ← Environment variables template
```

---

## Core Features

### Dashboard & Data Hub
- Live standings with team records and streaks
- Weekly scores & schedule with score details
- Position-filtered player stat leaders
- Points for/against tracking

### Drive Sync (Automated Screenshot Processing)
- League members upload CFB26 screenshots to shared Google Drive folder
- Select screenshot type (Standings, Scores, or Player Stats)
- AI parses images → updates database instantly
- No manual data entry needed

### Stream Watcher
- AI monitors Twitch streams in real-time
- Detects game scores, big plays, recruiting events
- Generates color-coded moment feed
- Tracks recruiting commitments/visits/decommitments
- Generates dynasty lore (Breaking News, Game Chronicle, Recruiting War)

### Media Center
- Auto-generates ESPN-style articles:
  - Power Rankings (top 5 teams)
  - Weekly Recap (game-by-game breakdown)
  - Player Spotlight (standout player feature)
  - Rivalry Breakdown (upcoming matchup analysis)

### Coaches Hub
- Full coach profiles with records, bios, season history
- Achievement/trophy tracking (championships, bowl wins, recruiting crowns)
- Commissioner-protected add/edit/delete
- Automatic W/L calculation from season records

### Heisman Trophy Watch
- Track top 5 Heisman Trophy candidates instead of all player stats
- Import in-game Heisman trophy screenshots from Google Drive
- Display player stats, rankings, and contextual notes
- Streamlined add/remove candidate management
- Responsive design with trophy screenshot display

---

## Environment Variables Required
```
ANTHROPIC_API_KEY              (Claude API key)
NEXT_PUBLIC_SUPABASE_URL       (Database URL)
NEXT_PUBLIC_SUPABASE_ANON_KEY  (Public anon key)
SUPABASE_SERVICE_ROLE_KEY      (Service role secret)
GOOGLE_SERVICE_ACCOUNT_JSON    (Entire JSON file as single line)
GOOGLE_DRIVE_FOLDER_ID         (Drive folder ID)
TWITCH_CLIENT_ID               (Twitch app ID)
TWITCH_CLIENT_SECRET           (Twitch app secret)
COMMISSIONER_PIN               (Password for commissioner actions)
```

---

## Deployment
- Hosted on **Vercel** (connects to GitHub for auto-deployment)
- Code stored on **GitHub** (public repo)
- **Supabase** provides free PostgreSQL database

**To deploy updates:**
1. Push code to GitHub via GitHub Desktop
2. Vercel auto-deploys in ~60 seconds
3. New SQL schemas run manually in Supabase SQL Editor first

---

## Development
- **Install:** `npm install`
- **Run locally:** `npm run dev` → `http://localhost:3000`
- **Database:** Supabase (requires API keys in `.env.local`)

See `MASTER_SETUP_GUIDE.md` for full setup instructions, troubleshooting, and deployment walkthrough.
