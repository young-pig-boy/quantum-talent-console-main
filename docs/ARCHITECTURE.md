# 架构文档（ARCHITECTURE.md）

> 最后更新：2026-08-21（交接冻结）

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

## 目录结构

```
src/
├── app/
│   ├── layout.tsx              # 根布局（HTML + 字体预加载）
│   ├── client-layout.tsx       # 客户端布局包装器（AuthProvider）
│   ├── globals.css             # Design Token + Tailwind
│   ├── (console)/              # 控制台路由组
│   │   ├── page.tsx            # 工作台 Dashboard
│   │   ├── layout.tsx          # 控制台布局（Sidebar + Header）
│   │   ├── companies/          # 公司管理
│   │   ├── jobs/               # 岗位管理
│   │   ├── publications/       # 公开岗位管理
│   │   ├── leads/              # 线索管理
│   │   ├── talents/            # 人才管理
│   │   ├── applications/       # 申请详情
│   │   ├── pipeline/           # 招聘管道看板
│   │   ├── analytics/          # 数据分析
│   │   ├── team/               # 团队与权限管理
│   │   ├── external/           # 外部协作管理
│   │   └── showcase/           # 展示运营
│   ├── login/                  # 登录页（双入口）
│   └── api/                    # API Routes
│       ├── auth/               # 认证（super-admin/login + me + logout）
│       ├── companies/          # 公司 CRUD
│       ├── jobs/               # 岗位 CRUD + 状态转换 + publish-drafts
│       ├── publications/       # 公开岗位 CRUD + 发布/下架/精选/急招/批量
│       ├── leads/              # 线索 CRUD + 状态转换 + 转人才
│       ├── talents/            # 人才 CRUD + 联系方式授权
│       ├── applications/       # 申请 CRUD + 阶段推进
│       ├── team/               # 团队管理 + 权限 + 审计 + 联系方式审批 + offboard
│       ├── external/           # 外部顾问管理
│       ├── showcase/           # 展示运营数据
│       ├── import/             # 数据导入（buchou / taiyi-screenshot）
│       ├── analytics/          # 仪表盘/漏斗/来源分析
│       └── public/             # Public API（人才官网接口）
├── components/
│   ├── ui/                     # shadcn/ui 组件库
│   ├── console-table.tsx       # 数据表公共组件（飞书/Airtable 式）
│   ├── job-code.tsx            # 岗位编码展示组件
│   ├── job-combobox.tsx        # 岗位选择器
│   ├── tag-input.tsx           # Tag 输入组件
│   └── dynamic-list-input.tsx  # 动态列表组件
├── lib/
│   ├── utils.ts                # 通用工具（cn）
│   ├── supabase/               # Supabase 客户端分层
│   │   ├── client.ts           # 浏览器客户端
│   │   ├── server.ts           # 服务端（SSR）客户端
│   │   ├── admin.ts            # Admin 客户端（Service Role）
│   │   └── config.ts           # 配置检查 + 环境变量解析
│   ├── api/                    # 前端 API 客户端
│   │   ├── client.ts           # 统一请求封装（x-session header）
│   │   ├── companies.ts
│   │   ├── jobs.ts
│   │   ├── publications.ts
│   │   ├── leads.ts
│   │   ├── talents.ts
│   │   ├── applications.ts
│   │   └── analytics.ts
│   ├── domain/                 # 领域层
│   │   ├── types.ts            # 核心领域类型 + DTO
│   │   ├── errors.ts           # 业务错误体系
│   │   ├── job-state-machine.ts
│   │   ├── publication-state-machine.ts
│   │   ├── lead-state-machine.ts
│   │   ├── application-state-machine.ts
│   │   ├── quantum-tracks.ts   # 四大赛道 canonical 定义
│   │   └── publication-rules.ts # 发布/急招/精选业务规则
│   └── contact-mask.ts         # 联系方式脱敏工具
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
│   │   ├── publish-drafts.service.ts
│   │   ├── buchou-import.service.ts
│   │   ├── taiyi-screenshot-import.service.ts
│   │   └── index.ts
│   ├── validation/             # Zod 校验 schemas
│   │   └── schemas.ts
│   ├── auth/                   # Auth 守卫 + 辅助
│   │   ├── guard.ts            # 双认证（Break-glass + Supabase Auth）
│   │   ├── api-helpers.ts      # API 错误处理 + 响应封装
│   │   ├── permissions.ts      # 权限引擎（角色默认权限 + 委派权限）
│   │   └── actor.ts            # ActorContext 构建
│   └── local-access/           # Break-glass 本地认证
│       ├── config.ts           # 配置（HMAC secret + TTL）
│       ├── token.ts            # HMAC 签名/验证
│       └── password.ts         # scrypt 密码哈希/校验
└── hooks/                      # 自定义 Hooks
```

## 架构分层

```
┌─────────────────────────────────────────────────────────────┐
│  前端页面（React Server Components + Client Components）     │
│  src/app/(console)/*                                        │
├─────────────────────────────────────────────────────────────┤
│  API Routes（HTTP 请求/响应 + 认证守卫 + 错误处理）          │
│  src/app/api/*                                              │
├─────────────────────────────────────────────────────────────┤
│  Service 层（业务规则 + 状态机 + 多表联动 + 权限前置判断）    │
│  src/server/services/*                                      │
├─────────────────────────────────────────────────────────────┤
│  Repository 层（数据查询/插入/更新，不含业务规则）            │
│  src/server/repositories/*                                  │
├─────────────────────────────────────────────────────────────┤
│  Supabase Client（Admin / SSR / Browser）                    │
│  src/lib/supabase/*                                         │
├─────────────────────────────────────────────────────────────┤
│  Supabase PostgreSQL（正式库 wbpnvbvdotkjhwxhndhz）          │
└─────────────────────────────────────────────────────────────┘
```

## 认证与授权

### 双认证路径

```
Break-glass Super Admin:
  POST /api/auth/super-admin/login
  → username + password
  → scrypt 校验
  → HMAC 签名 HttpOnly Cookie
  → synthetic super_admin ActorContext

Supabase Auth (Team Lead / IC):
  POST /api/auth/login (Server Action)
  → email + password
  → Supabase signInWithPassword
  → SSR Cookie
  → Profile + Permission Engine
```

### 统一 ActorContext

两套认证路径最终统一进入 `ActorContext`（`src/server/auth/guard.ts`）：

```typescript
interface ActorContext {
  profile: Profile;
  teams: Team[];
  permissions: PermissionKey[];
  isBreakGlass: boolean;
}
```

### Server Authorization 中间层

| 函数 | 用途 |
|------|------|
| `requireAuth()` | 认证门禁（Break-glass 或 Supabase Auth） |
| `requireRole(roles[])` | 角色检查 |
| `requirePermission(key)` | 权限检查（角色默认 + 委派权限） |
| `requireCanManageJob(jobId)` | 资源级：owner/manager/teammate |
| `requireCanManageApplication(appId)` | 资源级：Application 管理 |
| `requireCanReadApplication(appId)` | 资源级：Application 读取 |
| `requireCanManageLead(leadId)` | 资源级：Lead 管理 |
| `requireCanManageTalent(talentId)` | 资源级：Talent 管理 |

### Middleware 保护

`src/middleware.ts` 对内部写 API（POST/PUT/PATCH/DELETE）在未认证时返回 401。
Public API（`/api/public/*`）和 Auth API（`/api/auth/*`）豁免。

## API 清单

### 认证

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/super-admin/login` | Break-glass 登录 |
| GET | `/api/auth/me` | 当前 ActorContext |
| POST | `/api/auth/logout` | 登出 |

### 公司

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/companies` | 列表 |
| POST | `/api/companies` | 创建 |
| GET | `/api/companies/[id]` | 详情 |
| PATCH | `/api/companies/[id]` | 更新 |
| DELETE | `/api/companies/[id]` | 删除 |

### 岗位

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/jobs` | 列表（支持 job_code 搜索） |
| POST | `/api/jobs` | 创建（job_code 由 DB 自动生成） |
| GET | `/api/jobs/[id]` | 详情 |
| PATCH | `/api/jobs/[id]` | 更新 |
| POST | `/api/jobs/[id]/start` | 开始招聘 |
| POST | `/api/jobs/[id]/pause` | 暂停 |
| POST | `/api/jobs/[id]/close` | 关闭 |
| POST | `/api/jobs/[id]/archive` | 归档 |
| POST | `/api/jobs/[id]/resume` | 恢复 |
| POST | `/api/jobs/publish-drafts` | 一键发布全部草稿 |

### 公开岗位

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/publications` | 列表（支持 public_job_code 搜索） |
| POST | `/api/publications` | 创建 |
| GET | `/api/publications/[id]` | 详情 |
| PATCH | `/api/publications/[id]` | 更新 |
| POST | `/api/publications/[id]/publish` | 发布 |
| POST | `/api/publications/[id]/offline` | 下架 |
| POST | `/api/publications/[id]/republish` | 重新发布 |
| POST | `/api/publications/[id]/archive` | 归档 |
| POST | `/api/publications/[id]/feature` | 设为精选 |
| POST | `/api/publications/[id]/unfeature` | 取消精选 |
| POST | `/api/publications/batch/publish` | 批量发布 |
| POST | `/api/publications/batch/offline` | 批量下架 |
| POST | `/api/publications/batch/feature` | 批量精选 |
| POST | `/api/publications/batch/unfeature` | 批量取消精选 |

### 线索

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/leads` | 列表 |
| POST | `/api/leads` | 创建 |
| GET | `/api/leads/[id]` | 详情 |
| PATCH | `/api/leads/[id]` | 更新 |
| POST | `/api/leads/[id]/qualify` | 标记合格 |
| POST | `/api/leads/[id]/invalidate` | 标记无效 |
| POST | `/api/leads/[id]/contact` | 已联系 |
| POST | `/api/leads/[id]/review` | 审核 |
| POST | `/api/leads/[id]/convert` | 转人才（RPC convert_lead_to_talent） |

### 人才

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/talents` | 列表（返回 TalentSafeDTO，不含 PII） |
| POST | `/api/talents` | 创建 |
| GET | `/api/talents/[id]` | 详情（返回 TalentSafeDTO） |
| PATCH | `/api/talents/[id]` | 更新 |
| GET | `/api/talents/[id]/contact-access` | 联系方式权限检查（脱敏） |
| PATCH | `/api/talents/[id]/contact-access` | 批准/拒绝联系方式申请 |

### 申请

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/applications` | 列表 |
| POST | `/api/applications` | 创建（RPC create_application_with_context） |
| GET | `/api/applications/[id]` | 详情 |
| PATCH | `/api/applications/[id]` | 更新 |
| POST | `/api/applications/[id]/transition` | 阶段推进（RPC transition_application_stage） |

### 团队与权限

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/team/members` | 成员列表 |
| POST | `/api/team/members` | 创建成员 |
| PATCH | `/api/team/members/[id]` | 更新成员 |
| GET | `/api/team/teams` | 团队列表 |
| POST | `/api/team/teams` | 创建团队 |
| GET | `/api/team/permissions` | 权限列表 |
| POST | `/api/team/permissions` | 授予权限 |
| DELETE | `/api/team/permissions` | 撤销权限 |
| GET | `/api/team/audit-logs` | 审计日志 |
| GET | `/api/team/contact-requests` | 联系方式审批请求 |
| POST | `/api/team/offboard` | 离职交接（停用 + 重分配） |

### 外部协作

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/external/consultants` | 外部顾问列表 |
| POST | `/api/external/consultants` | 创建外部顾问 |

### 展示运营

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/showcase/analytics` | 展示运营数据 |

### 数据导入

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/import/buchou` | 不筹量子岗位导入 |
| POST | `/api/import/taiyi-screenshot` | 太一量生截图导入 |

### 数据分析

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/analytics/dashboard` | 仪表盘 |
| GET | `/api/analytics/funnel` | 漏斗分析 |
| GET | `/api/analytics/sources` | 来源分析 |

### Public API（无需认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/public/jobs` | 公开岗位列表 |
| GET | `/api/public/jobs/[slug]` | 公开岗位详情 |
| POST | `/api/public/apply` | 投递申请 |
| POST | `/api/public/events` | 事件上报 |

## 状态机

| 实体 | 文件 | 状态 |
|------|------|------|
| Job | `src/lib/domain/job-state-machine.ts` | draft → recruiting → paused → closed → archived |
| Publication | `src/lib/domain/publication-state-machine.ts` | draft → published → offline → archived |
| Lead | `src/lib/domain/lead-state-machine.ts` | new → qualified → converted / invalid |
| Application | `src/lib/domain/application-state-machine.ts` | matching → contacting → interested → recommended → client_review → interview → offer → hired / rejected / withdrawn |

## 构建与运行

```bash
pnpm install        # 安装依赖
pnpm run dev        # 开发模式（HMR）
pnpm run lint       # ESLint
pnpm run ts-check   # TypeScript 类型检查
pnpm run build      # 生产构建（Next.js + tsup）
pnpm run start      # 生产启动（自定义 Node 服务器 src/server.ts）
```
