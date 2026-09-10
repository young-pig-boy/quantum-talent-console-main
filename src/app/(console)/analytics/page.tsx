"use client";

import { useCallback } from "react";
import { BarChart3, Filter, TrendingUp } from "lucide-react";
import { analyticsApi } from "@/lib/api";
import { useApi } from "@/lib/api/hooks";
import { LoadingPage } from "@/components/loading-page";
import { ErrorState } from "@/components/error-state";
import type { DashboardSummary, FunnelStage, SourceDistribution } from "@/lib/domain/types";

export default function AnalyticsPage() {
  const fetchDashboard = useCallback(() => analyticsApi.getDashboard(), []);
  const fetchFunnel = useCallback(() => analyticsApi.getFunnel(), []);
  const fetchSources = useCallback(() => analyticsApi.getSources(), []);

  const { data: dash, loading: l1, error: e1, refetch: r1 } = useApi(fetchDashboard, [fetchDashboard]);
  const { data: funnel, loading: l2, error: e2, refetch: r2 } = useApi(fetchFunnel, [fetchFunnel]);
  const { data: sources, loading: l3, error: e3, refetch: r3 } = useApi(fetchSources, [fetchSources]);

  const loading = l1 || l2 || l3;
  const error = e1 || e2 || e3;
  const refetchAll = () => { r1(); r2(); r3(); };

  if (loading) return <LoadingPage tip="加载分析数据..." />;
  if (error) return <ErrorState message={error ?? undefined} onRetry={refetchAll} />;

  const d: DashboardSummary = dash ?? { recruitingJobs: 0, publishedJobs: 0, newLeads: 0, pendingContacts: 0, recommended: 0, interviews: 0, offers: 0, hired: 0, recentApplications: 0, recentLeads: 0, overdueActions: 0, upcomingActions: 0 };
  const funnelData: FunnelStage[] = funnel ?? [];
  const sourcesData: SourceDistribution[] = sources ?? [];
  const maxFunnel = funnelData.length > 0 ? funnelData[0].count : 1;
  const maxSource = sourcesData.length > 0 ? sourcesData[0].count : 1;

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-background p-6">
      <h1 className="text-2xl font-bold text-foreground mb-6">数据分析</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "招聘中岗位", value: d.recruitingJobs }, { label: "已发布岗位", value: d.publishedJobs },
          { label: "新投递", value: d.newLeads }, { label: "已入职", value: d.hired },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-lg shadow-card p-5">
            <div className="text-3xl font-bold text-foreground">{Number(s.value).toLocaleString("zh-CN")}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-lg shadow-card p-5">
          <div className="flex items-center gap-2 mb-4"><Filter className="w-4 h-4 text-primary" /><h2 className="text-sm font-bold text-foreground">招聘漏斗</h2></div>
          {funnelData.length === 0 ? <p className="text-xs text-muted-foreground py-8 text-center">暂无漏斗数据</p> : (
            <div className="space-y-2">
              {funnelData.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-20 shrink-0">{f.stage}</span>
                  <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, (f.count / maxFunnel) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-8 text-right">{f.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-lg shadow-card p-5">
          <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-primary" /><h2 className="text-sm font-bold text-foreground">来源分布</h2></div>
          {sourcesData.length === 0 ? <p className="text-xs text-muted-foreground py-8 text-center">暂无来源数据</p> : (
            <div className="space-y-2">
              {sourcesData.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">{s.channel || "-"}</span>
                  <div className="flex-1 bg-muted rounded-full h-5 overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(100, (s.count / maxSource) * 100)}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-8 text-right">{s.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <div className="bg-card rounded-lg shadow-card p-5">
          <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-4 h-4 text-primary" /><h2 className="text-sm font-bold text-foreground">概览统计</h2></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "推荐", value: d.recommended }, { label: "面试", value: d.interviews },
              { label: "Offer", value: d.offers }, { label: "入职", value: d.hired },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-lg bg-muted/40">
                <div className="text-2xl font-bold text-foreground">{Number(s.value).toLocaleString("zh-CN")}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
