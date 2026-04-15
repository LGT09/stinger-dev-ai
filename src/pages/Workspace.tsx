import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, UserPlus, Mail, Shield, Crown, Trash2, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  addedAt: number;
}

const Workspace = () => {
  const { user, profile } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>(() => {
    const saved = localStorage.getItem("stinger-workspace");
    return saved ? JSON.parse(saved) : [{ id: "owner", email: user?.email || "", role: "owner", addedAt: Date.now() }];
  });
  const [inviteEmail, setInviteEmail] = useState("");

  useEffect(() => {
    localStorage.setItem("stinger-workspace", JSON.stringify(members));
  }, [members]);

  const inviteMember = () => {
    if (!inviteEmail.trim() || !inviteEmail.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    if (members.some(m => m.email === inviteEmail)) {
      toast.error("Already in workspace");
      return;
    }
    setMembers([...members, { id: Date.now().toString(), email: inviteEmail, role: "member", addedAt: Date.now() }]);
    const mailto = `mailto:${inviteEmail}?subject=Stinger Dev Workspace Invitation&body=You've been invited to join a Stinger Dev workspace. Sign up at ${window.location.origin}`;
    window.open(mailto);
    setInviteEmail("");
    toast.success("Invitation sent!");
  };

  const removeMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
    toast.success("Member removed");
  };

  const roleIcons = { owner: Crown, admin: Shield, member: Users };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <p className="text-sm text-muted-foreground">Workspace & Team</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Manage your team and workspace settings</p>
      </motion.div>

      {/* Invite */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass rounded-xl p-5 space-y-3 liquid-chrome">
        <div className="flex items-center gap-2">
          <UserPlus size={14} className="text-primary" />
          <p className="text-xs font-medium text-foreground">Invite Team Member</p>
        </div>
        <div className="flex gap-2">
          <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@email.com" className="flex-1 bg-secondary rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50" onKeyDown={e => e.key === "Enter" && inviteMember()} />
          <button onClick={inviteMember} className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-xs font-medium btn-hover flex items-center gap-2">
            <Mail size={12} /> Invite
          </button>
        </div>
      </motion.div>

      {/* Members */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass rounded-xl p-5">
        <p className="text-xs font-medium text-foreground mb-4">Team Members ({members.length})</p>
        <div className="space-y-2">
          {members.map(m => {
            const RoleIcon = roleIcons[m.role];
            return (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary/70 transition-all group">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <RoleIcon size={14} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-foreground truncate">{m.email}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{m.role}</p>
                </div>
                {m.role !== "owner" && (
                  <button onClick={() => removeMember(m.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Workspace ID */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass rounded-xl p-5">
        <p className="text-xs font-medium text-foreground mb-2">Workspace Settings</p>
        <div className="flex items-center gap-2">
          <code className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-1 rounded">{profile?.referral_code || "—"}</code>
          <button onClick={() => { navigator.clipboard.writeText(profile?.referral_code || ""); toast.success("Copied"); }} className="p-1 rounded text-muted-foreground hover:text-foreground">
            <Copy size={12} />
          </button>
          <span className="text-[10px] text-muted-foreground">Workspace ID</span>
        </div>
      </motion.div>
    </div>
  );
};

export default Workspace;
