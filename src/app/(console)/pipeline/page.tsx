"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, User, AlertCircle, Loader2 } from "lucide-react";
import { applicationsApi, jobsApi, companiesApi, talentsApi } from "@/lib/api";
import { useApi } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { PageHeader } from "@/components/page-header";
import { LoadingPage } from "@/components/loading-page";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import type { Application, Job, Talent, Company, ApplicationStage } from "@/lib/domain/types";
import {
  getValidApplicationTransitions,
  getApplicationTransitionActionLabel,
  isTerminalApplicationStage,
} from "@/lib/domain/application-state-machine";
import { getApplicationStageLabel } from "@/lib/status";

const ACTIVE_STAGES: string[] = [
  "matching",
  "contacting",
  "interested",
  "recommended",
  "client_review",
  "interview",
  "offer",
  "hired",
];

const TERMINAL_STAGES: string[] = ["rejected", "withdrawn"];

export default function PipelinePage() {
  return (
    <Suspense fallback={<LoadingPage tip="加载 Pipeline..." />}>
      <PipelineContent />
    </Suspense>
  );
}

function PipelineContent() {
  const searchParams = useSearchParams();
  const initialJobId = searchParams.get("job_id") || undefined;

  const { data: jobs } = useApi(() => jobsApi.list({ pageSize: 200 }), []);

  const [selectedJobId, setSelectedJobId] = useState<string | undefined>(initialJobId);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const filters = selectedJobId ? { job_id: selectedJobId, pageSize: 500 } : { pageSize: 500 };
      const res = await applicationsApi.list(filters);
      setApplications(res.data);
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : (e as Error).message || "加载 Pipeline 失败";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedJobId]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const grouped = useMemo(() => {
    const result: Record<string, Application[]> = {};
    for (const stage of [...ACTIVE_STAGES, ...TERMINAL_STAGES]) {
      result[stage] = [];
    }
    for (const app of applications) {
      if (!result[app.stage]) {
        result[app.stage] = [];
      }
      result[app.stage].push(app);
    }
    for (const stage of [...ACTIVE_STAGES, ...TERMINAL_STAGES]) {
      result[stage].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }
    return result;
  }, [applications]);

  const handleTransition = async (app: Application, toStage: ApplicationStage) => {
    try {
      await applicationsApi.transition(app.id, { to_stage: toStage });
      await fetchApplications();
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : (e as Error).message || "推进失败";
      alert(message);
    }
  };

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-background p-6">
      <PageHeader
        title="招聘 Pipeline"
        description="按阶段查看候选人推进情况"
        breadcrumbs={[{ label: "控制台", href: "/" }, { label: "Pipeline" }]}
      />

      <div className="mb-4 flex items-center gap-4">
        <label className="text-sm font-medium text-foreground">按岗位筛选</label>
        <select
          className="text-sm border rounded-md px-3 py-2 bg-card"
          value={selectedJobId || ""}
          onChange={(e) => setSelectedJobId(e.target.value || undefined)}
        >
          <option value="">全部岗位</option>
          {jobs?.data.map((job) => (
            <option key={job.id} value={job.id}>{job.job_code ? `${job.job_code}｜` : ""}{job.title}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <LoadingPage tip="加载 Pipeline..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchApplications} />
      ) : (
        <>
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-foreground mb-3">主推进流程</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8 gap-4">
              {ACTIVE_STAGES.map((stage) => (
                <PipelineColumn
                  key={stage}
                  stage={stage}
                  applications={grouped[stage] || []}
                  onTransition={handleTransition}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3">终止状态</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TERMINAL_STAGES.map((stage) => (
                <PipelineColumn
                  key={stage}
                  stage={stage}
                  applications={grouped[stage] || []}
                  onTransition={handleTransition}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PipelineColumn({
  stage,
  applications,
  onTransition,
}: {
  stage: string;
  applications: Application[];
  onTransition: (app: Application, toStage: ApplicationStage) => void;
}) {
  const label = getApplicationStageLabel(stage);

  return (
    <div className="bg-card rounded-lg shadow-card flex flex-col max-h-[calc(100vh-18rem)]">
      <div className="p-3 border-b flex items-center justify-between sticky top-0 bg-card rounded-t-lg z-10">
        <div className="flex items-center gap-2">
          <StatusBadge type="application" value={stage} />
          <span className="text-xs text-muted-foreground">{applications.length}</span>
        </div>
      </div>
      <div className="p-3 space-y-3 overflow-y-auto flex-1">
        {applications.length === 0 ? (
          <EmptyState title="暂无" description={`${label}阶段暂无候选人`} />
        ) : (
          applications.map((app) => (
            <ApplicationCard key={app.id} app={app} onTransition={onTransition} />
          ))
        )}
      </div>
    </div>
  );
}

function ApplicationCard({
  app,
  onTransition,
}: {
  app: Application;
  onTransition: (app: Application, toStage: ApplicationStage) => void;
}) {
  const { data: talent } = useApi(() => talentsApi.getById(app.talent_id), [app.talent_id]);
  const { data: job } = useApi(() => (app.job_id ? jobsApi.getById(app.job_id) : Promise.resolve(null)), [app.job_id]);

  const transitions = useMemo(
    () => (app.stage ? getValidApplicationTransitions(app.stage as import('@/lib/domain/types').ApplicationStage) : []),
    [app.stage]
  );

  return (
    <div className="bg-muted/30 rounded-md p-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <Link
          href={`/talents/${app.talent_id}`}
          className="text-sm font-medium text-foreground hover:text-primary transition-colors flex items-center gap-1.5"
        >
          <User className="w-3.5 h-3.5 text-muted-foreground" />
          {talent?.full_name || "加载中..."}
        </Link>
        <Link href={`/applications/${app.id}`} className="text-xs text-primary hover:underline whitespace-nowrap">
          详情
        </Link>
      </div>

      <div className="text-xs text-muted-foreground mb-2">
        {job ? (
          <Link href={`/jobs/${job.id}`} className="hover:text-primary transition-colors">
            {job.job_code ? <span className="font-mono">{job.job_code}｜</span> : null}
            {job.title}
          </Link>
        ) : (
          "未知岗位"
        )}
      </div>

      {app.next_action_at && (
        <p className="text-xs text-muted-foreground mb-2">下一步：{formatDate(app.next_action_at)}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {transitions.map((toStage) => (
          <Button
            key={toStage}
            size="sm"
            variant={toStage === 'rejected' || toStage === 'withdrawn' ? 'outline' : 'secondary'}
            className="text-xs h-7 px-2"
            onClick={() => onTransition(app, toStage)}
          >
            {getApplicationTransitionActionLabel(app.stage as import('@/lib/domain/types').ApplicationStage, toStage)}
          </Button>
        ))}
      </div>
    </div>
  );
}
