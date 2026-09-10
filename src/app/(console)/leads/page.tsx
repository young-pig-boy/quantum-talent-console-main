"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { Search, UserPlus, ChevronDown, X, ArrowRight, Globe } from "lucide-react";
import { leadsApi, publicationsApi } from "@/lib/api";
import { useApi } from "@/lib/api/hooks";
import { useQueryParams } from "@/hooks/use-query-params";
import { PageHeader } from "@/components/page-header";
import { ConsoleTable, ConsoleTHead, ConsoleTBody, ConsoleTr, ConsoleTh, ConsoleTd } from "@/components/console-table";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { JobCode } from "@/components/job-code";
import { formatDate } from "@/lib/format";
import { LEAD_STATUSES } from "@/lib/status";
import type { Lead, LeadStatus } from "@/lib/domain/types";

const PAGE_SIZE = 20;

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsPageContent />
    </Suspense>
  );
}

function LeadsPageContent() {
  const { getParam, setParams } = useQueryParams();
  const [search, setSearch] = useState(getParam("q"));
  const [status, setStatus] = useState<LeadStatus | "全部">(getParam("status", "全部") as LeadStatus | "全部");
  const [source, setSource] = useState(getParam("source"));
  const [page, setPage] = useState(Math.max(1, parseInt(getParam("page", "1"), 10) || 1));

  const fetchLeads = useCallback(
    () => leadsApi.list({ keyword: search || undefined, status: status !== "全部" ? status : undefined, source_channel: source || undefined, page, pageSize: PAGE_SIZE }),
    [search, status, source, page]
  );
  const { data: result, loading, error, refetch } = useApi(fetchLeads, [fetchLeads]);

  // Resolve source job code via Lead → publication_id → JobPublication.public_job_code
  const { data: pubsResult } = useApi(
    () => publicationsApi.list({ page: 1, pageSize: 200 }),
    []
  );
  const pubMap: Record<string, { code: string | null; title: string }> = {};
  for (const p of pubsResult?.data ?? []) {
    pubMap[p.id] = { code: p.public_job_code ?? null, title: p.title };
  }

  useEffect(() => {
    const updates: Record<string, string | null> = {};
    updates.q = search || null;
    updates.status = status !== "全部" ? status : null;
    updates.source = source || null;
    updates.page = page > 1 ? String(page) : null;
    setParams(updates, { replace: true });
  }, [search, status, source, page, setParams]);

  const list = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  const activeFilters = [
    ...(status !== "全部" ? [{ label: `状态：${status}`, onRemove: () => setStatus("全部") }] : []),
    ...(source ? [{ label: `来源：${source}`, onRemove: () => setSource("") }] : []),
  ];

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-background p-6">
      <PageHeader
        title="投递管理"
        description="处理候选人投递，跟进联系、推荐与面试安排"
        breadcrumbs={[{ label: "控制台", href: "/" }, { label: "投递管理" }]}
      />

      <div className="bg-card rounded-lg shadow-card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text" placeholder="搜索候选人姓名或邮箱..."
              className="w-full bg-muted border-none rounded-md pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <select value={status} onChange={(e) => { setStatus(e.target.value as LeadStatus | "全部"); setPage(1); }}
                className="appearance-none bg-muted border-none rounded-md pl-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                <option value="全部">全部状态</option>
                {LEAD_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/20">
            <span className="text-xs text-muted-foreground">已选筛选：</span>
            {activeFilters.map((f, i) => (
              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-primary/10 text-primary text-xs">{f.label}<button onClick={f.onRemove}><X className="w-3 h-3" /></button></span>
            ))}
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">加载投递数据...</div>
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : list.length === 0 ? (
          <EmptyState
            title="暂无投递"
            description={search || status !== "全部" || source ? "尝试调整筛选条件" : "候选人投递将显示在这里"}
          />
        ) : (
          <>
            <ConsoleTable>
              <ConsoleTHead>
                <ConsoleTr>
                  <ConsoleTh stickyLeft={0} className="w-[280px] min-w-[280px]">候选人</ConsoleTh>
                  <ConsoleTh className="min-w-[240px]">来源岗位</ConsoleTh>
                  <ConsoleTh className="min-w-[160px]">来源渠道</ConsoleTh>
                  <ConsoleTh className="min-w-[130px]">状态</ConsoleTh>
                  <ConsoleTh className="min-w-[170px]">投递时间</ConsoleTh>
                  <ConsoleTh stickyRight className="min-w-[100px] text-right">操作</ConsoleTh>
                </ConsoleTr>
              </ConsoleTHead>
              <ConsoleTBody>
                {list.map((lead) => (
                  <ConsoleTr key={lead.id}>
                    <ConsoleTd stickyLeft={0} className="w-[280px] min-w-[280px]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0"><UserPlus className="w-4.5 h-4.5 text-primary" /></div>
                        <div className="min-w-0">
                          <Link href={`/leads/${lead.id}`} className="block text-sm font-semibold text-foreground hover:text-primary transition-colors truncate" title={lead.full_name}>{lead.full_name}</Link>
                          <p className="text-xs text-muted-foreground truncate" title={lead.email || "未填写邮箱"}>{lead.email || "未填写邮箱"}</p>
                        </div>
                      </div>
                    </ConsoleTd>
                    <ConsoleTd className="min-w-[240px]">
                      {pubMap[lead.publication_id] ? (
                        <div className="flex items-center gap-1 min-w-0">
                          <JobCode code={pubMap[lead.publication_id].code} showCopy={false} />
                          <span className="text-muted-foreground/50 shrink-0">｜</span>
                          <span className="text-sm text-foreground truncate max-w-[160px]" title={pubMap[lead.publication_id].title}>{pubMap[lead.publication_id].title}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </ConsoleTd>
                    <ConsoleTd className="min-w-[160px]"><div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" /><span className="text-sm text-foreground max-w-[130px] truncate" title={lead.source_channel || "-"}>{lead.source_channel || "-"}</span></div></ConsoleTd>
                    <ConsoleTd className="min-w-[130px]"><StatusBadge type="lead" value={lead.status} /></ConsoleTd>
                    <ConsoleTd className="min-w-[170px]"><span className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(lead.created_at)}</span></ConsoleTd>
                    <ConsoleTd stickyRight className="min-w-[100px] text-right"><Link href={`/leads/${lead.id}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1 whitespace-nowrap">处理 <ArrowRight className="w-3 h-3" /></Link></ConsoleTd>
                  </ConsoleTr>
                ))}
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
