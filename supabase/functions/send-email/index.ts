import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const FROM = "Stinger AI Dev <onboarding@resend.dev>";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

const template = (title: string, body: string, cta?: { label: string; url: string }) => `
<div style="background:#0f1216;padding:32px;font-family:system-ui,-apple-system,Segoe UI,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#151a20;border:1px solid rgba(255,212,0,.25);border-radius:18px;overflow:hidden">
    <div style="padding:22px 26px;background:linear-gradient(135deg,#ffd400,#ffb400);color:#0f1216;font-weight:900;font-size:20px">S &nbsp;Stinger AI Dev</div>
    <div style="padding:26px;color:#e7eaf0;font-size:15px;line-height:1.65">
      <h1 style="margin:0 0 14px;font-size:20px;color:#fff">${title}</h1>
      <div>${body.replace(/\n/g, "<br/>")}</div>
      ${cta ? `<a href="${cta.url}" style="display:inline-block;margin-top:20px;background:#ffd400;color:#0f1216;font-weight:700;padding:11px 20px;border-radius:10px;text-decoration:none">${cta.label}</a>` : ""}
    </div>
    <div style="padding:16px 26px;border-top:1px solid rgba(255,255,255,.08);color:#8d97a5;font-size:12px">
      Built in <a href="https://stinger.co.zw" style="color:#ffd400;text-decoration:none">stinger.co.zw</a> — create your own software and apps in stinger.co.zw.<br/>
      Support: <a href="https://support.stinger.co.zw" style="color:#ffd400;text-decoration:none">support.stinger.co.zw</a>
    </div>
  </div>
</div>`;

async function sendOne(to: string, subject: string, html: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  const t = await r.text();
  return { ok: r.ok, detail: t.slice(0, 300) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!RESEND_KEY) return json({ error: "RESEND_API_KEY is not configured" }, 500);

  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: userData } = await admin.auth.getUser(token);
    const userId = userData.user?.id;
    if (!userId) return json({ error: "Login required" }, 401);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "Admins only" }, 403);

    const payload = await req.json();
    const {
      mode = "single",       // single | broadcast
      to,
      subject,
      body = "",
      cta,
      kind = "manual",
      announcementId = null,
      eventId = null,
    } = payload as Record<string, any>;

    if (!subject) return json({ error: "subject required" }, 400);
    const html = template(subject, body, cta);

    let recipients: string[] = [];
    if (mode === "broadcast") {
      const { data: profiles } = await admin.from("profiles").select("email").not("email", "is", null);
      recipients = [...new Set((profiles || []).map((p: any) => p.email).filter(Boolean))];
    } else {
      if (!to) return json({ error: "to required" }, 400);
      recipients = Array.isArray(to) ? to : [to];
    }
    if (recipients.length === 0) return json({ error: "No recipients" }, 400);

    let sent = 0;
    const failures: string[] = [];
    for (const r of recipients) {
      const res = await sendOne(r, subject, html);
      if (res.ok) sent++; else failures.push(`${r}: ${res.detail}`);
      await admin.from("email_logs").insert({
        recipient: r, subject, kind,
        status: res.ok ? "sent" : "failed",
        error: res.ok ? null : res.detail,
        announcement_id: announcementId, event_id: eventId,
      });
      await new Promise((x) => setTimeout(x, 120)); // stay under Resend rate limits
    }

    if (announcementId) {
      await admin.from("announcements").update({ sent_at: new Date().toISOString(), recipients_count: sent }).eq("id", announcementId);
    }
    if (eventId) {
      await admin.from("events").update({ broadcast_at: new Date().toISOString() }).eq("id", eventId);
    }

    return json({ success: true, sent, total: recipients.length, failures: failures.slice(0, 5) });
  } catch (e) {
    console.error("send-email error", e);
    return json({ error: (e as Error)?.message || "Server error" }, 500);
  }
});
