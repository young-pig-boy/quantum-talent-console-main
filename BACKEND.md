# BACKEND.md — 量子人才猎头业务控制台 后端架构文档

## 一、架构概览

```
前端页面 (Phase 1 UI)
    ↓ (下一轮切换)
API / Server Action
    ↓
Service (业务逻辑 + 状态机 + 事务)
    ↓
Repository (数据访问)
    ↓
Supabase Client (admin/server/browser)
    ↓
PostgreSQL (Supabase)
```

## 二、核心数据模型

| 表 | 说明 | 关系 |
|---|---|---|
| `profiles` | 用户画像 (对应 auth.users) | — |
| `companies` | 客户公司 | Company 1:N Job |
| `sites` | 人才网站 | Site 1:N JobPublication |
| `jobs` | 内部招聘岗位 | Job 1:N JobPublication, Job 1:N Application |
| `job_publications` | 公开岗位 (Job 的安全公开版本) | JobPublication 1:N Lead |
| `leads` | 在线投递 | Lead 0..1 Talent |
| `talents` | 人才库 | Talent 1:N Application |
| `applications` | 招聘申请 (Talent × Job) | Application 1:N StageEvent |
| `stage_events` | 阶段变更历史 | — |
| `analytics_events` | 分析事件 | — |

### 核心规则
- **Talent × Job = Application** (唯一约束: talent_id + job_id)
- **JobPublication** 是 Job 的安全公开版本，禁止包含内部敏感字段
- **Lead → Talent** 转换需检查手机号/邮箱去重

## 三、数据库 Migration

### 执行顺序
1. `001_create_tables.sql` — 创建所有表 (profiles, sites, companies, jobs, job_publications, leads, talents, applications, stage_events, analytics_events)
2. `002_indexes_triggers.sql` — 性能索引 + updated_at 自动触发器
3. `003_rls.sql` — Row Level Security 策略
4. `004_rpc_functions.sql` — PostgreSQL RPC 函数 (原子事务操作)

### updated_at 触发器
所有核心表均通过 PostgreSQL Trigger 自动更新 `updated_at` 字段，代码层无需手动维护。

## 四、状态机

### Job 状态流转
```
draft → recruiting ⇄ paused
recruiting → closed
paused → closed
closed → archived
```

### JobPublication 状态流转
```
draft → published ⇄ offline
draft → archived
offline → archived
published → archived
```

### Lead 状态流转
```
new → reviewed → contacting → qualified → converted
reviewed → invalid
contacting → invalid
```

### Application 状态流转
```
主链: matching → contacting → interested → recommended → client_review → interview → offer → hired
异常: matching/contacting/recommended/client_review/interview → rejected
退出: contacting/interested/interview/offer → withdrawn
```

## 五、Repository 层

| Repository | 文件 | 职责 |
|---|---|---|
| `CompanyRepository` | `src/server/repositories/company.repository.ts` | 公司 CRUD + 搜索筛选分页 |
| `JobRepository` | `src/server/repositories/job.repository.ts` | 岗位 CRUD + 搜索筛选分页 |
| `PublicationRepository` | `src/server/repositories/publication.repository.ts` | 公开岗位 CRUD + slug 查询 + 状态更新 |
| `LeadRepository` | `src/server/repositories/lead.repository.ts` | 投递 CRUD + 去重查询 |
| `TalentRepository` | `src/server/repositories/talent.repository.ts` | 人才 CRUD + 搜索筛选 |
| `ApplicationRepository` | `src/server/repositories/application.repository.ts` | 申请 CRUD + 唯一性约束 |
| `StageEventRepository` | `src/server/repositories/stage-event.repository.ts` | 阶段历史写入 + 查询 |
| `AnalyticsRepository` | `src/server/repositories/analytics.repository.ts` | 分析事件写入 + 聚合查询 |

## 六、Service 层

| Service | 文件 | 核心能力 |
|---|---|---|
| `CompanyService` | `src/server/services/company.service.ts` | createCompany, getCompany, listCompanies, updateCompany, setCompanyStatus |
| `JobService` | `src/server/services/job.service.ts` | createJob, getJob, listJobs, updateJob, startRecruiting, pauseJob, resumeJob, closeJob, archiveJob + Publication 联动 |
| `PublicationService` | `src/server/services/publication.service.ts` | createPublicationFromJob, getPublication, listPublications, updatePublication, publishPublication, offlinePublication, republishPublication, archivePublication + 发布校验 |
| `LeadService` | `src/server/services/lead.service.ts` | createLead, getLead, listLeads, updateLead, markReviewed, startContacting, markQualified, markInvalid, convertLeadToTalent + 去重检测 |
| `TalentService` | `src/server/services/talent.service.ts` | createTalent, getTalent, listTalents, updateTalent, getTalentApplications |
| `ApplicationService` | `src/server/services/application.service.ts` | createApplication, getApplication, listApplications, transitionApplicationStage + 重复检测 + StageEvent 生成 |
| `AnalyticsService` | `src/server/services/analytics.service.ts` | getDashboardSummary, getRecruitmentFunnel, getSourceDistribution, getJobRecruitmentMetrics, getPublicationMetrics |
| `StorageService` | `src/server/services/storage.service.ts` | uploadResume, getResumeSignedUrl, deleteResume (Private Bucket: resumes) |
| `PublicApiService` | `src/server/services/public-api.service.ts` | listPublicJobs, getPublicJobBySlug, applyForJob, recordEvent |

## 七、API Routes

### 内部 API (需要 Auth)

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/api/companies` | 公司列表 |
| POST | `/api/companies` | 新建公司 |
| GET | `/api/companies/[id]` | 公司详情 |
| PUT | `/api/companies/[id]` | 更新公司 |
| GET | `/api/jobs` | 岗位列表 |
| POST | `/api/jobs` | 新建岗位 |
| GET | `/api/jobs/[id]` | 岗位详情 |
| PATCH | `/api/jobs/[id]` | 更新岗位 |
| POST | `/api/jobs/[id]/start` | 开始招聘 |
| POST | `/api/jobs/[id]/pause` | 暂停招聘 |
| POST | `/api/jobs/[id]/resume` | 恢复招聘 |
| POST | `/api/jobs/[id]/close` | 关闭岗位 |
| POST | `/api/jobs/[id]/archive` | 归档岗位 |
| POST | `/api/jobs/[id]/publication` | 创建公开岗位 |
| GET | `/api/publications` | 公开岗位列表 |
| GET | `/api/publications/[id]` | 公开岗位详情 |
| PATCH | `/api/publications/[id]` | 更新公开岗位 |
| POST | `/api/publications/[id]/publish` | 发布公开岗位 |
| POST | `/api/publications/[id]/offline` | 下架公开岗位 |
| POST | `/api/publications/[id]/republish` | 重新发布 |
| POST | `/api/publications/[id]/archive` | 归档公开岗位 |
| GET | `/api/leads` | 投递列表 |
| POST | `/api/leads` | 新建投递 |
| GET | `/api/leads/[id]` | 投递详情 |
| PATCH | `/api/leads/[id]` | 更新投递 |
| POST | `/api/leads/[id]/review` | 标记已审 |
| POST | `/api/leads/[id]/contact` | 开始联系 |
| POST | `/api/leads/[id]/qualify` | 标记合格 |
| POST | `/api/leads/[id]/invalidate` | 标记无效 |
| POST | `/api/leads/[id]/convert` | 转为人才 |
| GET | `/api/talents` | 人才列表 |
| POST | `/api/talents` | 新建人才 |
| GET | `/api/talents/[id]` | 人才详情 |
| PATCH | `/api/talents/[id]` | 更新人才 |
| GET | `/api/applications` | 申请列表 |
| POST | `/api/applications` | 新建申请 |
| GET | `/api/applications/[id]` | 申请详情 |
| PATCH | `/api/applications/[id]` | 更新申请 |
| POST | `/api/applications/[id]/transition` | 阶段推进 |
| GET | `/api/analytics/dashboard` | 仪表盘概要 |
| GET | `/api/analytics/funnel` | 招聘漏斗 |
| GET | `/api/analytics/sources` | 来源分布 |

### Public API (无需 Auth)

| 方法 | 路径 | 功能 |
|---|---|---|
| GET | `/api/public/jobs` | 公开岗位列表 (仅 published) |
| GET | `/api/public/jobs/[slug]` | 公开岗位详情 |
| POST | `/api/public/apply` | 在线投递 |
| POST | `/api/public/events` | 分析事件上报 |

## 八、Auth

- 所有内部 API 通过 `guard.ts` 验证 Supabase Session
- 未登录返回 401
- Public API 不需要登录
- Service Role Key 仅在服务端使用，绝不暴露到前端

## 九、RLS (Row Level Security)

Migration `003_rls.sql` 包含完整的 RLS 策略：
- `authenticated` 用户可读取/操作业务数据（根据 role）
- `anon` 用户只能通过 Public API 访问公开数据
- Service Role 绕过 RLS

## 十、Storage

- Bucket: `resumes` (Private)
- 支持文件类型: PDF, DOC, DOCX
- 文件大小限制: 10MB
- 功能: upload, getSignedUrl, delete
- 代码: `src/server/services/storage.service.ts`

## 十一、环境变量

| 变量名 | 说明 | 必填 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL | 是 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key | 是 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | 是 |

## 十二、当前状态

### ✅ 已完成
- Phase 2: Supabase Client 分层 + Migration + Types + RLS
- Phase 3: Company + Job CRUD 后端完整
- Phase 4: JobPublication 生成/发布/下架/状态联动
- Phase 5: Public Jobs API (公开岗位列表/详情)
- Phase 6: Public Apply → Lead 后端完整
- Phase 7: Lead/Talent/Application/StageEvent 后端完整
- Phase 8: Dashboard/Funnel/Analytics 聚合后端完整
- 状态机 (4个)
- Validation (Zod)
- Auth Guard
- Storage Service
- 统一错误处理
- RLS SQL
- Lint ✅ / TypeCheck ✅ / Build ✅

### ⏳ 待完成 (需要 Supabase 配置)
- 填入环境变量 (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- 执行 migration
- 创建 Storage Bucket
- UI 从 mock-data 切换到真实 API
- 人才官网前端接 Public API

## 十三、后续填 Key 后首次联调步骤

1. 填入三个环境变量到 `.env.local`
2. 执行 `supabase migration up`
3. 创建 resumes Storage Bucket (Private)
4. 在 Supabase Auth 中创建测试用户
5. 测试链路: 登录 → 创建公司 → 创建岗位 → 发布公开岗位 → Public API 查看 → 在线投递 → 查看 Lead → 转 Talent → 创建 Application → 推进阶段
