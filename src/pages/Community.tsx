import { motion } from "framer-motion";
import { Globe, Heart, GitFork, Eye } from "lucide-react";

const mockApps = [
  { name: "Task Manager Pro", author: "user123", likes: 42, forks: 8, views: 320 },
  { name: "Weather Dashboard", author: "devhero", likes: 28, forks: 5, views: 180 },
  { name: "AI Chatbot Template", author: "aimaker", likes: 95, forks: 23, views: 870 },
  { name: "E-commerce Starter", author: "shopdev", likes: 61, forks: 15, views: 540 },
  { name: "Blog Platform", author: "writer99", likes: 33, forks: 9, views: 290 },
  { name: "Portfolio Builder", author: "designpro", likes: 77, forks: 18, views: 620 },
];

const Community = () => (
  <div className="p-6 max-w-5xl mx-auto space-y-6">
    <div className="flex items-center gap-2">
      <Globe size={16} className="text-primary" />
      <p className="text-sm text-muted-foreground">Community projects</p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {mockApps.map((app, i) => (
        <motion.div
          key={app.name}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass rounded-xl p-4 hover:glow-cyan transition-shadow cursor-pointer group"
        >
          <div className="w-full h-24 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 mb-3 flex items-center justify-center">
            <Globe size={24} className="text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-foreground">{app.name}</p>
          <p className="text-xs text-muted-foreground mb-3">by {app.author}</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Heart size={12} /> {app.likes}</span>
            <span className="flex items-center gap-1"><GitFork size={12} /> {app.forks}</span>
            <span className="flex items-center gap-1"><Eye size={12} /> {app.views}</span>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

export default Community;
