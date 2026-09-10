"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, Clock, Globe, Pencil, Trash2, Save, X, Briefcase, Plus, ArrowRight } from "lucide-react";
import { companiesApi, jobsApi } from "@/lib/api";
import { useApi } from "@/lib/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { LoadingPage } from "@/components/loading-page";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDate } from "@/lib/format";
import type { Company } from "@/lib/domain/types";

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "active", label: "合作中" },
  { value: "inactive", label: "暂停" },
];

export default function CompanyDetailPage() {
  return (
    <Suspense fallback={null}>
      <CompanyDetailPageContent />
    </Suspense>
  );
}

function CompanyDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const { success, error: toastError } = useToast();

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState({ name: "", display_name: "", industry: "", description: "", status: "active" });

  const { data: company, loading, error, refetch } = useApi(() => companiesApi.getById(id), [id]);
  const { data: jobsResult, refetch: refetchJobs } = useApi(() => jobsApi.list({ company_id: id, pageSize: 50 }), [id]);

  useEffect(() => { if (searchParams.get("edit") === "1") setEditing(true); }, [searchParams]);
  useEffect(() => {
    if (company) {
      setForm({ name: company.name ?? "", display_name: company.display_name ?? "", industry: company.industry ?? "", description: company.description ?? "", status: company.status ?? "active" });
    }
  }, [company]);

  const handleSave = async () => {
    if (!form.name.trim()) { setFormError("公司名称不能为空"); return; }
    setSaving(true); setFormError("");
    try {
      await companiesApi.update(id, { name: form.name.trim(), display_name: form.display_name.trim() || form.name.trim(), industry: form.industry.trim(), description: form.description || undefined, status: form.status as "active" | "inactive" });
      success("公司信息已保存");
      await refetch();
      setEditing(false);
    } catch (e) { setFormError((e as Error).message); toastError((e as Error).message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true); setFormError("");
    try {
      await companiesApi.delete(id);
      success("公司已删除");
      router.push("/companies");
    } catch (e) {
      setFormError((e as Error).message);
      toastError((e as Error).message);
      setConfirmDelete(false);
    } finally { setDeleting(false); }
  };

  if (loading) return <LoadingPage tip="加载公司详情..." />;
  if (error || !company) return <ErrorState message={error || "公司不存在"} onRetry={() => { refetch(); refetchJobs(); }} />;

  const inputClass = "w-full bg-muted border-none rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors";
  const labelClass = "block text-xs font-medium text-muted-foreground mb-1";
  const jobs = jobsResult?.data ?? [];

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-background p-6">
      <PageHeader
        title={company.name}
        description={company.display_name || "公司详情"}
        breadcrumbs={[{ label: "控制台", href: "/" }, { label: "公司管理", href: "/companies" }, { label: company.name }]}
        actions={
          editing ? (
            <div className="flex items-center gap-2">
              <button onClick={() => { setEditing(false); setFormError(""); }} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm bg-muted text-foreground hover:bg-accent transition-colors disabled:opacity-50"><X className="w-4 h-4" />取消</button>
              <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50"><Save className="w-4 h-4" />{saving ? "保存中..." : "保存"}</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"><Trash2 className="w-4 h-4" />删除</button>
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:opacity-90 transition-all"><Pencil className="w-4 h-4" />编辑</button>
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-lg shadow-card p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-16 h-16 rounded-lg bg-primary flex items-center justify-center shrink-0"><Building2 className="w-8 h-8 text-primary-foreground" /></div>
              <div className="flex-1 min-w-0">
                {editing ? (
                  <div className="space-y-3 max-w-lg">
                    <div><label className={labelClass}>公司名称 *</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} /></div>
                    <div><label className={labelClass}>公开名称</label><input type="text" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} className={inputClass} /></div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h1 className="text-2xl font-bold text-foreground">{company.name}</h1>
                      <StatusBadge type="company" value={company.status} />
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{company.display_name}</p>
                  </>
                )}
              </div>
            </div>

            {formError && <p className="text-xs text-destructive mb-4">{formError}</p>}

            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className={labelClass}>行业</label><input type="text" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} className={inputClass} /></div>
                <div><label className={labelClass}>合作状态</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className={inputClass}>
                    {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div><label className={labelClass}>创建时间</label><input type="text" value={formatDate(company.created_at)} disabled className={`${inputClass} opacity-60 cursor-not-allowed`} /></div>
                <div className="md:col-span-2"><label className={labelClass}>公司简介</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className={`${inputClass} resize-none`} /></div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">创建时间：</span><span className="font-medium text-foreground">{formatDate(company.created_at)}</span></div>
                  <div className="flex items-center gap-2 text-sm"><Globe className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">行业：</span><span className="font-medium text-foreground">{company.industry || "-"}</span></div>
                  <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">更新时间：</span><span className="font-medium text-foreground">{formatDate(company.updated_at)}</span></div>
                </div>
                {company.description && (
                  <div className="mt-6 pt-6 border-t border-border/20">
                    <h3 className="text-sm font-semibold text-foreground mb-2">公司简介</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{company.description}</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="bg-card rounded-lg shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-foreground">关联岗位 ({jobs.length})</h2>
              <Link href={`/jobs/new?company=${company.id}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" />新增岗位</Link>
            </div>
            {jobs.length === 0 ? (
              <EmptyState title="暂无岗位" description="该公司还没有岗位需求" />
            ) : (
              <div className="space-y-2">
                {jobs.map((job) => (
                  <Link key={job.id} href={`/jobs/${job.id}`} className="flex items-center justify-between rounded-md bg-muted/40 px-4 py-3 hover:bg-muted/60 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <Briefcase className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground">{job.city || "未填写城市"} · {job.salary_internal || "未填写薪资"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <StatusBadge type="job" value={job.status} />
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-card p-6 h-fit">
          <h2 className="text-sm font-bold text-foreground mb-4">公司信息</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">公开名称</span><span className="text-foreground text-right">{company.display_name || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">状态</span><StatusBadge type="company" value={company.status} /></div>
            <div className="flex justify-between"><span className="text-muted-foreground">行业</span><span className="text-foreground text-right">{company.industry || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">岗位数</span><Link href={`/jobs?company=${company.id}`} className="text-primary hover:underline">{jobs.length}</Link></div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={(v) => { if (!v) { setConfirmDelete(false); setFormError(""); } }}
        title="删除公司"
        description={`确定要删除「${company.name}」吗？此操作不可撤销。若该公司下存在岗位，将无法删除。`}
        confirmText="确认删除"
        onConfirm={handleDelete}
        destructive
      />
      {formError && <p className="sr-only">{formError}</p>}
    </div>
  );
}
