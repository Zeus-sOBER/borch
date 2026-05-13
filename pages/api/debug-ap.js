import { supabase, supabaseAdmin } from '../../lib/supabase'

export default async function handler(req, res) {
  // Test both clients against ap_rankings
  const admin = supabaseAdmin()

  const [anonRes, adminRes, settingsRes] = await Promise.all([
    supabase.from('ap_rankings').select('*').order('rank', { ascending: true }),
    admin.from('ap_rankings').select('*').order('rank', { ascending: true }),
    supabase.from('league_settings').select('current_season, ap_rankings').eq('id', 1).single(),
  ])

  res.status(200).json({
    env_check: {
      has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      has_service_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      service_role_key_length: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length,
    },
    anon_client: {
      row_count: (anonRes.data || []).length,
      error: anonRes.error || null,
    },
    admin_client: {
      row_count: (adminRes.data || []).length,
      error: adminRes.error || null,
      first_3: (adminRes.data || []).slice(0, 3),
    },
    current_season: settingsRes.data?.current_season,
    jsonb_count: Array.isArray(settingsRes.data?.ap_rankings) ? settingsRes.data.ap_rankings.length : 0,
  })
}
