import { PublicationRepository } from '@/server/repositories/publication.repository';
import { JobRepository } from '@/server/repositories/job.repository';
import { JobService } from '@/server/services/job.service';
import { transitionPublication } from '@/lib/domain/publication-state-machine';
import { normalizePublicLocation } from '@/lib/domain/public-location';
import { isQuantumTrack } from '@/lib/domain/quantum-tracks';
import type { JobPublication, PublicationFilters, PaginatedResult, CreatePublicationInput, UpdatePublicationInput, Job, BatchOperationResult, BatchOperationItemResult } from '@/lib/domain/types';
import { ValidationError, BusinessError } from '@/lib/domain/errors';
import { createPublicationSchema, updatePublicationSchema } from '@/server/validation/schemas';

export const PublicationService = {
  async getPublication(id: string): Promise<JobPublication> {
    return PublicationRepository.findById(id);
  },

  async getPublicationBySlug(slug: string): Promise<JobPublication | null> {
    return PublicationRepository.findBySlug(slug);
  },

  async listPublications(filters: PublicationFilters): Promise<PaginatedResult<JobPublication>> {
    return PublicationRepository.list(filters);
  },

  async createPublicationFromJob(jobId: string, siteId: string, overrides?: Partial<CreatePublicationInput>): Promise<JobPublication> {
    const job = await JobRepository.findById(jobId);
    const slug = overrides?.slug ?? `${job.title.toLowerCase().replace(/\s+/g, '-')}-${jobId.slice(0, 8)}`;

    const existing = await PublicationRepository.findBySlug(slug);
    if (existing) throw new ValidationError(`Slug '${slug}' already exists`);

    // company_display_name is no longer auto-populated from Company.
    // Internal company identity is resolved via Job → Company at read time only.
    // Live DB public_company_name stays NULL / not written for new publications.

    const input: Omit<JobPublication, 'id' | 'created_at' | 'updated_at' | 'public_job_code'> = {
      job_id: job.id,
      site_id: siteId,
      title: overrides?.title ?? job.title,
      company_display_name: overrides?.company_display_name ?? '',
      city: normalizePublicLocation(overrides?.city ?? job.city),
      salary_display: overrides?.salary_display ?? null,
      summary: overrides?.summary ?? null,
      responsibilities: overrides?.responsibilities ?? job.jd ?? null,
      requirements: overrides?.requirements ?? job.hard_requirements ?? null,
      education_requirement: overrides?.education_requirement ?? null,
      experience_requirement: overrides?.experience_requirement ?? null,
      track: overrides?.track ?? null,
      direction: overrides?.direction ?? null,
      seniority: overrides?.seniority ?? null,
      tags: overrides?.tags ?? [],
      urgent: overrides?.urgent ?? false,
      urgent_started_at: overrides?.urgent_started_at ?? null,
      urgent_expires_at: overrides?.urgent_expires_at ?? null,
      featured: overrides?.featured ?? false,
      slug,
      status: 'draft',
      published_at: null,
      offline_at: null,
    };

    return PublicationRepository.create(input);
  },

  async updatePublication(id: string, input: UpdatePublicationInput): Promise<JobPublication> {
    // Strip company_display_name — internal-only, never written via public edit flow.
    const { company_display_name: _, ...cleanInput } = input;
    const parsed = updatePublicationSchema.safeParse(cleanInput);
    if (!parsed.success) throw new ValidationError('Invalid publication data', parsed.error.flatten());

    const current = await PublicationRepository.findById(id);
    const updateData: Partial<JobPublication> = { ...parsed.data };

    // Normalize public city: 北上广深 keep city, others → province
    if (updateData.city !== undefined) {
      updateData.city = normalizePublicLocation(updateData.city);
    }

    // Urgent lifecycle rules (server-side, authoritative — not UI-only).
    if (parsed.data.urgent === true) {
      if (current.status !== 'published') {
        throw new ValidationError('请先发布岗位，再设置为急招');
      }
      const startedAt =
        updateData.urgent_started_at ?? current.urgent_started_at ?? new Date().toISOString();
      if (!updateData.urgent_started_at) {
        updateData.urgent_started_at = startedAt;
      }
      const expiresAt = updateData.urgent_expires_at ?? current.urgent_expires_at;
      if (expiresAt && new Date(expiresAt).getTime() <= new Date(startedAt).getTime()) {
        throw new ValidationError('急招截止时间必须晚于开始时间');
      }
    }

    return PublicationRepository.update(id, updateData);
  },

  async publishPublication(id: string): Promise<JobPublication> {
    const pub = await PublicationRepository.findById(id);
    const job = await JobRepository.findById(pub.job_id);

    if (job.status !== 'recruiting') {
      throw new BusinessError('VALIDATION_ERROR', 'Cannot publish: underlying job is not recruiting');
    }

    // Auto-populate missing fields from job data
    const updates: Partial<JobPublication> = {};
    if (!pub.responsibilities && job.jd) {
      updates.responsibilities = job.jd;
    }
    if (!pub.requirements && job.hard_requirements) {
      updates.requirements = job.hard_requirements;
    }
    if (Object.keys(updates).length > 0) {
      Object.assign(pub, await PublicationRepository.update(id, updates));
    }

    const validationErrors: string[] = [];
    if (!pub.title) validationErrors.push('Title is required');
    if (!pub.slug) validationErrors.push('Slug is required');
    if (!pub.responsibilities && !pub.requirements) validationErrors.push('At least one of responsibilities or requirements is required');
    if (!pub.site_id) validationErrors.push('Site ID is required');
    if (pub.track && !isQuantumTrack(pub.track)) validationErrors.push('岗位赛道值无效，请重新选择赛道');
    if (validationErrors.length > 0) {
      throw new ValidationError('Publication validation failed', { fields: validationErrors });
    }

    const newStatus = transitionPublication(pub.status, 'published');
    return PublicationRepository.updateStatus(id, newStatus, {
      published_at: new Date().toISOString(),
    });
  },

  async offlinePublication(id: string): Promise<JobPublication> {
    const pub = await PublicationRepository.findById(id);
    const newStatus = transitionPublication(pub.status, 'offline');
    // 下架即失效急招（保留 started_at / expires_at 历史）。
    return PublicationRepository.update(id, {
      status: newStatus,
      offline_at: new Date().toISOString(),
      urgent: false,
    });
  },

  async republishPublication(id: string): Promise<JobPublication> {
    const pub = await PublicationRepository.findById(id);
    const job = await JobRepository.findById(pub.job_id);
    if (job.status !== 'recruiting') {
      throw new BusinessError('VALIDATION_ERROR', 'Cannot republish: underlying job is not recruiting');
    }
    const newStatus = transitionPublication(pub.status, 'published');
    return PublicationRepository.updateStatus(id, newStatus, {
      published_at: new Date().toISOString(),
    });
  },

  async archivePublication(id: string): Promise<JobPublication> {
    const pub = await PublicationRepository.findById(id);
    const newStatus = transitionPublication(pub.status, 'archived');
    // 归档即失效急招（保留 started_at / expires_at 历史）。
    return PublicationRepository.update(id, {
      status: newStatus,
      urgent: false,
    });
  },

  /**
   * Batch publish publications (partial success allowed).
   *
   * Business rules (per item):
   * - underlying Job = recruiting → publish normally
   * - underlying Job = draft → startRecruiting(job_id) first, then publish
   * - underlying Job = paused / closed / archived → failed, continue with others
   * - publication draft → published
   * - publication offline → republish
   * - publication already published → skipped
   * - publication archived → skipped (never force-recover)
   */
  async batchPublish(ids: string[]): Promise<BatchOperationResult> {
    const results: BatchOperationItemResult[] = [];
    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        const pub = await PublicationRepository.findById(id);

        if (pub.status === 'published') {
          skipped++;
          results.push({ id, status: 'skipped', message: 'Already published' });
          continue;
        }
        if (pub.status === 'archived') {
          skipped++;
          results.push({ id, status: 'skipped', message: 'Archived publication cannot be published' });
          continue;
        }

        // Ensure the underlying job is recruiting before publishing.
        const job = await JobRepository.findById(pub.job_id);
        if (job.status === 'draft') {
          await JobService.startRecruiting(job.id);
        } else if (job.status !== 'recruiting') {
          failed++;
          results.push({ id, status: 'failed', message: `Cannot publish: underlying job is ${job.status}` });
          continue;
        }

        if (pub.status === 'offline') {
          await PublicationService.republishPublication(id);
        } else {
          await PublicationService.publishPublication(id);
        }
        success++;
        results.push({ id, status: 'success', message: 'Published' });
      } catch (e) {
        failed++;
        results.push({ id, status: 'failed', message: (e as Error).message });
      }
    }

    return { total: ids.length, success, skipped, failed, results };
  },

  /**
   * Batch stop publishing publications (partial success allowed).
   *
   * Rules (per item):
   * - published → offlinePublication()
   * - offline / draft / archived → skipped
   * - never modifies the underlying Job status (stopping public ≠ stopping recruiting)
   */
  async batchOffline(ids: string[]): Promise<BatchOperationResult> {
    const results: BatchOperationItemResult[] = [];
    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        const pub = await PublicationRepository.findById(id);

        if (pub.status === 'published') {
          await PublicationService.offlinePublication(id);
          success++;
          results.push({ id, status: 'success', message: 'Stopped publishing' });
        } else {
          skipped++;
          results.push({ id, status: 'skipped', message: `Publication is ${pub.status}, no action taken` });
        }
      } catch (e) {
        failed++;
        results.push({ id, status: 'failed', message: (e as Error).message });
      }
    }

    return { total: ids.length, success, skipped, failed, results };
  },

  /**
   * Feature a single publication.
   *
   * Rules:
   * - published + featured=false → featured=true
   * - published + featured=true → skipped (no-op)
   * - draft / offline / archived → rejected (only published can be featured)
   */
  async featurePublication(id: string): Promise<JobPublication> {
    const pub = await PublicationRepository.findById(id);

    if (pub.status !== 'published') {
      throw new BusinessError('VALIDATION_ERROR', '仅已发布岗位可设为精选');
    }
    if (pub.featured) {
      // Already featured — no-op, return as-is
      return pub;
    }

    return PublicationRepository.update(id, { featured: true } as Partial<JobPublication>);
  },

  /**
   * Unfeature a single publication.
   *
   * Rules:
   * - featured=true → featured=false
   * - featured=false → skipped (no-op)
   */
  async unfeaturePublication(id: string): Promise<JobPublication> {
    const pub = await PublicationRepository.findById(id);

    if (!pub.featured) {
      // Already not featured — no-op, return as-is
      return pub;
    }

    return PublicationRepository.update(id, { featured: false } as Partial<JobPublication>);
  },

  /**
   * Batch feature publications (partial success allowed).
   *
   * Rules (per item):
   * - published + featured=false → featured=true
   * - published + featured=true → skipped
   * - draft / offline / archived → skipped
   */
  async batchFeature(ids: string[]): Promise<BatchOperationResult> {
    const results: BatchOperationItemResult[] = [];
    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        const pub = await PublicationRepository.findById(id);

        if (pub.status !== 'published') {
          skipped++;
          results.push({ id, status: 'skipped', message: `Publication is ${pub.status}, only published can be featured` });
          continue;
        }
        if (pub.featured) {
          skipped++;
          results.push({ id, status: 'skipped', message: 'Already featured' });
          continue;
        }

        await PublicationRepository.update(id, { featured: true } as Partial<JobPublication>);
        success++;
        results.push({ id, status: 'success', message: 'Featured' });
      } catch (e) {
        failed++;
        results.push({ id, status: 'failed', message: (e as Error).message });
      }
    }

    return { total: ids.length, success, skipped, failed, results };
  },

  /**
   * Batch unfeature publications (partial success allowed).
   *
   * Rules (per item):
   * - featured=true → featured=false
   * - others → skipped
   */
  async batchUnfeature(ids: string[]): Promise<BatchOperationResult> {
    const results: BatchOperationItemResult[] = [];
    let success = 0;
    let skipped = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        const pub = await PublicationRepository.findById(id);

        if (!pub.featured) {
          skipped++;
          results.push({ id, status: 'skipped', message: 'Not featured' });
          continue;
        }

        await PublicationRepository.update(id, { featured: false } as Partial<JobPublication>);
        success++;
        results.push({ id, status: 'success', message: 'Unfeatured' });
      } catch (e) {
        failed++;
        results.push({ id, status: 'failed', message: (e as Error).message });
      }
    }

    return { total: ids.length, success, skipped, failed, results };
  },
};
