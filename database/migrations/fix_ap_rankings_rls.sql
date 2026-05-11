-- Fix AP Rankings RLS: ensure public read access is enabled
-- The table has RLS enabled but the read policy may be missing,
-- causing the API to return 0 rows even though data exists.

-- Enable RLS (safe to re-run)
ALTER TABLE ap_rankings ENABLE ROW LEVEL SECURITY;

-- Drop and recreate the read policy to make sure it exists
DROP POLICY IF EXISTS "Public read ap_rankings" ON ap_rankings;
CREATE POLICY "Public read ap_rankings" ON ap_rankings FOR SELECT USING (true);

-- Also allow service role to insert/update/delete
DROP POLICY IF EXISTS "Service write ap_rankings" ON ap_rankings;
CREATE POLICY "Service write ap_rankings" ON ap_rankings FOR ALL USING (true) WITH CHECK (true);
