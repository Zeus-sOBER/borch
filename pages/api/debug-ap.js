// This debug endpoint has been removed.
// AP rankings are now read via supabaseAdmin() in league-data.js, bypassing RLS.
// If you need to debug AP data, check the ap_rankings table directly in Supabase dashboard.
export default function handler(req, res) {
  res.status(410).json({ message: 'Debug endpoint removed. AP rankings now use admin client in league-data.js.' })
}
