import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { CompanyService } from '@/server/services/company.service';
import { JobService } from '@/server/services/job.service';
import { PublicationService } from '@/server/services/publication.service';
import { requirePermission } from '@/server/auth/guard';
import { apiError, catchApiErrors } from '@/server/auth/api-helpers';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';

interface BuchouJob {
  source_id: string;
  source_detail_urls: string[];
  company: string;
  title: string;
  slug: string;
  city: string;
  education: string;
  experience: string;
  salary_display: string;
  track: string;
  direction: string;
  summary: string;
  candidate_profile: string[];
  tags: string[];
  priority: string;
  publish_wave: number;
  duplicate_group: string;
  publication_status: string;
}

interface BuchouImportData {
  source: { company: string };
  import_contract: {
    target: string;
    default_job_status: string;
    default_publication_status: string;
    publication_rule: string;
  };
  jobs: BuchouJob[];
}

interface ImportResult {
  jobId: string;
  title: string;
  publicationId: string;
  slug: string;
  status: 'success' | 'skipped' | 'failed';
  reason?: string;
}

const SOURCE_FILE = 'buchou-quantum-jobs-listing-intake.json';
const COMPANY_NAME = '不筹量子';

/**
 * Build public-facing responsibilities from the intake summary.
 * The intake file only contains a one-line summary (JD details not yet fetched),
 * so we derive 3 generic duty bullets grounded in the summary/direction — no
 * invented specifics. Real JD duties can be edited later from the console.
 */
function buildResponsibilities(j: BuchouJob): string {
  const duties = [
    j.summary,
    `围绕「${j.direction}」方向推进技术方案的设计、搭建与验证`,
    '参与团队实验/研发流程的迭代，沉淀可复用的方案与文档',
  ];
  return duties.join('\n');
}

export async function POST() {
  try {
    await requirePermission('publication_publish');
  } catch (e) {
    return catchApiErrors(e);
  }

  const results: ImportResult[] = [];
  const errors: string[] = [];

  // 1. Read intake JSON
  const filePath = path.join(process.cwd(), 'assets', SOURCE_FILE);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json(
      { success: false, error: `JSON file not found at assets/${SOURCE_FILE}` },
      { status: 404 }
    );
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data: BuchouImportData = JSON.parse(raw);

  // 2. Find or create the company
  const supabase = getSupabaseAdminUntyped();
  const { data: existingCompanies } = await supabase
    .from('companies')
    .select('id')
    .eq('name', COMPANY_NAME)
    .limit(1);

  let companyId: string;
  if (existingCompanies && existingCompanies.length > 0) {
    companyId = existingCompanies[0].id;
    console.log(`[buchou-import] Using existing company: ${COMPANY_NAME} (${companyId})`);
  } else {
    const company = await CompanyService.createCompany({
      name: COMPANY_NAME,
      display_name: COMPANY_NAME,
      industry: '量子计算',
      description: '中性原子量子计算初创公司（A轮），布局冷原子实验平台、容错量子计算、量子算法与测控硬件。',
    });
    companyId = company.id;
    console.log(`[buchou-import] Created company: ${COMPANY_NAME} (${companyId})`);
  }

  // 3. Get first active site
  const { data: sites } = await supabase.from('sites').select('*').eq('status', 'active').limit(1);
  if (!sites || sites.length === 0) {
    return NextResponse.json({ success: false, error: 'No active site found. Please create a site first.' }, { status: 400 });
  }
  const siteId = sites[0].id;
  console.log(`[buchou-import] Using site: ${sites[0].name} (${siteId})`);

  // 4. Idempotency guard: collect jobs already imported from this file (by source_id)
  const { data: existingJobs } = await supabase
    .from('jobs')
    .select('id,status,intake_metadata')
    .contains('intake_metadata', { source_file: SOURCE_FILE })
    .limit(200);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingJobBySourceId = new Map<string, any>();
  for (const job of existingJobs ?? []) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sid = (job as any).intake_metadata?.source_id;
    if (typeof sid === 'string') existingJobBySourceId.set(sid, job);
  }
  console.log(`[buchou-import] Existing jobs from this file: ${existingJobBySourceId.size}`);

  // Shared helper: ensure recruiting → create publication → publish
  async function ensurePublished(job: { id: string; status: string }, j: BuchouJob) {
    if (job.status !== 'recruiting') {
      await JobService.startRecruiting(job.id);
    }
    const pub = await PublicationService.createPublicationFromJob(job.id, siteId, {
      title: j.title,
      company_display_name: j.company,
      city: j.city,
      salary_display: j.salary_display,
      summary: j.summary,
      responsibilities: buildResponsibilities(j),
      requirements: j.candidate_profile.join('\n'),
      education_requirement: j.education,
      // experience_requirement omitted — intake "待从详情页确认" not suitable for public display
      track: j.track,
      direction: j.direction,
      tags: j.tags,
      slug: j.slug,
    });
    await PublicationService.publishPublication(pub.id);
    return pub;
  }

  // 5. Process each job
  for (const j of data.jobs) {
    try {
      const existing = existingJobBySourceId.get(j.source_id);

      if (existing) {
        // Check whether this job already has a publication
        const { data: existingPub } = await supabase
          .from('job_publications')
          .select('id,status')
          .eq('job_id', existing.id)
          .maybeSingle();

        if (existingPub) {
          results.push({ jobId: existing.id, title: j.title, publicationId: existingPub.id, slug: j.slug, status: 'skipped', reason: 'already imported' });
          console.log(`[buchou-import] ⏭ Skipped (already imported): ${j.title}`);
          continue;
        }

        // Resume interrupted import: job exists but publication does not
        console.log(`[buchou-import] Resuming interrupted import: ${j.title}`);
        const pub = await ensurePublished(existing, j);
        results.push({ jobId: existing.id, title: j.title, publicationId: pub.id, slug: pub.slug, status: 'success', reason: 'resumed' });
        console.log(`[buchou-import] ✅ Published (resumed): ${j.title} (pub=${pub.id})`);
        continue;
      }

      console.log(`[buchou-import] Processing: ${j.title} (${j.source_id})`);

      // 5a. Create internal job (draft)
      const job = await JobService.createJob({
        company_id: companyId,
        title: j.title,
        city: j.city,
        jd: j.summary,
        intake_metadata: {
          source_id: j.source_id,
          priority: j.priority,
          publish_wave: j.publish_wave,
          duplicate_group: j.duplicate_group,
          source_file: SOURCE_FILE,
          publication_status: j.publication_status,
        },
      });

      // 5b-5d. Recruit → publish
      const pub = await ensurePublished(job, j);

      results.push({ jobId: job.id, title: j.title, publicationId: pub.id, slug: pub.slug, status: 'success' });
      console.log(`[buchou-import] ✅ Published: ${j.title} (pub=${pub.id})`);
    } catch (e) {
      const msg = (e as Error).message;
      results.push({ jobId: '', title: j.title, publicationId: '', slug: j.slug, status: 'failed', reason: msg });
      errors.push(`${j.title}: ${msg}`);
      console.error(`[buchou-import] ❌ ${j.title}: ${msg}`);
    }
  }

  const successCount = results.filter((r) => r.status === 'success').length;
  const skippedCount = results.filter((r) => r.status === 'skipped').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;

  return NextResponse.json({
    success: failedCount === 0,
    summary: `共 ${data.jobs.length} 个岗位：成功 ${successCount}，跳过 ${skippedCount}，失败 ${failedCount}`,
    companyId,
    siteId,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
