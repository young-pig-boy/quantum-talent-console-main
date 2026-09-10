# Console 系统现状梳理（第三方审计快照）

> 审计日期：2026-08-18
> 审计方式：只读（仅读取 GitHub main 代码 + 只读探测正式 Supabase，未修改任何业务代码 / Supabase / Showcase）
> 正式 Supabase Project Ref：`wbpnvbvdotkjhwxhndhz`
> 审计结论仅供独立 Codex 对照 PRD 使用，**不美化、不把「代码存在」当作「业务已跑通」**。

---

## 1. Executive Summary

Console 是一个「招聘业务主链已经跑通，但多人权限体系仅停留在代码层、尚未真正上线」的系统。

核心结论：

1. **招聘主链（Company→Job→Publication→Lead→Talent→Application→StageEvent）是真实可用的**：正式库有真实数据（companies 5 / jobs 74 / job_publications 73 / leads 8 / talents 2 / applications 4 / stage_events 21），Application Create/Transition、Lead→Talent 转换已接入正式 Supabase RPC，RPC 均确认存在。

2. **多人权限体系（Auth + Permission Engine + Team + Role）是「代码存在、业务未跑通」**：
   - 正式库只有 1 个 profile（`super_admin`）、1 个 auth user、**0 个 team / team_membership / permission_grant / contact_access_request / audit_log / external_consultant**。
   - 没有任何 team_lead / internal_consultant 账号真实存在。
   - Permission Engine 的 8 个 PermissionKey 中，**仅 4 个真正被 API 强制执行**（publication_edit / publication_publish / publication_operate / talent_contact_read），其余 4 个（team_data_read / team_progress_manage / showcase_analytics / external_collaboration_manage）**只定义、未在任何 API 生效**。

3. **授权缺口（高危）**：公司 / 岗位 / 投递 / 人才 / 申请 这 5 类核心招聘对象的所有写接口，**只用 `requireAuth()`（登录即可），完全不经过 Permission Engine**。任何已登录用户（包括仅拥有 `publication_edit` 的 internal_consultant）都可增删改这些对象。

4. **Talent 联系方式保护被绕过（高危）**：`GET /api/talents` 与 `GET /api/talents/[id]` 使用 `select('*')`，仅 `requireAuth()`，**直接返回未脱敏的 phone / email / wechat**；而脱敏只发生在独立的 `contact-access` 接口。

5. **Break-glass Super Admin 登录当前运行时不可用**：登录 Server Action 依赖 `SUPER_ADMIN_PASSWORD_HASH` 环境变量，当前运行时未设置，登录会返回「系统配置错误：缺少密码哈希」。

6. **联系方式审批（approve/reject）被 RPC 阻断**：正式库确认 `decide_talent_contact_access` RPC **不存在**（NOT FOUND），审批 UI 存在但调用必然失败。

7. **Grant / Revoke 未实现到 API**：`grant_permission_with_context` RPC 在正式库**已存在**（与旧 AGENTS.md 记录相反），但 `POST /api/team/permissions` 路由**只有 GET、无 POST/DELETE**，因此授权/撤销在 API 层未实现。

> 说明：本文档多处引用「旧 AGENTS.md 记录」用于纠正历史结论；**本快照以当前代码 + 当前运行时 + 正式 Supabase 实测为准**。

---

## 2. System Architecture

```
Console (Next.js 16 App Router, src/)
  ├── 页面层 (src/app/(console)/...)
  │     ├── Dashboard / Companies / Jobs / Publications / Leads / Talents
  │     ├── Applications / Pipeline / Analytics
  │     ├── Team / External / Showcase / Settings
  ├── API 层 (src/app/api/...)
  │     ├── requireAuth() / requirePermission()  ← 应用层鉴权
  │     └── 各业务 route → Service → Repository
  ├── 服务层 (src/server/services/*)
  ├── 数据访问层 (src/server/repositories/*)  ← 全部走 service_role (admin client)
  ├── 权限引擎 (src/server/auth/permissions.ts + actor.ts)
  └── 领域层 (src/lib/domain/*: types / errors / 状态机)
              ↓
Supabase (wbpnvbvdotkjhwxhndhz)  ← service_role 直连，RLS 被绕过
              ↓
Showcase / Lead / Talent / Application（招聘主链数据）
```

关键点：

- **所有数据访问都走 `getSupabaseAdmin` / `getSupabaseAdminUntyped`（service_role）**，`src/server` 下所有 repository 与 actor/permissions 层一致使用 admin client。service_role 会**绕过 RLS**，因此 **Console 内部操作没有任何数据库级 RLS 兜底，全部依赖应用层（route 内 requireAuth/requirePermission）**。
- 应用层鉴权由 `src/middleware.ts`（网关）+ `src/server/auth/guard.ts`（requireAuth / requirePermission）+ `src/server/auth/permissions.ts`（Permission Engine）组成。

---

## 3. Auth

### 3.1 当前到底有几条认证路径

代码里存在 **3 个登录入口**，但登录页实际只使用其中 2 个 Server Action：

| # | 入口 | 是否被登录页使用 | 机制 | 当前状态 |
|---|------|------------------|------|----------|
| 1 | `src/app/login/actions.ts` 的 `login()` | ✅ 是（Super Admin 表单） | 用户名 + 密码 → scrypt 校验 `SUPER_ADMIN_PASSWORD_HASH` → 查 `console_super_admins` → 签发 HMAC cookie `quantum_console_access` | ⚠️ **运行时 `SUPER_ADMIN_PASSWORD_HASH` 未设置 → 登录返回配置错误** |
| 2 | `src/app/login/supabase-actions.ts` 的 `supabaseLogin()` | ✅ 是（团队登录表单） | `createServerSupabase().auth.signInWithPassword(email, password)` → 查 profile role/status → SSR cookie | 🟡 代码存在；正式库仅 1 个 auth user（super admin），无 team_lead/IC 账号可登录 |
| 3 | `src/app/api/auth/login/route.ts` | ❌ 否（**死代码，无调用方**） | 旧 HMAC 登录，使用 `LOCAL_SUPER_ADMIN_USERNAME` + `LOCAL_SUPER_ADMIN_PASSWORD_HASH`（**与入口 1 的 hash 格式不同**） | 🟡 遗留 API，未被 UI 使用 |

> 关键不一致：入口 1 与入口 3 使用**两套不同的密码哈希格式与环境变量**（入口 1 是 `$scrypt$...` + `SUPER_ADMIN_PASSWORD_HASH`；入口 3 是 `scrypt:...` + `LOCAL_SUPER_ADMIN_PASSWORD_HASH`）。入口 3 已被登录页弃用，属于死代码。

### 3.2 Break-glass Super Admin 如何工作

- 用户名默认硬编码为 `chaojiguanliyuan-jiachi-liangzikeji`（`login/actions.ts`）。
- 密码哈希来自环境变量 `SUPER_ADMIN_PASSWORD_HASH`（当前运行时**未设置**）。
- 校验通过后，从 `console_super_admins` 表（正式库 1 行，字段：`id, username, auth_user_id, status, created_at, updated_at`，**无 password_hash 列**）取得 profile 映射，签发 `quantum_console_access` HMAC cookie。
- `guard.ts` 的 `resolveActorId()` 优先读取该 cookie 并做 HMAC 校验，命中则视为 Super Admin（`is_break_glass = true`）。

### 3.3 Supabase Auth 普通内部账号如何工作

- 通过 `supabaseLogin()` 调 `signInWithPassword` 建立 Supabase SSR session。
- `guard.ts` 的 `readSupabaseAuthSession()` 用 `@supabase/ssr` 的 `createServerClient` 读 session，再 `auth.getUser()` 得到 auth user id，进而查 `profiles`（校验 `role` 与 `status = 'active'`）。

> ⚠️ 隐患：`guard.ts` 与 `middleware.ts` 都直接读 `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`（**该变量运行时未设置**），而非走 `getSupabaseConfig()`（其优先读 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`）。是否真正生效依赖 `next.config.ts` 的构建期 `env` 映射把 anon key 解析为 publishable key。此点标为 **UNVERIFIED（需在真实浏览器做一次 Supabase Auth 登录验证）**。

### 3.4 middleware 实际拦截什么

`src/middleware.ts` 规则（实测读代码）：

- **放行（不校验）**：`/login`、`/_next/*`、静态资源、`/api/public/*`、`/api/auth/*`（**但排除 `/api/auth/me`**）。
- **写 API 门禁**：对 `/api/*` 的 `POST/PUT/PATCH/DELETE`（且非 `/api/public`、非 `/api/auth`），未认证（既无 local cookie 也无 Supabase session）→ **401**。
- **页面门禁**：非公开页面未认证 → **307 → /login**。
- **读 API**：未认证 → **放行**（宽松，deny-by-default 只覆盖写方法与页面，不覆盖读）。

### 3.5 ActorContext 如何生成

- `guard.ts` 的 `resolveActorId()`：local cookie → HMAC 校验 → actor id；否则 Supabase Auth session → profile（active 校验）。
- `guard.ts` 的 `resolveActorContext()` = `resolveActorId()` + `actor.ts:buildActorContext()`。
- `buildActorContext()` 组装：`profiles` + `team_memberships`（嵌套 `teams`）+ `resolveEffectivePermissions()`（**直接读 `permission_grants` 表**）。

---

## 4. Actor / Permission Engine

### 4.1 PermissionKey（以当前代码为准，8 个）

`src/server/auth/permissions.ts` 定义：

```
team_data_read
team_progress_manage
publication_edit
publication_publish
publication_operate
showcase_analytics
talent_contact_read
external_collaboration_manage
```

> 纠正旧记录：旧 AGENTS.md 曾写 `team_data_write` / `talent_contact_view`，**当前代码实际为 `team_progress_manage` / `talent_contact_read`**。

### 4.2 Role Default（当前代码）

| 角色 | 默认权限 |
|------|----------|
| `super_admin` | 全部 8 个 |
| `team_lead` | 7 个（除 `external_collaboration_manage`） |
| `internal_consultant` | 仅 `publication_edit` |

### 4.3 权限判断在哪几层参与

- **角色默认**：`checkPermission()` 先查 `ROLE_DEFAULTS`，命中直接返回 true（不查 RPC）。
- **显式授权**：角色默认未覆盖时，调 `has_active_permission` RPC（正式库**已存在**）。
- **资源归属（Resource Ownership）**：`canManageJob` / `canWritePublication` / `canViewTalentContact` / `canManageApplication` / `canReadApplication` / `isManagerOf` / `sharesActiveTeam`，各自调对应 RPC（`can_manage_job` 等，正式库**均存在**）。
- **委派限制**：`canDelegate()` 规定 `super_admin` / `team_lead` 可委派，`internal_consultant` **不可委派**。

### 4.4 是否仍有 API 绕过 Permission Engine（**是，大面积绕过**）

`requirePermission()` 全仓仅出现在 **13 处**（见 §7 表格 + talent contact）：

- Publication 写接口 11 处：`publication_edit` / `publication_publish` / `publication_operate`。
- Talent contact 2 处：`talent_contact_read`（`team/contact-requests` GET、`talents/[id]/contact-access` PATCH）。

**其余全部模块只用 `requireAuth()`（登录即可），完全绕过 Permission Engine**，实测 grep 确认：

- `companies` / `companies/[id]`（list/create/update/delete）→ `requireAuth` only
- `jobs` / `jobs/[id]` / `jobs/[id]/close|pause|resume|start|archive|publication` / `jobs/publish-drafts` → `requireAuth` only
- `leads` / `leads/[id]` / `leads/[id]/review|qualify|invalidate|contact|convert` → `requireAuth` only
- `talents` / `talents/[id]` → `requireAuth` only
- `applications` / `applications/[id]` / `applications/[id]/transition` → `requireAuth` / `resolveCurrentActor` only
- `external/consultants` → `requireAuth` only
- `showcase/analytics` → `requireAuth` only
- `team/members` / `team/teams` / `team/permissions` / `team/audit-logs` → `requireAuth` only

**结论：8 个 PermissionKey 中仅 4 个真正被 API 强制执行**（`publication_edit` / `publication_publish` / `publication_operate` / `talent_contact_read`）；`team_data_read`、`team_progress_manage`、`showcase_analytics`、`external_collaboration_manage` **定义后未在任何 API 生效**。

### 4.5 哪些 Server Action / API 使用 service_role

- `src/lib/supabase/admin.ts`（`getSupabaseAdmin` / `getSupabaseAdminUntyped`）读取 `SUPABASE_SECRET_KEY`（正式库 service role key，运行时已设置）。
- `src/server/repositories/*` 全部使用 admin client。
- `actor.ts:buildActorContext()` 使用 `getSupabaseAdminUntyped()`。
- talent contact-access route 直接使用 admin client 调 RPC。
- 登录动作 `login/actions.ts`、`supabase-actions.ts` 使用 server client（非 service_role，用于 Auth）。

### 4.6 service_role 场景下权限由哪里保证

由于 service_role 绕过 RLS，**权限只能由应用层保证**（route 内的 `requireAuth` / `requirePermission` + Service 层资源校验 `canManageJob`）。鉴于 §4.4 的结论（核心招聘对象仅 `requireAuth`），**这部分对象实际没有任何角色/权限级授权约束**。

---

## 5. IA（当前 Sidebar 实际结构）

来源：`src/app/(console)/layout.tsx` 的 `NAV_GROUPS`（**静态数组，无任何 role/permission 过滤**，即**非角色感知**）。

```
业务资源
  ├ 公司与岗位      /companies
  └ 内部岗位        /jobs

展示运营
  ├ 公开岗位        /publications
  ├ 新投递          /leads
  └ 展示数据        /showcase/analytics

人才交付
  ├ 人才库          /talents
  └ 招聘推进        /pipeline

外部协作
  └ 外部顾问        /external

团队与权限
  ├ 团队成员        /team?tab=members
  ├ 权限授权        /team?tab=permissions
  └ 操作日志        /team?tab=audit

数据分析
  └ 数据看板        /analytics
```

Dashboard（工作台）位于 `/`，通过顶栏 Logo/首页进入，**不在 `NAV_GROUPS` 中**。

> 纠正旧记录：旧 AGENTS.md 写「Sidebar 最终 IA」为 7 组且含「工作台」组 + 「联系方式审批」子项。**实际为 6 组，无「工作台」组，且「联系方式审批」不在 Sidebar**。

### 5.1 页面真实存在但与 Sidebar 不一致 / 未挂载

| 路由 | 页面 | 状态 |
|------|------|------|
| `/team?tab=contact_requests` | 联系方式审批 Tab | 🟡 Tab 按钮存在（可点进），但**不在 Sidebar 导航**，且 `validTabs` 不含 `contact_requests`（URL 参数会被清洗为 members） |
| `/settings` | 系统设置（profile/notifications/security/about） | 🔴 **静态 mock 页，未挂载到 Sidebar**，按钮只弹「已保存」不落库 |
| `/showcase/seo` | SEO 管理 | 🔴 占位页「SEO 管理功能开发中」，未挂载 |
| `/showcase/utm` | UTM 管理 | 🔴 占位页「UTM 管理功能开发中」，未挂载 |

其余详情/表单页（`companies/[id]`、`jobs/[id]`、`jobs/new`、`publications/[id]`、`publications/[id]/preview`、`leads/[id]`、`talents/[id]`、`applications/[id]`）均为从列表/看板跳转的子页面，不属于 Sidebar 一级/二级导航。

---

## 6. Team / Role

### 6.1 Profile Role 当前到底是什么

`src/lib/domain/types.ts`：

```
InternalRole = 'super_admin' | 'team_lead' | 'internal_consultant'
Profile.role: InternalRole
Profile.manager_id: string | null
Profile.full_name: string
```

正式库 `profiles` 实际列：`id, full_name, role, status, manager_id, created_at, updated_at`（**无 `display_name`，无 `email`**）。

### 6.2 是否仍存在 admin / consultant / operator 参与真实业务逻辑

- 旧迁移 `supabase/migrations/001_create_tables.sql` 仍残留 `role CHECK IN ('admin','consultant','operator')`，但**该迁移文件标注「已 drift，禁止直接执行」**，不代表正式库。
- **真实业务代码**仍有一处 `admin` 残留：`src/app/api/auth/login/route.ts` 用 `.in('role', ['super_admin', 'admin'])` 查 profile —— 但该 route 是**死代码**（登录页未调用）。
- 其余业务代码一律使用 `super_admin` / `team_lead` / `internal_consultant`。未发现 `consultant` / `operator` 参与真实业务逻辑。

### 6.3 profiles / teams / team_memberships / manager_id 在 Console 中如何被使用

| 对象 | 正式库现状 | Console 使用方式 |
|------|-----------|------------------|
| `profiles` | 1 行（super_admin） | 登录后 `resolveActorId` 查 role/status；`buildActorContext` 读入 ActorContext |
| `teams` | **0 行** | 仅 `buildActorContext` 通过 `team_memberships` 嵌套查询 teams（无任何创建/管理 UI/API 写入） |
| `team_memberships` | **0 行** | 仅 `buildActorContext` 读取 |
| `manager_id` | 字段存在 | `permissions.ts` 提供 `isManagerOf`（调 `is_managed_by` RPC），但**无任何 API 调用 `isManagerOf`**（死代码） |

> 关键结论：**Schema exists ≠ Console 已支持完整 workflow**。teams / team_memberships / manager_id 相关能力只有「读取侧代码」，没有创建/管理/委派的闭环 API（team 路由均为 GET-only）。

### 6.4 Grant / Revoke 当前到底通过什么

| 层 | 现状 |
|----|------|
| RPC | `grant_permission_with_context` / `revoke_permission_with_context` 在正式库**均存在**（实测） |
| 函数 | `permissions.ts` 的 `grantPermission()` / `revokePermission()` 存在，但**全仓无调用方**（死代码） |
| API | `src/app/api/team/permissions/route.ts` **只有 GET，无 POST / DELETE** |
| 表 | `permission_grants` 正式库存在但 **0 行** |

**结论：Grant / Revoke 在 API 层未实现**（尽管底层 RPC 已存在）。授权/撤销无法通过 Console 完成。

---

## 7. Publication 写接口权限（逐个审计）

所有 11 个写接口均使用 `requirePermission(permission)` + `canManageJob()`（非 super_admin 时做资源级检查），**fail-closed**。

### 7.1 单条接口

| API | Auth | Permission Key | Resource Check | Fail Closed | 实现文件 |
|-----|------|----------------|----------------|-------------|----------|
| PATCH `/api/publications/[id]` | requirePermission | `publication_edit` | `canManageJob` | ✅ ForbiddenError→403 | `[id]/route.ts` |
| POST `[id]/publish` | requirePermission | `publication_publish` | `canManageJob` | ✅ ForbiddenError→403 | `[id]/publish/route.ts` |
| POST `[id]/offline` | requirePermission | `publication_publish` | `canManageJob` | ✅ | `[id]/offline/route.ts` |
| POST `[id]/republish` | requirePermission | `publication_publish` | `canManageJob` | ✅ | `[id]/republish/route.ts` |
| POST `[id]/archive` | requirePermission | `publication_publish` | `canManageJob` | ✅ | `[id]/archive/route.ts` |
| POST `[id]/feature` | requirePermission | `publication_operate` | `canManageJob` | ✅ | `[id]/feature/route.ts` |
| POST `[id]/unfeature` | requirePermission | `publication_operate` | `canManageJob` | ✅ | `[id]/unfeature/route.ts` |

### 7.2 批量接口

| API | Auth | Permission Key | Resource Check | Fail Closed | 实现文件 |
|-----|------|----------------|----------------|-------------|----------|
| POST `batch/publish` | requirePermission | `publication_publish` | 逐条 `canManageJob` | ✅ catch→deniedItems | `batch/publish/route.ts` |
| POST `batch/offline` | requirePermission | `publication_publish` | 逐条 `canManageJob` | ✅ | `batch/offline/route.ts` |
| POST `batch/feature` | requirePermission | `publication_operate` | 逐条 `canManageJob` | ✅ | `batch/feature/route.ts` |
| POST `batch/unfeature` | requirePermission | `publication_operate` | 逐条 `canManageJob` | ✅ | `batch/unfeature/route.ts` |

### 7.3 关键确认

1. **`authenticated but unauthorized` 是否真实返回 403**：
   - 单条接口：`requirePermission` 无权限 → `ForbiddenError` → `catchApiErrors` → **403**；资源级 `canManageJob` 失败 → `ForbiddenError` → **403**。✅
   - 批量接口：`requirePermission` 无权限 → **403**；但**逐条资源级 `canManageJob` 失败 → HTTP 200 + `status:'failed'` 的条目**（不是 403）。这是「批量部分成功」的设计语义，非越权。

2. **Batch 是否已完全解决 `authorization error → DENY`**：
   - ✅ 已确认。全仓搜索 `catch.*allowedIds.push` 为 0 匹配；4 个 batch route 的 `catch` 分支一律写入 `deniedItems`（fail-closed），不存在 `error → allowedIds.push(id)`。

3. **已发现的小瑕疵（非安全）**：当 `allowedIds` 为空且全部被拒时，批量结果里 `failed` 计数会被重复累加（`result.failed = deniedItems.length` 后又 `result.failed += deniedItems.length`），导致全拒场景 `failed` 显示为 2 倍。仅影响返回统计，不影响安全。

---

## 8. Talent 联系方式保护

### 8.1 实际链路状态

| 步骤 | 状态 | 说明 |
|------|------|------|
| Talent Detail（列表/详情） | 🟡 **未脱敏** | `GET /api/talents`、`GET /api/talents/[id]` 用 `select('*')`，仅 `requireAuth`，**返回未脱敏 phone/email/wechat**（正式库 talents 表确含这些列） |
| Masked Contact | 🟡 仅存在于独立接口 | `GET /api/talents/[id]/contact-access` 调 `get_talent_contact_with_context` RPC，拒绝时在**应用层** mask |
| Request Access | ✅ IMPLEMENTED | `POST .../contact-access` 调 `request_talent_contact_access` RPC（正式库**存在**） |
| Pending Request | 🟡 读侧存在 | `GET /api/team/contact-requests` 读 `contact_access_requests` 表（0 行）；team 页 `contact_requests` Tab 可点进查看 |
| Approve / Reject | ⚠️ **BLOCKED** | `PATCH .../contact-access` 调 `decide_talent_contact_access` RPC，**正式库 NOT FOUND**，审批必然失败；审批 UI 存在但不可用 |
| Full Contact | 🟡 依赖 RPC 授权 | `get_talent_contact_with_context` RPC 授权通过时返回完整联系方式 |
| Audit | 🔴 **未实现** | `audit_logs` 表 0 行，`team/audit-logs` 路由 GET-only，**无任何应用层写入 `talent_contact.request/approve/view`** |

### 8.2 关键 RPC 真实性

| RPC | 正式库状态（实测） |
|-----|--------------------|
| `request_talent_contact_access` | ✅ 存在（INVALID_ACTOR 探针错误，函数存在） |
| `decide_talent_contact_access` | ❌ **NOT FOUND**（用代码实际参数 `{p_talent_id,p_actor_id,p_decision}` 探测） |
| `get_talent_contact_with_context` | ✅ 存在（CONTACT_ACCESS_DENIED 探针错误，函数存在） |

> 关键安全结论：**「Talent 联系方式脱敏」只在一个独立接口实现，主列表/详情接口 `select('*')` 直接泄露完整联系方式**，因此 `talent_contact_read` 权限在数据层被绕过。

---

## 9. External Collaboration

| 对象 | 正式库 | Console 现状 |
|------|--------|--------------|
| `external_consultants` | 表存在，0 行 | 内部管理页 `external/page.tsx` 只读列表（`GET /api/external/consultants`）；「邀请顾问」按钮**无 onClick（死按钮）**；无创建/编辑/删除 API |
| `external_job_access` | 表存在，0 行 | **无任何 API / 页面** |
| `external_referrals` | 表存在，0 行 | **无任何 API / 页面** |

**External Consultant 独立 Portal：NOT IMPLEMENTED**（不存在任何外部门户路由）。Console 内 `external/page.tsx` 只是内部只读管理列表，**与「外部门户」是两个不同概念，不可混为一谈**。

---

## 10. Recruitment Pipeline（招聘主链）

逐跳核验：

| 跳 | 入口 | API / RPC | 状态 | 是否真实写库 |
|----|------|-----------|------|--------------|
| Company | `companies` 页/API | `POST/GET/PATCH/DELETE /api/companies*` | requireAuth | ✅ 正式库 5 行 |
| Job | `jobs` 页/API | `POST/GET/PATCH /api/jobs*` + `start/close/pause/resume/archive` | requireAuth | ✅ 74 行 |
| Publication | `publications` 页/API | `POST /api/publications` + publish/offline/feature | requirePermission | ✅ 73 行 |
| Lead | `leads` 页/API | `POST/GET/PATCH /api/leads*` + `qualify/review/convert` | requireAuth | ✅ 8 行 |
| Talent | `talents` 页/API | `POST/GET/PATCH /api/talents*` | requireAuth | ✅ 2 行 |
| Application | `talents`→「加入岗位推进」 | `POST /api/applications` → RPC `create_application_with_context` | resolveCurrentActor | ✅ 4 行 |
| StageEvent | Application 状态变化 | RPC `transition_application_stage` → DB Trigger 单源生成 | resolveCurrentActor | ✅ 21 行 |

关键确认：

- **Lead→Talent**：`leads/[id]/convert` 调 RPC `convert_lead_to_talent`（正式库**存在**，LEAD_NOT_FOUND 探针证实）。
- **Application 10-state 状态机仍保持**：`src/lib/domain/application-state-machine.ts` 定义 10 状态（matching/contacting/interested/recommended/client_review/interview/offer/hired/rejected/withdrawn）。
- **StageEvent 单源**：应用层零 `stage_events` INSERT，由 DB Trigger 生成（`StageEventRepository` 已收口为只读）。

---

## 11. UAT Status

> 原则：**只有「实际执行过」才标 PASS**；「代码看起来正确」不算 PASS。本轮未重新执行破坏性测试，仅依据既有真实证据 + 正式库实测。

| Case | 状态 | 依据 |
|------|------|------|
| 1 Super Admin | ⚠️ BLOCKED | 当前运行时 `SUPER_ADMIN_PASSWORD_HASH` 未设置，break-glass 登录返回「缺少密码哈希」；正式库仅有 1 个 super_admin profile |
| 2 Team Lead | ⚠️ BLOCKED | 正式库无 team_lead profile / auth user（仅 1 个 auth user） |
| 3 IC-A | ⚠️ BLOCKED | 无 internal_consultant 账号 |
| 4 IC-B | ⚠️ BLOCKED | 无 internal_consultant 账号 |
| 5 Grant | ⚪ NOT RUN | 授权 API 未实现（`team/permissions` GET-only），`permission_grants` 0 行 |
| 6 No Delegation | ⚪ NOT RUN | `canDelegate()` 代码存在（IC 不可委派），但无执行证据 |
| 7 Cross Owner | ⚪ NOT RUN | `can_manage_job` RPC 存在，但无跨 owner 执行证据 |
| 8 Talent Contact | ⚠️ BLOCKED | `decide_talent_contact_access` RPC NOT FOUND，审批不可用 |
| 9 Team Scope | ⚪ NOT RUN | `teams`/`team_memberships` 0 行，无团队范围执行证据 |

---

## 12. Blockers

| # | Blocker | 状态（本轮实测） |
|---|---------|------------------|
| 1 | `handle_new_user` trigger 是否损坏 | ⚪ **UNVERIFIED — NEED FORMAL SUPABASE CHECK**。`profiles` 确无 `display_name`/`email` 列（只有 `full_name`），与「trigger 引用已删除列」假设一致，但本轮无 raw SQL 权限读 trigger 函数体，无法定论 |
| 2 | `grant_permission_with_context` 是否不存在 | ✅ **已证伪——RPC 存在**（与旧 AGENTS.md「不存在」记录相反；正式库探针返回资源非空约束错误，说明函数体已执行） |
| 3 | `decide_talent_contact_access` 是否不存在 | ✅ **已证实——RPC NOT FOUND**（用代码实际参数探测） |
| 4 | Break-glass 登录不可用 | ✅ 已证实：`SUPER_ADMIN_PASSWORD_HASH` 运行时未设置（新增发现，非旧记录） |

---

## 13. Technical Debt

1. **核心招聘对象绕过 Permission Engine**：companies/jobs/leads/talents/applications 全部仅 `requireAuth`，任何登录用户可增删改（高危授权缺口）。
2. **Talent 联系方式主接口泄露**：`/api/talents`、`/api/talents/[id]` 用 `select('*')` 返回未脱敏 contact，绕过 `talent_contact_read`。
3. **4 个 PermissionKey 定义后未生效**：`team_data_read` / `team_progress_manage` / `showcase_analytics` / `external_collaboration_manage`（见 §4.4）。
4. **Grant/Revoke/Team/Member 写入未实现**：`team/permissions`、`team/members`、`team/teams`、`team/audit-logs` 均为 GET-only；`grantPermission`/`revokePermission` 函数是死代码。
5. **死代码 / 孤儿页面**：`api/auth/login/route.ts`（旧登录，无调用方）、`settings/page.tsx`（静态 mock）、`showcase/seo`、`showcase/utm`（占位页）、`permissions.ts` 的 `canWritePublication`/`isManagerOf`/`sharesActiveTeam`/`canManageApplication`/`canReadApplication`/`canViewTalentContact`（仅定义，未在任何 route 调用）。
6. **Sidebar 非角色感知**：`NAV_GROUPS` 为静态数组，所有角色看到相同导航。
7. **guard/middleware 读错 env key 隐患**：`guard.ts` 与 `middleware.ts` 直接读 `NEXT_PUBLIC_SUPABASE_ANON_KEY`（运行时未设置），依赖 next.config 构建期映射才可能生效，Supabase Auth 登录链路未在真实浏览器验证。
8. **批量接口全拒场景 `failed` 计数翻倍**（§7.3，非安全，仅统计）。
9. **`api/auth/me` 与 `requirePermission` 双路径不一致**：`/api/auth/me` 用 `resolveEffectivePermissions()` 直接读 `permission_grants` 表；`requirePermission` 用 `checkPermission()` → `has_active_permission` RPC。前端展示权限与后端强制权限可能不一致。
10. **`talent_contact_read` 权限未覆盖 talent 列表/详情**（与 #2 同源）。

---

## 附：正式 Supabase 实测快照（只读，service_role）

- 表行数：profiles=1（super_admin）、console_super_admins=1、companies=5、jobs=74、job_publications=73、leads=8、talents=2、applications=4、stage_events=21、sites=1；teams/team_memberships/permission_grants/audit_logs/contact_access_requests/external_consultants/external_job_access/external_referrals = **0**；page_views/click_events 存在。
- auth.users = 1。
- RPC：`has_active_permission`、`can_manage_job`、`can_write_publication`、`can_view_talent_contact`、`can_manage_application`、`can_read_application`、`is_managed_by`、`shares_active_team`、`grant_permission_with_context`、`revoke_permission_with_context`、`get_talent_contact_with_context`、`request_talent_contact_access`、`convert_lead_to_talent`、`transition_application_stage`、`create_application_with_context` 均**存在**；`decide_talent_contact_access` **NOT FOUND**。
- `profiles` 列：`id, full_name, role, status, manager_id, created_at, updated_at`（无 display_name / email）。
- `console_super_admins` 列：`id, username, auth_user_id, status, created_at, updated_at`（无 password_hash）。
