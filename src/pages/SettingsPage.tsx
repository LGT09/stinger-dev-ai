import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, Monitor, Zap } from "lucide-react";

type Theme = "system" | "light" | "dark" | "neon";

const themes: { id: Theme; label: string; icon: React.ElementType }[] = [
  { id: "system", label: "System", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "neon", label: "Neon", icon: Zap },
];

const SettingsPage = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("stinger-theme") as Theme) || "neon";
  });

  useEffect(() => {
    const root = document.documentElement;
    localStorage.setItem("stinger-theme", theme);

    root.classList.remove("dark");
    root.removeAttribute("data-theme");

    if (theme === "neon") {
      root.setAttribute("data-theme", "neon");
    } else if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "system") {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark");
      }
    }
  }, [theme]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <p className="text-sm text-muted-foreground">Settings</p>

      <div className="glass rounded-xl p-5 space-y-4">
        <p className="text-sm font-medium text-foreground">Theme</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {themes.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                theme === id
                  ? "bg-primary/10 text-primary border border-primary/30"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-xl p-5 space-y-3">
        <p className="text-sm font-medium text-foreground">Account</p>
        <div className="text-xs text-muted-foreground space-y-2">
          <p>Email: user@example.com</p>
          <p>Plan: Free</p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass rounded-xl p-5 space-y-3"
      >
        <p className="text-sm font-medium text-foreground">Contact</p>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Developer: Vincent Ganiza — Traxxion Tech</p>
          <p>📧 traxxiontech@gmail.com</p>
          <p>📱 +263 716 857 999 / +263 780 078 177</p>
          <a
            href="https://www.facebook.com/TraxxionTech"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline inline-block mt-1"
          >
            Facebook →
          </a>
        </div>
      </motion.div>
    </div>
  );
};

export default SettingsPage;
