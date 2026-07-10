import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "@/components/landing/ProductPage";
import {
  Boxes,
  Building2,
  BookOpen,
  Wallet,
  CreditCard,
  Percent,
  LineChart,
  HardHat,
  Truck,
  FileText,
  Link2,
} from "lucide-react";

export const Route = createFileRoute("/product/erp")({
  head: () => ({
    meta: [
      { title: "Sentinel ERP — Real Estate Operations Platform" },
      { name: "description", content: "Inventory, bookings, collections, finance, construction, vendors and documents — unified with your CRM." },
      { property: "og:title", content: "Sentinel ERP" },
    ],
  }),
  component: ErpPage,
});

function ErpPage() {
  return (
    <ProductPage
      eyebrow="Product · ERP"
      title={<>The operating system for <span className="text-primary">every project</span>.</>}
      tagline="Unified operations & finance"
      lead="Sentinel ERP runs inventory, bookings, collections, finance, construction and vendors on one platform — fully wired into CRM, Marketplace and BI."
      highlights={["Live inventory sync", "Automated collections", "GST-ready finance", "Construction milestones"]}
      features={[
        { icon: Boxes, title: "Inventory Management", description: "Tower, floor, unit and typology hierarchies with holds, blocks, releases and audit history." },
        { icon: Building2, title: "Unit Availability", description: "Realtime availability across projects with pricing rules, offers and channel entitlements." },
        { icon: BookOpen, title: "Booking Management", description: "Digital booking forms, KYC, agreement workflow, e-sign and instant handover to finance." },
        { icon: Wallet, title: "Collections", description: "Milestone-based demand generation, receipts, ageing buckets and dunning cadences." },
        { icon: CreditCard, title: "Payment Tracking", description: "Multi-mode reconciliation, gateway integrations and automated receipts with GST invoices." },
        { icon: Percent, title: "Commission Management", description: "Broker/channel commission slabs, invoices, TDS and payout workflows." },
        { icon: LineChart, title: "Finance Dashboard", description: "P&L, receivables, cashflow and project profitability with drilldowns for CFOs." },
        { icon: HardHat, title: "Construction Progress", description: "Milestone tracking, quality checks, drone imagery and RERA-ready progress reports." },
        { icon: Truck, title: "Vendor Management", description: "Onboarding, POs, GRN, invoice matching and vendor performance analytics." },
        { icon: FileText, title: "Document Management", description: "Secure vault with versioning, e-sign, expiry alerts and role-based access." },
      ]}
      workflow={{
        title: "Booking to handover, orchestrated",
        steps: [
          { title: "Book", description: "CRM handoff into digital booking with KYC and e-sign." },
          { title: "Bill", description: "Milestone demands, reminders and reconciliations run on autopilot." },
          { title: "Build", description: "Construction milestones and quality signals feed the customer portal." },
          { title: "Hand over", description: "Snag lists, possession letters and post-sales loyalty transitions." },
        ],
      }}
    >
      <div className="rounded-2xl border border-gold/20 bg-surface/40 p-8 sm:p-10">
        <div className="flex items-center gap-3 text-gold">
          <Link2 className="h-5 w-5" />
          <div className="text-[11px] uppercase tracking-[0.28em]">CRM x ERP</div>
        </div>
        <h3 className="mt-3 font-display text-2xl text-foreground">One data model, zero handoff loss.</h3>
        <p className="mt-3 text-muted-foreground">
          Leads in CRM see the same live inventory as ERP. When a booking is created, finance, collections, commissions and construction schedules are provisioned automatically — no CSV exports, no reconciliation nights.
        </p>
      </div>
    </ProductPage>
  );
}