import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, Phone, MessageSquare, Send, ExternalLink, HelpCircle, AlertCircle, Lightbulb } from "lucide-react";
import { toast } from "sonner";

const ContactSupport = () => {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("general");

  const categories = [
    { id: "general", label: "General Inquiry", icon: MessageSquare },
    { id: "upgrade", label: "Account Upgrade", icon: Lightbulb },
    { id: "bug", label: "Bug Report", icon: AlertCircle },
    { id: "support", label: "Technical Support", icon: HelpCircle },
  ];

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    const mailto = `mailto:info@stinger.indevs.in?cc=traxxiontech@gmail.com&subject=[${category}] ${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.location.href = mailto;
    toast.success("Opening email client...");
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <p className="text-sm text-muted-foreground">Contact & Support</p>
        <p className="text-xs text-muted-foreground mt-1">Get help, report bugs, or request features</p>
      </motion.div>

      {/* Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-5 liquid-chrome hover:glow-yellow transition-all group">
          <Mail size={18} className="text-primary mb-3 group-hover:scale-110 transition-transform" />
          <p className="text-sm font-medium text-foreground">Email Support</p>
          <a href="mailto:info@stinger.indevs.in" className="text-xs text-primary hover:underline block mt-1">info@stinger.indevs.in</a>
          <a href="mailto:traxxiontech@gmail.com" className="text-xs text-muted-foreground hover:underline block">traxxiontech@gmail.com</a>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-5 liquid-chrome hover:glow-cyan transition-all group">
          <Phone size={18} className="text-accent mb-3 group-hover:scale-110 transition-transform" />
          <p className="text-sm font-medium text-foreground">Phone</p>
          <p className="text-xs text-muted-foreground mt-1">+263 716 857 999</p>
          <p className="text-xs text-muted-foreground">+263 780 078 177</p>
        </motion.div>
      </div>

      {/* Contact Form */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-xl p-5 space-y-4">
        <p className="text-xs font-medium text-foreground">Send a Message</p>

        <div className="flex flex-wrap gap-2">
          {categories.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setCategory(id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all btn-hover ${category === id ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject" className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" />
        <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Describe your issue or inquiry..." rows={4} className="w-full bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none" />
        <button onClick={handleSubmit} className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-xs font-medium hover:opacity-90 flex items-center gap-2 btn-hover">
          <Send size={12} /> Send Message
        </button>
      </motion.div>

      {/* Social */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass rounded-xl p-5">
        <p className="text-xs font-medium text-foreground mb-3">Connect With Us</p>
        <div className="flex gap-3">
          <a href="https://www.facebook.com/TraxxionTech" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-sm text-foreground hover:bg-primary/10 hover:text-primary transition-all btn-hover">
            <ExternalLink size={12} /> Facebook
          </a>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Developer: Vincent Ganiza — Traxxion Tech 🇿🇼</p>
      </motion.div>
    </div>
  );
};

export default ContactSupport;
