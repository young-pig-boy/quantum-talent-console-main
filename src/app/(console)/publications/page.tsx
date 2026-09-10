"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { Search, Plus, Globe, Eye, ChevronDown, X, Loader2, Star, Zap } from "lucide-react";
import { publicationsApi, jobsApi, companiesApi } from "@/lib/api";
import { useApi } from "@/lib/api/hooks";
import { useQueryParams } from "@/hooks/use-query-params";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { JobCode } from "@/components/job-code";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ConsoleTable, ConsoleTHead, ConsoleTBody, ConsoleTr, ConsoleTh, ConsoleTd } from "@/components/console-table";
import { formatDate } from "@/lib/format";
import { PUBLICATION_STATUSES } from "@/lib/status";
import { QUANTUM_TRACKS, getQuantumTrackLabel, isDirtyTrack } from "@/lib/domain/quantum-tracks";
import { isUrgentActive, isUrgentExpired } from "@/lib/domain/publication-rules";
import type { JobPublication, Job, PublicationStatus, BatchOperationItemResult } from "@/lib/domain/types";

const PAGE_SIZE = 20;
const MAX_SELECT = 25;

export default function PublicationsPage() {
  return (
    <Suspense fallback={null}>
      <PublicationsPageContent />
    </Suspense>
  );
}

function PublicationsPageContent() {
  const { getParam, setParams } = useQueryParams();
  const { success: toastSuccess, error: toastError, warning: toastWarning } = useToast();
  const [search, setSearch] = useState(getParam("q"));
  const [status, setStatus] = useState<PublicationStatus | "全部">(getParam("status", "全部") as PublicationStatus | "全部");
  const [featured, setFeatured] = useState<string>(getParam("featured", "全部"));
  const [track, setTrack] = useState<string>(getParam("track", "全部"));
  const [page, setPage] = useState(Math.max(1, parseInt(getParam("page", "1"), 10) || 1));

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [offlineDialogOpen, setOfflineDialogOpen] = useState(false);
  const [featureDialogOpen, setFeatureDialogOpen] = useState(false);
  const [unfeatureDialogOpen, setUnfeatureDialogOpen] = useState(false);
  const [batchErrors, setBatchErrors] = useState<BatchOperationItemResult[]>([]);

  const fetchPublications = useCallback(
    () => publicationsApi.list({ keyword: search || undefined, status: status !== "全部" ? status : undefined, track: track !== "全部" ? (track === "__uncategorized" ? "__uncategorized" : track) : undefined, featured: featured !== "全部" ? featured : undefined, page, pageSize: PAGE_SIZE }),
    [search, status, track, featured, page]
  );
  const { data: result, loading, error, refetch } = useApi(fetchPublications, [fetchPublications]);

  const { data: jobsRes } = useApi(() => jobsApi.list({ pageSize: 200 }), []);
  const jobs = jobsRes?.data ?? [];

  const { data: companiesRes } = useApi(() => companiesApi.list({ pageSize: 200 }), []);
  const companies = companiesRes?.data ?? [];

  useEffect(() => {
    const updates: Record<string, string | null> = {};
    updates.q = search || null;
    updates.status = status !== "全部" ? status : null;
    updates.featured = featured !== "全部" ? featured : null;
    updates.track = track !== "全部" ? track : null;
    updates.page = page > 1 ? String(page) : null;
    setParams(updates, { replace: true });
  }, [search, status, track, featured, page, setParams]);

  const list = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;
  const jobMap = Object.fromEntries(jobs.map((j) => [j.id, j])) as Record<string, Job>;
  const companyMap = Object.fromEntries(companies.map((c) => [c.id, c]));

  const activeFilters = [
    ...(status !== "全部" ? [{ label: `状态：${status}`, onRemove: () => setStatus("全部") }] : []),
    ...(featured !== "全部" ? [{ label: featured === "true" ? "精选岗位" : "非精选岗位", onRemove: () => setFeatured("全部") }] : []),
    ...(track !== "全部" ? [{ label: track === "__uncategorized" ? "赛道：未归类" : `赛道：${getQuantumTrackLabel(track) ?? track}`, onRemove: () => setTrack("全部") }] : []),
  ];

  // --- Batch selection helpers ---
  const pageIds = list.map((p) => p.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));
  const somePageSelected = pageIds.some((id) => selectedIds.includes(id));

  const toggleSelect = useCallback(
    (id: string) => {
      if (selectedIds.includes(id)) {
        setSelectedIds((prev) => prev.filter((x) => x !== id));
        return;
      }
      if (selectedIds.length >= MAX_SELECT) {
        toastWarning("单次最多操作25个岗位");
        return;
      }
      setSelectedIds((prev) => [...prev, id]);
    },
    [selectedIds, toastWarning]
  );

  const toggleSelectAll = useCallback(() => {
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
      return;
    }
    const newOnes = pageIds.filter((id) => !selectedIds.includes(id));
    if (selectedIds.length + newOnes.length > MAX_SELECT) {
      toastWarning("单次最多操作25个岗位");
      return;
    }
    setSelectedIds((prev) => [...prev, ...newOnes]);
  }, [allPageSelected, pageIds, selectedIds, toastWarning]);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setBatchErrors([]);
  }, []);

  // --- Batch actions ---
  const handleBatchPublish = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBatchLoading(true);
    try {
      const res = await publicationsApi.batchPublish(ids);
      setBatchErrors(res.results.filter((r) => r.status === "failed"));
      if (res.failed > 0) {
        toastError(`成功${res.success}，跳过${res.skipped}，失败${res.failed}`);
      } else {
        toastSuccess(`成功${res.success}，跳过${res.skipped}，失败${res.failed}`);
      }
      setSelectedIds([]);
      refetch();
    } catch (e) {
      toastError((e as Error).message || "批量公开失败");
    } finally {
      setBatchLoading(false);
      setPublishDialogOpen(false);
    }
  };

  const handleBatchOffline = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBatchLoading(true);
    try {
      const res = await publicationsApi.batchOffline(ids);
      setBatchErrors(res.results.filter((r) => r.status === "failed"));
      if (res.failed > 0) {
        toastError(`成功${res.success}，跳过${res.skipped}，失败${res.failed}`);
      } else {
        toastSuccess(`成功${res.success}，跳过${res.skipped}，失败${res.failed}`);
      }
      setSelectedIds([]);
      refetch();
    } catch (e) {
      toastError((e as Error).message || "批量停止发布失败");
    } finally {
      setBatchLoading(false);
      setOfflineDialogOpen(false);
    }
  };

  const handleBatchFeature = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBatchLoading(true);
    try {
      const res = await publicationsApi.batchFeature(ids);
      setBatchErrors(res.results.filter((r) => r.status === "failed"));
      if (res.failed > 0) {
        toastError(`成功${res.success}，跳过${res.skipped}，失败${res.failed}`);
      } else {
        toastSuccess(`成功${res.success}，跳过${res.skipped}，失败${res.failed}`);
      }
      setSelectedIds([]);
      refetch();
    } catch (e) {
      toastError((e as Error).message || "批量设为精选失败");
    } finally {
      setBatchLoading(false);
      setFeatureDialogOpen(false);
    }
  };

  const handleBatchUnfeature = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    setBatchLoading(true);
    try {
      const res = await publicationsApi.batchUnfeature(ids);
      setBatchErrors(res.results.filter((r) => r.status === "failed"));
      if (res.failed > 0) {
        toastError(`成功${res.success}，跳过${res.skipped}，失败${res.failed}`);
      } else {
        toastSuccess(`成功${res.success}，跳过${res.skipped}，失败${res.failed}`);
      }
      setSelectedIds([]);
      refetch();
    } catch (e) {
      toastError((e as Error).message || "批量取消精选失败");
    } finally {
      setBatchLoading(false);
      setUnfeatureDialogOpen(false);
    }
  };

  // --- Single feature/unfeature ---
  const handleSingleFeature = async (id: string) => {
    try {
      await publicationsApi.feature(id);
      toastSuccess("已设为精选");
      refetch();
    } catch (e) {
      toastError((e as Error).message || "设为精选失败");
    }
  };

  const handleSingleUnfeature = async (id: string) => {
    try {
      await publicationsApi.unfeature(id);
      toastSuccess("已取消精选");
      refetch();
    } catch (e) {
      toastError((e as Error).message || "取消精选失败");
    }
  };

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-background p-6">
      <PageHeader
        title="公开岗位"
        description="管理已发布到人才官网的岗位、上架状态与展示内容"
        breadcrumbs={[{ label: "控制台", href: "/" }, { label: "公开岗位" }]}
      />

      <div className="bg-card rounded-lg shadow-card p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text" placeholder="搜索公开岗位标题 / 公司 / 岗位编码..."
              className="w-full bg-muted border-none rounded-md pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select value={status} onChange={(e) => { setStatus(e.target.value as PublicationStatus | "全部"); setPage(1); }}
                className="appearance-none bg-muted border-none rounded-md pl-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                <option value="全部">全部状态</option>
                {PUBLICATION_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative">
              <select value={featured} onChange={(e) => { setFeatured(e.target.value); setPage(1); }}
                className="appearance-none bg-muted border-none rounded-md pl-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                <option value="全部">全部精选</option>
                <option value="true">精选岗位</option>
                <option value="false">非精选岗位</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative">
              <select value={track} onChange={(e) => { setTrack(e.target.value); setPage(1); }}
                className="appearance-none bg-muted border-none rounded-md pl-3 pr-8 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer">
                <option value="全部">全部赛道</option>
                {QUANTUM_TRACKS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                <option value="__uncategorized">未归类</option>
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

      {selectedIds.length > 0 && (
        <div className="bg-card rounded-lg shadow-card p-4 mb-6 flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">已选择 <span className="text-primary font-semibold">{selectedIds.length}</span> 个岗位</span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setPublishDialogOpen(true)}
              disabled={batchLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {batchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              批量公开
            </button>
            <button
              onClick={() => setOfflineDialogOpen(true)}
              disabled={batchLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              停止发布
            </button>
            <button
              onClick={() => setFeatureDialogOpen(true)}
              disabled={batchLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Star className="w-3.5 h-3.5" />
              设为精选
            </button>
            <button
              onClick={() => setUnfeatureDialogOpen(true)}
              disabled={batchLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              取消精选
            </button>
            <button
              onClick={clearSelection}
              disabled={batchLoading}
              className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              取消选择
            </button>
          </div>
        </div>
      )}

      {batchErrors.length > 0 && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-destructive">部分岗位操作失败</span>
            <button onClick={() => setBatchErrors([])} className="text-muted-foreground hover:text-foreground transition-colors"><X className="w-4 h-4" /></button>
          </div>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {batchErrors.map((item) => (
              <li key={item.id} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="font-mono shrink-0">{item.id.slice(0, 8)}</span>
                <span>{item.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-card rounded-lg shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">加载中...</div>
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : list.length === 0 ? (
          <EmptyState
            title="暂无公开岗位"
            description={search || status !== "全部" ? "尝试调整筛选条件" : "前往岗位详情页创建公开岗位"}
            action={!search && status === "全部" ? (
              <Link href="/jobs" className="text-sm text-primary hover:underline inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" />浏览岗位</Link>
            ) : undefined}
          />
        ) : (
          <>
            <ConsoleTable maxHeightClass="max-h-[calc(100vh-20rem)]">
              <ConsoleTHead>
                <ConsoleTr>
                  <ConsoleTh stickyLeft={0} fixedWidth={80} className="px-4">
                    <Checkbox
                      checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                      onCheckedChange={toggleSelectAll}
                      aria-label="全选本页岗位"
                      disabled={batchLoading}
                    />
                  </ConsoleTh>
                  <ConsoleTh stickyLeft={80} className="min-w-[340px]">岗位</ConsoleTh>
                  <ConsoleTh className="min-w-[150px]">赛道</ConsoleTh>
                  <ConsoleTh className="min-w-[130px]">发布状态</ConsoleTh>
                  <ConsoleTh className="min-w-[110px]">精选</ConsoleTh>
                  <ConsoleTh className="min-w-[110px]">急招</ConsoleTh>
                  <ConsoleTh className="min-w-[130px]">城市</ConsoleTh>
                  <ConsoleTh className="min-w-[170px]">更新时间</ConsoleTh>
                  <ConsoleTh stickyRight className="min-w-[180px] text-right">操作</ConsoleTh>
                </ConsoleTr>
              </ConsoleTHead>
              <ConsoleTBody>
                {list.map((pub: JobPublication) => {
                  const job = jobMap[pub.job_id];
                  const internalCompany = companyMap[job?.company_id ?? ""];
                  const internalCompanyName = internalCompany?.name || internalCompany?.display_name;
                  return (
                    <ConsoleTr key={pub.id}>
                      <ConsoleTd stickyLeft={0} fixedWidth={80} className="px-4">
                        <Checkbox
                          checked={selectedIds.includes(pub.id)}
                          onCheckedChange={() => toggleSelect(pub.id)}
                          aria-label={`选择 ${pub.title}`}
                          disabled={batchLoading}
                        />
                      </ConsoleTd>
                      <ConsoleTd stickyLeft={80} className="min-w-[340px]">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0"><Globe className="w-4.5 h-4.5 text-primary" /></div>
                          <div className="min-w-0">
                            <Link href={`/publications/${pub.id}`} className="block text-sm font-semibold text-foreground hover:text-primary transition-colors max-w-[260px] truncate" title={job?.title || pub.title}>{job?.title || pub.title}</Link>
                            <JobCode code={pub.public_job_code} showCopy={false} className="mt-0.5" />
                            <p className="text-xs text-muted-foreground max-w-[260px] truncate" title={internalCompanyName || "—"}>{internalCompanyName || "—"}<span className="text-[10px] text-muted-foreground/50 ml-1 shrink-0">仅内部可见</span></p>
                          </div>
                        </div>
                      </ConsoleTd>
                      <ConsoleTd className="min-w-[150px]">
                        {!pub.track ? (
                          <span className="text-sm text-muted-foreground">—</span>
                        ) : isDirtyTrack(pub.track) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-xs font-medium whitespace-nowrap">需重新选择</span>
                        ) : (
                          <span className="text-sm text-muted-foreground whitespace-nowrap">{getQuantumTrackLabel(pub.track)}</span>
                        )}
                      </ConsoleTd>
                      <ConsoleTd className="min-w-[130px]"><StatusBadge type="publication" value={pub.status} /></ConsoleTd>
                      <ConsoleTd className="min-w-[110px]">
                        {pub.featured ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium whitespace-nowrap"><Star className="w-3 h-3 fill-amber-500" />精选</span>
                        ) : (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">普通</span>
                        )}
                      </ConsoleTd>
                      <ConsoleTd className="min-w-[110px]">
                        {isUrgentActive(pub) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium whitespace-nowrap"><Zap className="w-3 h-3 fill-amber-500" />急招中</span>
                        ) : isUrgentExpired(pub) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium whitespace-nowrap">急招已到期</span>
                        ) : (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">普通</span>
                        )}
                      </ConsoleTd>
                      <ConsoleTd className="min-w-[130px]"><span className="text-sm text-muted-foreground whitespace-nowrap">{pub.city || job?.city || "-"}</span></ConsoleTd>
                      <ConsoleTd className="min-w-[170px]"><span className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(pub.updated_at)}</span></ConsoleTd>
                      <ConsoleTd stickyRight className="min-w-[180px] text-right">
                        <div className="flex items-center justify-end gap-3">
                          {pub.featured ? (
                            <button onClick={() => handleSingleUnfeature(pub.id)} className="text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">取消精选</button>
                          ) : (
                            <button onClick={() => handleSingleFeature(pub.id)} className="text-xs text-amber-500 hover:text-amber-600 transition-colors whitespace-nowrap">设为精选</button>
                          )}
                          <Link href={`/publications/${pub.id}`} className="text-xs text-primary hover:underline whitespace-nowrap">编辑</Link>
                          <Link href={`/publications/${pub.id}/preview`} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors whitespace-nowrap"><Eye className="w-3 h-3" />预览</Link>
                        </div>
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

      <ConfirmDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        title="批量公开岗位"
        description={`确认公开选中的 ${selectedIds.length} 个岗位？公开后将在人才展示站显示。`}
        confirmText="确认公开"
        loading={batchLoading}
        onConfirm={handleBatchPublish}
      />
      <ConfirmDialog
        open={offlineDialogOpen}
        onOpenChange={setOfflineDialogOpen}
        title="批量停止发布"
        description={`确认停止发布选中的 ${selectedIds.length} 个岗位？停止后将从人才展示站下线，但不会关闭内部招聘岗位。`}
        confirmText="确认停止发布"
        loading={batchLoading}
        onConfirm={handleBatchOffline}
        destructive
      />
      <ConfirmDialog
        open={featureDialogOpen}
        onOpenChange={setFeatureDialogOpen}
        title="批量设为精选"
        description={`确认将选中的 ${selectedIds.length} 个岗位设为精选？仅已发布且非精选的岗位会被设置。`}
        confirmText="确认设为精选"
        loading={batchLoading}
        onConfirm={handleBatchFeature}
      />
      <ConfirmDialog
        open={unfeatureDialogOpen}
        onOpenChange={setUnfeatureDialogOpen}
        title="批量取消精选"
        description={`确认取消选中的 ${selectedIds.length} 个岗位的精选状态？仅已设为精选的岗位会被取消。`}
        confirmText="确认取消精选"
        loading={batchLoading}
        onConfirm={handleBatchUnfeature}
      />
    </div>
  );
}