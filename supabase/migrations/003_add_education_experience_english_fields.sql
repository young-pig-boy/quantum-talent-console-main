-- 003_add_education_experience_english_fields.sql
-- 为 job_publications 增加学历/经验英文列，并回填存量数据。
-- 可重复执行（幂等）：ADD COLUMN IF NOT EXISTS + 仅回填 education_en IS NULL 的行。
--
-- 前台取值链（showcase/src/lib/localized-helpers.ts）：
--   英文模式 → education_en / experience_en 优先
--   → 回落 EDUCATION_EN_MAP / EXPERIENCE_EN_MAP 枚举映射
--   → 回落数字兜底（"3-5年" → "3-5 years"）
--   → 回落中文原值

ALTER TABLE job_publications
  ADD COLUMN IF NOT EXISTS education_en TEXT;

ALTER TABLE job_publications
  ADD COLUMN IF NOT EXISTS experience_en TEXT;

-- ── 回填 education_en（键为去除空格后的归一化值）────────────────────────
UPDATE job_publications
SET education_en = CASE replace(education, ' ', '')
  WHEN '不限'                                   THEN 'Not specified'
  WHEN '博士'                                   THEN 'PhD'
  WHEN '博士及以上'                             THEN 'PhD or above'
  WHEN '大专'                                   THEN 'Associate degree'
  WHEN '小学学历'                               THEN 'Primary school education'
  WHEN '待从详情页确认'                         THEN 'To be confirmed from the detailed JD'
  WHEN '未明确'                                 THEN 'Not specified'
  WHEN '本科'                                   THEN 'Bachelor''s degree'
  WHEN '本科及以上'                             THEN 'Bachelor''s degree or above'
  WHEN '硕士'                                   THEN 'Master''s degree'
  WHEN '硕士/博士，或具备3年以上半导体PIE经验'  THEN 'Master''s/PhD, or 3+ years of semiconductor PIE experience'
  WHEN '硕士及以上'                             THEN 'Master''s degree or above'
  WHEN '硕士及以上，博士优先'                   THEN 'Master''s degree or above, PhD preferred'
  WHEN '统招本科'                               THEN 'Full-time Bachelor''s degree'
  WHEN '金融、经济或管理相关专业优先'           THEN 'Finance, economics or management background preferred'
  ELSE NULL
END
WHERE education IS NOT NULL
  AND education_en IS NULL;

-- ── 回填 experience_en ──────────────────────────────────────────────────
UPDATE job_publications
SET experience_en = CASE replace(experience, ' ', '')
  WHEN '3年以上全栈或后端经验，有线上运维和平台落地经验'         THEN '3+ years full-stack or backend, with production operations and platform delivery experience'
  WHEN '3年以上后端、平台或AI系统开发经验'                       THEN '3+ years in backend, platform or AI system development'
  WHEN '3年以上运行时、HPC、深度学习底层或异构计算经验'          THEN '3+ years in runtime, HPC, deep-learning infrastructure or heterogeneous computing'
  WHEN '3-5年'                                                   THEN '3-5 years'
  WHEN '5年以上'                                                 THEN '5+ years'
  WHEN '8年以上一级市场IR/FA经验，需有硬科技大额融资交割案例'    THEN '8+ years in primary-market IR/FA, incl. large deep-tech financing deals'
  WHEN '8年以上政府关系经验，需有省级以上科技项目申报经验'       THEN '8+ years of government relations experience, incl. provincial-level sci-tech project applications'
  WHEN '不限'                                                    THEN 'Not specified'
  WHEN '中高级，需有AMDXilinxRFSoC完整项目经验'                  THEN 'Mid-senior level; end-to-end AMD Xilinx RFSoC project experience required'
  WHEN '会使用AIAgent工具'                                       THEN 'Hands-on experience with AI Agent tools'
  WHEN '初级岗位；年限待确认'                                    THEN 'Junior role; years of experience to be confirmed'
  WHEN '实习岗位；年限待确认'                                    THEN 'Internship; years of experience to be confirmed'
  WHEN '封装或半导体行业5年以上'                                 THEN '5+ years in packaging or semiconductor industry'
  WHEN '待从详情页确认'                                          THEN 'To be confirmed from the detailed JD'
  WHEN '战略规划5年以上，量子/光芯片研发背景5年以上'             THEN '5+ years in strategic planning and 5+ years in quantum / photonic chip R&D'
  WHEN '未明确'                                                  THEN 'Not specified'
  WHEN '未明确，需有Zynq/RFSoC软硬件协同经验'                    THEN 'Not specified; Zynq/RFSoC hardware-software co-design experience required'
  WHEN '生物大分子、酶催化或QM/MM经验优先'                       THEN 'Biomacromolecule, enzyme catalysis or QM/MM experience preferred'
  WHEN '资本市场/IPO5年以上，完整参与IPO全流程'                  THEN '5+ years in capital markets / IPO, with end-to-end IPO involvement'
  WHEN '资深岗3年以上底层系统、中间件或大型设备控制系统经验'     THEN 'Senior role; 3+ years in low-level systems, middleware or large equipment control systems'
  WHEN '资深岗3年以上编译器、虚拟机、HPC或底层软件经验'          THEN 'Senior role; 3+ years in compilers, virtual machines, HPC or low-level software'
  WHEN '量子算法/计算化学5年以上，团队管理3年以上'               THEN '5+ years in quantum algorithms / computational chemistry, 3+ years in team management'
  WHEN '需有大模型预训练、分布式训练和复杂项目主导经验'          THEN 'LLM pre-training, distributed training and complex project leadership experience required'
  WHEN '需有完整流片和良率提升经验'                              THEN 'Hands-on tape-out and yield improvement experience required'
  WHEN '需有至少一个量子算法方向的实际项目经验'                  THEN 'Hands-on project experience in at least one quantum algorithm area required'
  WHEN '需有超净间微纳加工和至少一个核心工艺模块经验'            THEN 'Cleanroom micro/nano fabrication and at least one core process module experience required'
  WHEN '飞秒激光、光波导或纳米结构加工经验优先'                  THEN 'Femtosecond laser, optical waveguide or nanostructure fabrication experience preferred'
  WHEN '高级岗，需有射频系统或子模块开发经验'                    THEN 'Senior role; RF system or sub-module development experience required'
  ELSE NULL
END
WHERE experience IS NOT NULL
  AND experience_en IS NULL;
