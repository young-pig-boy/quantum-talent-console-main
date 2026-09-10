# 已知问题（KNOWN_ISSUES.md）

> 最后更新：2026-08-21（交接冻结）

记录当前真实遗留问题，供后续迭代参考。

## 验证状态说明

| 标记 | 含义 |
|------|------|
| ✅ 静态 PASS | pnpm lint / ts-check / build 通过 |
| ✅ Smoke PASS | 匿名 API 冒烟测试通过 |
| ✅ UAT PASS | 真实 Supabase 环境 UAT 已验证 |
| ⚠️ NOT LIVE UAT | 代码已实现、静态验证通过，但未经真实账号 UAT |

## 功能类

1. **Pipeline 拖拽未实现**
   - 当前 Pipeline 看板使用「按钮」进行 Application 阶段推进（调用 transition API）。
   - 拖拽（drag & drop）待后续开发。

2. **Application Detail 前端页面验证不足**
   - 后端 API 完整（含 StageEvents）；前端页面已创建，但需在真实浏览器中做完整交互验证（阶段推进 → 时间线刷新）。

3. **Dashboard `publishedJobs` 计数**
   - 依赖 `job_publications` 表的特定查询条件，需结合真实数据再次确认口径。

## 认证与权限类

4. **四角色 UAT 未完成（重点）**
   - Super Admin Break-glass 登录：代码已实现 / 静态验证，**未经真实密码 UAT**。
   - Team Lead Supabase Auth 登录：代码已实现 / 静态验证，**未经真实账号 UAT**。
   - Internal Consultant 登录：代码已实现 / 静态验证，**未经真实账号 UAT**。
   - 权限边界（`requireRole` / `requirePermission` / `requireCanManage*`）：代码已实现 / 匿名 401 已验证，**未经多角色交叉 UAT**。
   - **代码已实现 / 静态验证，不等同真实 UAT PASS。**

5. **Supabase Auth Trigger 可能损坏**
   - 历史审计发现 `auth.users` 表上的 `handle_new_user` trigger 函数可能引用了 `profiles` 表中已不存在的列，导致新用户创建失败。
   - 需在 Supabase Dashboard 中验证并修复。

6. **读 API 宽松访问**
   - 当前设计：匿名 GET 部分内部 API（companies/jobs/talents/leads 等）可通过（middleware 仅拦截写 API）。
   - 建议：收紧 PII 相关读取接口（talents/leads 含敏感信息）。

7. **部分 RPC 可能不存在**
   - `decide_talent_contact_access`：历史审计报告不存在，需验证。
   - `grant_permission_with_context` / `revoke_permission_with_context`：历史审计报告不存在，需验证。
   - `deactivate_profile_and_reassign`：历史审计报告不存在，需验证。
   - 代码中这些 RPC 的调用路径已有 try/catch 保护，不存在时返回错误而非崩溃。

## 数据类

8. **Publication 数据质量**
   - 早期记录可能存在 `requirements` 为空的情况，需人工补充。
   - `company_display_name` 历史错误已通过 SQL 修正，新建记录无复发。

9. **正式库数据状态**
   - 正式库 `wbpnvbvdotkjhwxhndhz` 已有真实业务数据（不筹量子 18 岗位 + 太一量生 17 岗位已导入）。
   - 数据完整性依赖 Service 层保护（无 FK 级联，除 leads→talents）。

## 架构/工程类

10. **Schema Drift（重点）**
    - `supabase/migrations/` 与正式库存在漂移（详见 `docs/DATABASE_REALITY.md`）：
      - ID 类型：真实库 `varchar + gen_random_uuid()`，migration 为 `UUID + uuid_generate_v4()`
      - 外键：migration 声明约 13 条，正式库仅 1 条
      - 触发器：`set_updated_at` 未建立
      - RPC：migration 004 的 4 个函数不存在（但后续新增了其他 RPC）
    - **Migration 文件不可直接对生产执行。**

11. **Repository 使用 untyped Supabase Client**
    - 当前为 `getSupabaseAdminUntyped` 模式，无编译期表结构类型检查。
    - 运行 `supabase gen types typescript` 可替换为类型安全模式。

12. **遗留死代码**
    - `src/lib/mock-data.ts` 已无任何页面引用，保留仅为历史参考，可择机删除。

13. **Next.js 16 约定变更**
    - `middleware.ts` 文件约定在 Next.js 16 中已标记为 deprecated（建议改 `proxy`），当前仍可正常工作。
    - `next.config.ts` 可设置 `turbopack.root` 消除 workspace root warning。

14. **无数据库级保护（部分）**
    - 正式库仅 1 条 FK（leads→talents），其他表间无 FK 约束。
    - 删除公司/岗位/人才时无数据库级级联，依赖 Service 层保护。
    - `updated_at` 触发器缺失，依赖应用层显式维护。
