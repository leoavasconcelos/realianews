-- Restrict Realtime channel subscriptions so users can only listen on their own per-user topic.
-- Topic convention used by the app: 'user-notifications:<auth.uid()>'

-- Ensure RLS is enabled on realtime.messages (Supabase ships it enabled, but be explicit)
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop any prior versions of these policies if they exist (idempotent re-run safety)
DROP POLICY IF EXISTS "Users can read their own notification channel" ON realtime.messages;
DROP POLICY IF EXISTS "Users can write to their own notification channel" ON realtime.messages;

-- Allow authenticated users to receive messages only on their own per-user topic
CREATE POLICY "Users can read their own notification channel"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'user-notifications:' || (auth.uid())::text
);

-- Allow authenticated users to send presence/broadcast only on their own per-user topic
CREATE POLICY "Users can write to their own notification channel"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = 'user-notifications:' || (auth.uid())::text
);