
-- Create notifications table
CREATE TABLE public.user_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- 'news_alert', 'account_login', 'password_changed', 'profile_updated'
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast user queries
CREATE INDEX idx_user_notifications_user_id ON public.user_notifications (user_id, created_at DESC);
CREATE INDEX idx_user_notifications_unread ON public.user_notifications (user_id, is_read) WHERE is_read = false;

-- Enable RLS
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.user_notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.user_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;

-- Trigger to create account activity notifications
CREATE OR REPLACE FUNCTION public.notify_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.display_name IS DISTINCT FROM NEW.display_name THEN
    INSERT INTO public.user_notifications (user_id, type, title, body)
    VALUES (NEW.user_id, 'profile_updated', 'Perfil atualizado', 'Seu nome de exibição foi alterado.');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_profile_update_notify
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_profile_update();
