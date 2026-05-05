import { supabase } from "@/integrations/supabase/client";

/** Parse user-agent to a friendly device / browser / os string. */
function parseUA(ua: string) {
  const browser = /Edg\//.test(ua) ? "Edge"
    : /Chrome\//.test(ua) ? "Chrome"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Safari\//.test(ua) ? "Safari"
    : "Other";
  const os = /Windows/.test(ua) ? "Windows"
    : /Android/.test(ua) ? "Android"
    : /iPhone|iPad|iOS/.test(ua) ? "iOS"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS"
    : /Linux/.test(ua) ? "Linux"
    : "Unknown";
  const device = /Mobi|Android|iPhone/.test(ua) ? "Mobile" : /iPad|Tablet/.test(ua) ? "Tablet" : "Desktop";
  return { browser, os, device };
}

async function lookupGeo(): Promise<{ ip?: string; city?: string; country?: string }> {
  try {
    const r = await fetch("https://ipapi.co/json/");
    if (!r.ok) return {};
    const j = await r.json();
    return { ip: j.ip, city: j.city, country: j.country_name };
  } catch { return {}; }
}

let CURRENT_SESSION_ID: string | null = null;

export async function startSession(userId: string) {
  const ua = navigator.userAgent;
  const { browser, os, device } = parseUA(ua);
  const geo = await lookupGeo();
  const { data, error } = await supabase
    .from("user_sessions")
    .insert({ user_id: userId, user_agent: ua, browser, os, device, ip_address: geo.ip, city: geo.city, country: geo.country })
    .select("id")
    .single();
  if (!error && data) {
    CURRENT_SESSION_ID = data.id;
    localStorage.setItem("stinger_session_id", data.id);
  }
}

export async function touchSession() {
  const id = CURRENT_SESSION_ID || localStorage.getItem("stinger_session_id");
  if (!id) return;
  await supabase.from("user_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", id);
}

export async function logActivity(userId: string, action: string, path?: string, metadata: Record<string, any> = {}) {
  try {
    await supabase.from("user_activity").insert({ user_id: userId, action, path: path || window.location.pathname, metadata });
  } catch {}
}