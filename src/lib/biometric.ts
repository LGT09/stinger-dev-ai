import { startRegistration, startAuthentication, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { supabase } from "@/integrations/supabase/client";

const BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/webauthn`;

async function authedFetch(path: string, body: any) {
  const { data: { session } } = await supabase.auth.getSession();
  const r = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(body || {}),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Failed (${r.status})`);
  return j;
}

export const supportsBiometric = () => browserSupportsWebAuthn();

export async function registerPasskey(deviceName = "This device") {
  const opts = await authedFetch("register-options", {});
  const response = await startRegistration({ optionsJSON: opts });
  await authedFetch("register-verify", { response, deviceName });
}

export async function loginWithPasskey(email: string) {
  const opts = await authedFetch("auth-options", { email });
  const response = await startAuthentication({ optionsJSON: opts });
  const r = await authedFetch("auth-verify", { email, response });
  if (r.action_link) window.location.href = r.action_link;
  return r;
}