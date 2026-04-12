import { Zap, FolderKanban, Bot, Globe, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import StatCard from "@/components/StatCard";

const quickActions = [
  { icon: Bot, label: "New AI Chat", desc: "Generate code with AI", path: "/ai" },
  { icon: FolderKanban, label: "Create Project", desc: "Start a new project", path: "/projects" },
  { icon: Globe, label: "Browse Community", desc: "Discover published apps", path: "/community" },
];

const Dashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <p className="text-lg font-medium text-foreground mt-1">Here's your overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Zap} label="Tokens" value="1,250" change="+200 this week" index={0} />
        <StatCard icon={FolderKanban} label="Projects" value="8" change="2 active" index={1} />
        <StatCard icon={Bot} label="AI Requests" value="342" change="+45 today" index={2} />
        <StatCard icon={Globe} label="Published" value="3" index={3} />
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

      <div className="glass rounded-xl p-5">
        <p className="text-sm text-muted-foreground mb-4">Recent activity</p>
        <div className="space-y-3">
          {["Created project 'E-commerce App'", "Generated API endpoint with AI", "Published 'Portfolio Site' to community"].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-foreground">{item}</span>
              <span className="text-xs text-muted-foreground ml-auto">{i === 0 ? "2h ago" : i === 1 ? "5h ago" : "1d ago"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
