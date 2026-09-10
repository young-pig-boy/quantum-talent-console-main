# 业务链路与状态机（BUSINESS_FLOW.md）

> 最后更新：2026-08-21（交接冻结）

## 核心业务链路

```
Company → Job → Publication → Publish（候选人可见）

Lead → Talent（线索转人才库，RPC convert_lead_to_talent）

Talent + Job → Application → Pipeline → StageEvent（阶段推进，RPC transition_application_stage）
```

## 状态机

### Job 状态机

```
draft → recruiting → paused → closed → archived
```

- `draft`：草稿，未开始招聘
- `recruiting`：招聘中
- `paused`：暂停招聘
- `closed`：关闭（已招满或取消）
- `archived`：归档

定义：`src/lib/domain/job-state-machine.ts`

### Publication 状态机

```
draft → published → offline → archived
```

- `draft`：草稿，未发布
- `published`：已发布（候选人可见）
- `offline`：下架（候选人不可见）
- `archived`：归档

发布规则（`src/lib/domain/publication-rules.ts`）：
- track 允许为空（null = 未归类）；track 有值时必须为四大赛道之一
- published → offline/archived 时强制重置 urgent=false
- offline → published（republish）不自动恢复 urgent

定义：`src/lib/domain/publication-state-machine.ts`

### Lead 状态机

```
new → qualified → converted
new → invalid
```

- `new`：新投递
- `qualified`：合格（可转人才）
- `converted`：已转人才（RPC `convert_lead_to_talent`）
- `invalid`：无效

转换规则：
- 仅 `qualified` 可转人才
- 转换由 Supabase RPC `convert_lead_to_talent` 原子执行（查重 + 创建/复用 Talent + 更新 Lead 状态）
- 幂等：已 converted 的 Lead 再次转换 → 复用现有 Talent

定义：`src/lib/domain/lead-state-machine.ts`

### Application 状态机

```
matching → contacting → interested → recommended → client_review → interview → offer → hired
                                                                                      ↘ rejected
                                                                                      ↘ withdrawn
```

- `matching`：匹配中（初始状态）
- `contacting`：联系中
- `interested`：有意向
- `recommended`：已推荐给客户
- `client_review`：客户审核中
- `interview`：面试中
- `offer`：已发 Offer
- `hired`：已入职（终态）
- `rejected`：被拒绝（终态）
- `withdrawn`：候选人退出（终态）

创建/推进规则：
- 创建由 RPC `create_application_with_context` 执行（去重：同 Talent × Job 仅一条）
- 阶段推进由 RPC `transition_application_stage` 执行
- StageEvent 由 DB Trigger 单源写入（应用层零写入）

定义：`src/lib/domain/application-state-machine.ts`

## 四大赛道（Track Taxonomy）

定义：`src/lib/domain/quantum-tracks.ts`

| 值 | 中文 |
|----|------|
| `superconducting` | 超导量子 |
| `ion-trap` | 离子阱 |
| `photonics` | 光量子 |
| `communication-sensing` | 量子通信与测量 |

- track 允许为空（null = 未归类）
- 历史脏值在 UI 标记「需要重新选择赛道」
- 发布时 track=null 允许；track=四大赛道允许；track=其他值禁止

## 岗位编码（Job Code）

- `jobs.job_code`：`QJ-YY-NNNN` 格式，DB 自动生成，UNIQUE，NOT NULL，创建后不可改
- `job_publications.public_job_code`：自动继承对应 `jobs.job_code`
- UUID 仍是系统主键，job_code 仅为人类可读业务标识
- 搜索支持按 job_code 精确匹配

## 精选/急招运营

- `featured`：精选标记，仅 published 可设为精选
- `urgent`：急招标记，仅 published 可开启；含 `urgent_started_at` / `urgent_expires_at` 生命周期
- 两者独立于 track 和 status

## Talent PII 保护

- 普通 API（GET/POST/PATCH talents）返回 `TalentSafeDTO`，排除 phone/email/wechat
- 联系方式通过 `contact-access` 授权链路处理
- 脱敏工具：`src/lib/contact-mask.ts`
