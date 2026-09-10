import { ApplicationRepository } from '@/server/repositories/application.repository';
import { StageEventRepository } from '@/server/repositories/stage-event.repository';
import { TalentRepository } from '@/server/repositories/talent.repository';
import { JobRepository } from '@/server/repositories/job.repository';
import { transitionApplication } from '@/lib/domain/application-state-machine';
import type { Application, ApplicationFilters, PaginatedResult, CreateApplicationInput, TransitionApplicationInput } from '@/lib/domain/types';
import { ValidationError, BusinessError } from '@/lib/domain/errors';
import { createApplicationSchema, updateApplicationSchema, transitionApplicationSchema } from '@/server/validation/schemas';

export const ApplicationService = {
  async getApplication(id: string): Promise<Application & { stageEvents?: import('@/lib/domain/types').StageEvent[] }> {
    const [app, stageEvents] = await Promise.all([
      ApplicationRepository.findById(id),
      StageEventRepository.listByApplication(id),
    ]);
    return { ...app, stageEvents };
  },

  async listApplications(filters: ApplicationFilters): Promise<PaginatedResult<Application>> {
    return ApplicationRepository.list(filters);
  },

  async createApplication(input: CreateApplicationInput, actorId?: string | null): Promise<Application> {
    const parsed = createApplicationSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError('Invalid application data', parsed.error.flatten());

    // Check talent exists
    await TalentRepository.findById(parsed.data.talent_id);
    // Check job exists
    await JobRepository.findById(parsed.data.job_id);

    // Check duplicate
    const existing = await ApplicationRepository.checkDuplicate(parsed.data.talent_id, parsed.data.job_id);
    if (existing) {
      throw new BusinessError(
        'DUPLICATE_APPLICATION',
        '该候选人已在此岗位的推进流程中',
        { existing }
      );
    }

    // Delegate to Repository with full server-side context.
    // actorId is resolved by the server (not trusted from client).
    // The Repository's createWithContext will pass it to the future Supabase RPC
    // so the DB Trigger can write StageEvent with the correct actor.
    return ApplicationRepository.createWithContext({
      applicationData: parsed.data,
      actorId: actorId ?? null,
    });
  },

  async transitionStage(id: string, input: TransitionApplicationInput, actorId?: string | null): Promise<Application> {
    const parsed = transitionApplicationSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError('Invalid transition data', parsed.error.flatten());

    const app = await ApplicationRepository.findById(id);
    const fromStage = app.stage;
    const toStage = parsed.data.to_stage;

    // Validate transition via state machine
    const newStage = transitionApplication(fromStage, toStage);

    // Delegate to Repository with full server-side context.
    // actorId is resolved by the server (not trusted from client).
    // note is accepted from the client as business input.
    // The Repository's transitionWithContext will pass both to the future
    // Supabase RPC so the DB Trigger can write StageEvent correctly.
    return ApplicationRepository.transitionWithContext({
      applicationId: id,
      toStage: newStage,
      actorId: actorId ?? null,
      note: parsed.data.note ?? null,
    });
  },

  async updateApplication(id: string, input: unknown): Promise<Application> {
    const parsed = updateApplicationSchema.safeParse(input);
    if (!parsed.success) throw new ValidationError('Invalid update data', parsed.error.flatten());
    return ApplicationRepository.update(id, parsed.data);
  },

  async getPipelineByJob(jobId: string): Promise<Record<string, Application[]>> {
    const apps = await ApplicationRepository.listByJob(jobId);
    const stages = ['matching', 'contacting', 'interested', 'recommended', 'client_review', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'];
    const result: Record<string, Application[]> = {};
    for (const stage of stages) {
      result[stage] = apps.filter((a) => a.stage === stage);
    }
    return result;
  },

  async getPipelineByCompany(companyId: string): Promise<Record<string, Application[]>> {
    const jobs = await JobRepository.listByCompany(companyId);
    const jobIds = jobs.map((j) => j.id);
    const allApps: Application[] = [];
    for (const jid of jobIds) {
      const apps = await ApplicationRepository.listByJob(jid);
      allApps.push(...apps);
    }
    const stages = ['matching', 'contacting', 'interested', 'recommended', 'client_review', 'interview', 'offer', 'hired', 'rejected', 'withdrawn'];
    const result: Record<string, Application[]> = {};
    for (const stage of stages) {
      result[stage] = allApps.filter((a) => a.stage === stage);
    }
    return result;
  },

  async setNextAction(id: string, nextActionAt: string): Promise<Application> {
    return ApplicationRepository.update(id, { next_action_at: nextActionAt });
  },
};
