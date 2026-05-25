/**
 * /api/bulk-update-scores
 *
 * Saves an array of game rows (scores, status, notes) in one shot.
 * Called by the /scores score-entry sheet.
 *
 * POST body:
 *   {
 *     pin: string,
 *     games: [
 *       {
 *         id:          number,          // games.id — required for updates
 *         home_score:  number | null,
 *         away_score:  number | null,
 *         is_final:    boolean,
 *         notes:       string | null,
 *       },
 *       ...
 *     ]
 *   }
 *
 * Returns:
 *   { saved: number, errors: [{id, message}] }
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { pin, games } = req.body || {}

  if (!pin || pin !== process.env.COMMISSIONER_PIN) {
    return res.status(401).json({ error: 'Invalid PIN' })
  }
  if (!Array.isArray(games) || games.length === 0) {
    return res.status(400).json({ error: 'No games provided' })
  }

  let saved = 0
  const errors = []

  for (const g of games) {
    if (!g.id) {
      errors.push({ id: g.id, message: 'Missing game id' })
      continue
    }

    const isFinal = !!g.is_final
    const patch = {
      is_final:   isFinal,
      status:     isFinal ? 'Final' : 'Scheduled',
      home_score: isFinal ? (g.home_score ?? null) : null,
      away_score: isFinal ? (g.away_score ?? null) : null,
      notes:      g.notes?.trim() || null,
    }

    const { error } = await supabase.from('games').update(patch).eq('id', g.id)

    if (error) {
      console.error('[bulk-update-scores] error on game', g.id, error.message)
      errors.push({ id: g.id, message: error.message })
    } else {
      saved++
    }
  }

  return res.status(200).json({ saved, errors })
}
