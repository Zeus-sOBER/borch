# Borch Project Cleanup Log

**Date:** April 20, 2026  
**Scope:** Safe file reorganization and deprecated code removal

## Changes Made

### Files Moved
- **supabase-schema-heisman.sql**
  - From: `/borch/supabase-schema-heisman.sql` (root)
  - To: `/borch/database/supabase-schema-heisman.sql`
  - Reason: Database schema files should live in the `database/` folder for organization

### Files Deleted
- **pages/api/generate-article-v2.js**
  - Reason: Deprecated endpoint. File header explicitly states: "All functionality has been merged into generate-article.js"
  - No references to this endpoint found in codebase
  - All article generation now uses `/api/generate-article`

### Files NOT Deleted (Active Usage Confirmed)
- **pages/heisman-watch.js**: Standalone page with full Heisman Trophy management UI
  - Linked from: `pages/index.js` (line 869)
  - Also integrated in: Awards tab of main dashboard
  - Provides "Full View" functionality that's not replicated in index.js
  
- **pages/media-center.js**: Standalone Media Center page (v2 redesign)
  - Alternative/newer version of media center interface
  - Has inline PIN bar and redesigned layout
  - Not currently linked but represents active development work

- **pages/api/media-center.js**: This file is actually a React page component, not an API endpoint
  - It's the original media center page (v1)
  - Kept for reference but consider consolidating with newer v2 version in pages/media-center.js

### Directories Created
- **database/archive/**: Empty folder created for future archival of superseded migrations
  - Current migration files (v2) are all active and retained

## Migration Notes
- All `supabase-migration-*-v2.sql` files represent current schema versions (no v1 counterparts found in database folder)
- No Python scripts (dynasty_processor.py) or Google Sheets scripts (dynasty_schedule_script.gs) found in root
- Database folder is now the single source of truth for all SQL schemas and migrations

## Production Safety Notes
- No breaking changes made to active pages or APIs
- All removed code was explicitly deprecated
- Main functionality (Awards/Heisman, Media Center) remains intact and accessible
- Original files backed up in git history if recovery needed
