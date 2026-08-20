ALTER TABLE public.project_ssh_keys
  ADD COLUMN IF NOT EXISTS is_admin_key boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tokens_spent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commands_run integer NOT NULL DEFAULT 0;

ALTER TABLE public.project_ssh_keys ALTER COLUMN expires_at DROP NOT NULL;

CREATE TABLE IF NOT EXISTS public.ssh_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  key_id uuid,
  command text not null,
  detail text,
  tokens integer not null default 0,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.ssh_activity TO authenticated;
GRANT ALL ON public.ssh_activity TO service_role;
ALTER TABLE public.ssh_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own ssh activity" ON public.ssh_activity;
CREATE POLICY "own ssh activity" ON public.ssh_activity FOR SELECT TO authenticated USING (auth.uid() = user_id);