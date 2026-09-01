CREATE OR REPLACE FUNCTION public.purge_stale_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_sessions WHERE last_seen_at < now() - interval '24 hours';
  DELETE FROM public.user_activity WHERE created_at < now() - interval '24 hours';
  DELETE FROM public.ssh_activity WHERE created_at < now() - interval '24 hours';
  DELETE FROM public.chat_messages WHERE created_at < now() - interval '7 days';
  DELETE FROM public.chat_threads t
    WHERE t.updated_at < now() - interval '7 days'
      AND NOT EXISTS (SELECT 1 FROM public.chat_messages m WHERE m.thread_id = t.id);
  DELETE FROM public.project_ssh_keys
    WHERE (revoked = true OR (expires_at IS NOT NULL AND expires_at < now()))
      AND is_admin_key = false;
  DELETE FROM public.verification_codes WHERE expires_at < now() - interval '1 hour';
  DELETE FROM public.webauthn_challenges WHERE expires_at < now() - interval '1 hour';
END;
$$;

SELECT cron.unschedule('stinger-purge-stale-data')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'stinger-purge-stale-data');

SELECT cron.schedule('stinger-purge-stale-data', '0 * * * *', $$SELECT public.purge_stale_data();$$);