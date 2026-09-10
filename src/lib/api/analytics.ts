import { api } from './client';

import type {
  DashboardSummary,
  RecruitmentFunnel,
  SourceDistribution,
} from '@/lib/domain/types';

export const analyticsApi = {
  getDashboard(): Promise<DashboardSummary> {
    return api.get<DashboardSummary>('/api/analytics/dashboard');
  },

  getFunnel(): Promise<RecruitmentFunnel> {
    return api.get<RecruitmentFunnel>('/api/analytics/funnel');
  },

  getSources(): Promise<SourceDistribution[]> {
    return api.get<SourceDistribution[]>('/api/analytics/sources');
  },
};
