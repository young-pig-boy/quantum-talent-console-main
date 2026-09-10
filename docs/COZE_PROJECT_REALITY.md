# COZE_PROJECT_REALITY.md — 量子人才招聘 Console 业务现实梳理

> 本文档由「项目级业务现实梳理」任务产出，供后续 Codex 穿透审计使用。
> 编制依据（按优先级）：① 当前真实代码（src/）；② 正式共享数据库 `wbpnvbvdotkjhwxhndhz` 的只读审计（`information_schema` / `pg_catalog` / `pg_policies` / `pg_indexes`）；③ docs/DATABASE_REALITY.md 与 docs/database/DATABASE_REALITY.md 两份历史事实快照；④ AGENTS.md 历史修复记录（**已证伪多处，不作为事实源**）。
>
> 原则：**只写「已实现能力」，不写「规划能力」**。凡是仅存在于 README/AGENTS.md/PRD 描述、但代码或数据库未落地的一律标注为未实现或断裂。

---

## 1. Executive Summary

量子人才招聘 Console 是一个 **Next.js 16 + Supabase** 的猎头内部管理控制台，架构分层完整（Page → API Client → Route → Validation → Service → Repository → Supabase），前端 UI 已全量切换至真实 API（Mock 已清零）。但它目前 **不是** 一个能跑通完整招聘主链路的可用系统。

**三条硬结论（均有代码 + 数据库双重证据）：**

1. **认证已彻底从 Supabase Auth 换成「本地 HMAC Cookie 门禁」**，单一硬编码 super admin 身份，deny-by-default 中间件。AGENTS.md 中关于「Supabase SSR 登录」的记录是**过期历史**，与当前代码不符。

2. **Job 与 JobPublication 两个 Repository 的字段映射与真实数据库列名反向（P0 断点）**。真实 DB 列是 `jobs.jd` / `jobs.salary_internal` / `job_publications.title` / `job_publications.company_display_name` / `job_publications.education_requirement` / `job_publications.experience_requirement`；而代码写入的是 `original_jd` / `internal_salary` / `intake_metadata`（jobs 表无此列）与 `public_title` / `public_company_name` / `education` / `experience`（job_publications 表无此列）。**导致 Job 创建/编辑、Publication 创建/编辑、Publication 关键词搜索在持久层直接报错。**

3. **Application 的创建与阶段推进调用两个不存在的 Supabase RPC**（`create_application_with_context`、`transition_application_stage`），而 StageEvent 无任何写入路径（Repository 只读 + 数据库 0 触发器）。**导致 Talent→Application 及后续「推进到 hired」整段断裂。**

**主 UJ 结论：`NO`** —— 今天一个真实猎头「创建岗位 → 候选人投递 → 推进到 hired」这条链**不能完整走完**。断裂点见 §20 UJ 状态矩阵。

---

## 2. Console 定位

| 维度 | 现实 |
|------|------|
| 是什么 | 猎头顾问/招聘运营使用的**内部管理控制台**（不是面向候选人的 Showcase 官网） |
| 谁在用 | 单一「超级管理员」身份（本地 Cookie 门禁，无多角色、无 RBAC 运行时生效） |
| 管理什么 | 公司（客户）、内部岗位 Job、公开岗位 JobPublication、投递线索 Lead、人才 Talent、推进关系 Application、埋点 AnalyticsEvent |
| 数据源 | Supabase（`wbpnvbvdotkjhwxhndhz`），全部经 Service Role Key 直连（**绕过 RLS**） |
| 展示侧 | 公开 API（`/api/public/*`）+ `job_publications` 表是「候选人可见」的唯一 Source of Truth |
| 当前数据状态 | 正式共享库 **空库**（11 张业务表 0 行，profiles/sites 也 0 行） |

**核心矛盾**：这是一个「架构齐全、UI 齐全、但持久层字段契约与真实库错位 + 关键 RPC 缺失」的系统。从代码组织看像已上线；从真实可写链路看处于「半成品」状态。

---

## 3. Core Entity Model

> ① 是什么 ② 为什么存在 ③ 谁创建 ④ 谁修改 ⑤ 核心字段 ⑥ 与其他实体关系 ⑦ 对应 Supabase 表 ⑧ Repository ⑨ Service ⑩ API ⑪ 页面。
> 表格中「写链路」结论基于 Repository 真实代码 vs 真实 DB 列名的逐字段比对。

### 3.1 Company（公司 / 客户）

| 项 | 值 |
|----|----|
| ① 是什么 | 招聘客户公司（用人单位），猎头为其招人 |
| ② 为什么存在 | 岗位 Job 必须挂靠一家公司（`jobs.company_id`） |
| ③ 谁创建 | 猎头在控制台「公司」页手动创建 |
| ④ 谁修改 | 猎头在「公司详情」页编辑 / 删除 |
| ⑤ 核心字段 | name、display_name、industry、description、status（active/inactive）。DB 另有 track/website/contact/phone（代码已移除对它们的读写，属无害未利用） |
| ⑥ 关系 | 1 对多 → Job |
| ⑦ 表 | `companies` |
| ⑧ Repository | `company.repository.ts`（**直接 `.insert(input)` / `.update(input)`，无字段映射**） |
| ⑨ Service | `company.service.ts` |
| ⑩ API | `GET/POST /api/companies`、`GET/PATCH/DELETE /api/companies/[id]` |
| ⑪ 页面 | `(console)/companies/page.tsx`、`[id]/page.tsx` |
| 写链路 | ✅ 正常（直接插入，列名与 DB 一致） |

### 3.2 Job（内部岗位）

| 项 | 值 |
|----|----|
| ① 是什么 | **内部**招聘岗位，猎头自己管理、候选人不可见 |
| ② 为什么存在 | 招聘需求的「内部源」，是 Publication 的关联对象 |
| ③ 谁创建 | 猎头「岗位」页 / `jobs/new` 表单手动创建；或 `POST /api/import/buchou` 批量导入 |
| ④ 谁修改 | 猎头编辑、状态机流转（start/pause/resume/close/archive） |
| ⑤ 核心字段 | title、city、jd、salary_internal、hard_requirements、exclusion_rules、internal_notes、track、status（draft/recruiting/paused/closed/archived） |
| ⑥ 关系 | N 对 1 → Company；1 对 0..1 → JobPublication |
| ⑦ 表 | `jobs` |
| ⑧ Repository | `job.repository.ts`（**有 DB Mapper，但映射反了 → P0**） |
| ⑨ Service | `job.service.ts` |
| ⑩ API | `GET/POST /api/jobs`、`GET/PATCH/DELETE /api/jobs/[id]`、`/api/jobs/[id]/{start,pause,resume,close,archive}`、`/api/jobs/[id]/publication` |
| ⑪ 页面 | `(console)/jobs/page.tsx`、`[id]/page.tsx`、`new/page.tsx` |
| 写链路 | ❌ **创建/编辑失败**：Mapper 写 `original_jd`、`internal_salary`、`intake_metadata`（DB 为 `jd`、`salary_internal`、无此列）。状态流转 ✅（只写 `status` 列，列名正确） |

### 3.3 JobPublication（公开岗位 / Showcase 展示对象）

| 项 | 值 |
|----|----|
| ① 是什么 | 对候选人**可见**的公开岗位卡片，挂在 Showcase 上 |
| ② 为什么存在 | Job 是内部工作对象，Publication 是「对外发布的招聘需求」，两者字段边界不同（§6） |
| ③ 谁创建 | 猎头在岗位详情点「创建公开岗位」（`POST /api/jobs/[id]/publication`），或公开岗位页手动建 |
| ④ 谁修改 | 猎头编辑公开字段、设 Track/Featured/Urgent、发布/下线/归档 |
| ⑤ 核心字段 | title、company_display_name、city、salary_display、summary、responsibilities、requirements、education_requirement、experience_requirement、track、tags(jsonb)、slug、status（draft/published/offline/archived）、featured、urgent、direction、seniority、urgent_started_at、urgent_expires_at |
| ⑥ 关系 | N 对 1 → Job；N 对 1 → Site；1 对多 → Lead |
| ⑦ 表 | `job_publications` |
| ⑧ Repository | `publication.repository.ts`（**DB Mapper 映射反了 → P0**） |
| ⑨ Service | `publication.service.ts` |
| ⑩ API | `GET/POST /api/publications`、`GET/PATCH/DELETE /api/publications/[id]`、`/api/publications/[id]/{publish,offline,republish,archive,feature,unfeature}`、`/api/publications/batch/{publish,offline,feature,unfeature}` |
| ⑪ 页面 | `(console)/publications/page.tsx`、`[id]/page.tsx`、`[id]/preview/page.tsx` |
| 写链路 | ❌ **创建/编辑失败**：Mapper 写 `public_title`、`public_company_name`、`education`、`experience`（DB 为 `title`、`company_display_name`、`education_requirement`、`experience_requirement`），且 `title`/`company_display_name` 是 NOT NULL 未提供。关键词搜索 `public_title.ilike` 同样报错。状态流转（publish/offline/archive，只写 `status`/`published_at`/`offline_at`）✅ 列名正确，但前提是 Publication 已存在 |

### 3.4 Lead（投递线索）

| 项 | 值 |
|----|----|
| ① 是什么 | 候选人在 Showcase 投递后形成的「待处理线索」 |
| ② 为什么存在 | 投递入口的落库对象，猎头据此筛人 |
| ③ 谁创建 | 候选人通过 `POST /api/public/apply`（匿名公开接口） |
| ④ 谁修改 | 猎头做状态流转（review/contact/qualify/invalidate/convert） |
| ⑤ 核心字段 | full_name、phone、email、wechat、site_id(NOT NULL)、publication_id(NOT NULL)、source_channel、source_detail、resume_url、status（new/reviewed/contacting/qualified/converted/invalid）、invalid_reason、notes、converted_talent_id |
| ⑥ 关系 | N 对 1 → Site；N 对 1 → JobPublication；0..1 对 1 → Talent（`converted_talent_id` 单向） |
| ⑦ 表 | `leads` |
| ⑧ Repository | `lead.repository.ts`（直接 insert/update，无映射） |
| ⑨ Service | `lead.service.ts` |
| ⑩ API | `GET/POST /api/leads`、`GET/PATCH /api/leads/[id]`、`/api/leads/[id]/{review,contact,qualify,invalidate,convert}` |
| ⑪ 页面 | `(console)/leads/page.tsx`、`[id]/page.tsx` |
| 写链路 | ✅ 正常（直接插入，列名与 DB 一致） |

### 3.5 Talent（人才资产）

| 项 | 值 |
|----|----|
| ① 是什么 | 沉淀下来的人才池（候选人转正后的长期资产） |
| ② 为什么存在 | 可复用于未来其他岗位，避免重复获取 |
| ③ 谁创建 | 猎头把 Lead convert（`convertLeadToTalent`），或手动创建 |
| ④ 谁修改 | 猎头编辑 Talent 详情 |
| ⑤ 核心字段 | full_name、phone、email、wechat、current_company、current_title、city、education_summary、experience_years、resume_url、source_channel、tags(jsonb)、notes |
| ⑥ 关系 | 1 对多 → Application（Talent × Job）；与 Lead 单向关联（`leads.converted_talent_id` 指向它，Talent 侧不存来源 Lead） |
| ⑦ 表 | `talents` |
| ⑧ Repository | `talent.repository.ts`（直接 insert/update，无映射） |
| ⑨ Service | `talent.service.ts` |
| ⑩ API | `GET/POST /api/talents`、`GET/PATCH/DELETE /api/talents/[id]` |
| ⑪ 页面 | `(console)/talents/page.tsx`、`[id]/page.tsx` |
| 写链路 | ✅ 正常（直接插入，列名与 DB 一致） |

### 3.6 Application（Talent × Job 推进关系）

| 项 | 值 |
|----|----|
| ① 是什么 | 一个 Talent 对某个 Job 的**推进关系**（含招聘阶段 stage） |
| ② 为什么存在 | 表达「这个人才正在被推进到哪个招聘阶段」，是 H5 推进招聘的核心对象 |
| ③ 谁创建 | 猎头把 Talent 关联到 Job 时创建（`POST /api/applications`） |
| ④ 谁修改 | 猎头推进阶段（`POST /api/applications/[id]/transition`）或 PATCH 编辑备注/next_action_at |
| ⑤ 核心字段 | talent_id(NOT NULL)、job_id(NOT NULL)、stage(NOT NULL)、client_feedback、interview_notes、offer_summary、rejection_reason、withdrawal_reason、recommended_at、offer_at、hired_at、next_action_at |
| ⑥ 关系 | N 对 1 → Talent；N 对 1 → Job；1 对多 → StageEvent |
| ⑦ 表 | `applications`（含唯一索引 `app_talent_job_unique` 于 talent_id+job_id） |
| ⑧ Repository | `application.repository.ts`（**调用 2 个不存在的 RPC → P0**） |
| ⑨ Service | `application.service.ts` |
| ⑩ API | `GET/POST /api/applications`、`GET/PATCH /api/applications/[id]`、`POST /api/applications/[id]/transition` |
| ⑪ 页面 | `(console)/applications/[id]/page.tsx`、`(console)/pipeline/page.tsx` |
| 写链路 | ❌ **创建/推进失败**：`createWithContext` 调 `.rpc('create_application_with_context')`、`transitionWithContext` 调 `.rpc('transition_application_stage')`，两 RPC 在正式库均不存在。唯一可写的是 `update(next_action_at)`（直接 UPDATE 现有列） |

### 3.7 StageEvent（阶段历史事件）

| 项 | 值 |
|----|----|
| ① 是什么 | Application 阶段变更的历史流水 |
| ② 为什么存在 | 记录「谁在何时把 Application 从 A 推到 B」 |
| ③ 谁创建 | **设计上应**由 Application 状态变化触发（DB Trigger 或 RPC），**实际无人创建** |
| ④ 谁修改 | 无（不可变历史） |
| ⑤ 核心字段 | application_id、from_stage、to_stage、event_type、note、created_by |
| ⑥ 关系 | N 对 1 → Application |
| ⑦ 表 | `stage_events` |
| ⑧ Repository | `stage-event.repository.ts`（**只读 `listByApplication`，无任何写入方法**） |
| ⑨ Service | 无写入（`application.service.ts` 不写 StageEvent） |
| ⑩ API | 无独立 API（仅随 Application 详情内嵌返回） |
| ⑪ 页面 | `applications/[id]` 时间线展示 |
| 写链路 | ❌ **永远为空**：应用层零写入 + 正式库 0 触发器（`update_updated_at_column` 函数存在但未挂载任何触发器） |

### 3.8 AnalyticsEvent（埋点事件）

| 项 | 值 |
|----|----|
| ① 是什么 | 展示侧行为埋点（浏览/投递/事件） |
| ② 为什么存在 | 支撑 Analytics 页的漏斗/来源分析 |
| ③ 谁创建 | 公开侧匿名埋点（`POST /api/public/events`） |
| ④ 谁修改 | 无 |
| ⑤ 核心字段 | site_id、publication_id、lead_id、event_type、source_channel、session_id、referrer、metadata(jsonb) |
| ⑥ 关系 | 弱关联 Site/Publication/Lead（无 FK） |
| ⑦ 表 | `analytics_events` |
| ⑧ Repository | `analytics.repository.ts` |
| ⑨ Service | `analytics.service.ts` |
| ⑩ API | `GET /api/analytics/*`（读取聚合）、`POST /api/public/events`（写入） |
| ⑪ 页面 | `(console)/analytics/page.tsx`（聚合图表） |
| 写链路 | ✅ 表存在、列名匹配；但依赖展示侧实际埋点调用（当前空库无数据可验证） |

### 实体边界速记（务必区分）

- **Job ≠ Publication**：Job 是内部工作对象，Publication 是「对外展示的招聘卡片」。一个 Job 可对应 0..1 个 Publication（代码语义上 1:1，数据库无唯一约束）。
- **Lead ≠ Talent**：Lead 是「一次投递线索」，Talent 是「沉淀人才」。Lead convert 后产生/复用 Talent。
- **Talent ≠ Application**：Talent 是「人」，Application 是「这个人 × 某个岗位」的推进关系。
- **Application = Talent × Job 的推进关系**（DB 用 `app_talent_job_unique` 唯一索引约束同一对只允许一条）。

---

## 4. Recruiter UJ（真实猎头主链路）

目标链路与当前真实状态：

```
H1 创建/维护岗位          Company(✅) → Job(❌ 字段错位)
H2 发布招聘需求            Job → Publication(❌ 字段错位) → publish(⚠️ 依赖Publication已存在)
P1 Showcase 展示          public/jobs 读 job_publications(✅ 接口存在, 但空库)
C4 候选人投递             public/apply → leads(✅)
P3 Lead 数据记录           leads 落库 + Console 读取(✅)
H3 猎头查看 Lead           leads 列表(✅)
H4 筛选与沟通              review/contact/qualify(✅) → convert(✅)
H5 推进招聘               Talent × Job → Application(❌ RPC缺失) → transition(❌ RPC缺失)
H6 沉淀 Talent             convert → talents(✅)
P4 人才管理                talents 列表/详情(🟡 仅列表页, 无复用闭环)
```

**最远真实能走到的节点**：在「DB 里已存在 Job + Publication」的前提下，链路能走到 **Lead 记录 → 猎头查看 Lead → Lead 转 Talent**。再往前（创建 Application、推进阶段）就断了。而若从零开始，**连「创建 Job」都走不通**。

证据与每个节点的逐步判定见 §5 ~ §12 与 §20。

---

## 5. Company → Job

### 5.1 真实链路

```
页面 companies/new（或列表「新建公司」）
  → POST /api/companies
    → requireAuth()（本地 Cookie 门禁）
    → createCompanySchema（Zod）
    → CompanyService.createCompany()
      → CompanyRepository.create()  →  supabase.from('companies').insert(input)
```
```
页面 jobs/new
  → POST /api/jobs
    → requireAuth()
    → createJobSchema（Zod）
    → JobService.createJob()
      → JobRepository.create()  →  toJobDbCreate(input)  →  .from('jobs').insert(...)
```

### 5.2 关键事实与判定

| 检查项 | 结果 | 说明 |
|--------|------|------|
| 必填字段 | Company: name；Job: title + company_id（Zod 层） | — |
| 保存（Company） | ✅ 闭环 | 直接 `.insert(input)`，列名与 DB 一致 |
| 保存（Job） | ❌ 断裂 | `toJobDbCreate` 产出 `original_jd`/`internal_salary`/`intake_metadata`，正式库 `jobs` 列为 `jd`/`salary_internal`/无 intake_metadata → PostgREST 报「column does not exist」 |
| 编辑 Job | ❌ 断裂 | `toJobDbUpdate` 只要 `jd`/`salary_internal`/`intake_metadata` 任一有值就会写错列 |
| 状态（Job） | ✅ | start/pause/resume/close/archive 只写 `status`（列名正确） |
| 删除/关闭 | Company 删除：有业务保护（`COMPANY_HAS_JOBS`，先 `countJobs`）；Job close/archive：状态机流转 | Company 删除 ✅；Job close/archive ✅ |
| Company FK | 代码假定 `jobs.company_id` 关联 Company，**但 DB 无 FK 约束** | ⚠️ 无数据库保证 |
| 重复岗位 | 无去重（title 可重复） | — |
| Error / Loading / Success Toast | 页面有统一 LoadingPage / ErrorState / Toast | ✅ 前端有，但后端 500 会表现为「创建失败」而非假成功 |

### 5.3 结论

- **Company 创建/编辑**：✅ 已闭环。
- **Job 创建/编辑**：❌ 未实现（持久层字段映射反向，是本次审计发现的最严重断点之一）。

---

## 6. Job → Publication（第一个核心跨端节点）

### 6.1 一个内部 Job 如何变成候选人可见的 JobPublication

```
岗位详情页点「创建公开岗位」
  → POST /api/jobs/[id]/publication
    → requireAuth()
    → 直接 getSupabaseAdminUntyped().from('sites') 查 active site（★ 绕过 Service 解 site）
    → JobService.getJobById(id)
    → PublicationService.createPublicationFromJob(job, overrides, siteId)
      → PublicationRepository.create()  →  toPublicationDbCreate(...)  →  .from('job_publications').insert(...)
```

### 6.2 逐条回答

1. **复制还是关联？** —— **关联，不是复制**。`job_publications.job_id` 指向 `jobs.id`。创建时会把部分 Job 字段「快照式」拷贝进 Publication 字段，但两者是两张表，靠 `job_id` 关联。
2. **哪些字段来自 Job？** —— 创建时：`title`（`public_title` 域字段）、`city`、`summary`（取 `job.jd` 作摘要）、`requirements`（取 `job.hard_requirements`）、`responsibilities`（由 summary + direction 生成通用条目）。见 `createPublicationFromJob`。
3. **后续 Job 更新是否同步 Publication？** —— **不同步**。没有「Job 更新 → 自动回写 Publication」的机制，`updateJob` 只改 `jobs` 表。
4. **哪些公开字段由猎头单独维护？** —— `salary_display`、`summary`、`requirements`、`responsibilities`、`education_requirement`、`experience_requirement`、`track`、`tags`、`slug`、`direction`、`seniority`、`featured`、`urgent`、`urgent_started_at`、`urgent_expires_at`。
5. **publish 最终写哪个字段？** —— `job_publications.status = 'published'` + `published_at` 时间戳（`publishPublication` → `transitionPublication`）。
6. **Offline 如何实现？** —— `offlinePublication` 把 `status → 'offline'` + `offline_at`，并强制 `urgent=false`。
7. **Archived 如何实现？** —— `archivePublication` 把 `status → 'archived'`，并强制 `urgent=false`。
8. **Publish 失败是否可能 UI 假成功？** —— **不会假成功**（后端抛错，前端 Toast 报错）。但「Publication 无法被创建」这一事实会让用户永远到不了 publish 那一步。
9. **发布后 Showcase 多久可见？** —— 无缓存层，`GET /api/public/jobs` 每次实时查 `job_publications`，**写入成功即可见**（理论上）。
10. **缓存问题？** —— 无应用层缓存（Next.js 默认可能对 GET 做静态优化，但 `/api/public/*` 是动态路由，无显式 cache 配置）。

### 6.3 结论

- **Publication 创建/编辑**：❌ 未实现（字段映射反向）。
- **publish / offline / archive**：代码逻辑正确，但**依赖 Publication 已存在**。因创建环节断裂，整段「Job→Publication→publish→Showcase 可见」在当前空库 + 当前代码下**无法走通**。

---

## 7. Console → Showcase 跨系统契约

### 7.1 真实契约

```
Console 发布  →  Supabase.job_publications（唯一 Source of Truth）  →  Showcase Public API 读取
```

- **两个系统共享的 Source of Truth = `job_publications` 表**（外加 `sites` / `leads` / `analytics_events`）。中间没有任何「魔法同步」或消息队列。
- **Showcase 是否依赖 Console API？** —— **否**。Showcase 走的是自己的读取路径（直接 Supabase 或自己的后端读 `job_publications`），不调用 Console 的 `/api/*` 内部接口。
- **Console 是否依赖 Showcase？** —— 反向依赖：候选人投递写 `leads` 表，Console 的 Leads 页读同一张 `leads` 表。

### 7.2 Console 自带的公开接口

| 接口 | 说明 | 是否生产使用 |
|------|------|------|
| `GET /api/public/jobs` | 列出 published 岗位（`listPublicJobs`） | 未知；是 Console 内提供的「公开岗位」读取能力 |
| `GET /api/public/jobs/[slug]` | 岗位详情（`getPublicJobBySlug`） | 未知 |
| `POST /api/public/apply` | 候选人投递 → 写 `leads` | 未知；是 Lead 回流的写入入口 |
| `POST /api/public/events` | 埋点 → 写 `analytics_events` | 未知 |

**判断**：这组 `/api/public/*` 是 Console 项目内实现的「公开面」。**Showcase 是否使用它们无法从本仓库代码判定**（Showcase 是另一个仓库/系统）。它们存在的价值是让「候选人投递」这一关键回流动作能在同一代码库内闭环（写 `leads` / `analytics_events`）。**若 Showcase 自己也实现了一套 apply/events，则存在能力重复**，但本仓库无法证实 Showcase 侧实现。

**要点**：不要默认 Showcase 一定调用 Console 的 `/api/public/*`。唯一确定共享的是 **Supabase 表**（`job_publications`、`leads`、`analytics_events`），API 层是否复用需在 Showcase 仓库另行核对。

---

## 8. Lead 回流（最关键闭环点之一）

### 8.1 投递链路

```
候选人在 Showcase 提交投递
  → POST /api/public/apply（或 Showcase 自己的写入）
    → publicApplySchema（Zod）
    → 写 supabase.from('leads').insert(...)
```

### 8.2 逐条确认

| # | 问题 | 结果 |
|---|------|------|
| 1 | Leads 页面真实数据源 | ✅ `GET /api/leads` → `LeadService.listLeads` → `LeadRepository.list`（真实库，非 Mock） |
| 2 | API | ✅ `GET/POST /api/leads`、`GET/PATCH /api/leads/[id]` |
| 3 | Service | ✅ `lead.service.ts` |
| 4 | Repository | ✅ `lead.repository.ts`（直接查询/写入，列名一致） |
| 5 | Supabase | ✅ `leads` 表 |
| 6 | 默认筛选 | ✅ 默认 `status='全部'`（无隐藏过滤），`PAGE_SIZE=20` |
| 7 | 分页 | ✅ 服务端分页（page/limit + 总数） |
| 8 | 新 Lead 是否立即可见 | ✅ 落库即可见（无缓存） |
| 9 | publication_id 是否可追溯 | ✅ `leads.publication_id` NOT NULL 保留 |
| 10 | 能否定位原 Job | 🟡 需两跳：`leads.publication_id → job_publications.job_id → jobs`（Lead 无直接 job_id 列） |
| 11 | contact/resume/source/notes 是否完整 | 🟡 有 phone/email/wechat/source_channel/resume_url/notes 字段；`source_detail` 字段存在但未必被填 |
| 12 | 已下架岗位的 Lead 是否保留 | ✅ 保留（Lead 与 Publication 生命周期无关，下架不改 leads 状态） |

### 8.3 隐性 UJ 断点判定

- **「数据落库但 Console 看不到」**：❌ 不存在。Leads 页默认「全部」+ 真实分页，只要落库即可见。
- **真正的断点不在 Lead 读取，而在上游**：Lead 要产生，必须先有「published 的 Publication」；而 Publication 创建环节是断的（§6）。因此真实场景下**候选人投递这条路在当前代码+空库状态下根本走不到 Lead 这一步**。

---

## 9. Lead → Talent

### 9.1 真实结论：**已实现，且持久层正确**

Lead **能**转 Talent。完整链路：

```
Leads 页「转人才」按钮（或 Lead 详情）
  → POST /api/leads/[id]/convert
    → requireAuth()
    → LeadService.convertLeadToTalent(id)
      1. LeadRepository.findById(id)
      2. 校验 lead.status === 'qualified'（否则 400）
      3. TalentRepository.findByPhoneOrEmail(phone, email)   ← 去重查询
      4. 若已存在 → 仅 update lead.converted_talent_id = 已有 talent.id（isDuplicate: true）
      5. 若不存在 → TalentRepository.create(...) → 再 update lead.converted_talent_id
```

### 9.2 状态与关联

- **Lead 状态如何变化**：`qualified` → `converted`（`lead-state-machine` 中 `convert` 转移），并写 `converted_at`、`converted_talent_id`。
- **Talent 如何创建**：从 Lead 拷贝 full_name/phone/email/wechat/source_channel/resume_url/notes 等到 `talents` 表。
- **两者如何关联**：单向 —— `leads.converted_talent_id → talents.id`。**Talent 表没有 `source_lead_id` 列**，无法从 Talent 反查「来自哪条 Lead」。

### 9.3 去重行为（真实实现）

| 场景 | 行为 |
|------|------|
| 同手机号/同邮箱重复投多个岗位 | `convertLeadToTalent` 调 `findByPhoneOrEmail` 做 `phone` OR `email` 匹配；命中则复用已有 Talent，不新建 |
| 同一人重复投递 | 会生成**多条 Lead**（每条一次投递），但 convert 时归并到**同一个 Talent** |
| 是否产生重复 Talent | 🟡 部分防护：`convert` 路径有去重；**但手动 `POST /api/talents` 创建不做去重**，`talents` 表也无 unique 约束（phone/email 无唯一索引），仍可产生重复 Talent |

---

## 10. Talent → Application

### 10.1 真实结论：**业务对象真实，但创建链路断裂（RPC 缺失）**

- Application 是真实业务对象（表 + Repository + Service + API + 页面齐备）。
- 但 `ApplicationRepository.createWithContext()` 调用 `.rpc('create_application_with_context', payload)`，该 RPC **在正式库不存在**（§15），故 **Application 无法创建**。

### 10.2 完整梳理

| 项 | 值 |
|----|----|
| 页面入口 | Talents 详情 / 岗位详情「创建 Application」；Pipeline 页 |
| API | `POST /api/applications`（body: talent_id, job_id, owner_id?, stage?） |
| Validation | `createApplicationSchema`（Zod） |
| Service | `ApplicationService.createApplication(input, actorId)` |
| Repository | `ApplicationRepository.createWithContext()` → `.rpc('create_application_with_context')` ❌ |
| DB | `applications` 表 + 唯一索引 `app_talent_job_unique(talent_id, job_id)` |
| 初始 stage | `matching`（默认） |
| 唯一约束 | ✅ DB 有 `app_talent_job_unique` 唯一索引 |
| 重复创建处理 | 依赖唯一索引，但**代码先走 RPC，RPC 不存在 → 到不了唯一索引校验** |

### 10.3 关键问题回答

- **同一 Talent 投 A 岗 + B 岗**：能生成**两个独立 Application**（唯一约束只限制「同 talent+同 job」）。
- **同一 Talent + 同一 Job 是否重复**：DB 唯一索引会拦；但当前创建走不存在的 RPC，**在到达唯一索引之前就报错**。

---

## 11. Stage Machine（Application 状态机）

### 11.1 真实状态集合（`application-state-machine.ts`）

| 状态 | 说明 |
|------|------|
| matching | 匹配中（初始） |
| contacting | 联系中 |
| interested | 有意向 |
| recommended | 已推荐 |
| client_review | 客户评审 |
| interview | 面试 |
| offer | Offer |
| hired | 已入职 |
| rejected | 已拒绝（终态） |
| withdrawn | 已撤回（终态） |

### 11.2 谁控制合法转移？

- **代码层**：`application-state-machine.ts` 的 `APPLICATION_TRANSITIONS` + `getValidApplicationTransitions()`（Service 校验用）。
- **数据库层**：正式库**无 CHECK 约束、无触发器、无 stage 合法性 RPC**，`applications.stage` 是普通字符串列，**DB 不保证合法值**。

### 11.3 是否存在两套状态机？—— **存在，且互相矛盾**

- **Service/状态机**：`matching → contacting → interested → recommended → client_review → interview → offer → hired`（+ rejected/withdrawn）。
- **Pipeline 页面 `STAGES` 数组**：`recommended, screening, interview, offer, hired, rejected, withdrawn`。
  - `screening` **不在** ApplicationStage 类型里（永远是空列）。
  - `matching/contacting/interested/client_review` **不在** Pipeline 的列里 → 这些状态的 Application 在 Kanban **不可见**。

### 11.4 推进完整链路（当前真实）

```
用户点击推进（Pipeline 按钮）
  → applicationsApi.transition()  →  POST /api/applications/[id]/transition
    → requireAuth()
    → ApplicationService.transitionStage()
      → ApplicationRepository.transitionWithContext()  →  .rpc('transition_application_stage')  ❌ RPC 不存在
        → （设计上应由 RPC/Trigger 写 applications.stage + stage_events）
```

- **是否真实写 StageEvent**：❌ **否**。应用层零写入 + 正式库无触发器 → `stage_events` 永远为空。
- **实际结果**：`transition` 会在 RPC 调用处抛错，前端 Toast 报错（**不是假成功，是明确失败**）。

---

## 12. Talent Asset（人才资产沉淀）

### 12.1 逐项判定

| 问题 | 结果 | 证据 |
|------|------|------|
| rejected 后是否保留 | ✅ | Talent 是独立表，与 Application 状态无关 |
| hired 后是否保留 | ✅ | 同上 |
| withdrawn 后是否保留 | ✅ | 同上 |
| 能否再次关联其他 Job | ✅（数据层） / ❌（实际） | 可插入不同 (talent_id, job_id) 的 Application；但 Application 创建走不存在的 RPC，实际无法关联 |
| 是否保留历史 Application | ✅（数据层） | `applications` 表按 (talent_id, job_id) 唯一，历史可查 |
| 是否保留 StageEvent | ❌ | `stage_events` 永远为空（无写入源） |
| 是否记录来源 Lead | 🟡 单向 | `leads.converted_talent_id` 指向 Talent；Talent 侧无 `source_lead_id` |
| 是否存在人才重复污染 | 🟡 部分 | convert 路径去重（phone/email），手动创建不去重，DB 无唯一索引 |

### 12.2 结论

**P4「人才管理」当前不是真闭环，只是「Talent 列表页 + 详情页」**。它具备：Talent 的 CRUD 读取、从 Lead 沉淀、展示字段。它**不具备**：Talent × Job 复用推进（Application 创建断裂）、阶段历史（StageEvent 为空）、来源反查（Talent 侧无 lead 关联）、全局去重（无唯一约束）。

---

## 13. API Architecture

### 13.1 标准链路（严格遵循的路径）

```
Page
  → src/lib/api/*.ts（API client，fetch + cookie）
    → src/app/api/**/route.ts（API Route）
      → requireAuth()（本地 Cookie 门禁，见 §14）
      → src/server/validation/schemas.ts（Zod）
        → src/server/services/*.ts（业务规则/状态机）
          → src/server/repositories/*.ts（数据访问）
            → getSupabaseAdminUntyped()（Service Role → 绕过 RLS）
              → Supabase 表 / RPC
```

### 13.2 核心 API Route 清单

| 域 | Route | 方法 |
|----|-------|------|
| Auth | `/api/auth/login` / `/me` / `/logout` | POST / GET / POST |
| Company | `/api/companies`、`/api/companies/[id]` | GET/POST、GET/PATCH/DELETE |
| Job | `/api/jobs`、`/api/jobs/[id]`、`/api/jobs/[id]/{start,pause,resume,close,archive,publication}` | GET/POST、GET/PATCH、POST×6 |
| Publication | `/api/publications`、`/api/publications/[id]`、`/[id]/{publish,offline,republish,archive,feature,unfeature}`、`/batch/{publish,offline,feature,unfeature}` | 多种 |
| Lead | `/api/leads`、`/api/leads/[id]`、`/[id]/{review,contact,qualify,invalidate,convert}` | 多种 |
| Talent | `/api/talents`、`/api/talents/[id]` | GET/POST、GET/PATCH |
| Application | `/api/applications`、`/api/applications/[id]`、`/[id]/transition` | GET/POST、GET/PATCH、POST |
| Analytics | `/api/analytics/*` | GET |
| Public | `/api/public/jobs`、`/api/public/jobs/[slug]`、`/api/public/apply`、`/api/public/events` | GET、GET、POST、POST |
| Import | `/api/import/buchou`（等） | POST |

### 13.3 结构例外（穿透审计重点关注）

| 例外类型 | 具体位置 | 说明 |
|---------|---------|------|
| API 绕 Service | `GET /api/jobs?ids=...` | 直接用 `supabase.from('jobs').select()`，未走 `JobRepository` |
| API 绕 Service | `POST /api/jobs/[id]/publication` | 直接在 route 里用 admin client 查 `sites` |
| Service 绕 Repository | `PublicationService` 内部分方法直接调 admin client | 需逐方法核对 |
| RPC 单独存在 | `application.repository.ts` | `create_application_with_context` / `transition_application_stage`（**DB 无此 RPC**） |
| 页面直接 Supabase | ❌ 无（浏览器无 Supabase client，全走 fetch） | `src/lib/supabase/client.ts` 不存在 |

> 说明：项目**没有浏览器端 Supabase client**，前端一律走 `/api/*`，这是好的。但后端有若干「API 直查 Supabase 绕过 Repository」的例外。

---

## 14. Auth / Security

### 14.1 当前登录机制

**本地 HMAC Cookie 门禁，不是 Supabase Auth**（这是相对历史文档的重大变化）：

```
/login 页面（纯表单）
  → POST /api/auth/login
    → verifySuperAdminPassword(password)
      → 密码哈希比对（scrypt）
    → signAccessToken()  →  HMAC 签名 Cookie `quantum_console_access`
    → 返回 cookie
```

- **单一身份**：硬编码 super admin（`LOCAL_SUPER_ADMIN_PROFILE`），无多用户、无角色分级。
- **`profiles` 是什么**：Supabase 侧的历史表（`id/display_name/role/status`），**当前登录流程完全不读取它**（身份来自本地配置，不来自 DB）。

### 14.2 API 是否真的鉴权？

- **页面隐藏 ≠ API 权限**：middleware 是 deny-by-default，**API 层面有鉴权**。
- `middleware.ts`：白名单 = `/login`、`/api/auth/login`、`/api/auth/logout`、`/api/auth/me`、`/api/public/*`、`/_next`、`/favicon.ico`、静态资源。其余（含 `/api/companies` 等）都要求有效 cookie，否则 307/401。
- `requireAuth()`：每个业务 route 内再校验 cookie 签名，失败抛 AuthError。

### 14.3 anon / authenticated / Service Role 权限

| 主体 | 能读哪些表 | 说明 |
|------|-----------|------|
| anon | RLS 策略限定的 0 张（策略依赖 `auth.uid()`，但当前无 Supabase Auth） | Console 的 `/api/*` 全用 Service Role，**不走 anon** |
| authenticated | 同 anon，实际无 Supabase Auth 用户 | 无浏览器 Supabase client |
| Service Role | **所有表**（RLS 被绕过） | `getSupabaseAdminUntyped()` 用于全部读写 |

### 14.4 关键安全事实

- **Service Role 在哪里使用**：`src/lib/supabase/admin.ts`（仅 server 端）。前端无 Supabase client，**无浏览器暴露 Service Role 风险**。
- **未登录访问 Console API 会怎样**：middleware 307 → /login（页面）/ 401（API 写操作），业务 route 再 `requireAuth()` 兜底。
- **但**：RLS 的 22 条 policy 对 Console 的 API **实际无效**（因为 Service Role 绕过 RLS）。这些 policy 只在「有人用 anon/authenticated key 直接连 Supabase」时才生效，而当前架构没人这么做。

### 14.5 高危项（P0）

| 风险 | 证据 | 影响 |
|------|------|------|
| 本地 access secret 有 dev 默认回退 | `getLocalAccessSecret()` 未设 `LOCAL_ACCESS_SECRET` 时返回硬编码字符串 | 生产若漏配 env，**cookie 可被伪造** |
| 超级管理员密码有 dev 默认哈希 | `getSuperAdminPasswordHash()` 未设 `LOCAL_SUPER_ADMIN_PASSWORD_HASH` 时返回内置 scrypt 哈希（对应公开密码） | 生产若漏配 env，**可用已知密码登录** |

> 代码注释要求生产必须设置这两个 env，但**无运行时强制校验**，静默回退到 dev 默认值。这是「Demo 级 Auth」的真实形态，需在生产部署前强制检查。

---

## 15. Supabase Contract（真实数据契约）

> 本节以 `exec_sql` 对 `product` 环境 `information_schema` / `pg_constraint` / `pg_indexes` / `pg_trigger` / `pg_policies` / `information_schema.routines` 的**只读查询结果**为准，与代码预期逐一对照。

### 15.1 通用特征

- 所有业务表主键类型：**`varchar(36)`**（非 UUID 类型；值由应用生成，无 `gen_random_uuid()` 默认）。
- **主键非真正 `PRIMARY KEY` 约束**：`pg_constraint` 查询为空，主键由**唯一索引**（`xxx_pkey`）实现。
- **外键约束：0 个**（`leads.converted_talent_id` 无 FK；`jobs.company_id` 无 FK；`applications.talent_id/job_id` 无 FK）。
- **唯一约束**：仅 `applications.app_talent_job_unique(talent_id, job_id)`。
- **触发器：0 个**（`update_updated_at_column` 函数存在但未挂载）。
- **RLS**：已启用 + 22 条 policy（依赖 `profiles.role/status` + `auth.uid()`）。

### 15.2 逐表对照

| 表 | 关键字段（真实） | 代码预期 | ⚠️ 代码假定但 DB 无保证 |
|----|------------------|---------|------------------------|
| `companies` | name, display_name, industry, track, description, website, contact, phone, status | 域 Company 已移除 track/website/contact/phone | 无破坏（DB 多列代码不用）；但「移除」基于错误前提 |
| `jobs` | title, city, **jd**, **salary_internal**, hard_requirements, exclusion_rules, internal_notes, track, status | 域 `jd→original_jd`、`salary_internal→internal_salary`、`intake_metadata` | ❌ **P0：代码写 `original_jd`/`internal_salary`/`intake_metadata`，DB 无这些列** |
| `job_publications` | **title**, **company_display_name**, city, salary_display, summary, responsibilities, requirements, **education_requirement**, **experience_requirement**, track, **tags(jsonb)**, slug, status, featured, urgent, direction, seniority, urgent_started_at, urgent_expires_at | 域 `title→public_title`、`company_display_name→public_company_name`、`education_requirement→education`、`experience_requirement→experience`、tags 当 text[] | ❌ **P0：代码写 `public_title`/`public_company_name`/`education`/`experience`，DB 无这些列；且 title/company_display_name 是 NOT NULL 未被写入** |
| `leads` | full_name, phone, email, wechat, **site_id(NN)**, **publication_id(NN)**, source_channel, source_detail, resume_url, status, notes, converted_talent_id | 一致 | Lead→Job 需经 publication_id 两跳；converted_talent_id 无 FK |
| `talents` | full_name, phone, email, wechat, current_company, current_title, city, education_summary, experience_years, resume_url, source_channel, **tags(jsonb)**, notes | 一致 | phone/email 无唯一约束（去重仅靠 convert 逻辑）；tags jsonb vs 代码数组 |
| `applications` | talent_id(NN), job_id(NN), stage(NN), client_feedback, interview_notes, offer_summary, rejection_reason, withdrawal_reason, recommended_at, offer_at, hired_at, next_action_at | 一致 + 唯一索引 | ✅ 唯一性有保证；但 stage 无 CHECK（非法值可入库）；创建走不存在 RPC |
| `stage_events` | application_id(NN), from_stage, to_stage(NN), event_type(NN), note, created_by | 一致 | ❌ 无写入源（只读 repo + 无 trigger）→ 恒为空 |
| `analytics_events` | site_id, publication_id, lead_id, event_type(NN), source_channel, session_id, referrer, metadata(jsonb) | 一致 | 无 FK |
| `profiles` | **display_name(NN)**, role(NN), status(NN) | 代码类型用 `full_name` | ⚠️ 字段名错位（当前登录不读 profiles，暂不触发） |
| `sites` | name(NN), domain, status(NN) | 一致 | 空库（无 site 记录），Publication 创建时 site 解析可能失败 |

### 15.3 RPC 函数真实清单（`information_schema.routines`）

| 存在的 RPC | 说明 |
|-----------|------|
| `_coze_auto_enable_rls` | 平台内部 |
| `simple_close_job` | 存在（但 job.service 实际走直接 UPDATE status，未用） |
| `update_updated_at_column` | 存在（但未挂载任何触发器） |

**代码调用但 DB 不存在的 RPC（P0）**：
- `create_application_with_context`（`application.repository.ts`）
- `transition_application_stage`（`application.repository.ts`）

> 历史迁移文件 `004_rpc_functions.sql` 定义了 `create_application_with_context` / `transition_application_stage` / `close_job` / `archive_job` / `convert_lead_to_talent` 等 RPC，但**真实正式库并未创建这些函数**。代码已接入 `.rpc()`，因此 Application 创建/推进在运行时会报「function not found」。

---

## 16. Transaction / Idempotency（事务与幂等）

> 整体现状：**无显式数据库事务**。所有写操作都是「单条 Supabase 语句」级原子；凡涉及「多表两步写」的流程，均非原子，存在半成功风险。

| 写操作 | 原子性 | 幂等性 | 失败后果 |
|--------|--------|--------|---------|
| 创建 Job | 单条 insert（原子） | 无唯一幂等键（同公司同标题可重复建） | ❌ 因字段错位直接失败 |
| 创建 Publication | 单条 insert（原子） | slug 带随机后缀，无 DB 唯一约束 | ❌ 因字段错位直接失败 |
| Publish | 单条 update status/published_at（原子） | ✅ 幂等（已 published → no-op/skip） | 若 pub 已存在则成功；否则前置创建已失败 |
| Offline | 单条 update status/offline_at（原子） | ✅ 幂等 | 仅改 status，不触碰 Job |
| 设置精选 featured | 单条 update featured（原子） | ✅ 幂等 | 正常 |
| 设置急招 urgent | 单条 update urgent/urgent_started_at/urgent_expires_at（原子） | 🟡 开启时自动补 started_at | 正常（字段存在） |
| Lead → Talent | **两步非原子**：create talent → update lead.converted_talent_id | 🟡 convert 路径有 phone/email 去重；重复 convert 会复用 | ⚠️ 若第 2 步失败，产生孤儿 Talent（无 lead 回指） |
| 创建 Application | 走不存在 RPC | 唯一索引 (talent_id,job_id) 有保护 | ❌ RPC 报错，到不了唯一索引 |
| Stage Transition | 走不存在 RPC | — | ❌ RPC 报错 |

### 16.1 关键半成功风险

- **Lead→Talent**：`TalentRepository.create()` 成功后、`LeadRepository.update()` 前若出错，会留下「无 Lead 来源的 Talent」。当前无补偿/事务。
- **Application 阶段**：设计上想让「applications.stage 更新 + stage_events 写入」原子化（靠 RPC/Trigger），但 RPC 不存在、Trigger 不存在，导致**既写不进 stage，也写不进 stage_event**（全部失败，无半成功）。

---

## 17. Edge Cases（真实异常场景行为）

| 场景 | 当前系统行为 |
|------|-------------|
| Publish 失败 | `publishPublication` 校验（track 合法 + status 可转）→ 400 错误；若 publication 因字段错位无法创建，则更早失败 |
| Supabase 断连 | Service/Repository 抛异常 → `catchApiErrors` → 500 `DATABASE_ERROR` |
| 重复点击发布 | 幂等：第二次 no-op（已 published） |
| 重复投递（候选人） | `leads` 无唯一约束 → 会产生多条 Lead |
| Lead 已存在（convert） | `findByPhoneOrEmail` 命中 → 复用已有 Talent，不重复建 |
| Talent 重复（手动创建） | 不去重 → 可能重复 |
| Application 重复 | 唯一索引保护（但创建走 RPC 失败，先于唯一索引） |
| 非法 Stage Transition | Service 用状态机校验 → 400；但 Pipeline 的 `screening` 等假状态与状态机不符 |
| Offline 后候选人投递 | 投递入口不校验 publication.status（`/api/public/apply` 直接插 leads），**可能为已下架岗位产生 Lead** |
| 删除 Job | `DELETE /api/jobs/[id]`？当前 Job API 未见 delete（仅 close/archive），Job 删除能力未确认 |
| 删除 Company | `company.service.deleteCompany` 有 `COMPANY_HAS_JOBS` 保护（有岗位拒绝删） |
| 急招过期 | UI 按 `urgent_expires_at <= now` 识别「已到期」；无定时任务自动下架 |
| track=null | 合法（允许发布，表示「未归类」） |
| 非法 track | 发布校验阻止（`track ∉ 四大赛道` → 400） |
| 分页后新 Lead 看不到 | 不会（服务端分页按创建时间，刷新可见） |
| API 401 / 403 / 500 | 401=未登录（middleware/requireAuth）；403=profile inactive（历史，当前未用）；500=DATABASE_ERROR/VALIDATION_ERROR 等 |

---

## 18. UI-to-API Trust Check（页面存在 ≠ 功能存在）

### 18.1 Mock 数据状态

- ✅ **Mock 已清零**：`grep` 全仓无 `mock-data` 引用，前端全走真实 API。

### 18.2 逐项排查

| 问题类型 | 具体实例 | 判定 |
|---------|---------|------|
| 按钮存在但 API 未实现 | —（按钮均有对应 route） | 未发现 |
| 页面有数据但来自 Mock | — | 无 Mock |
| 操作 Toast 成功但 DB 未写 | 未发现「假成功」（前端都 catch 后端错误） | 未发现 |
| 页面状态与 DB 状态不一致 | Pipeline 列与状态机不一致（`screening` 空列、早期状态不可见） | ⚠️ 存在 |
| README/AGENTS 说有但代码没有 | 「Application RPC 已接入」——代码接入了，但 DB 无 RPC；「StageEvent 由 DB Trigger 单源」——实际无 Trigger | ❌ 存在 |
| 代码有但当前 UI 无入口 | `storage.service.ts`（简历上传）无对应 API route 与 UI | ⚠️ 存在 |
| API 有但从未被页面使用 | `GET /api/analytics/*`（Analytics 页用了部分）；`/api/public/events` | 🟡 需逐条核对 |

### 18.3 重点「隐性断点」

1. **「创建 Job」**：表单填完 → `POST /api/jobs` → 字段错位 → 500。UI 报错，但**真实业务无法创建岗位**。
2. **「创建 Publication」**：同上，字段错位 → 500。
3. **「推进招聘」**：Pipeline 点击推进 → RPC 不存在 → 报错。
4. **「StageEvent 时间线」**：Application 详情页的时间线永远为空（`stage_events` 无写入源）。
5. **「Pipeline 早阶段候选」**：`matching/contacting/interested/client_review` 状态的 Application 在 Kanban 不显示。

### 18.4 Console 数据表（功能性影响，非视觉 Review）

> 最近统一改造为 `ConsoleTable`（飞书多维表格式：固定识别列 + 横向滚动 + 固定操作列）。此处只核对表格交互是否**误伤真实业务操作**。

| 表页 | Sticky 左列 | 横向滚动 | 分页 | 筛选 | 排序 | Checkbox | 操作列 | 功能性风险 |
|------|-----------|---------|------|------|------|---------|--------|-----------|
| Jobs | 岗位(0) | ✅ | ✅ | ✅ | ✅ | ❌ 无批量 | 操作(右固定) | 低 |
| Publications | checkbox(0)+岗位(80) | ✅ | ✅ | 赛道/状态/精选 | ✅ | ✅ 批量(≤25) | 操作(右固定) | 低 |
| Leads | 候选人(0) | ✅ | ✅ | 关键字/状态/渠道 | ✅ | ❌ 无批量 | 操作(右固定) | 低 |
| Talents | 候选人(0) | ✅ | ✅ | ✅ | ✅ | ❌ 无批量 | 操作(右固定) | 低 |
| Companies | 公司名(0) | ✅ | ✅ | ✅ | ✅ | ❌ 无批量 | 操作(右固定) | 低 |
| Applications | 详情页（非列表） | — | — | — | — | — | — | 无列表页 |

**关键结论（功能性）**：
- ✅ 固定列背景由 CSS 变量驱动（Light/Dark 均 `bg-card`），**不穿透**，不会「盖住」滚动列文字。
- ✅ 固定列宽度 = `min-w-[280px]`（主识别列）+ `fixedWidth={80}`（checkbox），无「字段被 80px 压缩」回归（历史上曾出现，已修）。
- ✅ 长文本 `truncate + title`，`nowrap` 杜绝「赛/道」「急/招」拆行，不影响读字段。
- ⚠️ **分页后 selection 残留**：Publications 批量选择基于前端 `selected` 状态，翻页后是否清空取决于实现（未发现显式清除逻辑），存在「跨页勾选后批量操作作用到预期外行」的潜在风险——**需 Codex 二次确认**。
- ⚠️ **row click 与按钮冲突**：行内「操作」按钮位于固定右列，行点击事件若绑定整行可能误触（未发现整行 onClick，多为按钮独立 onClick），风险低。
- ℹ️ **横向滚动影响按钮**：操作列 `stickyRight` 固定，滚动时始终可见，不遮挡按钮。

---

## 19. Technical Debt（技术债）

### P0（让真实 UJ 断掉）

| 问题 | 证据 | 影响 UJ 节点 | 文件 | 建议 |
|------|------|-------------|------|------|
| Job/Publication 字段映射错位（写入不存在列） | `job.repository.ts` 写 `original_jd`/`internal_salary`/`intake_metadata`；`publication.repository.ts` 写 `public_title`/`public_company_name`/`education`/`experience`；真实库为 `jd`/`salary_internal`、`title`/`company_display_name`/`education_requirement`/`experience_requirement`（`information_schema` 实证） | H1/H2 全断 | `src/server/repositories/job.repository.ts`、`publication.repository.ts` | 将 mapper 改回真实列名；移除 `intake_metadata` 或先 DDL 加列 |
| Application RPC 缺失 | `application.repository.ts` 调 `create_application_with_context`/`transition_application_stage`，正式库 `routines` 无此二函数 | H5 全断 | `src/server/repositories/application.repository.ts` | 二选一：DB 建 RPC，或回退为直查（INSERT/UPDATE applications） |
| 认证 secret/密码 dev 默认回退 | `local-access/config.ts` 未设 env 时用硬编码 secret 与公开密码哈希 | 整个 Console 安全 | `src/server/local-access/config.ts` | 生产缺 env 时启动即 fail，禁止静默回退 |

### P1（不会立即断，但可能脏数据/错误状态）

| 问题 | 证据 | 影响 | 文件 | 建议 |
|------|------|------|------|------|
| StageEvent 恒为空 | 应用层只读 + DB 无 trigger | 招聘推进历史丢失 | `stage-event.repository.ts`、`supabase/migrations/*` | 决定单源：DB Trigger 或应用层写，二选一落地 |
| Pipeline 与状态机两套 | Pipeline `STAGES` 含 `screening`（非法），漏 `matching/contacting/interested/client_review` | 早期候选不可见 | `src/app/(console)/pipeline/page.tsx` | 统一到 `application-state-machine.ts` 的状态集合 |
| Lead→Talent 两步非原子 | convert 先 create talent 再 update lead | 半成功产生孤儿 Talent | `src/server/services/lead.service.ts` | 用 RPC/事务包住两步 |
| 手动创建 Talent 不去重 | 无 phone/email 唯一约束 | 人才重复污染 | `talents` 表 / `talent.repository.ts` | 加唯一索引或复用去重逻辑 |
| tags 类型错位 | DB `jsonb` vs 代码 `text[]` | 写入格式隐患 | `publication.repository.ts`、`talent.repository.ts` | 统一为 jsonb 或明确序列化 |
| offline 后仍可投递 | `/api/public/apply` 不校验 publication.status | 下架岗位收到 Lead | `src/app/api/public/apply/route.ts` | 投递前校验 status=published |
| `simple_close_job` RPC 存在但未用 | job close 走直 UPDATE | 逻辑漂移 | `job.service.ts` | 统一 close 语义 |

### P2（维护性/体验）

| 问题 | 证据 | 建议 |
|------|------|------|
| profiles 字段名错位（`full_name` vs `display_name`） | `types.ts` Profile 类型 | 统一命名 |
| `storage.service.ts` 无 API/UI 入口 | 简历上传未接线 | 要么接线要么删 |
| 迁移文件与真实库漂移 | `004_rpc_functions.sql` 定义了不存在于真实库的 RPC | 加 drift 说明/对齐 |
| 空库状态 | 正式库所有业务表 0 行 | 需要 seed 或确认导入流程 |

---

## 20. UJ Status Matrix（用户旅程状态矩阵）

| 节点 | 状态 | 证据 |
|------|------|------|
| H1 创建/维护岗位 | 🟡 | Company 创建 ✅；**Job 创建 ❌（字段错位）**；Job 状态转换 ✅ |
| H2 发布招聘需求 | ❌ | **Publication 创建 ❌（字段错位）→ 无法发布** |
| P1 Showcase 展示 | 🟡 | public API 读库存在，但**数据源空 + 无 published 岗位** |
| C4 候选人投递 | 🟡 | apply 接口存在（直接插 leads），但**无 published 岗位可投** |
| P3 Lead 数据记录 | ✅ | Lead 落库 + Console 读取真实库 |
| H3 猎头查看 Lead | ✅ | Leads 页默认「全部」+ 分页，落库可见 |
| H4 筛选与沟通 | 🟡 | review/contact/qualify 状态转换 ✅；convert→Talent ✅ |
| H5 推进招聘 | ❌ | **Application 创建/推进走不存在 RPC**；StageEvent 不写 |
| H6 沉淀 Talent | ✅ | Lead→Talent convert 真实落库（去重部分防护） |
| P4 人才管理 | 🟡 | Talent 列表/详情有，但复用推进（Application）断、历史（StageEvent）空 |

### 20.1 主结论

> **NO**

**「今天如果一个真实猎头创建一个岗位，真实候选人投递，然后猎头持续把他推进到 hired，这条链现在能不能完整走完？」——不能。**

- 断点 1：**创建 Job**（字段映射错位，写 `original_jd`/`internal_salary`/`intake_metadata` 失败）。
- 断点 2：**创建 Publication / 发布**（字段映射错位，写 `public_title`/`public_company_name`/`education`/`experience` 失败）。
- 断点 3：**创建 Application + 阶段推进**（`create_application_with_context` / `transition_application_stage` RPC 在正式库不存在）。

### 20.2 最远真实走到的节点

**Lead 记录 → 猎头查看 → Lead 转 Talent**（在「跳过 Job/Publication 创建、假设已有 published 岗位与候选人投递」的前提下，这一小段是通的）。整条端到端 UJ 在 **「创建 Job」这一第一步就断裂**。

---

## 21. Codex Audit Focus（Codex 穿透审计重点）

1. **复核 §15 字段映射错位**：以 `exec_sql` 只读查询 `information_schema.columns`，对照 `job.repository.ts` / `publication.repository.ts` 的 `toJobDbCreate` / `toPublicationDbCreate`，确认「代码写不存在列」是否属实、影响面是否覆盖全部 Job/Publication 写操作。
2. **复核 Application RPC 缺失**：`information_schema.routines` 确认 `create_application_with_context` / `transition_application_stage` 是否真的缺失，并确认 `application.repository.ts` 是否仍走 `.rpc()`。
3. **复核 StageEvent 零写入**：确认无应用层 insert、无 DB trigger，`stage_events` 恒空。
4. **复核 Auth 的 dev 回退**：确认 `LOCAL_ACCESS_SECRET` / `LOCAL_SUPER_ADMIN_PASSWORD_HASH` 缺省时的硬编码回退，评估生产风险。
5. **复核 Pipeline 双状态机**：确认 `screening` 非法列、`matching/contacting/interested/client_review` 不可见。
6. **复核 RLS 是否被 Service Role 全绕过**：确认 Console 全部 Supabase 访问均用 admin client，RLS 22 条 policy 实际失效。
7. **核对「字段契约对齐」两轮历史矛盾**：AGENTS.md 记录存在「original_jd/public_title 映射」与「jd/title 无需修改」两种相反结论，确认哪一轮是错的、最终代码落在哪一边。






