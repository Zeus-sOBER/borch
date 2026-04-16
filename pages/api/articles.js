import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {

  // GET — fetch all articles, optionally filtered by type
  if (req.method === 'GET') {
    const { article_type, limit = 50 } = req.query;

    let query = supabase
      .from('articles')
      .select('id, article_type, week, title, content, edited_by, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(parseInt(limit));

    if (article_type && article_type !== 'all') {
      query = query.eq('article_type', article_type);
    }

    const { data, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ articles: data || [] });
  }

  // POST — save (create) a new article or update existing by id
  if (req.method === 'POST') {
    const { id, article_type, week, title, content, pin } = req.body;

    // PIN required to save/publish
    if (!pin || pin !== process.env.COMMISSIONER_PIN) {
      return res.status(401).json({ error: 'Commissioner PIN required.' });
    }

    if (!article_type || !content) {
      return res.status(400).json({ error: 'article_type and content are required.' });
    }

    // If an id is provided, update that specific article
    if (id) {
      const { data, error } = await supabase
        .from('articles')
        .update({
          article_type,
          week: week || null,
          title: title || null,
          content,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ article: data });
    }

    // Otherwise insert a new article
    const { data, error } = await supabase
      .from('articles')
      .insert({
        article_type,
        week: week || null,
        title: title || null,
        content,
        edited_by: 'commissioner'
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ article: data });
  }

  // DELETE — remove an article by id (commissioner only)
  if (req.method === 'DELETE') {
    const { id, pin } = req.body;

    if (!pin || pin !== process.env.COMMISSIONER_PIN) {
      return res.status(401).json({ error: 'Commissioner PIN required.' });
    }

    if (!id) return res.status(400).json({ error: 'Article id required.' });

    const { error } = await supabase.from('articles').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
