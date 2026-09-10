// Mock data for Quantum Talent Console

export type Company = {
  id: number;
  name: string;
  displayName: string;
  track: string;
  status: "合作中" | "潜在" | "暂停";
  activeJobs: number;
  totalJobs: number;
  updatedAt: string;
  website?: string;
  contact?: string;
  phone?: string;
  description?: string;
};

export type Job = {
  id: number;
  title: string;
  company: string;
  city: string;
  owner: string;
  status: "招聘中" | "暂停" | "草稿" | "已关闭";
  hasPublicVersion: boolean;
  publicStatus: string;
  linkedTalents: number;
  updatedAt: string;
  description?: string;
  requirements?: string[];
};

export type Publication = {
  id: string;
  title: string;
  company: string;
  city: string;
  status: "已发布" | "草稿" | "已下架" | "已归档";
  track: string;
  internalJob: string;
  createdAt: string;
  views: number;
  applications: number;
};

export type Lead = {
  id: number;
  name: string;
  phone: string;
  email: string;
  wechat: string;
  sourceJob: string;
  channel: string;
  appliedAt: string;
  status: "New" | "已查看" | "联系中" | "已确认" | "已转化" | "无效";
};

export type Talent = {
  id: number;
  name: string;
  degree: string;
  gender: string;
  age: number;
  company: string;
  position: string;
  city: string;
  years: number;
  tags: string[];
  source: string;
  owner: string;
  linkedApps: number;
  updatedAt: string;
};

export type PipelineCard = {
  id: string;
  name: string;
  currentCompany: string;
  currentRole: string;
  targetJob: string;
  client: string;
  owner: string;
  stage: string;
  updatedAt: string;
  nextStep: string;
};

// ---- Companies ----
export const companies: Company[] = [
  { id: 1, name: "国盾量子科技", displayName: "QuantumShield Tech", track: "量子通信", status: "合作中", activeJobs: 3, totalJobs: 5, updatedAt: "2024-12-18" },
  { id: 2, name: "本源量子计算", displayName: "Origin Quantum", track: "量子计算", status: "合作中", activeJobs: 1, totalJobs: 2, updatedAt: "2024-12-15" },
  { id: 3, name: "问天量子", displayName: "AskSky Quantum", track: "量子通信", status: "潜在", activeJobs: 0, totalJobs: 1, updatedAt: "2024-12-10" },
  { id: 4, name: "启科量子", displayName: "Qudoor", track: "量子计算", status: "合作中", activeJobs: 5, totalJobs: 7, updatedAt: "2024-12-08" },
  { id: 5, name: "量子星河", displayName: "Galaxy Quantum", track: "量子传感", status: "暂停", activeJobs: 0, totalJobs: 3, updatedAt: "2024-11-25" },
  { id: 6, name: "微观量子材料", displayName: "MicroQ Materials", track: "量子材料", status: "合作中", activeJobs: 2, totalJobs: 4, updatedAt: "2024-12-01" },
  { id: 7, name: "中科量子传感", displayName: "CAS Quantum Sensing", track: "量子传感", status: "潜在", activeJobs: 0, totalJobs: 2, updatedAt: "2024-11-20" },
  { id: 8, name: "量子芯云", displayName: "Q-Chip Cloud", track: "量子计算", status: "合作中", activeJobs: 4, totalJobs: 6, updatedAt: "2024-12-19" },
];

// ---- Jobs ----
export const jobs: Job[] = [
  { id: 1, title: "量子算法工程师", company: "本源量子计算", city: "合肥", owner: "张明远", status: "招聘中", hasPublicVersion: true, publicStatus: "招聘中", linkedTalents: 5, updatedAt: "2025-01-15" },
  { id: 2, title: "量子软件工程师", company: "国盾量子", city: "北京", owner: "李雨桐", status: "招聘中", hasPublicVersion: true, publicStatus: "招聘中", linkedTalents: 3, updatedAt: "2025-01-12" },
  { id: 3, title: "量子硬件工程师", company: "问天量子", city: "上海", owner: "王浩然", status: "招聘中", hasPublicVersion: false, publicStatus: "-", linkedTalents: 0, updatedAt: "2025-01-10" },
  { id: 4, title: "量子通信研究员", company: "国盾量子", city: "北京", owner: "赵思远", status: "暂停", hasPublicVersion: true, publicStatus: "已暂停", linkedTalents: 2, updatedAt: "2024-12-28" },
  { id: 5, title: "量子传感工程师", company: "量子科学中心", city: "深圳", owner: "陈子涵", status: "招聘中", hasPublicVersion: true, publicStatus: "招聘中", linkedTalents: 1, updatedAt: "2025-01-08" },
  { id: 6, title: "量子纠错专家", company: "本源量子计算", city: "合肥", owner: "刘博文", status: "草稿", hasPublicVersion: false, publicStatus: "-", linkedTalents: 0, updatedAt: "2025-01-18" },
];

// ---- Publications ----
export const publications: Publication[] = [
  { id: "pub-001", title: "高级前端工程师（React）", company: "字节跳动", city: "北京", status: "已发布", track: "技术研发", internalJob: "高级前端工程师（P6）", createdAt: "2024-06-15", views: 2486, applications: 128 },
  { id: "pub-002", title: "后端开发工程师（Go）", company: "阿里巴巴", city: "杭州", status: "已发布", track: "技术研发", internalJob: "Go 后端工程师（P7）", createdAt: "2024-06-10", views: 3102, applications: 205 },
  { id: "pub-003", title: "高级产品经理（AI 方向）", company: "腾讯", city: "深圳", status: "草稿", track: "产品", internalJob: "AI 产品经理（P8）", createdAt: "2024-06-20", views: 0, applications: 0 },
  { id: "pub-004", title: "UI / UX 设计师", company: "小红书", city: "上海", status: "已下架", track: "设计", internalJob: "资深 UI 设计师（P6）", createdAt: "2024-05-28", views: 1875, applications: 93 },
  { id: "pub-005", title: "数据分析师（增长方向）", company: "美团", city: "北京", status: "已发布", track: "数据", internalJob: "高级数据分析师（P7）", createdAt: "2024-06-01", views: 1543, applications: 67 },
  { id: "pub-006", title: "运营总监", company: "京东", city: "北京", status: "已归档", track: "运营", internalJob: "运营总监（M3）", createdAt: "2024-03-15", views: 4520, applications: 312 },
  { id: "pub-007", title: "量子计算研究员", company: "本源量子", city: "合肥", status: "已发布", track: "技术研发", internalJob: "量子计算研究员", createdAt: "2025-01-10", views: 680, applications: 42 },
];

// ---- Leads ----
export const leads: Lead[] = [
  { id: 1, name: "张三", phone: "138****1234", email: "zhangsan@example.com", wechat: "zhangsan_wx", sourceJob: "量子算法工程师", channel: "官网", appliedAt: "2025-01-20 10:30", status: "New" },
  { id: 2, name: "李四", phone: "139****5678", email: "lisi@example.com", wechat: "lisi_wx", sourceJob: "量子软件工程师", channel: "微信", appliedAt: "2025-01-19 15:20", status: "已查看" },
  { id: 3, name: "王五", phone: "137****9012", email: "wangwu@example.com", wechat: "wangwu_wx", sourceJob: "量子硬件工程师", channel: "邮件", appliedAt: "2025-01-18 09:45", status: "联系中" },
  { id: 4, name: "赵六", phone: "150****3456", email: "zhaoliu@example.com", wechat: "", sourceJob: "量子通信研究员", channel: "官网", appliedAt: "2025-01-17 14:10", status: "已确认" },
  { id: 5, name: "钱七", phone: "186****7890", email: "qianqi@example.com", wechat: "qianqi_wx", sourceJob: "量子传感工程师", channel: "人工录入", appliedAt: "2025-01-16 11:00", status: "已转化" },
  { id: 6, name: "周八", phone: "152****2345", email: "zhouba@example.com", wechat: "", sourceJob: "量子算法工程师", channel: "微信", appliedAt: "2025-01-15 08:30", status: "无效" },
];

// ---- Talents ----
export const talents: Talent[] = [
  { id: 1, name: "张伟", degree: "博士", gender: "男", age: 32, company: "本源量子", position: "量子算法研究员", city: "合肥", years: 5, tags: ["量子算法", "量子纠错", "VQE"], source: "内推", owner: "陈默", linkedApps: 3, updatedAt: "2025-04-12" },
  { id: 2, name: "李娜", degree: "硕士", gender: "女", age: 28, company: "国盾量子", position: "量子软件工程师", city: "北京", years: 3, tags: ["量子软件", "Qiskit", "Cirq"], source: "猎头", owner: "刘洋", linkedApps: 2, updatedAt: "2025-03-28" },
  { id: 3, name: "王强", degree: "博士", gender: "男", age: 35, company: "华为2012实验室", position: "量子硬件架构师", city: "上海", years: 8, tags: ["量子硬件", "超导量子", "微波工程"], source: "学术会议", owner: "陈默", linkedApps: 5, updatedAt: "2025-04-05" },
  { id: 4, name: "赵敏", degree: "博士", gender: "女", age: 31, company: "中科大", position: "量子通信专家", city: "合肥", years: 6, tags: ["量子通信", "QKD", "纠缠分发"], source: "主动投递", owner: "黄蕾", linkedApps: 1, updatedAt: "2025-03-15" },
  { id: 5, name: "孙磊", degree: "博士", gender: "男", age: 27, company: "清华大学", position: "量子传感博士", city: "北京", years: 2, tags: ["量子传感", "NV色心"], source: "学术会议", owner: "刘洋", linkedApps: 2, updatedAt: "2025-04-18" },
  { id: 6, name: "周芳", degree: "博士", gender: "女", age: 30, company: "南方科技大学", position: "量子纠错研究员", city: "深圳", years: 4, tags: ["量子算法", "表面码", "容错量子"], source: "内推", owner: "黄蕾", linkedApps: 1, updatedAt: "2025-04-01" },
  { id: 7, name: "吴军", degree: "博士", gender: "男", age: 29, company: "阿里巴巴达摩院", position: "量子计算PhD", city: "杭州", years: 3, tags: ["量子算法", "量子软件"], source: "猎头", owner: "陈默", linkedApps: 4, updatedAt: "2025-04-10" },
  { id: 8, name: "郑雨", degree: "硕士", gender: "女", age: 26, company: "启科量子", position: "量子芯片工程师", city: "深圳", years: 2, tags: ["量子硬件", "离子阱"], source: "主动投递", owner: "刘洋", linkedApps: 0, updatedAt: "2025-04-20" },
];

// ---- Pipeline ----
export const pipelineCards: PipelineCard[] = [
  { id: "card-1", name: "林雨桐", currentCompany: "阿里巴巴", currentRole: "资深前端工程师", targetJob: "高级前端工程师", client: "字节跳动", owner: "张伟", stage: "matching", updatedAt: "2h前", nextStep: "发送匹配报告" },
  { id: "card-2", name: "赵思远", currentCompany: "腾讯", currentRole: "SRE高级工程师", targetJob: "DevOps专家", client: "美团", owner: "李娜", stage: "matching", updatedAt: "5h前", nextStep: "完成技能评估" },
  { id: "card-3", name: "陈明远", currentCompany: "滴滴", currentRole: "高级产品经理", targetJob: "产品经理（B端）", client: "蚂蚁集团", owner: "王芳", stage: "contacting", updatedAt: "1d前", nextStep: "电话初筛" },
  { id: "card-4", name: "周晓琳", currentCompany: "网易", currentRole: "大数据开发", targetJob: "数据工程师", client: "快手", owner: "陈杰", stage: "contacting", updatedAt: "1d前", nextStep: "发送JD" },
  { id: "card-5", name: "黄志远", currentCompany: "Shopee", currentRole: "前端技术专家", targetJob: "高级前端工程师", client: "字节跳动", owner: "张伟", stage: "interested", updatedAt: "3h前", nextStep: "安排沟通" },
  { id: "card-6", name: "孙雅文", currentCompany: "美团", currentRole: "资深UX设计师", targetJob: "UX设计负责人", client: "小红书", owner: "王芳", stage: "interested", updatedAt: "8h前", nextStep: "作品集评审" },
  { id: "card-7", name: "林雨桐", currentCompany: "阿里巴巴", currentRole: "资深前端工程师", targetJob: "高级前端工程师", client: "字节跳动", owner: "张伟", stage: "recommended", updatedAt: "1d前", nextStep: "跟进客户反馈" },
  { id: "card-8", name: "赵思远", currentCompany: "腾讯", currentRole: "SRE高级工程师", targetJob: "DevOps专家", client: "美团", owner: "李娜", stage: "recommended", updatedAt: "2d前", nextStep: "协调面试时间" },
];

export function getCompanyById(id: number) { return companies.find(c => c.id === id); }
export function getJobById(id: number) { return jobs.find(j => j.id === id); }
export function getPublicationById(id: string) { return publications.find(p => p.id === id); }
export function getTalentById(id: number) { return talents.find(t => t.id === id); }
export function getLeadById(id: number) { return leads.find(l => l.id === id); }

// ---- Pipeline Columns (grouped by stage) ----
export const pipelineColumns = [
  { id: "matching", name: "匹配中", items: pipelineCards.filter(c => c.stage === "matching") },
  { id: "contacting", name: "联系中", items: pipelineCards.filter(c => c.stage === "contacting") },
  { id: "interested", name: "有意向", items: pipelineCards.filter(c => c.stage === "interested") },
  { id: "recommended", name: "已推荐", items: pipelineCards.filter(c => c.stage === "recommended") },
  { id: "interviewing", name: "面试中", items: pipelineCards.filter(c => c.stage === "interviewing") },
  { id: "offering", name: "发Offer", items: pipelineCards.filter(c => c.stage === "offering") },
];
