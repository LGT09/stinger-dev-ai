import { ExternalLink, Server } from "lucide-react";

export const TRAXXION_API_PORTAL = "https://api.traxxion.stinger.co.zw";

/** Free API portal for builders who don't have their own provider keys. */
const SupportApis = () => (
  <div className="space-y-4">
    <div className="glass rounded-2xl p-5 liquid-chrome">
      <div className="flex items-center gap-2 mb-2">
        <Server size={18} className="text-primary" />
        <p className="text-sm font-medium text-foreground">Building without API keys?</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
        Traxxion hosts free, ready-to-use endpoints for chat, images, media and utility APIs. Grab a key there,
        then save it under Secrets so your generated projects can use it automatically.
      </p>
      <div className="flex flex-wrap gap-2">
        <a href={TRAXXION_API_PORTAL} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium btn-hover">
          <ExternalLink size={14} /> api.traxxion.stinger.co.zw
        </a>
        <a href="/secrets" className="inline-flex items-center gap-2 glass px-4 py-2 rounded-xl text-sm text-foreground btn-hover">
          Save a key in Secrets
        </a>
      </div>
    </div>
  </div>
);

export default SupportApis;
