import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const season = req.query.season || 1
  const limit  = parseInt(req.query.limit || '50')

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  const [momentsRes, recruitingRes, eventsRes] = await Promise.all([
    db.from('big_moments').select('*').eq('season', season).order('created_at', { ascending: false }).limit(limit),
    db.from('recruiting_events').select('*').eq('season', season).order('created_at', { ascending: false }).limit(limit),
    db.from('stream_events').select('*').eq('season', season).order('created_at', { ascending: false }).limit(20),
  ])

  res.status(200).json({
    bigMoments:       momentsRes.data    || [],
    recruitingEvents: recruitingRes.data || [],
    streamEvents:     eventsRes.data     || [],
  })
}
