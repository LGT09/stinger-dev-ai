
-- Sessions & activity tracking
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip_address text,
  user_agent text,
  device text,
  browser text,
  os text,
  city text,
  country text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own sessions" ON public.user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON public.user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.user_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sessions" ON public.user_sessions FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage sessions" ON public.user_sessions FOR ALL USING (has_role(auth.uid(),'admin'));
CREATE INDEX idx_sessions_user ON public.user_sessions(user_id, last_seen_at DESC);

CREATE TABLE public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  path text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own activity" ON public.user_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own activity" ON public.user_activity FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage activity" ON public.user_activity FOR ALL USING (has_role(auth.uid(),'admin'));
CREATE INDEX idx_activity_user ON public.user_activity(user_id, created_at DESC);

-- Passkeys (WebAuthn)
CREATE TABLE public.user_passkeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0,
  transports text[],
  device_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
ALTER TABLE public.user_passkeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own passkeys" ON public.user_passkeys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own passkeys" ON public.user_passkeys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own passkeys" ON public.user_passkeys FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins manage passkeys" ON public.user_passkeys FOR ALL USING (has_role(auth.uid(),'admin'));

-- Temporary WebAuthn challenges (anyone can write own; cleared after verify)
CREATE TABLE public.webauthn_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,
  challenge text NOT NULL,
  type text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_webauthn_ident ON public.webauthn_challenges(identifier, type);
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;
-- Service role only; no user policies needed
