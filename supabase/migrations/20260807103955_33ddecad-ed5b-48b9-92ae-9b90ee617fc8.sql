-- Build targets & packaging metadata for multi-platform app generation
ALTER TABLE public.apk_builds
  ADD COLUMN IF NOT EXISTS target TEXT NOT NULL DEFAULT 'android',
  ADD COLUMN IF NOT EXISTS packaging TEXT NOT NULL DEFAULT 'apk',
  ADD COLUMN IF NOT EXISTS toolchain TEXT,
  ADD COLUMN IF NOT EXISTS store_ready BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS artifact_name TEXT;

-- SSH access keys: terminal access to Stinger from any device
CREATE TABLE IF NOT EXISTS public.project_ssh_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Terminal key',
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT ARRAY['chat','deploy','files','models'],
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1440 minutes'),
  revoked BOOLEAN NOT NULL DEFAULT false,
  last_used_at TIMESTAMPTZ,
  last_ip TEXT,
  last_device TEXT,
  uses INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_ssh_keys TO authenticated;
GRANT ALL ON public.project_ssh_keys TO service_role;
ALTER TABLE public.project_ssh_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own ssh keys" ON public.project_ssh_keys;
CREATE POLICY "Users manage their own ssh keys" ON public.project_ssh_keys
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_project_ssh_keys_updated_at ON public.project_ssh_keys;
CREATE TRIGGER update_project_ssh_keys_updated_at BEFORE UPDATE ON public.project_ssh_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_project_ssh_keys_user ON public.project_ssh_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_project_ssh_keys_prefix ON public.project_ssh_keys(key_prefix);