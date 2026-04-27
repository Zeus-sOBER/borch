# Dynasty Universe — Comprehensive Development Plan

**Document Date:** April 26, 2026  
**Audit Status:** Complete — Issues Identified & Prioritized  
**Project Status:** MVP Live, Data Integrity Issues Found, Ready for Phase 2

---

## Executive Summary

Dynasty Universe is a live AI-powered dynasty league hub built with Next.js, Supabase, and Claude AI. The app is **fully functional** and deployed on Vercel. However, an audit has uncovered **data inconsistency issues** where different UI components display conflicting information about team records and player data. The plan below prioritizes fixes and improvements to make the app production-ready and easier for other commissioners to deploy.

---

## Current Project Status

### What's Built & Working

1. **Core Dashboard** (6-tab interface)
   - Live standings with team records, coaches, and streaks
   - Score ticker with featured games
   - Recent articles and narrative feed
   - Dynamic league branding (colors, name, logos)
   - Week/season tracking

2. **Screenshot Sync System**
   - AI auto-detects screenshot type (standings, scores, stats, AP poll, Heisman, team stats, etc.)
   - Parses standings, scores, and stats from CFB 26 gameplay
   - Stores results in Supabase with full audit trail
   - Supports both Google Drive and direct upload

3. **AI Article Generation**
   - ESPN-style articles with full narrative awareness
   - Multiple types: Power Rankings, Weekly Recap, Player Spotlight, Rivalry Breakdown, Matchup Preview, League Preview, custom
   - References coaches by name and builds on previous storylines
   - Discord auto-posting

4. **Coach Profiles**
   - Full records (all-time and seasonal)
   - Bios, coaching style, achievements
   - Commissioner edit + coach self-edit via PIN token
   - Championship tracking

5. **Awards & Recognition**
   - Heisman Trophy Watch (top 5 with screenshots)
   - Championship history
   - AP Top 25 rankings with polling
   - Awards tab with visualizations

6. **Stream Watcher** (Twitch integration)
   - Real-time thumbnail analysis with Claude
   - Detects scores, plays, recruiting moments
   - Auto-generates dynasty lore
   - Discord notifications

7. **Timeline & History**
   - Visual narrative history of dynasty events
   - Color-coded by type, filterable, grouped by week
   - Event momentum tagging with narrative weight

8. **Setup Wizard**
   - Health checks for env vars and database
   - First-time commissioner onboarding
   - Quick team/coach creation

### Database Schema (15+ Tables)
- `teams` — Team records, standings
- `games` — Final scores by week
- `coaches` — Coach profiles, records, achievements
- `players` — Individual player stats
- `heisman_watch` — Top 5 candidates (IMAGE INCONSISTENCY)
- `ap_rankings` — Weekly AP poll (IMAGE INCONSISTENCY)
- `league_settings` — Global config, branding, featured content
- `articles` — Generated and edited pieces
- `narrative_log` — Dynasty event history with momentum
- `championships` — Championship records
- `team_stats` — Offensive/defensive stats by team
- `scan_log` — Screenshot parsing audit trail
- `stream_events` — Twitch stream analysis
- `big_moments` — Notable game moments
- `recruiting_events` — Recruiting activity

---

## Known Issues Found

### Critical: Data Inconsistency Issues

#### Issue #1: Profile Card Record Mismatch
**Symptom:** Coach profile cards show different records depending on which page you're viewing (e.g., 0-1 on profile, 1-1 on leaderboard)

**Root Cause:** Multiple sources of truth for coach/team records
- `coaches.overall_wins` and `coaches.overall_losses` — manually set or computed from screenshot parsing
- `teams.wins` and `teams.losses` — computed by `/api/recalculate-standings` from actual game results
- `coaches.season_records` — JSONB array of manual seasonal records

**Data Flow Issue:**
1. When a screenshot is uploaded, the `parse-screenshot.js` API extracts scores
2. It stores results in `games` table
3. **BUT** it doesn't automatically trigger `recalculate-standings.js`
4. Commissioner must manually call `/api/recalculate-standings` (POST with PIN)
5. Until then, `teams.wins/losses` are stale
6. Coach profiles pull from multiple sources: `coaches.overall_wins`, `coaches.season_records`, and `teams` — whichever exists
7. Result: Profile page shows coaches' stored values; leaderboard shows teams' computed values; awards show league_settings values

**Who Sees Inconsistency:**
- Commissioner reviewing data
- League members checking standings

#### Issue #2: Heisman Watch Database Schema Mismatch
**Symptom:** Heisman Watch form allows entering `trend` (up/down/same) and `class_year` fields, but database doesn't have these columns

**Root Cause:** Schema drift — API and frontend expect columns that don't exist
- `pages/api/heisman-watch.js` reads/writes `trend` and `class_year` (lines 45, 75, 76, 96, 106, 107)
- `pages/heisman-watch.js` form includes these fields (line 52)
- `database/dynasty-universe-complete.sql` doesn't create these columns
- Queries fail silently or drop the fields

**Missing Columns:**
```sql
ALTER TABLE heisman_watch ADD COLUMN IF NOT EXISTS trend TEXT DEFAULT 'same';
ALTER TABLE heisman_watch ADD COLUMN IF NOT EXISTS class_year TEXT;
```

**Who's Affected:**
- Anyone using Heisman Watch import from screenshots (Claude extracts `trend` and `class_year`, they're lost in DB)
- Manual add form shows these fields but they don't persist

#### Issue #3: AP Rankings Dual Source
**Symptom:** AP rankings displayed in Awards tab may be stale or from wrong source

**Root Cause:** Legacy migration to dedicated table
- Originally: `league_settings.ap_rankings` was a JSONB column
- Now: `ap_rankings` table is the authoritative source
- `/api/league-data.js` intelligently falls back to `league_settings.ap_rankings` if table is empty (lines 33-37)
- But if both exist, table takes precedence — can cause confusion about which is current
- Screenshot import might populate `league_settings` but not the table, or vice versa

**Consequence:** Commissioners might update AP poll one way, but different page shows old data

### High Priority: Deployment & Setup Friction

#### Issue #4: Missing Environment Variable Validation
**Status:** Partial (health check exists but incomplete)
- `/api/health.js` checks basic env vars
- Doesn't validate Google API keys or Twitch credentials until first use
- Commissioners don't know if optional services work until trying to use them

#### Issue #5: Database Setup Complexity
**Status:** OK but could be better
- Single complete SQL file is good (`dynasty-universe-complete.sql`)
- But no instructions in `/setup` wizard about running it
- New commissioners might skip SQL step and hit cryptic RLS or missing table errors

#### Issue #6: Commissioner PIN Hardcoding in ENV
**Status:** Works but fragile
- PIN required for sensitive operations (recalculate-standings, edit coaches, etc.)
- If leaked, all admin functions exposed
- No audit log of who made changes

### Medium Priority: Code & Architecture

#### Issue #7: Multiple Media Center Versions
- `pages/media-center.js` — newer redesign with PIN bar
- `pages/api/media-center.js` — actually a React page, not an API (confusing naming)
- `/index.js` Awards tab has inline media tab
- Unclear which is canonical; not all are linked consistently

#### Issue #8: Screenshot Type Detection Could Be Smarter
- Parse-screenshot uses AI to detect type (standings, scores, stats, AP poll, Heisman, team stats, recruiting, championship)
- Works, but could fail silently if image is unclear
- No user feedback on confidence level
- No way for user to override if AI guesses wrong

#### Issue #9: Narrative Engine Not Fully Leveraged
- `narrative_log` table and `/lib/narrative.js` exist with momentum tagging
- Only sparsely populated from parse-screenshot and stream watcher
- Articles don't fully tap into historical context (momentum, weight decay)
- Potential for richer AI without much more code

#### Issue #10: Coaches' Personal Edit Tokens Not Well Publicized
- Coaches can self-edit via `/api/coaches/[id]` with `edit_token` query param
- But no easy way for commissioner to generate/share token
- No "edit link" generator UI in dashboard

---

## Impact Assessment

| Issue | Severity | User Impact | Effort to Fix |
|-------|----------|-------------|---------------|
| #1: Record mismatch | HIGH | Confusion, trust issues | Medium |
| #2: Heisman schema | HIGH | Data loss on import | Low |
| #3: AP rankings dual source | MEDIUM | Stale data display | Low |
| #4: Env validation | MEDIUM | Cryptic errors on deploy | Low |
| #5: DB setup friction | MEDIUM | Commissioner confusion | Low |
| #6: PIN in ENV | MEDIUM | Security risk | Low |
| #7: Media center versions | LOW | Code confusion | Low |
| #8: Screenshot type detection | LOW | Occasional misparse | Medium |
| #9: Narrative engine underuse | LOW | Less rich articles | Medium |
| #10: Token UX | LOW | Extra friction for coaches | Low |

---

## Recommended Development Roadmap

### Phase 1: Data Integrity Fixes (Weeks 1-2)
**Goal:** Eliminate inconsistencies so all UI components show same data.

#### 1.1 Add Missing Heisman Columns
**Files:** `database/dynasty-universe-complete.sql`
```sql
ALTER TABLE heisman_watch ADD COLUMN IF NOT EXISTS trend TEXT DEFAULT 'same';
ALTER TABLE heisman_watch ADD COLUMN IF NOT EXISTS class_year TEXT;
```
**Effort:** 5 min  
**Testing:** Run Heisman import, verify trend/class_year save  

#### 1.2 Unify Coach Record Sources
**Problem:** Coach profiles show different records depending on where data comes from  
**Solution:**
1. Make `teams.wins/losses` the authoritative season record
2. Auto-populate `coaches.season_records` JSONB when team record changes
3. Coach profile page: prefer `teams` data, fall back to `coaches.season_records`
4. Update coach profile page (coaches.js) to fetch team data and use it as primary source

**Files to Change:**
- `pages/coaches.js` (line 123-138) — CoachCard component already has logic, just ensure it uses team data first
- `pages/api/recalculate-standings.js` — after updating team, also update coach's `season_records` JSONB
- Consider: Add endpoint `/api/sync-coach-records` that commissioner can call to fix any mismatches

**Effort:** Medium (1-2 hours)  
**Testing:** Edit team record, verify coach card reflects it; check season_records JSONB is updated  

#### 1.3 Consolidate AP Rankings Sources
**Problem:** `ap_rankings` table and `league_settings.ap_rankings` JSONB can diverge  
**Solution:**
1. Make `ap_rankings` table the only authoritative source
2. `/api/league-data.js` always reads from table (no fallback to JSONB)
3. `/api/league-settings.js` PATCH handler: when `ap_rankings` is sent, redirect writes to table instead of JSONB
4. Provide migration endpoint `/api/migrate-ap-rankings` to move any old JSONB data into table

**Files to Change:**
- `pages/api/league-data.js` (lines 33-37) — remove fallback, raise error if JSONB is stale
- `pages/api/league-settings.js` (line 43) — intercept ap_rankings updates, insert into table instead
- New file: `pages/api/migrate-ap-rankings.js` — one-time migration tool

**Effort:** Low (1 hour)  
**Testing:** Update AP poll via screenshot, verify only table is updated; call migration, verify JSONB data moved  

#### 1.4 Auto-Trigger Recalculate on Screenshot Parse
**Problem:** Commissioner must manually call recalculate-standings after uploading game scores  
**Solution:** After successful game parse, auto-call recalculate-standings with context
- If parse was a standings screenshot and identified games, immediately trigger recalculate
- Log the auto-trigger in scan_log audit trail
- Handle errors gracefully (don't fail screenshot import if recalc fails)

**Files to Change:**
- `pages/api/parse-screenshot.js` (add final step after game insert)

**Effort:** Low (30 min)  
**Testing:** Upload standings screenshot, verify teams table is updated automatically  

### Phase 2: Deployment & Setup (Weeks 3-4)
**Goal:** Make it easy for other commissioners to deploy without errors.

#### 2.1 Enhanced Health Check
**Current:** `/api/health.js` checks basic vars and DB connection  
**Improvements:**
1. Validate Google service account JSON (if present) can authenticate
2. Validate Twitch credentials (if present) work
3. Validate Discord webhook URL (if present) is reachable
4. Return per-service health status, not just pass/fail
5. Add `/setup` page section showing health status with fixes

**Files to Change:**
- `pages/api/health.js`
- `pages/setup.js` — add health results display with troubleshooting

**Effort:** Medium (2 hours)  
**Testing:** Test with missing/bad env vars, verify helpful error messages  

#### 2.2 Interactive SQL Setup in `/setup` Wizard
**Current:** Tells user to copy-paste SQL into Supabase  
**Improvement:** Optional
1. Add optional "Auto-Run SQL" button in /setup wizard (requires Supabase anon key with admin rights — risky)
2. OR: Show SQL with copy button + clear instructions + link to Supabase SQL Editor
3. After commissioner confirms SQL ran, /setup auto-checks tables exist

**Files to Change:**
- `pages/setup.js` — add SQL runner step with clear copy/paste flow

**Effort:** Medium (2-3 hours)  
**Testing:** New Supabase project, run setup, verify tables created  

#### 2.3 PIN-Less Commissioner Setup
**Current:** Pin required for all admin actions; hardcoded in env var  
**Issue:** Sharing PIN in multi-commissioner leagues is risky  
**Improvement (Optional for Phase 2):**
1. Add `commissioners` table with email/oauth identity
2. Allow multiple commissioners, each with their own actions logged
3. For now (Phase 1): Keep PIN, just add warning in docs
4. For Phase 2+: Implement proper multi-admin

**Files to Change:** None for now (mark as Phase 3)

**Effort:** High (defer to Phase 3)  

#### 2.4 Documentation Updates
- [ ] Update README with troubleshooting guide
- [ ] Add "Deploying to Your League" guide (step-by-step for new commissioner)
- [ ] Explain manual operations (recalculate-standings, migrate-ap-rankings, etc.)
- [ ] List all environment variables with examples

**Effort:** Low (1 hour)  

### Phase 3: UX & Feature Polish (Weeks 5-6)
**Goal:** Make app delightful for commissioners and league members.

#### 3.1 Commissioner Dashboard
**New Page:** `/dashboard` (commissioner-only, PIN protected)
- Quick-access buttons for manual operations (recalculate standings, migrate AP rankings, sync coach records)
- Data health checks (latest game parsed, standings last recalculated, etc.)
- Edit league settings (name, colors, week/season)
- View recent actions (audit log)

**Files to Change:**
- New: `pages/dashboard.js`
- Update: `pages/index.js` nav to link to dashboard

**Effort:** Medium (3 hours)  

#### 3.2 Screenshot Type Override
**Current:** AI auto-detects screenshot type  
**Improvement:** After AI detection, show preview with dropdown to override type if wrong
- Let user select "This is actually a standings screenshot" if AI guessed wrong
- Improves robustness of parse

**Files to Change:**
- `pages/api/upload-screenshot.js` — return AI-detected type in response
- `pages/index.js` (Sync tab) — after upload, show type selector before confirming parse

**Effort:** Low (1-2 hours)  

#### 3.3 Coach Token Management UI
**Current:** Commissioner must manually call API to generate/regenerate coach edit tokens  
**Improvement:**
1. Add edit link generator in commissioner dashboard (Phase 3.1)
2. Show clickable link: `yoursite.com/api/coaches/[coachId]?token=xyz`
3. Commissioner can copy and send to coach

**Files to Change:**
- `pages/dashboard.js` (Phase 3.1)
- Possibly: `pages/api/coaches.js` — add GET endpoint to retrieve existing token (safe operation)

**Effort:** Low (1 hour)  

#### 3.4 Narrative Engine Expansion
**Current:** Narrative log is populated but underused in article generation  
**Improvement:**
1. Expand parse-screenshot to log more events (big plays, coaching changes, injuries)
2. Improve narrative weight decay (decay-old-events cron already exists, just improve algorithm)
3. Update generate-article.js to pull more context from narrative_log
4. Add "Narrative Insights" panel to dashboard showing momentum trends

**Files to Change:**
- `pages/api/parse-screenshot.js` — add more event logging
- `lib/narrative.js` — improve momentum calculation
- `pages/api/generate-article.js` — pull richer context
- `pages/dashboard.js` — add narrative insights widget

**Effort:** Medium (3-4 hours)  

#### 3.5 Consolidate Media Center
**Current:** Two versions (pages/media-center.js and pages/api/media-center.js which is actually a page)  
**Improvement:**
1. Merge both versions into one canonical `pages/media-center.js`
2. Keep best UX from both
3. Remove /api/media-center.js (it's not an API)
4. Update index.js Awards tab to link to /media-center

**Effort:** Low (1 hour)  

### Phase 4: Advanced Features (Weeks 7+)
**Goal:** Unlock rich features that leverage AI and data.

#### 4.1 Multi-Commissioner Support
- Implement commissioners table with identities
- Add action audit log with user attribution
- Separate admin permissions (some commissioners can edit coaches, others can edit settings, etc.)

**Effort:** High (5+ hours)

#### 4.2 Player Stats Deep Dive
- Expand player tracking (not just names, but full stat lines from uploads)
- Player Spotlight articles with historical comparison
- Award voting UI (Heisman, All-American, etc. with polling)

**Effort:** High (5+ hours)

#### 4.3 Recruiting Tracking
- Dedicated recruiting board showing commits, decommits, portal activity
- Parse recruiting screens automatically
- Generate recruiting class rankings

**Effort:** High (5+ hours)

#### 4.4 Advanced Analytics
- Head-to-head records visualization
- Strength of schedule calculator
- Power ranking suggestions based on data
- Draft prospect grades

**Effort:** Medium-High (4+ hours)

---

## Technical Debt & Architecture Concerns

### Acceptable Technical Debt (keep as-is for now)
1. **No formal auth system** — PIN is good enough for small private leagues
2. **Supabase RLS is basic** — only public read, service role for writes (fine for league hub)
3. **No rate limiting on APIs** — low traffic, not a concern yet
4. **No request validation** — relies on AI/Claude to be smart (works surprisingly well)

### Should Refactor (Phase 2-3)
1. **Parse-screenshot.js is 1000+ lines** — split into separate modules for each screenshot type
2. **Index.js is ~4000 lines** — extract tab components into separate files
3. **API routes have duplicate DB logic** — create a `lib/queries.js` for common operations
4. **No TypeScript** — consider adding for new files (coaches.js, dashboard.js) to catch bugs

### Watch For (Phase 1)
1. **Narrative log bloat** — if decay-old-events cron fails, log grows unbounded
2. **Drive API rate limits** — if league uploads many screenshots, might hit Google Drive API limits (slow down)
3. **Claude API costs** — article generation + stream watcher + Heisman parse can add up (monitor spending)

---

## Testing & Validation Plan

### Phase 1 Testing (Critical Path)
1. **Data Consistency:**
   - [ ] Upload standings screenshot
   - [ ] Verify games table populated
   - [ ] Run recalculate-standings
   - [ ] Confirm teams table updated
   - [ ] Confirm coaches profile shows new record
   - [ ] Confirm leaderboard shows same record
   
2. **Heisman Watch:**
   - [ ] Manually add candidate with trend + class_year
   - [ ] Verify both fields in database
   - [ ] Upload Heisman screenshot
   - [ ] Verify trend + class_year from AI extraction saved correctly

3. **AP Rankings:**
   - [ ] Upload AP poll screenshot
   - [ ] Verify data in ap_rankings table (not JSONB)
   - [ ] Call migrate endpoint if needed
   - [ ] Verify Awards page shows correct rankings

### Phase 2 Testing
1. **Fresh Deploy:**
   - [ ] New Supabase project
   - [ ] Copy env vars
   - [ ] Run setup wizard
   - [ ] Verify all checks pass
   - [ ] Verify SQL runs without errors

2. **Health Check:**
   - [ ] Simulate missing Google key, verify helpful error
   - [ ] Simulate bad Twitch secret, verify helpful error
   - [ ] Verify Discord webhook check works

---

## Rollout & Deployment Schedule

### Timeline
- **Week 1:** Phase 1.1-1.4 (data fixes) — test thoroughly, release as hotfix
- **Week 2:** Phase 1 final validation
- **Week 3-4:** Phase 2 (setup improvements)
- **Week 5-6:** Phase 3 (UX polish)
- **Week 7+:** Phase 4 (advanced features, as capacity allows)

### Release Strategy
1. **Hotfix for Phase 1:** Push to main branch when ready (low risk, high impact)
2. **Feature branch for Phase 2-4:** Work on `develop` branch, PR review, merge to main weekly

### Backward Compatibility
- Phase 1 fixes are backward compatible (just add missing columns, clean up data sources)
- Phase 2 doesn't change existing APIs
- Phase 3 adds new pages but doesn't break old ones
- Phase 4 is mostly new features

---

## Recommendations for Other Commissioners

### How to Deploy This App (For New Commissioner)

1. **Prerequisites**
   - Vercel account (free)
   - Supabase account (free)
   - GitHub account (free)

2. **Step-by-Step**
   - Fork/clone this repo
   - Create new Supabase project
   - Copy `/database/dynasty-universe-complete.sql` into Supabase SQL Editor and run
   - Create `.env.local` file with 5 required vars:
     ```
     ANTHROPIC_API_KEY=your-key
     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
     COMMISSIONER_PIN=1234
     ```
   - Push to GitHub
   - Link GitHub repo to Vercel
   - Set env vars in Vercel dashboard
   - Visit `yourdynasty.vercel.app/setup` to finish setup

3. **What Each Optional Var Does**
   - `GOOGLE_SERVICE_ACCOUNT_JSON`: Auto-parse screenshots from Google Drive
   - `GOOGLE_DRIVE_FOLDER_ID`: Which Drive folder to monitor
   - `TWITCH_CLIENT_ID` + `TWITCH_CLIENT_SECRET`: Real-time stream analysis
   - `DYNASTY_SHEET_ID` + `SHEET_SYNC_SECRET`: Google Sheets auto-sync
   - `DISCORD_WEBHOOK_URL`: Post articles to Discord

4. **First Week Workflow**
   - Create coaches for each team (via `/setup`)
   - Play a few games in CFB 26 and take screenshots
   - Upload screenshots to test parsing
   - Run recalculate-standings to populate team records
   - Write a custom article to test AI

5. **Ongoing Operations** (weekly)
   - Upload game results from weekly league play
   - Optionally stream and use Stream Watcher for live lore
   - Generate weekly articles
   - Check Heisman Watch for top candidates
   - Update AP poll if running one

---

## Success Metrics & Goals

### By End of Phase 1
- ✓ No data inconsistencies (all UIs show same numbers)
- ✓ All database schema issues fixed
- ✓ Screenshot import auto-recalculates standings
- ✓ Heisman/AP data integrity verified

### By End of Phase 2
- ✓ New commissioner can deploy in <30 min without troubleshooting
- ✓ Setup wizard catches and explains all configuration issues
- ✓ All optional services have proper validation

### By End of Phase 3
- ✓ Commissioner has single dashboard for manual operations
- ✓ Data health visible at a glance
- ✓ UX friction reduced (token sharing, type override, etc.)

### By End of Phase 4
- ✓ Multi-commissioner leagues supported
- ✓ Rich recruiting tracking
- ✓ Advanced analytics available

---

## Files Modified Summary

### Phase 1
- `database/dynasty-universe-complete.sql` — add Heisman columns
- `pages/api/recalculate-standings.js` — sync coach season_records
- `pages/api/parse-screenshot.js` — auto-trigger recalculate
- `pages/api/league-settings.js` — redirect AP rankings to table
- `pages/api/league-data.js` — remove AP fallback
- New: `pages/api/migrate-ap-rankings.js`
- `pages/coaches.js` — ensure using team data first

### Phase 2
- `pages/api/health.js` — enhanced validation
- `pages/setup.js` — show health status + SQL instructions
- `README.md` — deployment guide

### Phase 3
- New: `pages/dashboard.js`
- `pages/index.js` — link to dashboard, update nav
- `pages/api/upload-screenshot.js` — return type in response
- Consolidate: `pages/media-center.js` (merge both versions)

### Phase 4
- Various new features (multi-commissioner, recruiting, analytics)

---

## Appendix: Environment Variables Quick Reference

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| ANTHROPIC_API_KEY | ✓ | Claude API | sk-ant-... |
| NEXT_PUBLIC_SUPABASE_URL | ✓ | Database URL | https://abc.supabase.co |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✓ | Public DB key | eyJ... |
| SUPABASE_SERVICE_ROLE_KEY | ✓ | Admin DB key | eyJ... |
| COMMISSIONER_PIN | ✓ | Admin PIN | 1234 |
| GOOGLE_SERVICE_ACCOUNT_JSON | Optional | Google Drive auth | {json} |
| GOOGLE_DRIVE_FOLDER_ID | Optional | Drive folder ID | 1abc... |
| TWITCH_CLIENT_ID | Optional | Twitch app | abc... |
| TWITCH_CLIENT_SECRET | Optional | Twitch secret | xyz... |
| DYNASTY_SHEET_ID | Optional | Google Sheet ID | 1abc... |
| SHEET_SYNC_SECRET | Optional | Webhook secret | xyz... |
| DISCORD_WEBHOOK_URL | Optional | Discord webhook | https://discordapp... |

---

## Appendix: Common Operations for Commissioners

### Recalculate Standings
**When:** After uploading game results  
**How:** POST to `/api/recalculate-standings` with PIN in body  
**Effect:** Recomputes all team W/L from games table, updates team_stats with PPG/DPPG  

### Generate Article
**When:** Weekly recap or special occasion  
**How:** Use Articles section in Awards tab  
**Options:** Power rankings, weekly recap, player spotlight, rivalry, matchup preview, custom  
**Effect:** Posts to Discord if webhook configured  

### Import Heisman Candidates
**When:** New watch release from game  
**How:** Go to `/heisman-watch`, click Import, paste Google Drive file ID  
**Effect:** Claude extracts candidates, replaces all candidates for current season  

### Update AP Poll
**When:** New poll released  
**How:** Upload AP poll screenshot (from game or manual), or manual entry in Awards  
**Effect:** Saves to ap_rankings table, displays in Awards/Rankings  

### Create Coach Edit Link
**When:** Coach wants to self-edit profile  
**How:** (Phase 3.1) Use commissioner dashboard to generate token  
**Current:** Manual API call to `/api/coaches` with PIN  

### Migrate Old AP Data
**When:** Switching from JSONB to table (Phase 1.3)  
**How:** POST to `/api/migrate-ap-rankings` with PIN  
**Effect:** Moves any old league_settings.ap_rankings data into table  

---

## Questions & Contact

For questions about this plan or the audit, contact the development team. This plan is a living document and will be updated as phases complete and new requirements emerge.

**Last Updated:** April 26, 2026  
**Next Review Date:** May 10, 2026 (end of Phase 1)
