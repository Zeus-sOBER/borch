/**
 * Dynasty Universe — Auto-Sync Trigger
 * ─────────────────────────────────────
 * Install this script in your Dynasty Schedule spreadsheet so that
 * Dynasty Universe automatically re-parses the sheet whenever you save changes.
 *
 * HOW TO INSTALL:
 *  1. Open your Dynasty Schedule Google Sheet
 *  2. Click Extensions → Apps Script
 *  3. Delete any existing code and paste this entire file
 *  4. Fill in APP_URL and SYNC_SECRET below
 *  5. Click Save (💾), then run setupTrigger() once:
 *       - Click the "Select function" dropdown → choose "setupTrigger"
 *       - Click ▶ Run
 *       - Accept the permission prompt (Google will ask once)
 *  6. Done! Every time you edit and save the sheet, Dynasty Universe syncs.
 *
 * To verify it's working:
 *  - Make any edit, wait ~5 seconds, check the Sync tab in Dynasty Universe.
 *
 * To remove the trigger later:
 *  - Extensions → Apps Script → Triggers (clock icon on left) → delete it
 */

// ── CONFIGURE THESE TWO VALUES ────────────────────────────────────────────────

// The full URL of your Dynasty Universe app (no trailing slash)
var APP_URL = 'https://YOUR-APP-URL.vercel.app'

// Must match SHEET_SYNC_SECRET in your Vercel / .env.local
var SYNC_SECRET = 'YOUR_SECRET_HERE'

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run this function ONCE to register the installable onChange trigger.
 * (Simple onEdit triggers cannot make external HTTP calls — this one can.)
 */
function setupTrigger() {
  // Remove any existing triggers for this script to avoid duplicates
  var triggers = ScriptApp.getProjectTriggers()
  triggers.forEach(function(t) {
    if (t.getHandlerFunction() === 'onSheetChange') {
      ScriptApp.deleteTrigger(t)
    }
  })

  // Create a new onChange trigger on the active spreadsheet
  ScriptApp.newTrigger('onSheetChange')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onChange()
    .create()

  Logger.log('✅ Trigger installed. Dynasty Universe will sync on every change.')
}

// How long to wait (in seconds) after the last edit before syncing.
// Example: 30 = if you make 10 edits within 30 s, only ONE sync fires.
var DEBOUNCE_SECONDS = 30

/**
 * Fired on every committed cell change (pressing Enter/Tab — NOT every keystroke).
 * Records the current timestamp and schedules a delayed sync via a time-based
 * trigger. If another edit arrives before the delay expires, the clock resets
 * so we only call the AI once after you stop making changes.
 */
function onSheetChange(e) {
  var props = PropertiesService.getScriptProperties()

  // Stamp the time of this latest edit
  props.setProperty('lastEditAt', Date.now().toString())

  // Delete any previously scheduled sync trigger so we don't double-fire
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'debouncedSync') {
      ScriptApp.deleteTrigger(t)
    }
  })

  // Schedule a new sync DEBOUNCE_SECONDS from now
  ScriptApp.newTrigger('debouncedSync')
    .timeBased()
    .after(DEBOUNCE_SECONDS * 1000)
    .create()
}

/**
 * Runs DEBOUNCE_SECONDS after the last edit. Calls Dynasty Universe once.
 * Cleans itself up so no orphaned triggers accumulate.
 */
function debouncedSync() {
  // Remove this one-shot trigger immediately
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'debouncedSync') {
      ScriptApp.deleteTrigger(t)
    }
  })

  var spreadsheetId = SpreadsheetApp.getActive().getId()

  // Find the schedule tab's gid
  var sheets = SpreadsheetApp.getActive().getSheets()
  var scheduleSheet = null
  var scheduleNames = ['schedule', 'dynasty schedule', 'games', 'matchups']
  sheets.forEach(function(s) {
    if (scheduleNames.indexOf(s.getName().toLowerCase()) !== -1) {
      scheduleSheet = s
    }
  })
  if (!scheduleSheet) scheduleSheet = SpreadsheetApp.getActive().getActiveSheet()

  var gid = scheduleSheet.getSheetId()

  var payload = JSON.stringify({
    secret:        SYNC_SECRET,
    spreadsheetId: spreadsheetId,
    gid:           gid,
  })

  var options = {
    method:             'POST',
    contentType:        'application/json',
    payload:            payload,
    muteHttpExceptions: true,
  }

  try {
    var response = UrlFetchApp.fetch(APP_URL + '/api/sync-sheet', options)
    var code     = response.getResponseCode()
    var body     = response.getContentText()
    if (code === 200) {
      Logger.log('✅ Sync successful: ' + body)
    } else {
      Logger.log('⚠️ Sync returned ' + code + ': ' + body)
    }
  } catch (err) {
    Logger.log('❌ Sync error: ' + err.toString())
  }
}

/**
 * Optional: run this manually to force an immediate sync without editing the sheet.
 */
function forcSync() {
  onSheetChange(null)
  Logger.log('Force sync triggered.')
}
