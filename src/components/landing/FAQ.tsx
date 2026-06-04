import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  { q: "Is Sentinel Fort Group built for developers or brokers?", a: "Both. The platform offers dedicated portals for developers, brokers, channel partners and enterprise sales teams — all on a unified data layer." },
  { q: "Can the AI voice agents speak Indian languages?", a: "Yes. Out of the box we support English, Hindi, Marathi, Tamil, Telugu and Kannada with natural conversation flow." },
  { q: "Do you offer multi-tenant SaaS for white-labelling?", a: "Enterprise plans include multi-tenant architecture, custom domains, branding and role-based access control." },
  { q: "How does data security work?", a: "Enterprise-grade encryption in transit and at rest, full audit logs, RBAC, and ISO/SOC-aligned controls." },
  { q: "What integrations are included?", a: "WhatsApp Business, Google Maps, Google/Meta Ads, Razorpay, Stripe, Twilio, Zoom, OpenAI and more." },
];

export function FAQ() {
  return (
    <section className="relative py-32">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1fr_2fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-primary">FAQ</p>
          <h2 className="mt-4 font-display text-5xl">Questions, <em>answered.</em></h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`i${i}`} className="border-border">
              <AccordionTrigger className="text-left text-lg hover:no-underline">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}