/**
 * Recommendations Intelligence Repository
 * Interface for recommendations BI data access
 */

import type { Recommendation, RecommendationAction } from "./types";

export interface IRecommendationsRepository {
  getRecommendations(workspaceId: string): Promise<Recommendation[]>;
  getActions(recommendationId: string): Promise<RecommendationAction[]>;
  saveRecommendation(recommendation: Recommendation): Promise<void>;
  recordAction(action: RecommendationAction): Promise<void>;
}
