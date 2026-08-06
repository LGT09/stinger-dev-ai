import { NavLink, Outlet } from "react-router-dom";
import { LifeBuoy } from "lucide-react";

const tabs = [
  { to: "/support", label: "Help center", end: true },
  { to: "/support/faq", label: "FAQ" },
  { to: "/support/api", label: "Free APIs" },
  { to: "/support/status", label: "System status" },
];

/** Shell for every Stinger support page (own route tree, own bundle-lite pages). */
const SupportLayout = () => (
  <div className="p-6 space-y-6">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <LifeBuoy size={18} className="text-primary" />
      </div>
      <div>
        <h1 className="text-2xl font-semibold text-gradient">Stinger Support</h1>
        <p className="text-sm text-muted-foreground">Guides, answers and platform status.</p>
      </div>
    </div>

    <div className="flex gap-2 flex-wrap">
      {tabs.map(t => (
        <NavLink key={t.to} to={t.to} end={t.end}
          className={({ isActive }) => `px-3 py-1.5 rounded-xl text-xs font-medium transition-all btn-hover ${isActive ? "bg-primary text-primary-foreground" : "glass text-muted-foreground hover:text-foreground"}`}>
          {t.label}
        </NavLink>
      ))}
    </div>

    <Outlet />
  </div>
);

export default SupportLayout;
