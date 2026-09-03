CREATE OR REPLACE FUNCTION public.admin_platform_stats()
RETURNS TABLE (total_users bigint, total_tokens bigint, pro_users bigint, blocked_users bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.profiles),
    (SELECT COALESCE(sum(balance), 0)::bigint FROM public.token_balances),
    (SELECT count(*) FROM public.profiles WHERE plan <> 'free'),
    (SELECT count(*) FROM public.profiles WHERE is_banned OR is_suspended)
  WHERE public.has_role(auth.uid(), 'admin');
$$;

CREATE OR REPLACE FUNCTION public.admin_user_page(_search text DEFAULT NULL, _limit integer DEFAULT 25, _offset integer DEFAULT 0)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  email text,
  is_verified boolean,
  is_banned boolean,
  is_suspended boolean,
  ban_reason text,
  plan app_plan,
  balance integer,
  last_seen_at timestamptz,
  last_ip text,
  last_device text,
  last_browser text,
  last_location text,
  total_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH f AS (
    SELECT p.*
    FROM public.profiles p
    WHERE public.has_role(auth.uid(), 'admin')
      AND (
        _search IS NULL OR _search = ''
        OR p.email ILIKE '%' || _search || '%'
        OR p.display_name ILIKE '%' || _search || '%'
      )
  ), c AS (SELECT count(*) AS n FROM f)
  SELECT
    f.user_id,
    f.display_name,
    f.email,
    f.is_verified,
    f.is_banned,
    f.is_suspended,
    f.ban_reason,
    f.plan,
    COALESCE(b.balance, 0) AS balance,
    s.last_seen_at,
    s.ip_address,
    s.device,
    s.browser,
    NULLIF(concat_ws(', ', s.city, s.country), '') AS last_location,
    c.n
  FROM f
  CROSS JOIN c
  LEFT JOIN public.token_balances b ON b.user_id = f.user_id
  LEFT JOIN LATERAL (
    SELECT us.last_seen_at, us.ip_address, us.device, us.browser, us.city, us.country
    FROM public.user_sessions us
    WHERE us.user_id = f.user_id
    ORDER BY us.last_seen_at DESC
    LIMIT 1
  ) s ON true
  ORDER BY f.created_at DESC
  LIMIT GREATEST(_limit, 1) OFFSET GREATEST(_offset, 0);
$$;

REVOKE ALL ON FUNCTION public.admin_platform_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_user_page(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_user_page(text, integer, integer) TO authenticated;