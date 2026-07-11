ALTER TABLE public.job_locks ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

GRANT SELECT ON public.job_locks TO authenticated;

-- Allow authenticated users to see only the relevance cleanup lock status for the admin UI.
CREATE POLICY "Authenticated users can read relevance cleanup lock status"
ON public.job_locks
FOR SELECT
TO authenticated
USING (name = 'relevance_cleanup');