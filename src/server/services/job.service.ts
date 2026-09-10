import { JobRepository } from '@/server/repositories/job.repository';
import { PublicationRepository } from '@/server/repositories/publication.repository';
import { transitionJob } from '@/lib/domain/job-state-machine';
import type { Job, JobFilters, PaginatedResult, CreateJobInput, UpdateJobInput } from '@/lib/domain/types';
import { ValidationError } from '@/lib/domain/errors';
import { createJobSchema, updateJobSchema } from '@/server/validation/schemas';

export const JobService = {
  async getJob(id: string): Promise<Job> {
    return JobRepository.findById(id);
  },

  async listJobs(filters: JobFilters): Promise<PaginatedResult<Job>> {
    return JobRepository.list(filters);
  },

  async createJob(input: CreateJobInput): Promise<Job> {
    const parsed = createJobSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError('Invalid job data', parsed.error.flatten());
    return JobRepository.create({
      company_id: parsed.data.company_id,
      owner_id: parsed.data.owner_id ?? '',
      title: parsed.data.title,
      city: parsed.data.city ?? '',
      jd: parsed.data.jd ?? null,
      salary_internal: parsed.data.salary_internal ?? null,
      hard_requirements: parsed.data.hard_requirements ?? null,
      exclusion_rules: parsed.data.exclusion_rules ?? null,
      internal_notes: parsed.data.internal_notes ?? null,
      intake_metadata: parsed.data.intake_metadata ?? {},
      status: parsed.data.status ?? 'draft',
    } as Omit<Job, 'id' | 'created_at' | 'updated_at' | 'job_code'>);
  },

  async updateJob(id: string, input: UpdateJobInput): Promise<Job> {
    const parsed = updateJobSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError('Invalid job data', parsed.error.flatten());
    return JobRepository.update(id, parsed.data as Partial<Job>);
  },

  async startRecruiting(id: string): Promise<Job> {
    const job = await JobRepository.findById(id);
    const newStatus = transitionJob(job.status, 'recruiting');
    return JobRepository.updateStatus(id, newStatus);
  },

  async pauseJob(id: string): Promise<Job> {
    const job = await JobRepository.findById(id);
    const newStatus = transitionJob(job.status, 'paused');
    return JobRepository.updateStatus(id, newStatus);
  },

  async resumeJob(id: string): Promise<Job> {
    const job = await JobRepository.findById(id);
    const newStatus = transitionJob(job.status, 'recruiting');
    return JobRepository.updateStatus(id, newStatus);
  },

  async closeJob(id: string, offlinePublication = true): Promise<Job> {
    const job = await JobRepository.findById(id);
    const newStatus = transitionJob(job.status, 'closed');
    const updated = await JobRepository.updateStatus(id, newStatus);
    if (offlinePublication) {
      await PublicationRepository.forceOfflineByJob(id);
    }
    return updated;
  },

  async archiveJob(id: string): Promise<Job> {
    const job = await JobRepository.findById(id);
    const newStatus = transitionJob(job.status, 'archived');
    const updated = await JobRepository.updateStatus(id, newStatus);
    await PublicationRepository.forceArchiveByJob(id);
    return updated;
  },
};
