"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Plus, Building2, Eye, Pencil, Trash2 } from "lucide-react";
import { companiesApi } from "@/lib/api";
import { useApi } from "@/lib/api/hooks";
import { useQueryParams } from "@/hooks/use-query-params";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { StatusBadge } from "@/components/status-badge";
import { ConsoleTable, ConsoleTHead, ConsoleTBody, ConsoleTr, ConsoleTh, ConsoleTd } from "@/components/console-table";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { formatDate } from "@/lib/format";
import type { Company } from "@/lib/domain/types";

const PAGE_SIZE = 20;

export default function CompaniesPage() {
  return (
    <Suspense fallback={null}>
      <CompaniesPageContent />
    </Suspense>
  );
}

function CompaniesPageContent() {
  const { getParam, setParams } = useQueryParams();
  const searchParams = useSearchParams();
  const { success, error: toastError } = useToast();

  const [search, setSearch] = useState(getParam("q"));
  const [page, setPage] = useState(Math.max(1, parseInt(getParam("page", "1"), 10) || 1));
  const [showCreate, setShowCreate] = useState(searchParams.get("create") === "1");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const fetchCompanies = useCallback(
    () =>
      companiesApi.list({
        keyword: search || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    [search, page]
  );

  const { data: result, loading, error, refetch } = useApi(fetchCompanies, [fetchCompanies]);
  const list = result?.data ?? [];
  const total = result?.total ?? 0;
  const totalPages = result?.totalPages ?? 1;

  useEffect(() => {
    const updates: Record<string, string | null> = {};
    if (search) updates.q = search;
    else updates.q = null;
    if (page > 1) updates.page = String(page);
    else updates.page = null;
    setParams(updates, { replace: true });
  }, [search, page, setParams]);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await companiesApi.delete(deletingId);
      success("公司已删除");
      setDeletingId(null);
      refetch();
    } catch (e) {
      const msg = (e as Error).message;
      setDeleteError(msg);
      toastError(msg);
    }
  };

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-background p-6">
      <PageHeader
        title="公司管理"
        description="管理合作企业信息，追踪各公司的招聘需求与状态"
        breadcrumbs={[{ label: "控制台", href: "/" }, { label: "公司管理" }]}
        actions={
          <button
            onClick={() => setShowCreate(true)}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />新增公司
          </button>
        }
      />

      {/* Search */}
      <div className="bg-card rounded-lg shadow-card p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              type="text" placeholder="搜索公司名称..."
              className="w-full bg-muted border-none rounded-md pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg shadow-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">加载中...</div>
        ) : error ? (
          <ErrorState message={error} onRetry={refetch} />
        ) : list.length === 0 ? (
          <EmptyState
            title="暂无公司数据"
            description={search ? "尝试调整筛选条件" : "开始创建第一家公司"}
            action={!search ? (
              <button onClick={() => setShowCreate(true)} className="text-sm text-primary hover:underline inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" />创建第一家公司</button>
            ) : undefined}
          />
        ) : (
          <>
            <ConsoleTable>
              <ConsoleTHead>
                <ConsoleTr>
                  <ConsoleTh stickyLeft={0} className="w-[280px] min-w-[280px]">公司名称</ConsoleTh>
                  <ConsoleTh className="min-w-[130px]">合作状态</ConsoleTh>
                  <ConsoleTh className="min-w-[170px]">更新时间</ConsoleTh>
                  <ConsoleTh stickyRight className="min-w-[140px] text-right">操作</ConsoleTh>
                </ConsoleTr>
              </ConsoleTHead>
              <ConsoleTBody>
                {list.map((c) => (
                  <ConsoleTr key={c.id}>
                    <ConsoleTd stickyLeft={0} className="w-[280px] min-w-[280px]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-4.5 h-4.5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <Link href={`/companies/${c.id}`} className="block text-sm font-semibold text-foreground hover:text-primary transition-colors truncate" title={c.name}>{c.name}</Link>
                          <p className="text-xs text-muted-foreground truncate" title={c.display_name || ""}>{c.display_name}</p>
                        </div>
                      </div>
                    </ConsoleTd>
                    <ConsoleTd className="min-w-[130px]"><StatusBadge type="company" value={c.status} /></ConsoleTd>
                    <ConsoleTd className="min-w-[170px]"><span className="text-sm text-muted-foreground whitespace-nowrap">{formatDate(c.updated_at)}</span></ConsoleTd>
                    <ConsoleTd stickyRight className="min-w-[140px] text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/companies/${c.id}`} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="查看"><Eye className="w-3.5 h-3.5" /></Link>
                        <Link href={`/companies/${c.id}?edit=1`} className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" title="编辑"><Pencil className="w-3.5 h-3.5" /></Link>
                        <button onClick={() => setDeletingId(c.id)}
                          className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="删除公司">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
                  <button key={i + 1} onClick={() => setPage(i + 1)}
                    className={`px-3 py-1 rounded text-xs ${page === i + 1 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted transition-colors"}`}>
                    {i + 1}
                  </button>
                ))}
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 rounded text-xs text-muted-foreground hover:bg-muted transition-colors disabled:opacity-40">下一页</button>
              </div>
            </div>
          </>
        )}
      </div>

      {showCreate && <CreateCompanyModal onClose={() => setShowCreate(false)} onCreated={refetch} />}

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(v) => { if (!v) { setDeletingId(null); setDeleteError(""); } }}
        title="删除公司"
        description={`确定要删除「${list.find((c) => c.id === deletingId)?.name ?? ""}」吗？此操作不可撤销。若该公司下存在岗位，将无法删除。`}
        confirmText="确认删除"
        onConfirm={handleDelete}
        destructive
      />
      {deleteError && <p className="sr-only">{deleteError}</p>}
    </div>
  );
}

function CreateCompanyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { success, error: toastError } = useToast();

  const handleSubmit = async () => {
    if (!name.trim()) { setError("请输入公司名称"); return; }
    setSubmitting(true);
    setError("");
    try {
      await companiesApi.create({ name: name.trim(), display_name: displayName.trim() || name.trim() });
      success("公司创建成功");
      onCreated();
      onClose();
    } catch (e) {
      const msg = (e as Error).message;
      setError(msg);
      toastError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-card rounded-lg shadow-float p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-foreground mb-4">新增公司</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">公司名称 *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-muted border-none rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="如：国盾量子科技" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">英文名称</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-muted border-none rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="如：QuantumShield Tech" />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 rounded-md text-sm bg-muted text-foreground hover:bg-accent transition-colors">取消</button>
          <button onClick={handleSubmit} disabled={submitting || !name.trim()}
            className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
            {submitting ? "保存中..." : "确认创建"}
          </button>
        </div>
      </div>
    </div>
  );
}
