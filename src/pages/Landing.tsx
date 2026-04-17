import { motion } from "framer-motion";
import { Bot, Code, Image as ImageIcon, Video, Music, FolderKanban, Globe, Zap, Shield, GitBranch, Database, Users, Sparkles, ArrowRight, Check } from "lucide-react";
import logo from "@/assets/logo.png";

interface Props {
  onGetStarted: () => void;
}

const features = [
  { icon: Bot, title: "Stinger AI Chat", desc: "Discuss & plan projects with an AI built by Vincent Ganiza." },
  { icon: Code, title: "AI Code Builder", desc: "Generates full project file trees with terminal & live preview." },
  { icon: Globe, title: "Website Builder", desc: "Build responsive websites — view them live, not just as code." },
  { icon: ImageIcon, title: "AI Image Studio", desc: "Generate images, watermarked & downloadable as PNG." },
  { icon: Video, title: "AI Video Studio", desc: "Pick aspect ratio, duration & quality — generate cinematic clips." },
  { icon: Music, title: "AI Song Maker", desc: "Compose tracks with custom length & style." },
  { icon: FolderKanban, title: "Projects + ZIP Export", desc: "Open files, edit, transfer, publish — export as full ZIP." },
  { icon: GitBranch, title: "GitHub Push", desc: "Push generated repos to GitHub with custom repo names." },
  { icon: Database, title: "Supabase Integration", desc: "Connect your Supabase, push schemas & code straight in." },
  { icon: Users, title: "Workspace & Teams", desc: "Invite teammates, share projects, manage roles." },
  { icon: Shield, title: "Admin Guardian AI", desc: "Auto-detects abuse, can warn / suspend / ban users." },
  { icon: Sparkles, title: "Token Refills", desc: "Monthly auto-refill, referral rewards, fair limits." },
];

const Landing = ({ onGetStarted }: Props) => {
  return (
    <div className="min-h-screen bg-background text-foreground" data-theme="neon">
      {/* Hero */}
      <section className="relative overflow-hidden liquid-chrome-intense">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-8">
            <motion.img src={logo} alt="Stinger" className="w-12 h-12" whileHover={{ scale: 1.1, rotate: 6 }} />
            <div>
              <p className="text-lg font-bold text-gradient">Stinger AI Dev</p>
              <p className="text-[10px] text-muted-foreground">by Vincent Ganiza · Traxxion Tech 🇿🇼</p>
            </div>
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-4">
            Build apps, sites, images, videos & songs <span className="text-gradient">with one AI.</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-muted-foreground max-w-2xl mb-8">
            Stinger AI Dev is a complete creative dev studio: chat, code, generate media, push to GitHub, publish to community,
            and ship — all in one liquid-chrome workspace.
          </motion.p>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-3 mb-12">
            <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={onGetStarted}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 btn-hover glow-yellow">
              Get started <ArrowRight size={16} />
            </motion.button>
            <motion.a whileHover={{ scale: 1.05 }} href="#features"
              className="glass px-6 py-3 rounded-xl text-sm font-medium hover:glow-cyan transition-all">
              Explore features
            </motion.a>
          </motion.div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
            {[
              { v: "5+", l: "AI modes" },
              { v: "1000", l: "Free tokens / mo" },
              { v: "ZIP", l: "Full exports" },
              { v: "∞", l: "Possibilities" },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
                className="glass rounded-xl p-3 text-center liquid-chrome hover-lift">
                <p className="text-xl font-bold text-gradient">{s.v}</p>
                <p className="text-[10px] text-muted-foreground">{s.l}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-10">
          <p className="text-xs text-primary mb-2 uppercase tracking-wider">Everything inside</p>
          <h2 className="text-2xl sm:text-3xl font-bold">A full creative dev OS</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
            See what you'll get the moment you sign up — no credit card, no friction.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div key={title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="glass rounded-xl p-4 hover:glow-cyan transition-all hover-lift group">
              <Icon size={20} className="text-primary mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="text-xs text-muted-foreground mt-1">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* What you can build */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="glass rounded-2xl p-6 sm:p-8 liquid-chrome">
          <h3 className="text-xl sm:text-2xl font-bold mb-4">What you can build today</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              "Full React / Next.js apps",
              "Mobile apps (React Native)",
              "Marketing websites with live preview",
              "REST APIs & database schemas",
              "Discord / Telegram / WhatsApp bots",
              "Marketing images & social posts",
              "Short cinematic videos & ads",
              "Original songs & background tracks",
            ].map((b, i) => (
              <motion.div key={b} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2 text-sm text-foreground">
                <Check size={14} className="text-accent flex-shrink-0" />
                {b}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
          className="glass-strong rounded-2xl p-8 liquid-chrome-intense border-glow">
          <Zap size={32} className="text-primary mx-auto mb-3 pulse-glow" />
          <h3 className="text-2xl font-bold mb-2">Ready to ship faster?</h3>
          <p className="text-sm text-muted-foreground mb-5">Sign up now and get <span className="text-primary font-semibold">1,000 free tokens</span> instantly.</p>
          <motion.button whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} onClick={onGetStarted}
            className="bg-primary text-primary-foreground px-8 py-3 rounded-xl text-sm font-semibold btn-hover glow-yellow">
            Start building →
          </motion.button>
        </motion.div>
        <p className="text-[10px] text-muted-foreground mt-6">
          📧 info@stinger.indevs.in · traxxiontech@gmail.com · 📱 +263 716 857 999
        </p>
      </section>
    </div>
  );
};

export default Landing;
