const faqs = [
  ["Why is my deployed site blank?", "Re-deploy it. Stinger now compiles React/JSX projects in the browser, so freshly deployed sites render instead of showing an empty page."],
  ["Can I rename a deployed site?", "Yes — pick a new site name in the deploy dialog. The old URL is released automatically and becomes available to everyone again."],
  ["How do I take a site down?", "Open Deployments, then use Take offline (reversible) or Delete (frees the name permanently)."],
  ["How do tokens work?", "Every AI action spends tokens from your balance. Balances auto-refill on the 1st of each month, and referrals add bonus tokens."],
  ["What is the default AI model?", "GAGA AI Nexus is the default model across chat, code and build modes. You can switch models any time from the model picker."],
  ["I have no API keys — what now?", "Use the free endpoints at api.traxxion.stinger.co.zw, listed on the Free APIs tab."],
];

const SupportFAQ = () => (
  <div className="space-y-3">
    {faqs.map(([q, a]) => (
      <details key={q} className="glass rounded-2xl p-4 liquid-chrome">
        <summary className="text-sm font-medium text-foreground cursor-pointer">{q}</summary>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{a}</p>
      </details>
    ))}
  </div>
);

export default SupportFAQ;
