# 画廊风

## 类型
摄影作品集、艺术家主页、建筑作品、设计师 portfolio。

## 设计关键词
极简、画廊感、大留白、低干扰、作品优先。

## 色彩
- 背景：#FAFAF7
- 文本：#151515
- 次文本：#77736B
- 深色卡：#1A1A1A
- 线条：#E6E2DA

## 字体
使用 Helvetica、Neue Haas Grotesk、Inter。标题不宜过度装饰。

## 布局
采用非对称网格，大图和小图混排。项目说明保持简短。

## 组件
- 项目网格
- 作品编号
- 大图区域
- 悬浮项目标题
- 简洁筛选

## 动效
图片 hover 轻微放大或降低亮度即可。

## 禁忌
不要使用花哨按钮，不要让 UI 抢走作品注意力。

---

# Console 数据表浏览体验规范（飞书多维表格 / Airtable 式）

> 应用于 Console 内所有多字段业务列表页（岗位 Jobs / 公开岗位 Publications / 线索 Leads / 人才 Talents / 公司 Companies）。

## 交互模型
- 纵向看记录、横向看字段；关键识别列固定，其他字段横向滚动。
- 表格允许宽于视口（`min-width: max-content`），页面本身不横移，仅表格区域左右滚动。

## 固定列规则
- 第一固定列：Checkbox（如有，`stickyLeft={0}`，宽 `w-12`）。
- 第二固定列：业务对象主识别字段（岗位 / 候选人 / 公司），`stickyLeft={80}`（Publications 含 checkbox 时）。
- 右侧：高频操作列 `stickyRight`，操作按钮单行展示（nowrap）。
- 固定列背景与行背景一致（`--color-card`），行 hover 时固定列同步 hover；固定列边缘带极轻分割阴影（1px 边框 + 5px 弥散阴影）。

## 列宽（min-width 参考）
- Checkbox 48–80px；岗位/公司/候选人 280–340px；赛道 150px；发布状态 130px；精选/急招 110px；城市 130px；更新时间 170px；操作 100–180px。
- 宁可横向滚动，不为塞进一屏压缩列宽或缩小字体。

## 文本与换行
- 表头 / Badge / 状态 / 按钮 / 城市 / 日期统一 `white-space: nowrap`，禁止出现「发/布/状/态」式拆行。
- 长文本（岗位名、公司名、职位、邮箱、备注）单行 + ellipsis 截断，Hover 通过 `title` 展示完整内容；辅助信息最多第二行。

## 表头与滚动
- 表头 Sticky（`thead th { position: sticky; top: 0 }`），纵向滚动时字段名常驻。
- 表格容器 `overflow: auto` + `max-height`（约 `calc(100vh - 17rem)`，有批量操作栏的页面用 `-20rem`），Scrollbar 轻量美化但不可隐藏，触控板/移动端原生横滑。
- 行高 comfortable 不松散：核心字段单行、辅助信息最多第二行、Badge 单行、操作单行。

## 主题
- 固定列背景 / hover 全部基于 CSS 变量（`--color-card` / `--color-muted`），Light / Dark 均不穿透。

## 本轮不引入（后续产品能力）
- 用户自定义字段、拖拽改列宽、字段隐藏、保存视图、自定义排序、数据库字段编辑。