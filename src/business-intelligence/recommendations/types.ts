/**
 * Recommendations Intelligence Domain
 * Analytics and insights about recommendations, suggestions, and opportunities
 */

export interface Recommendation {
  id: string;
  category: string;
  priority: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  impact: Record<string, unknown>;
  createdAt: Date;
}

export interface RecommendationAction {
  recommendationId: string;
  status: "pending" | "accepted" | "rejected" | "implemented";
  actionedBy: string;
  actionedAt: Date;
  feedback?: string;
}

export interface RecommendationIntelligence {
  recommendations: Recommendation[];
  actions: RecommendationAction[];
  summary?: Record<string, unknown>;
}
