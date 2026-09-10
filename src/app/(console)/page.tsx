"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Briefcase, Globe, UserPlus, Phone, Star, Users, Trophy, Calendar, ArrowRight, Clock, AlertCircle, Plus, Building2 } from "lucide-react";
import { analyticsApi, applicationsApi, jobsApi, talentsApi } from "@/lib/api";
import { useApi } from "@/lib/api/hooks";
import { PageHeader } from "@/components/page-header";
import { LoadingPage } from "@/components/loading-page";
import { ErrorState } from "@/components/error-state";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { DashboardSummary, Application } from "@/lib/domain/types";

const NOW_ISO = () => new Date().toISOString();

export default function DashboardPage() {
  const fetchDashboard = useCallback(() => analyticsApi.getDashboard(), []);
  const { data: dash, loading, error, refetch } = useApi(fetchDashboard, [fetchDashboard]);

  const [overdue, setOverdue] = useState<Application[]>([]);
  const [upcoming, setUpcoming] = useState<Application[]>([]);
  const [jobNames, setJobNames] = useState<Record<string, string>>({});
  const [talentNames, setTalentNames] = useState<Record<string, string>>({});
  const [actionsLoading, setActionsLoading] = useState(true);
  const [namesError, setNamesError] = useState(false);
  const [actionsError, setActionsError] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(json => {
        if (json.authenticated && json.role) {
          setUserRole(json.role);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setActionsLoading(true);
    setNamesError(false);
    setActionsError(false);
    Promise.all([
      applicationsApi.list({ due_before: NOW_ISO(), pageSize: 10, order_by: 'next_action_at', order: 'asc' }),
      applicationsApi.list({ due_after: NOW_ISO(), pageSize: 10, order_by: 'next_action_at', order: 'asc' }),
    ])
      .then(async ([overdueRes, upcomingRes]) => {
        if (cancelled) return;
        const overdueList = overdueRes.data.filter(a => !['hired', 'rejected', 'withdrawn'].includes(a.stage));
        const upcomingList = upcomingRes.data.filter(a => !['hired', 'rejected', 'withdrawn'].includes(a.stage));
        setOverdue(overdueList);
        setUpcoming(upcomingList);

        const jobIds = [...new Set([...overdueList, ...upcomingList].map(a => a.job_id))];
        const talentIds = [...new Set([...overdueList, ...upcomingList].map(a => a.talent_id))];

        try {
          const [jobMap, talentMap] = await Promise.all([
            jobIds.length > 0
              ? jobsApi.list({ ids: jobIds.join(','), pageSize: 200 }).then(r => {
                  const map: Record<string, string> = {};
                  (r.data ?? []).forEach((j) => { map[j.id] = j.title; });
                  return map;
                })
              : Promise.resolve({} as Record<string, string>),
            talentIds.length > 0
              ? talentsApi.list({ ids: talentIds.join(','), pageSize: 200 }).then(r => {
                  const map: Record<string, string> = {};
                  (r.data ?? []).forEach((t) => { map[t.id] = t.full_name; });
                  return map;
                })
              : Promise.resolve({} as Record<string, string>),
          ]);
          if (!cancelled) {
            setJobNames(jobMap);
            setTalentNames(talentMap);
          }
        } catch {
          if (!cancelled) setNamesError(true);
        }
      })
      .catch(() => {
        // 待办列表加载失败：避免 Promise.all 未捕获异常，展示错误提示
        if (!cancelled) setActionsError(true);
      })
      .finally(() => { if (!cancelled) setActionsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) return <LoadingPage tip="加载工作台数据..." />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const d: DashboardSummary = dash ?? { recruitingJobs: 0, publishedJobs: 0, newLeads: 0, pendingContacts: 0, recommended: 0, interviews: 0, offers: 0, hired: 0, recentApplications: 0, recentLeads: 0, overdueActions: 0, upcomingActions: 0 };

  const stats = [
    { label: "招聘中岗位", value: d.recruitingJobs, icon: Briefcase, color: "text-blue-600", bg: "bg-blue-50", href: "/jobs?status=recruiting" },
    { label: "已发布岗位", value: d.publishedJobs, icon: Globe, color: "text-emerald-600", bg: "bg-emerald-50", href: "/publications?status=published" },
    { label: "新投递", value: d.newLeads, icon: UserPlus, color: "text-indigo-600", bg: "bg-indigo-50", href: "/leads?status=new" },
    { label: "待联系", value: d.pendingContacts, icon: Phone, color: "text-amber-600", bg: "bg-amber-50", href: "/leads?status=contacting" },
    { label: "已推荐", value: d.recommended, icon: Star, color: "text-violet-600", bg: "bg-violet-50", href: "/pipeline" },
    { label: "面试中", value: d.interviews, icon: Users, color: "text-orange-600", bg: "bg-orange-50", href: "/pipeline" },
    { label: "Offer", value: d.offers, icon: Trophy, color: "text-rose-600", bg: "bg-rose-50", href: "/pipeline" },
    { label: "已入职", value: d.hired, icon: Calendar, color: "text-emerald-600", bg: "bg-emerald-100", href: "/pipeline" },
  ];

  const quickActions = [
    { label: "新增岗位", href: "/jobs/new", icon: Briefcase },
    { label: "新增公司", href: "/companies?create=1", icon: Building2 },
    { label: "新增投递", href: "/leads?create=1", icon: UserPlus },
    { label: "查看 Pipeline", href: "/pipeline", icon: Trophy },
  ];

  const actionItems = [...overdue.map(a => ({ ...a, type: 'overdue' as const })), ...upcoming.slice(0, 5 - overdue.length).map(a => ({ ...a, type: 'upcoming' as const }))];

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-background p-6">
      <PageHeader
        title="工作台"
        description={userRole ? `量子人才招聘中台概览与待办 · ${userRole === 'super_admin' ? '超级管理员' : userRole === 'team_lead' ? '团队负责人' : '内部顾问'}` : '量子人才招聘中台概览与待办'}
      />

      {/* 核心指标 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <Link key={s.label} href={s.href} className="group bg-card rounded-lg shadow-card p-5 hover:shadow-float transition-all">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center group-hover:scale-105 transition-transform`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
              <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
            </div>
            <div className="text-3xl font-bold text-foreground">{Number(s.value).toLocaleString("zh-CN")}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 待办区域 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-lg shadow-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground">待办跟进</h2>
                {d.overdueActions > 0 && <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-destructive/10 text-destructive">{d.overdueActions} 逾期</span>}
                {d.upcomingActions > 0 && <span className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-xs font-medium bg-amber-50 text-amber-700">{d.upcomingActions} 24h内</span>}
              </div>
              <Link href="/pipeline" className="text-xs text-primary hover:underline inline-flex items-center gap-1">查看全部 <ArrowRight className="w-3 h-3" /></Link>
            </div>

            {actionsLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">加载待办...</div>
            ) : actionsError ? (
              <div className="py-8 text-center">
                <AlertCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
                <div className="text-sm text-destructive font-medium">待办加载失败</div>
                <div className="text-xs text-muted-foreground mt-1">请稍后重试或检查接口状态</div>
              </div>
            ) : actionItems.length === 0 ? (
              <EmptyState title="暂无待办" description="所有跟进都处理完毕，休息一下" />
            ) : (
              <>
                {namesError && (
                  <div className="mb-3 px-3 py-2 rounded-md bg-destructive/5 text-destructive text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    关联数据加载失败，名称可能不完整
                  </div>
                )}
                <div className="space-y-2">
                  {actionItems.map(a => (
                    <Link key={a.id} href={`/applications/${a.id}`} className="flex items-center gap-3 rounded-md bg-muted/40 px-4 py-3 hover:bg-muted/60 transition-colors">
                      <div className="shrink-0">
                        {a.type === 'overdue' ? <AlertCircle className="w-4 h-4 text-destructive" /> : <Clock className="w-4 h-4 text-amber-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground truncate">{talentNames[a.talent_id] || a.talent_id.slice(0, 8)}</span>
                          <span className="text-xs text-muted-foreground truncate">· {jobNames[a.job_id] || a.job_id.slice(0, 8)}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StatusBadge type="application" value={a.stage} />
                          <span className={`text-xs ${a.type === 'overdue' ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                            {a.type === 'overdue' ? '逾期 ' : ''}{formatRelative(a.next_action_at)}
                          </span>
                        </div>
                      </div>
                      <div className="hidden sm:block text-xs text-muted-foreground">{formatDateTime(a.next_action_at)}</div>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 近期趋势 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card rounded-lg shadow-card p-5">
              <h2 className="text-sm font-bold text-foreground mb-2">近期申请</h2>
              <div className="text-3xl font-bold text-foreground">{d.recentApplications}</div>
              <div className="text-xs text-muted-foreground mt-1">系统中全部申请数</div>
            </div>
            <div className="bg-card rounded-lg shadow-card p-5">
              <h2 className="text-sm font-bold text-foreground mb-2">近期投递</h2>
              <div className="text-3xl font-bold text-foreground">{d.recentLeads}</div>
              <div className="text-xs text-muted-foreground mt-1">系统中全部投递数</div>
            </div>
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="bg-card rounded-lg shadow-card p-5 h-fit">
          <h2 className="text-sm font-bold text-foreground mb-4">快捷操作</h2>
          <div className="space-y-2">
            {quickActions.map(action => (
              <Link key={action.label} href={action.href} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0"><action.icon className="w-4 h-4 text-primary" /></div>
                {action.label}
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
