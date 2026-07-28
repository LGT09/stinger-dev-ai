
-- 1. username on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

UPDATE public.profiles
SET username = regexp_replace(lower(coalesce(split_part(email, '@', 1), 'user')), '[^a-z0-9]+', '-', 'g') || '-' || substr(replace(user_id::text, '-', ''), 1, 4)
WHERE username IS NULL;

-- 2. deployments
CREATE TABLE IF NOT EXISTS public.deployments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  username text NOT NULL,
  slug text NOT NULL,
  title text NOT NULL DEFAULT 'Untitled',
  html text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'live',
  url text,
  visits integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (username, slug)
);

GRANT SELECT ON public.deployments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deployments TO authenticated;
GRANT ALL ON public.deployments TO service_role;

ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live deployments"
  ON public.deployments FOR SELECT
  USING (status = 'live' OR auth.uid() = user_id);

CREATE POLICY "Users manage own deployments"
  ON public.deployments FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_deployments_updated_at ON public.deployments;
CREATE TRIGGER update_deployments_updated_at
  BEFORE UPDATE ON public.deployments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. apk build progress
ALTER TABLE public.apk_builds ADD COLUMN IF NOT EXISTS progress integer NOT NULL DEFAULT 0;
ALTER TABLE public.apk_builds ADD COLUMN IF NOT EXISTS stage text;
ALTER TABLE public.apk_builds ADD COLUMN IF NOT EXISTS project_name text;

-- 4. verification codes
CREATE TABLE IF NOT EXISTS public.verification_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  purpose text NOT NULL DEFAULT 'verify_email',
  consumed boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.verification_codes TO service_role;
ALTER TABLE public.verification_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No client access to verification codes"
  ON public.verification_codes FOR SELECT
  USING (false);
