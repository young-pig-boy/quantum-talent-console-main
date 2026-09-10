"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Calendar, Clock, User, Briefcase, ArrowRight, MessageSquare, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import { applicationsApi, jobsApi, talentsApi } from "@/lib/api";
import { useApi } from "@/lib/api/hooks";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { LoadingPage } from "@/components/loading-page";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { JobCode } from "@/components/job-code";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDate, formatRelative } from "@/lib/format";
import { getValidApplicationTransitions, getApplicationTransitionActionLabel } from "@/lib/domain/application-state-machine";
import { getApplicationStageLabel } from "@/lib/status";
import type { Application, StageEvent, ApplicationStage } from "@/lib/domain/types";

export default function ApplicationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { success, error: toastError } = useToast();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [nextActionAt, setNextActionAt] = useState<string>("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [selectedStage, setSelectedStage] = useState<ApplicationStage | null>(null);

  const { data: application, loading, error, refetch } = useApi(() => applicationsApi.getById(id), [id]);
  const { data: job } = useApi(() => (application?.job_id ? jobsApi.getById(application.job_id) : Promise.resolve(null)), [application?.job_id]);
  const { data: talent } = useApi(() => (application?.talent_id ? talentsApi.getById(application.talent_id) : Promise.resolve(null)), [application?.talent_id]);

  const handleStageChange = async (stage: ApplicationStage, confirmed = false) => {
    if (stage === "rejected" && !confirmed) { setSelectedStage("rejected"); setConfirmReject(true); return; }
    if (stage === "withdrawn" && !confirmed) { setSelectedStage("withdrawn"); setConfirmWithdraw(true); return; }
    setActionLoading(stage);
    try {
      await applicationsApi.transition(id, { to_stage: stage });
      success(`阶段已推进至 ${getApplicationStageLabel(stage)}`);
      refetch();
    } catch (e) { toastError((e as Error).message); } finally { setActionLoading(null); }
  };

  const handleNextActionSave = async () => {
    setActionLoading("next_action");
    try {
      await applicationsApi.update(id, { next_action_at: nextActionAt ? new Date(nextActionAt).toISOString() : null });
      success("下一步时间已更新");
      setShowDatePicker(false);
      refetch();
    } catch (e) { toastError((e as Error).message); } finally { setActionLoading(null); }
  };

  if (loading) return <LoadingPage tip="加载招聘详情..." />;
  if (error || !application) return <ErrorState message={error || "招聘记录不存在"} onRetry={refetch} />;

  const transitions = getValidApplicationTransitions(application.stage);
  const isTerminal = ["hired", "rejected", "withdrawn"].includes(application.stage);
  const overdue = application.next_action_at && new Date(application.next_action_at) < new Date();

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-background p-6">
      <PageHeader
        title={`${talent?.full_name || "候选人"} · ${job?.job_code ? `${job.job_code}｜` : ""}${job?.title || "未知岗位"}`}
        description={`当前阶段：${getApplicationStageLabel(application.stage)} · 创建时间：${formatDate(application.created_at)}`}
        breadcrumbs={[{ label: "控制台", href: "/" }, { label: "招聘流程", href: "/pipeline" }, { label: talent?.full_name || application.id }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-lg shadow-card p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-foreground">{talent?.full_name || "候选人"}</h1>
                  <StatusBadge type="application" value={application.stage} />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  招聘岗位：{job ? (
                    <span className="inline-flex items-center gap-1.5">
                      <JobCode code={job.job_code} />
                      <span className="text-muted-foreground/50">｜</span>
                      <Link href={`/jobs/${job.id}`} className="text-foreground hover:text-primary transition-colors">
                        {job.title}
                      </Link>
                    </span>
                  ) : "-"}
                  {talent && <> · 人才档案：<Link href={`/talents/${talent.id}`} className="hover:text-primary transition-colors">{talent.full_name}</Link></>}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-2 text-sm"><Briefcase className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">岗位：</span><span className="font-medium text-foreground truncate">{job?.job_code ? <span className="font-mono text-xs text-muted-foreground mr-1">{job.job_code}</span> : null}{job?.title || "-"}</span></div>
              <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">人才：</span><span className="font-medium text-foreground truncate">{talent?.full_name || "-"}</span></div>
              <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">创建：</span><span className="font-medium text-foreground">{formatDate(application.created_at)}</span></div>
              <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">下一步：</span>
                <button onClick={() => { setNextActionAt(application.next_action_at ? new Date(application.next_action_at).toISOString().slice(0, 16) : ""); setShowDatePicker(true); }} className={`font-medium hover:underline ${overdue ? "text-destructive" : "text-foreground"}`}>
                  {application.next_action_at ? formatRelative(application.next_action_at) : "未设置"}
                </button>
              </div>
              {application.owner_id && <div className="flex items-center gap-2 text-sm"><User className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">负责人：</span><span className="font-medium text-foreground">{application.owner_id.slice(0, 8)}</span></div>}
            </div>

            {!isTerminal && transitions.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-sm text-muted-foreground mr-1 self-center">推进到：</span>
                {transitions.map((stage) => (
                  <button
                    key={stage}
                    onClick={() => handleStageChange(stage)}
                    disabled={!!actionLoading}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all disabled:opacity-50 ${
                      stage === "rejected" || stage === "withdrawn"
                        ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                        : "bg-primary text-primary-foreground hover:opacity-90"
                    }`}
                  >
                    {actionLoading === stage ? "..." : getApplicationTransitionActionLabel(application.stage, stage)}
                  </button>
                ))}
              </div>
            )}

            <div className="pt-6 border-t border-border/20">
              <h3 className="text-sm font-semibold text-foreground mb-3">阶段推进历史</h3>
              <StageTimeline events={(application as Application & { stageEvents?: StageEvent[] }).stageEvents || []} />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-card p-6 h-fit">
          <h2 className="text-sm font-bold text-foreground mb-4">招聘状态</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">当前阶段</span><StatusBadge type="application" value={application.stage} /></div>
            <div className="flex justify-between"><span className="text-muted-foreground">下一步</span><span className={`font-medium ${overdue ? "text-destructive" : "text-foreground"}`}>{application.next_action_at ? formatDate(application.next_action_at) : "未设置"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">岗位</span>{job ? <Link href={`/jobs/${job.id}`} className="text-primary hover:underline truncate max-w-[120px]">{job.title}</Link> : "-"}</div>
            <div className="flex justify-between"><span className="text-muted-foreground">人才</span>{talent ? <Link href={`/talents/${talent.id}`} className="text-primary hover:underline truncate max-w-[120px]">{talent.full_name}</Link> : "-"}</div>
            <div className="flex justify-between"><span className="text-muted-foreground">创建时间</span><span className="text-foreground">{formatDate(application.created_at)}</span></div>
          </div>
        </div>
      </div>

      {showDatePicker && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={() => setShowDatePicker(false)}>
          <div className="bg-card rounded-lg shadow-float p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-3">设置下一步时间</h2>
            <input type="datetime-local" value={nextActionAt} onChange={(e) => setNextActionAt(e.target.value)} className="w-full bg-muted border-none rounded-md px-3 py-2 text-sm mb-4" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDatePicker(false)} className="px-4 py-2 rounded-md text-sm bg-muted text-foreground hover:bg-accent transition-colors">取消</button>
              <button onClick={handleNextActionSave} disabled={!!actionLoading} className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">{actionLoading === "next_action" ? "保存中..." : "保存"}</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={confirmReject} onOpenChange={(v) => { setConfirmReject(v); if (!v) setSelectedStage(null); }} title="确认淘汰" description="确定要将该候选人标记为已淘汰吗？此操作不可撤销。" confirmText="确认淘汰" destructive onConfirm={() => selectedStage && handleStageChange(selectedStage, true)} />
      <ConfirmDialog open={confirmWithdraw} onOpenChange={(v) => { setConfirmWithdraw(v); if (!v) setSelectedStage(null); }} title="确认撤回" description="确定要撤回该候选人的招聘流程吗？" confirmText="确认撤回" destructive onConfirm={() => selectedStage && handleStageChange(selectedStage, true)} />
    </div>
  );
}

function StageTimeline({ events }: { events: StageEvent[] }) {
  if (!events.length) return <EmptyState icon={<MessageSquare className="w-7 h-7 text-muted-foreground" />} title="暂无阶段记录" description="推进阶段后会自动生成记录。" size="sm" />;

  const sorted = [...events].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return (
    <div className="relative pl-4">
      {sorted.map((event, idx) => (
        <div key={event.id} className="relative pb-6 last:pb-0">
          <div className="absolute left-0 top-1 w-2 h-2 rounded-full bg-primary ring-4 ring-background" />
          {idx !== sorted.length - 1 && <div className="absolute left-[3px] top-3 bottom-0 w-px bg-border/40" />}
          <div className="pl-5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground">{event.from_stage ? `${getApplicationStageLabel(event.from_stage)} → ${getApplicationStageLabel(event.to_stage)}` : `进入 ${getApplicationStageLabel(event.to_stage)}`}</span>
              <span className="text-xs text-muted-foreground">{formatDate(event.created_at)}</span>
            </div>
            {event.note && <p className="text-xs text-muted-foreground mt-1">{event.note}</p>}
            {event.created_by && <p className="text-xs text-muted-foreground mt-1">by {event.created_by.slice(0, 8)}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
