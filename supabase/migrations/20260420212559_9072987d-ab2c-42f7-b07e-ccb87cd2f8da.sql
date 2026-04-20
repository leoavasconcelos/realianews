DROP POLICY IF EXISTS "Public can view instagram post assets" ON storage.objects;

UPDATE storage.buckets
SET public = false
WHERE id = 'instagram-posts';