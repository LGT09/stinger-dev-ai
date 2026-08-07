import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Bot, FolderKanban, Globe, CreditCard,
  Settings, ChevronLeft, ChevronRight, Zap, Shield, Book,
  Mail, Lock, Key, Users, GitBranch, Wallet, Rocket, LifeBuoy
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, tokenBalance, profile } = useAuth();

  const navItems = [
    { icon: LayoutDashboard, label: "Overview", path: "/" },
    { icon: Bot, label: "AI Studio", path: "/ai" },
    { icon: FolderKanban, label: "Projects", path: "/projects" },
    { icon: Rocket, label: "Deployments", path: "/deployments" },
    { icon: Globe, label: "Community", path: "/community" },
    { icon: GitBranch, label: "CodeVerse", path: "/integrations/codeverse" },
    { icon: CreditCard, label: "Tokens", path: "/tokens" },
    { icon: Wallet, label: "Wallet", path: "/wallet" },
    { icon: Key, label: "Secrets", path: "/secrets" },
    { icon: Users, label: "Workspace", path: "/workspace" },
    { icon: Book, label: "Docs", path: "/docs" },
    { icon: Lock, label: "Privacy", path: "/privacy" },
    { icon: Mail, label: "Support", path: "/contact" },
    { icon: LifeBuoy, label: "Help center", path: "/support" },
    { icon: Settings, label: "Settings", path: "/settings" },
    ...(isAdmin ? [{ icon: Shield, label: "Admin", path: "/admin" }] : []),
  ];

  return (
    <motion.aside
      className="h-screen glass-strong flex flex-col border-r border-border/50 sticky top-0 liquid-chrome"
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <motion.img
          src={logo}
          alt="Stinger"
          className="w-9 h-9 flex-shrink-0"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400 }}
        />
        {!collapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="truncate">
            <span className="text-sm font-semibold text-gradient">Stinger Dev</span>
            {profile?.is_verified && <span className="text-blue-400 ml-1 text-xs">✔</span>}
          </motion.div>
        )}
      </div>

      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, path }, i) => {
          const active = location.pathname === path;
          return (
            <motion.button
              key={path}
              onClick={() => navigate(path)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ x: 4 }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                active
                  ? "bg-primary/10 text-primary glow-yellow border-glow"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              }`}
            >
              <Icon size={16} className={active ? "text-primary" : ""} />
              {!collapsed && <span className="truncate">{label}</span>}
            </motion.button>
          );
        })}
      </nav>

      <div className="p-2 border-t border-border/50">
        {!collapsed && (
          <motion.button
            onClick={() => navigate("/wallet")}
            className="w-full px-3 py-2 mb-2 rounded-lg bg-primary/5 border border-primary/20 shimmer text-left"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-1.5 text-xs text-primary relative z-10">
              <Zap size={12} className="pulse-glow" />
              <span className="font-medium">{tokenBalance.toLocaleString()} tokens</span>
              {tokenBalance === 0 && <span className="ml-auto text-[9px] text-destructive">Top up</span>}
            </div>
          </motion.button>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all hover:scale-105"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </motion.aside>
  );
};

export default AppSidebar;
