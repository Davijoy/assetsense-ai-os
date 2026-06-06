import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const messageSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
});

export type CopilotMessage = z.infer<typeof messageSchema>["messages"][number];

async function buildContext(): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [leadsRes, propsRes, callsRes] = await Promise.all([
    supabaseAdmin.from("leads").select("stage,source,city,budget_inr,score"),
    supabaseAdmin.from("properties").select("city,status,price_inr,property_type,ai_score"),
    supabaseAdmin.from("calls").select("intent_label,sentiment,qualified,duration_sec"),
  ]);

  const leads = leadsRes.data ?? [];
  const properties = propsRes.data ?? [];
  const calls = callsRes.data ?? [];

  const byStage = leads.reduce<Record<string, number>>((a, l) => {
    a[l.stage] = (a[l.stage] ?? 0) + 1;
    return a;
  }, {});
  const bySource = leads.reduce<Record<string, number>>((a, l) => {
    a[l.source] = (a[l.source] ?? 0) + 1;
    return a;
  }, {});
  const byCity = leads.reduce<Record<string, number>>((a, l) => {
    const k = l.city ?? "Unknown";
    a[k] = (a[k] ?? 0) + 1;
    return a;
  }, {});
  const booked = leads.filter((l) => l.stage === "booked");
  const revenueCr =
    Math.round(booked.reduce((s, l) => s + (l.budget_inr ?? 0), 0) / 10_000_000);
  const qualified = calls.filter((c) => c.qualified).length;
  const intents = calls.reduce<Record<string, number>>((a, c) => {
    a[c.intent_label] = (a[c.intent_label] ?? 0) + 1;
    return a;
  }, {});

  return `LIVE ASSETSENSE SNAPSHOT (use these numbers in answers):
- Total leads: ${leads.length}
- Lead stages: ${JSON.stringify(byStage)}
- Lead sources: ${JSON.stringify(bySource)}
- Lead cities: ${JSON.stringify(byCity)}
- Bookings: ${booked.length} | Booked revenue: ₹${revenueCr} Cr
- Properties: ${properties.length} (${properties.filter((p) => p.status === "available").length} available, ${properties.filter((p) => p.status === "sold").length} sold)
- Avg property AI score: ${properties.length ? Math.round(properties.reduce((s, p) => s + p.ai_score, 0) / properties.length) : 0}
- AI Voice calls: ${calls.length} | Qualified: ${qualified} (${calls.length ? Math.round((qualified / calls.length) * 100) : 0}%)
- Top intents: ${JSON.stringify(intents)}`;
}

export const askCopilot = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => messageSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const context = await buildContext();
    const system = `You are Sentinel Executive Copilot™ — the decision-intelligence brain of Sentinel Fort Group.
You have read access to CRM, ERP, Marketplace, Knowledge Engine, Deal Rooms, Risk Center,
Market Intelligence, Collections, Voice AI and BI. Speak like a McKinsey partner briefing a CEO.

Every answer MUST follow this structure:
1) Headline — one decisive sentence.
2) Insights — 2–4 bullets with hard numbers (always ₹ Cr / Lakh).
3) Prediction — what happens next, with a confidence % (0–100).
4) **Recommendation** — bolded, action-oriented, dispatchable as a workflow.
5) Confidence — overall confidence on the recommendation (0–100).

Be decisive, never hedge. Ground numbers in the SNAPSHOT below.

${context}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: system }, ...data.messages],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) return { reply: "Rate limit hit — try again in a moment.", error: true };
      if (res.status === 402) return { reply: "AI credits exhausted. Add credits in workspace settings.", error: true };
      throw new Error(`AI gateway: ${res.status} ${text}`);
    }

    const json = await res.json();
    const reply: string = json.choices?.[0]?.message?.content ?? "(no response)";
    return { reply, error: false };
  });