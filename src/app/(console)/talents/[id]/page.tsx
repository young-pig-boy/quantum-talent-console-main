"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Mail, Phone, MapPin, Calendar, Briefcase, GraduationCap, FileText, ArrowRight, User, Plus, AlertCircle, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { talentsApi, jobsApi, applicationsApi, companiesApi } from "@/lib/api";
import { useApi } from "@/lib/api/hooks";
import { ApiClientError } from "@/lib/api/client";
import { PageHeader } from "@/components/page-header";
import { LoadingPage } from "@/components/loading-page";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/empty-state";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { JobCombobox } from "@/components/job-combobox";
import type { Talent, Application, Job } from "@/lib/domain/types";
import { getApplicationStageLabel } from "@/lib/status";

const OPEN_JOB_STATUSES = ["recruiting"];

export default function TalentDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: talent, loading, error, refetch } = useApi(() => talentsApi.getById(id), [id]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createErrorCode, setCreateErrorCode] = useState<string | null>(null);
  const [createErrorData, setCreateErrorData] = useState<Application | null>(null);

  // Contact access state
  const [contactAccess, setContactAccess] = useState<{
    hasAccess: boolean;
    contact: { phone: string; email: string; wechat: string };
    reason?: string;
  } | null>(null);
  const [contactLoading, setContactLoading] = useState(false);
  const [requestReason, setRequestReason] = useState('');
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const fetchContactAccess = useCallback(async () => {
    setContactLoading(true);
    try {
      const res = await fetch(`/api/talents/${id}/contact-access`);
      const json = await res.json();
      if (json.success) {
        setContactAccess(json.data);
      }
    } catch {
      setContactAccess({
        hasAccess: false,
        contact: { phone: '—', email: '—', wechat: '—' },
      });
    } finally {
      setContactLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContactAccess();
  }, [fetchContactAccess]);

  const handleRequestAccess = async () => {
    setRequesting(true);
    try {
      const res = await fetch(`/api/talents/${id}/contact-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: requestReason }),
      });
      const json = await res.json();
      if (json.success) {
        setRequestDialogOpen(false);
        setRequestReason('');
        await fetchContactAccess();
      }
    } catch {
      // no-op
    } finally {
      setRequesting(false);
    }
  };

  const fetchApplications = useCallback(async () => {
    setApplicationsLoading(true);
    setApplicationsError(null);
    try {
      const res = await applicationsApi.list({ talent_id: id, pageSize: 100 });
      setApplications(res.data);
    } catch (e) {
      const message = e instanceof ApiClientError ? e.message : (e as Error).message || "加载招聘推进失败";
      setApplicationsError(message);
    } finally {
      setApplicationsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const res = await jobsApi.list({ status: "recruiting", pageSize: 200 });
      setJobs(res.data);
      if (res.data.length > 0 && !selectedJobId) {
        setSelectedJobId(res.data[0].id);
      }
    } catch (e) {
      // no-op: 岗位加载失败由下方 UI 展示
    } finally {
      setJobsLoading(false);
    }
  }, [selectedJobId]);

  const loadCompanies = useCallback(async () => {
    try {
      const res = await companiesApi.list({ pageSize: 200 });
      const map: Record<string, string> = {};
      for (const company of res.data) {
        map[company.id] = company.display_name || company.name || "未知公司";
      }
      setCompanyNames(map);
    } catch {
      // no-op: 公司名加载失败不影响岗位选择
    }
  }, []);

  useEffect(() => {
    if (dialogOpen) {
      setCreateError(null);
      setCreateErrorCode(null);
      setCreateErrorData(null);
      loadJobs();
      loadCompanies();
    }
  }, [dialogOpen, loadJobs, loadCompanies]);

  const handleCreateApplication = async () => {
    if (!selectedJobId) return;
    setCreating(true);
    setCreateError(null);
    setCreateErrorCode(null);
    setCreateErrorData(null);
    try {
      await applicationsApi.create({
        talent_id: id,
        job_id: selectedJobId,
        stage: "matching",
      });
      setDialogOpen(false);
      setSelectedJobId("");
      await fetchApplications();
    } catch (e) {
      const err = e instanceof ApiClientError ? e : new Error((e as Error).message || "创建推进失败");
      setCreateError(err.message);
      if (e instanceof ApiClientError) {
        setCreateErrorCode(e.code);
        if (e.details && typeof e.details === "object" && "existing" in e.details) {
          setCreateErrorData((e.details as { existing?: Application }).existing ?? null);
        }
      }
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <LoadingPage tip="加载人才详情..." />;
  if (error || !talent) return <ErrorState message={error || "人才不存在"} onRetry={refetch} />;

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-background p-6">
      <PageHeader
        title={talent.full_name}
        description={"人才库详情"}
        breadcrumbs={[{ label: "控制台", href: "/" }, { label: "人才库", href: "/talents" }, { label: talent.full_name }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-lg shadow-card p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{talent.full_name}</h1>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="w-4 h-4 mr-1" />
                      加入岗位推进
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>加入岗位推进</DialogTitle>
                      <DialogDescription>
                        为该候选人选择一个招聘中的岗位，创建独立的招聘推进记录。
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {jobsLoading ? (
                        <p className="text-sm text-muted-foreground">加载岗位中...</p>
                      ) : jobs.length === 0 ? (
                        <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-md">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <div>
                            <p>当前没有招聘中的岗位。</p>
                            <Link href="/jobs/new" className="underline" onClick={() => setDialogOpen(false)}>创建岗位</Link>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-foreground">目标岗位</label>
                          <JobCombobox
                            jobs={jobs}
                            value={selectedJobId}
                            onValueChange={setSelectedJobId}
                            companyNames={companyNames}
                          />
                        </div>
                      )}

                      {createError && (
                        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p>{createError}</p>
                            {createErrorCode === "DUPLICATE_APPLICATION" && (
                              <div className="mt-2">
                                <p className="text-muted-foreground">该候选人已在此岗位的推进流程中。</p>
                                {createErrorData ? (
                                  <Link
                                    href={`/applications/${createErrorData.id}`}
                                    className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
                                    onClick={() => setDialogOpen(false)}
                                  >
                                    查看当前推进 <ArrowRight className="w-3.5 h-3.5" />
                                  </Link>
                                ) : null}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
                        取消
                      </Button>
                      <Button
                        onClick={handleCreateApplication}
                        disabled={!selectedJobId || creating || jobsLoading || jobs.length === 0}
                      >
                        {creating ? "创建中..." : "确认加入"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Link href={`/talents/${id}?edit=1`} className="text-sm bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition-all">编辑</Link>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">邮箱：</span>
                {contactLoading ? (
                  <span className="text-muted-foreground">...</span>
                ) : contactAccess?.hasAccess ? (
                  <span className="font-medium text-foreground">{talent.email || '-'}</span>
                ) : (
                  <span className="font-medium text-muted-foreground/60">{contactAccess?.contact.email || '—'}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">手机：</span>
                {contactLoading ? (
                  <span className="text-muted-foreground">...</span>
                ) : contactAccess?.hasAccess ? (
                  <span className="font-medium text-foreground">{talent.phone || '-'}</span>
                ) : (
                  <span className="font-medium text-muted-foreground/60">{contactAccess?.contact.phone || '—'}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">城市：</span><span className="font-medium text-foreground">{talent.city || "-"}</span></div>
              <div className="flex items-center gap-2 text-sm"><Briefcase className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">当前公司：</span><span className="font-medium text-foreground">{talent.current_company || "-"}</span></div>
              <div className="flex items-center gap-2 text-sm"><GraduationCap className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">当前职位：</span><span className="font-medium text-foreground">{talent.current_title || "-"}</span></div>
              <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-muted-foreground" /><span className="text-muted-foreground">创建时间：</span><span className="font-medium text-foreground">{formatDate(talent.created_at)}</span></div>
            </div>

            {/* Contact access request */}
            {!contactLoading && contactAccess && !contactAccess.hasAccess && (
              <div className="mb-6 flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800">联系方式已保护，需要申请查看权限</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {contactAccess.reason === 'ACCESS_DENIED' ? '您暂无查看该候选人联系方式的权限' : '联系方式信息暂不可用'}
                  </p>
                </div>
                <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-100">
                      <Eye className="w-4 h-4 mr-1" />
                      申请查看
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>申请查看联系方式</DialogTitle>
                      <DialogDescription>
                        提交申请后，系统将根据您的权限和团队关系进行审批。
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <label className="text-sm font-medium text-foreground">申请原因</label>
                        <textarea
                          className="w-full mt-1 px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                          rows={3}
                          placeholder="请说明查看联系方式的原因（如：需要联系候选人确认面试意向）"
                          value={requestReason}
                          onChange={(e) => setRequestReason(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>取消</Button>
                      <Button onClick={handleRequestAccess} disabled={requesting || !requestReason.trim()}>
                        {requesting ? '提交中...' : '提交申请'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            )}
            {!contactLoading && contactAccess?.hasAccess && (
              <div className="mb-4 flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-md">
                <EyeOff className="w-3.5 h-3.5" />
                <span>您有权限查看该候选人的完整联系方式</span>
              </div>
            )}

            {talent.notes && <div className="mb-6"><h3 className="text-sm font-semibold text-foreground mb-2">备注</h3><p className="text-sm text-muted-foreground bg-muted/40 p-3 rounded-md whitespace-pre-wrap">{talent.notes}</p></div>}
            {talent.resume_url && <div className="mb-2"><h3 className="text-sm font-semibold text-foreground mb-2">简历</h3><a href={talent.resume_url} target="_blank" className="text-sm text-primary hover:underline inline-flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{talent.resume_url}</a></div>}
          </div>

          <div className="bg-card rounded-lg shadow-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">岗位推进</h2>
              {applications.length > 0 && (
                <Link href="/pipeline" className="text-sm text-primary hover:underline">查看 Pipeline</Link>
              )}
            </div>
            {applicationsLoading ? (
              <p className="text-sm text-muted-foreground">加载中...</p>
            ) : applicationsError ? (
              <ErrorState message={applicationsError} onRetry={fetchApplications} />
            ) : applications.length === 0 ? (
              <EmptyState
                icon={<Briefcase className="w-8 h-8 text-muted-foreground" />}
                title="暂无岗位推进记录"
                description="点击右上角「加入岗位推进」将候选人加入某个岗位。"
              />
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <ApplicationItem key={app.id} app={app} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-card p-6 h-fit">
          <h2 className="text-sm font-bold text-foreground mb-4">人才档案</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">来源渠道</span><span className="text-foreground">{talent.source_channel || "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">创建时间</span><span className="text-foreground">{formatDate(talent.created_at)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">更新时间</span><span className="text-foreground">{formatDate(talent.updated_at)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApplicationItem({ app }: { app: Application }) {
  const { data: job } = useApi(() => (app.job_id ? jobsApi.getById(app.job_id) : Promise.resolve(null)), [app.job_id]);
  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-md hover:bg-muted/50 transition-colors">
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          {job ? (
            <Link href={`/jobs/${job.id}`} className="text-sm font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5">
              {job.job_code ? <span className="font-mono text-xs text-muted-foreground">{job.job_code}</span> : null}
              <span className="text-muted-foreground/50">｜</span>
              <span>{job.title}</span>
            </Link>
          ) : (
            <span className="text-sm font-medium text-foreground">未知岗位</span>
          )}
          <StatusBadge type="application" value={app.stage} />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {app.next_action_at && `下一步：${formatDate(app.next_action_at)}`}
          {app.updated_at && !app.next_action_at && `更新于：${formatDate(app.updated_at)}`}
        </p>
      </div>
      <Link href={`/applications/${app.id}`} className="text-sm text-primary hover:underline inline-flex items-center gap-1">详情 <ArrowRight className="w-3.5 h-3.5" /></Link>
    </div>
  );
}
