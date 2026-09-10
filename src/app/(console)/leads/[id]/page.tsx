"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, Calendar, Globe, User, FileText, AlertCircle, ArrowRight, Link2 } from "lucide-react";
import { leadsApi, publicationsApi } from "@/lib/api";
import { useApi } from "@/lib/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { LoadingPage } from "@/components/loading-page";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { JobCode } from "@/components/job-code";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDate } from "@/lib/format";
import type { Lead } from "@/lib/domain/types";

export default function LeadDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { success, error: toastError } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [convertResult, setConvertResult] = useState<{ id: string; full_name: string } | null>(null);
  const [invalidateReason, setInvalidateReason] = useState("");
  const [showInvalidate, setShowInvalidate] = useState(false);
  const [confirmInvalidate, setConfirmInvalidate] = useState(false);

  const { data: lead, loading, error, refetch } = useApi(() => leadsApi.getById(id), [id]);

  // Resolve source job via Lead → publication_id → JobPublication.public_job_code
  const { data: sourcePub } = useApi(
    () => (lead ? publicationsApi.getById(lead.publication_id) : Promise.resolve(null)),
    [lead?.publication_id]
  );

  const handleAction = async (action: string, fn: () => Promise<unknown>) => {
    setActionLoading(action);
    try { await fn(); success("操作成功"); refetch(); } catch (e) { toastError((e as Error).message); } finally { setActionLoading(null); }
  };

  const handleConvert = async () => {
    setActionLoading("convert");
    try {
      const r = await leadsApi.convert(id);
      success("已转为人才");
      setConvertResult(r.talent);
      refetch();
    } catch (e) { toastError((e as Error).message); } finally { setActionLoading(null); }
  };

  if (loading) return <LoadingPage tip="加载投递详情..." />;
  if (error || !lead) return <ErrorState message={error || "投递记录不存在"} onRetry={refetch} />;

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-background p-6">
      <PageHeader
        title={lead.full_name}
        description={`${formatDate(lead.created_at)} 投递`}
        breadcrumbs={[{ label: "控制台", href: "/" }, { label: "投递管理", href: "/leads" }, { label: lead.full_name }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-lg shadow-card p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 flex-wrap"><h1 className="text-2xl font-bold text-foreground">{lead.full_name}</h1><StatusBadge type="lead" value={lead.status} /></div>
              </div>
              <div className="flex gap-2 flex-wrap justify-end">
                {lead.status === "new" && <button onClick={() => handleAction("review", () => leadsApi.review(id))} disabled={!!actionLoading} className="bg-muted text-foreground px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-all disabled:opacity-50">{actionLoading === "review" ? "..." : "标记已查看"}</button>}
                {lead.status === "reviewed" && <button onClick={() => handleAction("contact", () => leadsApi.contact(id))} disabled={!!actionLoading} className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50">{actionLoading === "contact" ? "..." : "联系候选人"}</button>}
                {lead.status === "contacting" && <button onClick={() => handleAction("qualify", () => leadsApi.qualify(id))} disabled={!!actionLoading} className="bg-emerald-100 text-emerald-700 px-3 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50">{actionLoading === "qualify" ? "..." : "确认合适"}</button>}
                {lead.status === "qualified" && <button onClick={handleConvert} disabled={!!actionLoading} className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50">{actionLoading === "convert" ? "转换中..." : "转为人才"}</button>}
                {["new", "reviewed", "contacting"].includes(lead.status) && <button onClick={() => setShowInvalidate(true)} disabled={!!actionLoading} className="bg-destructive/10 text-destructive px-3 py-2 rounded-md text-sm font-medium hover:bg-destructive/20 transition-all disabled:opacity-50">{actionLoading === "invalidate" ? "..." : "标记无效"}</button>}
              </div>
            </div>

            {convertResult && (
              <div className="bg-emerald-50 text-emerald-800 p-3 rounded-md text-sm mb-4 flex items-center justify-between">
                <span>已转为人才：{convertResult.full_name}</span>
                <Link href={`/talents/${convertResult.id}`} className="text-emerald-700 hover:underline inline-flex items-center gap-1">查看 <ArrowRight className="w-3.5 h-3.5" /></Link>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">邮箱：</span><span className="font-medium text-foreground">{lead.email || "-"}</span></div>
              <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">手机：</span><span className="font-medium text-foreground">{lead.phone || "-"}</span></div>
              <div className="flex items-center gap-2 text-sm"><Globe className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">渠道：</span><span className="font-medium text-foreground">{lead.source_channel || "-"}</span></div>
              {sourcePub && (
                <div className="flex items-center gap-2 text-sm md:col-span-3">
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground shrink-0">来源岗位：</span>
                  <JobCode code={sourcePub.public_job_code} />
                  <span className="text-muted-foreground/50 shrink-0">｜</span>
                  <Link href={`/publications/${sourcePub.id}`} className="font-medium text-primary hover:underline truncate" title={sourcePub.title}>{sourcePub.title}</Link>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">投递时间：</span><span className="font-medium text-foreground">{formatDate(lead.created_at)}</span></div>
              {lead.converted_talent_id && <div className="flex items-center gap-2 text-sm"><Link2 className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">关联人才：</span><Link href={`/talents/${lead.converted_talent_id}`} className="font-medium text-primary hover:underline">查看</Link></div>}
            </div>
            {lead.notes && <div className="mt-6 pt-6 border-t border-border/20"><h3 className="text-sm font-semibold text-foreground mb-2">备注</h3><p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/40 p-3 rounded-md">{lead.notes}</p></div>}
            {lead.resume_url && <div className="mt-6 pt-6 border-t border-border/20"><h3 className="text-sm font-semibold text-foreground mb-2">简历</h3><a href={lead.resume_url} target="_blank" className="text-sm text-primary hover:underline inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{lead.resume_url}</a></div>}
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-card p-6 h-fit">
          <h2 className="text-sm font-bold text-foreground mb-4">投递状态</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">当前状态</span><StatusBadge type="lead" value={lead.status} /></div>
            <div className="flex justify-between"><span className="text-muted-foreground">渠道来源</span><span className="text-foreground">{lead.source_channel || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">投递时间</span><span className="text-foreground">{formatDate(lead.created_at)}</span></div>
          </div>
        </div>
      </div>

      {showInvalidate && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowInvalidate(false)}>
          <div className="bg-card rounded-lg shadow-float p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-2">标记为无效</h2>
            <p className="text-sm text-muted-foreground mb-3">请输入标记为无效的原因：</p>
            <textarea value={invalidateReason} onChange={(e) => setInvalidateReason(e.target.value)} className="w-full bg-muted border-none rounded-md px-3 py-2 text-sm mb-4" rows={3} placeholder="输入原因..." />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowInvalidate(false)} className="px-4 py-2 rounded-md text-sm bg-muted text-foreground hover:bg-accent transition-colors">取消</button>
              <button onClick={() => setConfirmInvalidate(true)} disabled={!invalidateReason.trim()} className="px-4 py-2 rounded-md text-sm bg-destructive text-destructive-foreground hover:opacity-90 transition-all disabled:opacity-50">下一步</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmInvalidate}
        onOpenChange={(v) => { if (!v) { setConfirmInvalidate(false); setInvalidateReason(""); setShowInvalidate(false); } }}
        title="确认标记无效"
        description={`确定将该投递标记为无效吗？原因：${invalidateReason}`}
        confirmText="确认"
        onConfirm={() => handleAction("invalidate", () => leadsApi.invalidate(id, invalidateReason))}
        destructive
      />
    </div>
  );
}
