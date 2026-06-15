import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from "npm:@simplewebauthn/server@10.0.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function getUserFromAuth(req: Request) {
  const authH = req.headers.get("Authorization") || "";
  const token = authH.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await admin.auth.getUser(token);
  return data.user;
}

function getRpInfo(req: Request) {
  const origin = req.headers.get("origin") || "";
  const url = new URL(origin || "https://example.com");
  return { rpID: url.hostname, origin };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();
    const { rpID, origin } = getRpInfo(req);
    const rpName = "Stinger Dev";
    const body = await req.json().catch(() => ({}));

    /* ---------- REGISTRATION (requires logged-in user) ---------- */
    if (action === "register-options") {
      const user = await getUserFromAuth(req);
      if (!user) return json({ error: "Login required" }, 401);
      const { data: existing } = await admin.from("user_passkeys").select("credential_id, transports").eq("user_id", user.id);
      const opts = await generateRegistrationOptions({
        rpName, rpID,
        userID: new TextEncoder().encode(user.id),
        userName: user.email || user.id,
        attestationType: "none",
        excludeCredentials: (existing || []).map((c: any) => ({ id: c.credential_id, transports: c.transports || [] })),
        authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
      });
      await admin.from("webauthn_challenges").insert({ identifier: user.id, challenge: opts.challenge, type: "register" });
      return json(opts);
    }

    if (action === "register-verify") {
      const user = await getUserFromAuth(req);
      if (!user) return json({ error: "Login required" }, 401);
      const { data: ch } = await admin.from("webauthn_challenges")
        .select("*").eq("identifier", user.id).eq("type", "register")
        .order("created_at", { ascending: false }).limit(1).single();
      if (!ch) return json({ error: "Challenge not found" }, 400);

      const verification = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge: ch.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });
      if (!verification.verified || !verification.registrationInfo) return json({ error: "Verification failed" }, 400);
      const { credential } = verification.registrationInfo as any;
      const credId = credential.id;
      const pubKey = btoa(String.fromCharCode(...credential.publicKey));
      await admin.from("user_passkeys").insert({
        user_id: user.id,
        credential_id: credId,
        public_key: pubKey,
        counter: credential.counter ?? 0,
        transports: body.response?.response?.transports || [],
        device_name: body.deviceName || "Passkey",
      });
      await admin.from("webauthn_challenges").delete().eq("id", ch.id);
      return json({ success: true });
    }

    /* ---------- AUTHENTICATION (passwordless login) ---------- */
    if (action === "auth-options") {
      const email = (body.email || "").toLowerCase();
      if (!email) return json({ error: "email required" }, 400);
      const { data: profile } = await admin.from("profiles").select("user_id").eq("email", email).maybeSingle();
      if (!profile) return json({ error: "No account for that email" }, 404);
      const { data: keys } = await admin.from("user_passkeys").select("credential_id, transports").eq("user_id", profile.user_id);
      if (!keys?.length) return json({ error: "No passkeys registered for this account" }, 404);
      const opts = await generateAuthenticationOptions({
        rpID,
        allowCredentials: keys.map((k: any) => ({ id: k.credential_id, transports: k.transports || [] })),
        userVerification: "preferred",
      });
      await admin.from("webauthn_challenges").insert({ identifier: email, challenge: opts.challenge, type: "auth" });
      return json(opts);
    }

    if (action === "auth-verify") {
      const email = (body.email || "").toLowerCase();
      const credId = body.response?.id;
      if (!email || !credId) return json({ error: "email and credential required" }, 400);
      const { data: ch } = await admin.from("webauthn_challenges")
        .select("*").eq("identifier", email).eq("type", "auth")
        .order("created_at", { ascending: false }).limit(1).single();
      if (!ch) return json({ error: "Challenge not found" }, 400);
      const { data: pk } = await admin.from("user_passkeys").select("*").eq("credential_id", credId).single();
      if (!pk) return json({ error: "Passkey not registered" }, 404);

      const publicKey = Uint8Array.from(atob(pk.public_key), c => c.charCodeAt(0));
      const verification = await verifyAuthenticationResponse({
        response: body.response,
        expectedChallenge: ch.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: { id: pk.credential_id, publicKey, counter: Number(pk.counter) },
      });
      if (!verification.verified) return json({ error: "Verification failed" }, 400);
      await admin.from("user_passkeys").update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      }).eq("id", pk.id);
      await admin.from("webauthn_challenges").delete().eq("id", ch.id);

      // Issue a magic-link token; return token_hash so the client can call
      // supabase.auth.verifyOtp({ type:'magiclink', token_hash }) and set a
      // session in-place — no redirect needed.
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });
      if (linkErr) return json({ error: linkErr.message }, 500);
      const props: any = (linkData as any)?.properties || {};
      return json({
        success: true,
        token_hash: props.hashed_token,
        email_otp: props.email_otp,
        action_link: props.action_link, // legacy fallback
      });
    }

    /* ---------- PASSKEY SIGNUP — creates user, enrolls passkey, returns session token ---------- */
    if (action === "signup-options") {
      const email = (body.email || "").toLowerCase();
      const displayName = body.displayName || email.split("@")[0];
      if (!email) return json({ error: "email required" }, 400);
      // Create user if it doesn't exist (email-confirmed).
      let userId: string | null = null;
      const { data: existing } = await admin.from("profiles").select("user_id").eq("email", email).maybeSingle();
      if (existing) userId = existing.user_id;
      if (!userId) {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { display_name: displayName },
        });
        if (createErr) return json({ error: createErr.message }, 400);
        userId = created.user!.id;
      }
      const { data: prior } = await admin.from("user_passkeys").select("credential_id, transports").eq("user_id", userId);
      const opts = await generateRegistrationOptions({
        rpName, rpID,
        userID: new TextEncoder().encode(userId),
        userName: email,
        attestationType: "none",
        excludeCredentials: (prior || []).map((c: any) => ({ id: c.credential_id, transports: c.transports || [] })),
        authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
      });
      await admin.from("webauthn_challenges").insert({ identifier: userId, challenge: opts.challenge, type: "register" });
      return json({ ...opts, _userId: userId });
    }

    if (action === "signup-verify") {
      const userId = body.userId;
      const email = (body.email || "").toLowerCase();
      if (!userId || !email) return json({ error: "userId and email required" }, 400);
      const { data: ch } = await admin.from("webauthn_challenges")
        .select("*").eq("identifier", userId).eq("type", "register")
        .order("created_at", { ascending: false }).limit(1).single();
      if (!ch) return json({ error: "Challenge not found" }, 400);

      const verification = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge: ch.challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });
      if (!verification.verified || !verification.registrationInfo) return json({ error: "Verification failed" }, 400);
      const { credential } = verification.registrationInfo as any;
      const credId = credential.id;
      const pubKey = btoa(String.fromCharCode(...credential.publicKey));
      await admin.from("user_passkeys").insert({
        user_id: userId, credential_id: credId, public_key: pubKey,
        counter: credential.counter ?? 0,
        transports: body.response?.response?.transports || [],
        device_name: body.deviceName || "This device",
      });
      await admin.from("webauthn_challenges").delete().eq("id", ch.id);

      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
      if (linkErr) return json({ error: linkErr.message }, 500);
      const props: any = (linkData as any)?.properties || {};
      return json({ success: true, token_hash: props.hashed_token, email_otp: props.email_otp });
    }

    return json({ error: "Unknown action" }, 404);
  } catch (e: any) {
    console.error("webauthn error", e);
    return json({ error: e?.message || "Server error" }, 500);
  }
});