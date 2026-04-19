-- Remove existing daily digest cron if any
SELECT cron.unschedule('send-daily-digest-daily') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='send-daily-digest-daily');

-- Schedule daily digest at 11:00 UTC (08:00 BRT) every day
SELECT cron.schedule(
  'send-daily-digest-daily',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pmilalvjbgllzfarmhfn.supabase.co/functions/v1/send-daily-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);