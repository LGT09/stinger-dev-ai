import { Link } from "react-router-dom";
import { Mail, BookOpen, Rocket, Server } from "lucide-react";

const cards = [
  { icon: BookOpen, title: "Documentation", body: "Full guides for AI Studio, tokens, referrals and deploys.", to: "/docs" },
  { icon: Rocket, title: "Deploy help", body: "Publishing, renaming, undeploying and build logs.", to: "/deployments" },
  { icon: Server, title: "Free APIs", body: "No API keys? Grab free endpoints from Traxxion.", to: "/support/api" },
];

const SupportHome = () => (
  <div className="space-y-4">
    <div className="grid sm:grid-cols-3 gap-3">
      {cards.map(c => (
        <Link key={c.title} to={c.to} className="glass rounded-2xl p-4 liquid-chrome hover:scale-[1.02] transition-transform">
          <c.icon size={18} className="text-primary mb-2" />
          <p className="text-sm font-medium text-foreground">{c.title}</p>
          <p className="text-xs text-muted-foreground mt-1">{c.body}</p>
        </Link>
      ))}
    </div>
    <div className="glass rounded-2xl p-5 liquid-chrome">
      <p className="text-sm font-medium text-foreground mb-2">Still stuck?</p>
      <div className="flex flex-wrap gap-2">
        <a href="https://support.stinger.co.zw" target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium btn-hover">
          <Mail size={14} /> support.stinger.co.zw
        </a>
        <a href="mailto:ceo@stinger.co.zw" className="inline-flex items-center gap-2 glass px-4 py-2 rounded-xl text-sm text-foreground btn-hover">
          <Mail size={14} /> ceo@stinger.co.zw
        </a>
      </div>
    </div>
  </div>
);

export default SupportHome;
