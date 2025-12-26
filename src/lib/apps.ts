export interface VeloxApp {
  slug: string;
  name: string;
  tagline: string;
  icon: string;
  color: string;
  url: string;
  status: "available" | "coming-soon";
  free?: boolean; // If true, no subscription required
  stripePriceId?: string;
  monthlyPrice?: number;
}

// App URLs from environment variables (with production fallbacks)
const APP_URLS = {
  nota: process.env.NEXT_PUBLIC_NOTA_URL || "https://nota.veloxlabs.app",
  contacts: process.env.NEXT_PUBLIC_CONTACTS_URL || "https://contacts.veloxlabs.app",
  inventory: process.env.NEXT_PUBLIC_INVENTORY_URL || "https://inventory.veloxlabs.app",
  projects: process.env.NEXT_PUBLIC_PROJECTS_URL || "https://projects.veloxlabs.app",
};

export const veloxApps: VeloxApp[] = [
  {
    slug: "nota",
    name: "Velox Nota",
    tagline: "Beautiful markdown notes",
    icon: "📝",
    color: "#f59e0b",
    url: APP_URLS.nota,
    status: "available",
    free: true, // Free during beta
    stripePriceId: process.env.STRIPE_NOTA_PRICE_ID,
    monthlyPrice: 4.99,
  },
  {
    slug: "contacts",
    name: "Velox Contacts",
    tagline: "Smart contact management",
    icon: "👥",
    color: "#3b82f6",
    url: APP_URLS.contacts,
    status: "coming-soon",
    monthlyPrice: 2.99,
  },
  {
    slug: "inventory",
    name: "Velox Inventory",
    tagline: "Track everything you own",
    icon: "📦",
    color: "#10b981",
    url: APP_URLS.inventory,
    status: "coming-soon",
    monthlyPrice: 4.99,
  },
  {
    slug: "projects",
    name: "Velox Projects",
    tagline: "Simple project tracking",
    icon: "🎯",
    color: "#8b5cf6",
    url: APP_URLS.projects,
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
