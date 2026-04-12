import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Bot, FolderKanban, Globe, CreditCard,
  Settings, ChevronLeft, ChevronRight, Zap
} from "lucide-react";
import logo from "@/assets/logo.png";

const navItems = [
  { icon: LayoutDashboard, label: "Overview", path: "/" },
  { icon: Bot, label: "AI Studio", path: "/ai" },
  { icon: FolderKanban, label: "Projects", path: "/projects" },
  { icon: Globe, label: "Community", path: "/community" },
  { icon: CreditCard, label: "Tokens", path: "/tokens" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <motion.aside
      className="h-screen glass-strong flex flex-col border-r border-border/50 sticky top-0"
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <img src={logo} alt="Stinger" className="w-9 h-9 flex-shrink-0" />
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-semibold text-foreground truncate"
          >
            Stinger Dev
          </motion.span>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map(({ icon: Icon, label, path }) => {
          const active = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? "bg-primary/10 text-primary glow-yellow"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Icon size={18} className={active ? "text-primary" : ""} />
              {!collapsed && <span>{label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-border/50">
        {!collapsed && (
          <div className="px-3 py-2 mb-2 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <Zap size={12} />
              <span className="font-medium">1,250 tokens</span>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </motion.aside>
  );
};

export default AppSidebar;
