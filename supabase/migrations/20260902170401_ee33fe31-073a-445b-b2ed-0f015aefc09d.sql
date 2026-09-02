
CREATE OR REPLACE FUNCTION public.admin_grant_tokens(_amount integer, _user_ids uuid[] DEFAULT NULL, _mode text DEFAULT 'add')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected integer := 0;
  r record;
  newbal integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  FOR r IN
    SELECT p.user_id, COALESCE(b.balance, 0) AS balance
    FROM public.profiles p
    LEFT JOIN public.token_balances b ON b.user_id = p.user_id
    WHERE _user_ids IS NULL OR p.user_id = ANY(_user_ids)
  LOOP
    IF _mode = 'set' THEN
      newbal := GREATEST(0, _amount);
    ELSE
      newbal := GREATEST(0, r.balance + _amount);
    END IF;

    INSERT INTO public.token_balances (user_id, balance)
    VALUES (r.user_id, newbal)
    ON CONFLICT (user_id) DO UPDATE SET balance = EXCLUDED.balance;

    INSERT INTO public.token_transactions (user_id, amount, action, description)
    VALUES (r.user_id, newbal - r.balance,
      CASE WHEN newbal >= r.balance THEN 'Admin grant' ELSE 'Admin deduction' END,
      'Admin token adjustment (' || _mode || ' ' || _amount || ')');

    affected := affected + 1;
  END LOOP;

  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_grant_tokens(integer, uuid[], text) TO authenticated;
