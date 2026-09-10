# Console 离职交接文档（HANDOVER.md）

> 冻结日期：2026-08-21
> 冻结 Commit：`handover-2026-08-21`（Git Tag）
> 正式 Supabase Project Ref：`wbpnvbvdotkjhwxhndhz`
> 仓库：`leishi335-cell/leishi335-cell-quantum-talent-console`

---

## 1. Console 定位

Console 是**量子人才项目的内部招聘与运营后台**，面向猎头顾问和招聘运营人员。

核心业务链路：

```
[招聘侧]
Company → Job → Publication → Showcase（候选人可见的公开岗位页）

[候选人侧]
Lead（投递线索）→ Talent（人才库沉淀）

[推荐侧]
Talent + Job → Application → Pipeline（看板）→ StageEvent（阶段事件时间线）
```

Console 不包含候选人官网（Showcase）的代码，但通过 Public API 为 Showcase 提供数据。

---

## 2. 与整个量子项目的关系

```
Console（本仓库）
    ↕  Supabase JS Client (Service Role / Anon Key)
Formal Supabase（wbpnvbvdotkjhwxhndhz）
    ↕  RLS Policy (public_read_*)
Showcase（候选人官网，独立仓库）
```

**正式 Supabase Project Ref**：`wbpnvbvdotkjhwxhndhz`

> **禁止回连历史错误开发库**：`br-rapid-bram-8365a7da`
> 该库已废弃，代码中无任何连接配置残留，仅在注释中作为警示存在。

---

## 3. 当前核心数据实体

以下实体均在代码中有对应的 Domain Type、Repository、Service、API Route：

| 实体 | 表名 | 说明 | 代码实现状态 |
|------|------|------|:---:|
| Company | `companies` | 客户公司 | CRUD + 删除保护 |
| Job | `jobs` | 内部岗位 | CRUD + 状态机 + job_code |
| JobPublication | `job_publications` | 公开岗位 | CRUD + 发布/下架/归档 + 赛道/精选/急招 |
| Lead | `leads` | 投递线索 | CRUD + 状态机 + 转人才 |
| Talent | `talents` | 人才库 | CRUD + PII 脱敏 + 联系方式授权 |
| Application | `applications` | 招聘申请 | CRUD + 状态机 + RPC 接入 |
| StageEvent | `stage_events` | 阶段事件 | 只读（DB Trigger 单源写入） |
| Profile | `profiles` | 内部用户 | 认证 + 角色 + 状态 |
| Team | `teams` | 团队 | CRUD |
| TeamMembership | `team_memberships` | 团队成员关系 | 读取 |
| PermissionGrant | `permission_grants` | 权限授予 | CRUD |
| ContactAccessRequest | — | 联系方式访问审批 | GET/PATCH |
| ExternalConsultant | `external_consultants` | 外部顾问 | GET/POST |
| AuditLog | — | 操作日志 | GET（查询） |
| AnalyticsEvent | `analytics_events` | 埋点事件 | 公开写入 |

> **注意**：`ContactAccessRequest` 和 `AuditLog` 在代码中有 API 和类型定义，但对应的数据库表结构需以正式库实际为准。

---

## 4. 当前权限模型

### 核心原则

```
职级决定最高能力
+ 管理层级决定能管谁
+ 资源 / Capability Grant 决定具体能做什么
```

**不使用 Workspace 作为权限层级。**

### 角色

| 角色 | 说明 | 认证方式 |
|------|------|----------|
| `super_admin` | 超级管理员（Break-glass） | 本地 Cookie（独立于 Supabase Auth） |
| `team_lead` | 团队负责人 | Supabase Auth 邮箱密码 |
| `internal_consultant` | 内部顾问 | Supabase Auth 邮箱密码 |

> `External Consultant` 属于独立外部协作体系（`external_consultants` 表），不等同内部职级。

### 权限定义（8 个）

| Permission Key | 说明 |
|----------------|------|
| `team_data_read` | 查看团队数据 |
| `team_progress_manage` | 管理团队进度 |
| `publication_edit` | 编辑公开岗位 |
| `publication_publish` | 发布/下架公开岗位 |
| `publication_operate` | 运营操作（精选/急招/赛道） |
| `showcase_analytics` | 查看展示数据 |
| `talent_contact_read` | 查看人才联系方式 |
| `external_collaboration_manage` | 管理外部协作 |

### Server Authorization 中间层

| 函数 | 说明 |
|------|------|
| `requireAuth()` | 认证门禁（双路径） |
| `requireRole(roles[])` | 角色检查 |
| `requirePermission(key)` | 权限检查 |
| `requireCanManageJob(jobId)` | 资源级岗位权限 |
| `requireCanManageApplication(id)` | 资源级申请权限 |
| `requireCanReadApplication(id)` | 资源级申请读取 |
| `requireCanManageLead(leadId)` | 资源级线索权限 |
| `requireCanManageTalent(talentId)` | 资源级人才权限 |

---

## 5. 当前登录架构

### 双入口认证体系

Console 实现两套独立的认证路径，最终统一进入 `ActorContext`：

#### 路径 A：Super Admin Break-glass（本地认证）

```
Login Form (username + password)
  → POST /api/auth/super-admin/login
    → 校验 username（env: SUPER_ADMIN_USERNAME）
    → scrypt 校验 password（env: SUPER_ADMIN_PASSWORD_HASH）
    → HMAC 签名 access token（env: LOCAL_ACCESS_SECRET）
    → Set-Cookie: quantum_console_access (HttpOnly)
    → synthetic super_admin ActorContext
```

**关键特征**：
- 完全不依赖 Supabase Auth（无 `auth.users` 查询、无 Session Cookie）
- Actor ID 来自环境变量 `CONSOLE_ACTOR_ID`（或 fallback）
- Profile 为合成的 `LOCAL_SUPER_ADMIN_PROFILE`（不查 profiles 表）
- 拥有全部权限（Break-glass = 最高权限）

> **"Super Admin 登录不依赖 Supabase"** 指的是认证路径不依赖 Supabase Auth。
> **但登录后业务数据访问仍然依赖 Supabase**（所有 API 通过 Service Role Key 读写数据库）。

#### 路径 B：Team Lead / Internal Consultant（Supabase Auth）

```
Login Form (email + password)
  → Server Action (supabaseLogin)
    → createServerClient + signInWithPassword
    → Supabase Session Cookie (sb-*-auth-token)
    → profiles 表查询（role + status 检查）
    → ActorContext（profile + teams + permissions）
```

**关键特征**：
- 依赖 Supabase Auth（`@supabase/ssr` cookie adapter）
- Profile 从 `profiles` 表读取
- 权限由 Role Defaults + `permission_grants` 表合并

#### 统一收口

```
middleware.ts
  → 检查 quantum_console_access cookie（Break-glass 优先）
  → 检查 Supabase Auth session
  → 未认证：页面 → 307 /login；写 API → 401

guard.ts (requireAuth / resolveActorContext)
  → 同一优先级：Break-glass > Supabase Auth
  → 返回 Profile / ActorContext
```

---

## 6. 环境变量

以下变量从代码实际读取情况反向核对，以代码真实读取名称为最终准则。

### Supabase 连接（必需）

| 变量名 | 作用域 | 说明 |
|--------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 客户端 + 服务端 | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 客户端 + 服务端 | Publishable (anon) Key |
| `SUPABASE_SERVICE_ROLE_KEY` | 仅服务端 | Service Role Key（绕过 RLS） |

**变量解析优先级**（`src/lib/supabase/config.ts`）：

| 用途 | 优先级 1 | 优先级 2 | 优先级 3（Coze 沙箱 fallback） |
|------|----------|----------|-------------------------------|
| URL | `NEXT_PUBLIC_SUPABASE_URL` | — | `COZE_SUPABASE_URL` |
| Anon Key | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `COZE_SUPABASE_ANON_KEY` |
| Service Role | `SUPABASE_SECRET_KEY` | `SUPABASE_SERVICE_ROLE_KEY` | `COZE_SUPABASE_SERVICE_ROLE_KEY` |

### Break-glass Super Admin（必需）

| 变量名 | 作用域 | 说明 |
|--------|--------|------|
| `SUPER_ADMIN_USERNAME` | 仅服务端 | Super Admin 登录用户名 |
| `SUPER_ADMIN_PASSWORD_HASH` | 仅服务端 | scrypt 密码哈希（`scrypt:salt:hash` 格式） |
| `LOCAL_ACCESS_SECRET` | 仅服务端 | HMAC 签名密钥（用于 access token） |
| `CONSOLE_ACTOR_ID` | 仅服务端 | Break-glass Actor 的真实 profile UUID |
| `BREAK_GLASS_SESSION_TTL_SECONDS` | 仅服务端 | Session 有效期（默认 86400 = 24h） |

**备选变量名**（代码兼容）：
- `LOCAL_SUPER_ADMIN_PASSWORD_HASH`（`SUPER_ADMIN_PASSWORD_HASH` 的 fallback）
- `SUPER_ADMIN_ACTOR_ID`（`CONSOLE_ACTOR_ID` 的 fallback）

### 已废弃变量

| 变量名 | 状态 | 说明 |
|--------|------|------|
| `SUPER_ADMIN_AUTH_EMAIL` | **已废弃** | 旧认证体系遗留，当前代码无任何引用 |

### 运行时变量（平台注入）

| 变量名 | 说明 |
|--------|------|
| `DEPLOY_RUN_PORT` | 服务监听端口（禁止硬编码） |
| `COZE_PROJECT_ENV` | `DEV` / `PROD` |
| `NODE_ENV` | `development` / `production` |

---

## 7. Server Authorization

### 核心原则

1. **内部 API 不能只依赖前端隐藏**：所有写 API 在 middleware 层对匿名请求返回 401，在 Service 层通过 `requireAuth()` / `requirePermission()` / `requireRole()` 做二次校验。
2. **service_role 数据访问必须经过 Server Authorization**：Repository 使用 Service Role Key 绕过 RLS，因此权限判断完全由应用层负责。
3. **Break-glass Super Admin 为最高权限**：`is_break_glass && role === 'super_admin'` 跳过所有权限检查。
4. **Talent 普通 API 不直接暴露敏感联系方式**：`TalentSafeDTO` 排除 `phone`/`email`/`wechat`；联系方式通过 `contact-access` 授权链路处理。
5. **Batch API fail-closed**：权限校验异常 = 拒绝（`catch → deniedItems`），不存在 fail-open。

### 资源级授权

| 资源 | 检查函数 | 检查逻辑 |
|------|----------|----------|
| Job | `canManageJob(actorId, jobId)` | owner / manager / teammate 三层检查 |
| Application | `canManageApplication()` | owner / manager scope |
| Lead | `canManageLead()` | owner / manager scope |
| Talent | `canManageTalent()` | owner / manager scope |

> `super_admin` 角色跳过资源级检查（直接放行）。

---

## 8. 数据库说明

### Source of Truth

正式 Supabase（`wbpnvbvdotkjhwxhndhz`）是业务数据的唯一 Source of Truth。

### 重要警告

1. **不要直接把 `supabase/migrations/` 当成生产数据库完整事实**。Migration 与正式库存在 Schema Drift（详见 `docs/DATABASE_REALITY.md`）：
   - ID 类型：真实库 `varchar + gen_random_uuid()`，migration 为 `UUID + uuid_generate_v4()`
   - 外键：migration 声明约 13 条，正式库仅 1 条
   - 触发器：migration 的 `set_updated_at` 未建立
   - RPC：migration 004 的 4 个业务函数均不存在（但后续新增了 `convert_lead_to_talent`、`create_application_with_context`、`transition_application_stage` 等 RPC，代码已接入）

2. **Migration 文件不可直接对生产执行**。如需对齐，必须先导出真实结构并反向生成验证过的迁移。

3. **本轮交接未修改数据库**：无 ALTER TABLE / UPDATE / RPC 创建 / RLS 修改。

### 数据访问方式

- 内部 API：Service Role Key（绕过 RLS）
- 公开 API：Anon Key（受 RLS Policy 约束）
- Repository 使用 untyped Supabase Client（`getSupabaseAdminUntyped`）

---

## 9. 当前已完成能力

以下能力均基于代码真实状态总结，区分实现状态：

### 核心业务

| 能力 | 代码实现 | 静态检查 | 真实 UAT |
|------|:---:|:---:|:---:|
| Company CRUD + 删除保护 | ✅ | ✅ | ⚠️ 需登录态 |
| Job CRUD + 状态机 | ✅ | ✅ | ⚠️ 需登录态 |
| Job Code（QJ-YY-NNNN 编码体系） | ✅ | ✅ | ✅ 已验证 |
| Publication CRUD + 发布/下架/归档 | ✅ | ✅ | ⚠️ 需登录态 |
| Publication 赛道归类（四大赛道） | ✅ | ✅ | ⚠️ 需登录态 |
| Publication 精选（单条 + 批量） | ✅ | ✅ | ⚠️ 需登录态 |
| Publication 急招生命周期 | ✅ | ✅ | ⚠️ 需登录态 |
| Publication 批量发布/下架/精选/取消精选 | ✅ | ✅ | ⚠️ 需登录态 |
| Lead CRUD + 状态机 | ✅ | ✅ | ⚠️ 需登录态 |
| Lead → Talent 转换（RPC `convert_lead_to_talent`） | ✅ | ✅ | ✅ 已验证 |
| Talent CRUD + PII 脱敏 | ✅ | ✅ | ⚠️ 需登录态 |
| Talent 联系方式授权链路 | ✅ | ✅ | ⚠️ 需登录态 |
| Application CRUD + 状态机 | ✅ | ✅ | ✅ 已验证 |
| Application RPC 接入（create/transition） | ✅ | ✅ | ✅ 已验证 |
| StageEvent DB Trigger 单源 | ✅ | ✅ | ✅ 已验证 |
| Pipeline 看板（按钮推进） | ✅ | ✅ | ⚠️ 需登录态 |
| 一键发布全部草稿（publish-drafts） | ✅ | ✅ | ✅ 已验证 |

### 数据导入

| 能力 | 代码实现 | 静态检查 | 真实 UAT |
|------|:---:|:---:|:---:|
| 不筹量子 18 岗位导入 | ✅ | ✅ | ✅ 已验证 |
| 太一量生截图版 17 岗位导入 | ✅ | ✅ | ✅ 已验证 |

### 权限与安全

| 能力 | 代码实现 | 静态检查 | 真实 UAT |
|------|:---:|:---:|:---:|
| Break-glass Super Admin 登录 | ✅ | ✅ | ⚠️ 需真实密码 |
| Supabase Auth 团队登录 | ✅ | ✅ | ⚠️ 需真实账号 |
| Server Authorization 中间层 | ✅ | ✅ | ✅ 匿名 401 已验证 |
| 资源级授权（Job/App/Lead/Talent） | ✅ | ✅ | ⚠️ 需登录态 |
| Batch API fail-closed | ✅ | ✅ | ✅ 匿名 401 已验证 |
| Talent PII 脱敏（TalentSafeDTO） | ✅ | ✅ | ⚠️ 需登录态 |

### 团队管理

| 能力 | 代码实现 | 静态检查 | 真实 UAT |
|------|:---:|:---:|:---:|
| Team CRUD | ✅ | ✅ | ⚠️ 需登录态 |
| Team Members CRUD | ✅ | ✅ | ⚠️ 需登录态 |
| Permission Grants CRUD | ✅ | ✅ | ⚠️ 需登录态 |
| Offboard（停用 + 重分配） | ✅ | ✅ | ⚠️ 需登录态 |
| Audit Logs 查询 | ✅ | ✅ | ⚠️ 需登录态 |
| Contact Requests 审批 | ✅ | ✅ | ⚠️ 需登录态 |

### UI 体验

| 能力 | 代码实现 | 静态检查 |
|------|:---:|:---:|
| 数据表格（飞书/Airtable 式） | ✅ | ✅ |
| Sidebar IA（7 组导航） | ✅ | ✅ |
| Job Code 展示 + 搜索 | ✅ | ✅ |
| JobCombobox 岗位选择器 | ✅ | ✅ |

---

## 10. Known Issues

详见 `docs/KNOWN_ISSUES.md`。核心遗留：

1. **Pipeline 拖拽未实现**：当前使用按钮推进。
2. **Schema Drift**：Migration 与正式库存在差异，不可直接执行。
3. **Repository untyped**：无编译期表结构类型检查。
4. **读 API 宽松访问**：匿名 GET 部分内部 API 可通过（设计意图，但建议收紧 PII 相关）。
5. **四角色 UAT 未完成**：Super Admin / Team Lead / Internal Consultant 权限边界需真实账号验证。

---

## 11. 接手路径

建议按以下顺序接管：

```
1. README.md              → 项目概览、技术栈、构建命令
2. HANDOVER.md（本文）     → 全局架构、认证、权限、已知问题
3. ARCHITECTURE.md         → 分层架构、API 清单、调用链
4. BUSINESS_FLOW.md        → 业务链路、状态机
5. DATABASE_REALITY.md     → 数据库真实状态（非 migration 推断）
6. KNOWN_ISSUES.md         → 遗留问题清单
7. 认证代码                → src/server/local-access/ + src/server/auth/
8. 本地运行                → pnpm install && pnpm dev
9. Formal Supabase         → 连接正式库验证数据
10. 角色 UAT               → 四角色完整验收
```

---

## 12. 交接验收状态

| 检查项 | 状态 |
|--------|------|
| `pnpm lint` | ✅ PASS（静态） |
| `pnpm ts-check` | ✅ PASS（静态） |
| `pnpm build` | ✅ PASS（静态） |
| 匿名写 API → 401 | ✅ PASS（Smoke Test） |
| Public API → 200 | ✅ PASS（Smoke Test） |
| Super Admin 登录 Route 存在 | ✅ PASS（代码确认） |
| `/api/auth/me` 结构正确 | ✅ PASS（代码确认） |
| Talent PII 脱敏 | ✅ PASS（代码确认） |
| Server Authorization 被核心 API 使用 | ✅ PASS（代码确认） |
| 无 br-rapid 配置残留 | ✅ PASS（全仓搜索） |
| Super Admin 真实登录 UAT | ⚠️ NOT LIVE UAT（无真实密码） |
| Team Lead 真实登录 UAT | ⚠️ NOT LIVE UAT（无真实账号） |
| Internal Consultant UAT | ⚠️ NOT LIVE UAT（无真实账号） |
| 权限边界 UAT | ⚠️ NOT LIVE UAT |

> **代码已实现 / 静态验证，不等同真实 UAT PASS。**
> 四角色完整 UAT 需要真实 Supabase Auth 账号和 Super Admin 密码。
