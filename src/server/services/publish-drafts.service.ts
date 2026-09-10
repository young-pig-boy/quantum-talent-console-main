import { JobService } from '@/server/services/job.service';
import { PublicationService } from '@/server/services/publication.service';
import type {
  Job,
  JobPublication,
  PaginatedResult,
  BatchOperationResult,
  BatchOperationItemResult,
} from '@/lib/domain/types';

export interface PublishDraftItemResult {
  jobId: string;
  jobCode: string;
  title: string;
  publicationId?: string;
  status: 'published' | 'no_publication' | 'failed';
  message: string;
}

export interface PublishAllDraftsResult {
  totalDraftJobs: number;
  published: PublishDraftItemResult[];
  noPublication: PublishDraftItemResult[];
  failed: PublishDraftItemResult[];
  skipped: number;
}

/**
 * One-click operation: turn EVERY draft job into "recruiting" and publish
 * its public listing(s) for operation.
 *
 * Rules (per draft job):
 * - job has publication(s) → delegate to PublicationService.batchPublish()
 *   (which internally startRecruiting() the underlying draft job, then publish)
 * - job has NO publication → only startRecruiting() (recruiting without public listing)
 *
 * Partial success allowed; never throws on per-item failures.
 */
export async function publishAllDraftJobs(): Promise<PublishAllDraftsResult> {
  const draftJobs = await fetchAllDraftJobs();

  const published: PublishDraftItemResult[] = [];
  const noPublication: PublishDraftItemResult[] = [];
  const failed: PublishDraftItemResult[] = [];
  let skipped = 0;

  for (const job of draftJobs) {
    const pubs = await fetchPublicationsByJob(job.id);

    if (pubs.length === 0) {
      try {
        await JobService.startRecruiting(job.id);
        noPublication.push({
          jobId: job.id,
          jobCode: job.job_code ?? '',
          title: job.title,
          status: 'no_publication',
          message: '已转为招聘中，但暂无公开岗位可发布',
        });
      } catch (e) {
        failed.push({
          jobId: job.id,
          jobCode: job.job_code ?? '',
          title: job.title,
          status: 'failed',
          message: `仅转招聘中失败: ${(e as Error).message}`,
        });
      }
      continue;
    }

    // Publications exist → batch publish (handles draft→published / offline→republish / published→skipped / archived→skipped)
    const result: BatchOperationResult = await PublicationService.batchPublish(
      pubs.map((p) => p.id),
    );

    for (const item of result.results) {
      const pub = pubs.find((p) => p.id === item.id);
      if (item.status === 'success') {
        published.push({
          jobId: job.id,
          jobCode: job.job_code ?? '',
          title: job.title,
          publicationId: item.id,
          status: 'published',
          message: item.message,
        });
      } else if (item.status === 'skipped') {
        skipped++;
      } else {
        failed.push({
          jobId: job.id,
          jobCode: job.job_code ?? '',
          title: job.title,
          publicationId: item.id,
          status: 'failed',
          message: item.message,
        });
      }
    }

    // batchPublish succeeded for at least one publication but the job is still draft?
    // batchPublish guarantees: draft job → startRecruiting() before publishing, so no extra step needed.
  }

  return {
    totalDraftJobs: draftJobs.length,
    published,
    noPublication,
    failed,
    skipped,
  };
}

async function fetchAllDraftJobs(): Promise<Job[]> {
  const jobs: Job[] = [];
  let page = 1;
  let res: PaginatedResult<Job>;
  do {
    res = await JobService.listJobs({ status: 'draft', page, pageSize: 100 });
    jobs.push(...res.data);
    page += 1;
  } while (jobs.length < res.total && res.data.length > 0);
  return jobs;
}

async function fetchPublicationsByJob(jobId: string): Promise<JobPublication[]> {
  const res: PaginatedResult<JobPublication> = await PublicationService.listPublications({
    job_id: jobId,
    page: 1,
    pageSize: 100,
  });
  return res.data;
}
