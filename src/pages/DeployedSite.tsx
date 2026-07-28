import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/**
 * Public route: /{username}/{project-slug}
 * Serves a deployed Stinger project as a real website.
 */
const DeployedSite = () => {
  const { username, slug } = useParams<{ username: string; slug: string }>();
  const [html, setHtml] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");

  useEffect(() => {
    if (!username || !slug) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("deployments")
        .select("id, html, title, visits")
        .eq("username", username)
        .eq("slug", slug)
        .eq("status", "live")
        .maybeSingle();
      if (cancelled) return;
      if (!data) { setState("missing"); return; }
      setHtml(data.html);
      setTitle(data.title);
      document.title = `${data.title} — built in Stinger`;
      setState("ok");
      supabase.from("deployments").update({ visits: (data.visits || 0) + 1 }).eq("id", data.id).then(() => {});
    })();
    return () => { cancelled = true; };
  }, [username, slug]);

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">Loading site…</p>
      </div>
    );
  }

  if (state === "missing") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6" data-theme="neon">
        <div className="glass rounded-2xl p-8 text-center max-w-sm liquid-chrome">
          <p className="text-base font-semibold text-foreground mb-1">Site not found</p>
          <p className="text-sm text-muted-foreground mb-4">
            Nothing is deployed at <code className="text-primary">/{username}/{slug}</code>.
          </p>
          <Link to="/" className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium btn-hover">
            Build yours on Stinger
          </Link>
        </div>
      </div>
    );
  }

  return (
    <iframe
      srcDoc={html || ""}
      title={title}
      className="w-screen h-screen border-0 bg-white"
      sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
    />
  );
};

export default DeployedSite;