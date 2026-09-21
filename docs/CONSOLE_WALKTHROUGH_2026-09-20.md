# 招聘中台实操走查与测试用例（2026-09-20）

> 目的：给第一次完整走通「发布一个岗位」的人看。含：工作流程、逐步熟悉路线、可直接照抄的测试用例、中英文字段填写规则、当前完成/未完成清单。
> 代码核验日期：2026-09-20（本文件结论均来自当前代码实测，非历史文档转述）

## 0. 环境与前提

| 项 | 值 |
|---|---|
| 中台 Console | `http://localhost:5002`（双击 `D:\Jiachi\start-console.bat` 启动） |
| 前台 Showcase | `http://localhost:5001`（双击 `D:\Jiachi\start-showcase.bat` 启动） |
| 数据库 | Supabase ref `msmxzulvmwleeadqurai`，**前台与中台连的是同一个库** |
| 站点 sites | 1 条 active：「量子科技人才展示网站」，创建公开岗位时自动使用 |
| 当前数据 | jobs 74（73 recruiting + 1 draft）；job_publications 74（72 published + 2 offline） |
| 登录 | `/login` 走 Super Admin（break-glass）表单；当前 `.env.local` 已配置 `SUPER_ADMIN_PASSWORD_HASH` |

> 注意：这是**含真实业务数据的库**，没有删除接口（只能下架/归档）。测试数据请统一加 `【测试勿动】` 与 `TEST-0920` 前缀，走完立刻归档。

## 1. 工作流程（一图流）

```
公司 Company ──> 内部岗位 Job ──> 公开岗位 Publication ──> 发布 Published（前台可见）
                                                              │
                           投递 Lead ──> 人才库 Talent ──> 推荐申请 Application ──> 阶段推进 StageEvent
```

- **内部岗位 Job** 是内部分（含内部薪资、排除规则、内部备注、来源文件），**永远不对外**。
- **公开岗位 Publication** 是 Job 的「安全公开版本」，对外只暴露这一层。
- 前台只读 `job_publications` 中 `status = published` 的记录。

### 1.1 内部岗位状态机

```
draft → recruiting ⇄ paused → closed → archived
```
只有 `recruiting` 状态才能「创建公开岗位」，且发布时底层 Job 必须仍是 `recruiting`。

### 1.2 公开岗位状态机

```
draft → published ⇄ offline → archived
```

发布前置校验（`PublicationService.publishPublication`）：

1. 底层 Job = `recruiting`（否则 `Cannot publish: underlying job is not recruiting`）
2. `title` 非空
3. `slug` 非空（创建时自动生成，**创建后不可改**）
4. `responsibilities` 或 `requirements` 至少一项非空
5. `site_id` 存在（自动取唯一 active 站点）
6. `track` 为空（未归类）或属于四大赛道之一，否则 `岗位赛道值无效，请重新选择赛道`

四大赛道：`superconducting` 超导量子 / `ion-trap` 离子阱 / `photonics` 光量子 / `communication-sensing` 量子通信与测量。

运营规则：精选 `featured` 与急招 `urgent` 仅 `published` 可开；下架或归档会**自动清除** `urgent`（保留开始/截止时间戳）。

## 2. 逐步熟悉路线（建议按 1→8 走）

| 步 | 入口 | 看什么 | 关键认知 |
|---|---|---|---|
| 1 | `/` 工作台 | 各模块计数 | 全局盘面：多少岗位在招、多少投递未处理 |
| 2 | `/companies` → 任一家 → `/companies/[id]` | 公司旗下的岗位列表 | Company 1:N Job |
| 3 | `/jobs` → 列表筛选 → `/jobs/{id}` | 岗位内部信息 + 「公开岗位」区块 | Job 是内部对象；job_code `QJ-26-00xx` 自动生成不可改 |
| 4 | `/jobs/new` | 新建表单（内部信息 + 运营信息） | 运营信息存入 `intake_metadata`（优先级/批次/公开确认状态/来源） |
| 5 | `/jobs/{id}` → 开始招聘 → 创建公开岗位 | 生成 Publication | 只有 recruiting 才有「创建公开岗位」按钮 |
| 6 | `/publications` | 列表 + 状态/赛道/精选筛选 + 批量操作 | 展示运营的主战场：批量公开、停止发布、设为精选 |
| 7 | `/publications/{id}` | 只读态 → 右上「编辑」→ 编辑态 | **唯一能填英文的地方**；右上还有「发布/下架/预览」 |
| 8 | `/publications/{id}/preview` | 候选人视角预览 | 发布前后都可用，核对排版最快 |

走完 1–8 之后，再走候选人侧闭环：`/leads`（投递）→ 标记合格 → 转为人才 → `/talents/{id}` 加入岗位推进 → `/pipeline` 推进阶段 → `/applications/{id}` 看时间线。

## 3. 测试用例

### TC-01 主用例：从零发布一个中英双语岗位（推荐第一次走这条）

| 步骤 | 操作 | 期望结果 |
|---|---|---|
| 1 | `/jobs/new`：岗位名称 `【测试勿动】量子测控工程师 TEST-0920`；公司选「图灵量子」；城市 `上海`；内部薪资 `40-60K·15薪`；**JD 必填**（3–5 条）；硬性要求填 2 条；运营信息：优先级 P2、公开确认状态「已确认可公开」 | 跳转 `/jobs/{id}`，状态 `draft`，自动生成 job_code |
| 2 | 详情页点「开始招聘」 | 状态 → `recruiting`，出现「创建公开岗位」按钮 |
| 3 | 点「创建公开岗位」 | 生成 Publication，状态 `draft`；中文字段从 Job 快照过来，**4 个英文字段全为 null** |
| 4 | 进入 `/publications/{id}` → 右上「编辑」 | 进入编辑态，出现中英文对照输入框 |
| 5 | 按下表填中英文字段 + 赛道 `superconducting` + 薪资展示 + 标签 | — |
| 6 | 「保存」 | 只读态能看到「标题英文/方向英文/职级英文/摘要英文」四项 |
| 7 | 右上「发布」 | 状态 → `published`，写入 `published_at` |
| 8 | 点「预览」+ 前台 `http://localhost:5001/jobs/{slug}` | 中文模式显示中文；点导航「E」切英文 → 标题/方向/职级/摘要变英文；**JD 正文仍是中文（二期范围）** |
| 9 | 前台岗位页提交一次投递 | `/leads` 出现新线索，`status = new` |
| 10 | 线索详情 → 标记已审 → 标记合格 → 「转为人才」 | 生成/复用 Talent，Lead → `converted` |
| 11 | `/talents/{id}` → 「加入岗位推进」→ 选刚才的岗位 | 生成 Application，`matching` 状态 |
| 12 | `/pipeline` 推进阶段 → `/applications/{id}` | 阶段变更 + StageEvent 时间线自动写入 |
| 13 | 清理：公开岗位「下架」→「归档」；内部岗位「关闭」→「归档」 | 前台不再可见（无删除接口，归档即下线） |

第 5 步填写内容（照抄即可）：

| 字段（编辑态位置） | 中文 | 英文 |
|---|---|---|
| 公开标题（公开信息卡片） | 量子测控工程师 | Quantum Measurement & Control Engineer |
| 方向（岗位归类卡片） | 量子测控系统 | Quantum Measurement & Control Systems |
| 职级（岗位归类卡片） | 中级研发 | Mid-level R&D |
| 一句话摘要（公开信息卡片） | 负责超导量子芯片测控链路搭建与优化 | Own the readout and control chain for superconducting qubit chips |

### TC-02 存量练手：用现成草稿岗位（不新增数据）

库里已有一个 `draft` 岗位 **`QJ-26-0076 量子计算测试岗位`**（公司：不筹量子），且**已存在对应公开岗位、4 个英文字段为空** —— 正好用来练手：

`/jobs` 搜 `QJ-26-0076` → 详情「开始招聘」→ 下方「公开岗位 (1)」→ 「编辑发布信息」→ 补 4 个英文 → 保存 → 发布 → 预览 → 下架归档。

同样的还有 `QJ-26-0063 技术行政岗`（英文为空，已发布状态）。

### TC-03 负向用例（验证校验真的生效）

| 操作 | 期望报错 |
|---|---|
| 新建岗位 JD 与硬性要求都留空 → 创建公开岗位 → 发布 | `At least one of responsibilities or requirements is required` |
| 底层岗位仍处于 `draft` → 直接发布公开岗位 | `Cannot publish: underlying job is not recruiting` |
| 赛道填脏值（非四大赛道）→ 发布 | `岗位赛道值无效，请重新选择赛道` |
| 草稿状态勾选「急招」→ 保存 | `请先发布岗位，再设置为急招` |

### TC-04 运营用例

`/publications` 勾选多条 → 批量公开 / 停止发布 / 设为精选 / 取消精选；状态、赛道、精选三个筛选器组合使用；赛道为空的行显示为「未归类」，可批量归类。

批量是「部分成功」语义：单条无权限/状态不符会以 `failed` 条目返回（HTTP 仍 200），不是整批回滚。

## 4. 中英文字段规则

| 前台展示位 | DB 列 | Domain 字段 | 英文为空时 |
|---|---|---|---|
| 岗位标题 | `public_title_en` | `title_en` | 回落中文标题 |
| 方向 | `direction_en` | `direction_en` | 回落中文方向 |
| 职级 | `seniority_en` | `seniority_en` | 回落中文职级 |
| 一句话摘要 | `summary_en` | `summary_en` | 回落中文摘要 |
| 学历要求 | `education_en`（迁移 003） | `education_en` | 回落前台枚举映射表 / 数字兜底 → 中文 |
| 经验要求 | `experience_en`（迁移 003） | `experience_en` | 回落前台枚举映射表 / 数字兜底 → 中文 |

- 标题/方向/职级/摘要/学历/经验六个字段的录入口都在 `/publications/{id}` 编辑态的 `EN` 输入框。`/jobs/new`、`/jobs/{id}` 没有英文字段（内部岗位按设计不对外，无需英文）。
- 「创建公开岗位」只快照中文字段，英文一律为空，**必须二次编辑补英文**。
- 学历/经验额外有一层前台映射兜底（`localized-helpers.ts` 的 EDUCATION_EN_MAP / EXPERIENCE_EN_MAP，键为去空格归一值）+ 数字格式兜底（`3-5年`→`3-5 years`、`5年以上`→`5+ years`）；映射不到且英文列也空时，英文模式**原样显示中文**（不乱码、不消失）。
- 已回填情况：002 已回填 72/74 标题等四字段；003 会回填全部存量学历/经验英文（含「小学学历」「会使用AI Agent工具」「不限」「未明确」等此前未覆盖的取值）。
- 城市会被归一化：北上广深保留市名，其他城市归一到省（对外只显示到省）。
- 权限：编辑需 `publication_edit`，发布/下架需 `publication_publish`，精选/急招需 `publication_operate`。当前库里只有 1 个 super_admin profile，默认全权限。

### 迁移脚本索引

| 文件 | 内容 | 状态 |
|---|---|---|
| `supabase/migrations/002_add_publication_english_fields.sql` | 标题/方向/职级/摘要英文列 + 回填 | 已执行 |
| `supabase/migrations/003_add_education_experience_english_fields.sql` | 学历/经验英文列 + 存量回填（幂等） | **待执行**（根目录副本 `D:\Jiachi\job-publications-english-fields-003.sql`） |

## 5. 完成 / 未完成清单

### 已完成（代码已实现且数据跑得通）

- 公司 CRUD、内部岗位 CRUD、`job_code` 自动生成与搜索
- 岗位状态机（draft/recruiting/paused/closed/archived）
- 公开岗位生成 / 编辑 / 发布 / 下架 / 重新发布 / 归档，含 4 个批量操作（部分成功语义）
- 赛道归类、精选、急招（含生命周期，下架归档自动清除）
- **公开岗位中英双语四字段**（DB 迁移 + 中台录入 + 前台渲染与回落）—— 本轮新增
- 公开 API：岗位列表 / 详情 / 投递 / 埋点
- Lead → Talent 转换（RPC 去重）、Application 创建与阶段推进（RPC + DB Trigger 写 StageEvent）
- Pipeline 看板（按钮推进）、Analytics 看板
- 团队与权限 API：成员 CRUD、授权/撤销（POST/DELETE）、团队创建、离职交接（比 8 月审计文档已补齐）
- 批量导入接口（不筹、太一截图）

### 未完成 / 有风险（按优先级）

| # | 项 | 说明 |
|---|---|---|
| 1 | JD 正文英文缺失 | 职责/要求只有中文，英文模式下仍是中文。二期范围，需 DB 再加列 + 录入 + 前台接入（学历/经验的英文列已由 003 补上） |
| 2 | 创建公开岗位不带英文 | 每次都要二次进详情页补，漏补就静默回落中文（不报错、不易发现） |
| 3 | 权限覆盖不全 | 公司/岗位/线索/人才/申请的写接口只校验「已登录」，不走权限引擎；8 个权限键里 4 个从未被 API 强制 |
| 4 | 多角色 UAT 未做 | 库里只有 1 个 super_admin，无 team_lead / internal_consultant 账号，权限边界未经真实验证 |
| 5 | 人才联系方式保护不完整 | 列表/详情接口 `select('*')` 返回未脱敏手机号邮箱；审批 RPC `decide_talent_contact_access` 不存在，审批按钮点了必失败 |
| 6 | Pipeline 拖拽未实现 | 只能用按钮推进 |
| 7 | 外部协作未闭环 | 「邀请顾问」是无 onClick 的死按钮；`external_job_access` / `external_referrals` 无页面无接口 |
| 8 | 占位页未清理 | `/settings` 静态 mock（点保存只弹提示不落库）、`/showcase/seo`、`/showcase/utm` 均为「开发中」占位 |
| 9 | 无删除能力 | 任何对象只能归档，误建数据无法物理删除 |
| 10 | slug 不可改 | 创建时按标题生成（中文标题会生成中文 slug），之后无编辑入口 |
| 11 | 工程债 | Migration 与真实库 schema drift 不可直接执行；Repository 为 untyped 客户端；表间几乎无外键、无 `updated_at` 触发器；批量接口全拒场景 `failed` 计数翻倍（仅统计错误） |
| 12 | 死代码 | `src/lib/mock-data.ts`、`/api/auth/login` 旧登录路由、部分 permissions 工具函数无调用方 |

## 6. 一句话总结

中台的**发布主链是通的**：建岗位 → 开始招聘 → 创建公开岗位 → 补中英文 → 发布 → 前台可见 → 投递回流 → 转人才 → 推进阶段，全链路有真实数据支撑。当前的短板集中在三处：**英文只覆盖到标题/方向/职级/摘要（JD 正文没做）**、**权限体系代码有但没真正落地验证**、**若干运营页面还是占位/死按钮**。建议下一步优先补 JD 正文英文与「创建公开岗位时一并带英文」，这两项直接决定英文站点的完整度。
