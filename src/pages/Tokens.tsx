import { motion } from "framer-motion";
import { Zap, TrendingUp, ArrowUpRight } from "lucide-react";
import StatCard from "@/components/StatCard";

const usageHistory = [
  { action: "Code generation", tokens: -15, time: "2h ago" },
  { action: "Image generation", tokens: -25, time: "4h ago" },
  { action: "Daily bonus", tokens: 50, time: "8h ago" },
  { action: "Code generation", tokens: -10, time: "1d ago" },
  { action: "Video generation", tokens: -40, time: "1d ago" },
];

const Tokens = () => (
  <div className="p-6 max-w-5xl mx-auto space-y-6">
    <p className="text-sm text-muted-foreground">Tokens & subscription</p>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard icon={Zap} label="Balance" value="1,250" change="Active" index={0} />
      <StatCard icon={TrendingUp} label="Used this month" value="580" change="23 requests" index={1} />
      <StatCard icon={ArrowUpRight} label="Plan" value="Free" index={2} />
    </div>

    <div className="glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Upgrade to Pro</p>
        <a
          href="mailto:traxxiontech@gmail.com?subject=Stinger Dev Pro Upgrade"
          className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          Contact to upgrade
        </a>
      </div>
      <p className="text-xs text-muted-foreground">
        Pro users get 5,000 tokens/month, priority AI, and advanced features. Contact traxxiontech@gmail.com to upgrade.
      </p>
    </div>

    <div className="glass rounded-xl p-5">
      <p className="text-sm text-muted-foreground mb-4">Usage history</p>
      <div className="space-y-3">
        {usageHistory.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center justify-between text-sm"
          >
            <span className="text-foreground">{item.action}</span>
            <div className="flex items-center gap-4">
              <span className={item.tokens > 0 ? "text-accent" : "text-muted-foreground"}>
                {item.tokens > 0 ? "+" : ""}{item.tokens}
              </span>
              <span className="text-xs text-muted-foreground w-16 text-right">{item.time}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </div>
);

export default Tokens;
