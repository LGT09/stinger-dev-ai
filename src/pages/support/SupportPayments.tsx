import { CreditCard, Smartphone, Building2, Bitcoin, ShieldCheck, Clock } from "lucide-react";
import { STINGER_LOGO } from "@/lib/branding";

const methods = [
  {
    icon: CreditCard,
    name: "Card payments",
    detail: "Visa, Mastercard and American Express, billed monthly in USD.",
    steps: ["Open Tokens and pick Pro or Business", "Choose Card at checkout", "Enter your card details — access unlocks instantly"],
  },
  {
    icon: Smartphone,
    name: "Mobile money",
    detail: "EcoCash, OneMoney and InnBucks for Zimbabwean users.",
    steps: ["Pick Mobile money at checkout", "Dial the USSD prompt sent to your phone", "Approve — your plan activates in under 2 minutes"],
  },
  {
    icon: Building2,
    name: "Bank transfer / invoice",
    detail: "For teams and Business plans. Invoices issued by Traxxion Tech.",
    steps: ["Email ceo@stinger.co.zw with your plan and team size", "We issue a PDF invoice", "Send proof of payment — we activate within 24 hours"],
  },
  {
    icon: Bitcoin,
    name: "Crypto",
    detail: "USDT (TRC-20) and Bitcoin accepted for annual plans.",
    steps: ["Request a wallet address from support", "Send the exact amount", "Share the transaction hash for instant activation"],
  },
];

const plans = [
  ["Free", "$0", "1,000 tokens monthly, 1 deployed site"],
  ["Pro", "$20 / mo", "25,000 tokens, unlimited sites, APK + desktop builds"],
  ["Business", "$50 / mo", "Unlimited tokens, team workspace, store-ready packaging, priority support"],
];

const SupportPayments = () => (
  <div className="space-y-5">
    <div className="glass rounded-2xl p-5 liquid-chrome flex items-start gap-4">
      <img src={STINGER_LOGO} alt="Stinger AI Dev logo" className="w-14 h-14 object-contain flex-shrink-0" />
      <div>
        <h2 className="text-base font-semibold text-foreground">Payments &amp; billing</h2>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Every plan is billed by Traxxion Tech. Pick the method that suits you — all payments unlock tokens,
          deployments and store-ready app packaging on the same account.
        </p>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-3">
      {plans.map(([name, price, perks]) => (
        <div key={name} className="glass rounded-2xl p-4 liquid-chrome">
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <p className="text-xl font-bold text-gradient mt-1">{price}</p>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">{perks}</p>
        </div>
      ))}
    </div>

    <div className="grid gap-3 md:grid-cols-2">
      {methods.map(({ icon: Icon, name, detail, steps }) => (
        <div key={name} className="glass rounded-2xl p-4 liquid-chrome">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icon size={16} className="text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">{name}</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{detail}</p>
          <ol className="space-y-1.5">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-2 text-[11px] text-muted-foreground">
                <span className="w-4 h-4 rounded-full bg-secondary text-[9px] flex items-center justify-center flex-shrink-0 mt-px">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>

    <div className="grid gap-3 sm:grid-cols-2">
      <div className="glass rounded-2xl p-4 flex gap-3">
        <ShieldCheck size={16} className="text-accent flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Card details never touch Stinger servers — checkout is handled by our PCI-compliant processor.
        </p>
      </div>
      <div className="glass rounded-2xl p-4 flex gap-3">
        <Clock size={16} className="text-primary flex-shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Refunds are available within 7 days of a charge. Email <span className="text-primary">ceo@stinger.co.zw</span> or open a ticket at support.stinger.co.zw.
        </p>
      </div>
    </div>
  </div>
);

export default SupportPayments;
