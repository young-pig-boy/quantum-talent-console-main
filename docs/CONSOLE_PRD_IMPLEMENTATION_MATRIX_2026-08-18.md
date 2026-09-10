# Console PRD Implementation Matrix（第三方审计）

> 审计日期：2026-08-18
> 状态图例：✅ DONE / 🟡 PARTIAL / 🔴 NOT IMPLEMENTED / ⚠️ BLOCKED / ⚪ UNVERIFIED
> 判定原则：以**当前 GitHub main 代码 + 当前运行时 + 正式 Supabase（wbpnvbvdotkjhwxhndhz）实测**为唯一依据，不美化。

---

| ID | PRD 需求 | 状态 | 证据文件 | 相关 API | 当前缺口 | 下一步 |
|----|----------|------|----------|----------|----------|--------|
| A | Multi-user Auth（多人认证） | 🟡 PARTIAL | `src/app/login/supabase-actions.ts`、`src/server/auth/guard.ts` | 登录 Server Action | 正式库仅 1 个 auth user（super_admin），无 team_lead/IC 账号；`handle_new_user` trigger 状态 UNVERIFIED；guard/middleware 读 `NEXT_PUBLIC_SUPABASE_ANON_KEY`（运行时未设） | 修复 guard/middleware 用 `getSupabaseConfig()`；正式核验 auth trigger；真实浏览器验证 Supabase Auth 登录 |
| B | Break-glass Super Admin | 🟡 PARTIAL | `src/app/login/actions.ts`、`src/server/local-access/token.ts` | 登录 Server Action | 运行时 `SUPER_ADMIN_PASSWORD_HASH` 未设置 → 登录返回配置错误；存在旧死代码 `api/auth/login` 用另一套 hash 格式 | 注入 `SUPER_ADMIN_PASSWORD_HASH`；删除/收敛旧 `api/auth/login` |
| C | Team Lead | 🔴 NOT IMPLEMENTED | `src/lib/domain/types.ts`（role 定义）、`src/server/auth/permissions.ts`（默认权限） | 无 | 角色定义与默认权限有，但无 team_lead 账号、无团队管理写入 API | 实现 team 创建/成员分配 + 真实账号 |
| D | Internal Consultant | 🔴 NOT IMPLEMENTED | 同上 | 无 | 角色定义有，但无 IC 账号；无二次授权闭环 | 实现 IC 账号 + 授权流程 |
| E | Team / Membership | 🔴 NOT IMPLEMENTED | `src/app/api/team/teams/route.ts`（GET-only）、`src/server/auth/actor.ts` | GET `/api/team/teams`、`/api/team/members` | 正式库 teams/team_memberships=0 行；无 POST 创建/分配 | 实现团队与成员写 API |
| F | Management Scope | 🔴 NOT IMPLEMENTED | `src/server/auth/permissions.ts`（`isManagerOf` 死代码） | 无 | `is_managed_by` RPC 存在但 `isManagerOf` 无任何 API 调用；manager_id 未参与任何授权 | 将 manager 范围接入资源级授权 |
| G | Permission Grant / Revoke | 🔴 NOT IMPLEMENTED | `src/server/auth/permissions.ts`（`grantPermission`/`revokePermission` 死代码）、`src/app/api/team/permissions/route.ts`（GET-only） | GET `/api/team/permissions`（无 POST/DELETE） | RPC `grant_permission_with_context`/`revoke_permission_with_context` 正式库**均存在**，但无 API 调用；permission_grants=0 行 | 补 POST/DELETE 授权路由 |
| H | No Secondary Delegation | 🟡 PARTIAL | `src/server/auth/permissions.ts`（`canDelegate`） | 无 | `canDelegate()` 规定 IC 不可委派，但无委派 API、无 UAT | 在授权 API 中调用 `canDelegate` |
| I | Talent Global Resume Visibility | 🟡 PARTIAL | `src/app/api/talents/route.ts`、`src/app/api/talents/[id]/route.ts` | GET `/api/talents`、`/api/talents/[id]` | 仅 `requireAuth`，任何登录用户可见全部 talent（含联系方式），无按角色/团队范围过滤 | 按角色/团队范围限制可见性 |
| J | Talent Contact Masking | 🔴 NOT IMPLEMENTED | `src/server/repositories/talent.repository.ts`（`select('*')`） | GET `/api/talents`、`/api/talents/[id]` | 主列表/详情接口直接返回未脱敏 phone/email/wechat；脱敏仅在独立 `contact-access` 接口 | 在主接口收口脱敏 |
| K | Contact Access Request | 🟡 PARTIAL | `src/app/api/talents/[id]/contact-access/route.ts`（POST） | POST `/api/talents/[id]/contact-access` | `request_talent_contact_access` RPC 存在；contact_access_requests=0 行 | 真实账号 E2E 验证 |
| L | Contact Approval | ⚠️ BLOCKED | `src/app/api/talents/[id]/contact-access/route.ts`（PATCH）、`src/app/(console)/team/page.tsx`（审批 Tab） | PATCH `/api/talents/[id]/contact-access` | `decide_talent_contact_access` RPC 正式库 **NOT FOUND**，审批必然失败；审批 Tab 不在 Sidebar | 正式库创建 `decide_talent_contact_access` RPC |
| M | Audit Log | 🔴 NOT IMPLEMENTED | `src/app/api/team/audit-logs/route.ts`（GET-only） | GET `/api/team/audit-logs` | audit_logs=0 行；无任何 `talent_contact.request/approve/view` 写入点 | 实现审计写入（应用层或 DB 单源） |
| N | Own Job（资源归属） | 🟡 PARTIAL | `src/server/auth/permissions.ts`（`canManageJob`）、`src/app/api/publications/*` | publication 写接口 | `can_manage_job` RPC 存在，且已用于 Publication；但 jobs/companies CRUD 仅 `requireAuth`，无 owner 级检查 | 将 owner 级检查扩展到 jobs/companies 写接口 |
| O | Publication Draft | ✅ DONE | `src/server/services/publication.service.ts`、`src/lib/domain/publication-state-machine.ts` | POST `/api/publications` | 无（draft 创建/状态机已实现，正式库 73 publication 数据存在） | — |
| P | Publication Publish Authorization | ✅ DONE | `src/app/api/publications/[id]/publish/route.ts` 等 11 文件 | publish/offline/republish/archive/batch | 无（requirePermission + canManageJob + fail-closed 已确认） | — |
| Q | Urgent / Featured Authorization | ✅ DONE | `src/app/api/publications/[id]/feature|unfeature/route.ts`、`batch/feature|unfeature` | feature/unfeature | 无（`publication_operate` + canManageJob） | — |
| R | Showcase Analytics | 🟡 PARTIAL | `src/app/api/showcase/analytics/route.ts`、`src/app/(console)/showcase/analytics/page.tsx` | GET `/api/showcase/analytics` | 仅 `requireAuth`，`showcase_analytics` 权限未强制；page_views/click_events 表存在但数据空 | 加 `requirePermission('showcase_analytics')`；真实埋点数据 |
| S | External Consultant Internal Management | 🔴 NOT IMPLEMENTED | `src/app/(console)/external/page.tsx`、`src/app/api/external/consultants/route.ts`（GET-only） | GET `/api/external/consultants` | 只读列表；「邀请顾问」死按钮；无创建/编辑/删除 | 实现 consultants 写 API |
| T | External Job Access | 🔴 NOT IMPLEMENTED | 无 | 无 | external_job_access 表存在=0 行，无任何 API/页面 | 从零实现 |
| U | External Referral | 🔴 NOT IMPLEMENTED | 无 | 无 | external_referrals 表存在=0 行，无任何 API/页面 | 从零实现 |
| V | External Consultant Portal | 🔴 NOT IMPLEMENTED | 无 | 无 | 不存在任何外部门户路由 | 从零实现 |
| W | Application Pipeline | ✅ DONE | `src/server/services/application.service.ts`、`src/lib/domain/application-state-machine.ts`、`src/app/(console)/pipeline/page.tsx` | POST `/api/applications`、`[id]/transition`（RPC） | 无（10-state 状态机保持，正式库 applications=4、stage_events=21） | — |
| X | StageEvent | ✅ DONE | `src/server/repositories/stage-event.repository.ts`（只读）、DB Trigger 单源 | — | 无（应用层零 stage_events INSERT） | — |
| Y | Offboarding / Reassignment | 🔴 NOT IMPLEMENTED | 无 | 无 | 全仓无离职/交接/再分配代码；profiles.status 仅登录校验（inactive→403） | 从零实现 |
| Z | Role-aware Dashboard | 🟡 PARTIAL | `src/app/(console)/page.tsx`（读 `/api/auth/me` 取 role）、`src/app/(console)/layout.tsx`（Sidebar） | GET `/api/auth/me` | Dashboard 标题按 role 变化已实现；但 Sidebar 为静态 `NAV_GROUPS`，非角色感知 | 让 Sidebar/菜单按权限过滤 |

---

## 汇总

| 状态 | 数量 | 项 |
|------|------|-----|
| ✅ DONE | 5 | O、P、Q、W、X |
| 🟡 PARTIAL | 8 | A、B、H、I、K、N、R、Z |
| 🔴 NOT IMPLEMENTED | 12 | C、D、E、F、G、J、M、S、T、U、V、Y |
| ⚠️ BLOCKED | 1 | L |
| ⚪ UNVERIFIED | 1 | 基础设施项 `handle_new_user` trigger（非 PRD 单列项，见 §12 Blocker） |

## 关键审计结论（供独立 Codex 快速核对）

1. **招聘主链（W/X/O）真实跑通**：有真实数据，Application 走 RPC，StageEvent 由 DB Trigger 单源。
2. **多人权限体系（C/D/E/F/G）基本未上线**：角色只定义、无账号、无团队、无授权 API，正式库相关表全 0 行。
3. **授权缺口（J/N）高危**：Talent 联系方式主接口泄露；核心招聘对象 CRUD 只用 `requireAuth` 绕过 Permission Engine。
4. **一个硬阻断（L）**：`decide_talent_contact_access` RPC 缺失，联系方式审批无法落地。
5. **一个待正式核验（UNVERIFIED）**：`handle_new_user` trigger 是否损坏（profiles 无 display_name/email 列，与损坏假设一致，但无 raw SQL 权限读函数体）。
