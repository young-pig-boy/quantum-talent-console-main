import { JobRepository } from '@/server/repositories/job.repository';
import { PublicationRepository } from '@/server/repositories/publication.repository';
import { LeadRepository } from '@/server/repositories/lead.repository';
import { ApplicationRepository } from '@/server/repositories/application.repository';
import { AnalyticsRepository } from '@/server/repositories/analytics.repository';
import type { DashboardSummary, FunnelStage, SourceDistribution, JobRecruitmentMetrics, PublicationMetrics } from '@/lib/domain/types';


export const AnalyticsService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const [jobCounts, leadCounts, appCounts, actionCounts, publishedCount] = await Promise.all([
      JobRepository.countByStatus(),
      LeadRepository.countByStatus(),
      ApplicationRepository.countByStage(),
      ApplicationRepository.countByNextAction(),
      PublicationRepository.countByStatus('published'),
    ]);

    return {
      recruitingJobs: jobCounts['recruiting'] ?? 0,
      publishedJobs: publishedCount,
      newLeads: leadCounts['new'] ?? 0,
      pendingContacts: (leadCounts['reviewed'] ?? 0) + (leadCounts['contacting'] ?? 0),
      recommended: appCounts['recommended'] ?? 0,
      interviews: appCounts['interview'] ?? 0,
      offers: appCounts['offer'] ?? 0,
      hired: appCounts['hired'] ?? 0,
      recentApplications: Object.values(appCounts).reduce((a, b) => a + b, 0),
      recentLeads: Object.values(leadCounts).reduce((a, b) => a + b, 0),
      overdueActions: actionCounts.overdue,
      upcomingActions: actionCounts.upcoming,
    };
  },

  async getRecruitmentFunnel(): Promise<FunnelStage[]> {
    const [leadCounts, appCounts] = await Promise.all([
      LeadRepository.countByStatus(),
      ApplicationRepository.countByStage(),
    ]);

    const stages = [
      { key: 'lead_total', label: 'Leads', count: Object.values(leadCounts).reduce((a, b) => a + b, 0) },
      { key: 'lead_qualified', label: 'Qualified', count: leadCounts['qualified'] ?? 0 },
      { key: 'talent', label: 'Talents (Converted)', count: leadCounts['converted'] ?? 0 },
      { key: 'recommended', label: 'Recommended', count: appCounts['recommended'] ?? 0 },
      { key: 'interview', label: 'Interview', count: appCounts['interview'] ?? 0 },
      { key: 'offer', label: 'Offer', count: appCounts['offer'] ?? 0 },
      { key: 'hired', label: 'Hired', count: appCounts['hired'] ?? 0 },
    ];

    const result: FunnelStage[] = [];
    for (let i = 0; i < stages.length; i++) {
      const prev = i > 0 ? result[i - 1].count : stages[i].count;
      result.push({
        stage: stages[i].label,
        count: stages[i].count,
        conversionRate: prev > 0 ? Math.round((stages[i].count / prev) * 10000) / 100 : null,
      });
    }
    return result;
  },

  async getSourceDistribution(): Promise<SourceDistribution[]> {
    const dist = await AnalyticsRepository.getSourceDistribution();
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    return Object.entries(dist).map(([channel, count]) => ({
      channel,
      count,
      percentage: total > 0 ? Math.round((count / total) * 10000) / 100 : 0,
    }));
  },

  async getJobRecruitmentMetrics(jobId: string): Promise<JobRecruitmentMetrics> {
    const counts = await ApplicationRepository.countByJobStage(jobId);
    return {
      jobId,
      applications: Object.values(counts).reduce((a, b) => a + b, 0),
      recommended: counts['recommended'] ?? 0,
      clientReview: counts['client_review'] ?? 0,
      interview: counts['interview'] ?? 0,
      offer: counts['offer'] ?? 0,
      hired: counts['hired'] ?? 0,
      rejected: counts['rejected'] ?? 0,
      withdrawn: counts['withdrawn'] ?? 0,
    };
  },

  async getPublicationMetrics(publicationId: string): Promise<PublicationMetrics> {
    const counts = await AnalyticsRepository.countByType(publicationId);
    const impressions = counts['job_impression'] ?? 0;
    const views = counts['job_view'] ?? 0;
    const shares = counts['share'] ?? 0;
    const contactClicks = counts['contact_click'] ?? 0;
    const applyStarts = counts['apply_start'] ?? 0;
    const applySubmits = counts['apply_submit'] ?? 0;

    return {
      publicationId,
      impressions,
      views,
      shares,
      contactClicks,
      applyStarts,
      applySubmits,
      viewRate: impressions > 0 ? Math.round((views / impressions) * 10000) / 100 : 0,
      applyRate: views > 0 ? Math.round((applySubmits / views) * 10000) / 100 : 0,
    };
  },
};
