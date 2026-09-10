"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { Search, Plus, Users, Mail, ArrowRight } from "lucide-react";
import { talentsApi } from "@/lib/api";
import { useApi } from "@/lib/api/hooks";
import { useQueryParams } from "@/hooks/use-query-params";
import { PageHeader } from "@/components/page-header";
import { ConsoleTable, ConsoleTHead, ConsoleTBody, ConsoleTr, ConsoleTh, ConsoleTd } from "@/components/console-table";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { formatDate } from "@/lib/format";
import type { Talent } from "@/lib/domain/types";

const PAGE_SIZE = 20;

export default function TalentsPage() {
  return (
    <Suspense fallback={null}>
      <TalentsPageContent />
    </Suspense>
  );
}

function TalentsPageContent() {
  const { getParam, setParams } = useQueryParams();
  const [search, setSearch] = useState(getParam("q"));
  const [page, setPage] = useState(Math.max(1, parseInt(getParam("page", "1"), 10) || 1));

  const fetchTalents = useCallback(
    () => talentsApi.list({ keyword: search || undefined, page, pageSize: PAGE_SIZE }),
    [search, page]
  );
  const { data: result, loading, error, refetch } = useApi(fetchTalents, [fetchTalents]);

  useEffect(() => {
    const updates: Record<string, string | null> = {};
    updates.q = search || null;
    updates.page = page > 1 ? String(page) : null;
    setParams(updates, { replace: true });
  }, [search, page, setParams]);

  const list = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-background p-6">
      <PageHeader
        title="人才库"
        description="沉淀可复用的候选人资源，支持快速检索与关联"
        breadcrumbs={[{ label: "控制台", href: "/" }, { label: "人才库" }]}
      />

      <div className="bg-card rounded-lg shadow-card p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text" placeholder="搜索姓名、邮箱、手机号..."
              className="w-full bg-muted border-none rounded-md pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">加载人才数据...</div>
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : list.length === 0 ? (
          <EmptyState
            title="暂无人才"
            description={search ? "尝试更换关键词" : "从投递中转入人才库，或手动添加候选人"}
            action={!search ? (
              <span className="text-sm text-muted-foreground">处理投递时可一键转入人才库</span>
            ) : undefined}
          />
        ) : (
          <>
            <ConsoleTable>
              <ConsoleTHead>
                <ConsoleTr>
                  <ConsoleTh stickyLeft={0} className="w-[280px] min-w-[280px]">候选人</ConsoleTh>
                  <ConsoleTh className="min-w-[240px]">联系方式</ConsoleTh>
                  <ConsoleTh className="min-w-[220px]">当前公司</ConsoleTh>
                  <ConsoleTh className="min-w-[170px]">更新时间</ConsoleTh>
                  <ConsoleTh stickyRight className="min-w-[100px] text-right">操作</ConsoleTh>
                </ConsoleTr>
              </ConsoleTHead>
              <ConsoleTBody>
                {list.map((talent) => (
                  <ConsoleTr key={talent.id}>
                    <ConsoleTd stickyLeft={0} className="w-[280px] min-w-[280px]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0"><Users className="w-4.5 h-4.5 text-primary" /></div>
                        <div className="min-w-0">
                          <Link href={`/talents/${talent.id}`} className="block text-sm font-semibold text-foreground hover:text-primary transition-colors truncate" title={talent.full_name}>{talent.full_name}</Link>
                          <p className="text-xs text-muted-foreground truncate" title={talent.current_title || "未填写职位"}>{talent.current_title || "未填写职位"}</p>
                        </div>
                      </div>
                    </ConsoleTd>
                    <ConsoleTd className="min-w-[240px]">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="text-sm max-w-[200px] truncate" title={talent.email || "-"}>{talent.email || "-"}</span>
                      </div>
                    </ConsoleTd>
                    <ConsoleTd className="min-w-[220px]"><span className="text-sm text-foreground max-w-[190px] block truncate" title={talent.current_company || "-"}>{talent.current_company || "-"}</span></ConsoleTd>
                    <ConsoleTd className="min-w-[170px]"><span className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(talent.updated_at)}</span></ConsoleTd>
                    <ConsoleTd stickyRight className="min-w-[100px] text-right">
                      <Link href={`/talents/${talent.id}`} className="text-xs text-primary hover:underline inline-flex items-center gap-1 whitespace-nowrap">详情 <ArrowRight className="w-3 h-3" /></Link>
                    </ConsoleTd>
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
