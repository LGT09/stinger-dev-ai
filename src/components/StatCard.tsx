import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  change?: string;
  index?: number;
}

const StatCard = ({ icon: Icon, label, value, change, index = 0 }: StatCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    whileHover={{ y: -4, scale: 1.02 }}
    className="glass rounded-xl p-5 hover:glow-yellow transition-all liquid-chrome hover-lift group"
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Icon size={16} className="text-primary group-hover:scale-110 transition-transform" />
    </div>
    <p className="text-2xl font-semibold text-foreground">{value}</p>
    {change && <p className="text-xs text-accent mt-1">{change}</p>}
  </motion.div>
);

export default StatCard;
