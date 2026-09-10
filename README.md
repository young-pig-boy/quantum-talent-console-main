# Quantum Talent Console（量子人才招聘中台）

猎头业务管理控制台，面向猎头顾问与招聘运营，覆盖从公司/岗位管理、公开岗位发布、候选人线索（Lead）沉淀、人才库（Talent）管理，到推荐申请（Application）与招聘管道（Pipeline）推进的完整业务链路。

> 交接文档：[docs/HANDOVER.md](docs/HANDOVER.md)

## 技术栈

| 领域 | 技术 |
|------|------|
| Framework | Next.js 16（App Router） |
| Runtime | React 19 + TypeScript 5 |
| UI | shadcn/ui（Radix）+ Tailwind CSS v4 |
| 图标 | lucide-react |
| 校验 | Zod |
| 数据库 | Supabase + PostgreSQL |
| 数据访问 | Supabase JS Client（untyped 模式） |
| 认证 | 双路径：Break-glass（本地）+ Supabase Auth（SSR） |
| 包管理 | pnpm |

## 认证架构

Console 实现两套独立的认证路径：

| 路径 | 角色 | 认证方式 |
|------|------|----------|
| Break-glass | Super Admin | 用户名 + scrypt 密码 → HMAC HttpOnly Cookie |
| Supabase Auth | Team Lead / Internal Consultant | 邮箱 + 密码 → Supabase Session |

两套路径最终统一进入 `ActorContext`（`src/server/auth/guard.ts`）。

> Super Admin 登录不依赖 Supabase Auth，但登录后业务数据访问仍依赖 Supabase。

## 权限模型

```
职级决定最高能力 + 管理层级决定能管谁 + 资源 Grant 决定具体能做什么
```

核心角色：`super_admin` / `team_lead` / `internal_consultant`

详见 [docs/HANDOVER.md §4](docs/HANDOVER.md#4-当前权限模型)。

## 业务链路

```
Company → Job → Publication → Publish（候选人可见）

Lead → Talent（线索转人才库，RPC convert_lead_to_talent）

Talent + Job → Application → Pipeline → StageEvent（阶段推进，RPC transition_application_stage）
```

状态机定义在 `src/lib/domain/*-state-machine.ts`，由 Service 层执行。Application 的 create/transition 已接入 Supabase RPC，StageEvent 由 DB Trigger 单源写入。

## Supabase

正式共享数据库 Project Ref：**`wbpnvbvdotkjhwxhndhz`**

> 禁止回连历史开发库 `br-rapid-bram-8365a7da`。

数据库真实状态详见 [docs/DATABASE_REALITY.md](docs/DATABASE_REALITY.md)。

## 环境变量

复制 `.env.example` 为 `.env.local` 并填入真实值。

### Supabase 连接（必需）

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable（anon）Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service Role Key（仅服务端） |

### Break-glass Super Admin（必需）

| 变量 | 说明 |
|------|------|
| `SUPER_ADMIN_USERNAME` | 超级管理员用户名 |
| `SUPER_ADMIN_PASSWORD_HASH` | scrypt 密码哈希 |
| `LOCAL_ACCESS_SECRET` | HMAC 签名密钥 |
| `CONSOLE_ACTOR_ID` | Break-glass Actor 的 profile UUID |

完整变量列表和解析优先级见 `.env.example`。

## Build

```bash
pnpm install        # 安装依赖
pnpm run dev        # 开发模式（HMR）
pnpm run lint       # ESLint
pnpm run ts-check   # TypeScript 类型检查
pnpm run build      # 生产构建
pnpm run start      # 生产启动
```

生产运行入口为自定义 Node 服务器 `src/server.ts`（`tsup` 打包）。

## 页面模块

```
/                         工作台 Dashboard
/companies                公司列表
/companies/[id]           公司详情
/jobs                     岗位列表（含 Job Code）
/jobs/new                 创建岗位
/jobs/[id]                岗位详情
/publications             公开岗位列表（赛道/精选/急招/批量操作）
/publications/[id]        公开岗位详情
/publications/[id]/preview 候选人视角预览
/leads                    线索列表
/leads/[id]               线索详情
/talents                  人才列表（PII 脱敏）
/talents/[id]             人才详情（联系方式授权）
/applications/[id]        申请详情（StageEvent 时间线）
/pipeline                 招聘管道看板
/analytics                数据分析
/team                     团队与权限管理
/external                 外部协作管理
```

## 文档

- [docs/HANDOVER.md](docs/HANDOVER.md) — 离职交接文档（全局架构、认证、权限、已知问题）
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — 架构分层与 API 清单
- [docs/BUSINESS_FLOW.md](docs/BUSINESS_FLOW.md) — 业务链路与状态机
- [docs/DATABASE_REALITY.md](docs/DATABASE_REALITY.md) — 数据库真实状态
- [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md) — 已知遗留问题

## 当前已知问题

详见 [docs/KNOWN_ISSUES.md](docs/KNOWN_ISSUES.md)。核心遗留：

- Pipeline 拖拽未实现（当前按钮推进）
- Migration 与正式库 Schema Drift（不可直接执行）
- Repository untyped（无编译期表结构检查）
- 四角色 UAT 未完成（需真实账号和密码）
