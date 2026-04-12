import { useEffect, useState } from "react";
import { Zap, FolderKanban, Bot, Globe, ArrowRight, Heart, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/StatCard";

const quickActions = [
  { icon: Bot, label: "New AI Chat", desc: "Generate code with AI", path: "/ai" },
  { icon: FolderKanban, label: "Create Project", desc: "Start a new project", path: "/projects" },
  { icon: Globe, label: "Browse Community", desc: "Discover published apps", path: "/community" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { profile, tokenBalance, user } = useAuth();
  const [projectCount, setProjectCount] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("projects").select("id, is_published").eq("user_id", user.id).then(({ data }) => {
      setProjectCount(data?.length ?? 0);
      setPublishedCount(data?.filter((p) => p.is_published).length ?? 0);
    });
    supabase.from("token_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5).then(({ data }) => {
      setRecentActivity(data ?? []);
    });
  }, [user]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">
          Welcome back{profile?.display_name ? `, ${profile.display_name}` : ""}
          {profile?.is_verified && <span className="text-blue-400 ml-1">✔</span>}
        </p>
        <p className="text-lg font-medium text-foreground mt-1">Here's your overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Zap} label="Tokens" value={tokenBalance.toLocaleString()} change="Available" index={0} />
        <StatCard icon={FolderKanban} label="Projects" value={String(projectCount)} change={`${publishedCount} published`} index={1} />
        <StatCard icon={Bot} label="AI Requests" value={String(recentActivity.length)} index={2} />
        <StatCard icon={Globe} label="Published" value={String(publishedCount)} index={3} />
      </div>

      <div>
        <p className="text-sm text-muted-foreground mb-3">Quick actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {quickActions.map(({ icon: Icon, label, desc, path }, i) => (
            <motion.button
              key={path}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.1 }}
              onClick={() => navigate(path)}
              className="glass rounded-xl p-4 text-left hover:glow-yellow transition-all group"
            >
              <div className="flex items-center justify-between mb-2">
                <Icon size={18} className="text-primary" />
                <ArrowRight size={14} className="text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Credits to developer */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Star size={14} className="text-primary" />
          <p className="text-sm text-muted-foreground">Credits</p>
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>🔥 Built by <span className="text-foreground font-medium">Vincent Ganiza</span> — Traxxion Tech</p>
          <p>🇿🇼 Made in Zimbabwe with ❤️</p>
          <p>📧 traxxiontech@gmail.com</p>
          <a href="https://www.facebook.com/TraxxionTech" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-block mt-1">
            Facebook →
          </a>
        </div>
      </div>

      <div className="glass rounded-xl p-5">
        <p className="text-sm text-muted-foreground mb-4">Recent activity</p>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-xs text-muted-foreground">No activity yet. Start using AI Studio!</p>
          ) : (
            recentActivity.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-foreground">{item.action}</span>
                <span className="text-xs text-muted-foreground">{item.amount > 0 ? `+${item.amount}` : item.amount}</span>
                <span className="text-xs text-muted-foreground ml-auto">{new Date(item.created_at).toLocaleDateString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
