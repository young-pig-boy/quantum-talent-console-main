import { PublicationRepository } from '@/server/repositories/publication.repository';
import { LeadRepository } from '@/server/repositories/lead.repository';
import { AnalyticsRepository } from '@/server/repositories/analytics.repository';
import type {
  Lead,
  LeadInput,
  AnalyticsEventInput,
  PaginatedResult,
  PublicJobSummary,
  PublicJobDetail,
} from '@/lib/domain/types';
import { BusinessError, NotFoundError } from '@/lib/domain/errors';

export const PublicApiService = {
  /**
   * List published jobs for public website (Phase 5).
   * Only returns jobs with status = 'published'.
   * Never exposes internal fields.
   */
  async listPublicJobs(filters: {
    track?: string;
    city?: string;
    keyword?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<PublicJobSummary>> {
    const result = await PublicationRepository.listPublished({
      track: filters.track,
      city: filters.city,
      keyword: filters.keyword,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
    });

    const data: PublicJobSummary[] = result.data.map((pub) => ({
      id: pub.id,
      slug: pub.slug,
      title: pub.title,
      title_en: pub.title_en,
      company_display_name: pub.company_display_name,
      city: pub.city,
      salary_display: pub.salary_display,
      salary_display_en: pub.salary_display_en,
      summary: pub.summary,
      summary_en: pub.summary_en,
      track: pub.track,
      direction: pub.direction,
      direction_en: pub.direction_en,
      seniority: pub.seniority,
      seniority_en: pub.seniority_en,
      tags: pub.tags,
      tags_en: pub.tags_en,
      urgent: pub.urgent,
      urgent_started_at: pub.urgent_started_at,
      urgent_expires_at: pub.urgent_expires_at,
      featured: pub.featured,
      published_at: pub.published_at,
    }));

    return { ...result, data };
  },

  /**
   * Get single published job by slug (Phase 5).
   */
  async getPublicJobBySlug(slug: string): Promise<PublicJobDetail> {
    const pub = await PublicationRepository.findBySlug(slug);
    if (!pub) throw new NotFoundError('JobPublication', slug);
    if (pub.status !== 'published') {
      throw new BusinessError('PUBLICATION_NOT_PUBLISHED', `Job with slug '${slug}' is not currently published`);
    }

    return {
      id: pub.id,
      slug: pub.slug,
      title: pub.title,
      title_en: pub.title_en,
      company_display_name: pub.company_display_name,
      city: pub.city,
      salary_display: pub.salary_display,
      salary_display_en: pub.salary_display_en,
      summary: pub.summary,
      summary_en: pub.summary_en,
      responsibilities: pub.responsibilities,
      responsibilities_en: pub.responsibilities_en,
      requirements: pub.requirements,
      requirements_en: pub.requirements_en,
      education_requirement: pub.education_requirement,
      education_en: pub.education_en,
      experience_requirement: pub.experience_requirement,
      experience_en: pub.experience_en,
      track: pub.track,
      direction: pub.direction,
      direction_en: pub.direction_en,
      seniority: pub.seniority,
      seniority_en: pub.seniority_en,
      tags: pub.tags,
      tags_en: pub.tags_en,
      urgent: pub.urgent,
      urgent_started_at: pub.urgent_started_at,
      urgent_expires_at: pub.urgent_expires_at,
      featured: pub.featured,
      published_at: pub.published_at,
    };
  },

  /**
   * Submit an application for a published job (Phase 6).
   * Creates a Lead and records an apply_submit event.
   */
  async applyForJob(input: {
    full_name: string;
    phone?: string;
    email?: string;
    wechat?: string;
    publication_id: string;
    resume_url?: string;
    source_channel?: string;
    source_detail?: string;
  }): Promise<Lead> {
    const pub = await PublicationRepository.findById(input.publication_id);
    if (pub.status !== 'published') {
      throw new BusinessError('PUBLICATION_NOT_PUBLISHED', 'Cannot apply: this job is not currently accepting applications');
    }

    const leadInput: LeadInput = {
      full_name: input.full_name,
      phone: input.phone,
      email: input.email,
      wechat: input.wechat,
      site_id: pub.site_id,
      publication_id: input.publication_id,
      source_channel: input.source_channel ?? 'direct',
      source_detail: input.source_detail,
      resume_url: input.resume_url,
      status: 'new',
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lead = await LeadRepository.create(leadInput as any);

    // Record apply_submit analytics event (best-effort, non-critical)
    const event: AnalyticsEventInput = {
      site_id: pub.site_id,
      publication_id: input.publication_id,
      lead_id: lead.id,
      event_type: 'apply_submit',
      source_channel: lead.source_channel ?? undefined,
    };
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await AnalyticsRepository.create(event as any);
    } catch {
      // Analytics recording failure should not block application submission
    }

    return lead;
  },

  /**
   * Record public analytics event (Phase 5).
   */
  async recordEvent(input: {
    event_type: string;
    publication_id: string;
    lead_id?: string;
    source_channel?: string;
    session_id?: string;
    referrer?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const event: AnalyticsEventInput = {
      publication_id: input.publication_id,
      lead_id: input.lead_id,
      event_type: input.event_type,
      source_channel: input.source_channel,
      session_id: input.session_id,
      referrer: input.referrer,
      metadata: input.metadata,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await AnalyticsRepository.create(event as any);
  },
};
