export type SearchCategory =
  | "Product"
  | "Solutions"
  | "Resources"
  | "Company"
  | "Legal";

export type SearchEntry = {
  title: string;
  to: string;
  category: SearchCategory;
  description: string;
  keywords?: string[];
};

export const SEARCH_INDEX: SearchEntry[] = [
  { title: "CRM", to: "/product/crm", category: "Product", description: "AI-native CRM for real estate — leads, pipelines, site visits.", keywords: ["leads", "pipeline", "sales", "site visit"] },
  { title: "ERP", to: "/product/erp", category: "Product", description: "Finance, collections, inventory and project accounting.", keywords: ["finance", "collections", "inventory", "accounting"] },
  { title: "Marketplace", to: "/product/marketplace", category: "Product", description: "Verified developer inventory with AI investment scores.", keywords: ["properties", "listings", "inventory"] },
  { title: "AI Voice", to: "/product/ai-voice", category: "Product", description: "Voice AI cockpit for outbound and inbound conversations.", keywords: ["voice", "calls", "cockpit"] },
  { title: "Marketing Cloud", to: "/product/marketing-cloud", category: "Product", description: "Cross-channel campaigns, journeys and attribution.", keywords: ["campaigns", "marketing", "email", "whatsapp"] },
  { title: "Business Intelligence", to: "/product/bi", category: "Product", description: "Executive dashboards and real-time analytics.", keywords: ["bi", "dashboard", "analytics", "reports"] },
  { title: "For Developers", to: "/solutions/developers", category: "Solutions", description: "End-to-end platform for large developers." },
  { title: "For Brokers", to: "/solutions/brokers", category: "Solutions", description: "Mobile-first CRM and verified inventory for brokers." },
  { title: "For Channel Partners", to: "/solutions/channel-partners", category: "Solutions", description: "Lead sharing, commissions and deal rooms." },
  { title: "For Enterprises", to: "/solutions/enterprises", category: "Solutions", description: "Multi-entity governance, SSO and audit trails." },
  { title: "Documentation", to: "/resources/documentation", category: "Resources", description: "Official product documentation for admins and developers." },
  { title: "Knowledge Base", to: "/resources/knowledge-base", category: "Resources", description: "Searchable how-to articles and troubleshooting." },
  { title: "Blog", to: "/resources/blog", category: "Resources", description: "Industry insights and product announcements." },
  { title: "API Docs", to: "/resources/api", category: "Resources", description: "REST APIs, webhooks and SDKs." },
  { title: "Release Notes", to: "/resources/release-notes", category: "Resources", description: "What's new across the Sentinel platform." },
  { title: "Case Studies", to: "/resources/case-studies", category: "Resources", description: "Customer outcomes and measurable results." },
  { title: "Customer Stories", to: "/resources/customers", category: "Resources", description: "Narratives from developers, brokers and partners." },
  { title: "Help Center", to: "/resources/help", category: "Resources", description: "Support channels, SLAs and contact." },
  { title: "Community", to: "/resources/community", category: "Resources", description: "Forums, meetups, certifications and open source." },
  { title: "System Status", to: "/resources/status", category: "Resources", description: "Realtime uptime and incident history." },
  { title: "About", to: "/about", category: "Company", description: "Mission, vision, values and timeline." },
  { title: "Careers", to: "/careers", category: "Company", description: "Open roles, benefits and culture." },
  { title: "Press", to: "/press", category: "Company", description: "Press kit, announcements and media contact." },
  { title: "Contact", to: "/contact", category: "Company", description: "Talk to sales, support or investor relations." },
  { title: "Privacy", to: "/privacy", category: "Legal", description: "How Sentinel collects and processes personal data." },
  { title: "Terms", to: "/terms", category: "Legal", description: "Terms of service for Sentinel customers." },
  { title: "Security", to: "/security", category: "Legal", description: "Certifications, encryption and controls." },
  { title: "DPA", to: "/dpa", category: "Legal", description: "Data Processing Addendum for GDPR/DPDP compliance." },
];

export const SEARCH_CATEGORIES: SearchCategory[] = ["Product", "Solutions", "Resources", "Company", "Legal"];

export function searchEntries(query: string, category?: SearchCategory | "All"): SearchEntry[] {
  const q = query.trim().toLowerCase();
  return SEARCH_INDEX.filter((e) => {
    if (category && category !== "All" && e.category !== category) return false;
    if (!q) return true;
    const hay = [e.title, e.description, e.category, ...(e.keywords ?? [])].join(" ").toLowerCase();
    return hay.includes(q);
  });
}

export function relatedEntries(to: string, limit = 4) {
  const current = SEARCH_INDEX.find((e) => e.to === to);
  if (!current) return [];
  return SEARCH_INDEX.filter((e) => e.to !== to && e.category === current.category).slice(0, limit);
}

export function breadcrumbsFor(to: string): { label: string; to?: string }[] {
  const entry = SEARCH_INDEX.find((e) => e.to === to);
  const crumbs: { label: string; to?: string }[] = [{ label: "Home", to: "/" }];
  if (!entry) return crumbs;
  const parent = to.split("/")[1];
  const parentLabel: Record<string, { label: string; to: string }> = {
    product: { label: "Product", to: "/product/crm" },
    solutions: { label: "Solutions", to: "/solutions/developers" },
    resources: { label: "Resources", to: "/resources" },
  };
  if (parent && parentLabel[parent]) crumbs.push(parentLabel[parent]);
  else if (entry.category === "Company" || entry.category === "Legal") crumbs.push({ label: entry.category, to: "/" });
  crumbs.push({ label: entry.title });
  return crumbs;
}
