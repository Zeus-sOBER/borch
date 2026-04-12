# Dynasty Universe — Master Setup Guide
## EA Sports CFB 26 Online Dynasty Hub
### Last Updated: Current (includes Core App, Stream Watcher, and Coaches)

---

## What You're Building

A live website your whole league can visit (e.g. `yourdynasty.vercel.app`) that includes:

- **Dashboard** — live standings snapshot, recent scores, stat leaders
- **Standings** — full team records, streaks, points for/against
- **Scores & Schedule** — week-by-week results with a week selector
- **Player Stats** — filterable by position (QB, RB, WR)
- **Media Center** — AI-generated ESPN-style articles (Power Rankings, Weekly Recap, Player Spotlight, Rivalry Breakdown)
- **Drive Sync** — upload CFB26 screenshots to a shared Google Drive folder; AI reads and updates the database automatically
- **Stream Watcher** — AI watches your Twitch stream live, detects scores, big moments, recruiting events, and generates dynasty lore
- **Coaches** — full coach profiles with records, bios, season history, and achievement/trophy tracking

---

## Files in Your Project

Here is every file your project contains and what it does:

```
dynasty-universe/
├── pages/
│   ├── index.js                  ← Main hub (Dashboard, Standings, Scores, Stats, Media, Drive Sync)
│   ├── stream-watcher.js         ← Stream Watcher page
│   ├── coaches.js                ← Coaches hub page
│   └── api/
│       ├── league-data.js        ← Fetches all Supabase data for the main hub
│       ├── drive-files.js        ← Lists images in your Google Drive folder
│       ├── parse-screenshot.js   ← Sends Drive image to Claude, saves parsed data
│       ├── generate-article.js   ← Generates ESPN-style media articles
│       ├── watch-stream.js       ← Polls Twitch thumbnail, sends to Claude, saves events
│       ├── stream-history.js     ← Fetches moments/recruiting/events from Supabase
│       ├── generate-lore.js      ← Generates dynasty lore from stream moments
│       ├── coaches.js            ← GET all coaches / POST new coach
│       └── coaches/
│           └── [id].js           ← PATCH (edit) / DELETE (deactivate) a coach
├── lib/
│   ├── supabase.js               ← Supabase client helper
│   └── drive.js                  ← Google Drive API helper
├── supabase-schema.sql           ← Core database tables (run first)
├── supabase-schema-stream.sql    ← Stream watcher tables (run second)
├── supabase-schema-coaches.sql   ← Coaches table (run third)
├── package.json
├── next.config.js
└── .env.local.example            ← Template for all environment variables
```

---

## Step 1 — Create a Supabase Database (Free)

Supabase is your free database that stores all dynasty data.

1. Go to **https://supabase.com** and sign up for free
2. Click **"New Project"** → name it `dynasty-universe` → choose any region → Create
3. Wait ~2 minutes for it to finish setting up
4. Go to **SQL Editor** in the left sidebar
5. Run each schema file **one at a time** in this order:
   - Paste contents of `supabase-schema.sql` → click **Run**
   - Paste contents of `supabase-schema-stream.sql` → click **Run**
   - Paste contents of `supabase-schema-coaches.sql` → click **Run**
6. Go to **Project Settings → API** and copy these three values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret key** → `SUPABASE_SERVICE_ROLE_KEY` *(click "Reveal" to see it)*

> **Tip:** Keep these three values somewhere handy — you'll enter them into Vercel in Step 5.

---

## Step 2 — Create a Google Cloud Service Account

This allows your app to automatically read images from Google Drive.

1. Go to **https://console.cloud.google.com** and sign in with your Google account
2. Click **"Select a project"** at the top → **"New Project"** → name it `dynasty-universe` → Create
3. Wait for it to create, then make sure you're inside that new project
4. In the search bar at the top, search **"Google Drive API"** → click it → click **"Enable"**
5. In the left sidebar go to **APIs & Services → Credentials**
6. Click **"Create Credentials" → "Service Account"**
   - Name: `dynasty-app`
   - Click **Create and Continue** → skip the optional steps → click **Done**
7. You'll see your new service account listed. Click on it.
8. Go to the **"Keys"** tab → click **"Add Key" → "Create new key" → JSON** → click **Create**
9. A JSON file will download to your computer. **Don't delete this file** — you need it in Step 5.

---

## Step 3 — Create the Shared Google Drive Folder

This is where your league members upload their CFB26 screenshots.

1. Go to **https://drive.google.com**
2. Create a new folder — name it something like `CFB26 Dynasty Screenshots`
3. Open the JSON file you downloaded in Step 2 and find the `"client_email"` field. It looks like:
   `dynasty-app@your-project-name.iam.gserviceaccount.com`
4. Right-click your new Drive folder → **Share**
5. Paste that client email address → give it **Viewer** access → click **Send**
   *(This lets your app read the screenshots without needing anyone's Google login)*
6. Share the folder with your league members:
   - Right-click the folder → **Share** → click **"Change to anyone with the link"** → set to **Editor**
   - Copy the link and send it to your league — this is where they'll upload screenshots
7. Get the **Folder ID** from the folder's URL:
   - Example URL: `https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs`
   - Folder ID = `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs` (everything after `/folders/`)

---

## Step 4 — Create a Twitch Developer App (Free)

The Stream Watcher uses Twitch's API to grab stream screenshots automatically.

1. Go to **https://dev.twitch.tv/console** and log in with your Twitch account
2. Click **"Register Your Application"**
3. Fill in:
   - **Name:** `dynasty-universe` (or anything you like)
   - **OAuth Redirect URLs:** `http://localhost`
   - **Category:** `Website Integration`
4. Click **Create**
5. Click **"Manage"** on your new app
6. Click **"New Secret"** to generate a client secret — copy it immediately, it won't show again
7. Copy both values:
   - **Client ID** → `TWITCH_CLIENT_ID`
   - **Client Secret** → `TWITCH_CLIENT_SECRET`

---

## Step 5 — Put the Code on GitHub

GitHub stores your code and connects to Vercel for automatic deployment.

1. Go to **https://github.com** and sign up / log in
2. Click **"New repository"** → name it `dynasty-universe` → set to **Public** → click **Create repository**
3. Download and install **GitHub Desktop** from https://desktop.github.com
4. Open GitHub Desktop → **File → Clone Repository** → paste your new repo URL → choose a folder on your computer → click Clone
5. Copy all your dynasty-universe project files into that cloned folder
6. In GitHub Desktop you'll see all the files listed as changes
7. Type `Initial commit` in the summary box → click **Commit to main** → click **Push origin**

---

## Step 6 — Deploy on Vercel (Free)

Vercel hosts your site live on the internet with a public URL.

1. Go to **https://vercel.com** and sign up using your GitHub account
2. Click **"Add New Project"** → find and import `dynasty-universe` from your GitHub
3. Vercel will detect Next.js automatically — don't change any build settings
4. Before clicking Deploy, click **"Environment Variables"** and add all of these:

| Variable Name | Where to get it | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com | Your Claude API key |
| `NEXT_PUBLIC_SUPABASE_URL` | Step 1 — Project URL | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Step 1 — anon public key | |
| `SUPABASE_SERVICE_ROLE_KEY` | Step 1 — service_role key | Click "Reveal" in Supabase |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Step 2 — the entire JSON file | Paste the whole file contents as **one single line** |
| `GOOGLE_DRIVE_FOLDER_ID` | Step 3 — the folder ID from the URL | |
| `TWITCH_CLIENT_ID` | Step 4 | |
| `TWITCH_CLIENT_SECRET` | Step 4 | |
| `COMMISSIONER_PIN` | You choose this | Any password you want, e.g. `dynasty2026` |

> **Important:** The `GOOGLE_SERVICE_ACCOUNT_JSON` value must be the entire contents of the JSON file on a single line with no line breaks. Open the file in a text editor, select all, copy, and paste directly.

5. Click **Deploy** — wait about 1 minute
6. Vercel gives you a URL like `https://dynasty-universe-abc123.vercel.app` — that's your live site!

---

## Step 7 — Share with Your League

- Share the **Vercel URL** with all league members — they can view standings, scores, stats, and media from any browser
- Share the **Google Drive folder link** with all members — this is where they upload screenshots after games
- Bookmark `yourdynastyurl.vercel.app/stream-watcher` for use during live games
- Bookmark `yourdynastyurl.vercel.app/coaches` to manage coach profiles

---

## How to Add Coaches

1. Go to `yoursite.vercel.app/coaches`
2. Click **"Commissioner Login"** in the top right → enter your `COMMISSIONER_PIN`
3. Click **"+ Add Coach"**
4. Fill in the coach's name, team, gamertag, coaching style, alma mater, and bio
5. Save — the coach card appears immediately
6. Click any coach card to open their full profile where you can:
   - Add **season records** (wins, losses, season finish)
   - Add **achievements** (championships, bowl wins, upsets, records, recruiting crowns)
   - Edit any field
   - Mark a coach as inactive if they leave the dynasty (their history is preserved)

> The overall W/L record auto-calculates from season records when you save — no manual math needed.

---

## How to Update Data Mid-Season (Drive Sync)

1. Play your games in CFB 26
2. Take screenshots of: the standings screen, scoreboard/results, and player stat leaders
3. Upload those screenshots to the shared Google Drive folder
4. Go to your dynasty site → **Drive Sync** tab
5. Select what type of screenshot it is — Standings, Scores, or Player Stats
6. Click **Refresh** to see new files → click **Scan with AI** on each one
7. The database updates instantly — everyone sees the new data across all tabs

---

## How to Use the Stream Watcher During Live Games

1. Go to `yoursite.vercel.app/stream-watcher`
2. Type the **Twitch channel name** of whoever is streaming (just the username, no URL)
3. Set your scan interval — 60 seconds is recommended for live games
4. Set the correct **Week #**
5. Click **▶ Start Watching**

The AI scans the stream automatically. Use the four tabs:
- **Live Game** — live scoreboard, last play, atmosphere, dynasty narrative quote
- **Moments** — color-coded feed of every big play (TDs, picks, upsets, championships)
- **Recruiting** — commitments, visits, offers, decommitments detected on screen
- **Dynasty Lore** — generate Breaking News, Game Chronicle, Recruiting War, or Season Chronicle from everything captured

Hit **Manual Scan** any time — especially useful at halftime, after the final whistle, or when a recruit commits on screen.

**Tips for best results:**
- Stream in 720p or 1080p — clearer picture means better AI reads
- Pause on important screens (scoreboard, stat overlay, recruiting board) for a few seconds
- Use Manual Scan for moments you don't want missed between auto-scans
- Dynasty Lore generates best after 5+ moments are captured

---

## How to Generate Media Articles

1. Go to the **Media Center** tab on the main hub
2. Choose your article type:
   - **Power Rankings** — analytical breakdown of top 5 teams
   - **Weekly Recap** — full game-by-game recap of the latest week
   - **Player Spotlight** — feature on the season's standout player
   - **Rivalry Breakdown** — preview of the most compelling upcoming matchup
3. Click **⚡ Generate Article**
4. Copy and paste to your league group chat, Discord, or social media

---

## Troubleshooting

**"No images found" in Drive Sync**
→ Make sure the service account client email from Step 2 has been given Viewer access to the Drive folder. Check that you shared with the right email (from the JSON file's `"client_email"` field).

**Screenshot parse errors / wrong data**
→ Make sure the screenshot is clear, not cropped, and is actually a CFB26 game screen (standings, scoreboard, or stat screen). Blurry or zoomed-out screenshots may not parse correctly.

**Vercel build fails**
→ Double-check all 9 environment variables are entered. The most common mistake is the Google JSON having line breaks — it must be pasted as one single line.

**Data not showing after scan**
→ Go to Supabase → Table Editor and check that rows actually exist in the tables. If the tables are empty, re-run the SQL schema files from Step 1.

**Stream Watcher says "not currently live"**
→ Double-check the Twitch channel name is spelled correctly (lowercase, no spaces). The channel must be actively streaming at the time of the scan.

**Commissioner PIN not working**
→ Make sure `COMMISSIONER_PIN` is set in Vercel's environment variables and that Vercel has redeployed since you added it (check the Deployments tab in Vercel).

**Changes not showing on the live site after a code update**
→ After pushing to GitHub via GitHub Desktop, Vercel auto-deploys in ~60 seconds. Check the Vercel dashboard to confirm the latest deployment completed successfully.

---

## Adding New Features Later (How Updates Work)

Whenever new files are added to your project:

1. Copy the new files into your local `dynasty-universe` folder
2. If there's a new SQL schema file, run it in Supabase SQL Editor first
3. If there are new environment variables, add them in Vercel → Settings → Environment Variables
4. Open GitHub Desktop → you'll see the new files listed → write a commit message → **Commit to main** → **Push origin**
5. Vercel auto-deploys in ~60 seconds

---

## Full Environment Variables Reference

All variables that need to be set in Vercel:

| Variable | Required For |
|---|---|
| `ANTHROPIC_API_KEY` | Everything — screenshot parsing, media articles, stream watching, lore generation |
| `NEXT_PUBLIC_SUPABASE_URL` | Reading data on the frontend |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Reading data on the frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | Writing data from API routes (parsing, stream events, coaches) |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Reading images from Google Drive |
| `GOOGLE_DRIVE_FOLDER_ID` | Knowing which Drive folder to read from |
| `TWITCH_CLIENT_ID` | Stream Watcher — authenticating with Twitch API |
| `TWITCH_CLIENT_SECRET` | Stream Watcher — authenticating with Twitch API |
| `COMMISSIONER_PIN` | Coaches — protecting edit/add/delete actions |
