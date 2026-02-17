
-- Function to insert a notification as system (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_system_notification(
  _user_id UUID,
  _type TEXT,
  _title TEXT,
  _body TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_notifications (user_id, type, title, body)
  VALUES (_user_id, _type, _title, _body);
END;
$$;
