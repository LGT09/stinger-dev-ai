import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Book, Code, Zap, Users, Shield, Share2, Bot, ChevronDown, ChevronRight, Sparkles } from "lucide-react";

const sections = [
  {
    id: "getting-started",
    icon: Sparkles,
    title: "Getting Started",
    content: `## Welcome to Stinger Dev

Stinger Dev is an AI-powered software development platform created by **Vincent Ganiza** (Traxxion Tech).

### Quick Start
1. **Sign up** with email or Google
2. **Choose a mode** — Chat, Code, Image, Video, or Music
3. **Describe** what you want to create
4. **Review** the generated output
5. **Save** as a project, publish, or download

### Your Dashboard
- **Overview** — see your stats, tokens, and recent activity
- **AI Studio** — the main AI workspace
- **Projects** — manage all your saved projects
- **Community** — browse and fork published projects
- **Tokens** — view balance and purchase more
- **Settings** — customize your profile and theme`,
  },
  {
    id: "ai-studio",
    icon: Bot,
    title: "AI Studio",
    content: `## AI Studio Guide

### Modes
- **💬 Chat Mode** — Discuss ideas and refine prompts before coding. No tokens charged for casual conversation.
- **💻 Code Mode** — Generate full project code. Supports App Builder, Website Builder, Bot Generator, API Generator, and DB Designer.
- **🖼️ Image Mode** — Generate images from text descriptions.
- **🎬 Video Mode** — Create video concepts, scripts, and storyboards.
- **🎵 Music Mode** — Compose music, lyrics, and audio concepts.

### Code Sub-Tools
When in Code mode, choose a specialization:
- **Code AI** — General full-stack code generation
- **App Builder** — Complete React/mobile applications
- **Website Builder** — HTML/CSS/JS websites
- **Bot Generator** — Chatbot logic and flows
- **API Generator** — RESTful API endpoints
- **DB Designer** — SQL schemas and migrations

### Features
- **Auto-save** — Code mode auto-creates a project
- **Chat History** — Access past conversations
- **Share** — Generate a public link to any chat
- **Download** — Export conversations as text files
- **Suggestions** — AI suggests next steps after coding
- **Attachments** — Attach code files for context`,
  },
  {
    id: "tokens",
    icon: Zap,
    title: "Token System",
    content: `## Token System

### How Tokens Work
Every AI interaction costs tokens. The cost depends on the mode and response size.

### Token Costs (approximate)
| Mode | Base Cost | Max Cost |
|------|-----------|----------|
| Chat | 2 tokens | 15 tokens |
| Code | 5 tokens | 50 tokens |
| Image | 8 tokens | 30 tokens |
| Video | 10 tokens | 50 tokens |
| Music | 8 tokens | 30 tokens |

### Getting Tokens
- **Default** — New users receive 1,000 tokens
- **Referrals** — Earn 300 tokens per referral
- **Monthly Refill** — Balances auto-refill on the 1st of each month
- **Purchase** — Buy token packages (contact admin)
- **Pro Plan** — 5,000 tokens/month + priority access

### When Tokens Run Out
- AI features are disabled until refill
- Share your referral link to earn more tokens
- Contact traxxiontech@gmail.com for custom packages`,
  },
  {
    id: "referrals",
    icon: Share2,
    title: "Referral Program",
    content: `## Referral Program

### How It Works
1. Find your referral code in **Settings**
2. Share the referral link with friends
3. When they sign up, **you get 300 bonus tokens**
4. **They get 200 bonus tokens** as a welcome gift

### Finding Your Referral Link
Go to **Settings** → **Referral Program** → Click **Copy Link**

### Rewards
- **Referrer** receives 300 tokens per successful referral
- **Referred user** receives 200 bonus tokens on top of their default 1,000
- No limit on referrals!`,
  },
  {
    id: "projects",
    icon: Code,
    title: "Projects",
    content: `## Project Management

### Creating Projects
- **Manual** — Click "New project" in Projects page
- **AI-generated** — Code mode auto-saves projects
- **Fork** — Fork community projects to your workspace

### Project Actions
- **View Code** — Preview generated code
- **Download** — Export as text file
- **Publish** — Share to the community
- **Delete** — Remove from your projects

### Publishing
Click the globe icon on any project to publish it to the community. Other users can view the code and fork it.`,
  },
  {
    id: "admin",
    icon: Shield,
    title: "Admin Guide",
    content: `## Admin Dashboard

### Access
Admin access is granted to **traxxiontech@gmail.com** automatically.

### User Management
- **Grant/Deduct Tokens** — Adjust user balances
- **Verify Users** — Grant verified badge
- **Ban/Suspend** — Block users with a reason
- **Plan Management** — Switch users between Free and Pro

### Token Pricing
Edit pricing tiers directly from the admin dashboard. Changes are reflected immediately on the Tokens page.

### Monitoring
- View total users, tokens, and banned accounts
- Search users by name or email`,
  },
];

const Documentation = () => {
  const [activeSection, setActiveSection] = useState("getting-started");

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Book size={16} className="text-primary" />
        <p className="text-sm text-muted-foreground">Documentation</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <nav className="hidden md:block w-48 flex-shrink-0 space-y-1">
          {sections.map(({ id, icon: Icon, title }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                activeSection === id
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              <Icon size={14} />
              {title}
            </button>
          ))}
        </nav>

        {/* Mobile nav */}
        <div className="md:hidden w-full mb-4">
          <div className="flex flex-wrap gap-1.5">
            {sections.map(({ id, icon: Icon, title }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  activeSection === id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <Icon size={10} /> {title}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {sections.filter(s => s.id === activeSection).map(section => (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass rounded-xl p-6"
              >
                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-code:text-primary prose-table:text-sm">
                  {section.content.split("\n").map((line, i) => {
                    if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-semibold text-foreground mb-3">{line.slice(3)}</h2>;
                    if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-medium text-foreground mt-4 mb-2">{line.slice(4)}</h3>;
                    if (line.startsWith("- **")) {
                      const [, bold, rest] = line.match(/- \*\*(.+?)\*\*(.*)/) || [];
                      return <p key={i} className="text-xs text-muted-foreground ml-2 mb-1">• <strong className="text-foreground">{bold}</strong>{rest}</p>;
                    }
                    if (line.startsWith("- ")) return <p key={i} className="text-xs text-muted-foreground ml-2 mb-1">• {line.slice(2)}</p>;
                    if (/^\d+\./.test(line)) return <p key={i} className="text-xs text-muted-foreground ml-2 mb-1">{line}</p>;
                    if (line.startsWith("|")) return null; // skip table markup
                    if (line.trim() === "") return <br key={i} />;
                    return <p key={i} className="text-xs text-muted-foreground mb-1">{line}</p>;
                  })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Documentation;
