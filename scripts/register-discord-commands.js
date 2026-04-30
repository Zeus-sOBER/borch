/**
 * scripts/register-discord-commands.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Run this ONCE to register slash commands with Discord.
 * After running, the commands will appear when users type "/" in your server.
 *
 * Usage:
 *   DISCORD_APP_ID=your_app_id DISCORD_BOT_TOKEN=your_token node scripts/register-discord-commands.js
 *
 * Or set these in your .env.local file and run:
 *   node -e "require('dotenv').config({path:'.env.local'})" -e "require('./scripts/register-discord-commands.js')"
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DISCORD_APP_ID = process.env.DISCORD_APP_ID
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

if (!DISCORD_APP_ID || !DISCORD_BOT_TOKEN) {
  console.error('❌ Missing DISCORD_APP_ID or DISCORD_BOT_TOKEN environment variables.')
  console.error('   Set them before running this script.')
  process.exit(1)
}

// ── Slash Command Definitions ────────────────────────────────────────────────
// Discord option types: 3 = STRING, 4 = INTEGER, 5 = BOOLEAN
const commands = [
  {
    name: 'standings',
    description: 'Show current league standings with records and streaks',
  },
  {
    name: 'scores',
    description: 'Show scores for a specific week',
    options: [{
      name: 'week',
      description: 'Week number (defaults to current week)',
      type: 4, // INTEGER
      required: false,
    }],
  },
  {
    name: 'rankings',
    description: 'Show the AP Top 25 rankings',
  },
  {
    name: 'heisman',
    description: 'Show the Heisman Trophy Watch top candidates',
  },
  {
    name: 'record',
    description: 'Look up a specific team\'s record and stats',
    options: [{
      name: 'team',
      description: 'Team name (e.g., Alabama, Ohio State)',
      type: 3, // STRING
      required: true,
    }],
  },
  {
    name: 'predict',
    description: 'Show upcoming matchups for predictions and voting',
    options: [{
      name: 'week',
      description: 'Week number (defaults to current week)',
      type: 4, // INTEGER
      required: false,
    }],
  },
  {
    name: 'hottake',
    description: 'Get an AI-generated hot take about the league',
  },
]

// ── Register Commands ────────────────────────────────────────────────────────
async function registerCommands() {
  const url = `https://discord.com/api/v10/applications/${DISCORD_APP_ID}/commands`

  console.log(`\n🤖 Registering ${commands.length} slash commands...\n`)

  for (const cmd of commands) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        },
        body: JSON.stringify(cmd),
      })

      const data = await res.json()

      if (res.ok) {
        console.log(`  ✅ /${cmd.name} — registered successfully`)
      } else {
        console.error(`  ❌ /${cmd.name} — failed:`, data)
      }
    } catch (err) {
      console.error(`  ❌ /${cmd.name} — error:`, err.message)
    }
  }

  console.log('\n🎉 Done! Commands may take up to 1 hour to appear globally.')
  console.log('   (For instant testing, register as guild commands instead)\n')
}

registerCommands()
