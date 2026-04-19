# 🏆 Heisman Trophy Watch — Complete Guide

> **IMPORTANT:** Whenever you modify Heisman Watch files, update this documentation by running: `/consolidate-memory` skill or manually ensuring this file reflects all changes. See [Maintenance Instructions](#maintenance-instructions) at bottom.

---

## Quick Overview

**What:** A focused top 5 Heisman Trophy candidate tracker with in-game trophy screenshots instead of tracking all player stats.

**Why:** Replaces tedious stat tracking with a sleek, screenshot-driven showcase of elite candidates competing for the Heisman.

**How:** Upload in-game Heisman trophy screenshots from Google Drive, add context, and display beautifully.

---

## Files & What They Do

### Database
- **`supabase-schema-heisman.sql`** — Creates `heisman_watch` table. Run once in Supabase SQL Editor.

### Frontend
- **`pages/heisman-watch.js`** — Beautiful page displaying top 5 candidates with medals (🥇🥈🥉), stats, notes, and trophy screenshots.

### Backend
- **`pages/api/heisman-watch.js`** — API endpoints for GET, POST, PUT, DELETE operations.

---

## Setup (5 Steps)

### 1. Run Database Schema
```
Go to: Supabase Dashboard → SQL Editor
Paste: supabase-schema-heisman.sql
Click: RUN
Confirm: heisman_watch table created
```

### 2. Copy Files to Project
```
✓ pages/api/heisman-watch.js    → your pages/api/
✓ pages/heisman-watch.js        → your pages/
```

### 3. Add Navigation Link
In `pages/index.js`, add one line to your nav menu:
```jsx
<Link href="/heisman-watch">
  <a>🏆 Heisman Watch</a>
</Link>
```

### 4. Deploy
```bash
git add .
git commit -m "Add Heisman Trophy Watch feature"
git push origin main
```
Vercel auto-deploys in ~60 seconds.

### 5. Use It
Visit: `yourdynasty.vercel.app/heisman-watch`
- Click **+ Add Candidate**
- Fill in player info, stats, notes, trophy screenshot URL
- Click **✓ Add Candidate**

---

## Features

| Feature | Details |
|---------|---------|
| **Top 5 Candidates** | Display ranked with medal emojis |
| **Trophy Screenshots** | Show in-game Heisman trophy from Google Drive |
| **Key Stats** | Display passing yards, TDs, rushing, etc. |
| **Notes/Commentary** | Add context like "Hot streak after 400 yards" |
| **Add/Remove** | Easy form-based management |
| **Responsive Design** | Works on desktop, tablet, mobile |

---

## How to Use

### Adding a Candidate
1. Go to `/heisman-watch`
2. Click **+ Add Candidate**
3. Fill form:
   - **Player Name:** e.g., "Travis Hunter"
   - **Position:** e.g., "QB", "RB", "WR" (optional)
   - **Team ID:** Integer ID from `teams` table (e.g., `280` for Virginia Tech)
   - **Coach ID:** Integer ID from `coaches` table (e.g., `1` for Jesus Laris)
   - **Rank:** 1-5 (1 = top contender)
   - **Key Stats:** (optional JSON object)
   - **Notes:** e.g., "Leading nation in passing yards"
   - **Trophy Screenshot URL:** Direct Google Drive link
4. Click **✓ Add Candidate**

**Example:**
- Player Name: Travis Hunter
- Position: QB
- Team ID: 280 (Virginia Tech)
- Coach ID: 1 (Jesus Laris)
- Rank: 1
- Notes: "Hot streak with 400+ passing yards last game"

### Getting Trophy Screenshot URLs
1. In CFB 25/26, navigate to trophy/awards screen
2. Take screenshot of Heisman trophy
3. Upload to Google Drive folder (suggest: `Heisman_Trophies/`)
4. Right-click → Share → Get shareable link
5. Extract `FILE_ID` from link
6. Format as: `https://drive.google.com/uc?id=FILE_ID&export=download`
7. Paste into Heisman Watch form

**Pro Tip:** Create a dedicated Drive folder:
```
Dynasty League Drive/
├── Heisman_Trophies/
│   ├── Week5_Hunter.png
│   ├── Week6_Hunter.png
│   └── Week7_Stetson.png
```

### Removing a Candidate
Click the **✕** button on their candidate card.

### Updating a Candidate
Option 1: Delete and re-add (current)
Option 2: Update directly in Supabase SQL Editor:
```sql
UPDATE heisman_watch 
SET key_stats = '{"passing_yards": 4500, "tds": 45}',
    notes = 'Now leading the race',
    trophy_screenshot_url = 'https://...'
WHERE player_name = 'Travis Hunter';
```

---

## API Reference

### GET — Fetch Top 5 Candidates
```bash
GET /api/heisman-watch
```
**Response:**
```json
{
  "success": true,
  "candidates": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "player_name": "Travis Hunter",
      "position": "QB",
      "team_id": 280,
      "coach_id": 1,
      "rank": 1,
      "key_stats": {"passing_yards": 4500, "tds": 45, "rushing_yards": 850},
      "notes": "Leading the Heisman race with 400+ yard passing games",
      "trophy_screenshot_url": "https://drive.google.com/...",
      "trophy_screenshot_date": "2026-04-18T...",
      "week_updated": 8,
      "season": 1,
      "teams": {
        "id": 280,
        "name": "Virginia Tech",
        "mascot_emoji": "🦃",
        "team_color": "861F41"
      },
      "coaches": {
        "id": 1,
        "name": "Jesus Laris",
        "username": "PrimalPegasus14",
        "coaching_style": "Pro Style Offense"
      }
    }
  ],
  "count": 5
}
```
**Includes:** Team name, color, emoji + Coach name, username, coaching style

### POST — Add Candidate
```bash
POST /api/heisman-watch
Content-Type: application/json

{
  "player_name": "Travis Hunter",
  "position": "QB",
  "team_id": 280,
  "coach_id": 1,
  "rank": 1,
  "key_stats": {"passing_yards": 4500, "tds": 45},
  "notes": "Hot streak continues, leading nation in passing yards",
  "trophy_screenshot_url": "https://drive.google.com/uc?id=...",
  "week_updated": 8,
  "season": 1
}
```
**Response:** 201 Created + candidate object with team and coach info  
**Required Fields:** player_name, team_id (integer), coach_id (integer), rank (1-5)  
**Note:** Both `team_id` and `coach_id` are integers from their respective tables.

### PUT — Update Candidate
```bash
PUT /api/heisman-watch
Content-Type: application/json

{
  "id": "candidate-uuid",
  "rank": 2,
  "notes": "Fell to #2 after injury",
  "trophy_screenshot_url": "https://..."
}
```
**Response:** 200 OK + updated candidate object

### DELETE — Remove Candidate
```bash
DELETE /api/heisman-watch?id=candidate-uuid
```
**Response:** 200 OK + deleted candidate object

---

## Database Schema

```sql
heisman_watch table:
├── id (UUID, primary key)
├── player_name (varchar 255, required)
├── position (varchar 50, optional - QB, RB, WR, etc)
├── team_id (BIGINT, foreign key → teams.id, required)
├── coach_id (BIGINT, foreign key → coaches.id, required)
├── rank (integer, 1-5, required)
├── key_stats (JSONB, optional - {passing_yards, tds, rushing_yards, etc})
├── notes (text, optional commentary)
├── trophy_screenshot_url (text, optional - Google Drive link)
├── trophy_screenshot_date (timestamp, auto-set on creation)
├── week_updated (integer, optional - which week)
├── season (integer, defaults to 1)
├── created_at (timestamp)
└── updated_at (timestamp)

Foreign Keys:
├── team_id → teams(id)
└── coach_id → coaches(id)

Indexes:
├── heisman_watch_rank_idx (on rank)
├── heisman_watch_team_idx (on team_id)
├── heisman_watch_coach_idx (on coach_id)
├── heisman_watch_week_idx (on week_updated)
└── heisman_watch_season_idx (on season)
```

---

## Example Candidate Card Display

```
🥇 Travis Hunter
South Carolina

PASSING YARDS: 4500 | PASSING TDS: 45 | RUSHING YARDS: 850 | RUSHING TDS: 12

💭 Currently leading the Heisman race with consistent 400+ passing yards 
   and elite rushing threat. Hot streak continues into week 8.

[HEISMAN TROPHY SCREENSHOT - displayed from Google Drive]
Updated: April 18, 2026 | Week 8
```

---

## Useful SQL Queries

### Get Current Heisman Leader (#1)
```sql
SELECT * FROM heisman_watch WHERE rank = 1;
```

### Update Trophy Screenshot Weekly
```sql
UPDATE heisman_watch 
SET trophy_screenshot_url = 'https://drive.google.com/uc?id=NEW_ID&export=download',
    trophy_screenshot_date = NOW(),
    week_updated = 8
WHERE rank = 1;
```

### See All 5 Candidates
```sql
SELECT player_name, rank, key_stats, notes 
FROM heisman_watch 
ORDER BY rank ASC;
```

### Delete Candidate
```sql
DELETE FROM heisman_watch WHERE player_name = 'John Doe';
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| **Missing required fields error** | Ensure you provide: player_name, team_id, coach_id, and rank |
| **"coach_id must be a positive integer"** | Go to Supabase → coaches table → copy the `id` column value (e.g., `1`) |
| **"team_id must be a positive integer"** | Go to Supabase → teams table → copy the `id` column value (e.g., `280`) |
| **Foreign key constraint error** | Both `team_id` and `coach_id` must exist in their respective tables |
| **Image not showing** | Check Drive link uses `?export=download` & is public |
| **Candidate won't save** | Verify both Team ID and Coach ID exist. Check the IDs in Supabase tables directly. |
| **Page 404** | Confirm `pages/heisman-watch.js` is in correct folder |
| **API error 500** | Check browser console for detailed error message & Supabase connection |

---

## Future Enhancements

- ❌ Auto-parse trophy images using Claude API
- ❌ Edit form (currently: delete & re-add)
- ❌ Automated weekly update reminders
- ❌ Historical tracking across seasons
- ❌ Vote simulation/predictions

These can be added later!

---

## Navigation Menu Example

### If using inline links in `pages/index.js`
```jsx
<nav className="flex gap-6 p-4 bg-blue-600 text-white">
  <Link href="/">Dashboard</Link>
  <Link href="/standings">Standings</Link>
  <Link href="/scores">Scores</Link>
  <Link href="/heisman-watch">🏆 Heisman Watch</Link>
  <Link href="/stream-watcher">Stream Watcher</Link>
  <Link href="/coaches">Coaches</Link>
</nav>
```

### If using separate navbar component
```jsx
// components/NavBar.js
const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/standings', label: 'Standings' },
  { href: '/scores', label: 'Scores' },
  { href: '/heisman-watch', label: '🏆 Heisman Watch' },
  { href: '/stream-watcher', label: 'Stream Watcher' },
  { href: '/coaches', label: 'Coaches' },
];
```

---

## Maintenance Instructions

**IMPORTANT: Read this whenever updating Heisman Watch files**

### When You Modify Code Files
If you change `pages/heisman-watch.js`, `pages/api/heisman-watch.js`, or `supabase-schema-heisman.sql`:

1. **Update this document** (`HEISMAN_WATCH.md`) with any new features, breaking changes, or API modifications
2. **Update the README.md** if the feature fundamentals change
3. **Keep section headings consistent:** Features, Setup, API Reference, Troubleshooting, etc.
4. **Document new endpoints** in the "API Reference" section with examples
5. **Update database schema section** if adding/removing columns
6. **Add new fields to example responses** in the API Reference

### Documentation Structure to Maintain
```
📄 HEISMAN_WATCH.md (THIS FILE)
  ├── Quick Overview
  ├── Files & What They Do
  ├── Setup (5 Steps)
  ├── Features
  ├── How to Use
  ├── API Reference
  ├── Database Schema
  ├── Example Card Display
  ├── SQL Queries
  ├── Troubleshooting
  ├── Future Enhancements
  ├── Navigation Examples
  └── Maintenance Instructions (THIS SECTION)
```

### Delete Old Files
These files have been **consolidated** into this file and can be deleted:
- `HEISMAN_WATCH_SUMMARY.md` ❌
- `HEISMAN_WATCH_SETUP.md` ❌
- `HEISMAN_INTEGRATION_CHECKLIST.md` ❌
- `NAVIGATION_UPDATE_EXAMPLE.md` ❌

Keep only:
- ✅ `supabase-schema-heisman.sql`
- ✅ `pages/heisman-watch.js`
- ✅ `pages/api/heisman-watch.js`
- ✅ `HEISMAN_WATCH.md` (this file)
- ✅ `README.md` (updated with Heisman feature)

### How to Keep This Updated

Every time you modify Heisman Watch:

1. **Code Change** → **Documentation Change**
   - Add new API endpoint? → Document in "API Reference"
   - Add new field? → Update "Database Schema"
   - Change feature behavior? → Update "How to Use"

2. **Use This Checklist**
   - [ ] Code is updated
   - [ ] This file (HEISMAN_WATCH.md) is updated
   - [ ] README.md reflects major changes
   - [ ] Old/redundant .md files are deleted
   - [ ] Changes are committed: `git add HEISMAN_WATCH.md README.md && git commit -m "Update Heisman Watch docs"`

3. **For Future Conversations**
   - Claude will read this file first for context
   - Keep it accurate so Claude understands current state
   - Single source of truth for Heisman Watch feature

---

## Quick Links

- **Main Project README:** See `README.md` for full Dynasty Universe overview
- **Setup Guide:** Start with "Setup (5 Steps)" above
- **API Docs:** See "API Reference" section
- **Troubleshooting:** See "Troubleshooting" section
- **Database Info:** See "Database Schema" section

---

## Summary of Changes (Latest Update)

**Added Coach Linking:**
- Heisman candidates now link to BOTH team AND coach
- Shows "Coach: Jesus Laris" under player name
- Allows tracking which coach produced the Heisman candidate
- API returns full coach & team details for rich display

**Schema Updates:**
- Added `coach_id` (BIGINT, foreign key to coaches table)
- Added `position` field (QB, RB, WR, etc.)
- Added `season` field (defaults to 1)
- Both `team_id` and `coach_id` are now required

**Why This Matters:**
Instead of just showing "Travis Hunter from Virginia Tech", you now see:
- Travis Hunter (QB)
- Virginia Tech 🦃
- Coach: Jesus Laris

---

**Last Updated:** April 19, 2026  
**Status:** ✅ Complete & Consolidated  
**Database Links:** Teams (team_id) + Coaches (coach_id)
