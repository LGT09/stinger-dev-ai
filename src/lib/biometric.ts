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

/** Ask for camera permission so the browser shows the "Face recognition" prompt on phones. */
export async function requestDevicePermissions() {
  try {
    if (navigator.mediaDevices?.getUserMedia) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(t => t.stop());
    }
  } catch { /* user can still continue without camera */ }
}

export async function registerPasskey(deviceName = "This device") {
  const opts = await authedFetch("register-options", {});
  const response = await startRegistration({ optionsJSON: opts });
  await authedFetch("register-verify", { response, deviceName });
}

/** Auto-session login: server returns token_hash, we verifyOtp in place. */
async function exchangeAndSetSession(email: string, r: { token_hash?: string; email_otp?: string; action_link?: string }) {
  if (r.token_hash) {
    const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: r.token_hash });
    if (!error) return true;
  }
  if (r.email_otp) {
    const { error } = await supabase.auth.verifyOtp({ type: "magiclink", email, token: r.email_otp });
    if (!error) return true;
  }
  if (r.action_link) { window.location.href = r.action_link; return true; }
  throw new Error("No session token returned");
}

export async function loginWithPasskey(email: string) {
  await requestDevicePermissions();
  const opts = await authedFetch("auth-options", { email });
  const response = await startAuthentication({ optionsJSON: opts });
  const r = await authedFetch("auth-verify", { email, response });
  await exchangeAndSetSession(email, r);
}

export async function signupWithPasskey(email: string, displayName: string) {
  await requestDevicePermissions();
  const opts: any = await authedFetch("signup-options", { email, displayName });
  const userId = opts._userId;
  delete opts._userId;
  const response = await startRegistration({ optionsJSON: opts });
  const r = await authedFetch("signup-verify", { email, userId, response, deviceName: "This device" });
  await exchangeAndSetSession(email, r);
}