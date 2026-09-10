"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { Search, Plus, Briefcase, Building2, ChevronDown, X } from "lucide-react";
import { jobsApi, companiesApi } from "@/lib/api";
import { useApi } from "@/lib/api/hooks";
import { useQueryParams } from "@/hooks/use-query-params";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { JobCode } from "@/components/job-code";
import { ConsoleTable, ConsoleTHead, ConsoleTBody, ConsoleTr, ConsoleTh, ConsoleTd } from "@/components/console-table";
import { formatDate } from "@/lib/format";
import type { Job, Company, JobStatus } from "@/lib/domain/types";
import { JOB_STATUSES } from "@/lib/status";

const PAGE_SIZE = 20;

export default function JobsPage() {
  return (
    <Suspense fallback={null}>
      <JobsPageContent />
    </Suspense>
  );
}

function JobsPageContent() {
  const { getParam, setParams } = useQueryParams();
  const [search, setSearch] = useState(getParam("q"));
  const [status, setStatus] = useState<JobStatus | "全部">(getParam("status", "全部") as JobStatus | "全部");
  const [companyId, setCompanyId] = useState(getParam("company"));
  const [page, setPage] = useState(Math.max(1, parseInt(getParam("page", "1"), 10) || 1));

  const fetchJobs = useCallback(
    () => jobsApi.list({ keyword: search || undefined, status: status !== "全部" ? status : undefined, company_id: companyId || undefined, page, pageSize: PAGE_SIZE }),
    [search, status, companyId, page]
  );
  const { data: result, loading, error, refetch } = useApi(fetchJobs, [fetchJobs]);

  const { data: companiesRes } = useApi(() => companiesApi.list({ pageSize: 200 }), []);
  const companies = companiesRes?.data ?? [];

  useEffect(() => {
    const updates: Record<string, string | null> = {};
    updates.q = search || null;
    updates.status = status !== "全部" ? status : null;
    updates.company = companyId || null;
    updates.page = page > 1 ? String(page) : null;
    setParams(updates, { replace: true });
  }, [search, status, companyId, page, setParams]);

  const list = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c])) as Record<string, Company>;

  const activeFilters = [
    ...(status !== "全部" ? [{ label: `状态：${status}`, onRemove: () => setStatus("全部") }] : []),
    ...(companyId ? [{ label: `公司：${companyMap[companyId]?.name || companyId}`, onRemove: () => setCompanyId("") }] : []),
  ];

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-background p-6">
      <PageHeader
        title="岗位管理"
        description="管理客户公司的岗位需求、招聘进度与发布状态"
        breadcrumbs={[{ label: "控制台", href: "/" }, { label: "岗位管理" }]}
        actions={
          <Link href="/jobs/new" className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all inline-flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" />新增岗位
          </Link>
        }
      />

      <div className="bg-card rounded-lg shadow-card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text" placeholder="搜索岗位名称 / 岗位编码..."
              className="w-full bg-muted border-none rounded-md pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select value={status} onChange={(e) => { setStatus(e.target.value as JobStatus | "全部"); setPage(1); }}
                className="appearance-none bg-muted border-none rounded-md pl-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                <option value="全部">全部状态</option>
                {JOB_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative">
              <select value={companyId} onChange={(e) => { setCompanyId(e.target.value); setPage(1); }}
                className="appearance-none bg-muted border-none rounded-md pl-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer min-w-[8rem]">
                <option value="">全部公司</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20">
            <span className="text-xs text-muted-foreground">已选筛选：</span>
            {activeFilters.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-primary/10 text-primary text-xs">
                {f.label}
                <button onClick={f.onRemove}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">加载岗位数据...</div>
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : list.length === 0 ? (
          <EmptyState
            title="暂无岗位"
            description={search || status !== "全部" || companyId ? "尝试调整筛选条件" : "创建第一个岗位需求"}
            action={!search && status === "全部" && !companyId ? (
              <Link href="/jobs/new" className="text-sm text-primary hover:underline inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" />创建岗位</Link>
            ) : undefined}
          />
        ) : (
          <>
            <ConsoleTable>
              <ConsoleTHead>
                <ConsoleTr>
                  <ConsoleTh stickyLeft={0} className="w-[340px] min-w-[340px]">岗位</ConsoleTh>
                  <ConsoleTh className="min-w-[240px]">所属公司</ConsoleTh>
                  <ConsoleTh className="min-w-[180px]">地点 / 薪资</ConsoleTh>
                  <ConsoleTh className="min-w-[130px]">招聘状态</ConsoleTh>
                  <ConsoleTh className="min-w-[170px]">更新时间</ConsoleTh>
                  <ConsoleTh stickyRight className="min-w-[100px] text-right">操作</ConsoleTh>
                </ConsoleTr>
              </ConsoleTHead>
              <ConsoleTBody>
                {list.map((job) => {
                  const company = companyMap[job.company_id];
                  return (
                    <ConsoleTr key={job.id}>
                      <ConsoleTd stickyLeft={0} className="w-[340px] min-w-[340px]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0"><Briefcase className="w-4.5 h-4.5 text-primary" /></div>
                          <div className="min-w-0">
                            <Link href={`/jobs/${job.id}`} className="block text-sm font-semibold text-foreground hover:text-primary transition-colors truncate" title={job.title}>{job.title}</Link>
                            <JobCode code={job.job_code} showCopy={false} className="mt-0.5" />
                            <p className="text-xs text-muted-foreground truncate" title={`${job.city || "未填写地点"} · ${job.salary_internal || "未填写薪资"}`}>{job.city || "未填写地点"} · {job.salary_internal || "未填写薪资"}</p>
                          </div>
                        </div>
                      </ConsoleTd>
                      <ConsoleTd className="min-w-[240px]">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <Link href={`/companies/${job.company_id}`} className="text-sm text-foreground hover:text-primary transition-colors max-w-[200px] truncate" title={company?.name || "未知公司"}>{company?.name || "未知公司"}</Link>
                        </div>
                      </ConsoleTd>
                      <ConsoleTd className="min-w-[180px]"><span className="text-sm text-muted-foreground whitespace-nowrap">{job.city || "-"} / {job.salary_internal || "-"}</span></ConsoleTd>
                      <ConsoleTd className="min-w-[130px]"><StatusBadge type="job" value={job.status} /></ConsoleTd>
                      <ConsoleTd className="min-w-[170px]"><span className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(job.updated_at)}</span></ConsoleTd>
                      <ConsoleTd stickyRight className="min-w-[100px] text-right">
                        <Link href={`/jobs/${job.id}`} className="text-xs text-primary hover:underline whitespace-nowrap">详情</Link>
                      </ConsoleTd>
                    </ConsoleTr>
                  );
                })}
              </ConsoleTBody>
            </ConsoleTable>
            <div className="px-5 py-3 border-t border-border/20 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">共 {total} 条记录</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded text-xs text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40">上一页</button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                  <button key={i + 1} onClick={() => setPage(i + 1)} className={`px-3 py-1 rounded text-xs ${page === i + 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted transition-colors"}`}>{i + 1}</button>
                ))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 rounded text-xs text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40">下一页</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
