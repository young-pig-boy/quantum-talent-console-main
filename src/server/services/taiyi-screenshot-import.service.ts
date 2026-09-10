/**
 * 太一量生（截图核验版）岗位导入 Service
 *
 * 数据源：assets/taiyi-screenshot-verified-showcase-import_20260817133559363.json
 * 规则（与 buchou/taiyi 先例一致，但本批为 draft 草稿导入，不发布）：
 *  1. 按 slug 幂等去重：slug 已存在 Publication → matched（跳过，不覆盖）
 *  2. Company「太一量生」find-or-create
 *  3. Job + JobPublication 状态统一为 draft（不 startRecruiting、不 publish）
 *  4. list_only 岗位（激光工程师 / 量子操控工程师）JD 不完整 → 跳过公开创建，列入待补全
 *  5. Track 仅允许正式值（superconducting/ion-trap/photonics/communication-sensing）或 null
 *  6. 附件中 DB 无对应列的字段（candidate_profile/source_status/source_evidence 等）不写库，仅报告
 */
import fs from 'fs';
import path from 'path';
import { CompanyService } from '@/server/services/company.service';
import { JobService } from '@/server/services/job.service';
import { PublicationService } from '@/server/services/publication.service';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';

export const TAIYI_SCREENSHOT_SOURCE_FILE = 'taiyi-screenshot-verified-showcase-import_20260817133559363.json';
export const TAIYI_SCREENSHOT_COMPANY = '太一量生';

/** 附件岗位结构（仅声明 DB 有对应列的字段 + 用于判断的字段） */
export interface TaiyiScreenshotJob {
  job_id: string | null;
  publication_id: string | null;
  slug: string;
  public_title: string;
  company_display_name: string;
  city: string;
  salary_display: string;
  responsibilities: string[];
  requirements: string[];
  education: string;
  experience: string | null;
  track: string | null;
  direction: string;
  tags: string[];
  seniority: string;
  summary: string;
  status: string;
  featured: boolean;
  urgent: boolean;
  urgent_started_at: string | null;
  urgent_expires_at: string | null;
  published_at: string | null;
  recommended_publish_wave: number | null;
  source_status: string;
  source_evidence: string[];
}

export interface TaiyiScreenshotImportData {
  source: { company: string };
  jobs: TaiyiScreenshotJob[];
}

export type ImportRowStatus =
  | 'created' // 新增 Job + Publication（draft）
  | 'matched' // slug 已存在，跳过（不覆盖）
  | 'skipped_list_only' // 仅列表信息，JD 不完整，跳过公开创建
  | 'failed';

export interface ImportRowResult {
  slug: string;
  title: string;
  status: ImportRowStatus;
  jobId: string;
  publicationId: string;
  jobCode: string | null;
  reason?: string;
}

export interface ImportSummary {
  success: boolean;
  companyId: string;
  siteId: string;
  total: number;
  created: ImportRowResult[];
  matched: ImportRowResult[];
  skippedListOnly: ImportRowResult[];
  failed: ImportRowResult[];
  errors: string[];
  /** 附件中数据库无对应列、未写入的字段说明 */
  unmappedFields: string[];
  /** 疑似与历史导入岗位重复、需人工确认的项 */
  pendingConfirm: Array<{ slug: string; title: string; note: string }>;
}

/** 附件字段 → DB 无对应列（不写库，仅报告） */
const UNMAPPED_FIELDS = [
  'candidate_profile（候选人画像，DB 无对应列）',
  'source_status（full_detail/list_only，DB 无对应列）',
  'source_evidence（Image N 截图证据，DB 无对应列）',
  'job_id / publication_id（附件占位 null，由 DB 生成）',
  'recommended_publish_wave（DB 无独立列，已按约定映射至 intake_metadata.publish_wave）',
];

const KNOWN_SLUGS_TO_SKIP = new Set(['taiyi-laser-engineer', 'taiyi-quantum-control-engineer']);

/** 读取附件 JSON */
function loadImportData(): TaiyiScreenshotImportData {
  const filePath = path.join(process.cwd(), 'assets', TAIYI_SCREENSHOT_SOURCE_FILE);
  if (!fs.existsSync(filePath)) {
    throw new Error(`JSON file not found at assets/${TAIYI_SCREENSHOT_SOURCE_FILE}`);
  }
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as TaiyiScreenshotImportData;
}

/** 从 Company 名解析公司 ID（find-or-create） */
async function findOrCreateCompany(supabase: ReturnType<typeof getSupabaseAdminUntyped>): Promise<string> {
  const { data: existing } = await supabase.from('companies').select('id').eq('name', TAIYI_SCREENSHOT_COMPANY).limit(1);
  if (existing && existing.length > 0) {
    console.log(`[taiyi-screenshot-import] Using existing company: ${TAIYI_SCREENSHOT_COMPANY} (${existing[0].id})`);
    return existing[0].id;
  }
  const company = await CompanyService.createCompany({
    name: TAIYI_SCREENSHOT_COMPANY,
    display_name: TAIYI_SCREENSHOT_COMPANY,
    industry: '量子计算',
    description: '中性原子量子计算平台公司',
  });
  console.log(`[taiyi-screenshot-import] Created company: ${TAIYI_SCREENSHOT_COMPANY} (${company.id})`);
  return company.id;
}

/** 查询第一个 active site */
async function getFirstActiveSiteId(supabase: ReturnType<typeof getSupabaseAdminUntyped>): Promise<string> {
  const { data: sites } = await supabase.from('sites').select('id, name').eq('status', 'active').limit(1);
  if (!sites || sites.length === 0) {
    throw new Error('No active site found. Please create a site first.');
  }
  return sites[0].id;
}

/** 查询本批 slug 已存在的 Publications（幂等去重） */
async function findExistingPublications(
  supabase: ReturnType<typeof getSupabaseAdminUntyped>,
  slugs: string[]
): Promise<Map<string, { id: string; status: string }>> {
  const map = new Map<string, { id: string; status: string }>();
  if (slugs.length === 0) return map;
  const { data } = await supabase.from('job_publications').select('id, slug, status').in('slug', slugs);
  for (const p of data ?? []) {
    map.set(p.slug, { id: p.id, status: p.status });
  }
  return map;
}

/** 创建内部 Job（draft，不 startRecruiting） */
async function createJobDraft(companyId: string, j: TaiyiScreenshotJob): Promise<{ id: string; jobCode: string | null }> {
  const job = await JobService.createJob({
    company_id: companyId,
    title: j.public_title,
    city: j.city,
    // 附件无原始 JD 字段；将完整职责列表写入 jd（original_jd），保留信息，非臆造
    jd: j.responsibilities.length > 0 ? j.responsibilities.join('\n') : (j.summary || undefined),
    hard_requirements: j.requirements.length > 0 ? j.requirements.join('\n') : undefined,
    intake_metadata: {
      source_id: j.slug, // 无独立源 ID，以 slug 作为幂等唯一键
      publish_wave: j.recommended_publish_wave ?? undefined,
      source_file: TAIYI_SCREENSHOT_SOURCE_FILE,
      publication_status: 'draft',
    },
  });
  return { id: job.id, jobCode: job.job_code ?? null };
}

/** 创建公开岗位（draft，不发布） */
async function createPublicationDraft(jobId: string, siteId: string, j: TaiyiScreenshotJob): Promise<{ id: string }> {
  const pub = await PublicationService.createPublicationFromJob(jobId, siteId, {
    title: j.public_title,
    company_display_name: j.company_display_name,
    city: j.city,
    salary_display: j.salary_display,
    summary: j.summary || undefined,
    responsibilities: j.responsibilities.length > 0 ? j.responsibilities.join('\n') : undefined,
    requirements: j.requirements.length > 0 ? j.requirements.join('\n') : undefined,
    education_requirement: j.education || undefined,
    experience_requirement: j.experience ?? undefined,
    track: j.track ?? undefined,
    direction: j.direction ?? undefined,
    seniority: j.seniority ?? undefined,
    tags: j.tags ?? [],
    urgent: false,
    featured: false,
    slug: j.slug,
  });
  return { id: pub.id };
}

/** 主入口：执行导入（幂等，可重复运行） */
export async function runTaiyiScreenshotImport(): Promise<ImportSummary> {
  const data = loadImportData();
  const supabase = getSupabaseAdminUntyped();

  const companyId = await findOrCreateCompany(supabase);
  const siteId = await getFirstActiveSiteId(supabase);

  const allSlugs = data.jobs.map((j) => j.slug);
  const existingPubs = await findExistingPublications(supabase, allSlugs);

  const created: ImportRowResult[] = [];
  const matched: ImportRowResult[] = [];
  const skippedListOnly: ImportRowResult[] = [];
  const failed: ImportRowResult[] = [];
  const errors: string[] = [];
  const pendingConfirm: Array<{ slug: string; title: string; note: string }> = [];

  // 疑似与历史目录版（taiyi-quantum-jobs.json 已导入、slug 不同）重复的标题
  const historicalTitles = new Set([
    '量子科学家', '量子工程师', '光学工程师', '激光工程师', '量子操控工程师',
    '电学工程师', '嵌入式软件工程师', '机械/结构工程师', '量子纠错算法工程师',
    '量子计算算法工程师', '量子编译器工程师', '项目经理', '量子控制工程师（实习）', '初级量子工程师',
  ]);

  for (const j of data.jobs) {
    try {
      // 1) slug 已存在 → matched，不覆盖
      const existing = existingPubs.get(j.slug);
      if (existing) {
        matched.push({
          slug: j.slug, title: j.public_title, status: 'matched',
          jobId: '', publicationId: existing.id, jobCode: null,
          reason: `publication 已存在（status=${existing.status}），不覆盖`,
        });
        console.log(`[taiyi-screenshot-import] ⏭ Matched (already exists): ${j.slug}`);
        continue;
      }

      // 2) list_only（JD 不完整）→ 跳过公开创建，待补全
      if (KNOWN_SLUGS_TO_SKIP.has(j.slug) || j.source_status === 'list_only') {
        skippedListOnly.push({
          slug: j.slug, title: j.public_title, status: 'skipped_list_only',
          jobId: '', publicationId: '', jobCode: null,
          reason: 'JD 不完整（仅列表信息），标记待补全，跳过公开创建',
        });
        console.log(`[taiyi-screenshot-import] ⏭ Skipped (list_only): ${j.slug}`);
        continue;
      }

      // 3) 创建 Job（draft）+ Publication（draft）
      const job = await createJobDraft(companyId, j);
      const pub = await createPublicationDraft(job.id, siteId, j);
      created.push({
        slug: j.slug, title: j.public_title, status: 'created',
        jobId: job.id, publicationId: pub.id, jobCode: job.jobCode,
      });
      console.log(`[taiyi-screenshot-import] ✅ Created draft: ${j.public_title} (job=${job.id}, pub=${pub.id})`);

      // 4) 疑似与历史目录版岗位标题重复（slug 不同）→ 待确认
      if (historicalTitles.has(j.public_title)) {
        pendingConfirm.push({
          slug: j.slug,
          title: j.public_title,
          note: '历史目录版（taiyi-quantum-jobs.json）已存在同名岗位但 slug 不同，疑似同一岗位，需人工确认是否合并',
        });
      }
    } catch (e) {
      const msg = (e as Error).message;
      failed.push({
        slug: j.slug, title: j.public_title, status: 'failed',
        jobId: '', publicationId: '', jobCode: null, reason: msg,
      });
      errors.push(`${j.public_title} (${j.slug}): ${msg}`);
      console.error(`[taiyi-screenshot-import] ❌ ${j.slug}: ${msg}`);
    }
  }

  return {
    success: failed.length === 0,
    companyId,
    siteId,
    total: data.jobs.length,
    created,
    matched,
    skippedListOnly,
    failed,
    errors,
    unmappedFields: UNMAPPED_FIELDS,
    pendingConfirm,
  };
}
