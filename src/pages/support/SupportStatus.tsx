const services = [
  ["AI Studio", "operational"],
  ["Image & media generation", "operational"],
  ["Deployments", "operational"],
  ["APK builds", "operational"],
  ["Email delivery", "operational"],
];

const SupportStatus = () => (
  <div className="glass rounded-2xl p-5 liquid-chrome space-y-2">
    {services.map(([name, state]) => (
      <div key={name} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
        <span className="text-sm text-foreground">{name}</span>
        <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent/20 text-accent capitalize">{state}</span>
      </div>
    ))}
  </div>
);

export default SupportStatus;
