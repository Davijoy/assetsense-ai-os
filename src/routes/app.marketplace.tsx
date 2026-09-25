import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useActiveEntity } from "@/lib/active-entity";
import { PropertyWizard, type EditPropertyInput } from "@/components/app/PropertyWizard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Bed,
  Square,
  TrendingUp,
  Search,
  Heart,
  Sparkles,
  ArrowUpRight,
  Scale,
  Building2,
  Edit3,
  Trash2,
  Plus,
  AlertTriangle,
  Loader2,
  X,
  Image as ImageIcon,
  FileText,
  Download,
  Eye,
  ShieldCheck,
  CheckCircle2,
  Video,
  Play,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import {
  getMarketplaceInventoryServer,
  deleteMarketplacePropertyServer,
  type ServerProperty,
  computeConfig,
  computeSize,
  formatPriceInr,
  computePricePerSqft,
  formatPricePerSqft,
  INITIAL_TAPASIHALLI,
  INITIAL_MARASANDRA,
} from "@/lib/marketplace.functions";

export const Route = createFileRoute("/app/marketplace")({
  validateSearch: (search: Record<string, unknown>): { q?: string } => ({
    q: typeof search.q === "string" ? search.q : undefined,
  }),
  head: () => ({ meta: [{ title: "Marketplace — Sentinel Fort Group" }] }),
  ssr: false,
  component: Marketplace,
});

export function canManageMarketplaceInventory(roles: readonly string[]): boolean {
  return roles.some((role) =>
    ["admin", "manager", "builder", "developer"].includes(role),
  );
}

export type Property = {
  id: string;
  name: string;
  builder: string;
  city: string;
  area: string;
  type: "Apartment" | "Villa" | "Plot" | "Commercial";
  config: string;
  size: string;
  priceLabel: string;
  priceCr: number;
  score: number;
  tag: "Hot" | "New" | "Premium" | "Trending";
  appreciation: string;
  status: "Ready" | "Under Construction" | "New Launch";
  image?: string | null;
  gallery?: string[];
  video?: string | null;
  attributes?: Record<string, any> | null;
  isDb?: boolean;
  price_inr?: number;
  developer?: string;
  property_type?: string;
};

const defaultMockImages: Record<string, { image: string; gallery: string[] }> = {
  "1": {
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  "2": {
    image: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  "3": {
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  "4": {
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  "5": {
    image: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  "6": {
    image: "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  "7": {
    image: "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  "8": {
    image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80",
    ],
  },
  "9": {
    image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
    gallery: [
      "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80",
    ],
  },
};

const defaultProperties: Property[] = [
  INITIAL_TAPASIHALLI as Property,
  INITIAL_MARASANDRA as Property,
  { id: "1", name: "Lodha Belmondo", builder: "Lodha Group", city: "Pune", area: "Pirangut", type: "Apartment", config: "3 BHK", size: "1,840 sqft", priceLabel: "₹1.85 Cr", priceCr: 1.85, score: 92, tag: "Hot", appreciation: "+14% YoY", status: "Ready", image: defaultMockImages["1"].image, gallery: defaultMockImages["1"].gallery },
  { id: "2", name: "Prestige Lakeside Habitat", builder: "Prestige", city: "Bengaluru", area: "Varthur", type: "Apartment", config: "4 BHK", size: "2,210 sqft", priceLabel: "₹2.40 Cr", priceCr: 2.40, score: 88, tag: "New", appreciation: "+11% YoY", status: "Ready", image: defaultMockImages["2"].image, gallery: defaultMockImages["2"].gallery },
  { id: "3", name: "Oberoi Sky City", builder: "Oberoi Realty", city: "Mumbai", area: "Borivali", type: "Apartment", config: "3 BHK", size: "1,650 sqft", priceLabel: "₹3.10 Cr", priceCr: 3.10, score: 95, tag: "Premium", appreciation: "+18% YoY", status: "Under Construction", image: defaultMockImages["3"].image, gallery: defaultMockImages["3"].gallery },
  { id: "4", name: "Godrej Reserve", builder: "Godrej Properties", city: "Bengaluru", area: "Devanahalli", type: "Plot", config: "Plot", size: "2,400 sqft", priceLabel: "₹1.20 Cr", priceCr: 1.20, score: 86, tag: "Trending", appreciation: "+22% YoY", status: "New Launch", image: defaultMockImages["4"].image, gallery: defaultMockImages["4"].gallery },
  { id: "5", name: "DLF The Camellias", builder: "DLF", city: "Gurugram", area: "Golf Course Rd", type: "Apartment", config: "4 BHK", size: "7,500 sqft", priceLabel: "₹38.5 Cr", priceCr: 38.5, score: 97, tag: "Premium", appreciation: "+9% YoY", status: "Ready", image: defaultMockImages["5"].image, gallery: defaultMockImages["5"].gallery },
  { id: "6", name: "Brigade Cornerstone Utopia", builder: "Brigade Group", city: "Bengaluru", area: "Whitefield", type: "Apartment", config: "3 BHK", size: "1,720 sqft", priceLabel: "₹1.95 Cr", priceCr: 1.95, score: 84, tag: "New", appreciation: "+10% YoY", status: "Under Construction", image: defaultMockImages["6"].image, gallery: defaultMockImages["6"].gallery },
  { id: "7", name: "Lodha World Towers", builder: "Lodha Group", city: "Mumbai", area: "Lower Parel", type: "Apartment", config: "3 BHK", size: "2,100 sqft", priceLabel: "₹8.40 Cr", priceCr: 8.40, score: 90, tag: "Hot", appreciation: "+12% YoY", status: "Ready", image: defaultMockImages["7"].image, gallery: defaultMockImages["7"].gallery },
  { id: "8", name: "Embassy Boulevard", builder: "Embassy Group", city: "Bengaluru", area: "Yelahanka", type: "Villa", config: "5 BHK", size: "5,200 sqft", priceLabel: "₹7.20 Cr", priceCr: 7.20, score: 89, tag: "Premium", appreciation: "+13% YoY", status: "Ready", image: defaultMockImages["8"].image, gallery: defaultMockImages["8"].gallery },
  { id: "9", name: "M3M Crown", builder: "M3M India", city: "Gurugram", area: "Sector 111", type: "Apartment", config: "3 BHK", size: "1,950 sqft", priceLabel: "₹3.85 Cr", priceCr: 3.85, score: 87, tag: "New", appreciation: "+15% YoY", status: "New Launch", image: defaultMockImages["9"].image, gallery: defaultMockImages["9"].gallery },
];

const types: Property["type"][] = ["Apartment", "Villa", "Plot", "Commercial"];

function typeFromDb(t: string): Property["type"] {
  const v = (t || "").toLowerCase();
  if (v.includes("villa")) return "Villa";
  if (v.includes("plot")) return "Plot";
  if (v.includes("commercial") || v.includes("office") || v.includes("retail") || v.includes("warehouse")) return "Commercial";
  return "Apartment";
}

function formatPriceCr(inr: number): string {
  const cr = inr / 10_000_000;
  return cr >= 1 ? `₹${cr.toFixed(2)} Cr` : `₹${(inr / 100_000).toFixed(1)} L`;
}

function PropertyDetailModal({
  property,
  onClose,
  onOpenEdit,
  onOpenDelete,
  onInspectUnit,
  onCompareWith,
  comparisonEntity,
  filteredProperties,
  handleOpenBrochure,
  handleDownloadBrochure,
  canManage = false,
}: {
  property: Property;
  onClose: () => void;
  onOpenEdit: (p: Property) => void;
  onOpenDelete: (p: Property) => void;
  onInspectUnit: (p: Property) => void;
  onCompareWith: (p1: Property, p2: Property) => void;
  comparisonEntity: any;
  filteredProperties: Property[];
  handleOpenBrochure: (pdfUrl?: string | null, propName?: string) => void;
  handleDownloadBrochure: (pdfUrl?: string | null, propName?: string) => void;
  canManage?: boolean;
}) {
  const photos = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    const add = (url?: string | null) => {
      if (url && typeof url === "string" && !seen.has(url)) {
        seen.add(url);
        list.push(url);
      }
    };
    add(property.image);
    add(property.attributes?.media?.cover);
    if (Array.isArray(property.gallery)) {
      for (const g of property.gallery) add(g);
    }
    if (Array.isArray(property.attributes?.media?.gallery)) {
      for (const g of property.attributes.media.gallery) add(g);
    }
    add(property.attributes?.media?.master_plan);
    add(property.attributes?.media?.floor_plan);
    return list;
  }, [property]);

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  useEffect(() => {
    setActivePhotoIndex(0);
  }, [property.id]);

  const totalPhotos = photos.length;
  const currentHero = photos[activePhotoIndex] || property.image || property.attributes?.media?.cover || null;

  const handlePrevPhoto = useCallback(() => {
    if (totalPhotos <= 1) return;
    setActivePhotoIndex((prev) => (prev - 1 + totalPhotos) % totalPhotos);
  }, [totalPhotos]);

  const handleNextPhoto = useCallback(() => {
    if (totalPhotos <= 1) return;
    setActivePhotoIndex((prev) => (prev + 1) % totalPhotos);
  }, [totalPhotos]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        handlePrevPhoto();
      } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        handleNextPhoto();
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrevPhoto, handleNextPhoto, onClose]);

  const brochure = property.attributes?.media?.brochure || property.attributes?.brochure || null;
  const videoRaw = property.attributes?.media?.video || property.video || property.attributes?.video || null;

  const isYoutube = videoRaw && (videoRaw.includes("youtube.com") || videoRaw.includes("youtu.be"));
  const isVimeo = videoRaw && videoRaw.includes("vimeo.com");

  const getEmbedSrc = (url: string) => {
    if (url.includes("watch?v=")) {
      const id = url.split("watch?v=")[1]?.split("&")[0];
      return `https://www.youtube.com/embed/${id}?autoplay=0&rel=0`;
    }
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${id}?autoplay=0&rel=0`;
    }
    if (url.includes("youtube.com/shorts/")) {
      const id = url.split("youtube.com/shorts/")[1]?.split("?")[0];
      return `https://www.youtube.com/embed/${id}?autoplay=0&rel=0`;
    }
    if (url.includes("vimeo.com")) {
      const parts = url.split("vimeo.com/")[1]?.split("?")[0];
      return `https://player.vimeo.com/video/${parts}`;
    }
    return url;
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-2 sm:p-4 backdrop-blur-md"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl xl:max-w-7xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl max-h-[94vh] flex flex-col"
      >
        {/* Integrated Modal Top Header Bar */}
        <div className="flex items-center justify-between gap-4 border-b border-border/80 bg-surface-elevated/90 px-5 sm:px-6 py-3.5 backdrop-blur flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/30 grid place-items-center text-primary shrink-0">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-xl sm:text-2xl font-bold truncate text-foreground">{property.name}</h2>
                <span className="rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                  {property.tag}
                </span>
                <span className="rounded-full bg-surface border border-border px-2.5 py-0.5 text-[10px] text-foreground">
                  {property.status}
                </span>
                <span className="rounded-full bg-surface border border-border px-2.5 py-0.5 text-[10px] text-muted-foreground">
                  {property.type}
                </span>
              </div>
              <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                <MapPin className="h-3 w-3 text-primary shrink-0" />
                <span>{property.builder} · {property.area}, {property.city}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Starting at</div>
              <div className="font-display text-xl font-bold text-foreground leading-tight">{property.priceLabel}</div>
              {(() => {
                const rate = computePricePerSqft(property.price_inr || Math.round(property.priceCr * 10_000_000), property.attributes || {}, property.size);
                if (!rate) return null;
                return <div className="text-xs font-semibold text-primary">{formatPricePerSqft(rate)}</div>;
              })()}
            </div>
            <div className="flex items-center gap-1.5 border-l border-border/60 pl-3">
              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => onOpenEdit(property)}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shadow-sm cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenDelete(property)}
                    className="flex items-center gap-1.5 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all shadow-sm cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-full bg-surface border border-border text-foreground hover:bg-accent transition-colors shadow-sm ml-1 cursor-pointer"
                title="Close (Esc)"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body - 2-Column Responsive Side-by-Side Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-5 sm:p-6 overflow-y-auto max-h-[calc(94vh-75px)]">
          {/* LEFT COLUMN: Visuals, Gallery & Embedded Video Tour (lg:col-span-5) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Hero Image Container */}
            <div className="relative h-56 sm:h-64 rounded-2xl overflow-hidden bg-neutral-950 border border-border shadow-md select-none group">
              {currentHero ? (
                <img
                  src={currentHero}
                  alt={property.name}
                  className="h-full w-full object-cover transition-all duration-300"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-surface">
                  <Building2 className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />

              {/* Photo Counter */}
              {totalPhotos > 1 && (
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-mono text-white backdrop-blur border border-white/15 shadow">
                  <ImageIcon className="h-3 w-3 text-primary" />
                  <span>{activePhotoIndex + 1} / {totalPhotos}</span>
                </div>
              )}

              {/* Floating Chevrons */}
              {totalPhotos > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrevPhoto}
                    aria-label="Previous Photo (Left Arrow)"
                    title="Previous Photo (← Left Arrow)"
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white backdrop-blur border border-white/20 hover:bg-black/90 hover:scale-110 active:scale-95 transition-all shadow cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextPhoto}
                    aria-label="Next Photo (Right Arrow)"
                    title="Next Photo (→ Right Arrow)"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/70 text-white backdrop-blur border border-white/20 hover:bg-black/90 hover:scale-110 active:scale-95 transition-all shadow cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}

              <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-[11px] text-white/90">
                <span className="truncate font-medium">{property.name}</span>
                {totalPhotos > 1 && <span className="text-[10px] text-white/70 font-mono">Use ← → arrow keys</span>}
              </div>
            </div>

            {/* Thumbnail Strip */}
            {totalPhotos > 1 && (
              <div className="rounded-xl bg-surface/60 border border-border/70 p-2.5 backdrop-blur-md">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 px-0.5 justify-start">
                  {photos.map((imgUrl, i) => {
                    const isActive = activePhotoIndex === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActivePhotoIndex(i)}
                        className={`group relative h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all cursor-pointer shadow-sm ${
                          isActive
                            ? "border-primary ring-2 ring-primary/60 scale-105 opacity-100 z-10 shadow-glow"
                            : "border-border/60 opacity-65 hover:opacity-100 hover:scale-102 hover:border-foreground/30"
                        }`}
                        title={`Photo ${i + 1} of ${totalPhotos}`}
                      >
                        <img
                          src={imgUrl}
                          alt={`Thumbnail ${i + 1}`}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span
                          className={`absolute bottom-0.5 right-0.5 text-[8px] font-mono px-1 py-0.2 rounded ${
                            isActive ? "bg-primary text-primary-foreground font-bold" : "bg-black/75 text-white/90"
                          }`}
                        >
                          #{i + 1}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Embedded Video Walkthrough Tour Player */}
            {videoRaw && (
              <div className="rounded-2xl border border-primary/30 bg-black/40 backdrop-blur-md p-3.5 space-y-2.5 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                    <Video className="h-3.5 w-3.5" /> Virtual Video Tour / Walkthrough
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 text-[9px] font-medium">
                      HD Video
                    </span>
                    <a
                      href={videoRaw}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors bg-white/5 hover:bg-white/10 px-2 py-0.5 rounded border border-white/10"
                      title="Open video in new tab"
                    >
                      <ExternalLink className="h-2.5 w-2.5" /> Open
                    </a>
                  </div>
                </div>
                <div className="relative aspect-video rounded-xl overflow-hidden bg-neutral-950 border border-white/10 shadow-inner">
                  {isYoutube || isVimeo ? (
                    <iframe
                      src={getEmbedSrc(videoRaw)}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={`${property.name} Video Walkthrough`}
                    />
                  ) : (
                    <video
                      src={videoRaw}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover"
                    >
                      Your browser does not support HTML5 video. <a href={videoRaw} target="_blank" rel="noopener noreferrer" className="text-primary underline">Download video</a>.
                    </video>
                  )}
                </div>
              </div>
            )}

            {/* Brochure PDF Card */}
            {brochure && (
              <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 rounded-lg bg-red-500/15 border border-red-500/30 grid place-items-center text-red-400 shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">Official Brochure PDF</div>
                    <div className="text-[10px] text-muted-foreground truncate">Layout deck & master plan</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleOpenBrochure(brochure, property.name)}
                    className="gap-1 bg-red-500 hover:bg-red-600 text-white text-[11px] h-7 px-2.5 shadow-sm cursor-pointer"
                  >
                    <Eye className="h-3 w-3" /> View
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadBrochure(brochure, property.name)}
                    className="gap-1 border-border hover:bg-surface text-[11px] h-7 px-2.5 cursor-pointer"
                  >
                    <Download className="h-3 w-3" /> Save
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Specifications, Pricing Table, Legal, Amenities & AI Score (lg:col-span-7) */}
          <div className="lg:col-span-7 space-y-4">
            {/* Prominent Key Specifications Grid (Enlarged Size) */}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Key Specifications & Property Parameters</span>
                <span className="text-[10px] text-primary font-mono">{property.id}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {[
                  { l: "Configuration", v: property.config, highlight: true },
                  { l: "Total Area / Size", v: property.size, highlight: true },
                  { l: "Property Type", v: property.type },
                  { l: "Status", v: property.status },
                  ...(computePricePerSqft(property.price_inr || Math.round(property.priceCr * 10_000_000), property.attributes || {}, property.size)
                    ? [{ l: "Rate / Sq.ft", v: formatPricePerSqft(computePricePerSqft(property.price_inr || Math.round(property.priceCr * 10_000_000), property.attributes || {}, property.size)), highlight: true }]
                    : []),
                  ...(property.attributes?.facing ? [{ l: "Facing", v: `${property.attributes.facing.charAt(0).toUpperCase() + property.attributes.facing.slice(1)} Facing` }] : []),
                  ...(property.attributes?.khata_type ? [{ l: "Khata Type", v: `${property.attributes.khata_type.toUpperCase()} Khata` }] : []),
                  ...(property.attributes?.rera_number ? [{ l: "RERA Reg.", v: property.attributes.rera_number }] : []),
                  ...(property.attributes?.legal_verification ? [{ l: "Legal Status", v: property.attributes.legal_verification.charAt(0).toUpperCase() + property.attributes.legal_verification.slice(1) }] : []),
                ].map((s) => (
                  <div key={s.l} className={`rounded-xl border p-3 transition-colors ${s.highlight ? "border-primary/30 bg-primary/5" : "border-border bg-surface/50"}`}>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{s.l}</div>
                    <div className="mt-1 text-sm font-semibold text-foreground truncate" title={s.v}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing & Rate Calculation Breakdown */}
            {(() => {
              const rate = computePricePerSqft(property.price_inr || Math.round(property.priceCr * 10_000_000), property.attributes || {}, property.size);
              const isPlot = property.type === "Plot" || property.property_type === "plot";
              const baseCost = property.attributes?.base_price ? Number(property.attributes.base_price) : (rate && property.attributes?.plot_area ? rate * Number(property.attributes.plot_area) : (property.price_inr || Math.round(property.priceCr * 10_000_000)));
              const reg = Number(property.attributes?.registration_charges || 0);
              const maint = Number(property.attributes?.maintenance_charges || 0);
              const park = Number(property.attributes?.parking_charges || 0);
              const club = Number(property.attributes?.clubhouse_charges || 0);

              return (
                <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-surface/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4" /> Pricing & Financial Breakdown
                    </div>
                    {isPlot && (
                      <span className="rounded-full bg-primary/20 text-primary border border-primary/30 px-2.5 py-0.5 text-[10px] font-semibold">
                        Plot Area × Rate Calculation
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    {rate && (
                      <div className="rounded-xl border border-white/5 bg-background/70 p-2.5">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Price per Sq.ft</div>
                        <div className="mt-0.5 text-base font-bold text-primary">{formatPricePerSqft(rate)}</div>
                      </div>
                    )}
                    <div className="rounded-xl border border-white/5 bg-background/70 p-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Area</div>
                      <div className="mt-0.5 text-sm font-semibold text-foreground">{property.size}</div>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-background/70 p-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Base Cost</div>
                      <div className="mt-0.5 text-sm font-semibold text-emerald-400">₹{baseCost.toLocaleString("en-IN")}</div>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-background/70 p-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Total Outlay</div>
                      <div className="mt-0.5 text-base font-bold text-foreground">{property.priceLabel}</div>
                    </div>
                  </div>

                  {(reg > 0 || maint > 0 || park > 0 || club > 0) && (
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 text-[11px] text-muted-foreground">
                      {reg > 0 && <span>Reg: ₹{reg.toLocaleString("en-IN")}</span>}
                      {maint > 0 && <span>• Maint: ₹{maint.toLocaleString("en-IN")}</span>}
                      {park > 0 && <span>• Parking: ₹{park.toLocaleString("en-IN")}</span>}
                      {club > 0 && <span>• Clubhouse: ₹{club.toLocaleString("en-IN")}</span>}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Legal & Compliance Approvals */}
            {(property.attributes?.bank_approved || property.attributes?.occupancy_certificate || property.attributes?.completion_certificate || property.attributes?.rera_number) && (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                  <ShieldCheck className="h-4 w-4" /> Legal & Approvals:
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {property.attributes?.bank_approved && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-emerald-300 text-[11px]">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Bank Approved
                    </span>
                  )}
                  {property.attributes?.occupancy_certificate && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-emerald-300 text-[11px]">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Occupancy Certificate (OC)
                    </span>
                  )}
                  {property.attributes?.completion_certificate && (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-emerald-300 text-[11px]">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Completion Certificate (CC)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Amenities Chips */}
            {Array.isArray(property.attributes?.amenities) && property.attributes.amenities.length > 0 && (
              <div className="rounded-xl border border-border bg-surface/30 p-3.5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Community & Lifestyle Amenities</div>
                <div className="flex flex-wrap gap-1.5">
                  {property.attributes.amenities.map((amenity: string) => (
                    <span
                      key={amenity}
                      className="rounded-lg bg-surface border border-border/80 px-2.5 py-1 text-xs text-foreground/90 flex items-center gap-1.5 shadow-sm"
                    >
                      <Sparkles className="h-3 w-3 text-primary" /> {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description / Highlights */}
            {(property.attributes?.detailed_description || property.attributes?.highlights) && (
              <div className="rounded-xl border border-border bg-surface/30 p-3.5 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">About the Project</div>
                {property.attributes?.detailed_description && (
                  <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-line">{property.attributes.detailed_description}</p>
                )}
                {property.attributes?.highlights && (
                  <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground whitespace-pre-line">
                    {property.attributes.highlights}
                  </div>
                )}
              </div>
            )}

            {/* AI Investment Intelligence */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary font-semibold">
                  <Sparkles className="h-3.5 w-3.5" /> AI Investment Score · {property.score}/100
                </div>
                <span className="text-xs font-semibold text-emerald-400">{property.appreciation}</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Strong fundamentals: {property.appreciation} appreciation, builder credibility AAA, infrastructure pipeline
                active in {property.area}. Ranks in top 8% of {property.city} inventory.
              </p>
            </div>

            {/* Unit-Level & Action Buttons Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/60">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onInspectUnit(property)}
                  className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3" /> Inspect Unit 1204
                </button>
                {filteredProperties.find((item) => item.id !== property.id) && (
                  <button
                    type="button"
                    onClick={() => {
                      const other = filteredProperties.find((item) => item.id !== property.id);
                      if (other) onCompareWith(property, other);
                    }}
                    className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Scale className="h-3 w-3" /> Compare
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  className="cursor-pointer"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground shadow-glow hover:bg-primary/90 cursor-pointer"
                  onClick={() => toast.success("Site visit scheduling request logged for sales team.")}
                >
                  Schedule Site Visit
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Marketplace() {
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();
  const routeContext = Route.useRouteContext();
  const userRoles = (routeContext as any)?.user?.roles ?? (routeContext as any)?.fort?.role?.appRoles ?? [];
  const canManageInventory = canManageMarketplaceInventory(userRoles);
  const [q, setQ] = useState(searchParams.q || "");
  const [city, setCity] = useState("All");

  useEffect(() => {
    if (searchParams.q !== undefined) {
      setQ(searchParams.q);
    }
  }, [searchParams.q]);
  const [activeTypes, setActiveTypes] = useState<Property["type"][]>([]);
  const [budget, setBudget] = useState(50);
  const [selected, setSelected] = useState<Property | null>(null);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const { setActiveEntity, startComparison, clearComparison, comparisonEntity } = useActiveEntity();

  // Dialog states for Create/Edit and Delete
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<EditPropertyInput | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const handleSelectProperty = (p: Property | null) => {
    setSelected(p);
    setActivePhoto(null);
    if (p) {
      setActiveEntity({
        type: "property",
        id: p.id,
        name: p.name,
        module: "Marketplace Property Intelligence",
        location: `${p.area}, ${p.city}`,
        price: p.priceLabel,
        priceNumber: p.priceCr * 10_000_000,
        rawScore: p.score,
        appreciation: p.appreciation,
        status: p.status,
        configuration: p.config,
        size: p.size,
        data: {
          "Developer": p.builder,
          "Location": `${p.area}, ${p.city}`,
          "Starting Price": p.priceLabel,
          "Configuration": p.config,
          "Unit Size": p.size,
          "Status": p.status,
          "AI Score": `${p.score}/100`,
          "Annual Appreciation": p.appreciation,
        },
      });
    } else {
      setActiveEntity(null);
    }
  };

  const handleInspectUnit = (p: Property) => {
    setActiveEntity({
      type: "unit",
      id: `${p.id}-unit-1204`,
      name: `${p.name} — Tower B / Unit 1204`,
      module: "Unit-Level Decision Intelligence",
      selectedProject: p.name,
      selectedTower: "Tower B",
      selectedUnit: "Unit 1204",
      unitNumber: "1204",
      floor: 12,
      facing: "East",
      configuration: p.config === "—" ? "3 BHK" : p.config,
      size: p.size === "—" ? "1,850 sq ft" : p.size,
      price: p.priceLabel,
      location: `${p.area}, ${p.city}`,
      rawScore: p.score,
      appreciation: p.appreciation,
      status: p.status,
      data: {
        "Project": p.name,
        "Tower": "Tower B",
        "Unit": "Unit 1204",
        "Floor": "Floor 12",
        "Orientation": "East Facing",
        "Asking Price": p.priceLabel,
        "Configuration": p.config === "—" ? "3 BHK" : p.config,
        "Unit Size": p.size === "—" ? "1,850 sq ft" : p.size,
      },
    });
  };

  const handleCompareWith = (p1: Property, p2: Property) => {
    const toEntity = (p: Property) => ({
      type: "property" as const,
      id: p.id,
      name: p.name,
      module: "Marketplace Property Intelligence",
      location: `${p.area}, ${p.city}`,
      price: p.priceLabel,
      priceNumber: p.priceCr * 10_000_000,
      size: p.size,
      configuration: p.config,
      rawScore: p.score,
      appreciation: p.appreciation,
      status: p.status,
      data: {
        "Developer": p.builder,
        "Location": `${p.area}, ${p.city}`,
        "Starting Price": p.priceLabel,
        "AI Score": `${p.score}/100`,
        "Appreciation": p.appreciation,
      },
    });
    startComparison(toEntity(p1), toEntity(p2));
  };

  const handleAddProperty = () => {
    setEditingProperty(null);
    setWizardOpen(true);
  };

  const handleOpenEdit = (p: Property) => {
    setEditingProperty({
      id: p.id,
      name: p.name,
      developer: p.builder !== "—" ? p.builder : (p.developer || ""),
      city: p.city,
      property_type: p.property_type || p.type.toLowerCase(),
      status: p.status === "Ready" ? "ready_to_move" : p.status === "Under Construction" ? "under_construction" : "new_launch",
      price_inr: p.price_inr || Math.round(p.priceCr * 10_000_000),
      attributes: p.attributes || {
        project_name: p.name,
        bhk: p.config !== "—" ? p.config.replace(/ BHK/i, "").trim() : "",
        locality: p.area,
        media: {
          cover: p.image || undefined,
          gallery: p.gallery || [],
        },
      },
      ai_score: p.score,
    });
    setWizardOpen(true);
  };

  const handleOpenDelete = (p: Property) => {
    setPropertyToDelete(p);
    setDeleteDialogOpen(true);
  };

function getLocalSavedProperties(): Property[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("marketplace_saved_properties");
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("[Marketplace] Error reading local properties:", err);
    return [];
  }
}

  const [localProperties, setLocalProperties] = useState<Property[]>(() => getLocalSavedProperties());

  useEffect(() => {
    const handleUpdate = () => {
      setLocalProperties(getLocalSavedProperties());
    };
    window.addEventListener("marketplace-properties-updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("marketplace-properties-updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const handleConfirmDelete = async () => {
    if (!propertyToDelete) return;
    setIsDeleting(true);
    try {
      const rawId = propertyToDelete.id;
      const cleanId = rawId.startsWith("db-") ? rawId.replace("db-", "") : rawId;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId);

      // 1. Server cluster delete
      try {
        await deleteMarketplacePropertyServer({ data: { propertyId: rawId } });
      } catch (err) {
        console.warn("[Marketplace] Server delete notice:", err);
      }

      // 2. Supabase DB delete
      if (isUuid) {
        const { error } = await supabase.from("properties").delete().eq("id", cleanId);
        if (error) console.warn("[Marketplace] DB delete notice:", error.message);
      }
      await queryClient.invalidateQueries({ queryKey: ["marketplace-properties"] });
      await queryClient.invalidateQueries({ queryKey: ["marketplace-properties-server"] });

      // 3. Local saved properties delete
      try {
        const raw = localStorage.getItem("marketplace_saved_properties");
        if (raw) {
          const list: Property[] = JSON.parse(raw);
          const filtered = list.filter((p) => p.id !== rawId && p.id !== cleanId && p.name !== propertyToDelete.name);
          localStorage.setItem("marketplace_saved_properties", JSON.stringify(filtered));
          setLocalProperties(filtered);
        }
      } catch (err) {
        console.warn("[Marketplace] Local cache delete notice:", err);
      }

      setDeletedIds((prev) => new Set(prev).add(propertyToDelete.id).add(cleanId).add(`db-${cleanId}`));
      toast.success(`"${propertyToDelete.name}" deleted successfully`);

      if (selected?.id === propertyToDelete.id) {
        handleSelectProperty(null);
      }
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete property");
    } finally {
      setIsDeleting(false);
    }
  };

  const { data: serverRows = [] } = useQuery({
    queryKey: ["marketplace-properties-server"],
    queryFn: async () => {
      try {
        const res = await getMarketplaceInventoryServer();
        return (res ?? []) as Property[];
      } catch (err) {
        console.warn("[Marketplace] Error fetching server inventory:", err);
        return [];
      }
    },
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
  });

  const { data: liveRows = [] } = useQuery({
    queryKey: ["marketplace-properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id,name,city,property_type,price_inr,status,ai_score,developer,created_at,attributes,is_draft")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 5000,
  });

  const liveProperties: Property[] = useMemo(
    () =>
      liveRows.map((r) => {
        const priceCr = Number(r.price_inr || 0) / 10_000_000;
        const status: Property["status"] =
          r.status === "sold" || r.status === "reserved" || r.status === "ready_to_move"
            ? "Ready"
            : r.status === "under_construction"
            ? "Under Construction"
            : "New Launch";

        const attrs = (r.attributes as Record<string, any>) || {};
        const media = attrs.media || {};
        const coverImage = media.cover || (Array.isArray(media.gallery) && media.gallery[0]) || attrs.image || null;
        const gallery = Array.isArray(media.gallery) && media.gallery.length > 0 ? media.gallery : (coverImage ? [coverImage] : []);
        const video = media.video || attrs.video || null;

        const configStr = computeConfig(attrs, r.property_type);
        const sizeStr = computeSize(attrs);
        const areaStr = attrs.locality || attrs.address || r.city;

        return {
          id: `db-${r.id}`,
          name: r.name,
          builder: r.developer ?? "—",
          city: r.city,
          area: areaStr,
          type: typeFromDb(r.property_type),
          config: configStr,
          size: sizeStr,
          priceLabel: formatPriceInr(Number(r.price_inr || 0)),
          priceCr,
          score: r.ai_score ?? (attrs.ai?.investment_score ? Number(attrs.ai.investment_score) : 75),
          tag: r.is_draft ? "New" : "Trending",
          appreciation: attrs.ai?.expected_appreciation ? `+${attrs.ai.expected_appreciation} YoY` : "+12% YoY",
          status,
          image: coverImage,
          gallery,
          video,
          attributes: attrs,
          isDb: true,
          price_inr: Number(r.price_inr || 0),
          developer: r.developer || "",
          property_type: r.property_type || "apartment",
        };
      }),
    [liveRows],
  );

  const combined = useMemo(() => {
    const result: Property[] = [];
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    const addProp = (p: Property) => {
      if (!p || !p.id) return;
      const cleanId = p.id.startsWith("db-") ? p.id.replace("db-", "") : p.id;
      if (deletedIds.has(p.id) || deletedIds.has(cleanId) || deletedIds.has(`db-${cleanId}`)) return;
      if (seenIds.has(p.id) || seenIds.has(cleanId) || seenIds.has(`db-${cleanId}`)) return;
      const normalizedName = p.name ? p.name.trim().toLowerCase() : "";
      if (normalizedName && seenNames.has(normalizedName)) return;

      seenIds.add(p.id);
      seenIds.add(cleanId);
      seenIds.add(`db-${cleanId}`);
      if (normalizedName) seenNames.add(normalizedName);
      result.push(p);
    };

    // 1. Local saved / edited custom properties (instant zero-latency client edits) - Top Priority
    for (const lp of localProperties) addProp(lp);

    // 2. Synchronized server cluster properties (visible to both localhost and remote tunnel)
    for (const sp of serverRows) addProp(sp as Property);

    // 3. Live properties from Supabase DB
    for (const dbp of liveProperties) addProp(dbp);

    // 4. Default mock properties (if not overridden)
    for (const def of defaultProperties) addProp(def);

    return result;
  }, [serverRows, localProperties, liveProperties, deletedIds]);

  const handleOpenBrochure = (pdfUrl?: string | null, propName?: string) => {
    if (!pdfUrl) {
      toast.info("No brochure PDF attached to this property.");
      return;
    }
    const w = window.open("");
    if (w) {
      if (pdfUrl.startsWith("data:")) {
        w.document.write(`<!DOCTYPE html><html><head><title>${propName || "Property"} — Official Brochure</title></head><body style="margin:0;"><iframe src="${pdfUrl}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100vh;" allowfullscreen></iframe></body></html>`);
      } else {
        w.location.href = pdfUrl;
      }
    }
  };

  const handleDownloadBrochure = (pdfUrl?: string | null, propName?: string) => {
    if (!pdfUrl) {
      toast.info("No brochure PDF available.");
      return;
    }
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = `${(propName || "Property").replace(/[^a-zA-Z0-9_-]/g, "_")}_Brochure.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Brochure download started");
  };

  const cities = useMemo(() => {
    const set = new Set<string>(["Mumbai", "Bengaluru", "Pune", "Gurugram"]);
    combined.forEach((p) => {
      if (p.city && p.city !== "Unspecified") set.add(p.city);
    });
    return ["All", ...Array.from(set)];
  }, [combined]);

  const maxCr = useMemo(
    () => Math.max(50, ...combined.map((p) => Math.ceil(p.priceCr))),
    [combined],
  );

  const filtered = useMemo(() => {
    return combined.filter((p) => {
      if (q && !`${p.name} ${p.builder} ${p.area}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (city !== "All" && p.city !== city) return false;
      if (activeTypes.length && !activeTypes.includes(p.type)) return false;
      if (p.priceCr > budget) return false;
      return true;
    });
  }, [q, city, activeTypes, budget, combined]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Marketplace</p>
          <h1 className="mt-1 font-display text-4xl">Curated <em>inventory</em></h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} properties matched · AI-scored for investment potential
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mr-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Synced from live inventory
          </div>
          {canManageInventory && (
            <Button
              onClick={handleAddProperty}
              className="gap-2 bg-primary text-primary-foreground shadow-glow hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" /> Add Property
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-1 min-w-[220px] items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search projects, builders, locations…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-1 rounded-md border border-border bg-surface p-1 text-xs">
            {cities.map((c) => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className={`rounded px-3 py-1.5 transition-colors ${
                  city === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <span
            className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground"
            title="Search, cities and type chips above filter results live"
          >
            Filters applied live
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-6 border-t border-border/60 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Type</span>
            <div className="flex flex-wrap gap-1.5">
              {types.map((t) => {
                const active = activeTypes.includes(t);
                return (
                  <button
                    key={t}
                    onClick={() =>
                      setActiveTypes((prev) => (active ? prev.filter((x) => x !== t) : [...prev, t]))
                    }
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-1 min-w-[240px] items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Max budget</span>
            <input
              type="range"
              min={1}
              max={maxCr}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="flex-1 accent-[color:var(--primary)]"
            />
            <span className="w-20 text-right text-xs text-foreground">₹{budget} Cr</span>
          </div>
        </div>
      </div>

      {comparisonEntity && (
        <div className="flex items-center justify-between rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-xs text-primary">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            <span>Comparing: <strong>{selected?.name || "Active Asset"}</strong> vs <strong>{comparisonEntity.name}</strong></span>
          </div>
          <button
            type="button"
            onClick={() => clearComparison()}
            className="rounded-md border border-primary/30 px-2.5 py-1 text-[11px] font-medium hover:bg-primary/20 transition-colors"
          >
            Clear Comparison
          </button>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => (
          <article
            key={p.id}
            onClick={() => handleSelectProperty(p)}
            className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-elevated flex flex-col justify-between"
          >
            <div>
              {/* Photo Banner with Uploaded Image Rendering & Quick Action Overlays */}
              <div className="relative h-48 overflow-hidden bg-gradient-to-br from-surface-elevated to-surface">
                {p.image || p.attributes?.media?.cover || (Array.isArray(p.gallery) && p.gallery[0]) ? (
                  <img
                    src={p.image || p.attributes?.media?.cover || (Array.isArray(p.gallery) && p.gallery[0]) || ""}
                    alt={p.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-elevated via-surface to-background/80 text-muted-foreground/40">
                    <Building2 className="h-12 w-12 stroke-[1.2]" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent pointer-events-none" />

                {/* Status, Tag and Brochure Chips */}
                <div className="absolute left-3 top-3 flex flex-wrap gap-1.5 z-10 max-w-[70%]">
                  <span className="rounded-full bg-primary/90 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary-foreground shadow-sm">
                    {p.tag}
                  </span>
                  <span className="rounded-full bg-background/80 px-2.5 py-1 text-[10px] text-foreground backdrop-blur shadow-sm">
                    {p.status}
                  </span>
                  {(p.attributes?.media?.brochure || p.attributes?.brochure) && (
                    <span className="rounded-full bg-red-500/80 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur shadow-sm flex items-center gap-1">
                      <FileText className="h-2.5 w-2.5" /> Brochure
                    </span>
                  )}
                </div>

                {/* Edit & Delete Actions */}
                {canManageInventory && (
                  <div className="absolute right-3 top-3 flex items-center gap-1.5 z-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(p);
                      }}
                      className="grid h-8 w-8 place-items-center rounded-full bg-background/80 text-foreground backdrop-blur hover:bg-primary hover:text-primary-foreground transition-colors shadow-sm"
                      title="Edit Property"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDelete(p);
                      }}
                      className="grid h-8 w-8 place-items-center rounded-full bg-background/80 text-destructive backdrop-blur hover:bg-destructive hover:text-destructive-foreground transition-colors shadow-sm"
                      title="Delete Property"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* AI Score Badge */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-background/85 px-3 py-1 text-xs backdrop-blur font-medium text-foreground shadow-sm z-10">
                  <Sparkles className="h-3 w-3 text-primary" />
                  AI <span className="text-emerald-400 font-semibold">{p.score}</span>
                </div>

                {/* Photo indicator badge if multiple */}
                {((p.gallery && p.gallery.length > 1) || (p.attributes?.media?.gallery && p.attributes.media.gallery.length > 1)) && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[10px] text-foreground backdrop-blur z-10">
                    <ImageIcon className="h-3 w-3 text-primary" />
                    {Math.max(p.gallery?.length || 0, p.attributes?.media?.gallery?.length || 0)} photos
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg leading-tight text-foreground font-semibold">{p.name}</h3>
                    <div className="text-xs text-muted-foreground">{p.builder}</div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3 text-primary" /> {p.area} · {p.city}
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{p.config}</span>
                  <span className="flex items-center gap-1"><Square className="h-3.5 w-3.5" />{p.size}</span>
                  <span className="flex items-center gap-1 text-primary"><TrendingUp className="h-3.5 w-3.5" />{p.appreciation}</span>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5 pt-2">
              <div className="flex items-end justify-between border-t border-border/60 pt-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Starting at</div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <div className="font-display text-2xl font-bold">{p.priceLabel}</div>
                    {(() => {
                      const rate = computePricePerSqft(p.price_inr || Math.round(p.priceCr * 10_000_000), p.attributes || {}, p.size);
                      if (!rate) return null;
                      return (
                        <span className="text-[11px] font-semibold text-primary/90 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                          {formatPricePerSqft(rate)}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-primary font-medium group-hover:underline">View details →</span>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
          No properties match your filters. Try widening your budget or city, or click &ldquo;Add Property&rdquo; to add a new listing.
        </div>
      )}

      {/* Property Detail Modal */}
      {selected && (
        <PropertyDetailModal
          property={selected}
          onClose={() => handleSelectProperty(null)}
          onOpenEdit={handleOpenEdit}
          onOpenDelete={handleOpenDelete}
          onInspectUnit={handleInspectUnit}
          onCompareWith={handleCompareWith}
          comparisonEntity={comparisonEntity}
          filteredProperties={filtered}
          handleOpenBrochure={handleOpenBrochure}
          handleDownloadBrochure={handleDownloadBrochure}
          canManage={canManageInventory}
        />
      )}

      {/* Property Create/Edit Wizard */}
      {canManageInventory && (
        <PropertyWizard
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          editProperty={editingProperty}
        />
      )}

      {/* Delete Property Confirmation Dialog */}
      {canManageInventory && (
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Delete Property
              </DialogTitle>
              <DialogDescription className="text-muted-foreground pt-2">
                Are you sure you want to delete <strong className="text-foreground">{propertyToDelete?.name}</strong>? This property listing will be permanently removed from the marketplace.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="gap-2"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete Property
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}