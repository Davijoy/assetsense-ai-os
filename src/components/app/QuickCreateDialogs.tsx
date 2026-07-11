import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function NewLeadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    source: "website",
    stage: "new",
    score: 50,
    budget_inr: "",
    project: "",
    city: "",
    owner: "",
  });

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.source.trim()) {
      toast.error("Name and source are required");
      return;
    }
    setLoading(true);
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      source: form.source,
      stage: form.stage,
      score: Number(form.score) || 0,
      budget_inr: form.budget_inr ? Number(form.budget_inr) : null,
      project: form.project.trim() || null,
      city: form.city.trim() || null,
      owner: form.owner.trim() || null,
    };
    const { error } = await supabase.from("leads").insert(payload);
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Lead created");
    qc.invalidateQueries();
    onOpenChange(false);
    setForm({ name: "", email: "", phone: "", source: "website", stage: "new", score: 50, budget_inr: "", project: "", city: "", owner: "" });
    navigate({ to: "/app/leads" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Lead</DialogTitle>
          <DialogDescription>Add a lead to your CRM inbox. It will be scored and routed automatically.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="l-name">Full name *</Label>
              <Input id="l-name" value={form.name} onChange={(e) => set("name", e.target.value)} required maxLength={120} />
            </div>
            <div>
              <Label htmlFor="l-email">Email</Label>
              <Input id="l-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} maxLength={200} />
            </div>
            <div>
              <Label htmlFor="l-phone">Phone</Label>
              <Input id="l-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={30} />
            </div>
            <div>
              <Label>Source *</Label>
              <Select value={form.source} onValueChange={(v) => set("source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="voice_ai">Voice AI</SelectItem>
                  <SelectItem value="campaign">Campaign</SelectItem>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                  <SelectItem value="marketplace">Marketplace</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Stage</Label>
              <Select value={form.stage} onValueChange={(v) => set("stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="visit">Site visit</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="l-city">City</Label>
              <Input id="l-city" value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={80} />
            </div>
            <div>
              <Label htmlFor="l-project">Interested project</Label>
              <Input id="l-project" value={form.project} onChange={(e) => set("project", e.target.value)} maxLength={120} />
            </div>
            <div>
              <Label htmlFor="l-budget">Budget (INR)</Label>
              <Input id="l-budget" type="number" min={0} value={form.budget_inr} onChange={(e) => set("budget_inr", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="l-score">AI score (0-100)</Label>
              <Input id="l-score" type="number" min={0} max={100} value={form.score} onChange={(e) => set("score", Number(e.target.value))} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="l-owner">Owner (email or name)</Label>
              <Input id="l-owner" value={form.owner} onChange={(e) => set("owner", e.target.value)} maxLength={120} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Creating…" : "Create lead"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function NewPropertyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    property_type: "apartment",
    price_inr: "",
    status: "available",
    ai_score: 70,
    developer: "",
  });

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.city.trim() || !form.price_inr) {
      toast.error("Name, city and price are required");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("properties").insert({
      name: form.name.trim(),
      city: form.city.trim(),
      property_type: form.property_type,
      price_inr: Number(form.price_inr),
      status: form.status,
      ai_score: Number(form.ai_score) || 0,
      developer: form.developer.trim() || null,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message.includes("row-level security") ? "You need admin or manager access to add properties." : error.message);
      return;
    }
    toast.success("Property added to marketplace");
    qc.invalidateQueries();
    onOpenChange(false);
    setForm({ name: "", city: "", property_type: "apartment", price_inr: "", status: "available", ai_score: 70, developer: "" });
    navigate({ to: "/app/marketplace" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Property</DialogTitle>
          <DialogDescription>List a property on the Sentinel marketplace with an AI investment score.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="p-name">Name *</Label>
              <Input id="p-name" value={form.name} onChange={(e) => set("name", e.target.value)} required maxLength={160} />
            </div>
            <div>
              <Label htmlFor="p-city">City *</Label>
              <Input id="p-city" value={form.city} onChange={(e) => set("city", e.target.value)} required maxLength={80} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.property_type} onValueChange={(v) => set("property_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="plot">Plot</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="office">Office</SelectItem>
                  <SelectItem value="retail">Retail</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="p-price">Price (INR) *</Label>
              <Input id="p-price" type="number" min={0} value={form.price_inr} onChange={(e) => set("price_inr", e.target.value)} required />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="off_market">Off market</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="p-score">AI investment score</Label>
              <Input id="p-score" type="number" min={0} max={100} value={form.ai_score} onChange={(e) => set("ai_score", Number(e.target.value))} />
            </div>
            <div className="col-span-2">
              <Label htmlFor="p-dev">Developer</Label>
              <Input id="p-dev" value={form.developer} onChange={(e) => set("developer", e.target.value)} maxLength={160} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Adding…" : "Add property"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}