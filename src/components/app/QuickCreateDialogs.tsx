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
import { PropertyWizard } from "./PropertyWizard";

export const NewPropertyDialog = PropertyWizard;

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
    const payload = {
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
