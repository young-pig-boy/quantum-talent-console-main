# 数据库真实状态（DATABASE_REALITY.md）

> 最后更新：2026-08-21（交接冻结）

## 正式 Supabase

- **Project Ref**: `wbpnvbvdotkjhwxhndhz`
- **URL**: `https://wbpnvbvdotkjhwxhndhz.supabase.co`
- **状态**: 已有真实业务数据（不筹量子 18 岗位 + 太一量生 17 岗位已导入）

> 禁止回连历史开发库 `br-rapid-bram-8365a7da`。

## 核心表

| 表名 | 说明 | 主键类型 |
|------|------|----------|
| `companies` | 公司 | varchar + gen_random_uuid() |
| `jobs` | 内部岗位 | varchar + gen_random_uuid() |
| `job_publications` | 公开岗位 | varchar + gen_random_uuid() |
| `leads` | 投递线索 | varchar + gen_random_uuid() |
| `talents` | 人才库 | varchar + gen_random_uuid() |
| `applications` | 招聘申请 | varchar + gen_random_uuid() |
| `stage_events` | 阶段事件 | varchar + gen_random_uuid() |
| `profiles` | 用户档案 | varchar (auth.users.id) |
| `teams` | 团队 | varchar + gen_random_uuid() |
| `team_memberships` | 团队成员关系 | varchar + gen_random_uuid() |
| `permission_grants` | 权限授予 | varchar + gen_random_uuid() |
| `contact_access_requests` | 联系方式访问请求 | varchar + gen_random_uuid() |
| `external_consultants` | 外部顾问 | varchar + gen_random_uuid() |
| `external_job_access` | 外部岗位访问授权 | varchar + gen_random_uuid() |
| `external_referrals` | 外部推荐 | varchar + gen_random_uuid() |
| `audit_logs` | 审计日志 | varchar + gen_random_uuid() |

## 已知 RPC

| RPC 名称 | 说明 | 代码中是否使用 |
|----------|------|----------------|
| `convert_lead_to_talent` | Lead → Talent 原子转换 | ✅ 已接入 |
| `create_application_with_context` | 创建 Application（含 actor） | ✅ 已接入 |
| `transition_application_stage` | Application 阶段推进（含 actor + note） | ✅ 已接入 |
| `deactivate_profile_and_reassign` | 离职交接（停用 + 重分配） | ✅ 代码调用，需验证存在性 |
| `grant_permission_with_context` | 授予权限 | ✅ 代码调用，需验证存在性 |
| `revoke_permission_with_context` | 撤销权限 | ✅ 代码调用，需验证存在性 |
| `decide_talent_contact_access` | 批准/拒绝联系方式申请 | ✅ 代码调用，需验证存在性 |
| `request_talent_contact_access` | 申请查看联系方式 | ✅ 代码调用，需验证存在性 |

## Schema Drift（Migration 与正式库差异）

### 重要警告

`supabase/migrations/` 文件与正式库存在显著漂移。**不可直接对生产执行 migration。**

### 已知差异

| 类别 | Migration 定义 | 正式库实际 |
|------|---------------|-----------|
| ID 类型 | `UUID DEFAULT uuid_generate_v4()` | `varchar DEFAULT gen_random_uuid()` |
| 外键 | 约 13 条 FK 约束 | 仅 1 条（leads→talents） |
| 触发器 | `set_updated_at` 定义 | 未建立 |
| RPC（004） | 4 个函数 | 不存在（但后续新增了其他 RPC） |
| 索引 | 部分索引定义 | 可能不一致 |

### 原因

Migration 文件是项目早期编写的理想化 Schema，后续正式库经过多轮手动调整（ID 类型改为 varchar、移除大部分 FK、新增 RPC 等），但 migration 文件未同步更新。

### 建议

1. 如需重建数据库，应以正式库当前 Schema 为准重新生成 migration
2. 运行 `supabase db dump` 获取正式库当前完整 Schema
3. 运行 `supabase gen types typescript` 生成类型安全的客户端类型

## 数据完整性保护

### 当前保护机制

| 层级 | 机制 | 说明 |
|------|------|------|
| Service 层 | 业务规则校验 | 删除公司前检查是否有岗位、状态机校验等 |
| Service 层 | 去重保护 | Lead→Talent 查重、Application 去重 |
| DB 层 | UNIQUE 约束 | jobs.job_code、publications.slug |
| DB 层 | NOT NULL | 关键字段非空约束 |
| DB 层 | FK（仅 1 条） | leads.converted_talent_id → talents.id |

### 缺失保护

| 缺失项 | 风险 | 缓解措施 |
|--------|------|----------|
| 大部分 FK 约束 | 孤儿数据 | Service 层保护 + 定期审计 |
| `updated_at` 触发器 | 时间戳不自动更新 | 应用层显式维护 |
| 级联删除 | 删除父表数据时子表孤儿 | Service 层前置检查 |

## 数据访问模式

Console 使用 `service_role` 密钥通过 Admin Client 访问数据库，绕过 RLS。

这意味着：
1. **所有数据访问的权限控制必须在 Console 服务端代码中实现**（Server Authorization）
2. RLS 策略对 Console 不生效（service_role 绕过 RLS）
3. 如果 Console 代码存在授权漏洞，service_role 可以读写任意数据

## 当前数据快照（导入时记录）

- **不筹量子**：18 个岗位（全部 recruiting + published）
- **太一量生**：17 个岗位（11 个 draft + 4 个 matched 历史 + 2 个 skipped）
- **公司**：至少 2 家（不筹量子、太一量生）
- **Talent / Lead / Application**：数量需查询正式库确认
