export interface VeloxApp {
  slug: string;
  name: string;
  tagline: string;
  icon: string;
  color: string;
  url: string;
  status: "available" | "coming-soon";
  stripePriceId?: string;
  monthlyPrice?: number;
}

export const veloxApps: VeloxApp[] = [
  {
    slug: "nota",
    name: "Velox Nota",
    tagline: "Beautiful markdown notes",
    icon: "📝",
    color: "#f59e0b",
    // TODO: Update to https://nota.veloxlabs.app when domain is configured
    url: "https://velox-nota-c5iy9.ondigitalocean.app",
    status: "available",
    stripePriceId: process.env.STRIPE_NOTA_PRICE_ID,
    monthlyPrice: 4.99,
  },
  {
    slug: "contacts",
    name: "Velox Contacts",
    tagline: "Smart contact management",
    icon: "👥",
    color: "#3b82f6",
    url: "https://contacts.veloxlabs.app",
    status: "coming-soon",
    monthlyPrice: 2.99,
  },
  {
    slug: "inventory",
    name: "Velox Inventory",
    tagline: "Track everything you own",
    icon: "📦",
    color: "#10b981",
    url: "https://inventory.veloxlabs.app",
    status: "coming-soon",
    monthlyPrice: 4.99,
  },
  {
    slug: "projects",
    name: "Velox Projects",
    tagline: "Simple project tracking",
    icon: "🎯",
    color: "#8b5cf6",
    url: "https://projects.veloxlabs.app",
    status: "coming-soon",
    monthlyPrice: 5.99,
  },
];

export function getApp(slug: string): VeloxApp | undefined {
  return veloxApps.find((app) => app.slug === slug);
}

export function getAvailableApps(): VeloxApp[] {
  return veloxApps.filter((app) => app.status === "available");
}
