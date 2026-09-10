"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Briefcase, Building2, MapPin, User, Clock, Globe, Play, Pause, Archive, X, ExternalLink, Pencil, Save, FileText, AlertCircle, Layers, Tag } from "lucide-react";
import { jobsApi, companiesApi, publicationsApi } from "@/lib/api";
import { useApi } from "@/lib/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { LoadingPage } from "@/components/loading-page";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { JobCode } from "@/components/job-code";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDate } from "@/lib/format";
import type { Job, Company, JobPublication, IntakeMetadata } from "@/lib/domain/types";

const STATUS_OPTIONS = [
  { value: "draft", label: "草稿" },
  { value: "recruiting", label: "招聘中" },
  { value: "paused", label: "暂停" },
  { value: "closed", label: "已关闭" },
  { value: "archived", label: "已归档" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "未设置" },
  { value: "P0", label: "P0" },
  { value: "P1", label: "P1" },
  { value: "P2", label: "P2" },
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

function Section({ title, content }: { title: string; content: string | null | undefined }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <div className="bg-muted/40 rounded-md p-4"><p className="text-sm text-muted-foreground whitespace-pre-wrap">{content || "-"}</p></div>
    </div>
  );
}

function CardSection({ title, icon: Icon, children, className = "" }: { title: string; icon?: React.ComponentType<{ className?: string }>; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card rounded-lg shadow-card p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="w-4 h-4 text-muted-foreground" />}
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function InfoItem({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground shrink-0">{label}：</span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { success, error: toastError } = useToast();

  const [editing, setEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [form, setForm] = useState({
    title: "", city: "", salary_internal: "", jd: "",
    hard_requirements: "", exclusion_rules: "", internal_notes: "",
    priority: "", publish_wave: "", publication_status: "",
    source_file: "", duplicate_group: "", source_id: "",
  });
  const [formError, setFormError] = useState("");

  const { data: job, loading, error, refetch } = useApi(() => jobsApi.getById(id), [id]);
  const { data: company, refetch: refetchCompany } = useApi(
    () => (job?.company_id ? companiesApi.getById(job.company_id) : Promise.resolve(null as Company | null)),
    [job?.company_id]
  );
  const { data: pubResult, refetch: refetchPubs } = useApi(
    () => publicationsApi.list({ job_id: id, pageSize: 50 }),
    [id]
  );
  const publications: JobPublication[] = (pubResult as { data?: JobPublication[] })?.data ?? [];

  useEffect(() => {
    if (job) {
      const meta = job.intake_metadata ?? ({} as IntakeMetadata);
      setForm({
        title: job.title ?? "", city: job.city ?? "",
        salary_internal: job.salary_internal ?? "", jd: job.jd ?? "",
        hard_requirements: job.hard_requirements ?? "", exclusion_rules: job.exclusion_rules ?? "",
        internal_notes: job.internal_notes ?? "",
        priority: meta.priority ?? "", publish_wave: meta.publish_wave ? String(meta.publish_wave) : "",
        publication_status: meta.publication_status ?? "", source_file: meta.source_file ?? "",
        duplicate_group: meta.duplicate_group ?? "", source_id: meta.source_id ?? "",
      });
    }
  }, [job]);

  const buildIntakeMetadata = (): IntakeMetadata | null => {
    const meta: IntakeMetadata = {};
    if (form.priority) meta.priority = form.priority;
    if (form.publish_wave) meta.publish_wave = parseInt(form.publish_wave) || undefined;
    if (form.publication_status) meta.publication_status = form.publication_status;
    if (form.source_file) meta.source_file = form.source_file;
    if (form.duplicate_group) meta.duplicate_group = form.duplicate_group;
    if (form.source_id) meta.source_id = form.source_id;
    return Object.keys(meta).length > 0 ? meta : null;
  };

  const handleSave = async () => {
    if (!form.title.trim()) { setFormError("岗位名称不能为空"); return; }
    setActionLoading("save");
    try {
      await jobsApi.update(id, {
        title: form.title.trim(), city: form.city.trim(),
        salary_internal: form.salary_internal.trim() || undefined,
        jd: form.jd.trim() || undefined,
        hard_requirements: form.hard_requirements.trim() || undefined,
        exclusion_rules: form.exclusion_rules.trim() || undefined,
        internal_notes: form.internal_notes.trim() || undefined,
        intake_metadata: buildIntakeMetadata() ?? undefined,
      });
      success("岗位信息已保存");
      await refetch();
      setEditing(false);
    } catch (e) { setFormError((e as Error).message); toastError((e as Error).message); } finally { setActionLoading(null); }
  };

  const handleAction = async (action: string, fn: () => Promise<unknown>, confirm = false) => {
    if (confirm) {
      if (action === "close") setConfirmClose(true);
      if (action === "archive") setConfirmArchive(true);
      return;
    }
    setActionLoading(action);
    try { await fn(); success("操作成功"); refetch(); refetchPubs(); } catch (e) { toastError((e as Error).message); } finally { setActionLoading(null); }
  };

  const doClose = () => handleAction("close", () => jobsApi.close(id));
  const doArchive = () => handleAction("archive", () => jobsApi.archive(id));
  const doStartRecruiting = async () => {
    setActionLoading("start");
    try { await jobsApi.start(id); success("开始招聘"); refetch(); refetchPubs(); } catch (e) { toastError((e as Error).message); } finally { setActionLoading(null); }
  };
  const createPublication = async () => {
    setActionLoading("pub");
    try { await jobsApi.generatePublication(id); success("公开岗位创建成功"); refetch(); refetchPubs(); } catch (e) { toastError((e as Error).message); } finally { setActionLoading(null); }
  };

  if (loading) return <LoadingPage tip="加载岗位详情..." />;
  if (error || !job) return <ErrorState message={error || "岗位不存在"} onRetry={() => { refetch(); refetchCompany(); refetchPubs(); }} />;

  const meta = job.intake_metadata ?? ({} as IntakeMetadata);

  return (
    <>
      <PageHeader
        title={job.title || "岗位详情"}
        breadcrumbs={[{ label: "控制台", href: "/" }, { label: "岗位管理", href: "/jobs" }, { label: job.title || "-" }]}
        actions={
          <div className="flex gap-2">
            {editing ? (
              <>
                <button onClick={() => { setEditing(false); setFormError(""); }} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors"><X className="w-3.5 h-3.5" />取消</button>
                <button onClick={handleSave} disabled={actionLoading === "save"} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-on-primary bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50"><Save className="w-3.5 h-3.5" />保存</button>
              </>
            ) : (
              <>
                <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border rounded-md transition-colors"><Pencil className="w-3.5 h-3.5" />编辑</button>
                {job.status === "draft" && (
                  <button onClick={doStartRecruiting} disabled={actionLoading === "start"} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-on-primary bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50"><Play className="w-3.5 h-3.5" />开始招聘</button>
                )}
                {job.status === "recruiting" && (
                  <button onClick={createPublication} disabled={actionLoading === "pub"} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-on-primary bg-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50"><Globe className="w-3.5 h-3.5" />创建公开岗位</button>
                )}
                {job.status === "recruiting" && (
                  <button onClick={() => handleAction("close", doClose, true)} disabled={actionLoading === "close"} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-destructive hover:text-destructive border border-border rounded-md transition-colors disabled:opacity-50"><X className="w-3.5 h-3.5" />关闭</button>
                )}
                {job.status === "closed" && (
                  <button onClick={() => handleAction("archive", doArchive, true)} disabled={actionLoading === "archive"} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-destructive hover:text-destructive border border-border rounded-md transition-colors disabled:opacity-50"><Archive className="w-3.5 h-3.5" />归档</button>
                )}
              </>
            )}
          </div>
        }
      />

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <StatusBadge type="job" value={job.status} />
          {company && (
            <Link href={`/companies/${company.id}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              <Building2 className="w-3.5 h-3.5" />{company.display_name || company.name}
            </Link>
          )}
          {job.city && <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3.5 h-3.5" />{job.city}</span>}
          <JobCode code={job.job_code} />
        </div>

        {formError && <div className="bg-destructive/10 text-destructive text-sm px-4 py-2 rounded-md">{formError}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column — Internal Info */}
          <div className="space-y-6">
            <CardSection title="内部岗位信息" icon={Briefcase}>
              {editing ? (
                <div className="space-y-4">
                  <div><label className={labelClass}>岗位名称</label><input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} /></div>
                  <div><label className={labelClass}>城市</label><input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className={inputClass} placeholder="如：上海、北京" /></div>
                  <div><label className={labelClass}>内部薪酬</label><input type="text" value={form.salary_internal} onChange={e => setForm(f => ({ ...f, salary_internal: e.target.value }))} className={inputClass} placeholder="内部薪酬信息" /></div>
                  <div><label className={labelClass}>原始JD</label><textarea value={form.jd} onChange={e => setForm(f => ({ ...f, jd: e.target.value }))} rows={4} className={inputClass} placeholder="原始JD全文" /></div>
                  <div><label className={labelClass}>硬性要求</label><textarea value={form.hard_requirements} onChange={e => setForm(f => ({ ...f, hard_requirements: e.target.value }))} rows={2} className={inputClass} placeholder="硬性筛选条件" /></div>
                  <div><label className={labelClass}>排除规则</label><textarea value={form.exclusion_rules} onChange={e => setForm(f => ({ ...f, exclusion_rules: e.target.value }))} rows={2} className={inputClass} placeholder="排除条件" /></div>
                  <div><label className={labelClass}>内部备注</label><textarea value={form.internal_notes} onChange={e => setForm(f => ({ ...f, internal_notes: e.target.value }))} rows={2} className={inputClass} placeholder="仅内部可见的备注" /></div>
                </div>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">公司</span><span>{company ? (company.display_name || company.name) : "-"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">岗位名称</span><span>{job.title || "-"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">岗位编号</span><JobCode code={job.job_code} /></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">城市</span><span>{job.city || "-"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">内部薪酬</span><span>{job.salary_internal || "-"}</span></div>
                  <Section title="原始JD" content={job.jd} />
                  <Section title="硬性要求" content={job.hard_requirements} />
                  <Section title="排除规则" content={job.exclusion_rules} />
                  <Section title="内部备注" content={job.internal_notes} />
                </div>
              )}
            </CardSection>

            <CardSection title="岗位运营信息" icon={Layers}>
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>优先级 (Priority)</label><select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className={selectClass}>{PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                    <div><label className={labelClass}>上架批次 (Publish Wave)</label><input type="number" value={form.publish_wave} onChange={e => setForm(f => ({ ...f, publish_wave: e.target.value }))} className={inputClass} placeholder="如：1" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={labelClass}>公开确认状态</label><select value={form.publication_status} onChange={e => setForm(f => ({ ...f, publication_status: e.target.value }))} className={selectClass}>{PUBLICATION_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
                    <div><label className={labelClass}>来源标识 (Source ID)</label><input type="text" value={form.source_id} onChange={e => setForm(f => ({ ...f, source_id: e.target.value }))} className={inputClass} placeholder="如：juliang-quantum-compiler" /></div>
                  </div>
                  <div><label className={labelClass}>重复分组 (Duplicate Group)</label><input type="text" value={form.duplicate_group} onChange={e => setForm(f => ({ ...f, duplicate_group: e.target.value }))} className={inputClass} placeholder="如：compiler-engineering" /></div>
                  <div><label className={labelClass}>来源文件 (Source File)</label><input type="text" value={form.source_file} onChange={e => setForm(f => ({ ...f, source_file: e.target.value }))} className={inputClass} placeholder="如：矩量光启/猎头职位需求20260731.pdf" /></div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">优先级</span><span>{meta.priority || "-"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">上架批次</span><span>{meta.publish_wave ? `第${meta.publish_wave}批` : "-"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">公开确认</span><span>{meta.publication_status || "-"}</span></div>
                  {meta.source_id && <div className="flex justify-between"><span className="text-muted-foreground">来源标识</span><span className="truncate max-w-[200px]">{meta.source_id}</span></div>}
                  {meta.source_file && <div className="flex justify-between"><span className="text-muted-foreground">来源文件</span><span className="truncate max-w-[200px]">{meta.source_file}</span></div>}
                  {meta.duplicate_group && <div className="flex justify-between"><span className="text-muted-foreground">重复分组</span><span>{meta.duplicate_group}</span></div>}
                </div>
              )}
            </CardSection>
          </div>

          {/* Right Column — Status + Pubs */}
          <div className="space-y-6">
            <CardSection title="元数据" icon={Clock}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">状态</span><StatusBadge type="job" value={job.status} /></div>
                <div className="flex justify-between"><span className="text-muted-foreground">负责人</span><span className="text-foreground">{(job.owner_id ?? "").slice(0, 8) || "-"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">创建时间</span><span className="text-foreground">{formatDate(job.created_at)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">更新时间</span><span className="text-foreground">{formatDate(job.updated_at)}</span></div>
              </div>
              {job.status === "recruiting" && (
                <div className="mt-4 pt-4 border-t border-border/20 flex items-start gap-2 text-xs text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span>招聘中岗位可创建公开岗位并接收投递。</span>
                </div>
              )}
            </CardSection>

            <CardSection title={`公开岗位 (${publications.length})`} icon={Globe}>
              {publications.length > 0 ? (
                <div className="space-y-3">
                  {publications.map(pub => (
                    <div key={pub.id} className="border border-border rounded-md p-4 hover:border-primary/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <Link href={`/publications/${pub.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5">
                          {pub.title || "未命名"}<ExternalLink className="w-3 h-3" />
                        </Link>
                        <StatusBadge type="publication" value={pub.status} />
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>公司：{company ? (company.display_name || company.name) : "-"}</div>
                        {pub.salary_display && <div>薪资：{pub.salary_display}</div>}
                        {pub.city && <div>城市：{pub.city}</div>}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Link href={`/publications/${pub.id}`} className="text-xs text-primary hover:underline">编辑发布信息</Link>
                        <Link href={`/publications/${pub.id}/preview`} className="text-xs text-muted-foreground hover:underline">候选人预览</Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState icon={<Globe className="h-5 w-5" />} title="暂无公开岗位" description="点击上方「创建公开岗位」按钮创建第一个公开岗位。" />
              )}
            </CardSection>
          </div>
        </div>
      </div>

      <ConfirmDialog open={confirmClose} onOpenChange={setConfirmClose} title="关闭岗位" description={`确定关闭岗位「${job.title}」吗？关闭后将无法继续推进新的候选人。`} confirmText="确认关闭" onConfirm={doClose} destructive />
      <ConfirmDialog open={confirmArchive} onOpenChange={setConfirmArchive} title="归档岗位" description={`确定归档岗位「${job.title}」吗？归档后可在列表中筛选查看。`} confirmText="确认归档" onConfirm={doArchive} />
    </>
  );
}
