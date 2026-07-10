import { createFileRoute } from "@tanstack/react-router";
import { ProductPage } from "@/components/landing/ProductPage";
import {
  LayoutDashboard,
  TrendingUp,
  LineChart,
  Boxes,
  Globe2,
  Gauge,
  Command,
  Sparkles,
  HeartPulse,
} from "lucide-react";

export const Route = createFileRoute("/product/bi")({
  head: () => ({
    meta: [
      { title: "Sentinel BI — Executive Decision Intelligence" },
      { name: "description", content: "Executive dashboards, forecasts, market and inventory intelligence, KPIs and AI recommendations with a Business Health Score." },
      { property: "og:title", content: "Sentinel BI" },
    ],
  }),
  component: BiPage,
});

function BiPage() {
  return (
    <ProductPage
      eyebrow="Product · Business Intelligence"
      title={<>Turn business data into <span className="text-primary">executive decisions</span>.</>}
      tagline="Decision intelligence, unified"
      lead="Sentinel BI transforms CRM, ERP, Marketplace, Voice and Marketing data into executive dashboards, forecasts and AI recommendations — governed by a live Business Health Score."
      highlights={["Forecast suites", "Market intelligence", "AI recommendations", "Health score"]}
      features={[
        { icon: LayoutDashboard, title: "Executive Dashboards", description: "Curated dashboards for CEOs, CFOs, CROs and project heads with drilldowns." },
        { icon: TrendingUp, title: "Revenue Forecasting", description: "Weighted pipeline + booking cohorts + inventory absorption forecasts with confidence bands." },
        { icon: LineChart, title: "Sales Analytics", description: "Funnel velocity, source ROI, agent performance and closure quality." },
        { icon: Boxes, title: "Inventory Intelligence", description: "Absorption, ageing, price elasticity and slow-mover recommendations." },
        { icon: Globe2, title: "Market Intelligence", description: "Micro-market benchmarks, competitor launches, price and demand signals." },
        { icon: Gauge, title: "Performance KPIs", description: "Configurable KPIs with SLAs, targets, streaks and anomaly detection." },
        { icon: Command, title: "Executive Command Center", description: "One control tower for the group — with drill-down explainability on every widget." },
        { icon: Sparkles, title: "AI Recommendations", description: "Ranked next-best-actions with quantified impact and confidence scores." },
        { icon: HeartPulse, title: "Business Health Score", description: "Composite live score with signal-level breakdown and trend history." },
      ]}
      workflow={{
        title: "From data to decision",
        steps: [
          { title: "Unify", description: "All Sentinel modules feed a governed semantic layer." },
          { title: "Model", description: "Forecasts and health signals run continuously." },
          { title: "Explain", description: "Every number opens into drivers, methods and confidence." },
          { title: "Act", description: "AI recommendations turn insights into approved actions." },
        ],
      }}
    />
  );
}