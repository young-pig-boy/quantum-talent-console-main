-- ============================================================
-- Migration 006: 公开岗位薪资展示英文化
-- 1) 新增 salary_display_en 列（TEXT，与 salary_display 同构）
-- 2) 按映射表回填全部存量取值（18 个去重值全量覆盖）。
-- 幂等：可重复执行。
-- ============================================================

ALTER TABLE job_publications ADD COLUMN IF NOT EXISTS salary_display_en TEXT;

UPDATE job_publications p
SET salary_display_en = m.en
FROM (VALUES
  ('待确认', 'To be confirmed'),
  ('--', '--'),
  ('面议', 'Negotiable'),
  ('30-60k', '30-60k'),
  ('20-35k·15薪', '20-35k · 15-month salary'),
  ('10-20k·15薪', '10-20k · 15-month salary'),
  ('15-23k·15薪', '15-23k · 15-month salary'),
  ('30-60k·15薪', '30-60k · 15-month salary'),
  ('12-35k·13薪', '12-35k · 13-month salary'),
  ('13-26k·15薪', '13-26k · 15-month salary'),
  ('12-15k·15薪', '12-15k · 15-month salary'),
  ('30-60k；部分刊登标注 15薪', '30-60k; some listings note a 15-month salary'),
  ('20-35k；部分刊登标注 15薪', '20-35k; some listings note a 15-month salary'),
  ('20-50k；部分刊登标注 15薪', '20-50k; some listings note a 15-month salary'),
  ('20-40k；部分刊登标注 15薪', '20-40k; some listings note a 15-month salary'),
  ('15-50k；不同刊登版本显示 15薪或未标注', '15-50k; listing versions vary (15-month salary noted or unspecified)')
) AS m(zh, en)
WHERE p.salary_display = m.zh;
