import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard, Bot, FolderKanban, Globe, CreditCard,
  Settings, ChevronLeft, ChevronRight, Zap, Shield, Book,
  Mail, Lock, Key, Users, GitBranch, Wallet, Rocket, LifeBuoy, TerminalSquare,
  Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import logo from "@/assets/logo.png";

const AppSidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { isAdmin, tokenBalance, profile } = useAuth();

  // Close the mobile drawer whenever the route changes.
  useEffect(() => { setOpen(false); }, [location.pathname]);

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
    { icon: TerminalSquare, label: "Stinger SSH", path: "/ssh" },
    { icon: Users, label: "Workspace", path: "/workspace" },
    { icon: Book, label: "Docs", path: "/docs" },
    { icon: Lock, label: "Privacy", path: "/privacy" },
    { icon: Mail, label: "Support", path: "/contact" },
    { icon: LifeBuoy, label: "Help center", path: "/support" },
    { icon: Settings, label: "Settings", path: "/settings" },
    ...(isAdmin ? [{ icon: Shield, label: "Admin", path: "/admin" }] : []),
  ];

  const showLabels = isMobile || !collapsed;

  const NavList = () => (
    <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
      {navItems.map(({ icon: Icon, label, path }) => {
        const active = location.pathname === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all hover:translate-x-1 ${
              active
                ? "bg-primary/10 text-primary glow-yellow border-glow"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
            }`}
          >
            <Icon size={16} className={active ? "text-primary" : ""} />
            {showLabels && <span className="truncate">{label}</span>}
          </button>
        );
      })}
    </nav>
  );

  const Footer = () => (
    <div className="p-2 border-t border-border/50">
      {showLabels && (
        <button
          onClick={() => navigate("/wallet")}
          className="w-full px-3 py-2 mb-2 rounded-lg bg-primary/5 border border-primary/20 shimmer text-left hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-center gap-1.5 text-xs text-primary relative z-10">
            <Zap size={12} className="pulse-glow" />
            <span className="font-medium">{tokenBalance.toLocaleString()} tokens</span>
            {tokenBalance === 0 && <span className="ml-auto text-[9px] text-destructive">Top up</span>}
          </div>
        </button>
      )}
      {!isMobile && (
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all hover:scale-105"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <>
        <header className="fixed top-0 inset-x-0 z-40 glass-strong border-b border-border/50 flex items-center gap-3 px-3 h-14">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
            className="p-2 rounded-lg text-foreground hover:bg-secondary transition-all"
          >
            <Menu size={18} />
          </button>
          <img src={logo} alt="Stinger AI Dev" className="w-7 h-7" />
          <span className="text-sm font-semibold text-gradient">Stinger Dev</span>
          <button
            onClick={() => navigate("/wallet")}
            className="ml-auto flex items-center gap-1 text-xs text-primary px-2 py-1 rounded-lg bg-primary/10"
          >
            <Zap size={11} /> {tokenBalance.toLocaleString()}
          </button>
        </header>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            >
              <motion.aside
                initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                onClick={e => e.stopPropagation()}
                className="h-full w-[264px] glass-strong border-r border-border/50 flex flex-col liquid-chrome"
              >
                <div className="flex items-center gap-3 p-4 border-b border-border/50">
                  <img src={logo} alt="Stinger AI Dev" className="w-8 h-8" />
                  <span className="text-sm font-semibold text-gradient">Stinger Dev</span>
                  {profile?.is_verified && <span className="text-blue-400 text-xs">✔</span>}
                  <button onClick={() => setOpen(false)} aria-label="Close navigation" className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary">
                    <X size={16} />
                  </button>
                </div>
                <NavList />
                <Footer />
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <motion.aside
      className="h-screen glass-strong flex flex-col border-r border-border/50 sticky top-0 liquid-chrome"
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <motion.img
          src={logo}
          alt="Stinger AI Dev"
          className="w-9 h-9 flex-shrink-0"
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: "spring", stiffness: 400 }}
        />
        {!collapsed && (
          <div className="truncate">
            <span className="text-sm font-semibold text-gradient">Stinger Dev</span>
            {profile?.is_verified && <span className="text-blue-400 ml-1 text-xs">✔</span>}
          </div>
        )}
      </div>
      <NavList />
      <Footer />
    </motion.aside>
  );
};

export default AppSidebar;
