-- 1) Block users from inserting/updating/deleting their own roles (privilege escalation fix)
-- Existing "Admins can manage all roles" policy already covers admin operations.
-- Add restrictive policies that explicitly deny non-admin write access on user_roles.

CREATE POLICY "Only admins can insert roles (restrictive)"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles (restrictive)"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles (restrictive)"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2) Avatars bucket: prevent listing/enumeration by scoping SELECT to the user's own folder.
-- Public bucket URLs continue to work because public buckets serve files via CDN
-- without checking the storage.objects SELECT policy. The SELECT policy only controls
-- listing/enumeration through the storage API.
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

CREATE POLICY "Users can list their own avatar files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);