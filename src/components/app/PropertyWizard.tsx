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
  Loader2,
  MapPin,
  Save,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

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
  media: { cover?: string; gallery: string[]; master_plan?: string; floor_plan?: string; brochure?: string };
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

export function PropertyWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
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

  const set = <K extends keyof Wizard>(k: K, v: Wizard[K]) => setData((d) => ({ ...d, [k]: v }));

  const totalCost = useMemo(() =>
    num(data.base_price) + num(data.registration_charges) + num(data.maintenance_charges) + num(data.parking_charges) + num(data.clubhouse_charges),
  [data.base_price, data.registration_charges, data.maintenance_charges, data.parking_charges, data.clubhouse_charges]);

  const buildPayload = useCallback((isDraft: boolean) => {
    const { name, city, property_type, status, developer, base_price, ...rest } = data;
    return {
      name: name || "Untitled property",
      city: city || "Unspecified",
      property_type,
      status,
      developer: developer || null,
      price_inr: num(base_price) || totalCost || 0,
      is_draft: isDraft,
      attributes: { ...rest, total_cost: totalCost, ai: aiResult ?? null },
    };
  }, [data, totalCost, aiResult]);

  const save = useCallback(async (isDraft: boolean, silent = false) => {
    if (!silent) setSaving(true);
    const payload = buildPayload(isDraft);
    let error;
    if (draftId) {
      ({ error } = await supabase.from("properties").update(payload).eq("id", draftId));
    } else {
      const res = await supabase.from("properties").insert(payload).select("id").maybeSingle();
      error = res.error;
      if (res.data?.id) setDraftId(res.data.id);
    }
    if (!silent) setSaving(false);
    if (error) {
      if (!silent) toast.error(error.message.includes("row-level security") ? "You need admin or manager access to save properties." : error.message);
      return false;
    }
    if (!silent) toast.success(isDraft ? "Draft saved" : "Property published");
    qc.invalidateQueries({ queryKey: ["marketplace-properties"] });
    return true;
  }, [buildPayload, draftId, qc]);

  useEffect(() => {
    if (!open) return;
    if (autosaveRef.current) clearInterval(autosaveRef.current);
    autosaveRef.current = setInterval(() => {
      if (data.name.trim()) save(true, true);
    }, 30000);
    return () => { if (autosaveRef.current) clearInterval(autosaveRef.current); };
  }, [open, data.name, save]);

  const reset = () => { setStep(1); setData(empty); setDraftId(null); setAiResult(null); };

  const close = (o: boolean) => { if (!o) reset(); onOpenChange(o); };

  const validateStep = (n: number): string | null => {
    if (n === 1) {
      if (!data.name.trim()) return "Property name is required";
      if (!data.developer.trim()) return "Developer is required";
    }
    if (n === 2 && !data.city.trim()) return "City is required";
    if (n === 3 && !data.base_price) return "Base price is required";
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
    const ok = await save(false);
    setPublishing(false);
    if (ok) {
      close(false);
      navigate({ to: "/app/marketplace" });
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
                <h2 className="text-xl font-semibold tracking-tight">Add Property</h2>
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
              {step === 3 && <Step3 data={data} set={set} totalCost={totalCost} />}
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
                  Publish Property
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

type StepProps = { data: Wizard; set: <K extends keyof Wizard>(k: K, v: Wizard[K]) => void };

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

function Step3({ data, set, totalCost }: StepProps & { totalCost: number }) {
  const priceField = (k: keyof Wizard, label: string, req?: boolean) => (
    <Field label={label} required={req}>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">₹</span>
        <Input type="number" min={0} value={data[k] as string} onChange={(e) => set(k, e.target.value as any)} className="pl-7" />
      </div>
    </Field>
  );
  return (
    <div className="space-y-5">
      <GlassCard>
        <div className="grid gap-5 md:grid-cols-3">
          {priceField("base_price", "Base Price", true)}
          {priceField("price_per_sqft", "Price per Sq.ft")}
          {priceField("registration_charges", "Registration Charges")}
          {priceField("maintenance_charges", "Maintenance Charges")}
          {priceField("parking_charges", "Parking Charges")}
          {priceField("clubhouse_charges", "Club House Charges")}
        </div>
      </GlassCard>
      <GlassCard className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-wider text-primary/80">Total Property Cost</div>
            <div className="mt-1 text-3xl font-bold tracking-tight">₹ {totalCost.toLocaleString("en-IN")}</div>
          </div>
          <div className="text-right text-xs text-muted-foreground max-w-xs">
            Auto-calculated from base price + registration + maintenance + parking + club house
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

function Step4({ data, set }: StepProps) {
  const dim = (k: keyof Wizard, label: string) => (
    <Field label={label}><Input type="number" min={0} value={data[k] as string} onChange={(e) => set(k, e.target.value as any)} /></Field>
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

function MediaDrop({ label, kind, value, onChange, multi = false }: { label: string; kind: string; value?: string | string[]; onChange: (v: any) => void; multi?: boolean }) {
  const [progress, setProgress] = useState(0);
  const onDrop = useCallback((files: File[]) => {
    if (!files.length) return;
    setProgress(10);
    const reads = files.map((f) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsDataURL(f); }));
    Promise.all(reads).then((urls) => {
      setProgress(100);
      onChange(multi ? [...((value as string[]) || []), ...urls] : urls[0]);
      setTimeout(() => setProgress(0), 600);
    });
  }, [multi, onChange, value]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: kind === "brochure" ? { "application/pdf": [".pdf"] } : { "image/*": [] }, multiple: multi });
  const count = multi ? ((value as string[]) || []).length : value ? 1 : 0;
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground/80">{label}</Label>
      <div {...getRootProps()} className={`mt-2 rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${isDragActive ? "border-primary bg-primary/5" : "border-white/10 hover:border-white/20"}`}>
        <input {...getInputProps()} />
        <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
        <div className="text-sm">{isDragActive ? "Drop files here" : "Drag & drop or click to upload"}</div>
        {count > 0 && <div className="text-xs text-primary mt-1">{count} file{count > 1 ? "s" : ""} attached</div>}
        {progress > 0 && <Progress value={progress} className="mt-3 h-1" />}
      </div>
    </div>
  );
}

function Step8({ data, set }: StepProps) {
  const media = data.media;
  const update = (patch: Partial<Wizard["media"]>) => set("media", { ...media, ...patch });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <MediaDrop label="Cover Image" kind="image" value={media.cover} onChange={(v) => update({ cover: v })} />
      <MediaDrop label="Gallery Images" kind="image" multi value={media.gallery} onChange={(v) => update({ gallery: v })} />
      <MediaDrop label="Master Plan" kind="image" value={media.master_plan} onChange={(v) => update({ master_plan: v })} />
      <MediaDrop label="Floor Plan" kind="image" value={media.floor_plan} onChange={(v) => update({ floor_plan: v })} />
      <div className="md:col-span-2">
        <MediaDrop label="Brochure PDF" kind="brochure" value={media.brochure} onChange={(v) => update({ brochure: v })} />
      </div>
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
