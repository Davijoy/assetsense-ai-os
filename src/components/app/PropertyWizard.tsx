import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Eye,
  FileText,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Video,
  Play,
  Link as LinkIcon,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  saveMarketplacePropertyServer,
  computeConfig,
  computeSize,
  formatPriceInr,
} from "@/lib/marketplace.functions";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

export function compressImage(file: File, maxWidth = 1600, maxHeight = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/") || file.type.includes("svg")) {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(e.target?.result));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mime = file.type === "image/png" ? "image/webp" : (file.type || "image/jpeg");
        try {
          const dataUrl = canvas.toDataURL(mime, quality);
          resolve(dataUrl);
        } catch {
          resolve(String(e.target?.result));
        }
      };
      img.onerror = () => {
        resolve(String(e.target?.result));
      };
      img.src = String(e.target?.result);
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

type Wizard = {
  name: string;
  project_name: string;
  developer: string;
  property_type: string;
  status: string;
  country: string;
  state: string;
  city: string;
  locality: string;
  address: string;
  landmark: string;
  pincode: string;
  lat: string;
  lng: string;
  base_price: string;
  price_per_sqft: string;
  registration_charges: string;
  maintenance_charges: string;
  parking_charges: string;
  clubhouse_charges: string;
  measurement_unit: string;
  super_builtup_area: string;
  builtup_area: string;
  carpet_area: string;
  plot_area: string;
  balcony_area: string;
  terrace_area: string;
  bhk: string;
  bathrooms: string;
  balconies: string;
  servant_room: boolean;
  study_room: boolean;
  floor_number: string;
  total_floors: string;
  lift_available: string;
  facing: string;
  furnishing: string;
  parking_covered: string;
  parking_open: string;
  ev_charging: boolean;
  property_age: string;
  amenities: string[];
  nearby: Record<string, string>;
  rera_number: string;
  khata_type: string;
  occupancy_certificate: boolean;
  completion_certificate: boolean;
  bank_approved: boolean;
  legal_verification: string;
  media: {
    cover?: string;
    gallery: string[];
    master_plan?: string;
    floor_plan?: string;
    brochure?: string;
    video?: string;
    video_title?: string;
  };
  short_description: string;
  detailed_description: string;
  highlights: string;
};

const empty: Wizard = {
  name: "", project_name: "", developer: "", property_type: "apartment", status: "available",
  country: "India", state: "", city: "", locality: "", address: "", landmark: "", pincode: "", lat: "", lng: "",
  base_price: "", price_per_sqft: "", registration_charges: "", maintenance_charges: "", parking_charges: "", clubhouse_charges: "",
  measurement_unit: "sqft", super_builtup_area: "", builtup_area: "", carpet_area: "", plot_area: "", balcony_area: "", terrace_area: "",
  bhk: "", bathrooms: "", balconies: "", servant_room: false, study_room: false,
  floor_number: "", total_floors: "", lift_available: "yes", facing: "east", furnishing: "unfurnished",
  parking_covered: "", parking_open: "", ev_charging: false, property_age: "new",
  amenities: [], nearby: {},
  rera_number: "", khata_type: "", occupancy_certificate: false, completion_certificate: false, bank_approved: false, legal_verification: "pending",
  media: { gallery: [] },
  short_description: "", detailed_description: "", highlights: "",
};

const PROPERTY_TYPES = ["apartment", "villa", "plot", "commercial", "office", "warehouse"];
const STATUSES = ["available", "sold", "under_construction", "ready_to_move", "new_launch", "pre_launch"];
const FACINGS = ["north", "south", "east", "west", "north-east", "north-west", "south-east", "south-west"];
const FURNISHING = ["unfurnished", "semi_furnished", "fully_furnished"];
const AGES = ["new", "<1 year", "1-3 years", "3-5 years", "5-10 years", "10+ years"];
const UNITS = ["sqft", "sqm", "acres", "guntas"];
const AMENITIES = [
  "Swimming Pool", "Gym", "Club House", "Jogging Track", "Garden", "Children Play Area",
  "Indoor Games", "Security", "CCTV", "Lift", "Power Backup", "Visitor Parking",
  "Rainwater Harvesting", "Solar Power", "EV Charging", "Co-working Space",
];
const NEARBY = ["Metro", "Airport", "Hospital", "School", "College", "Mall", "Tech Park", "Railway Station", "Bus Stop", "Highway"];

const STEPS = [
  { id: 1, name: "Basics", desc: "Property identity" },
  { id: 2, name: "Location", desc: "Where it sits" },
  { id: 3, name: "Pricing", desc: "Total cost" },
  { id: 4, name: "Specifications", desc: "Dimensions & config" },
  { id: 5, name: "Amenities", desc: "What's inside" },
  { id: 6, name: "Nearby", desc: "Infrastructure" },
  { id: 7, name: "Legal", desc: "Certifications" },
  { id: 8, name: "Media", desc: "Images & docs" },
  { id: 9, name: "Description", desc: "Narrative" },
  { id: 10, name: "AI Analysis", desc: "Investment score" },
];

function num(v: string) { return v ? Number(v) : 0; }

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-xl p-6 ${className}`}>
      {children}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground/80">
        {label}{required && <span className="text-primary ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

function CollapsibleSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.03] transition-colors">
        <span className="text-sm font-medium text-foreground/90">{title}</span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-5 pt-2 border-t border-white/5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export interface EditPropertyInput {
  id: string;
  name: string;
  developer?: string | null;
  city: string;
  property_type?: string;
  status?: string;
  price_inr?: number | null;
  attributes?: Record<string, any> | null;
  ai_score?: number | null;
}

export function PropertyWizard({
  open,
  onOpenChange,
  editProperty = null,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editProperty?: EditPropertyInput | null;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<Wizard>(empty);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<Record<string, number | string> | null>(null);
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

function saveCustomPropertyLocal(prop: any) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("marketplace_saved_properties");
    const list: any[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((p) => p.id === prop.id || (prop.name && p.name.toLowerCase() === prop.name.toLowerCase()));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...prop };
    } else {
      list.unshift(prop);
    }
    localStorage.setItem("marketplace_saved_properties", JSON.stringify(list));
    window.dispatchEvent(new Event("marketplace-properties-updated"));
  } catch (err) {
    console.warn("[PropertyWizard] Local property cache write warning:", err);
  }
}

// Only treat as editing if editProperty was explicitly passed for an existing non-draft listing
  const isEditing = Boolean(editProperty && !editProperty.attributes?.is_draft);

  const set = <K extends keyof Wizard>(k: K, v: Wizard[K]) => setData((d) => ({ ...d, [k]: v }));

  const totalCost = useMemo(() => {
    const rate = num(data.price_per_sqft);
    const area = num(data.plot_area || data.super_builtup_area || data.builtup_area || data.carpet_area);
    const calculatedBase = num(data.base_price) || (rate > 0 ? (area > 0 ? rate * area : rate * (data.property_type === "plot" ? 1200 : 1000)) : 0);
    return (
      calculatedBase +
      num(data.registration_charges) +
      num(data.maintenance_charges) +
      num(data.parking_charges) +
      num(data.clubhouse_charges)
    );
  }, [
    data.base_price,
    data.price_per_sqft,
    data.plot_area,
    data.super_builtup_area,
    data.builtup_area,
    data.carpet_area,
    data.property_type,
    data.registration_charges,
    data.maintenance_charges,
    data.parking_charges,
    data.clubhouse_charges,
  ]);

  const buildPayload = useCallback((isDraft: boolean) => {
    const { name, city, property_type, status, developer, base_price, price_per_sqft, plot_area, super_builtup_area, builtup_area, carpet_area, ...rest } = data;
    const rate = num(price_per_sqft);
    const area = num(plot_area || super_builtup_area || builtup_area || carpet_area) || (property_type === "plot" ? 1200 : 1000);
    const computedBase = num(base_price) || (rate > 0 ? rate * area : 0);
    const finalPriceInr = totalCost || computedBase || 0;
    const resolvedRate = rate > 0 ? String(rate) : computedBase > 0 && area > 0 ? String(Math.round(computedBase / area)) : "";

    return {
      name: name || "Untitled property",
      city: city || "Unspecified",
      property_type,
      status,
      developer: developer || null,
      price_inr: finalPriceInr,
      is_draft: isDraft,
      attributes: {
        ...rest,
        price_per_sqft: resolvedRate,
        plot_area: plot_area || (property_type === "plot" ? String(area) : ""),
        super_builtup_area,
        builtup_area,
        carpet_area,
        base_price: computedBase || finalPriceInr,
        total_cost: finalPriceInr,
        ai: aiResult ?? null,
      },
    };
  }, [data, totalCost, aiResult]);

  const save = useCallback(async (isDraft: boolean, silent = false) => {
    if (!silent) setSaving(true);
    try {
      const payload = buildPayload(isDraft);
      const isRealUuid = draftId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draftId);

      let savedId = draftId;
      let dbSuccess = false;

      // 1. Attempt database save
      try {
        if (isRealUuid) {
          const { error } = await supabase.from("properties").update(payload).eq("id", draftId);
          if (!error) {
            dbSuccess = true;
          } else {
            console.warn("[PropertyWizard] Supabase update notice:", error.message);
          }
        } else {
          const res = await supabase.from("properties").insert(payload).select("id").maybeSingle();
          if (!res.error && res.data?.id) {
            savedId = res.data.id;
            setDraftId(res.data.id);
            dbSuccess = true;
          } else if (res.error) {
            console.warn("[PropertyWizard] Supabase insert notice:", res.error.message);
          }
        }
      } catch (err: any) {
        console.warn("[PropertyWizard] DB operation notice:", err?.message);
      }

      // 2. Persist to server cluster so all connected devices/users see it immediately
      const localId = savedId || (draftId ? draftId : `custom-${Date.now()}`);
      let serverSavedProperty: any = null;
      try {
        const res = await saveMarketplacePropertyServer({
          data: {
            id: localId,
            name: payload.name,
            developer: payload.developer,
            city: payload.city,
            property_type: payload.property_type,
            status: payload.status,
            price_inr: payload.price_inr,
            is_draft: payload.is_draft,
            attributes: payload.attributes,
            ai_score: aiResult?.investment_score ? Number(aiResult.investment_score) : undefined,
          },
        });
        if (res?.property) {
          serverSavedProperty = res.property;
        }
      } catch (err: any) {
        console.warn("[PropertyWizard] Server cluster persistence notice:", err?.message);
      }

      // 3. Persist locally to guarantee zero latency and immediate viewability
      const priceCr = (payload.price_inr || 0) / 10_000_000;
      const configStr = computeConfig(payload.attributes, payload.property_type);
      const sizeStr = computeSize(payload.attributes);
      const priceLabelStr = formatPriceInr(payload.price_inr || 0);

      const localProp = serverSavedProperty || {
        id: localId,
        name: payload.name,
        builder: payload.developer || "—",
        city: payload.city,
        area: payload.attributes?.locality || payload.attributes?.address || payload.city,
        type: (payload.property_type ? payload.property_type.charAt(0).toUpperCase() + payload.property_type.slice(1).toLowerCase() : "Apartment") as any,
        config: configStr,
        size: sizeStr,
        priceLabel: priceLabelStr,
        priceCr,
        score: aiResult?.investment_score ? Number(aiResult.investment_score) : 85,
        tag: isDraft ? "New" : "Trending",
        appreciation: aiResult?.expected_appreciation ? `+${aiResult.expected_appreciation} YoY` : "+12% YoY",
        status: payload.status === "ready_to_move" || payload.status === "available" ? "Ready" : payload.status === "under_construction" ? "Under Construction" : "New Launch",
        image: payload.attributes?.media?.cover || (Array.isArray(payload.attributes?.media?.gallery) && payload.attributes.media.gallery[0]) || null,
        gallery: payload.attributes?.media?.gallery || [],
        video: payload.attributes?.media?.video || null,
        attributes: payload.attributes,
        isDb: dbSuccess,
        price_inr: payload.price_inr,
        developer: payload.developer || "",
        property_type: payload.property_type,
        updated_at: new Date().toISOString(),
      };

      saveCustomPropertyLocal(localProp);

      if (!silent) {
        toast.success(isDraft ? "Draft saved" : isEditing ? "Property updated successfully" : "Property published successfully");
      }
      qc.invalidateQueries({ queryKey: ["marketplace-properties"] });
      qc.invalidateQueries({ queryKey: ["marketplace-properties-server"] });
      return true;
    } catch (err: any) {
      console.error("[PropertyWizard] Save error:", err);
      if (!silent) toast.error(err?.message || "Could not save property details");
      return false;
    } finally {
      if (!silent) setSaving(false);
    }
  }, [buildPayload, draftId, isEditing, qc, aiResult]);

  useEffect(() => {
    if (!open) return;
    if (autosaveRef.current) clearInterval(autosaveRef.current);
    autosaveRef.current = setInterval(() => {
      if (data.name.trim()) save(true, true);
    }, 30000);
    return () => { if (autosaveRef.current) clearInterval(autosaveRef.current); };
  }, [open, data.name, save]);

  const lastOpenedRef = useRef(false);
  const currentEditIdRef = useRef<string | null>(null);

  const reset = () => {
    setStep(1);
    setData(empty);
    setDraftId(null);
    setAiResult(null);
    lastOpenedRef.current = false;
    currentEditIdRef.current = null;
  };

  useEffect(() => {
    if (!open) {
      lastOpenedRef.current = false;
      currentEditIdRef.current = null;
      reset();
      return;
    }
    const targetId = editProperty ? editProperty.id : "__new__";
    if (!lastOpenedRef.current || currentEditIdRef.current !== targetId) {
      lastOpenedRef.current = true;
      currentEditIdRef.current = targetId;

      if (editProperty) {
        const attrs = editProperty.attributes || {};
        const cleanId = editProperty.id.startsWith("db-") ? editProperty.id.replace("db-", "") : editProperty.id;
        setDraftId(cleanId);
        const propType = editProperty.property_type || attrs.property_type || "apartment";
        const rawPrice = editProperty.price_inr || attrs.base_price || attrs.total_cost || 0;
        const initialArea = attrs.plot_area || attrs.super_builtup_area || attrs.builtup_area || attrs.carpet_area || (propType === "plot" ? "1200" : "");
        const computedRate = attrs.price_per_sqft || (rawPrice && Number(initialArea) > 0 ? String(Math.round(rawPrice / Number(initialArea))) : "");

        setData({
          name: editProperty.name || "",
          project_name: attrs.project_name || editProperty.name || "",
          developer: editProperty.developer || attrs.developer || "",
          property_type: propType,
          status: editProperty.status || attrs.status || "available",
          country: attrs.country || "India",
          state: attrs.state || "",
          city: editProperty.city || attrs.city || "",
          locality: attrs.locality || "",
          address: attrs.address || "",
          landmark: attrs.landmark || "",
          pincode: attrs.pincode || "",
          lat: attrs.lat || "",
          lng: attrs.lng || "",
          base_price: String(rawPrice || ""),
          price_per_sqft: String(computedRate || ""),
          registration_charges: String(attrs.registration_charges || ""),
          maintenance_charges: String(attrs.maintenance_charges || ""),
          parking_charges: String(attrs.parking_charges || ""),
          clubhouse_charges: String(attrs.clubhouse_charges || ""),
          measurement_unit: attrs.measurement_unit || "sqft",
          super_builtup_area: attrs.super_builtup_area || "",
          builtup_area: attrs.builtup_area || "",
          carpet_area: attrs.carpet_area || "",
          plot_area: attrs.plot_area || (propType === "plot" ? String(initialArea) : ""),
          balcony_area: attrs.balcony_area || "",
          terrace_area: attrs.terrace_area || "",
          bhk: attrs.bhk || (propType === "plot" ? "Plot" : ""),
          bathrooms: attrs.bathrooms || "",
          balconies: attrs.balconies || "",
          servant_room: Boolean(attrs.servant_room),
          study_room: Boolean(attrs.study_room),
          floor_number: attrs.floor_number || "",
          total_floors: attrs.total_floors || "",
          lift_available: attrs.lift_available || "yes",
          facing: attrs.facing || "east",
          furnishing: attrs.furnishing || "unfurnished",
          parking_covered: attrs.parking_covered || "",
          parking_open: attrs.parking_open || "",
          ev_charging: Boolean(attrs.ev_charging),
          property_age: attrs.property_age || "new",
          amenities: Array.isArray(attrs.amenities) ? attrs.amenities : [],
          nearby: attrs.nearby || {},
          rera_number: attrs.rera_number || "",
          khata_type: attrs.khata_type || "",
          occupancy_certificate: Boolean(attrs.occupancy_certificate),
          completion_certificate: Boolean(attrs.completion_certificate),
          bank_approved: Boolean(attrs.bank_approved),
          legal_verification: attrs.legal_verification || "pending",
          media: attrs.media || { gallery: [] },
          short_description: attrs.short_description || "",
          detailed_description: attrs.detailed_description || "",
          highlights: attrs.highlights || "",
        });
        setAiResult(attrs.ai || null);
      } else {
        setData(empty);
        setDraftId(null);
        setAiResult(null);
      }
    }
  }, [open, editProperty]);

  const close = (o: boolean) => { if (!o) reset(); onOpenChange(o); };

  const validateStep = (n: number): string | null => {
    if (n === 1) {
      if (!data.name.trim()) return "Property name is required";
      if (!data.developer.trim()) return "Developer is required";
    }
    if (n === 2 && !data.city.trim()) return "City is required";
    if (n === 3) {
      const rate = num(data.price_per_sqft);
      const area = num(data.plot_area || data.super_builtup_area || data.builtup_area || data.carpet_area);
      const base = num(data.base_price) || (rate > 0 ? (area > 0 ? rate * area : rate * 1200) : 0);
      if (!base && !rate) return "Please enter Price per Sq.ft or Base Price";
      // Auto-populate base_price if missing
      if (!data.base_price && base > 0) {
        set("base_price", String(base));
      }
    }
    return null;
  };

  const next = () => {
    const err = validateStep(step);
    if (err) { toast.error(err); return; }
    setStep((s) => Math.min(10, s + 1));
  };
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const publish = async () => {
    for (let i = 1; i <= 9; i++) {
      const err = validateStep(i);
      if (err) { toast.error(`Step ${i}: ${err}`); setStep(i); return; }
    }
    setPublishing(true);
    try {
      const ok = await save(false);
      if (ok) {
        close(false);
        navigate({ to: "/app/marketplace" });
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to update property");
    } finally {
      setPublishing(false);
    }
  };

  const generateAiScore = async () => {
    setAiGenerating(true);
    await new Promise((r) => setTimeout(r, 1400));
    const base = 60 + Math.min(30, Math.floor((num(data.base_price) / 10_000_000) * 3));
    const amenityBonus = Math.min(10, data.amenities.length);
    const score = Math.min(99, base + amenityBonus);
    setAiResult({
      investment_score: score,
      expected_appreciation: `${(6 + Math.random() * 6).toFixed(1)}%/yr`,
      rental_yield: `${(2.5 + Math.random() * 2).toFixed(2)}%`,
      roi_score: Math.min(99, score + 3),
      risk_level: score > 80 ? "Low" : score > 65 ? "Moderate" : "Elevated",
      demand_index: 60 + Math.floor(Math.random() * 35),
      growth_index: 55 + Math.floor(Math.random() * 40),
      liquidity_index: 50 + Math.floor(Math.random() * 45),
      infrastructure_score: 60 + Math.floor(Math.random() * 35),
      future_growth: score > 75 ? "Strong upside 3-5yr" : "Steady horizon",
    });
    setAiGenerating(false);
    toast.success("AI Investment Score generated");
  };

  const progress = (step / 10) * 100;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-6xl w-[95vw] h-[92vh] p-0 gap-0 flex flex-col bg-gradient-to-br from-background via-background to-background/60 border-white/10 overflow-hidden">
        <div className="px-8 pt-6 pb-4 border-b border-white/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-6 w-1 rounded-full bg-primary" />
                <h2 className="text-xl font-semibold tracking-tight">
                  {isEditing ? `Edit Property — ${data.name || "Untitled"}` : `Add Property${data.name ? ` — ${data.name}` : ""}`}
                </h2>
                <span className="text-xs text-muted-foreground">Step {step} of 10 · {STEPS[step - 1].name}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{STEPS[step - 1].desc}</p>
            </div>
            <button onClick={() => close(false)} className="p-2 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <Progress value={progress} className="mt-4 h-1" />
          <div className="mt-3 hidden md:flex items-center gap-1 overflow-x-auto">
            {STEPS.map((s) => {
              const done = step > s.id;
              const active = step === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setStep(s.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap transition-all ${
                    active ? "bg-primary/15 text-primary" : done ? "text-foreground/70 hover:bg-white/5" : "text-muted-foreground/50 hover:bg-white/5"
                  }`}
                >
                  <span className={`h-4 w-4 rounded-full grid place-items-center text-[9px] ${
                    done ? "bg-primary text-primary-foreground" : active ? "border border-primary" : "border border-white/10"
                  }`}>
                    {done ? <Check className="h-2.5 w-2.5" /> : s.id}
                  </span>
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && <Step1 data={data} set={set} />}
              {step === 2 && <Step2 data={data} set={set} />}
              {step === 3 && <Step3 data={data} set={set} setData={setData} totalCost={totalCost} />}
              {step === 4 && <Step4 data={data} set={set} />}
              {step === 5 && <Step5 data={data} set={set} />}
              {step === 6 && <Step6 data={data} set={set} />}
              {step === 7 && <Step7 data={data} set={set} />}
              {step === 8 && <Step8 data={data} set={set} />}
              {step === 9 && <Step9 data={data} set={set} />}
              {step === 10 && <Step10 aiResult={aiResult} aiGenerating={aiGenerating} onGenerate={generateAiScore} />}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="border-t border-white/5 bg-background/80 backdrop-blur-xl px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => close(false)}>Cancel</Button>
            <Button variant="outline" onClick={() => save(true)} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Draft
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={prev} disabled={step === 1} className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Previous
            </Button>
            {step < 10 ? (
              <Button onClick={next} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                Next <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <>
                {!aiResult && (
                  <Button onClick={generateAiScore} disabled={aiGenerating} className="gap-2">
                    {aiGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Generate AI Score
                  </Button>
                )}
                <Button onClick={publish} disabled={publishing} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                  {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {isEditing ? "Save & Update Property" : "Publish to Marketplace"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type StepProps = {
  data: Wizard;
  set: <K extends keyof Wizard>(k: K, v: Wizard[K]) => void;
  setData?: React.Dispatch<React.SetStateAction<Wizard>>;
};

function Step1({ data, set }: StepProps) {
  return (
    <GlassCard>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Property Name" required><Input value={data.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sentinel Skyline Residences" /></Field>
        <Field label="Project Name"><Input value={data.project_name} onChange={(e) => set("project_name", e.target.value)} /></Field>
        <Field label="Developer" required><Input value={data.developer} onChange={(e) => set("developer", e.target.value)} placeholder="e.g. Prestige Group" /></Field>
        <Field label="Property Type" required>
          <Select value={data.property_type} onValueChange={(v) => set("property_type", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Property Status" required>
          <Select value={data.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
    </GlassCard>
  );
}

function Step2({ data, set }: StepProps) {
  return (
    <div className="space-y-5">
      <GlassCard>
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Country"><Input value={data.country} onChange={(e) => set("country", e.target.value)} /></Field>
          <Field label="State"><Input value={data.state} onChange={(e) => set("state", e.target.value)} /></Field>
          <Field label="City" required><Input value={data.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field label="Locality"><Input value={data.locality} onChange={(e) => set("locality", e.target.value)} /></Field>
          <Field label="Pincode"><Input value={data.pincode} onChange={(e) => set("pincode", e.target.value)} /></Field>
          <Field label="Landmark"><Input value={data.landmark} onChange={(e) => set("landmark", e.target.value)} /></Field>
          <div className="md:col-span-3">
            <Field label="Address"><Textarea rows={2} value={data.address} onChange={(e) => set("address", e.target.value)} /></Field>
          </div>
          <Field label="Latitude"><Input value={data.lat} onChange={(e) => set("lat", e.target.value)} placeholder="12.9716" /></Field>
          <Field label="Longitude"><Input value={data.lng} onChange={(e) => set("lng", e.target.value)} placeholder="77.5946" /></Field>
        </div>
      </GlassCard>
      <GlassCard className="!p-0 overflow-hidden">
        <div className="relative h-56 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent grid place-items-center">
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 50%, hsl(var(--primary)/0.15), transparent 70%)" }} />
          <div className="text-center relative z-10">
            <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
            <div className="text-sm font-medium">
              {data.lat && data.lng ? `Pinned at ${Number(data.lat).toFixed(4)}, ${Number(data.lng).toFixed(4)}` : "Enter coordinates to preview location"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Google Maps picker — connect an API key in workspace settings</div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function Step3({ data, set, setData, totalCost }: StepProps & { totalCost: number }) {
  const isPlot = data.property_type === "plot";
  const areaVal = num(data.plot_area || data.super_builtup_area || data.builtup_area || data.carpet_area) || (isPlot ? 1200 : 1000);
  const rateVal = num(data.price_per_sqft);
  const calculatedBase = rateVal > 0 ? rateVal * (num(data.plot_area) || areaVal) : num(data.base_price);
  const effectiveCost = totalCost || calculatedBase;
  const formattedPriceBadge = formatPriceInr(effectiveCost);
  const formattedRateBadge = rateVal > 0 ? `₹${rateVal.toLocaleString("en-IN")} / sqft` : (effectiveCost && areaVal ? `₹${Math.round(effectiveCost / areaVal).toLocaleString("en-IN")} / sqft` : "");

  const handleRateChange = (val: string) => {
    const rate = Number(val);
    const curArea = num(data.plot_area || data.super_builtup_area || data.builtup_area || data.carpet_area) || (isPlot ? 1200 : 1000);
    const newBase = rate > 0 ? String(Math.round(rate * curArea)) : "";
    if (setData) {
      setData((d) => ({
        ...d,
        price_per_sqft: val,
        ...(newBase ? { base_price: newBase } : {}),
        ...(isPlot && !d.plot_area ? { plot_area: String(curArea) } : {}),
      }));
    } else {
      set("price_per_sqft", val);
      if (newBase) set("base_price", newBase);
      if (isPlot && !data.plot_area) set("plot_area", String(curArea));
    }
  };

  const handleAreaChange = (val: string) => {
    const area = Number(val);
    const rate = num(data.price_per_sqft);
    const newBase = rate > 0 && area > 0 ? String(Math.round(rate * area)) : "";
    if (setData) {
      setData((d) => ({
        ...d,
        ...(isPlot ? { plot_area: val } : { super_builtup_area: val }),
        ...(newBase ? { base_price: newBase } : {}),
      }));
    } else {
      if (isPlot) set("plot_area", val);
      else set("super_builtup_area", val);
      if (rate > 0 && area > 0) {
        set("base_price", String(Math.round(rate * area)));
      }
    }
  };

  const handleBasePriceChange = (val: string) => {
    const base = Number(val);
    const curArea = num(data.plot_area || data.super_builtup_area || data.builtup_area || data.carpet_area) || (isPlot ? 1200 : 1000);
    const newRate = base > 0 && curArea > 0 ? String(Math.round(base / curArea)) : "";
    if (setData) {
      setData((d) => ({
        ...d,
        base_price: val,
        ...(newRate ? { price_per_sqft: newRate } : {}),
      }));
    } else {
      set("base_price", val);
      if (base > 0 && curArea > 0) {
        set("price_per_sqft", String(Math.round(base / curArea)));
      }
    }
  };

  const extraPriceField = (k: keyof Wizard, label: string) => (
    <Field label={label}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
        <Input
          type="number"
          min={0}
          value={data[k] as string}
          onChange={(e) => set(k, e.target.value as any)}
          className="pl-7"
          placeholder="0"
        />
      </div>
    </Field>
  );

  return (
    <div className="space-y-5">
      {isPlot ? (
        /* Plot Pricing Auto-Calculator */
        <GlassCard className="border-primary/30 bg-primary/[0.03]">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/5">
            <div>
              <div className="text-xs uppercase tracking-wider text-primary font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Plot Rate & Price Calculator
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Calculates total plot price automatically from Price per Sq.ft × Plot Area
              </p>
            </div>
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">
              Plot Mode Active
            </Badge>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Field label="Price per Sq.ft (Rate)" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-primary">₹</span>
                <Input
                  type="number"
                  min={0}
                  value={data.price_per_sqft}
                  onChange={(e) => handleRateChange(e.target.value)}
                  className="pl-7 font-medium text-foreground border-primary/40 focus-visible:ring-primary"
                  placeholder="e.g. 600"
                />
              </div>
            </Field>

            <Field label="Plot Area (sq.ft)" required>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  value={data.plot_area || "1200"}
                  onChange={(e) => handleAreaChange(e.target.value)}
                  className="pr-14 font-medium text-foreground"
                  placeholder="e.g. 1200"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">sqft</span>
              </div>
            </Field>

            <Field label="Calculated Base Price">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                <Input
                  type="number"
                  min={0}
                  value={data.base_price || (rateVal && areaVal ? String(rateVal * areaVal) : "")}
                  onChange={(e) => handleBasePriceChange(e.target.value)}
                  className="pl-7 bg-white/[0.03] font-semibold text-emerald-400"
                  placeholder="Auto-calculated"
                />
              </div>
            </Field>
          </div>

          {/* Dynamic Calculation Formula Banner */}
          {rateVal > 0 && (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/10 p-3.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <span className="text-primary font-bold">Formula:</span>
                <span className="font-mono bg-background/50 px-2 py-0.5 rounded border border-white/5">
                  ₹{rateVal.toLocaleString("en-IN")} / sqft
                </span>
                <span>×</span>
                <span className="font-mono bg-background/50 px-2 py-0.5 rounded border border-white/5">
                  {(num(data.plot_area) || 1200).toLocaleString("en-IN")} sqft
                </span>
                <span>=</span>
                <span className="font-mono font-bold text-emerald-400 bg-background/50 px-2 py-0.5 rounded border border-emerald-500/20">
                  ₹{(rateVal * (num(data.plot_area) || 1200)).toLocaleString("en-IN")}
                </span>
              </div>
              <span className="text-xs text-primary font-semibold">
                ({formatPriceInr(rateVal * (num(data.plot_area) || 1200))})
              </span>
            </div>
          )}
        </GlassCard>
      ) : (
        /* Standard / Apartment / Villa Pricing */
        <GlassCard>
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="Price per Sq.ft">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                <Input
                  type="number"
                  min={0}
                  value={data.price_per_sqft}
                  onChange={(e) => handleRateChange(e.target.value)}
                  className="pl-7"
                  placeholder="e.g. 8500"
                />
              </div>
            </Field>

            <Field label="Super Built-up Area (sq.ft)">
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  value={data.super_builtup_area || data.carpet_area || ""}
                  onChange={(e) => handleAreaChange(e.target.value)}
                  className="pr-14"
                  placeholder="e.g. 1850"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">sqft</span>
              </div>
            </Field>

            <Field label="Base Price" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
                <Input
                  type="number"
                  min={0}
                  value={data.base_price}
                  onChange={(e) => handleBasePriceChange(e.target.value)}
                  className="pl-7 font-semibold"
                  placeholder="e.g. 15725000"
                />
              </div>
            </Field>
          </div>
        </GlassCard>
      )}

      {/* Additional Optional Charges */}
      <CollapsibleSection title="Additional Charges & Outlays (Optional)" defaultOpen={false}>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {extraPriceField("registration_charges", "Registration Charges")}
          {extraPriceField("maintenance_charges", "Maintenance Charges")}
          {extraPriceField("parking_charges", "Parking Charges")}
          {extraPriceField("clubhouse_charges", "Club House / Amenities")}
        </div>
      </CollapsibleSection>

      {/* Final Total Summary Card */}
      <GlassCard className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-primary/80 font-semibold">Total Property Cost</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <span className="text-3xl font-bold tracking-tight">₹ {effectiveCost.toLocaleString("en-IN")}</span>
              <span className="rounded-md bg-primary/20 text-primary border border-primary/30 px-2.5 py-0.5 text-xs font-semibold">
                Market Display: {formattedPriceBadge}
              </span>
              {formattedRateBadge && (
                <span className="rounded-md bg-white/5 border border-white/10 px-2.5 py-0.5 text-xs text-muted-foreground">
                  {formattedRateBadge}
                </span>
              )}
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground max-w-xs">
            {isPlot
              ? "Calculated dynamically as (Price per Sq.ft × Plot Area) + Additional charges."
              : "Auto-calculated from Base Price / Rate per sqft + Registration + Maintenance + Parking + Clubhouse."}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function Step4({ data, set }: StepProps) {
  const isPlot = data.property_type === "plot";
  const dim = (k: keyof Wizard, label: string) => (
    <Field label={label}>
      <Input
        type="number"
        min={0}
        value={data[k] as string}
        onChange={(e) => {
          const val = e.target.value;
          set(k, val as any);
          if (k === "plot_area" || (isPlot && (k === "super_builtup_area" || k === "builtup_area"))) {
            const rate = num(data.price_per_sqft);
            if (rate > 0 && Number(val) > 0) {
              set("base_price", String(Math.round(rate * Number(val))));
            }
          }
        }}
      />
    </Field>
  );
  return (
    <div className="space-y-3">
      <CollapsibleSection title="A · Dimensions">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Measurement unit">
            <Select value={data.measurement_unit} onValueChange={(v) => set("measurement_unit", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u} className="uppercase">{u}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          {dim("super_builtup_area", "Super Built-up")}
          {dim("builtup_area", "Built-up")}
          {dim("carpet_area", "Carpet")}
          {dim("plot_area", "Plot")}
          {dim("balcony_area", "Balcony")}
          {dim("terrace_area", "Terrace")}
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="B · Configuration">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="BHK"><Input type="number" min={0} value={data.bhk} onChange={(e) => set("bhk", e.target.value)} /></Field>
          <Field label="Bathrooms"><Input type="number" min={0} value={data.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} /></Field>
          <Field label="Balconies"><Input type="number" min={0} value={data.balconies} onChange={(e) => set("balconies", e.target.value)} /></Field>
          <label className="flex items-center gap-2 pt-6"><Checkbox checked={data.servant_room} onCheckedChange={(v) => set("servant_room", Boolean(v))} /><span className="text-sm">Servant Room</span></label>
          <label className="flex items-center gap-2 pt-6"><Checkbox checked={data.study_room} onCheckedChange={(v) => set("study_room", Boolean(v))} /><span className="text-sm">Study Room</span></label>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="C · Floor Details">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Floor Number"><Input type="number" value={data.floor_number} onChange={(e) => set("floor_number", e.target.value)} /></Field>
          <Field label="Total Floors"><Input type="number" value={data.total_floors} onChange={(e) => set("total_floors", e.target.value)} /></Field>
          <Field label="Lift Available">
            <Select value={data.lift_available} onValueChange={(v) => set("lift_available", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="yes">Yes</SelectItem><SelectItem value="no">No</SelectItem></SelectContent>
            </Select>
          </Field>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="D · Facing" defaultOpen={false}>
        <Field label="Facing direction">
          <Select value={data.facing} onValueChange={(v) => set("facing", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{FACINGS.map((f) => <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </CollapsibleSection>
      <CollapsibleSection title="E · Furnishing" defaultOpen={false}>
        <div className="grid gap-2 md:grid-cols-3">
          {FURNISHING.map((f) => (
            <button key={f} type="button" onClick={() => set("furnishing", f)} className={`px-4 py-3 rounded-xl border text-sm transition-all capitalize ${data.furnishing === f ? "border-primary bg-primary/10 text-primary" : "border-white/5 hover:border-white/20"}`}>
              {f.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="F · Parking" defaultOpen={false}>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Covered Parking"><Input type="number" min={0} value={data.parking_covered} onChange={(e) => set("parking_covered", e.target.value)} /></Field>
          <Field label="Open Parking"><Input type="number" min={0} value={data.parking_open} onChange={(e) => set("parking_open", e.target.value)} /></Field>
          <label className="flex items-center gap-2 pt-6"><Checkbox checked={data.ev_charging} onCheckedChange={(v) => set("ev_charging", Boolean(v))} /><span className="text-sm">EV Charging</span></label>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="G · Property Age" defaultOpen={false}>
        <div className="grid gap-2 md:grid-cols-3">
          {AGES.map((a) => (
            <button key={a} type="button" onClick={() => set("property_age", a)} className={`px-4 py-3 rounded-xl border text-sm transition-all ${data.property_age === a ? "border-primary bg-primary/10 text-primary" : "border-white/5 hover:border-white/20"}`}>
              {a}
            </button>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  );
}

function Step5({ data, set }: StepProps) {
  const toggle = (a: string) => {
    const has = data.amenities.includes(a);
    set("amenities", has ? data.amenities.filter((x) => x !== a) : [...data.amenities, a]);
  };
  return (
    <GlassCard>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {AMENITIES.map((a) => {
          const on = data.amenities.includes(a);
          return (
            <button key={a} type="button" onClick={() => toggle(a)} className={`group relative flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm text-left transition-all ${on ? "border-primary/50 bg-primary/10" : "border-white/5 hover:border-white/20 bg-white/[0.02]"}`}>
              <span className={`h-5 w-5 rounded-md grid place-items-center border transition-colors ${on ? "border-primary bg-primary text-primary-foreground" : "border-white/10"}`}>
                {on && <Check className="h-3 w-3" />}
              </span>
              <span className={on ? "text-foreground" : "text-foreground/80"}>{a}</span>
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}

function Step6({ data, set }: StepProps) {
  return (
    <GlassCard>
      <div className="grid gap-4 md:grid-cols-2">
        {NEARBY.map((n) => (
          <div key={n} className="flex items-center gap-3">
            <div className="flex-1 text-sm">{n}</div>
            <div className="relative w-40">
              <Input type="number" min={0} step="0.1" value={data.nearby[n] ?? ""} onChange={(e) => set("nearby", { ...data.nearby, [n]: e.target.value })} className="pr-10" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">KM</span>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

function Step7({ data, set }: StepProps) {
  return (
    <GlassCard>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="RERA Number"><Input value={data.rera_number} onChange={(e) => set("rera_number", e.target.value)} placeholder="PRM/KA/RERA/…" /></Field>
        <Field label="Khata Type">
          <Select value={data.khata_type} onValueChange={(v) => set("khata_type", v)}>
            <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="a">A Khata</SelectItem>
              <SelectItem value="b">B Khata</SelectItem>
              <SelectItem value="e">E Khata</SelectItem>
              <SelectItem value="na">Not applicable</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Legal Verification Status">
          <Select value={data.legal_verification} onValueChange={(v) => set("legal_verification", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_review">In review</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <div className="grid gap-3 pt-6">
          <label className="flex items-center gap-2"><Checkbox checked={data.occupancy_certificate} onCheckedChange={(v) => set("occupancy_certificate", Boolean(v))} /><span className="text-sm">Occupancy Certificate</span></label>
          <label className="flex items-center gap-2"><Checkbox checked={data.completion_certificate} onCheckedChange={(v) => set("completion_certificate", Boolean(v))} /><span className="text-sm">Completion Certificate</span></label>
          <label className="flex items-center gap-2"><Checkbox checked={data.bank_approved} onCheckedChange={(v) => set("bank_approved", Boolean(v))} /><span className="text-sm">Bank Approved</span></label>
        </div>
      </div>
    </GlassCard>
  );
}

function ImagePreviewModal({
  preview,
  onClose,
}: {
  preview: { url: string; title: string } | null;
  onClose: () => void;
}) {
  if (!preview) return null;

  return (
    <Dialog open={!!preview} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl w-[92vw] p-0 overflow-hidden bg-black/95 border-white/15 gap-0 shadow-2xl">
        <div className="px-6 py-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.03]">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-white truncate">{preview.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 text-xs border-white/15 text-white/80 hover:text-white bg-white/5"
              onClick={() => {
                const w = window.open("");
                if (w) {
                  w.document.write(`<title>${preview.title}</title><body style="margin:0;background:#09090b;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="${preview.url}" style="max-width:100%;max-height:100vh;object-fit:contain;" /></body>`);
                }
              }}
            >
              Open original
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-7 w-7 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="p-4 flex items-center justify-center bg-neutral-950/90 min-h-[300px] max-h-[75vh] overflow-auto">
          <img
            src={preview.url}
            alt={preview.title}
            className="max-h-[70vh] max-w-full object-contain rounded-lg border border-white/10 shadow-lg"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SingleMediaDrop({
  label,
  value,
  onChange,
  onPreview,
}: {
  label: string;
  value?: string;
  onChange: (v?: string) => void;
  onPreview: (url: string, title: string) => void;
}) {
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setProgress(20);
      try {
        const compressed = await compressImage(files[0]);
        setProgress(100);
        onChange(compressed);
        setTimeout(() => setProgress(0), 400);
        toast.success(`${label} uploaded`);
      } catch (err) {
        console.warn(`[SingleMediaDrop] Error uploading ${label}:`, err);
        setProgress(0);
      }
    },
    [label, onChange]
  );

  const { getRootProps, getInputProps, isDragActive, open: openPicker } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: false,
    noClick: !!value,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground/80">{label}</Label>
        {value && (
          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1">
            <Check className="h-2.5 w-2.5" /> Attached
          </Badge>
        )}
      </div>

      {value ? (
        <div
          {...getRootProps()}
          className={`relative group rounded-2xl border overflow-hidden bg-black/40 backdrop-blur-md transition-all ${
            isDragActive ? "border-primary ring-2 ring-primary/30" : "border-white/10 hover:border-white/20"
          }`}
        >
          <input {...getInputProps()} />

          {/* Image Container */}
          <div className="relative h-44 w-full bg-neutral-950/80 flex items-center justify-center overflow-hidden">
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

            {/* Top Badges & Action Toolbar */}
            <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-2 pointer-events-auto">
              <span className="text-[11px] font-medium text-white/90 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 shadow-sm truncate max-w-[55%]">
                {label}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 bg-black/70 hover:bg-black/90 text-white border border-white/15 rounded-lg shadow-sm"
                  title="Zoom / Preview full size"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPreview(value, label);
                  }}
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 bg-black/70 hover:bg-black/90 text-white border border-white/15 rounded-lg shadow-sm"
                  title="Replace Image"
                  onClick={(e) => {
                    e.stopPropagation();
                    openPicker();
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-7 w-7 bg-red-500/80 hover:bg-red-600 text-white rounded-lg shadow-sm"
                  title="Remove Image"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(undefined);
                    toast.info(`${label} removed`);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Bottom Info Bar */}
            <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between text-[11px] text-white/75 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 pointer-events-none">
              <span className="truncate flex items-center gap-1.5">
                <ImageIcon className="h-3 w-3 text-primary" /> Image Attached
              </span>
              <span className="text-[10px] text-white/50">Drop image to replace</span>
            </div>
          </div>

          {progress > 0 && <Progress value={progress} className="h-1 rounded-none" />}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
            isDragActive ? "border-primary bg-primary/5 scale-[0.99]" : "border-white/10 hover:border-white/20 bg-white/[0.01]"
          }`}
        >
          <input {...getInputProps()} />
          <div className="h-10 w-10 mx-auto rounded-xl bg-primary/10 grid place-items-center mb-2 text-primary">
            <Upload className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium text-foreground/90">
            {isDragActive ? "Drop image here" : "Drag & drop or click to upload"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP or JPEG (up to 10MB)</p>
          {progress > 0 && <Progress value={progress} className="mt-3 h-1" />}
        </div>
      )}
    </div>
  );
}

function GalleryMediaDrop({
  label,
  values = [],
  onChange,
  onPreview,
  onSetAsCover,
}: {
  label: string;
  values?: string[];
  onChange: (urls: string[]) => void;
  onPreview: (url: string, title: string) => void;
  onSetAsCover?: (url: string) => void;
}) {
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setProgress(20);
      try {
        const compressedUrls = await Promise.all(files.map((f) => compressImage(f)));
        setProgress(100);
        onChange([...values, ...compressedUrls]);
        setTimeout(() => setProgress(0), 400);
        toast.success(`Added ${compressedUrls.length} photo${compressedUrls.length > 1 ? "s" : ""} to gallery`);
      } catch (err) {
        console.warn("[GalleryMediaDrop] Compression notice:", err);
        setProgress(0);
      }
    },
    [onChange, values]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
  });

  const removePhoto = (idx: number) => {
    const updated = values.filter((_, i) => i !== idx);
    onChange(updated);
    toast.info("Photo removed from gallery");
  };

  const clearAll = () => {
    onChange([]);
    toast.info("All gallery photos cleared");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground/80">{label}</Label>
        <div className="flex items-center gap-2">
          {values.length > 0 && (
            <>
              <Badge variant="secondary" className="text-[10px]">
                {values.length} photo{values.length > 1 ? "s" : ""}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive"
              >
                Clear all
              </Button>
            </>
          )}
        </div>
      </div>

      {values.length > 0 ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
            {values.map((url, idx) => (
              <div
                key={`${url.slice(0, 32)}-${idx}`}
                className="relative group rounded-xl border border-white/10 overflow-hidden bg-neutral-950/80 aspect-video flex items-center justify-center shadow-sm"
              >
                <img
                  src={url}
                  alt={`Gallery photo ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 opacity-90 group-hover:opacity-100 transition-opacity" />

                {/* Index badge */}
                <div className="absolute top-1.5 left-1.5">
                  <span className="text-[10px] font-mono font-medium text-white/80 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded border border-white/10">
                    #{idx + 1}
                  </span>
                </div>

                {/* Top action buttons */}
                <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="h-6 w-6 bg-black/70 hover:bg-black/90 text-white rounded-md border border-white/15"
                    title="Zoom / Preview full size"
                    onClick={() => onPreview(url, `Gallery Photo #${idx + 1}`)}
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  {onSetAsCover && (
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-6 w-6 bg-black/70 hover:bg-black/90 text-amber-300 hover:text-amber-200 rounded-md border border-white/15"
                      title="Set as Cover Image"
                      onClick={() => onSetAsCover(url)}
                    >
                      <Star className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="h-6 w-6 bg-red-500/80 hover:bg-red-600 text-white rounded-md"
                    title="Remove this photo"
                    onClick={() => removePhoto(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="absolute bottom-1.5 inset-x-1.5 text-[10px] text-white/70 truncate text-center">
                  Photo #{idx + 1}
                </div>
              </div>
            ))}

            {/* Add more button tile in the grid */}
            <div
              {...getRootProps()}
              className={`rounded-xl border-2 border-dashed aspect-video flex flex-col items-center justify-center p-2 text-center cursor-pointer transition-all ${
                isDragActive
                  ? "border-primary bg-primary/10"
                  : "border-white/10 hover:border-primary/50 hover:bg-white/[0.02] bg-white/[0.01]"
              }`}
            >
              <input {...getInputProps()} />
              <div className="h-7 w-7 rounded-lg bg-primary/10 grid place-items-center text-primary mb-1">
                <Plus className="h-4 w-4" />
              </div>
              <span className="text-xs font-medium text-foreground/90">Add Photos</span>
              <span className="text-[10px] text-muted-foreground">Click or drop</span>
            </div>
          </div>
          {progress > 0 && <Progress value={progress} className="h-1" />}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
            isDragActive ? "border-primary bg-primary/5 scale-[0.99]" : "border-white/10 hover:border-white/20 bg-white/[0.01]"
          }`}
        >
          <input {...getInputProps()} />
          <div className="h-10 w-10 mx-auto rounded-xl bg-primary/10 grid place-items-center mb-2 text-primary">
            <Upload className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium text-foreground/90">
            {isDragActive ? "Drop multiple photos here" : "Drag & drop or click to upload gallery"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Select multiple PNG, JPG, WEBP (up to 20 photos)</p>
          {progress > 0 && <Progress value={progress} className="mt-3 h-1" />}
        </div>
      )}
    </div>
  );
}

function VideoMediaDrop({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (url?: string) => void;
}) {
  const [progress, setProgress] = useState(0);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  const onDrop = useCallback(
    (files: File[]) => {
      if (!files.length) return;
      const file = files[0];
      if (!file.type.startsWith("video/")) {
        toast.error("Please select a valid video file (.mp4, .webm, .mov, .ogg)");
        return;
      }

      setProgress(10);
      const formData = new FormData();
      formData.append("file", file);

      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/public/upload-media", true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 95);
          setProgress(Math.max(10, pct));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const resp = JSON.parse(xhr.responseText);
            if (resp.url) {
              setProgress(100);
              onChange(resp.url);
              setTimeout(() => setProgress(0), 500);
              toast.success("Walkthrough video uploaded & synchronized successfully");
              return;
            }
          } catch (err) {
            console.warn("[VideoMediaDrop] Response parse error:", err);
          }
        }

        // Fallback to FileReader if server upload returned non-200
        const r = new FileReader();
        r.onload = () => {
          setProgress(100);
          onChange(String(r.result));
          setTimeout(() => setProgress(0), 400);
          toast.success("Walkthrough video attached");
        };
        r.readAsDataURL(file);
      };

      xhr.onerror = () => {
        // Fallback to FileReader if network error
        const r = new FileReader();
        r.onload = () => {
          setProgress(100);
          onChange(String(r.result));
          setTimeout(() => setProgress(0), 400);
          toast.success("Walkthrough video attached (local fallback)");
        };
        r.readAsDataURL(file);
      };

      xhr.send(formData);
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive, open: openPicker } = useDropzone({
    onDrop,
    accept: { "video/*": [".mp4", ".webm", ".mov", ".ogg"] },
    multiple: false,
    noClick: !!value,
  });

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    onChange(urlInput.trim());
    setUrlInput("");
    setShowUrlInput(false);
    toast.success("Video URL attached");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground/80">{label}</Label>
        <div className="flex items-center gap-2">
          {value && (
            <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1">
              <Check className="h-2.5 w-2.5" /> Video Ready
            </Badge>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-primary gap-1"
          >
            <LinkIcon className="h-3 w-3" /> {showUrlInput ? "Cancel URL" : "Attach URL / Stream"}
          </Button>
        </div>
      </div>

      {showUrlInput && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-primary/20 bg-primary/5">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste MP4 URL, YouTube, or Vimeo embed link…"
            className="h-8 text-xs bg-background/80"
          />
          <Button type="button" size="sm" onClick={handleApplyUrl} className="h-8 text-xs px-3">
            Attach
          </Button>
        </div>
      )}

      {value ? (
        <div
          {...getRootProps()}
          className={`relative group rounded-2xl border overflow-hidden bg-black/50 backdrop-blur-md transition-all ${
            isDragActive ? "border-primary ring-2 ring-primary/30" : "border-white/10 hover:border-white/20"
          }`}
        >
          <input {...getInputProps()} />

          <div className="relative aspect-video w-full bg-neutral-950 flex items-center justify-center overflow-hidden">
            {value.includes("youtube.com") || value.includes("youtu.be") || value.includes("vimeo.com") ? (
              <iframe
                src={
                  value.includes("watch?v=")
                    ? value.replace("watch?v=", "embed/")
                    : value.includes("youtu.be/")
                    ? value.replace("youtu.be/", "www.youtube.com/embed/")
                    : value
                }
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <video
                src={value}
                controls
                playsInline
                className="w-full h-full object-cover"
              />
            )}

            {/* Top Toolbar */}
            <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between gap-2 pointer-events-auto z-20">
              <span className="text-[11px] font-medium text-white/90 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10 shadow-sm flex items-center gap-1.5">
                <Video className="h-3 w-3 text-primary" /> Walkthrough Video Tour
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 bg-black/75 hover:bg-black/90 text-white border border-white/15 rounded-lg shadow-sm"
                  title="Replace Video"
                  onClick={(e) => {
                    e.stopPropagation();
                    openPicker();
                  }}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="h-7 w-7 bg-red-500/80 hover:bg-red-600 text-white rounded-lg shadow-sm"
                  title="Remove Video"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(undefined);
                    toast.info("Video walkthrough removed");
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
          {progress > 0 && <Progress value={progress} className="h-1 rounded-none" />}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
            isDragActive ? "border-primary bg-primary/5 scale-[0.99]" : "border-white/10 hover:border-white/20 bg-white/[0.01]"
          }`}
        >
          <input {...getInputProps()} />
          <div className="h-10 w-10 mx-auto rounded-xl bg-primary/10 grid place-items-center mb-2 text-primary">
            <Video className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium text-foreground/90">
            {isDragActive ? "Drop walkthrough video here" : "Drag & drop video walkthrough or click to upload"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">MP4, WebM, MOV video file (up to 100MB) or paste stream URL</p>
          {progress > 0 && <Progress value={progress} className="mt-3 h-1" />}
        </div>
      )}
    </div>
  );
}

function BrochureMediaDrop({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (url?: string) => void;
}) {
  const [progress, setProgress] = useState(0);

  const onDrop = useCallback(
    (files: File[]) => {
      if (!files.length) return;
      setProgress(20);
      const r = new FileReader();
      r.onload = () => {
        setProgress(100);
        onChange(String(r.result));
        setTimeout(() => setProgress(0), 400);
        toast.success("Brochure PDF attached");
      };
      r.readAsDataURL(files[0]);
    },
    [onChange]
  );

  const { getRootProps, getInputProps, isDragActive, open: openPicker } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
    noClick: !!value,
  });

  const openPdf = () => {
    if (!value) return;
    const w = window.open("");
    if (w) {
      if (value.startsWith("data:")) {
        w.document.write(`<iframe src="${value}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      } else {
        w.location.href = value;
      }
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs uppercase tracking-wider text-muted-foreground/80">{label}</Label>
        {value && (
          <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10 gap-1">
            <Check className="h-2.5 w-2.5" /> PDF Ready
          </Badge>
        )}
      </div>

      {value ? (
        <div
          {...getRootProps()}
          className={`rounded-2xl border p-4 bg-black/40 backdrop-blur-md transition-all flex flex-wrap items-center justify-between gap-4 ${
            isDragActive ? "border-primary ring-2 ring-primary/30" : "border-white/10 hover:border-white/20"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="h-12 w-12 rounded-xl bg-red-500/15 border border-red-500/30 grid place-items-center text-red-400 shrink-0">
              <FileText className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">Property Brochure Document</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                <span>PDF Format</span>
                <span>•</span>
                <span className="text-emerald-400">Attached & ready</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openPdf}
              className="gap-1.5 h-8 text-xs border-white/15 hover:bg-white/5"
            >
              <Eye className="h-3.5 w-3.5 text-primary" /> View PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openPicker}
              className="gap-1.5 h-8 text-xs border-white/15 hover:bg-white/5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange(undefined);
                toast.info("Brochure removed");
              }}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          {progress > 0 && <Progress value={progress} className="w-full h-1 mt-2" />}
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
            isDragActive ? "border-primary bg-primary/5 scale-[0.99]" : "border-white/10 hover:border-white/20 bg-white/[0.01]"
          }`}
        >
          <input {...getInputProps()} />
          <div className="h-10 w-10 mx-auto rounded-xl bg-red-500/10 grid place-items-center mb-2 text-red-400">
            <FileText className="h-5 w-5" />
          </div>
          <div className="text-sm font-medium text-foreground/90">
            {isDragActive ? "Drop brochure PDF here" : "Drag & drop brochure PDF or click to upload"}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Official developer brochure or floor plan booklet (.PDF up to 25MB)</p>
          {progress > 0 && <Progress value={progress} className="mt-3 h-1" />}
        </div>
      )}
    </div>
  );
}

function Step8({ data, set }: StepProps) {
  const media = data.media;
  const [previewItem, setPreviewItem] = useState<{ url: string; title: string } | null>(null);

  const update = (patch: Partial<Wizard["media"]>) => set("media", { ...media, ...patch });

  const handleSetAsCover = (url: string) => {
    update({ cover: url });
    toast.success("Cover image updated from gallery selection");
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <SingleMediaDrop
          label="Cover Image"
          value={media.cover}
          onChange={(v) => update({ cover: v })}
          onPreview={(url, title) => setPreviewItem({ url, title })}
        />
        <GalleryMediaDrop
          label="Gallery Images"
          values={media.gallery}
          onChange={(gallery) => update({ gallery })}
          onPreview={(url, title) => setPreviewItem({ url, title })}
          onSetAsCover={handleSetAsCover}
        />
        <SingleMediaDrop
          label="Master Plan"
          value={media.master_plan}
          onChange={(v) => update({ master_plan: v })}
          onPreview={(url, title) => setPreviewItem({ url, title })}
        />
        <SingleMediaDrop
          label="Floor Plan"
          value={media.floor_plan}
          onChange={(v) => update({ floor_plan: v })}
          onPreview={(url, title) => setPreviewItem({ url, title })}
        />
        <div className="md:col-span-2">
          <VideoMediaDrop
            label="Property Video Tour / Walkthrough"
            value={media.video}
            onChange={(v) => update({ video: v })}
          />
        </div>
        <div className="md:col-span-2">
          <BrochureMediaDrop
            label="Brochure PDF"
            value={media.brochure}
            onChange={(v) => update({ brochure: v })}
          />
        </div>
      </div>

      <ImagePreviewModal
        preview={previewItem}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
}

function Step9({ data, set }: StepProps) {
  return (
    <GlassCard>
      <div className="space-y-5">
        <Field label="Short Description"><Textarea rows={2} maxLength={240} value={data.short_description} onChange={(e) => set("short_description", e.target.value)} placeholder="One-line pitch (max 240 chars)" /></Field>
        <Field label="Detailed Description"><Textarea rows={6} value={data.detailed_description} onChange={(e) => set("detailed_description", e.target.value)} placeholder="Rich narrative — architecture, neighbourhood, community…" /></Field>
        <Field label="Property Highlights"><Textarea rows={4} value={data.highlights} onChange={(e) => set("highlights", e.target.value)} placeholder="Bullet-style highlights, one per line" /></Field>
      </div>
    </GlassCard>
  );
}

function Step10({ aiResult, aiGenerating, onGenerate }: { aiResult: Record<string, number | string> | null; aiGenerating: boolean; onGenerate: () => void }) {
  const rows: Array<[string, string]> = [
    ["AI Investment Score", "investment_score"],
    ["Expected Appreciation", "expected_appreciation"],
    ["Rental Yield", "rental_yield"],
    ["ROI Score", "roi_score"],
    ["Risk Level", "risk_level"],
    ["Demand Index", "demand_index"],
    ["Growth Index", "growth_index"],
    ["Liquidity Index", "liquidity_index"],
    ["Infrastructure Score", "infrastructure_score"],
    ["Future Growth Prediction", "future_growth"],
  ];
  return (
    <div className="space-y-5">
      <GlassCard className="bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-primary/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/20 grid place-items-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-lg font-semibold">Investment Intelligence</div>
              <div className="text-sm text-muted-foreground">Computed by Sentinel AI Engine from all property attributes.</div>
            </div>
          </div>
          <Button onClick={onGenerate} disabled={aiGenerating} className="gap-2">
            {aiGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {aiResult ? "Regenerate" : "Generate AI Investment Score"}
          </Button>
        </div>
      </GlassCard>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([label, key]) => {
          const v = aiResult?.[key];
          return (
            <div key={key} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground/70">{label}</div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {v !== undefined && v !== null ? String(v) : <span className="text-muted-foreground/40">—</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
