import { motion } from "framer-motion";
import { Shield, Lock, Eye, FileText, Database, Key } from "lucide-react";

const sections = [
  {
    icon: Shield,
    title: "Data Protection",
    content: "All user data is encrypted at rest and in transit using industry-standard AES-256 encryption. We follow GDPR and data protection best practices.",
  },
  {
    icon: Lock,
    title: "Authentication Security",
    content: "We use secure authentication with password hashing (bcrypt), session tokens, and optional two-factor authentication. OAuth providers are verified and trusted.",
  },
  {
    icon: Eye,
    title: "Privacy Policy",
    content: "We collect only essential data needed to provide our services. Your code, projects, and AI conversations are private and not shared with third parties.",
  },
  {
    icon: Database,
    title: "Data Storage",
    content: "All data is stored in secure, SOC 2 compliant data centers. Row-Level Security (RLS) ensures users can only access their own data.",
  },
  {
    icon: Key,
    title: "API & Secrets",
    content: "Environment secrets and API keys are encrypted and stored securely. They are never exposed in client-side code or logs.",
  },
  {
    icon: FileText,
    title: "Terms of Service",
    content: "By using Stinger Dev, you agree to use the platform responsibly. Abuse, unauthorized access attempts, or violation of terms will result in account suspension.",
  },
];

const PrivacySecurity = () => (
  <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <p className="text-sm text-muted-foreground">Privacy & Security</p>
      <p className="text-xs text-muted-foreground mt-1">How we protect your data and privacy</p>
    </motion.div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {sections.map(({ icon: Icon, title, content }, i) => (
        <motion.div
          key={title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="glass rounded-xl p-5 hover:glow-yellow transition-all group liquid-chrome"
        >
          <Icon size={18} className="text-primary mb-3 group-hover:scale-110 transition-transform" />
          <p className="text-sm font-medium text-foreground mb-2">{title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{content}</p>
        </motion.div>
      ))}
    </div>

    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="glass rounded-xl p-5">
      <p className="text-xs text-muted-foreground">
        For security concerns or data requests, visit <a href="https://support.stinger.co.zw" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">support.stinger.co.zw</a>
      </p>
    </motion.div>
  </div>
);

export default PrivacySecurity;
