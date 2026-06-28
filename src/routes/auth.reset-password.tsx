import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SentinelMark } from "@/components/brand/Logo";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/auth/reset-password")({
  head: () => ({ meta: [{ title: "Set new password — Sentinel Fort" }] }),
  component: ResetPasswordPage,
});

const pwSchema = z.string().min(8, "Min 8 characters").max(72);

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [valid, setValid] = useState(false);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Supabase puts the recovery tokens in the URL hash (#access_token=...&type=recovery)
  // and the JS client auto-establishes a session for the "recovery" flow. We just
  // need to confirm a session exists before allowing updateUser.
  useEffect(() => {
    let active = true;
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setValid(!!data.session);
      setReady(true);
    };
    check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setValid(true);
        setReady(true);
      }
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = pwSchema.safeParse(pw);
    if (!r.success) return toast.error(r.error.issues[0].message);
    if (pw !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setDone(true);
      toast.success("Password updated");
      setTimeout(() => navigate({ to: "/app/crm" }), 1200);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not update password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-3">
          <SentinelMark />
          <div className="text-center">
            <div className="font-display text-2xl">Sentinel Fort</div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-gold/80">Group</div>
          </div>
        </Link>
        <div className="rounded-xl border border-border/60 bg-surface p-8 shadow-xl">
          {!ready ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : !valid ? (
            <div className="text-center">
              <h1 className="text-xl font-semibold">Reset link invalid or expired</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Please request a new password reset link.
              </p>
              <Button asChild className="mt-6 w-full">
                <Link to="/auth/forgot-password">Request new link</Link>
              </Button>
            </div>
          ) : done ? (
            <div className="text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <h1 className="mt-4 text-xl font-semibold">Password updated</h1>
              <p className="mt-2 text-sm text-muted-foreground">Redirecting to the console…</p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold">Set a new password</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Must be at least 8 characters.
              </p>
              <form onSubmit={submit} className="mt-6 space-y-4">
                <div>
                  <Label htmlFor="pw">New password</Label>
                  <Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1" />
                </div>
                <Button type="submit" disabled={busy} className="w-full">
                  {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Update password
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}