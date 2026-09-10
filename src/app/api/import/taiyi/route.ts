import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { CompanyService } from '@/server/services/company.service';
import { JobService } from '@/server/services/job.service';
import { PublicationService } from '@/server/services/publication.service';
import { requireAuth } from '@/server/auth/guard';
import { catchApiErrors } from '@/server/auth/api-helpers';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';

interface ImportJob {
  source_id: string;
  company: string;
  title: string;
  slug: string;
  city: string;
  employment_type: string;
  source_category: string;
  track: string;
  direction: string;
  education: string;
  experience: string;
  salary_display: string;
  summary: string;
  responsibilities: string[];
  candidate_profile: string[];
  tags: string[];
  seniority: string;
  priority: string;
  publish_wave: number;
  duplicate_group: string;
  publication_status: string;
}

interface ImportData {
  jobs: ImportJob[];
  source: { company: string };
}

interface ImportResult {
  job: string;
  title: string;
  publicationId: string;
  status: 'success' | 'failed';
  error?: string;
}

export async function POST() {
  try {
    await requireAuth();
  } catch (e) {
    return catchApiErrors(e);
  }

  const results: ImportResult[] = [];
  const errors: string[] = [];

  // 1. Read JSON file
  const filePath = path.join(process.cwd(), 'assets', 'taiyi-quantum-jobs.json');
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ success: false, error: 'JSON file not found at assets/taiyi-quantum-jobs.json' }, { status: 404 });
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data: ImportData = JSON.parse(raw);

  // 2. Find or create the company
  const supabase = getSupabaseAdminUntyped();
  const { data: existingCompanies } = await supabase.from('companies').select('*').eq('name', '太一量生').limit(1);
  let companyId: string;

  if (existingCompanies && existingCompanies.length > 0) {
    companyId = existingCompanies[0].id;
    console.log(`[taiyi-import] Using existing company: 太一量生 (${companyId})`);
  } else {
    const company = await CompanyService.createCompany({
      name: '太一量生',
      display_name: '太一量生',
      industry: '量子计算',
      description: '中性原子量子计算平台公司',
    });
    companyId = company.id;
    console.log(`[taiyi-import] Created company: 太一量生 (${companyId})`);
  }

  // 3. Get first active site
  const { data: sites } = await supabase.from('sites').select('*').eq('status', 'active').limit(1);
  if (!sites || sites.length === 0) {
    return NextResponse.json({ success: false, error: 'No active site found. Please create a site first.' }, { status: 400 });
  }
  const siteId = sites[0].id;
  console.log(`[taiyi-import] Using site: ${sites[0].name} (${siteId})`);

  // 4. Process each job
  for (const j of data.jobs) {
    try {
      console.log(`[taiyi-import] Processing: ${j.title}`);

      // 4a. Create job (draft)
      const job = await JobService.createJob({
        company_id: companyId,
        title: j.title,
        city: j.city,
        intake_metadata: {
          source_id: j.source_id,
          priority: j.priority,
          publish_wave: j.publish_wave,
          duplicate_group: j.duplicate_group,
          source_file: 'taiyi-quantum-jobs.json',
          publication_status: j.publication_status,
        },
      });

      // 4b. Start recruiting
      await JobService.startRecruiting(job.id);

      // 4c. Create publication from job
      const pub = await PublicationService.createPublicationFromJob(job.id, siteId, {
        title: j.title,
        company_display_name: j.company,
        city: j.city,
        salary_display: j.salary_display,
        summary: j.summary,
        responsibilities: Array.isArray(j.responsibilities) ? j.responsibilities.join('\n') : j.responsibilities,
        requirements: Array.isArray(j.candidate_profile) ? j.candidate_profile.join('；') : j.candidate_profile,
        education_requirement: j.education,
        experience_requirement: j.experience,
        track: j.track,
        direction: j.direction,
        seniority: j.seniority,
        tags: j.tags,
        slug: j.slug,
      });

      // 4d. Publish
      await PublicationService.publishPublication(pub.id);

      results.push({ job: job.id, title: j.title, publicationId: pub.id, status: 'success' });
      console.log(`[taiyi-import] ✅ Published: ${j.title}`);
    } catch (e) {
      const msg = (e as Error).message;
      results.push({ job: '', title: j.title, publicationId: '', status: 'failed', error: msg });
      errors.push(`${j.title}: ${msg}`);
      console.error(`[taiyi-import] ❌ ${j.title}: ${msg}`);
    }
  }

  const successCount = results.filter((r) => r.status === 'success').length;
  const failedCount = results.filter((r) => r.status === 'failed').length;

  return NextResponse.json({
    success: failedCount === 0,
    summary: `共 ${data.jobs.length} 个岗位，成功 ${successCount}，失败 ${failedCount}`,
    results,
    errors: errors.length > 0 ? errors : undefined,
  });
}
