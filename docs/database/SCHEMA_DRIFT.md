# SCHEMA_DRIFT.md — 代码与生产数据库差异记录

**Project Ref**: `wbpnvbvdotkjhwxhndhz`
**对比**: 本轮整改前代码 vs 当前真实 Supabase Schema

## 2025-07-16 整改记录

### 一、审计结论

审计发现用户提示词中声称的以下内容与真实数据库 **不符**：

| 提示词声称 | 真实数据库 | 结论 |
|-----------|-----------|------|
| Job 使用 `original_jd` | Job 使用 `jd` | 代码无需修改 |
| Job 使用 `internal_salary` | Job 使用 `salary_internal` | 代码无需修改 |
| Publication 使用 `public_title` | Publication 使用 `title` | 代码无需修改 |
| Publication 使用 `public_company_name` | Publication 使用 `company_display_name` | 代码无需修改 |
| Publication 使用 `education` | Publication 使用 `education_requirement` | 代码无需修改 |
| Publication 使用 `experience` | Publication 使用 `experience_requirement` | 代码无需修改 |
| Publication 无 `summary` 列 | Publication **有** `summary` 列 | 代码无需修改 |
| Publication 无 `tags` 列 | Publication **有** `tags` (jsonb) | 代码无需修改 |
| 存在 `record_application_stage_event()` Trigger | **不存在**任何 Trigger | Application Service 手动写 StageEvent 是正确的 |

### 二、实际发现并修复的 Drift

#### Company
| 问题 | 说明 |
|------|------|
| 缺少 `website` | DB 有，TypeScript type 无 → 已添加 |
| 缺少 `contact` | DB 有，TypeScript type 无 → 已添加 |
| 缺少 `phone` | DB 有，TypeScript type 无 → 已添加 |

#### Lead
| 问题 | 说明 |
|------|------|
| 代码有 `job_id` | DB **无**此列 → 已从类型和所有引用中移除 |
| `site_id` 为 nullable | DB 为 NOT NULL → 已改为 required |
| `publication_id` 为 nullable | DB 为 NOT NULL → 已改为 required |
| Lead detail 页使用 `lead.job_id` 查岗位 | 字段不存在，已移除该查询逻辑 |

#### Talent
| 问题 | 说明 |
|------|------|
| 代码有 `headline` | DB **无**此列 → 已移除 |
| 代码有 `experience_summary` | DB **无**此列 → 已移除 |
| 代码有 `status` | DB **无**此列 → 已移除 |
| Talent detail 页展示 headline/experience_summary/status | 已移除这些展示 |

### 三、安全整改

| 问题 | 修复 |
|------|------|
| `next.config.ts` 中 `env.SUPABASE_SERVICE_ROLE_KEY` 暴露到客户端 bundle | 已移除 |
| `public-api.service.ts` 中使用 `.catch(() => {})` 静默吞错 | 已改为 try/catch 并加注释说明 |

### 四、未修改项（符合规范）

- **Job**: `jd` 和 `salary_internal` 与 DB 一致，无需修改
- **Publication**: 所有字段与 DB 一致，无需修改
- **Application**: 完全一致
- **StageEvent**: 完全一致
- **Status 枚举**: 无 CHECK constraint，应用层 Zod schema 已覆盖
- **DB Schema**: 无 CREATE/ALTER/DROP 操作
- **RLS/RPC/Trigger**: 无修改
- **Application StageEvent 写入**: 由于 DB 无 Trigger，手动写入是正确的，保留

### 五、遗留问题

1. **Talent 不再展示 headline/experience_summary/status**：这些字段在 DB 中不存在，UI 中已移除。如未来需要这些信息，需先 ALTER TABLE 添加列。
2. **Lead 详情页不再展示关联岗位**：由于 `job_id` 列不存在，无法直接从 Lead 查找 Job。可通过 `publication_id → job_publications → job_id → jobs` 间接查询，但本轮不扩展范围。
3. **User/Profile 身份解析**：`owner_id` / `created_by` 仍显示为 UUID 截断（后8位），用户身份体系尚未建设。
