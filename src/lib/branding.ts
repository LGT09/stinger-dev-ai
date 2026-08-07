import logoAsset from "@/assets/stinger-logo.png.asset.json";

/** In-app logo (CDN pointer) — use for React <img> tags. */
export const STINGER_LOGO = logoAsset.url;

/**
 * Absolute logo URL for contexts that leave the app bundle:
 * transactional emails, deployed-site badges, OG tags.
 */
export const STINGER_LOGO_ABSOLUTE = "https://nova-build-verse.lovable.app/logo.png";

export const BRAND = {
  name: "Stinger AI Dev",
  site: "https://stinger.co.zw",
  support: "https://support.stinger.co.zw",
  ceo: "ceo@stinger.co.zw",
  gold: "#ffd400",
  ink: "#0f1216",
} as const;
