
-- Revoke EXECUTE from anon/public on SECURITY DEFINER functions.
-- Keep authenticated access only for functions actually invoked from RLS policies or client RPCs.

REVOKE EXECUTE ON FUNCTION public.notify_profile_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin_or_moderator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_moderator(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.create_system_notification(uuid, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_system_notification(uuid, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_admin_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_analytics() TO authenticated;
