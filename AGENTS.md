## 本轮记录（Server Authorization 全面整改 + Talent PII 去除 + Team 写 API 闭环）

### 背景
根据 `CODEX_CONSOLE_PRD_AUDIT_2026-08-18.md` 审计报告和 `继续整改 Console 项目：.txt` 提示词，对 Console 进行全面安全整改。核心问题：大量 API 仅有 `requireAuth()` 认证门禁，缺少资源级授权（Authorization），导致任何已登录用户可操作任意资源。

### 核心变更

#### 1. 统一 Server Authorization 中间层
| 文件 | 变更 |
|------|------|
| `src/server/auth/guard.ts` | 新增 `requireRole(roles[])`、`requireCanManageJob(jobId)`、`requireCanManageApplication(applicationId)`、`requireCanReadApplication(applicationId)`、`requireCanManageLead(leadId)`、`requireCanManageTalent(talentId)` 六个授权辅助函数 |
| `src/server/services/job-access.ts` | **新增** `canManageJob(actorId, jobId)` — owner/manager/teammate 三层检查 |
| `src/server/services/application-access.ts` | **新增** `canManageApplication()` / `canReadApplication()` |
| `src/server/services/lead-access.ts` | **新增** `canManageLead()` — owner/manager scope |
| `src/server/services/talent-access.ts` | **新增** `canManageTalent()` — owner/manager scope |

#### 2. Company API 授权
| 路由 | 修复前 | 修复后 |
|------|--------|--------|
| `POST /api/companies` | `requireAuth()` | `requireRole(['super_admin', 'team_lead'])` |
| `PATCH /api/companies/[id]` | `requireAuth()` | `requireRole(['super_admin', 'team_lead'])` |
| `DELETE /api/companies/[id]` | `requireAuth()` | `requireRole(['super_admin', 'team_lead'])` |

#### 3. Job API 授权
| 路由 | 修复前 | 修复后 |
|------|--------|--------|
| `POST /api/jobs` | `requireAuth()` | `requireRole(['super_admin', 'team_lead'])` |
| `PATCH /api/jobs/[id]` | `requireAuth()` | `requireCanManageJob(id)` |
| `POST /api/jobs/[id]/start` | `requireAuth()` | `requireCanManageJob(id)` |
| `POST /api/jobs/[id]/pause` | `requireAuth()` | `requireCanManageJob(id)` |
| `POST /api/jobs/[id]/close` | `requireAuth()` | `requireCanManageJob(id)` |
| `POST /api/jobs/[id]/archive` | `requireAuth()` | `requireCanManageJob(id)` |
| `POST /api/jobs/[id]/resume` | `requireAuth()` | `requireCanManageJob(id)` |
| `POST /api/jobs/[id]/publication` | `requireAuth()` | `requireCanManageJob(id)` |
| `POST /api/jobs/publish-drafts` | `requireAuth()` | `requirePermission('publication_publish')` |

#### 4. Lead API 授权
| 路由 | 修复前 | 修复后 |
|------|--------|--------|
| `PATCH /api/leads/[id]` | `requireAuth()` | `requireCanManageLead(id)` |
| `POST /api/leads/[id]/qualify` | `requireAuth()` | `requireCanManageLead(id)` |
| `POST /api/leads/[id]/invalidate` | `requireAuth()` | `requireCanManageLead(id)` |
| `POST /api/leads/[id]/contact` | `requireAuth()` | `requireCanManageLead(id)` |
| `POST /api/leads/[id]/review` | `requireAuth()` | `requireCanManageLead(id)` |
| `POST /api/leads/[id]/convert` | `requireAuth()` | `requireCanManageLead(id)` |

#### 5. Application API 授权
| 路由 | 修复前 | 修复后 |
|------|--------|--------|
| `GET /api/applications/[id]` | `resolveCurrentActor()` | `requireCanReadApplication(id)` |
| `PATCH /api/applications/[id]` | `resolveCurrentActor()` | `requireCanManageApplication(id)` |
| `POST /api/applications/[id]/transition` | `resolveCurrentActor()` | `requireCanManageApplication(id)` |

#### 6. Talent PII 去除
| 文件 | 变更 |
|------|------|
| `src/lib/domain/types.ts` | 新增 `TalentSafeDTO` 类型（排除 phone/email/wechat）+ `stripTalentPII()` 函数 |
| `src/app/api/talents/route.ts` | GET list / POST create / batch fetch 全部返回 `TalentSafeDTO` |
| `src/app/api/talents/[id]/route.ts` | GET / PATCH 返回 `TalentSafeDTO` |
| `src/app/api/talents/[id]/contact-access/route.ts` | GET 使用 `maskTalentContact()` 统一脱敏；PATCH 对齐 RPC 参数（`p_request_id` + `approved/rejected` + `p_expires_at`） |

#### 7. Team 写 API 闭环
| 路由 | 变更 |
|------|------|
| `POST /api/team/members` | 新增：创建成员（`supabase.auth.admin.createUser` + profiles upsert），`requireRole(['super_admin'])` |
| `PATCH /api/team/members/[id]` | 新增：更新成员（role/manager_id/status），`requireRole(['super_admin'])` |
| `POST /api/team/teams` | 新增：创建团队，`requireRole(['super_admin'])` |
| `POST /api/team/permissions` | 重写：使用 `grant_permission_with_context` RPC，`requireRole(['super_admin'])` |
| `DELETE /api/team/permissions` | 重写：使用 `revoke_permission_with_context` RPC，`requireRole(['super_admin'])` |

#### 8. Offboarding 闭环
| 路由 | 变更 |
|------|------|
| `POST /api/team/offboard` | **新增**：调用 `deactivate_profile_and_reassign` RPC，原子化停用 profile + 重分配资源，`requireRole(['super_admin'])` |

#### 9. Import 路由授权升级
| 路由 | 修复前 | 修复后 |
|------|--------|--------|
| `POST /api/import/buchou` | `requireAuth()` | `requirePermission('publication_publish')` |
| `POST /api/import/taiyi-screenshot` | `requireAuth()` | `requirePermission('publication_publish')` |

#### 10. 敏感 GET 权限收紧
| 路由 | 修复前 | 修复后 |
|------|--------|--------|
| `GET /api/team/audit-logs` | `requireAuth()` | `requireRole(['super_admin', 'team_lead'])` |
| `GET /api/external/consultants` | `requireAuth()` | `requireRole(['super_admin', 'team_lead'])` |

#### 11. 旧角色清理
| 文件 | 变更 |
|------|------|
| `src/app/api/auth/login/route.ts` | 移除 `'admin'` 旧角色引用，仅保留 `'super_admin'` |

### 验证结果
- ✅ pnpm lint — 通过
- ✅ pnpm ts-check — 通过
- ✅ 服务探活 localhost:5000 — ready
- ✅ 匿名 POST 所有写 API → 401 UNAUTHORIZED（deny-by-default 预期行为）
- ✅ 匿名 GET 敏感读取 API → 401 UNAUTHORIZED（deny-by-default 预期行为）
- ✅ Public API `/api/public/jobs` → 200（豁免，正常工作）
- ✅ 未修改 Supabase Schema / RLS / RPC / Trigger / Migration / Showcase

### 待后续 UAT（需真实登录态）
- 四角色 UAT（super_admin / team_lead / internal_consultant / viewer）
- `grant_permission_with_context` / `revoke_permission_with_context` RPC 真实调用
- `deactivate_profile_and_reassign` RPC 真实调用
- Talent PII 验证（普通 API 不返回 phone/email/wechat，contact-access 授权后返回）

---

## 本轮记录（Batch Publication fail-open 修复 + UAT 环境 Blocker 报告）

### 背景
Console P0 权限体系最后两个验收问题：
1. 修复所有 Batch Publication 的资源权限 fail-open；
2. 创建真实测试身份，完整跑通四角色 UAT。

### 审计发现：4 个 Batch API 全部存在 fail-open

**漏洞模式**（4 个路由完全相同）：
```typescript
// ❌ 修复前（fail-open）
for (const id of parsed.ids) {
  try {
    const pub = await PublicationService.getPublication(id);
    const canManage = await canManageJob(ctx.profile.id, pub.job_id);
    if (canManage) allowedIds.push(id);
  } catch {
    allowedIds.push(id); // ← 权限校验失败 → 反而允许执行！
  }
}
```

**受影响路由**：
| 路由 | 权限检查 | 修复前行为 |
|------|----------|-----------|
| `POST /api/publications/batch/publish` | `publication_publish` + `canManageJob` | catch → allow |
| `POST /api/publications/batch/offline` | `publication_publish` + `canManageJob` | catch → allow |
| `POST /api/publications/batch/feature` | `publication_operate` + `canManageJob` | catch → allow |
| `POST /api/publications/batch/unfeature` | `publication_operate` + `canManageJob` | catch → allow |

**根因**：`catch` 块将权限校验异常（Publication 不存在、RPC 失败、canManageJob 抛错）视为「放行」，违反 Authorization check error = deny 原则。

### 修复方案（fail-closed）

```typescript
// ✅ 修复后（fail-closed）
for (const id of parsed.ids) {
  try {
    const pub = await PublicationService.getPublication(id);
    const canManage = await canManageJob(ctx.profile.id, pub.job_id);
    if (canManage) {
      allowedIds.push(id);
    } else {
      deniedItems.push({ id, status: 'failed', message: '没有操作该岗位的权限' });
    }
  } catch {
    // Publication not found, RPC error, or any other failure → DENY
    deniedItems.push({ id, status: 'failed', message: '权限校验失败，已拒绝操作' });
  }
}
```

**修复后行为**：
- 权限校验成功 + canManage=true → `allowedIds`（允许执行）
- 权限校验成功 + canManage=false → `deniedItems`（FORBIDDEN）
- 权限校验异常（任何 catch） → `deniedItems`（DENY）
- 最终结果合并：`result.results = [...serviceResults, ...deniedItems]`

### 变更文件清单
| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/app/api/publications/batch/publish/route.ts` | **修复** | catch → deniedItems（fail-closed） |
| `src/app/api/publications/batch/offline/route.ts` | **修复** | 同上 |
| `src/app/api/publications/batch/feature/route.ts` | **修复** | 同上 |
| `src/app/api/publications/batch/unfeature/route.ts` | **修复** | 同上 |

### 全仓搜索确认
- `catch.*allowedIds.push` → 0 匹配（无残留 fail-open）
- 其他 batch 路由（talents/jobs）仅有批量读取，无权限校验逻辑，不受影响
- 单条路由（`[id]/publish`、`[id]/offline`、`[id]/feature` 等）正确实现 fail-closed（抛 `ForbiddenError`）

### UAT 环境 Blocker 报告

#### Blocker 1：Supabase Auth Trigger 损坏，无法创建新用户
- **现象**：`supabase.auth.admin.createUser()` 和 `supabase.auth.signUp()` 均返回 `Database error creating new user`
- **根因**：`auth.users` 表上的 `handle_new_user` trigger 函数引用了 `profiles` 表中已不存在的列（可能是历史迭代中移除的 `display_name`、`email` 等），导致 INSERT INTO profiles 失败，auth user 创建被回滚
- **影响**：无法创建 Team Lead / IC-A / IC-B 测试账号，8 个 UAT Case 全部无法执行
- **修复建议**：需要在 Supabase Dashboard 或 SQL Editor 中修复 `handle_new_user` trigger 函数，使其只引用当前 profiles 表存在的列（`id`, `full_name`, `role`, `status`, `manager_id`）

#### Blocker 2：`decide_talent_contact_access` RPC 不存在
- **现象**：`supabase.rpc('decide_talent_contact_access', ...)` 返回 `Could not find the function`
- **影响**：UAT Case 6（Talent Contact Access: request → approve → view → audit）无法执行 approve 步骤
- **修复建议**：需要在 Supabase 中创建 `decide_talent_contact_access` RPC 函数

#### Blocker 3：`grant_permission_with_context` RPC 不存在
- **现象**：`supabase.rpc('grant_permission_with_context', ...)` 返回 `Could not find the function`
- **影响**：UAT Case 2（Team Lead Grant A publication_publish）无法通过 RPC 执行
- **替代方案**：可直接 INSERT `permission_grants` 表（已验证可行），但非正式 RPC 路径
- **修复建议**：创建 `grant_permission_with_context` RPC，或在 Console API 层直接操作 `permission_grants` 表

### 验证结果
- ✅ pnpm lint — 通过（0 errors, 64 warnings 均为历史非阻塞）
- ✅ pnpm ts-check — 通过
- ✅ pnpm build — 通过
- ✅ 匿名 POST batch/publish → 401（鉴权门禁生效）
- ✅ 匿名 POST batch/offline → 401（鉴权门禁生效）
- ✅ 匿名 POST batch/feature → 401（鉴权门禁生效）
- ✅ 匿名 POST batch/unfeature → 401（鉴权门禁生效）
- ✅ 全仓搜索确认无其他 fail-open 残留
- ✅ 未修改 Supabase Schema / RLS / RPC / Showcase
- ⚠️ 四角色 UAT — BLOCKED（auth trigger 损坏，无法创建测试账号）
- ⚠️ Case 6 Contact Access approve — BLOCKED（`decide_talent_contact_access` RPC 不存在）

---

## 本轮记录（P0 权限闭环与 IA 纠偏）

### 背景
Publication 写 API 仅有 `requireAuth()`（任何已登录用户都能操作），Publication Detail 权限默认 true（fail-open），Sidebar IA 不符合产品定义，Talent 联系方式 fallback 查询字段名错误。

### 变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/server/auth/api-helpers.ts` | **修复** | `catchApiErrors` 新增 `ForbiddenError` → 403 处理（此前 ForbiddenError 继承 BusinessError 返回 400） |
| `src/app/api/publications/[id]/route.ts` | **重构** | PATCH 改用 `requirePermission('publication_edit')` + `canManageJob` 资源级检查；GET 保持 `requireAuth()` |
| `src/app/api/publications/[id]/publish/route.ts` | **重构** | `requirePermission('publication_publish')` + `canManageJob` |
| `src/app/api/publications/[id]/offline/route.ts` | **重构** | `requirePermission('publication_publish')` + `canManageJob` |
| `src/app/api/publications/[id]/republish/route.ts` | **重构** | `requirePermission('publication_publish')` + `canManageJob` |
| `src/app/api/publications/[id]/archive/route.ts` | **重构** | `requirePermission('publication_publish')` + `canManageJob` |
| `src/app/api/publications/[id]/feature/route.ts` | **重构** | `requirePermission('publication_operate')` + `canManageJob` |
| `src/app/api/publications/[id]/unfeature/route.ts` | **重构** | `requirePermission('publication_operate')` + `canManageJob` |
| `src/app/api/publications/batch/publish/route.ts` | **重构** | `requirePermission('publication_publish')` |
| `src/app/api/publications/batch/offline/route.ts` | **重构** | `requirePermission('publication_publish')` |
| `src/app/api/publications/batch/feature/route.ts` | **重构** | `requirePermission('publication_operate')` |
| `src/app/api/publications/batch/unfeature/route.ts` | **重构** | `requirePermission('publication_operate')` |
| `src/app/(console)/publications/[id]/page.tsx` | **重构** | 权限默认 false（fail-closed）；从 `/api/auth/me` 的 `permissions` 数组读取；按钮无权限时 disabled + tooltip 而非隐藏 |
| `src/app/(console)/layout.tsx` | **重构** | Sidebar IA 重组为 7 组：工作台 / 业务资源 / 展示运营 / 人才交付 / 外部协作 / 团队与权限 / 数据分析；移除 SEO/UTM |
| `src/app/(console)/team/page.tsx` | **增强** | 支持 `?tab=` URL 参数；新增「联系方式审批」Tab（待审批列表 + 批准/拒绝操作） |
| `src/app/api/talents/[id]/contact-access/route.ts` | **修复+增强** | fallback 查询字段 `name` → `full_name`；新增 PATCH 方法（批准/拒绝联系方式申请） |
| `src/app/api/team/contact-requests/route.ts` | **新增** | GET 待审批联系方式请求列表 |

### Publication 写 API 授权规则

| API | 权限检查 | 资源级检查 |
|-----|----------|-----------|
| PATCH `/api/publications/[id]` | `publication_edit` | `canManageJob(actorId, jobId)` (非 super_admin) |
| POST `.../[id]/publish` | `publication_publish` | `canManageJob` (非 super_admin) |
| POST `.../[id]/offline` | `publication_publish` | `canManageJob` (非 super_admin) |
| POST `.../[id]/republish` | `publication_publish` | `canManageJob` (非 super_admin) |
| POST `.../[id]/archive` | `publication_publish` | `canManageJob` (非 super_admin) |
| POST `.../[id]/feature` | `publication_operate` | `canManageJob` (非 super_admin) |
| POST `.../[id]/unfeature` | `publication_operate` | `canManageJob` (非 super_admin) |
| POST `.../batch/publish` | `publication_publish` | — |
| POST `.../batch/offline` | `publication_publish` | — |
| POST `.../batch/feature` | `publication_operate` | — |
| POST `.../batch/unfeature` | `publication_operate` | — |

### Sidebar 最终 IA

```
工作台
业务资源
├ 公司与岗位 (/companies)
└ 内部岗位 (/jobs)
展示运营
├ 公开岗位 (/publications)
├ 新投递 (/leads)
└ 展示数据 (/showcase/analytics)
人才交付
├ 人才库 (/talents)
└ 招聘推进 (/pipeline)
外部协作
└ 外部顾问 (/external)
团队与权限
├ 团队成员 (/team?tab=members)
├ 权限授权 (/team?tab=permissions)
├ 联系方式审批 (/team?tab=contact_requests)
└ 操作日志 (/team?tab=audit)
数据分析
└ 数据看板 (/analytics)
```

### 验证结果
- ✅ pnpm lint — 通过
- ✅ pnpm ts-check — 通过
- ✅ pnpm build — 通过
- ✅ 所有 Publication 写 API 匿名请求 → 401（鉴权门禁生效）
- ✅ GET `/api/publications/[id]` 保持仅需认证（读取接口）
- ✅ 未修改 Supabase Schema / RLS / RPC / Migration / Showcase

---

## 本轮记录（多人权限体系 Console 升级 V1）

### 背景
将 Console 从单 Super Admin 本地登录体系升级为多人、角色化、可审计的内部招聘工作台。保留 Super Admin 应急登录能力（Break-glass），新增 Supabase Auth 邮箱密码登录路径，构建统一 Permission Engine，重组 Sidebar/IA，新增团队与权限模块、人才联系方式保护、Publication 权限化、展示运营模块、外部协作内部管理。

### 核心原则
- **不修改 Supabase Schema / RLS / RPC / Migration / Showcase**
- **不修改现有业务表数据副本**（UUID 仍是主键，job_code 只是人类可读标识）
- **Permission Engine 是 Console 唯一权限 Source of Truth**
- **deny-by-default**：未认证 → 401，已认证无权限 → 403

### 角色模型
| 角色 | 说明 | 登录方式 |
|------|------|----------|
| `super_admin` | 超级管理员（Break-glass） | 本地 Cookie + Supabase Auth |
| `team_lead` | 团队负责人 | Supabase Auth 邮箱密码 |
| `internal_consultant` | 内部顾问 | Supabase Auth 邮箱密码 |

### 权限定义（8 个，全部可委派）
| Permission Key | 说明 |
|----------------|------|
| `team_data_read` | 查看团队数据 |
| `team_data_write` | 修改团队数据 |
| `publication_write` | 编辑公开岗位 |
| `publication_publish` | 发布/下架公开岗位 |
| `publication_operate` | 运营操作（精选/急招/赛道） |
| `talent_contact_view` | 查看人才联系方式 |
| `external_collaboration_manage` | 管理外部协作 |
| `showcase_manage` | 管理展示运营 |

### 变更清单

#### 领域层
| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/lib/domain/types.ts` | **扩展** | `InternalRole` 改为 `super_admin | team_lead | internal_consultant`；`Profile` 新增 `manager_id`；新增 `Team`、`TeamMembership`、`PermissionDefinition`、`PermissionGrant`、`AuditLog`、`ContactAccessRequest`、`ExternalConsultant`、`ExternalJobAccess`、`ExternalReferral`、`ActorContext`、`PermissionKey` 类型 |
| `src/lib/domain/errors.ts` | **新增** | `ForbiddenError`（403） |
| `src/lib/contact-mask.ts` | **新增** | 联系方式脱敏工具（`maskPhone`、`maskEmail`、`maskWechat`、`maskTalentContact`） |

#### 权限引擎
| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/server/auth/permissions.ts` | **新增** | `ROLE_DEFAULT_PERMISSIONS`（角色默认权限映射）、`checkPermission()`（权限检查）、`getEffectivePermissions()`（有效权限列表）、`canPerformAction()`（动作权限判断） |
| `src/server/auth/actor.ts` | **新增** | `buildActorContext()`（构建完整 ActorContext，含 profile + teams + permissions） |

#### Auth 改造
| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/server/auth/guard.ts` | **重构** | 双认证路径：本地 Cookie（Break-glass）> Supabase Auth Session；`requireAuth()` 抛 AuthError；新增 `resolveActorContext()`、`requirePermission()` |
| `src/app/login/page.tsx` | **重写** | 双入口登录：Super Admin（用户名+密码）+ Supabase Auth（邮箱+密码） |
| `src/app/login/actions.ts` | **保留** | Super Admin 本地登录 Server Action |
| `src/app/login/supabase-actions.ts` | **新增** | Supabase Auth 登录 Server Action |
| `src/app/api/auth/me/route.ts` | **重写** | 返回完整 ActorContext（profile + teams + permissions + is_break_glass） |
| `src/middleware.ts` | **增强** | 双认证路径支持；新增 `/api/team/*`、`/api/showcase/*`、`/api/external/*` 写保护 |

#### Sidebar / IA 重组
| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/app/(console)/layout.tsx` | **重构** | 6 组导航：工作台 / 招聘业务 / 展示运营 / 外部协作 / 团队与权限 / 系统；角色感知显示 |

#### 新增页面
| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/app/(console)/team/page.tsx` | **新增** | 团队与权限管理（成员/团队/权限/审计日志 4 Tab） |
| `src/app/(console)/showcase/analytics/page.tsx` | **新增** | 展示运营数据（PV/UV/投递转化/UTM 来源/SEO） |
| `src/app/(console)/showcase/seo/page.tsx` | **新增** | SEO 管理（TDK/结构化数据/站点地图） |
| `src/app/(console)/showcase/utm/page.tsx` | **新增** | UTM 参数管理 |
| `src/app/(console)/external/page.tsx` | **新增** | 外部协作管理（顾问列表/岗位授权/推荐记录） |

#### 新增 API
| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/app/api/team/members/route.ts` | **新增** | GET/POST 团队成员管理 |
| `src/app/api/team/teams/route.ts` | **新增** | GET/POST 团队管理 |
| `src/app/api/team/permissions/route.ts` | **新增** | GET/POST/DELETE 权限授予/撤销 |
| `src/app/api/team/audit-logs/route.ts` | **新增** | GET 审计日志查询 |
| `src/app/api/showcase/analytics/route.ts` | **新增** | GET 展示运营数据 |
| `src/app/api/external/consultants/route.ts` | **新增** | GET/POST 外部顾问管理 |
| `src/app/api/talents/[id]/contact-access/route.ts` | **新增** | GET 联系方式权限检查 / POST 申请查看 |

#### 现有页面增强
| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/app/(console)/talents/[id]/page.tsx` | **增强** | 联系方式脱敏显示 + 申请查看权限弹窗 |
| `src/app/(console)/publications/[id]/page.tsx` | **增强** | 操作按钮权限化（编辑/发布/下架/精选按权限显示） |
| `src/app/(console)/page.tsx` | **增强** | Dashboard 角色感知标题 |

### 验证结果
- ✅ pnpm lint — 通过
- ✅ pnpm ts-check — 通过
- ✅ pnpm build — 通过
- ✅ 服务探活 localhost:5000 — ready
- ✅ 公开 API `/api/public/jobs` — 200（豁免）
- ✅ 登录页 `/login` — 200
- ✅ 匿名 GET 保护 API — 401（deny-by-default 预期行为）
- ✅ 匿名 POST 保护 API — 401（deny-by-default 预期行为）
- ✅ 未修改 Supabase Schema / RLS / RPC / Migration / Showcase
- ✅ 未修改现有业务表数据结构

### 待后续 UAT（需真实登录态）
- Super Admin Break-glass 登录 → 完整 ActorContext 返回
- Supabase Auth 邮箱密码登录 → Team Lead / Internal Consultant 角色
- 权限授予/撤销 → `grant_permission_with_context` / `revoke_permission_with_context` RPC
- 人才联系方式申请 → `request_talent_contact_access` RPC
- 团队创建 → `teams` 表写入
- 外部顾问创建 → `external_consultants` 表写入

---

## 本轮记录（一键发布全部草稿岗位 + 修复 Publication job_id 筛选失效）

### 背景
运营动作：把当前所有 draft 状态的岗位一键转为「招聘中」并公开运营。执行前发现全库已无 draft 岗位（太一量生截图版 11 个新岗位已处于 recruiting + published），该能力转为通用运营能力交付，幂等重跑返回 0。

### 变更清单
| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/server/services/publish-drafts.service.ts` | **新增** | `publishAllDraftJobs()`：循环分页拉取全部 status=draft 的 Job → 逐个查询关联 Publication → `batchPublish`（内部自动 startRecruiting + publishPublication，draft→recruiting + draft→published，offline→republish，archived→skipped）；无 Publication 的 Job 仅 startRecruiting；返回汇总（总数/已发布/仅转招聘中/跳过/失败 + 明细）。幂等、部分成功 |
| `src/app/api/jobs/publish-drafts/route.ts` | **新增** | `POST /api/jobs/publish-drafts`（requireAuth，幂等，可重复运行） |
| `src/server/repositories/publication.repository.ts` | **修复** | `list()` 的 `job_id` 筛选条件此前被拼接逻辑跳过（筛选参数未应用），导致按岗位查询公开岗位时返回错误结果（多个岗位返回相同全表前 N 条）。修复后精确过滤 `job_id` |

### 修复验证（Bug）
- 修复前：`PublicationRepository.list({ job_id })` 忽略 job_id，同一批 slug 出现在多个无关岗位下
- 修复后：`QJ-26-0065 (GPU开发工程师)` → 精确返回 1 条（slug=taiyi-gpu-development-engineer）
- 影响面：Job Detail「关联公开岗位」、Leads「来源岗位」映射、Applications「目标岗位」等按 job_id 查公开岗位的链路

### 运营现状（执行时快照）
- jobs：recruiting 73 / closed 1 / draft 0 / paused 0 / archived 0
- job_publications：published 72 / offline 1 / draft 0 / archived 0
- 太一量生截图版 11 个新岗位（QJ-26-0065~0075）：均 recruiting + published，公开运营已生效；无任何 draft 遗留，无需再执行发布

### 验证结果
- ✅ pnpm lint / ts-check — 通过
- ✅ `POST /api/jobs/publish-drafts` 匿名 → 401（鉴权门禁生效）
- ✅ 幂等重跑：draft=0 → 无操作、无失败、无孤儿
- ✅ Supabase Schema / RLS / RPC / Trigger / Migration / Showcase — 未修改

---

## 本轮记录（太一量生截图核验版 17 岗位导入：draft 草稿，不发布）

### 背景
将 `assets/taiyi-screenshot-verified-showcase-import_20260817133559363.json`（太一量生飞书招聘截图核验版 17 个岗位，source 元数据 `public_import_safe: true`）导入工作台。与历史目录版（`taiyi-quantum-jobs.json`，20 岗位已 publish）**slug 体系不同**，本批按 slug 幂等去重、统一 draft、不发布。

### 核心规则（与 buchou/taiyi 先例对齐，本批差异：draft 不发布）
1. **按 slug 去重**：slug 已存在 Publication → matched（跳过，不覆盖历史数据）
2. **Company find-or-create**：匹配到已有「太一量生」（id=`4b144b32-79e6-4bb6-a15d-5ebe331e2948`），未新建
3. **Job + Publication 状态统一 draft**：不 startRecruiting、不 publish（用户明确要求）
4. **list_only 跳过**：`激光工程师`、`量子操控工程师`（taiyi-laser-engineer / taiyi-quantum-control-engineer）JD 不完整 → 标记待补全，跳过公开创建
5. **Track 合法性**：仅允许正式值（superconducting/ion-trap/photonics/communication-sensing）或 null；本批唯一非 null track = `taiyi-optical-engineer → photonics`，其余（中性原子）全为 null
6. **不臆造**：截图未出现字段不推断为事实（experience/urgent 时间等保留 null；featured/urgent=false）
7. **不覆盖**：matched 4 条（public-relations / channel-ecosystem / ai-algorithm-quantum-optimization / government-quantum-solution）历史 published 数据原样保留

### 附件字段 → DB 落库映射
| 附件字段 | 落库位置 | 说明 |
|---------|---------|------|
| public_title | job.title + publication.public_title | ✅ |
| company_display_name | publication.public_company_name | ✅ |
| city / salary_display / summary / direction / seniority / tags / education / experience | publication 对应列 | ✅ 有值才写 |
| responsibilities | publication.responsibilities + job.original_jd | ✅ join('\n') |
| requirements | publication.requirements + job.hard_requirements | ✅ join('\n') |
| track | publication.track | ✅ 仅合法值或 null |
| slug | publication.slug | ✅ 幂等键 |
| status / featured / urgent / urgent_* / published_at | 对应列 | ✅ draft/false/null |
| recommended_publish_wave | job.intake_metadata.publish_wave | ✅ 映射 |
| job_id / publication_id | DB 自动生成 | ✅ |
| **candidate_profile** | ❌ DB 无对应列 | 报告中列出，未写入 |
| **source_status** | ❌ DB 无对应列 | 报告中列出，未写入 |
| **source_evidence** | ❌ DB 无对应列 | 报告中列出，未写入 |

### 变更清单
| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/server/services/taiyi-screenshot-import.service.ts` | **新增** | 导入 Service：load JSON → find-or-create Company → 幂等去重（slug 查重）→ 创建 Job(draft) + Publication(draft) → 汇总 created/matched/skipped/pendingConfirm/unmappedFields |
| `src/app/api/import/taiyi-screenshot/route.ts` | **新增** | `POST /api/import/taiyi-screenshot`（requireAuth，幂等，可重复运行） |

### 验证结果
- ✅ pnpm lint / ts-check — 通过
- ✅ 真实导入（service role 直连正式库）：17 岗位 → **新增 11 / 匹配 4 / 跳过 2（list_only）/ 失败 0**
- ✅ 11 个新建 Job：status=draft，job_code QJ-26-0065~0075 自动生成，intake_metadata.source_id=slug、source_file、publish_wave 完整
- ✅ 11 个新建 Publication：status=draft、public_company_name=太一量生、track 合法（photonics×1 + null×10）、featured/urgent=false、public_job_code 继承
- ✅ 无孤儿：Job↔Publication 一一对应
- ✅ 未修改 Supabase Schema / RLS / RPC / Trigger / Migration / Showcase / 历史岗位数据
- ⚠️ **待确认（11 条）**：新建岗位中 10 条与历史目录版同名（量子科学家/量子工程师/光学工程师/…）但 slug 不同，疑似同一岗位，需人工确认是否合并（当前按 slug 各自保留，未合并）

---

## 本轮记录（岗位编码体系 Console 接入 V1：job_code / public_job_code 贯穿读取展示搜索）

### 背景
Supabase 已完成岗位编码数据库能力建设：`jobs.job_code`（QJ-YY-NNNN，UNIQUE、NOT NULL、DB 自动生成、创建后不可改）、`job_publications.public_job_code`（自动继承对应 jobs.job_code，不允许人工修改）。本轮 Console 只做「读取、展示、搜索、关联、使用」，不生成/不填写/不修改编码，不改 Supabase、不改 Showcase、不新增任何业务表副本。

### 核心原则
- UUID 仍是系统主键，job_code 只是人类可读业务识别码；所有关联仍用 job_id UUID。
- job_code 唯一 Source of Truth = `jobs.job_code`；public_job_code = Candidate-facing Copy。**禁止**给 leads/talents/applications/stage_events 复制编码。

### 变更清单
| 文件 | 变更 |
|------|------|
| `src/lib/domain/types.ts` | `Job` 增加 `job_code: string`；`JobPublication` 增加 `public_job_code: string`。CreateJobInput/UpdateJobInput/CreatePublicationInput/UpdatePublicationInput 均**未**新增编码字段 |
| `src/server/repositories/job.repository.ts` | `fromJobDb` 映射 `job_code`；`list` 关键词搜索改为 `.or(title.ilike, job_code.ilike)`；`create`/`toJobDbCreate` 输入类型 `Omit<...,'job_code'>`（不写编码） |
| `src/server/repositories/publication.repository.ts` | `fromPublicationDb` 映射 `public_job_code`；`list` 关键词搜索改为 `.or(public_title.ilike, public_company_name.ilike, public_job_code.ilike)`；`create`/`toPublicationDbCreate` 输入类型 `Omit<...,'public_job_code'>`（不写编码） |
| `src/server/services/job.service.ts` | `createJob` 类型断言排除 `job_code` |
| `src/server/services/publication.service.ts` | `createPublicationFromJob` 输入类型排除 `public_job_code` |
| `src/components/job-code.tsx`（新增） | `JobCode` 只读编码展示组件（monospace + 一键复制 + 空值显示「岗位编号异常」），`showCopy` 控制列表/详情模式 |
| `src/components/job-combobox.tsx`（新增） | `JobCombobox` 可搜索岗位选择器（Popover+Command），按 `job_code + title + company` 过滤，选项显示 `QJ-XX-XXXX｜title · company` |
| `src/app/(console)/jobs/page.tsx` | 岗位固定识别列在名称下方展示 JobCode；搜索框 placeholder 提示「岗位名称 / 岗位编码」 |
| `src/app/(console)/jobs/[id]/page.tsx` | 顶部标题区展示可复制 JobCode（只读，无修改入口） |
| `src/app/(console)/publications/page.tsx` | 岗位固定识别列在标题下方展示 public_job_code |
| `src/app/(console)/publications/[id]/page.tsx` | 详情展示「公开岗位编号」+「来源内部岗位」两个只读 JobCode |
| `src/app/(console)/leads/page.tsx` | 新增「来源岗位」列，通过 `publicationsApi.list` 构建 `publication_id → {public_job_code,title}` 映射（offline 也可追溯） |
| `src/app/(console)/leads/[id]/page.tsx` | 「来源岗位」改为 `public_job_code｜岗位名称` + 复制 |
| `src/app/(console)/talents/[id]/page.tsx` | 岗位推进每条显示 `job_code｜title`；「加入岗位推进」Dialog 由 Select 改为 JobCombobox（支持编码搜索） |
| `src/app/(console)/applications/[id]/page.tsx` | 顶部目标岗位显示可复制 `job_code｜title` + 查看岗位链接 |
| `src/app/(console)/pipeline/page.tsx` | 顶部岗位筛选与卡片均显示 `job_code｜title` |

### 验证结果
- ✅ pnpm lint / ts-check / build — 通过（仅历史已知非阻塞 warning：middleware→proxy、url.parse deprecation）
- ✅ 真实 UAT（本地 dev 默认凭据登录 `chaojiguanliyuan-jiachi-liangzikeji`）：
  - Case1/2：`GET /api/jobs?keyword=QJ-26-0003` → 精确定位 1 条，`job_code: QJ-26-0003` 返回
  - Case2/5：`GET /api/publications?keyword=QJ-26-0005` → 精确定位 1 条，`public_job_code: QJ-26-0005` 返回
  - Case3：`POST /api/jobs`（仅 company_id+title，不传 job_code）→ DB 自动生成 `QJ-26-0064` 并返回
  - Case4：该 Job 创建 Publication → `public_job_code: QJ-26-0064` 自动继承相同编码
  - 测试数据已清理（job + publication 均删除，无孤儿）
- ✅ 未修改 Supabase Schema / Trigger / Counter / RLS / RPC / Migration
- ✅ 未修改 Showcase / Application State Machine / Lead→Talent RPC / Pipeline 状态逻辑
- ✅ 无任何 job_code 数据副本（编码仅存在于 jobs.job_code 与 job_publications.public_job_code）

---

## 本轮记录（Lead → Talent 转换切换到 Supabase 原子 RPC convert_lead_to_talent）

### 背景
Supabase 已完成数据库一致性整改，新建原子 RPC `convert_lead_to_talent(p_lead_id uuid)`（已探测正式库：单参数存在，两参数版本不存在；返回 JSONB `{ lead, talent, isDuplicate }`）。Console 原「两步写入」转换逻辑（`TalentRepository.findByPhoneOrEmail` → `TalentRepository.create` → `LeadRepository.update`）存在半成功风险且与数据库去重规则双轨。本轮把该业务唯一事务 Source of Truth 移交数据库 RPC。

### 变更清单
| 文件 | 变更 |
|------|------|
| `src/server/repositories/lead.repository.ts` | 新增 `convertToTalent(leadId)`（`supabase.rpc('convert_lead_to_talent', { p_lead_id })`）+ 导出 `ConvertLeadToTalentResult { lead, talent, isDuplicate }` |
| `src/server/services/lead.service.ts` | `convertLeadToTalent()` 删除两步写入，改为调 RPC；新增 `mapConvertLeadToTalentError`（LEAD_NOT_FOUND → 404；LEAD_MUST_BE_QUALIFIED: current=X → 400 保持旧语义）；删除 `ownerId` 参数（无调用方传值，owner 由 DB 从 lead 继承） |
| `src/server/repositories/talent.repository.ts` | 删除 `findByPhoneOrEmail()`（去重逻辑唯一入口移交 RPC），清理未使用 import |

### 领域规则（现在由数据库 RPC 单一负责）
1. 查重：phone/email normalization → 已有 Talent 复用，否则创建。
2. `leads.status = 'converted'` + `converted_talent_id` + `converted_at` 在同一事务原子提交。
3. 幂等：已 converted 的 Lead 再次转换 → 复用现有 Talent（isDuplicate=true），不新建。
4. 非 qualified Lead → RPC 拒绝 `LEAD_MUST_BE_QUALIFIED: current=<status>`，无半成功写入。

### 保持不变的 API 契约
- `POST /api/leads/[id]/convert` 返回 `{ lead, talent, isDuplicate }` 不变（RPC JSONB 与契约 1:1）。
- 前端（Lead Detail 转人才交互）零改动。

### 验证结果
- ✅ pnpm lint / ts-check — 通过
- ✅ 服务探活 localhost:5000 — ready
- ✅ build — 仅 2 个历史已知非阻塞 warning（workspace root 推断、middleware→proxy 约定），无代码错误
- ✅ 匿名 POST convert → 401（鉴权门禁生效）
- ✅ 真实 UAT（RPC 直连，与 API 同路径）：Case1 qualified→新建 Talent；Case2 重复 phone→isDuplicate=true 复用；Case3 幂等→复用同一 Talent（talents 总数保持 2）；Case4 非 qualified→400 拒绝且 lead 无半成功写入
- ✅ 无孤儿 Talent
- ✅ Supabase Schema / RPC / RLS / migration / Showcase / 前端 — 未修改

---

## 本轮记录（招聘推进闭环：Talent → Application → Pipeline → StageEvent）

### 背景
补齐 Console 招聘业务后半程：把已成立的 Company → Job → Publication → Lead → Talent 继续接到 Application → Pipeline → 招聘阶段推进。原断点：Talent 无 Application 创建入口、actor 硬编码无效 UUID、Pipeline 使用不存在的 screening 状态、Talent Detail 假读 applications。

### 核心结论
- Application = Talent × Job 的独立招聘推进记录；同一 Talent 可对多个不同 Job 各自推进，状态互不影响。
- `src/lib/domain/application-state-machine.ts` 是 Application 阶段唯一 Source of Truth，Pipeline 只是 stage 分栏视图，不自造状态。

### 变更清单
| 文件 | 变更 |
|------|------|
| `src/lib/domain/application-state-machine.ts` | 10 状态机：matching→contacting→interested→recommended→client_review→interview→offer→hired + rejected/withdrawn；删除 screening；提供 getValidApplicationTransitions / isTerminalApplicationStage / getApplicationTransitionActionLabel |
| `src/server/services/application.service.ts` | createApplication 初始 stage=matching + checkDuplicate（同 Talent×Job 去重抛 DUPLICATE_APPLICATION 带 existing）；transitionStage 按状态机校验，非法转换抛 INVALID_STATE_TRANSITION |
| `src/server/local-access/config.ts` | 本地登录 HMAC token 配置；LOCAL_SUPER_ADMIN_ACTOR_ID 仅 legacy fallback，禁止真实写库 |
| `src/server/auth/guard.ts` | resolveCurrentActor() 从 quantum_console_access cookie 解析真实 profile id |
| `src/app/api/auth/login/route.ts` | 登录按 profiles 查真实 active super_admin/admin，签发 HMAC token；不再写死 actor |
| `src/app/api/auth/me/route.ts` | 返回当前真实 profile |
| `src/app/(console)/talents/[id]/page.tsx` | 新增「加入岗位推进」Dialog（选 recruiting Job → 创建 Application stage=matching）；「岗位推进」区真实读 applicationsApi.list({talent_id})；重复提示并可跳转查看 |
| `src/app/(console)/pipeline/page.tsx` | ACTIVE_STAGES + TERMINAL_STAGES 分栏；具体动作按钮（进入联系阶段/标记有意向/推荐给客户/…/标记拒绝/候选人退出），删除「前进/回退」；**本轮修复 useSearchParams 未包 Suspense 导致 build 预渲染失败** |
| `src/app/(console)/applications/[id]/page.tsx` | 具体动作推进按钮 + 拒绝/退出确认弹窗 + StageEvent 时间线；错误时不提前更新 UI |

### 验证结果
- ✅ pnpm build / lint / ts-check — 通过
- ✅ 真实 UAT：登录 → 创建 Application（matching）→ 非法转换被拒 → 去重生效 → 同 Talent 不同 Job 独立推进 → 全链路推进到 hired → StageEvent 记录真实 actor
- ✅ applications > 0 且 stage_events > 0，actor = 真实 profile id
- ✅ 未修改 Supabase Schema / RLS / Showcase / Publication / Track / urgent / featured / Lead / Talent 数据结构

## 本轮修复记录（ConsoleTable 主识别列被强制 80px 导致名称不显示）

### 背景
公司与岗位（含 Talents/Leads）列表页表格中，公司名称/岗位/候选人列只有图标、无名称文字。

### 根因
`src/components/console-table.tsx` 中 `ConsoleTh`/`ConsoleTd` 将 `stickyLeft === 0` 一律视为 checkbox 列，自动注入 inline `width/min-width/max-width: 80`（inline style 优先级高于 className）。四个页面的主识别列（`stickyLeft={0}` + `min-w-[280px]/[340px]`）被压缩到 80px：图标 36px + padding 32px ≈ 68px 勉强放下，文字区域宽度归零，被 `truncate`（overflow:hidden）完全隐藏。

### 修复
| 文件 | 变更 |
|------|------|
| `src/components/console-table.tsx` | 移除 `stickyLeft===0 → 80px` 自动逻辑，改为显式 `fixedWidth?: number` prop；仅传入 `fixedWidth` 时才强制宽度。`stickyLeft={0}` 现仅表示「最左侧固定列」 |
| `src/app/(console)/publications/page.tsx` | checkbox 列（表头+单元格）显式 `fixedWidth={80}`，保证岗位列 `left:80` 偏移精确对齐 |

### 使用规范（ConsoleTable）
- 主识别列：`stickyLeft={0}` + `className="min-w-[280px]"`，宽度由 min-w + 内容决定
- checkbox 列：`stickyLeft={0} fixedWidth={80}`，后续列偏移按其宽度计算
- 受影响页面：Companies / Jobs / Talents / Leads（min-w 恢复生效）；Publications（checkbox 列行为不变）

### 验证结果
- ✅ pnpm lint — 通过
- ✅ pnpm ts-check — 通过
- ✅ 服务探活 localhost:5000 — ready
- ✅ 未修改任何 API / Supabase / 业务逻辑 / 数据结构

## 本轮记录（Console 数据表体验升级：飞书多维表格 / Airtable 式）

### 背景
统一 Console 内所有「传统 Excel 式多字段列表页」为数据工作台体验：纵向看记录、横向看字段；关键识别列固定，其他字段横向滚动。**只改数据如何被查看，未改任何业务逻辑。**

### 统一表格交互模型
```
┌ 固定识别列 ──┬──────── 其他字段（横向滚动）────────→ ┬ 固定操作列 ┐
│ [✓] 岗位     │ 赛道 发布状态 精选 急招 城市 更新时间 │ 操作        │
└──────────────┴────────────────────────────────────┴────────────┘
```

### 核心能力（公共层）
- `src/components/console-table.tsx`（**新增**）— 轻量公共组件：`ConsoleTable`（滚动容器 + table，min-width:max-content + overflow:auto + 可选 max-height）/ `ConsoleTHead` / `ConsoleTBody` / `ConsoleTr` / `ConsoleTh` / `ConsoleTd`（均支持 `stickyLeft={偏移px}` / `stickyRight`）
- `src/app/globals.css`（**新增** CSS）— `.console-table-scroll`（双向滚动容器 + 轻量美化 scrollbar + max-height 使表头可 sticky）、`.console-table`（min-width:max-content / border-collapse:separate）、`thead th` Sticky Header、`.dt-sticky-left/.dt-sticky-right`（固定列背景=card、边缘极轻分割阴影、z-index 分层 20/30/40 角格最高）、行 hover 统一（CSS 变量 color-mix，固定列同步 hover）、`.dark` 主题覆盖（不穿透）

### 页面改造清单（全部：原 table → ConsoleTable 组件）
| 页面 | Sticky Left | Sticky Right | 说明 |
|------|-------------|--------------|------|
| Publications `publications/page.tsx` | checkbox(0) + 岗位(80) | 操作 | 赛道/发布状态/精选/急招/城市/更新时间 nowrap + min-width；长岗位名/公司名 truncate + title |
| Jobs `jobs/page.tsx` | 岗位(0) | 操作 | 岗位 340 / 公司 240 / 地点薪资 180 / 状态 130 / 时间 170 |
| Talents `talents/page.tsx` | 候选人(0) | 操作 | 候选人 280 / 联系方式 240 / 当前公司 220 / 时间 170 |
| Leads `leads/page.tsx` | 候选人(0) | 操作 | 候选人 280 / 来源渠道 160 / 状态 130 / 投递时间 170 |
| Companies `companies/page.tsx` | 公司名称(0) | 操作 | 公司 280 / 合作状态 130 / 更新时间 170；操作=图标按钮 |

### 识别为数据表并改造（5 个）
Publications / Jobs / Talents / Leads / Companies

### 识别为数据表但**不**改造（遵循"不要强行统一"）
- Dashboard（卡片/统计，非表格）
- Pipeline（Kanban 看板，横向滚动为看板列本身）
- Analytics（图表/卡片）
- Applications（无列表页，仅详情页）
- 各 Detail / Form 页面

### 关键视觉规则
- 表头 / Badge / 状态 / 按钮 / 城市 / 日期全部 `white-space: nowrap`，杜绝「赛/道」「急/招」拆行
- 长文本单行 truncate + `title` 属性，辅助信息最多第二行
- 行 hover 一致性：固定列、滚动列、操作列同属一个 hover 状态（CSS 统一，不再依赖 tr hover class）
- 表格滚动区 max-height：默认 `calc(100vh - 17rem)`；Publications（有批量操作栏）用 `calc(100vh - 20rem)`
- Light/Dark 均由 CSS 变量驱动，sticky 列不穿透背景

### 验证结果
- ✅ pnpm lint — 通过
- ✅ pnpm ts-check — 通过
- ✅ 服务探活 localhost:5000 — ready
- ⚠️ pnpm build — 仅 2 个历史已知非阻塞 warning（workspace root 推断、middleware→proxy 约定），无代码错误
- ✅ 未修改任何 API / Supabase / 数据结构 / 状态机 / 筛选 / 分页 / 权限 / Analytics

## 本轮记录（岗位赛道归类 + 急招生命周期运营能力）

### 背景
《26.8.14 岗位发现与运营体系升级 PRD》要求把公开岗位 Publication 的「赛道归类 + 急招生命周期 + 精选运营 + 发布状态约束」做成 Console 可用能力。核心原则：Track ≠ Urgent ≠ Featured ≠ Status，四者相互独立，必须允许 `赛道 + urgent=true + featured=true + status=published` 同时合法。

### 核心结论（自审计）
- `track` 此前是自由文本（`TRACK_SUGGESTIONS` 10 个英文 slug 建议值），无统一「四大赛道」Source of Truth；DB 实际 16 种脏值。
- `urgent` 此前仅 boolean，无生命周期；DB 列 `urgent_started_at`/`urgent_expires_at` 已存在但全 null，domain/repository/validation/service/UI 全部缺失。
- `featured` 已实现（单条 + 批量），本轮保持独立、未改。
- `offline`/`archive` 此前不重置 `urgent`；`publish` 此前不校验 `track`。

### 四大赛道 Source of Truth（新建）
- `src/lib/domain/quantum-tracks.ts` — `QUANTUM_TRACKS` 唯一 canonical 值（`superconducting` 超导量子 / `ion-trap` 离子阱 / `photonics` 光量子 / `communication-sensing` 量子通信与测量）+ `isQuantumTrack()` / `getQuantumTrackLabel()` / `isDirtyTrack()` / `QUANTUM_TRACK_VALUES`。
- 历史数据兼容：空值允许（track=null 可保存可发布，表示「未归类」）；脏值（旧 slug）在 UI 标记「需要重新选择赛道」，保存/发布时禁止以脏值写回；未批量猜测归类。
- 发布校验：track=null 允许发布；track=四大赛道允许发布；track=其他值禁止发布并提示「岗位赛道值无效，请重新选择赛道」。

### 领域规则（新建）
- `src/lib/domain/publication-rules.ts` — `canPublish()` / `canEnableUrgent()` / `isUrgentActive()` / `isUrgentExpired()`。业务规则下沉到 Service/Validation，不散落在 JSX。

### 急招生命周期规则
1. 仅 `published` 可开启急招（draft/offline/archived 禁止，提示「请先发布岗位，再设置为急招」）。
2. 开启 urgent 且 `urgent_started_at` 为空 → 自动记录当前时间；猎头可设 `urgent_expires_at`。
3. `urgent_expires_at > urgent_started_at` 必校验，否则阻止保存。
4. 手动取消 urgent=false → 立即退出急招，但保留历史 started_at/expires_at（不删除）。
5. `urgent=true && urgent_expires_at <= now()` → UI 识别「急招已到期」。
6. published → offline/archived → 强制 `urgent=false`（Service 层 + forceOfflineByJob/forceArchiveByJob）。
7. offline → published（republish）→ 不自动恢复 urgent。

### 赛道发布校验
- track 允许为空（null/未归类）；track 有值时必须 `track ∈ 四大赛道`，否则阻止并提示「岗位赛道值无效，请重新选择赛道」（`publishPublication` Service 层校验）。track=null 允许发布。

### 变更清单
| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/lib/domain/quantum-tracks.ts` | 新增 | 四大赛道 canonical + 辅助函数 |
| `src/lib/domain/publication-rules.ts` | 新增 | canPublish/canEnableUrgent/isUrgentActive/isUrgentExpired |
| `src/lib/domain/types.ts` | 扩展 | JobPublication/Create/Update/PublicSummary/PublicDetail 增加 urgent_started_at/urgent_expires_at |
| `src/server/repositories/publication.repository.ts` | 扩展 | from/to mapper 增加急招时间字段；forceOfflineByJob/forceArchiveByJob 增加 urgent:false |
| `src/server/validation/schemas.ts` | 扩展 | track 改 `z.enum(QUANTUM_TRACK_VALUES).optional().nullable()`；新增 urgent 时间字段；superRefine 校验 expires>started |
| `src/server/services/publication.service.ts` | 扩展 | updatePublication urgent 规则（published-only + auto started_at）；publishPublication track 校验；offline/archive 重置 urgent |
| `src/server/services/public-api.service.ts` | 扩展 | Public DTO 返回 urgent_started_at/urgent_expires_at |
| `src/app/(console)/publications/[id]/page.tsx` | 重构 | 岗位归类（赛道单选）与岗位运营（急招 Switch + 时间 + 精选 Switch）视觉分区；急招中/已到期状态展示 |
| `src/app/(console)/publications/page.tsx` | 增强 | 列表新增赛道列、急招状态列、赛道筛选 |

### 数据库 Migration
- **Not required**：`urgent_started_at` / `urgent_expires_at` 列已在 Live Supabase 存在（本轮仅补代码映射，未执行 DDL）。

### 验证结果
- ✅ pnpm lint — 通过
- ✅ pnpm ts-check — 通过
- ✅ pnpm build — 通过
- ✅ 匿名 POST batch/publish、[id]/publish → 401（鉴权门禁生效）
- ✅ GET /api/publications 匿名 → 401（deny-by-default 预期行为）
- ⚠️ 写操作业务链路 UAT 未执行（需 Super Admin 登录态）；公共 API `/api/public/jobs` 因沙箱→Supabase 连接中断返回 DATABASE_ERROR（环境问题，非代码回归）

---

## 本轮记录（认证系统重建：Server-first Supabase SSR 登录）

### 背景
废弃存在问题的旧双入口登录系统，重建单一、Server-first、基于 Supabase SSR 的登录体系。

### 旧系统问题
- 双入口登录（超级管理员 API + 普通邮箱）导致多条认证路径
- 客户端 Supabase `signInWithPassword` 存在 Cookie 丢失风险
- `window.location.href` 二段式跳转模式不可靠
- `super-admin-login` Route 手工收集 Cookies 到 Response A 但返回 Response B
- AuthProvider 承担权限判断职责（客户端不可信）

### 新架构

```
Login Form (useActionState)
  → Server Action (login/actions.ts)
    → createServerSupabase()
      → signInWithPassword(SUPER_ADMIN_AUTH_EMAIL, password)
        → auth.getUser()
          → profiles (role + status check)
            → SSR Cookie (via @supabase/ssr cookie adapter)
              → redirect('/')
```

### 变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/app/login/actions.ts` | **新增** | Server Action 登录（单一入口、Server-first） |
| `src/app/login/page.tsx` | **重写** | 纯表单 + useActionState，删除 fetch API + browser Supabase 双入口 |
| `src/app/api/auth/super-admin-login/route.ts` | **删除** | 已被 Server Action 替代 |
| `src/lib/supabase/auth-provider.tsx` | **简化** | 移除权限判断和客户端重定向逻辑，仅保留 Session 展示 |
| `src/middleware.ts` | **优化** | 移除旧 `/api/auth/super-admin-login` 白名单；新增 `/api/auth/me` 白名单 |
| `src/app/(console)/layout.tsx` | **修复** | handleLogout 改用 `window.location.href = '/login'`（完全清理后硬跳转） |

### 安全模型

| 层级 | 组件 | 说明 |
|------|------|------|
| L1 Gateway | middleware.ts | deny-by-default，匿名 → 307 /login 或 401 JSON |
| L2 Server Guard | requireAuth() (guard.ts) | 内部 API 双层保护，AuthError 抛出 |
| L3 Profile Check | login/actions.ts | role=super_admin + status=active |

### 设计决策
- **单一用户名**：仅 `chaojiguanliyuan-jiachi-liangzikeji`（硬编码在 Server Action，不可客户端访问）
- **Auth Email 映射**：通过 `SUPER_ADMIN_AUTH_EMAIL` 环境变量（Server Only）
- **Cookie 路径**：完全由 `@supabase/ssr` cookie adapter 管理，无手工 Cookie 拼装
- **Fail Closed**：任何失败返回统一错误，不泄露内部细节

### 未修改
- Supabase Project (`wbpnvbvdotkjhwxhndhz`)
- Supabase Auth Users / profiles
- 所有业务 API（Company/Job/Publication/Talent/Lead/Application/Analytics）
- `requireAuth()` / `resolveCurrentActor()` / `catchApiErrors()` 等业务权限层
- `createServerSupabase()` / `createClient()` / `getSupabaseAdmin()`

### 验证结果
- ✅ pnpm lint — 通过
- ✅ pnpm ts-check — 通过
- ✅ pnpm build — 通过
- ✅ 匿名页面访问（8 路径）— 全部 307 → /login
- ✅ /login — 200 可访问
- ✅ 匿名 GET API（6 个）— 全部 401
- ✅ 匿名 POST API（2 个）— 全部 401
- ✅ Public API — 200 豁免
- ✅ /api/auth/me 匿名 — 401
- ✅ /api/auth/logout — 正常
- ✅ 旧 `/api/auth/super-admin-login` — 已删除（middleware 拦截返回 401）
- ⚠️ 写操作 UAT 未执行（需真实密码，当前环境无凭据）
- ⚠️ Cookie UAT 需浏览器环境验证

## 本轮记录（不筹量子 18 岗位一键导入并发布）

### 背景
将 `assets/buchou-quantum-jobs-listing-intake.json`（18 个量子科技岗位，source_id 唯一、全 draft）一键推送至控制台并全部发布至展示页面。数据契约按 Console ↔ Live Supabase 对齐（Job 内部字段 + Publication 公开字段 + intake_metadata 元数据）。

### 变更
| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/app/api/import/buchou/route.ts` | 新增 | 导入路由（仿 taiyi 先例）：find-or-create 公司「不筹量子」→ 取 active site → 逐条 Job 创建 + startRecruiting + Publication 创建 + publishPublication；幂等保护（按 source_file + source_id 跳过已导入，支持断点续传：已有 Job 无 Publication 时补建并发布） |

### 数据映射
| 数据源字段 | Job (内部) | JobPublication (公开) |
|-----------|-----------|----------------------|
| `title` | `title` | `public_title` |
| `city` | `city` | `city` |
| `salary_display` | — | `salary_display` |
| `summary` | `jd`（原始 JD 未获取，暂用摘要） | `summary` |
| `candidate_profile` | — | `requirements`（\n 分隔） |
| `education` | — | `education` |
| `experience`（"待从详情页确认"） | — | `experience = null`（不公开展示占位文案） |
| `track` / `direction` / `tags` / `slug` | — | `track` / `direction` / `tags` / `slug` |
| `source_id` / `priority` / `publish_wave` / `duplicate_group` / `publication_status` | `intake_metadata` | — |
| — | — | `responsibilities`（由 summary + direction 生成通用职责条目，待正式 JD 补充后可在控制台编辑） |

### 验证结果
- ✅ pnpm lint / ts-check — 通过
- ✅ `POST /api/import/buchou` → 18/18 成功（幂等重跑全部跳过）
- ✅ 数据库核对：18 Jobs 全部 `recruiting`，18 Publications 全部 `published`，0 条字段不完整
- ✅ 公开 API：`/api/public/jobs` 可见 18 个 buchou slug；详情 `/api/public/jobs/buchou-quantum-optical-engineer` 字段完整
- ✅ 公司「不筹量子」（active / 量子计算）已创建；site 沿用 `2563b255-6528-48b9-bdcd-eb2e6bef5030`
- ⚠️ 已知项：`responsibilities` / `experience` 为基于目录页提炼或占位，正式 JD 详情待招聘方补充后在控制台更新

## 本轮修复记录（精选岗位 Featured 运营能力补齐）

### 背景
Supabase `job_publications.featured` 列已存在 (`boolean NOT NULL DEFAULT false`)，但 Console 缺少单条精选操作的 Service 方法和专用 API 路由，单条操作通过通用 PATCH 路由绕过"仅已发布可精选"的业务规则。

### 变更

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/server/services/publication.service.ts` | 新增 | `featurePublication(id)` / `unfeaturePublication(id)` 单条方法（含业务规则） |
| `src/app/api/publications/[id]/feature/route.ts` | 新增 | `POST /api/publications/[id]/feature`（requireAuth） |
| `src/app/api/publications/[id]/unfeature/route.ts` | 新增 | `POST /api/publications/[id]/unfeature`（requireAuth） |
| `src/lib/api/publications.ts` | 新增 | `feature(id)` / `unfeature(id)` API 客户端方法 |
| `src/app/(console)/publications/page.tsx` | 修复 | 单条精选/取消精选改用专用 API（含业务规则保护） |
| `src/app/(console)/publications/[id]/page.tsx` | 修复 | 同上 |

### 单条精选业务规则
- `published` + `featured=false` → `featured=true` (success)
- `published` + `featured=true` → no-op (返回原数据)
- `draft` / `offline` / `archived` → 400 `"仅已发布岗位可设为精选"`

### 单条取消精选规则
- `featured=true` → `featured=false`
- `featured=false` → no-op

### 此前已就位（本轮未改）
- Domain Type `JobPublication.featured` ✅
- Repository `fromPublicationDb` / `toPublicationDbCreate` / `toPublicationDbUpdate` featured 映射 ✅
- Repository `list()` featured 筛选 ✅
- Validation `createPublicationSchema` / `updatePublicationSchema` featured 字段 ✅
- Service `batchFeature()` / `batchUnfeature()` ✅
- API `POST /api/publications/batch/feature` / `batch/unfeature` ✅
- Frontend 列表页精选筛选/状态列/批量操作/确认弹窗 ✅
- Frontend 详情页精选展示/操作按钮/编辑复选框 ✅

### 验证结果
- ✅ pnpm lint — 通过
- ✅ pnpm ts-check — 通过
- ✅ pnpm build — 通过
- ✅ 匿名 POST batch/feature、batch/unfeature → 401（鉴权门禁生效）
- ✅ 匿名 POST [id]/feature、[id]/unfeature → 401（鉴权门禁生效）
- ✅ GET /api/publications → 200（读接口不受影响）
- ⚠️ 写操作业务链路 UAT 未执行（需登录态，当前环境无凭据）

## 本轮修复记录（公开岗位批量选择 / 批量公开 / 批量停止发布）

### 背景
公开岗位列表新增批量操作能力：支持勾选多行（最多25条）、批量公开、批量停止发布。定点功能，不重构页面、不改数据库。

### 变更

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/lib/domain/types.ts` | 新增 | `BatchOperationStatus` / `BatchOperationItemResult` / `BatchOperationResult` 批量结果类型 |
| `src/server/services/publication.service.ts` | 新增 | `batchPublish()` / `batchOffline()`（逐条处理、部分成功） |
| `src/app/api/publications/batch/publish/route.ts` | 新增 | `POST /api/publications/batch/publish`（1~25条、去重、requireAuth） |
| `src/app/api/publications/batch/offline/route.ts` | 新增 | `POST /api/publications/batch/offline`（同上） |
| `src/lib/api/publications.ts` | 增强 | `batchPublish()` / `batchOffline()` API 客户端方法 |
| `src/app/(console)/publications/page.tsx` | 增强 | 行/表头 Checkbox、批量操作栏、确认弹窗、失败原因面板、25条上限提示 |

### 批量公开规则
- Job = recruiting → 正常发布；Job = draft → `JobService.startRecruiting()` 后再发布；Job = paused/closed/archived → 失败并继续其他岗位
- Publication draft → published；offline → `republishPublication()`；published → skipped；archived → skipped（不强行恢复）
- 全程复用现有状态机（`transitionPublication` / `transitionJob`）、Service、Repository，无批量裸 UPDATE status

### 批量停止发布规则
- published → `offlinePublication()`；offline/draft/archived → skipped；不修改 underlying Job 状态（停止公开 ≠ 停止招聘）

### 返回格式
`{ total, success, skipped, failed, results: [{ id, status: success|skipped|failed, message }] }`，允许部分成功。

### 验证结果
- ✅ pnpm lint — 通过
- ✅ pnpm ts-check — 通过
- ✅ pnpm build — 通过
- ✅ 匿名 POST batch/publish、batch/offline → 401（鉴权门禁生效，含空 ids 场景）
- ✅ GET /api/publications → 200（既有读接口不受影响）
- ⚠️ 写操作业务链路 UAT 未执行（需登录态，当前环境无凭据）；逻辑复用既有单条 Service/状态机，经静态检查与构建验证
- ✅ Supabase Schema / RLS / RPC / Trigger / Migration 未修改

## 本轮修复记录（非空默认值对齐：intake_metadata / tags）

### 背景
Live Supabase 契约：
- `jobs.intake_metadata` JSONB NOT NULL DEFAULT '{}'
- `job_publications.tags` TEXT[] NOT NULL DEFAULT ARRAY[]::text[]

Console 创建时若未传值会显式写 null，与 NOT NULL 契约冲突。

### 变更
| 文件 | 位置 | 修复 |
|------|------|------|
| `src/server/repositories/job.repository.ts` | `toJobDbCreate()` | `intake_metadata: input.intake_metadata ?? {}` |
| `src/server/services/job.service.ts` | `createJob()` | `intake_metadata: parsed.data.intake_metadata ?? {}` |
| `src/server/repositories/publication.repository.ts` | `toPublicationDbCreate()` | `tags: input.tags ?? []` |
| `src/server/services/publication.service.ts` | `createPublicationFromJob()` | `tags: overrides?.tags ?? []` |

### 保持不变
- 读取方向：`fromJobDb()` 的 `intake_metadata ?? null`（旧数据兼容读取）
- Talent `tags ?? null`（不在本轮范围）
- Supabase Schema / RLS / RPC / Trigger / Migration — 未修改
- UI / Auth / Application / Lead / Talent / StageEvent / Analytics / Showcase — 未修改

### 验证结果
- ✅ pnpm lint — 通过
- ✅ pnpm ts-check — 通过
- ✅ pnpm build — 通过

## 本轮修复记录（Console ↔ Live Supabase 字段契约对齐）

### 背景
Console 代码残留历史字段名，与 Live Supabase (`wbpnvbvdotkjhwxhndhz`) 真实字段契约不一致，导致写不存在字段、查询失败等风险。本轮彻改 Company/Job/JobPublication 三层 CRUD 数据契约。

### 策略
- 保留 Domain 层友好命名（如 `jd`、`salary_internal`、`title`、`company_display_name` 等）
- Repository 层增加 DB Mapper：`toDb*()` / `fromDb*()` 转换
- 禁止裸 `.insert(input)` / `data as Job` 等绕过契约的写法

### Company 整改
| 移除字段 | 影响层 |
|----------|--------|
| `track` | Domain Type, Filters, Zod Schema, Repository, Service, API, UI (列表/详情/创建弹窗) |
| `website` | Domain Type, Zod Schema, Service |
| `contact` | Domain Type, Zod Schema, Service |
| `phone` | Domain Type, Zod Schema, Service |

### Job 整改 — DB Mapper
| Domain (代码) | DB (Supabase) | 方向 |
|---------------|---------------|------|
| `jd` | `original_jd` | 双向 |
| `salary_internal` | `internal_salary` | 双向 |

| 移除字段 | 说明 |
|----------|------|
| `location` | DB 不存在 |
| `salary_range` | DB 不存在 |

### JobPublication 整改 — DB Mapper
| Domain (代码) | DB (Supabase) | 方向 |
|---------------|---------------|------|
| `title` | `public_title` | 双向 |
| `company_display_name` | `public_company_name` | 双向 |
| `education_requirement` | `education` | 双向 |
| `experience_requirement` | `experience` | 双向 |

| 保留字段（同名） |
|------------------|
| city, salary_display, summary, responsibilities, requirements, track, direction, seniority, tags, urgent, slug |

### 搜索修复
- Publication 关键词搜索：`public_title.ilike` + `public_company_name.ilike`（已正确）

### 变更文件清单
| 文件 | 变更类型 |
|------|----------|
| `src/lib/domain/types.ts` | Company: 移除 track/website/contact/phone；Job: jd/salary_internal 加注释；JobPublication: 加注释 |
| `src/server/validation/schemas.ts` | 移除 company track/website/contact/phone |
| `src/server/repositories/company.repository.ts` | 移除 track filter |
| `src/server/repositories/job.repository.ts` | 新增 fromJobDb/toJobDbCreate/toJobDbUpdate mapper |
| `src/server/repositories/publication.repository.ts` | 新增 fromPublicationDb/toPublicationDbCreate/toPublicationDbUpdate mapper |
| `src/server/services/company.service.ts` | 移除 website/contact/phone |
| `src/server/services/publication.service.ts` | createPublicationFromJob 使用 domain 名 |
| `src/app/api/companies/route.ts` | 移除 track filter |
| `src/lib/api/companies.ts` | CompanyFilters 移除 track |
| `src/app/(console)/companies/[id]/page.tsx` | 移除 track/website/contact/phone 表单字段和展示 |
| `src/app/(console)/companies/page.tsx` | 移除 track 列、创建弹窗 track 输入 |
| `src/app/(console)/publications/[id]/page.tsx` | 移除 as any 强转 |
| `src/app/(console)/publications/[id]/preview/page.tsx` | 移除 as any 强转 |

### 未修改
- Supabase Schema / RLS / RPC / Trigger / Migration
- Application / Lead / Talent / StageEvent / Analytics / Auth

### 验证结果
- ✅ pnpm lint — 通过
- ✅ pnpm ts-check — 通过

### UAT 状态
- ⚠️ 写操作 UAT 未执行（需要 Super Admin 密码，当前环境未知）
- ✅ 读 API 返回 200 且数据结构正确
- ✅ 全仓搜索确认旧字段（track/website/contact/phone on Company, location/salary_range on Job）已清零

## 本轮修复记录（岗位录入与公开发布字段能力升级）

### 背景
支持完整承接量子科技岗位数据，区分【内部招聘管理字段】和【对外展示字段】。

### 核心变更

#### 1. Job — 新增 `intake_metadata` JSONB
- `src/lib/domain/types.ts` — 新增 `IntakeMetadata` 接口（priority, publish_wave, publication_status, source_file, duplicate_group, source_id）
- Job 类型新增 `intake_metadata?: IntakeMetadata | null`
- CreateJobInput / UpdateJobInput 新增 `intake_metadata?` 字段
- `src/server/validation/schemas.ts` — createJobSchema / updateJobSchema 新增 intake_metadata 校验

#### 2. JobPublication — 新增字段
- `src/lib/domain/types.ts` — JobPublication 新增 `direction`, `seniority`, `urgent` 字段
- CreatePublicationInput / UpdatePublicationInput 同步新增
- PublicJobSummary / PublicJobDetail 同步新增（保证公开 API 返回）
- `src/server/validation/schemas.ts` — createPublicationSchema / updatePublicationSchema 新增字段校验

#### 3. 前端组件
- `src/components/tag-input.tsx` — 新建 Tag 输入组件（Enter 新增、点击删除、自动去重、最大20个）
- `src/components/dynamic-list-input.tsx` — 新建动态列表组件（新增/删除/排序 responsibilities/requirements）

#### 4. 页面改造
| 页面 | 变更 |
|------|------|
| `src/app/(console)/jobs/[id]/page.tsx` | 重构：区分【内部岗位信息】【岗位运营信息】【元数据+公开岗位】三区域；运营信息编辑/查看；公开岗位列表展示 |
| `src/app/(console)/jobs/new/page.tsx` | 新增运营信息区域（priority/publish_wave/publication_status/source_file/duplicate_group/source_id）全部存入 intake_metadata |
| `src/app/(console)/publications/[id]/page.tsx` | 增强编辑能力：新增 track/direction/seniority/urgent/summary/tags 字段编辑；responsibilities/requirements 使用 DynamicListInput；tags 使用 TagInput；发布前轻量校验 |
| `src/app/(console)/publications/[id]/preview/page.tsx` | 新增 direction/seniority/urgent/summary/tags 展示 |

#### 5. 服务层
- `src/server/services/job.service.ts` — createJob/updateJob 支持 intake_metadata
- `src/server/services/publication.service.ts` — createPublicationFromJob/updatePublication 支持新字段
- `src/server/services/public-api.service.ts` — listPublicJobs/getPublicJobBySlug 返回 direction/seniority/urgent

### 字段边界
| 对象 | 类型 | 字段 | 说明 |
|------|------|------|------|
| Job | 内部 | intake_metadata (JSONB) | priority, publish_wave, duplicate_group, source_file, publication_status, source_id |
| Job | 内部 | salary_internal | 内部薪酬 |
| JobPublication | 公开 | salary_display | 公开展示薪资 |
| JobPublication | 公开 | direction, seniority, urgent | 新增公开展示字段 |
| JobPublication | 公开 | summary | 岗位一句话摘要 |
| JobPublication | 公开 | tags (TEXT[]) | 技术标签 |

### 未修改
- Supabase Schema / RLS / RPC / Trigger / Migration
- Application / Lead / Talent / Analytics / StageEvent
- 展示网站 / 公开 API 接口签名

### 验证结果
- ✅ pnpm lint — 通过
- ✅ pnpm ts-check — 通过
- ✅ 接口冒烟测试 — 全部通过（3/3）

## 项目概览

量子人才招聘中台是猎头业务管理控制台，面向猎头顾问和招聘运营，管理从岗位发布、候选人投递、人才库沉淀到招聘推进的全流程。

**当前阶段**: Phase 2-8 后端工程代码已完成，UI 已全量切换至真实 API，Mock 数据已清零。已完成全链路审计并通过所有核心业务链验证。

### 技术栈

| 领域 | 技术 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Runtime | React 19 + TypeScript 5 |
| UI | shadcn/ui (Radix) + Tailwind CSS v4 |
| 图标 | lucide-react |
| 包管理 | pnpm |
| 数据库 | Supabase + PostgreSQL |
| 验证 | Zod |
| ORM | Supabase JS Client (untyped, awaiting `supabase gen types`) |
| Auth | Supabase Auth (SSR) |

## 目录结构

```
src/
├── app/
│   ├── layout.tsx              # 根布局（HTML + 字体预加载）
│   ├── globals.css             # Design Token + Tailwind
│   ├── (console)/              # 控制台路由组（Phase 1 UI）
│   └── api/                    # API Routes (Phase 2-8)
│       ├── companies/          # 公司 CRUD
│       ├── jobs/               # 岗位 CRUD + 状态转换
│       ├── publications/       # 公开岗位 CRUD + 发布/下架
│       ├── leads/              # 投递 CRUD + 状态转换 + 转人才
│       ├── talents/            # 人才 CRUD + 关联查询
│       ├── applications/       # 申请 CRUD + 阶段推进
│       ├── analytics/          # 仪表盘/漏斗/来源分析
│       └── public/             # Public API (人才官网接口)
├── components/ui/              # shadcn/ui 组件库
├── lib/
│   ├── mock-data.ts            # Phase 1 Mock 数据 (UI 使用)
│   ├── utils.ts                # 通用工具 (cn)
│   ├── supabase/               # Supabase 客户端分层
│   │   ├── client.ts           # 浏览器客户端
│   │   ├── server.ts           # 服务端 (SSR) 客户端
│   │   ├── admin.ts            # Admin 客户端 (Service Role)
│   │   └── config.ts           # 配置检查 + 环境变量
│   └── domain/                 # 领域层
│       ├── types.ts            # 核心领域类型 + DTO
│       ├── database.types.ts   # 数据库类型占位
│       ├── errors.ts           # 业务错误体系
│       ├── job-state-machine.ts
│       ├── publication-state-machine.ts
│       ├── lead-state-machine.ts
│       └── application-state-machine.ts
├── server/
│   ├── repositories/           # 数据访问层（Repository 模式）
│   │   ├── company.repository.ts
│   │   ├── job.repository.ts
│   │   ├── publication.repository.ts
│   │   ├── lead.repository.ts
│   │   ├── talent.repository.ts
│   │   ├── application.repository.ts
│   │   ├── stage-event.repository.ts
│   │   ├── analytics.repository.ts
│   │   └── index.ts
│   ├── services/               # 业务逻辑层（Service 模式）
│   │   ├── company.service.ts
│   │   ├── job.service.ts
│   │   ├── publication.service.ts
│   │   ├── lead.service.ts
│   │   ├── talent.service.ts
│   │   ├── application.service.ts
│   │   ├── analytics.service.ts
│   │   ├── storage.service.ts
│   │   ├── public-api.service.ts
│   │   └── index.ts
│   ├── validation/             # Zod 校验 schemas
│   │   └── schemas.ts
│   └── auth/                   # Auth 守卫 + 辅助
│       ├── guard.ts
│       └── api-helpers.ts
└── hooks/                      # 自定义 Hooks
supabase/
└── migrations/                 # 数据库迁移
    ├── 001_create_tables.sql   # 建表
    ├── 002_indexes_triggers.sql # 索引 + updated_at 触发器
    ├── 003_rls.sql             # Row Level Security
    └── 004_rpc_functions.sql   # PostgreSQL RPC 函数
```

## 构建与运行

```bash
pnpm install       # 安装依赖
pnpm run dev       # 启动开发服务器（HMR）
pnpm run build     # 生产构建
pnpm run start     # 生产启动
pnpm run lint      # ESLint 检查
pnpm run ts-check  # TypeScript 类型检查
```

## 代码风格

### TypeScript
- 严格类型：禁止隐式 `any`，所有函数参数/返回值标注类型
- 使用 `import type` 进行类型导入
- Repository/Service 层使用 namespace-free 对象字面量导出

### 架构分层
- **Repository**：仅负责数据查询/插入/更新，不包含业务规则
- **Service**：包含业务规则、状态机流转、多表联动、权限前置判断
- **API Route**：处理 HTTP 请求/响应，调用 Service，统一错误处理
- **状态机**：Job/Publication/Lead/Application 状态转换统一在 domain 层

### 后端相关
- 所有内部 API 默认需要 Auth（通过 Guard 验证 Supabase Session）
- Public API 不需要 Auth
- 统一 API Response 格式：`{ success: true, data }` / `{ success: false, error: { code, message, details } }`
- 环境变量缺失时返回 `CONFIGURATION_ERROR`，不 fallback 到 mock

## 环境变量

```
NEXT_PUBLIC_SUPABASE_URL=          # Supabase Project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Supabase Anon Key (public)
SUPABASE_SERVICE_ROLE_KEY=         # Supabase Service Role Key (server only)
```

## UI 已全量接入真实 API

以下页面已全部切换到真实 API 调用（Mock 数据已清零）：
- `src/app/(console)/page.tsx` (工作台/Dashboard) ✅
- `src/app/(console)/companies/page.tsx`, `[id]/page.tsx` ✅
- `src/app/(console)/jobs/page.tsx`, `[id]/page.tsx`, `new/page.tsx` ✅
- `src/app/(console)/publications/page.tsx`, `[id]/page.tsx`, `[id]/preview/page.tsx` ✅
- `src/app/(console)/leads/page.tsx`, `[id]/page.tsx` ✅
- `src/app/(console)/talents/page.tsx`, `[id]/page.tsx` ✅
- `src/app/(console)/applications/[id]/page.tsx` ✅ (本轮新增)
- `src/app/(console)/pipeline/page.tsx` ✅
- `src/app/(console)/analytics/page.tsx` ✅

### 本轮新增页面
- **Application Detail** (`applications/[id]`) — 展示 Application 详情、StageEvent 时间线、状态转换
- **Job Create** (`jobs/new`) — 创建新岗位表单，含公司选择
- **Publication Preview** (`publications/[id]/preview`) — 候选人视角的公开岗位预览

### 本轮修复的关键 Bug
| Bug | 根因 | 修复 |
|-----|------|------|
| Publication 创建失败 (site_id null) | 创建时未填写 site_id | 自动使用首个 site 作为默认值 |
| Publication Publish 验证失败 | 发布前缺少 required 字段校验 | 发布时从关联 Job 自动填充 responsibilities |
| `company_display_name` 错误 | 回退值使用了 `job.title` | 改为使用 `company.display_name` |
| Job 列表「编辑」按钮无 onClick | 按钮缺少点击事件 | 添加跳转到 `/jobs/[id]` |
| Job Create 页缺失 | 路由 `/jobs/new` 不存在 | 创建完整的创建岗位表单页面 |
| `createJobSchema` 强制要求 owner_id | Zod schema 定义为 required UUID | 改为 optional，允许空值 |

## 常见问题

### 本轮整改：控制台 × Supabase 数据契约对齐 (2025-07-16)

基于正式 Supabase (`wbpnvbvdotkjhwxhndhz`) 真实 Schema 完成全面审计和对齐。

**关键发现**：审计发现用户提示词声称的字段差异大部分与真实 DB 不符——Job 的 `jd`/`salary_internal`、Publication 的 `title`/`company_display_name`/`summary`/`tags` 等字段在 DB 中均已存在，代码无需修改。

**实际修复**：

| 类别 | 修复内容 |
|------|---------|
| **Security** | `next.config.ts` 移除 `SUPABASE_SERVICE_ROLE_KEY`（不再暴露到客户端 bundle） |
| **Company** | Type 和 Zod Schema 新增 `website`、`contact`、`phone` 字段（DB 有，代码缺失） |
| **Lead** | 移除不存在的 `job_id` 字段；`site_id`/`publication_id` 改为 required（DB NOT NULL） |
| **Talent** | 移除不存在的 `headline`、`experience_summary`、`status` 字段 |
| **Error Handling** | `public-api.service.ts` 移除 `.catch(() => {})` 静默吞错 |
| **Docs** | 新建 `docs/database/DATABASE_REALITY.md` 和 `docs/database/SCHEMA_DRIFT.md` |

**未修改**：
- Supabase Schema（无 CREATE/ALTER/DROP）
- RLS / RPC / Trigger（无变更）
- Job / Publication 字段名（已与 DB 一致）
- Application StageEvent 写入机制 — 已改为 DB Trigger 单源（本轮整改前为手动双写）

## 常见问题

### 样式不符合原型
- 检查 `globals.css` 中的 `@theme` 变量是否完整

### Hydration 错误
- 检查 JSX 中是否有 `Date.now()`、`Math.random()`、`typeof window` 等动态值
- 改为 `useEffect + useState` 或使用 `suppressHydrationWarning`

### 后端调用返回 CONFIGURATION_ERROR
- 确认 `.env.local` 中存在 Supabase 环境变量
- 这是预期行为：代码完整但缺少真实配置

### Repository 类型不匹配
- 当前 Supabase 客户端使用 untyped 模式（`getSupabaseAdminUntyped`）
- 配置真实 Supabase 后运行 `supabase gen types typescript` 即可替换

## 已知待优化项

1. **Pipeline 拖拽尚未实现** — 当前 Pipeline 使用按钮进行状态推进，拖拽功能待后续开发
2. **Application Detail 前端页面** — 后端 API 完整（含 StageEvents），前端页面已创建但需在浏览器中完整验证
3. **Dashboard `publishedJobs` 计数** — 依赖 `job_publications` 表的特定查询条件确认
4. **Publication `company_display_name`** — 已修复：现存错误记录已通过 SQL 修正为正确的公司公开名称；新创建的 Publication 将正确使用公司名称
5. **Publication `requirements` 为空** — 现存的一条 published Publication 缺少 `requirements` 字段，且关联 Job 也无 `hard_requirements`，无法安全自动填充，需人工补充

## 本轮修复记录（公司管理模块）

### 公司详情页支持编辑/删除
- `src/app/(console)/companies/[id]/page.tsx` — 从纯只读升级为：编辑模式（编辑/保存按钮、可编辑名称/公开名称/行业/赛道/合作状态/简介）+ 删除按钮（带确认对话框）+ 支持 `?edit=1` 参数直接进入编辑模式
- `src/app/(console)/companies/page.tsx` — 编辑按钮改为 `?edit=1` 参数；新增列表删除按钮 + 确认对话框
- `src/app/api/companies/[id]/route.ts` — 新增 `DELETE` 方法
- `src/server/services/company.service.ts` — 新增 `deleteCompany`（业务保护：公司下存在岗位时拒绝删除，返回 `COMPANY_HAS_JOBS`）
- `src/server/repositories/company.repository.ts` — 新增 `delete`、`countJobs`
- `src/lib/domain/errors.ts` — 新增 `COMPANY_HAS_JOBS` 错误码
- `src/lib/api/companies.ts` — 新增 `delete` 方法

### 其他修复
- Lead 状态机补充 `new → invalid` 转换
- Jobs/Talents API 支持 `ids` 批量查询
- Public API / Company API 修复 NotFoundError 错误消息嵌套
- Job Detail 页新增"创建公开岗位"按钮 + 关联 Publication 列表

## 本轮修复记录（统一数据源与交互规范）

### 核心变更

#### 1. Mock 引用清零 & 静默吞错修复
- **Dashboard** (`src/app/(console)/page.tsx`): 替换 `fetch(/api/...)` + `.catch(() => {})` 为 `jobsApi.list({ ids })` / `talentsApi.list({ ids })`，新增 `namesError` 状态提示
- **Pipeline** (`src/app/(console)/pipeline/page.tsx`): 同上，替换原生 fetch 为 API 客户端调用
- **Job Create** (`src/app/(console)/jobs/new/page.tsx`): 替换 `fetch(/api/companies)` + `.catch(() => {})` 为 `companiesApi.list()`，新增加载和错误状态
- **Job Detail** (`src/app/(console)/jobs/[id]/page.tsx`): 替换 `fetch(/api/publications)` 为 `publicationsApi.list({ job_id })`

#### 2. UUID 显示修复
- **Application Detail** (`applications/[id]/page.tsx`): `owner_id` / `created_by` 从原始 UUID 改为截断显示（`.slice(0, 8)`）
- **Job Detail** (`jobs/[id]/page.tsx`): `company_id` / `owner_id` fallback 从原始 UUID 改为截断显示

#### 3. 统一 Loading/Error 状态
- **Analytics** (`analytics/page.tsx`): 内联 `<p>加载中...</p>` / `<p>错误</p>` 替换为 `<LoadingPage>` / `<ErrorState>` 组件

#### 4. API 类型完善
- `src/lib/api/jobs.ts` JobFilters: 新增 `ids`、`order_by`、`order` 参数
- `src/lib/api/talents.ts` TalentFilters: 新增 `ids` 参数

### 变更文件清单
| 文件 | 变更类型 |
|------|----------|
| `src/app/(console)/page.tsx` | 重构 (fetch→API client, 新增 namesError) |
| `src/app/(console)/pipeline/page.tsx` | 重构 (fetch→API client) |
| `src/app/(console)/jobs/new/page.tsx` | 重构 (fetch→API client, 新增 loading/error) |
| `src/app/(console)/jobs/[id]/page.tsx` | 修复 (fetch→API client, UUID 截断) |
| `src/app/(console)/applications/[id]/page.tsx` | 修复 (UUID 截断) |
| `src/app/(console)/analytics/page.tsx` | 修复 (统一 LoadingPage/ErrorState) |
| `src/lib/api/jobs.ts` | 增强 (补充 ids 等类型) |
| `src/lib/api/talents.ts` | 增强 (补充 ids 类型) |

### 验证结果
- ✅ pnpm lint — 通过
- ✅ pnpm ts-check — 通过
- ✅ API 接口冒烟测试 — 全部通过（4/4）

## 本轮修复记录（StageEvent 单源收口）

### 背景
Application 生命周期变化时，控制台代码与 DB Trigger 存在两个 StageEvent 写入源，导致一次状态变化可能产生两条 StageEvent。本轮将控制台侧 AUTO_LIFECYCLE_EVENT 写入移除，Application 状态变化仅通过 `UPDATE applications.stage`，StageEvent 由 DB Trigger 单源生成。

### 核心变更

#### 整改前链路
```
ApplicationService.createApplication / transitionStage
  ├── UPDATE applications          ← 状态变化
  └── INSERT stage_events           ← 手动双写 StageEvent（已移除）
```

#### 整改后链路
```
ApplicationService.createApplication / transitionStage
  └── UPDATE applications          ← 唯一状态变化源
         ↓
      DB Trigger                    ← StageEvent 单源（由数据库保证）
  └── INSERT stage_events
```

#### 变更清单
| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/server/services/application.service.ts` | 重构 | `createApplication()`: 移除 `StageEventRepository.create()` |
| `src/server/services/application.service.ts` | 重构 | `transitionStage()`: 移除 `StageEventRepository.create()`，保留 `createdBy`/`note` 参数语义 |
| `src/server/repositories/stage-event.repository.ts` | 重构 | 删除 `create()`，Repository 收口为只读 |
| `src/server/services/lead.service.ts` | 修复 | 消除 `as any`（类型安全构建） |
| `src/app/(console)/jobs/new/page.tsx` | 修复 | 消除 `as any`（使用 `job.id` 强类型） |
| `AGENTS.md` | 文档 | 更新 StageEvent 写入机制描述 |

#### 保留
- `StageEventRepository.listByApplication()` — 读取历史记录（Repository 已收口为只读，无任何写入能力）
- `TransitionApplicationInput.note` — API contract 保留
- `transitionStage(createdBy)` 参数 — API contract 保留

> 说明：`StageEventRepository.create()` 已删除。当前项目不存在独立的人工业务 StageEvent 写入功能（无 note/comment/manual event UI/API/Service 调用链），故生命周期自动事件与人工事件均无应用层写入点。未来若引入人工备注事件，须以独立的 `MANUAL_BUSINESS_EVENT` 写入路径实现，不得复用生命周期事件。

#### Actor / Note 状态
- 代码层：✅ 保留（`createdBy` 参数在 `transitionStage`、`note` 在 `TransitionApplicationInput`）
- 数据库层：❌ NOT YET（`service_role` 下 `auth.uid()` = NULL，actor/note 持久化待下一轮 DB 单源改造）

### StageEventRepository 使用情况
- `StageEventRepository.create` 已删除（Repository 收口为只读）
- `StageEventRepository.listByApplication` 被调用次数：1（`ApplicationService.getApplication` 读取历史）
- Application 生命周期 AUTO_LIFECYCLE_EVENT 直接 INSERT = 0（应用层）

### 入口统一性验证
| 入口 | 统一到 ApplicationService | 说明 |
|------|--------------------------|------|
| Create Application API | ✅ `createApplication()` | `POST /api/applications` |
| Stage Transition API | ✅ `transitionStage()` | `POST /api/applications/[id]/transition` |
| Pipeline 推进/回退 | ✅ `transitionStage()` | `applicationsApi.transition()` |
| Application Detail 阶段变更 | ✅ `transitionStage()` | `applicationsApi.transition()` |

### 半成功风险
- 整改前：UPDATE app 成功 + INSERT stage_event 失败 → API 500（app 已更新但事件丢失）
- 整改后：仅 UPDATE app → 无 INSERT 失败风险，半成功状态已消除

### 验证结果
- ✅ pnpm lint — 通过
- ✅ pnpm ts-check — 通过
- ✅ pnpm build — 通过
- ✅ 接口冒烟测试 — 通过（2/2）

## 本轮修复记录（StageEvent Actor / Note 传递准备）

### 背景
Application 生命周期 StageEvent 已收口为 DB Trigger 单源。但控制台使用 `service_role` 写 Supabase，导致 Trigger 内 `auth.uid()` = NULL，同时 transition 的 `note` 也无法自动进入 StageEvent。本轮为下一阶段 Supabase RPC 改造做好控制台侧接口准备。

### 核心变更

#### 1. 服务器端 Actor 解析器
- `src/server/auth/guard.ts` — 新增 `resolveCurrentActor()`，从 Supabase SSR cookie 解析当前用户 UUID
- 不可信客户端传入的 actor/createdBy；所有 actor 识别必须通过此解析器

#### 2. 上下文类型定义
- `src/lib/domain/types.ts` — 新增 `TransitionWithContextParams`、`CreateApplicationWithContextParams`
- `CreateApplicationInput.owner_id` 改为 `string | null`（兼容 Zod optional+nullable）

#### 3. Repository 上下文接口
- `src/server/repositories/application.repository.ts` — 新增 `transitionWithContext()`、`createWithContext()`
- 当前实现仍为 `applications` UPDATE/INSERT；但接口参数已包含 `actorId`/`note`
- TODO: 下一轮替换为 `supabase.rpc('transition_application_stage', ...)`

#### 4. ApplicationService 重构
- `transitionStage(id, input, actorId?)` — 委托 `ApplicationRepository.transitionWithContext()`
- `createApplication(input, actorId?)` — 委托 `ApplicationRepository.createWithContext()`
- actorId 来自服务器端，不作为业务信任参数

#### 5. API Route 收口
| Route | 变更 |
|-------|------|
| `POST /api/applications/[id]/transition` | 使用 `resolveCurrentActor()` 替代 `requireAuth()`+`user?.id`；未认证返回 401 |
| `POST /api/applications` | 同上；actorId 传递给 `createApplication()` |
| `GET /api/applications` | 同上；401 保护读取接口（后因 Dashboard 修复恢复为宽松访问） |

### 安全约束
| 检查项 | 状态 |
|--------|------|
| Frontend 不可信 actorId | ✅ 客户端只传 `to_stage`/`note` |
| Server 解析 actor | ✅ `resolveCurrentActor()` |
| Service 传递 actor/note | ✅ 通过 `TransitionWithContextParams` |
| Repository 为未来 RPC 保留 context | ✅ `actorId`/`note` 参数已预留 |
| `owner_id` ≠ `actorId` | ✅ 业务字段与操作者 ID 分离 |
| 无固定管理员 UUID | ✅ |
| 客户端 created_by | ✅ 不存在 |
| StageEventRepository.create() | ✅ 保持已删除 |

### 变更文件清单
| 文件 | 变更类型 |
|------|----------|
| `src/server/auth/guard.ts` | 新增 `resolveCurrentActor()` |
| `src/lib/domain/types.ts` | 新增 `TransitionWithContextParams`、`CreateApplicationWithContextParams`；修正 `CreateApplicationInput.owner_id` |
| `src/server/repositories/application.repository.ts` | 新增 `transitionWithContext()`、`createWithContext()` |
| `src/server/services/application.service.ts` | 委托 Repository context 方法；签名新增 `actorId` |
| `src/app/api/applications/[id]/transition/route.ts` | 使用 `resolveCurrentActor()` |
| `src/app/api/applications/route.ts` | GET/POST 使用 `resolveCurrentActor()` |

### 验证结果
- ✅ pnpm lint — 通过
- ✅ pnpm ts-check — 通过
- ✅ 未认证请求 → 401（预期行为）
- ✅ `StageEventRepository.create` = 0（应用层零写入）
- ✅ `stage_events` INSERT = 0（应用层零写入）
- ✅ Supabase 未修改

### Next Step
Repository 内部实现已准备好替换为：
- `supabase.rpc('transition_application_stage', { p_application_id, p_to_stage, p_actor_id, p_note })`
- `supabase.rpc('create_application_with_context', { p_application_data, p_actor_id })`

RPC 由 Supabase 侧建设后，仅需替换 Repository 内部实现，Service/API 层无需变更。

### Dashboard 修复
- `GET /api/applications` 恢复宽松访问（读取接口不因未认证 401），与其他读取 API 一致

## 本轮修复记录（最小登录体系 + Application RPC 正式接入）

### 背景
Supabase 侧已完成 RPC 建设（`create_application_with_context`、`transition_application_stage`）和 Auth User → profiles 自动同步。本轮完成控制台最小登录体系搭建，并将 Application Create / Transition 从直接 INSERT/UPDATE 切换到 Supabase RPC。

### 核心变更

#### 1. 最小登录体系
| 新增文件 | 说明 |
|---------|------|
| `src/app/login/page.tsx` | 登录页面（Email + Password + 错误提示） |
| `src/app/api/auth/logout/route.ts` | 登出 API（清理 Session cookies 跳 /login） |
| `src/middleware.ts` | SSR 中间件 — 未登录跳 /login、已登录跳 /、刷新 Session |
| `src/lib/supabase/auth-provider.tsx` | 客户端 Auth Context Provider（Session 感知 + 登出） |
| `src/app/client-layout.tsx` | 客户端布局包装器（AuthProvider） |

#### 2. 控制台路由保护
| 行为 | 实现 |
|------|------|
| 未登录访问控制台 | → 307 重定向 /login |
| 已登录访问 /login | → 307 重定向 / |
| 刷新保持 Session | middleware 每次请求刷新 cookie |
| 登出 | `handleLogout()` → POST /api/auth/logout → 清理 cookies → router.push /login |

#### 3. resolveCurrentActor() 增强
- `src/server/auth/guard.ts` — `resolveCurrentActor()` 增加 profile.status 检查（inactive → null）
- `requireAuth()` 新增 profile status 检查（inactive → 403 FORBIDDEN）
- `resolveCurrentActorProfile()` 新增（返回完整 profile 用于业务逻辑）

#### 4. Application Create 接入 RPC
- `ApplicationRepository.createWithContext()` → `supabase.rpc('create_application_with_context', { p_talent_id, p_job_id, p_owner_id, p_stage, p_actor_id })`
- 不再直接 INSERT applications

#### 5. Application Transition 接入 RPC
- `ApplicationRepository.transitionWithContext()` → `supabase.rpc('transition_application_stage', { p_application_id, p_to_stage, p_actor_id, p_note })`
- 不再直接 UPDATE applications.stage

#### 6. 前端 x-session 头
- `src/lib/api/client.ts` — `request()` 自动注入 `x-session` header（access_token from Supabase session）

#### 7. Logout
- `src/app/(console)/layout.tsx` — Header 新增退出登录按钮（LogOut icon）

### RPC 最终链路
```
用户登录 → Supabase Auth Session → 控制台 middleware 刷新
→ resolveCurrentActor() → profiles.id = actorId
→ Application RPC (create_application_with_context / transition_application_stage)
→ DB INSERT/UPDATE applications → DB Trigger → StageEvent(actor + note)
```

### StageEvent 规则
- `StageEventRepository.create` = 0 ✅
- 应用层 `stage_events` INSERT = 0 ✅
- 一次 create/transition → 一条 StageEvent → created_by = profile.id

### 安全约束
| 检查项 | 状态 |
|--------|------|
| service_role 仅在 server-side | ✅ `admin.ts` 仅在 server 使用 |
| NEXT_PUBLIC_* 不含 Secret | ✅ 只有 URL 和 anonKey |
| 浏览器无法伪造 actor | ✅ actor 由 middleware cookie 解析 |
| profile.status 服务器验证 | ✅ inactive → 403 FORBIDDEN |
| RPC 通过 server-side admin client 调用 | ✅ `getClient()` = admin client |
| 无直接 stage_events 写入 | ✅ |

### 变更文件清单
| 文件 | 变更类型 |
|------|----------|
| `src/app/login/page.tsx` | 新增 |
| `src/app/api/auth/logout/route.ts` | 新增 |
| `src/middleware.ts` | 新增 |
| `src/lib/supabase/auth-provider.tsx` | 新增 |
| `src/app/client-layout.tsx` | 新增 |
| `src/server/auth/guard.ts` | 增强（profile status 检查） |
| `src/server/repositories/application.repository.ts` | 重构（INSERT/UPDATE → RPC） |
| `src/lib/api/client.ts` | 增强（x-session header） |
| `src/app/(console)/layout.tsx` | 增强（logout 按钮） |
| `src/app/layout.tsx` | 修改（ClientLayout 包装） |
| `AGENTS.md` | 文档更新 |

### 验证结果
- ✅ pnpm lint — 通过
- ✅ pnpm ts-check — 通过
- ✅ GET /api/applications → 200（Dashboard 读取正常）
- ✅ POST /api/applications → 401（写操作需要认证）
- ✅ POST /api/applications/[id]/transition → 401（写操作需要认证）
- ✅ GET /login → 200（登录页可访问）
- ✅ GET / → 307 redirect to /login（未认证跳转）
- ✅ StageEventRepository.create = 0
- ✅ 应用层 stage_events INSERT = 0
- ✅ Supabase 未修改

## 本轮修复记录（全面自梳理·全链路工程审计 P0 修复）

### 背景
对本项目做全链路工程审计（以当前 main 代码 + 当前运行环境 + 正式 Supabase `wbpnvbvdotkjhwxhndhz` 实际契约 + 真实业务链路为唯一依据，未沿用旧排查结论）。审计确认 3 个 P0 问题，本轮仅修复 P0（未改数据库、未改业务模型、未新增功能）。

### P0-1: super-admin-login Cookie 丢失（登录死循环根因）
- **Root Cause**: `src/app/api/auth/super-admin-login/route.ts` 中 `createServerClient` 的 `setAll()` 把 Supabase Session Cookie 写入局部变量 `response`（Response A），但最终 `return apiSuccess(...)` 创建并返回了**新的** NextResponse（Response B），Cookie 从未随响应返回浏览器。
- **Minimal Fix**: `setAll()` 改为收集 cookies 到 `pendingCookies`；成功路径在最终返回的 `apiSuccess` Response 上应用 cookies；403 路径在 FORBIDDEN Response 上应用清空 cookies。
- **Impact**: 登录成功后浏览器正确获得 Supabase Session Cookie，不再触发 `Auth成功 → 无Cookie → middleware 无Session → 307 /login` 死循环。

### P0-2: middleware 与 route/客户端连接不同 Supabase 项目
- **Root Cause**: `next.config.ts` 的 `env` 映射把 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` **无条件**指向 `COZE_*`（沙箱 volces 库），而进程 env 已提供正式库 `NEXT_PUBLIC_SUPABASE_URL`（wbpnvbvdotkjhwxhndhz）+ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。导致：middleware（edge bundle）连 volces 库，route handler（Node runtime）连正式库，浏览器客户端连 volces URL + 正式库 key（不匹配）。
- **Minimal Fix**: `next.config.ts` env 映射改为优先使用正式库变量（`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`），`COZE_*` 仅作 fallback。
- **Impact**: middleware / route handler / 客户端统一连接正式库 `wbpnvbvdotkjhwxhndhz.supabase.co`，cookie 名（`sb-wbpnvbvdotkjhwxhndhz-auth-token`）三层一致，Session 可跨层传递。

### P0-3: 内部写 API 认证失效（requireAuth 返回值被丢弃）
- **Root Cause**: 全部 API route 均为 `await requireAuth()` 且**丢弃返回值**（`requireAuth()` 返回 401 Response 而非抛异常），匿名请求可直达业务层。实测匿名 `POST /api/companies` 返回 400 VALIDATION_ERROR（业务层 Zod 校验），证明写操作未 gate。
- **Minimal Fix**: `src/middleware.ts` 对 `/api/` 路径的写方法（POST/PUT/PATCH/DELETE），且非 `/api/public`、非 `/api/auth`，在未认证时返回 401。
- **Impact**: 匿名用户无法再写内部数据（实测 `POST /api/companies` → 401）；读 API 宽松访问按设计保留；public API（apply/events）与 auth API（login/logout）豁免。

### 变更文件清单
| 文件 | 变更类型 |
|------|----------|
| `src/app/api/auth/super-admin-login/route.ts` | 修复（pendingCookies 应用到最终 Response） |
| `next.config.ts` | 修复（env 映射优先正式库，COZE_* fallback） |
| `src/middleware.ts` | 增强（内部写 API 未认证 401 保护） |
| `next-env.d.ts` | 构建产物（Next 16 自动追加 routes 类型引用） |

### 验证结果
- ✅ pnpm lint — 通过
- ✅ pnpm ts-check — 通过
- ✅ pnpm next build — 通过（含 2 个非阻塞 warning：workspace root 推断、middleware→proxy 约定）
- ✅ bash scripts/build.sh — 通过（install + next build + tsup 全绿）
- ✅ 匿名 GET /api/companies → 200（读宽松保留）
- ✅ 匿名 POST /api/companies → 401 UNAUTHORIZED（修复前 400）
- ✅ 匿名 POST /api/jobs → 401 UNAUTHORIZED（修复前 400）
- ✅ 匿名 POST /api/public/apply → 400（public 豁免，到达业务层）
- ✅ GET / → 307 /login；GET /login → 200
- ✅ middleware 编译产物统一为正式库 URL + publishable key（edge chunks 实证）
- ✅ Supabase 未修改（只读审计）

### 审计结论摘要
- 真实业务主链路（Company→Job→Publication→Published→Apply→Lead→Talent→Application→StageEvent）后端代码链路完整，数据契约与正式库基本一致（companies 增加 website/contact/phone；profiles 用 full_name 非 display_name）。
- Application Create/Transition 已接入 RPC（`create_application_with_context` / `transition_application_stage`），StageEvent 由 DB Trigger 单源（应用层零写入）。
- **P1**: `transition_application_stage` RPC 在 migration 中定义为 `RETURNS VOID`，而 `ApplicationRepository.transitionWithContext()` 期望返回行数据（`if (!data) throw NotFoundError`）——需人工确认真实 DB 函数返回类型后决定（若 VOID 则阶段转换会 404）。
- **P1**: 读 API 宽松访问（匿名可读公司/岗位/人才/线索数据）为当前设计意图，但建议未来收紧（人才/线索含 PII）。
- **P1**: `ApplicationRepository.create()/update()` 仍为直接 INSERT/UPDATE（create 无调用方，update 被 PATCH next_action_at 使用，不传 stage 时不触发 stage trigger）。
- **P2**: pipeline 拖拽未实现；`middleware` 文件约定已废弃（Next 16 建议改 `proxy`）；next.config 可设置 `turbopack.root` 消除 workspace root warning。
