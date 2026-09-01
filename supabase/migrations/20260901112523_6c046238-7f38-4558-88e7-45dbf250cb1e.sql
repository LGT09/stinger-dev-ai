REVOKE ALL ON FUNCTION public.purge_stale_data() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_stale_data() TO postgres, service_role;