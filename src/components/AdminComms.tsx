import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Megaphone, CalendarDays, Send, Trash2, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Tab = "email" | "announcements" | "events";

const FN_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

/** Admin communications hub — direct emails, announcements and events/promos (Resend powered). */
const AdminComms = () => {
  const [tab, setTab] = useState<Tab>("email");
  const [busy, setBusy] = useState(false);

  // direct email
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [broadcast, setBroadcast] = useState(false);

  // announcements / events
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [aTitle, setATitle] = useState("");
  const [aBody, setABody] = useState("");
  const [aEmail, setAEmail] = useState(true);
  const [eTitle, setETitle] = useState("");
  const [eDesc, setEDesc] = useState("");
  const [eKind, setEKind] = useState("event");
  const [ePromo, setEPromo] = useState("");
  const [eStart, setEStart] = useState("");

  const load = useCallback(async () => {
    const [{ data: a }, { data: e }] = await Promise.all([
      supabase.from("announcements").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("events").select("*").order("starts_at", { ascending: false }).limit(20),
    ]);
    setAnnouncements(a || []);
    setEvents(e || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const callSendEmail = async (payload: Record<string, unknown>) => {
    const { data: sess } = await supabase.auth.getSession();
    const resp = await fetch(`${FN_BASE}/send-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sess.session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || "Email failed");
    return json;
  };

  const sendDirect = async () => {
    if (!subject.trim() || (!broadcast && !to.trim())) { toast.error("Recipient and subject are required"); return; }
    setBusy(true);
    try {
      const res = await callSendEmail({ mode: broadcast ? "broadcast" : "single", to, subject, body, kind: "manual" });
      toast.success(`Sent to ${res.sent}/${res.total} recipient(s)`);
      setTo(""); setSubject(""); setBody("");
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  };

  const createAnnouncement = async () => {
    if (!aTitle.trim() || !aBody.trim()) { toast.error("Title and message are required"); return; }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("announcements")
        .insert({ title: aTitle, body: aBody, send_email: aEmail, created_by: u.user?.id })
        .select("id").single();
      if (error) throw error;
      if (aEmail) {
        const res = await callSendEmail({
          mode: "broadcast", subject: aTitle, body: aBody, kind: "announcement", announcementId: data.id,
          cta: { label: "Open Stinger", url: "https://stinger.co.zw" },
        });
        toast.success(`Announcement published & emailed to ${res.sent} user(s)`);
      } else {
        toast.success("Announcement published");
      }
      setATitle(""); setABody(""); load();
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  };

  const createEvent = async () => {
    if (!eTitle.trim()) { toast.error("Event title is required"); return; }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("events").insert({
        title: eTitle, description: eDesc, kind: eKind,
        promo_code: ePromo || null,
        starts_at: eStart ? new Date(eStart).toISOString() : new Date().toISOString(),
        created_by: u.user?.id,
      });
      if (error) throw error;
      toast.success("Event scheduled");
      setETitle(""); setEDesc(""); setEPromo(""); setEStart(""); load();
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  };

  const broadcastEvent = async (ev: any) => {
    setBusy(true);
    try {
      const res = await callSendEmail({
        mode: "broadcast",
        subject: `${ev.kind === "promo" ? "🎁 Promo" : "📅 Upcoming"}: ${ev.title}`,
        body: `${ev.description || ""}\n\nStarts: ${new Date(ev.starts_at).toLocaleString()}${ev.promo_code ? `\nPromo code: ${ev.promo_code}` : ""}`,
        kind: "event", eventId: ev.id,
        cta: { label: "See what's new", url: "https://stinger.co.zw" },
      });
      toast.success(`Broadcast to ${res.sent} user(s)`);
      load();
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  };

  const remove = async (table: "announcements" | "events", id: string) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    load();
  };

  const field = "w-full bg-secondary/60 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all";

  return (
    <div className="glass liquid-chrome rounded-xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-primary" />
        <p className="text-xs font-medium text-foreground">Communications — email, announcements & events</p>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {([
          ["email", "Send email", Mail],
          ["announcements", "Announcements", Megaphone],
          ["events", "Events & promos", CalendarDays],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] btn-hover transition-all ${
              tab === id ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground"
            }`}>
            <Icon size={11} /> {label}
          </button>
        ))}
      </div>

      {tab === "email" && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <input type="checkbox" checked={broadcast} onChange={e => setBroadcast(e.target.checked)} />
            Send to all users
          </label>
          {!broadcast && <input value={to} onChange={e => setTo(e.target.value)} placeholder="recipient@email.com" className={field} />}
          <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className={field} />
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Message…" rows={5} className={field} />
          <button disabled={busy} onClick={sendDirect}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-[11px] font-medium btn-hover disabled:opacity-50">
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} Send
          </button>
        </motion.div>
      )}

      {tab === "announcements" && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <input value={aTitle} onChange={e => setATitle(e.target.value)} placeholder="Announcement title" className={field} />
          <textarea value={aBody} onChange={e => setABody(e.target.value)} placeholder="What's new on Stinger?" rows={4} className={field} />
          <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <input type="checkbox" checked={aEmail} onChange={e => setAEmail(e.target.checked)} /> Also email every user
          </label>
          <button disabled={busy} onClick={createAnnouncement}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-[11px] font-medium btn-hover disabled:opacity-50">
            {busy ? <Loader2 size={11} className="animate-spin" /> : <Megaphone size={11} />} Publish
          </button>
          <div className="space-y-1.5 pt-2">
            {announcements.map(a => (
              <div key={a.id} className="flex items-start gap-2 bg-secondary/50 rounded-lg p-2 text-[11px]">
                <div className="flex-1">
                  <p className="text-foreground font-medium">{a.title}</p>
                  <p className="text-muted-foreground line-clamp-2">{a.body}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {a.sent_at ? `Emailed to ${a.recipients_count} user(s)` : "Not emailed"} · {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
                <button onClick={() => remove("announcements", a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={11} /></button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {tab === "events" && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <input value={eTitle} onChange={e => setETitle(e.target.value)} placeholder="Event or promo title" className={field} />
          <textarea value={eDesc} onChange={e => setEDesc(e.target.value)} placeholder="Details…" rows={3} className={field} />
          <div className="grid grid-cols-2 gap-2">
            <select value={eKind} onChange={e => setEKind(e.target.value)} className={field}>
              <option value="event">Event</option>
              <option value="promo">Promo</option>
              <option value="update">Update</option>
            </select>
            <input value={ePromo} onChange={e => setEPromo(e.target.value)} placeholder="Promo code (optional)" className={field} />
          </div>
          <input type="datetime-local" value={eStart} onChange={e => setEStart(e.target.value)} className={field} />
          <button disabled={busy} onClick={createEvent}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-[11px] font-medium btn-hover disabled:opacity-50">
            {busy ? <Loader2 size={11} className="animate-spin" /> : <CalendarDays size={11} />} Schedule
          </button>
          <div className="space-y-1.5 pt-2">
            {events.map(ev => (
              <div key={ev.id} className="flex items-start gap-2 bg-secondary/50 rounded-lg p-2 text-[11px]">
                <div className="flex-1">
                  <p className="text-foreground font-medium">{ev.title} <span className="text-primary text-[10px] uppercase">{ev.kind}</span></p>
                  <p className="text-muted-foreground line-clamp-2">{ev.description}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                    {new Date(ev.starts_at).toLocaleString()}{ev.promo_code ? ` · code ${ev.promo_code}` : ""}
                    {ev.broadcast_at ? " · broadcast" : ""}
                  </p>
                </div>
                <button disabled={busy} onClick={() => broadcastEvent(ev)} className="text-primary hover:opacity-80 disabled:opacity-40"><Send size={11} /></button>
                <button onClick={() => remove("events", ev.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={11} /></button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AdminComms;
