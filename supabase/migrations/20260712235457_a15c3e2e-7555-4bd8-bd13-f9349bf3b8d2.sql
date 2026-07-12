CREATE OR REPLACE FUNCTION public.create_system_notification(_user_id uuid, _type text, _title text, _body text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL
     OR (auth.uid() <> _user_id AND NOT public.is_admin_or_moderator(auth.uid()))
  THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  INSERT INTO public.user_notifications (user_id, type, title, body)
  VALUES (_user_id, _type, _title, _body);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.create_system_notification(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_profile_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;