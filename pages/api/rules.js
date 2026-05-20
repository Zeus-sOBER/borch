import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const COMM_PIN = process.env.COMMISSIONER_PIN || 'dynasty2024'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('league_rules')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ rules: data || [] })
  }

  // Write operations require commissioner PIN
  const { pin } = req.body || {}
  if (pin !== COMM_PIN) return res.status(403).json({ error: 'Invalid PIN' })

  if (req.method === 'POST') {
    const { rule, established, notes, category, sort_order } = req.body
    if (!rule?.trim()) return res.status(400).json({ error: 'Rule text required' })
    const { data, error } = await supabase
      .from('league_rules')
      .insert({ rule: rule.trim(), established, notes, category, sort_order: sort_order ?? 0 })
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ rule: data })
  }

  if (req.method === 'PATCH') {
    const { id, rule, established, notes, category, sort_order } = req.body
    if (!id) return res.status(400).json({ error: 'ID required' })
    const { data, error } = await supabase
      .from('league_rules')
      .update({ rule, established, notes, category, sort_order })
      .eq('id', id)
      .select()
      .single()
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ rule: data })
  }

  if (req.method === 'DELETE') {
    const { id } = req.body
    if (!id) return res.status(400).json({ error: 'ID required' })
    const { error } = await supabase.from('league_rules').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
