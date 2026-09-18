/**
 * Reusable Intelligence Drill-Down Component
 *
 * A generic, reusable component for drilling into intelligence data across
 * all business modules (Inventory, Customer, Market, Supreme).
 *
 * Features:
 * - Expandable/collapsible sections
 * - KPI cards with trends
 * - Tabular data with sorting/filtering
 * - Chart placeholders (recharts-ready)
 * - Recommendation cards with actions
 * - Evidence trail display
 * - Export functionality
 * - Loading/error/empty states
 */

import { useState, useMemo, useCallback } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  ExternalLink,
  BarChart2,
  Table,
  Layers,
  Target,
  Zap,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";

/** Generic intelligence data structure */
export interface IntelligenceData<T = unknown> {
  /** Module identifier */
  module: "inventory" | "customer" | "market" | "supreme" | "crm";
  /** Unique snapshot ID */
  snapshotId: string;
  /** When this intelligence was generated (server-authoritative) */
  generatedAt: string;
  /** Workspace ID */
  workspaceId: string;
  /** Correlation ID for tracing */
  correlationId: string;
  /** Summary KPIs */
  kpis: KPI[];
  /** Grouped/segmented data */
  groupings: Grouping[];
  /** Time series data */
  timeSeries: TimeSeriesPoint[];
  /** Recommendations from decision engine */
  recommendations: Recommendation[];
  /** Risk assessments */
  risks: Risk[];
  /** Evidence trail */
  evidence: Evidence[];
  /** Metadata */
  metadata: Record<string, unknown>;
}

/** KPI definition */
export interface KPI {
  id: string;
  label: string;
  value: string | number;
  previousValue?: string | number;
  unit?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: number;
  format?: "number" | "currency" | "percentage" | "duration" | "raw";
  status?: "good" | "warning" | "critical" | "neutral";
  description?: string;
  drillDownKey?: string; // Key to filter groupings/timeSeries
}

/** Grouping/segmentation data */
export interface Grouping {
  id: string;
  name: string;
  category: string;
  value: number;
  previousValue?: number;
  percentage?: number;
  subGroupings?: Grouping[];
  metadata?: Record<string, unknown>;
}

/** Time series point */
export interface TimeSeriesPoint {
  timestamp: string; // ISO 8601
  value: number;
  label?: string;
  forecast?: number;
  lowerBound?: number;
  upperBound?: number;
  metadata?: Record<string, unknown>;
}

/** Recommendation from decision engine */
export interface Recommendation {
  id: string;
  title: string;
  description: string;
  businessReason: string;
  affectedSegment: string;
  recommendedAction: string;
  expectedImpact: string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number; // 0-1
  supportingMetrics: Record<string, unknown>;
  decisionReference: string;
  correlationId: string;
  generatedAt: string;
  status: "pending" | "approved" | "rejected" | "executed" | "dismissed";
  deliveryStatus?: "pending" | "DELIVERED" | "FAILED" | "READ";
  deliveryChannel?: string;
  metadata?: Record<string, unknown>;
}

/** Risk assessment */
export interface Risk {
  id: string;
  title: string;
  explanation: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  confidence: number;
  affectedSegment: string;
  recommendedAction: string;
  expectedBusinessImpact: string;
  humanReviewRequired: boolean;
  evidence: Evidence[];
  decisionId: string;
  correlationId: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

/** Evidence item */
export interface Evidence {
  factor: string;
  value: unknown;
  impact: number; // -1 to 1
  confidence: number; // 0-1
  source: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/** Drill-down configuration */
export interface DrillDownConfig {
  /** Module-specific title */
  title: string;
  /** Module-specific subtitle */
  subtitle?: string;
  /** Icon for the module */
  icon?: React.ReactNode;
  /** Default expanded sections */
  defaultExpanded?: string[];
  /** Enable export */
  enableExport?: boolean;
  /** Enable real-time refresh */
  enableRefresh?: boolean;
  /** Refresh interval in ms */
  refreshInterval?: number;
  /** Custom KPI renderers */
  kpiRenderers?: Record<string, (kpi: KPI) => React.ReactNode>;
  /** Custom grouping renderers */
  groupingRenderers?: Record<string, (grouping: Grouping) => React.ReactNode>;
  /** Custom recommendation actions */
  recommendationActions?: RecommendationAction[];
  /** Color theme */
  theme?: "default" | "inventory" | "customer" | "market" | "supreme";
}

/** Recommendation action */
export interface RecommendationAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost";
  onClick: (recommendation: Recommendation) => void;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

/** Drill-down state */
export interface DrillDownState {
  expandedSections: Set<string>;
  searchQuery: string;
  activeTab: string;
  sortConfig: { key: string; direction: "asc" | "desc" } | null;
  filters: Record<string, unknown>;
  viewMode: "cards" | "table" | "chart";
}

/** Default configuration per module */
export const MODULE_CONFIGS: Record<string, DrillDownConfig> = {
  inventory: {
    title: "Inventory Intelligence",
    subtitle: "Tower-level health, absorption velocity, and AI-triggered incentive workflows",
    icon: <Layers className="h-5 w-5" />,
    defaultExpanded: ["kpis", "groupings", "recommendations"],
    enableExport: true,
    enableRefresh: true,
    refreshInterval: 30000,
    theme: "inventory",
  },
  customer: {
    title: "Customer Intelligence",
    subtitle: "Engagement scores, lead source analysis, and conversion funnel optimization",
    icon: <Target className="h-5 w-5" />,
    defaultExpanded: ["kpis", "groupings", "recommendations"],
    enableExport: true,
    enableRefresh: true,
    refreshInterval: 30000,
    theme: "customer",
  },
  market: {
    title: "Market Intelligence",
    subtitle: "Competitive positioning, demand signals, and pricing optimization",
    icon: <BarChart2 className="h-5 w-5" />,
    defaultExpanded: ["kpis", "timeSeries", "recommendations"],
    enableExport: true,
    enableRefresh: true,
    refreshInterval: 60000,
    theme: "market",
  },
  supreme: {
    title: "Supreme Intelligence",
    subtitle: "Cross-domain correlation, portfolio-level optimization, and strategic recommendations",
    icon: <Zap className="h-5 w-5" />,
    defaultExpanded: ["kpis", "correlations", "recommendations"],
    enableExport: true,
    enableRefresh: true,
    refreshInterval: 60000,
    theme: "supreme",
  },
  crm: {
    title: "CRM Intelligence",
    subtitle: "Pipeline health, deal velocity, and sales forecasting",
    icon: <Target className="h-5 w-5" />,
    defaultExpanded: ["kpis", "funnel", "recommendations"],
    enableExport: true,
    enableRefresh: true,
    refreshInterval: 30000,
    theme: "default",
  },
};

/**
 * Main Intelligence Drill-Down Component
 */
export function IntelligenceDrillDown<T extends IntelligenceData = IntelligenceData>({
  data,
  config,
  onRefresh,
  onRecommendationAction,
  onExport,
  className = "",
}: {
  data: T | null;
  config?: Partial<DrillDownConfig>;
  onRefresh?: () => Promise<void>;
  onRecommendationAction?: (actionId: string, recommendation: Recommendation) => void;
  onExport?: (format: "json" | "csv" | "pdf") => void;
  className?: string;
}) {
  const module = data?.module ?? "inventory";
  const mergedConfig = { ...MODULE_CONFIGS[module], ...config };
  const theme = mergedConfig.theme ?? "default";

  const [state, setState] = useState<DrillDownState>({
    expandedSections: new Set(mergedConfig.defaultExpanded ?? []),
    searchQuery: "",
    activeTab: "overview",
    sortConfig: null,
    filters: {},
    viewMode: "cards",
  });

  const toggleSection = useCallback((section: string) => {
    setState((prev) => {
      const newExpanded = new Set(prev.expandedSections);
      if (newExpanded.has(section)) {
        newExpanded.delete(section);
      } else {
        newExpanded.add(section);
      }
      return { ...prev, expandedSections: newExpanded };
    });
  }, []);

  const handleSearch = useCallback((query: string) => {
    setState((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const handleSort = useCallback((key: string) => {
    setState((prev) => ({
      ...prev,
      sortConfig:
        prev.sortConfig?.key === key
          ? { key, direction: prev.sortConfig.direction === "asc" ? "desc" : "asc" }
          : { key, direction: "asc" },
    }));
  }, []);

  const handleFilterChange = useCallback((key: string, value: unknown) => {
    setState((prev) => ({
      ...prev,
      filters: { ...prev.filters, [key]: value },
    }));
  }, []);

  const handleRecommendationAction = useCallback(
    (actionId: string, recommendation: Recommendation) => {
      onRecommendationAction?.(actionId, recommendation);
    },
    [onRecommendationAction]
  );

  const handleExport = useCallback(
    (format: "json" | "csv" | "pdf") => {
      onExport?.(format);
    },
    [onExport]
  );

  if (!data) {
    return (
      <div className={`space-y-4 ${className}`}>
        <IntelligenceEmptyState
          title="No Intelligence Data"
          description="Intelligence snapshot is not available. Trigger a refresh or check your data sources."
          onRefresh={onRefresh}
        />
      </div>
    );
  }

  const filteredGroupings = useMemo(() => {
    if (!state.searchQuery) return data.groupings;
    const query = state.searchQuery.toLowerCase();
    return data.groupings.filter(
      (g) =>
        g.name.toLowerCase().includes(query) ||
        g.category.toLowerCase().includes(query) ||
        String(g.value).includes(query)
    );
  }, [data.groupings, state.searchQuery]);

  const filteredRecommendations = useMemo(() => {
    if (!state.searchQuery) return data.recommendations;
    const query = state.searchQuery.toLowerCase();
    return data.recommendations.filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query) ||
        r.affectedSegment.toLowerCase().includes(query)
    );
  }, [data.recommendations, state.searchQuery]);

  const filteredRisks = useMemo(() => {
    if (!state.searchQuery) return data.risks;
    const query = state.searchQuery.toLowerCase();
    return data.risks.filter(
      (r) =>
        r.title.toLowerCase().includes(query) ||
        r.explanation.toLowerCase().includes(query) ||
        r.affectedSegment.toLowerCase().includes(query)
    );
  }, [data.risks, state.searchQuery]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-${theme === "inventory" ? "emerald" : theme === "customer" ? "blue" : theme === "market" ? "amber" : theme === "supreme" ? "violet" : "primary"}/10`}>
              {mergedConfig.icon}
            </div>
            <div>
              <h1 className="font-display text-3xl">{mergedConfig.title}</h1>
              {mergedConfig.subtitle && (
                <p className="text-sm text-muted-foreground">{mergedConfig.subtitle}</p>
              )}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Info className="h-3 w-3" />
              Snapshot: {data.snapshotId.slice(0, 12)}...
            </span>
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Generated: {format(new Date(data.generatedAt), "PPp")}
            </span>
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              Correlation: {data.correlationId.slice(0, 12)}...
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => handleExport("json")} disabled={!mergedConfig.enableExport}>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Export JSON
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Export as JSON</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => handleExport("csv")} disabled={!mergedConfig.enableExport}>
                  <Table className="h-3.5 w-3.5 mr-1.5" />
                  Export CSV
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Export as CSV</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} disabled={!mergedConfig.enableExport}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Export PDF
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Export as PDF</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {mergedConfig.enableRefresh && onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search across all sections..."
            value={state.searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={state.viewMode} onValueChange={(v) => setState((p) => ({ ...p, viewMode: v as DrillDownState["viewMode"] }))}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="View" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cards">Cards</SelectItem>
              <SelectItem value="table">Table</SelectItem>
              <SelectItem value="chart">Chart</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={state.activeTab} onValueChange={(v) => setState((p) => ({ ...p, activeTab: v }))} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <IntelligenceKPISection
            kpis={data.kpis}
            expanded={state.expandedSections.has("kpis")}
            onToggle={() => toggleSection("kpis")}
            renderers={mergedConfig.kpiRenderers}
            theme={theme}
          />
          <IntelligenceGroupingSection
            groupings={filteredGroupings}
            title="Key Segments"
            expanded={state.expandedSections.has("groupings")}
            onToggle={() => toggleSection("groupings")}
            renderers={mergedConfig.groupingRenderers}
            theme={theme}
          />
          <IntelligenceTimeSeriesSection
            timeSeries={data.timeSeries}
            expanded={state.expandedSections.has("timeSeries")}
            onToggle={() => toggleSection("timeSeries")}
            theme={theme}
          />
          <IntelligenceRecommendationSection
            recommendations={filteredRecommendations.slice(0, 3)}
            title="Top Recommendations"
            actions={mergedConfig.recommendationActions}
            onAction={handleRecommendationAction}
            expanded={state.expandedSections.has("recommendations")}
            onToggle={() => toggleSection("recommendations")}
            theme={theme}
          />
        </TabsContent>

        {/* KPIs Tab */}
        <TabsContent value="kpis" className="space-y-4">
          <IntelligenceKPISection
            kpis={data.kpis}
            expanded={true}
            onToggle={() => {}}
            renderers={mergedConfig.kpiRenderers}
            theme={theme}
            showAll={true}
          />
        </TabsContent>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6">
          <IntelligenceGroupingSection
            groupings={filteredGroupings}
            title="All Segments"
            expanded={true}
            onToggle={() => {}}
            renderers={mergedConfig.groupingRenderers}
            theme={theme}
            showAll={true}
          />
          <IntelligenceTimeSeriesSection
            timeSeries={data.timeSeries}
            expanded={true}
            onToggle={() => {}}
            theme={theme}
            showAll={true}
          />
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <IntelligenceRecommendationSection
            recommendations={filteredRecommendations}
            title="All Recommendations"
            actions={mergedConfig.recommendationActions}
            onAction={handleRecommendationAction}
            expanded={true}
            onToggle={() => {}}
            theme={theme}
            showAll={true}
          />
          {data.risks.length > 0 && (
            <IntelligenceRiskSection
              risks={filteredRisks}
              expanded={true}
              onToggle={() => {}}
              theme={theme}
            />
          )}
        </TabsContent>

        {/* Evidence Tab */}
        <TabsContent value="evidence" className="space-y-4">
          <IntelligenceEvidenceSection
            evidence={data.evidence}
            expanded={true}
            onToggle={() => {}}
            theme={theme}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** KPI Section Component */
function IntelligenceKPISection({
  kpis,
  expanded,
  onToggle,
  renderers,
  theme,
  showAll = false,
}: {
  kpis: KPI[];
  expanded: boolean;
  onToggle: () => void;
  renderers?: Record<string, (kpi: KPI) => React.ReactNode>;
  theme: string;
  showAll?: boolean;
}) {
  if (kpis.length === 0) return null;

  const displayKPIs = showAll ? kpis : kpis.slice(0, 4);

  return (
    <SectionCard title="Key Performance Indicators" expanded={expanded} onToggle={onToggle} showToggle={!showAll}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayKPIs.map((kpi) => (
          <KPICard key={kpi.id} kpi={kpi} renderer={renderers?.[kpi.id]} theme={theme} />
        ))}
      </div>
      {!showAll && kpis.length > 4 && (
        <Button variant="ghost" size="sm" className="mt-4" onClick={onToggle}>
          Show all {kpis.length} KPIs
        </Button>
      )}
    </SectionCard>
  );
}

/** Grouping Section Component */
function IntelligenceGroupingSection({
  groupings,
  title,
  expanded,
  onToggle,
  renderers,
  theme,
  showAll = false,
}: {
  groupings: Grouping[];
  title: string;
  expanded: boolean;
  onToggle: () => void;
  renderers?: Record<string, (grouping: Grouping) => React.ReactNode>;
  theme: string;
  showAll?: boolean;
}) {
  if (groupings.length === 0) return null;

  const displayGroupings = showAll ? groupings : groupings.slice(0, 6);

  return (
    <SectionCard title={title} expanded={expanded} onToggle={onToggle} showToggle={!showAll}>
      <div className="space-y-3">
        {displayGroupings.map((grouping) => (
          <GroupingCard key={grouping.id} grouping={grouping} renderer={renderers?.[grouping.id]} theme={theme} />
        ))}
      </div>
      {!showAll && groupings.length > 6 && (
        <Button variant="ghost" size="sm" className="mt-4" onClick={onToggle}>
          Show all {groupings.length} segments
        </Button>
      )}
    </SectionCard>
  );
}

/** Time Series Section Component */
function IntelligenceTimeSeriesSection({
  timeSeries,
  expanded,
  onToggle,
  theme,
  showAll = false,
}: {
  timeSeries: TimeSeriesPoint[];
  expanded: boolean;
  onToggle: () => void;
  theme: string;
  showAll?: boolean;
}) {
  if (timeSeries.length === 0) return null;

  return (
    <SectionCard title="Trends" expanded={expanded} onToggle={onToggle} showToggle={!showAll}>
      <div className="h-64 rounded-lg bg-muted/30 flex items-center justify-center">
        <BarChart2 className="h-12 w-12 text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Chart placeholder — integrate recharts</span>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-2 font-medium">Period</th>
              <th className="text-right p-2 font-medium">Actual</th>
              <th className="text-right p-2 font-medium">Forecast</th>
              <th className="text-right p-2 font-medium">Variance</th>
            </tr>
          </thead>
          <tbody>
            {timeSeries.slice(-12).map((point, index) => (
              <tr key={index} className="border-b border-border/50">
                <td className="p-2">{format(new Date(point.timestamp), "MMM yyyy")}</td>
                <td className="p-2 text-right font-mono">{point.value.toLocaleString()}</td>
                <td className="p-2 text-right font-mono text-muted-foreground">
                  {point.forecast?.toLocaleString() ?? "—"}
                </td>
                <td className="p-2 text-right font-mono">
                  {point.forecast !== undefined
                    ? `${point.forecast > point.value ? "+" : ""}${(((point.forecast - point.value) / point.value) * 100).toFixed(1)}%`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

/** Recommendation Section Component */
function IntelligenceRecommendationSection({
  recommendations,
  title,
  actions,
  onAction,
  expanded,
  onToggle,
  theme,
  showAll = false,
}: {
  recommendations: Recommendation[];
  title: string;
  actions?: RecommendationAction[];
  onAction: (actionId: string, recommendation: Recommendation) => void;
  expanded: boolean;
  onToggle: () => void;
  theme: string;
  showAll?: boolean;
}) {
  if (recommendations.length === 0) {
    return (
      <SectionCard title={title} expanded={expanded} onToggle={onToggle} showToggle={!showAll}>
        <div className="text-center py-8">
          <CheckCircle className="mx-auto h-12 w-12 text-primary/50" />
          <p className="mt-3 text-muted-foreground">No recommendations at this time</p>
        </div>
      </SectionCard>
    );
  }

  const displayRecommendations = showAll ? recommendations : recommendations.slice(0, 3);

  return (
    <SectionCard title={title} expanded={expanded} onToggle={onToggle} showToggle={!showAll}>
      <div className="space-y-3">
        {displayRecommendations.map((rec) => (
          <RecommendationCard
            key={rec.id}
            recommendation={rec}
            actions={actions}
            onAction={onAction}
            theme={theme}
          />
        ))}
      </div>
      {!showAll && recommendations.length > 3 && (
        <Button variant="ghost" size="sm" className="mt-4" onClick={onToggle}>
          Show all {recommendations.length} recommendations
        </Button>
      )}
    </SectionCard>
  );
}

/** Risk Section Component */
function IntelligenceRiskSection({
  risks,
  expanded,
  onToggle,
  theme,
}: {
  risks: Risk[];
  expanded: boolean;
  onToggle: () => void;
  theme: string;
}) {
  return (
    <SectionCard title="Risk Assessments" expanded={expanded} onToggle={onToggle}>
      <div className="space-y-3">
        {risks.map((risk) => (
          <RiskCard key={risk.id} risk={risk} theme={theme} />
        ))}
      </div>
    </SectionCard>
  );
}

/** Evidence Section Component */
function IntelligenceEvidenceSection({
  evidence,
  expanded,
  onToggle,
  theme,
}: {
  evidence: Evidence[];
  expanded: boolean;
  onToggle: () => void;
  theme: string;
}) {
  return (
    <SectionCard title="Evidence Trail" expanded={expanded} onToggle={onToggle}>
      {evidence.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No evidence recorded</div>
      ) : (
        <div className="space-y-2">
          {evidence.map((item, index) => (
            <EvidenceCard key={index} evidence={item} theme={theme} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

/** Section Card Wrapper */
function SectionCard({
  title,
  children,
  expanded,
  onToggle,
  showToggle = true,
}: {
  title: string;
  children: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  showToggle?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          {showToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-8 w-8"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      {expanded && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

/** KPI Card Component */
function KPICard({
  kpi,
  renderer,
  theme,
}: {
  kpi: KPI;
  renderer?: (kpi: KPI) => React.ReactNode;
  theme: string;
}) {
  if (renderer) return <>{renderer(kpi)}</>;

  const trendColor = kpi.trend === "up" ? "text-emerald-500" : kpi.trend === "down" ? "text-destructive" : "text-muted-foreground";
  const statusColor =
    kpi.status === "good"
      ? "text-emerald-500"
      : kpi.status === "warning"
      ? "text-amber-500"
      : kpi.status === "critical"
      ? "text-destructive"
      : "text-muted-foreground";

  const formatValue = (val: string | number) => {
    if (kpi.format === "currency") return `₹${Number(val).toLocaleString("en-IN")}`;
    if (kpi.format === "percentage") return `${Number(val).toFixed(1)}%`;
    if (kpi.format === "duration") return `${Number(val)}d`;
    return String(val);
  };

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{formatValue(kpi.value)}</p>
            {kpi.unit && <p className="text-xs text-muted-foreground">{kpi.unit}</p>}
          </div>
          {kpi.status && (
            <Badge variant="outline" className={statusColor}>
              {kpi.status}
            </Badge>
          )}
        </div>
        {kpi.previousValue !== undefined && (
          <div className="mt-3 flex items-center gap-2 text-sm">
            <span className={trendColor}>
              {kpi.trend === "up" ? "↑" : kpi.trend === "down" ? "↓" : "→"}
              {kpi.trendValue !== undefined ? `${Math.abs(kpi.trendValue).toFixed(1)}%` : ""}
            </span>
            <span className="text-muted-foreground">vs previous</span>
          </div>
        )}
        {kpi.description && <p className="mt-2 text-xs text-muted-foreground">{kpi.description}</p>}
      </CardContent>
    </Card>
  );
}

/** Grouping Card Component */
function GroupingCard({
  grouping,
  renderer,
  theme,
}: {
  grouping: Grouping;
  renderer?: (grouping: Grouping) => React.ReactNode;
  theme: string;
}) {
  if (renderer) return <>{renderer(grouping)}</>;

  const pct = grouping.percentage ?? 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{grouping.name}</span>
              <Badge variant="secondary" className="text-xs">
                {grouping.category}
              </Badge>
            </div>
            {grouping.subGroupings && grouping.subGroupings.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {grouping.subGroupings.length} sub-segments
              </p>
            )}
          </div>
          <div className="text-right ml-4">
            <p className="font-display text-lg font-semibold">{grouping.value.toLocaleString()}</p>
            <div className="mt-1 h-1.5 w-32 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{pct.toFixed(1)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Recommendation Card Component */
function RecommendationCard({
  recommendation,
  actions,
  onAction,
  theme,
}: {
  recommendation: Recommendation;
  actions?: RecommendationAction[];
  onAction: (actionId: string, recommendation: Recommendation) => void;
  theme: string;
}) {
  const priorityColors = {
    CRITICAL: "border-destructive/50 bg-destructive/5",
    HIGH: "border-amber-500/50 bg-amber-500/5",
    MEDIUM: "border-primary/50 bg-primary/5",
    LOW: "border-muted/50 bg-muted/5",
  };

  const priorityTextColors = {
    CRITICAL: "text-destructive",
    HIGH: "text-amber-500",
    MEDIUM: "text-primary",
    LOW: "text-muted-foreground",
  };

  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <Card className={priorityColors[recommendation.priority]}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={priorityTextColors[recommendation.priority]}>
                {recommendation.priority}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Confidence: {Math.round(recommendation.confidence * 100)}%
              </span>
              <span className="text-xs text-muted-foreground">
                {recommendation.affectedSegment}
              </span>
              {recommendation.deliveryStatus && (
                <Badge variant="secondary" className="text-xs">
                  {recommendation.deliveryStatus}
                </Badge>
              )}
            </div>
            <h4 className="mt-2 font-display text-lg leading-snug">{recommendation.title}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{recommendation.businessReason}</p>
            <div className="mt-3 rounded-lg bg-background/50 p-3 text-sm">
              <span className="font-semibold">Action: </span>
              {recommendation.recommendedAction}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold">Expected Impact: </span>
              {recommendation.expectedImpact}
            </div>
            {detailsOpen && (
              <div className="mt-3 space-y-2 rounded-lg bg-background/50 p-3 text-sm">
                <div>
                  <span className="font-semibold">Description: </span>
                  {recommendation.description}
                </div>
                <div>
                  <span className="font-semibold">Decision reference: </span>
                  {recommendation.decisionReference}
                </div>
                <div>
                  <span className="font-semibold">Correlation ID: </span>
                  <span className="font-mono text-xs">{recommendation.correlationId}</span>
                </div>
                <div>
                  <span className="font-semibold">Generated: </span>
                  {format(new Date(recommendation.generatedAt), "PPp")}
                </div>
                {recommendation.deliveryChannel && (
                  <div>
                    <span className="font-semibold">Delivery channel: </span>
                    {recommendation.deliveryChannel}
                  </div>
                )}
                {recommendation.supportingMetrics &&
                  Object.keys(recommendation.supportingMetrics).length > 0 && (
                    <div>
                      <span className="font-semibold">Supporting metrics:</span>
                      <ul className="mt-1 space-y-0.5">
                        {Object.entries(recommendation.supportingMetrics).map(([key, value]) => (
                          <li key={key} className="text-xs text-muted-foreground">
                            {key}:{" "}
                            {typeof value === "object" && value !== null
                              ? JSON.stringify(value)
                              : String(value)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {actions?.map((action) => (
              <Button
                key={action.id}
                variant={action.variant ?? "default"}
                size="sm"
                onClick={() => {
                  if (action.requiresConfirmation && action.confirmationMessage) {
                    if (!window.confirm(action.confirmationMessage)) return;
                  }
                  onAction(action.id, recommendation);
                }}
              >
                {action.icon}
                {action.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              aria-label={detailsOpen ? "Hide recommendation details" : "View recommendation details"}
              aria-expanded={detailsOpen}
              onClick={() => setDetailsOpen((open) => !open)}
            >
              {detailsOpen ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Risk Card Component */
function RiskCard({
  risk,
  theme,
}: {
  risk: Risk;
  theme: string;
}) {
  const severityColors = {
    CRITICAL: "border-destructive/50 bg-destructive/5 text-destructive",
    HIGH: "border-amber-500/50 bg-amber-500/5 text-amber-500",
    MEDIUM: "border-primary/50 bg-primary/5 text-primary",
    LOW: "border-muted/50 bg-muted/5 text-muted-foreground",
  };

  return (
    <Card className={severityColors[risk.severity]}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{risk.severity}</Badge>
              <span className="text-xs text-muted-foreground">
                Confidence: {Math.round(risk.confidence * 100)}%
              </span>
              {risk.humanReviewRequired && (
                <Badge variant="secondary" className="text-xs">
                  Human Review Required
                </Badge>
              )}
            </div>
            <h4 className="mt-2 font-display text-lg leading-snug">{risk.title}</h4>
            <p className="mt-1 text-sm text-muted-foreground">{risk.explanation}</p>
            <div className="mt-3 rounded-lg bg-background/50 p-3 text-sm">
              <span className="font-semibold">Recommended: </span>
              {risk.recommendedAction}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-semibold">Impact: </span>
              {risk.expectedBusinessImpact}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Button variant="ghost" size="icon">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {risk.evidence.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-2">Evidence:</p>
            <div className="space-y-1">
              {risk.evidence.slice(0, 3).map((ev, idx) => (
                <div key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="font-mono">{ev.factor}:</span>
                  <span>{String(ev.value)}</span>
                  <span className="text-primary">({ev.impact > 0 ? "+" : ""}{ev.impact.toFixed(2)})</span>
                </div>
              ))}
              {risk.evidence.length > 3 && (
                <span className="text-xs text-muted-foreground">+{risk.evidence.length - 3} more</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Evidence Card Component */
function EvidenceCard({
  evidence,
  theme,
}: {
  evidence: Evidence;
  theme: string;
}) {
  const impactColor = evidence.impact > 0 ? "text-emerald-500" : evidence.impact < 0 ? "text-destructive" : "text-muted-foreground";

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{evidence.factor}</span>
              <Badge variant="outline" className="text-xs">
                {evidence.source}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">Value: {String(evidence.value)}</span>
              <span className={impactColor}>Impact: {evidence.impact > 0 ? "+" : ""}{evidence.impact.toFixed(2)}</span>
              <span>Confidence: {Math.round(evidence.confidence * 100)}%</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground shrink-0">
            {format(new Date(evidence.timestamp), "PPp")}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/** Empty State Component */
function IntelligenceEmptyState({
  title,
  description,
  onRefresh,
}: {
  title: string;
  description: string;
  onRefresh?: () => Promise<void>;
}) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 font-display text-xl">{title}</h3>
        <p className="mt-2 text-muted-foreground max-w-md mx-auto">{description}</p>
        {onRefresh && (
          <Button className="mt-4" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Intelligence
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** Hook for using intelligence drill-down state */
export function useIntelligenceDrillDown(initialState?: Partial<DrillDownState>) {
  const [state, setState] = useState<DrillDownState>({
    expandedSections: new Set(),
    searchQuery: "",
    activeTab: "overview",
    sortConfig: null,
    filters: {},
    viewMode: "cards",
    ...initialState,
  });

  const actions = useMemo(
    () => ({
      toggleSection: (section: string) =>
        setState((prev) => {
          const newExpanded = new Set(prev.expandedSections);
          newExpanded.has(section) ? newExpanded.delete(section) : newExpanded.add(section);
          return { ...prev, expandedSections: newExpanded };
        }),
      setSearchQuery: (query: string) => setState((prev) => ({ ...prev, searchQuery: query })),
      setActiveTab: (tab: string) => setState((prev) => ({ ...prev, activeTab: tab })),
      setSortConfig: (config: DrillDownState["sortConfig"]) => setState((prev) => ({ ...prev, sortConfig: config })),
      setFilter: (key: string, value: unknown) =>
        setState((prev) => ({ ...prev, filters: { ...prev.filters, [key]: value } })),
      setViewMode: (mode: DrillDownState["viewMode"]) => setState((prev) => ({ ...prev, viewMode: mode })),
      reset: () =>
        setState({
          expandedSections: new Set(),
          searchQuery: "",
          activeTab: "overview",
          sortConfig: null,
          filters: {},
          viewMode: "cards",
        }),
    }),
    []
  );

  return { state, actions };
}