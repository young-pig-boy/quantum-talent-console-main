"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, AlertCircle, Layers } from "lucide-react";
import { jobsApi, companiesApi } from "@/lib/api";
import type { IntakeMetadata } from "@/lib/domain/types";

const PRIORITY_OPTIONS = [
  { value: "", label: "未设置" },
  { value: "P0", label: "P0 - 最高" },
  { value: "P1", label: "P1 - 高" },
  { value: "P2", label: "P2 - 普通" },
];

const PUBLICATION_STATUS_OPTIONS = [
  { value: "", label: "无" },
  { value: "待公司确认", label: "待公司确认" },
  { value: "待确认薪酬和公开授权", label: "待确认薪酬和公开授权" },
  { value: "待确认学历、经验、薪酬和公开授权", label: "待确认学历/经验/薪酬/授权" },
  { value: "已确认可公开", label: "已确认可公开" },
  { value: "暂不发布", label: "暂不发布" },
];

const inputClass = "w-full bg-muted border-none rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors";
const labelClass = "block text-xs font-medium text-muted-foreground mb-1";
const selectClass = "w-full bg-muted border-none rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors";

export default function NewJobPage() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; display_name?: string }>>([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [salaryInternal, setSalaryInternal] = useState("");
  const [jd, setJd] = useState("");
  const [hardRequirements, setHardRequirements] = useState("");
  const [exclusionRules, setExclusionRules] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  // Operational fields
  const [priority, setPriority] = useState("");
  const [publishWave, setPublishWave] = useState("");
  const [publicationStatus, setPublicationStatus] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [sourceFile, setSourceFile] = useState("");
  const [duplicateGroup, setDuplicateGroup] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    companiesApi.list({ pageSize: 200 })
      .then(res => {
        const companyList = res.data ?? [];
        setCompanies(companyList.map((c: { id: string; name: string; display_name?: string }) => ({
          id: c.id, name: c.name, display_name: c.display_name
        })));
      })
      .catch(() => setCompaniesError(true))
      .finally(() => setCompaniesLoading(false));
  }, []);

  const buildIntakeMetadata = (): IntakeMetadata | undefined => {
    const meta: IntakeMetadata = {};
    if (priority) meta.priority = priority;
    if (publishWave) meta.publish_wave = parseInt(publishWave) || undefined;
    if (publicationStatus) meta.publication_status = publicationStatus;
    if (sourceId) meta.source_id = sourceId;
    if (sourceFile) meta.source_file = sourceFile;
    if (duplicateGroup) meta.duplicate_group = duplicateGroup;
    return Object.keys(meta).length > 0 ? meta : undefined;
  };

  const handleSubmit = async () => {
    if (!title.trim()) { setError("请输入岗位名称"); return; }
    if (!companyId) { setError("请选择公司"); return; }
    setSubmitting(true);
    setError("");
    try {
      const job = await jobsApi.create({
        company_id: companyId,
        title: title.trim(),
        city: city.trim() || undefined,
        salary_internal: salaryInternal.trim() || undefined,
        jd: jd.trim() || undefined,
        hard_requirements: hardRequirements.trim() || undefined,
        exclusion_rules: exclusionRules.trim() || undefined,
        internal_notes: internalNotes.trim() || undefined,
        intake_metadata: buildIntakeMetadata(),
      });
      router.push(`/jobs/${job.id}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-background p-6">
      <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"><ArrowLeft className="w-4 h-4" />返回岗位列表</button>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Internal Job Info */}
        <div className="bg-card rounded-lg shadow-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center"><Briefcase className="w-5 h-5 text-primary" /></div>
            <h1 className="text-xl font-bold text-foreground">新增内部岗位</h1>
          </div>

          <div className="space-y-4">
            <div>
              <label className={labelClass}>岗位名称 *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} className={inputClass} placeholder="如：量子计算高级研究员" />
            </div>

            <div>
              <label className={labelClass}>所属公司 *</label>
              {companiesError ? (
                <div className="flex items-center gap-1.5 text-xs text-destructive py-1"><AlertCircle className="w-3.5 h-3.5" />公司列表加载失败</div>
              ) : companiesLoading ? (
                <div className="text-xs text-muted-foreground py-1">加载公司列表...</div>
              ) : null}
              <select value={companyId} onChange={e => setCompanyId(e.target.value)} className={selectClass}>
                <option value="">请选择公司</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}{c.display_name ? ` (${c.display_name})` : ""}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>城市</label><input type="text" value={city} onChange={e => setCity(e.target.value)} className={inputClass} placeholder="如：合肥" /></div>
              <div><label className={labelClass}>内部薪资</label><input type="text" value={salaryInternal} onChange={e => setSalaryInternal(e.target.value)} className={inputClass} placeholder="如：60-100K·15个月" /></div>
            </div>

            <div><label className={labelClass}>岗位描述 (JD)</label><textarea value={jd} onChange={e => setJd(e.target.value)} rows={5} className={`${inputClass} resize-none`} placeholder="输入详细的岗位描述..." /></div>
            <div><label className={labelClass}>硬性要求</label><textarea value={hardRequirements} onChange={e => setHardRequirements(e.target.value)} rows={3} className={`${inputClass} resize-none`} placeholder="如：博士学历、5年以上量子计算经验..." /></div>
            <div><label className={labelClass}>排除规则</label><textarea value={exclusionRules} onChange={e => setExclusionRules(e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="如：不接受远程..." /></div>
            <div><label className={labelClass}>内部备注</label><textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} rows={2} className={`${inputClass} resize-none`} placeholder="如：急招、替代离职员工..." /></div>
          </div>
        </div>

        {/* Operational Info */}
        <div className="bg-card rounded-lg shadow-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center"><Layers className="w-5 h-5 text-muted-foreground" /></div>
            <h1 className="text-xl font-bold text-foreground">运营信息</h1>
            <span className="text-xs text-muted-foreground">（可选，存入 intake_metadata）</span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>优先级 (Priority)</label>
                <select value={priority} onChange={e => setPriority(e.target.value)} className={selectClass}>
                  {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>上架批次 (Publish Wave)</label>
                <input type="number" min="0" value={publishWave} onChange={e => setPublishWave(e.target.value)} className={inputClass} placeholder="如：1" />
              </div>
            </div>

            <div>
              <label className={labelClass}>公开确认状态 (Publication Status)</label>
              <select value={publicationStatus} onChange={e => setPublicationStatus(e.target.value)} className={selectClass}>
                {PUBLICATION_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div><label className={labelClass}>来源标识 (Source ID)</label><input type="text" value={sourceId} onChange={e => setSourceId(e.target.value)} className={inputClass} placeholder="如：juliang-quantum-compiler" /></div>
              <div><label className={labelClass}>重复分组 (Duplicate Group)</label><input type="text" value={duplicateGroup} onChange={e => setDuplicateGroup(e.target.value)} className={inputClass} placeholder="如：compiler-engineering" /></div>
            </div>

            <div><label className={labelClass}>来源文件 (Source File)</label><input type="text" value={sourceFile} onChange={e => setSourceFile(e.target.value)} className={inputClass} placeholder="如：矩量光启/猎头职位需求20260731.pdf" /></div>
          </div>
        </div>

        {error && <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">{error}</div>}

        <div className="flex justify-end gap-3">
          <button onClick={() => router.back()} className="px-4 py-2 rounded-md text-sm bg-muted text-foreground hover:bg-accent transition-colors">取消</button>
          <button onClick={handleSubmit} disabled={submitting || !title.trim() || !companyId}
            className="px-5 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 font-medium">
            {submitting ? "创建中..." : "创建岗位"}
          </button>
        </div>
      </div>
    </div>
  );
}
