'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Shield, Users, UserPlus, Key, FileText, Loader2, AlertCircle } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  role: string;
  status: string;
  manager_id: string | null;
}

interface Team {
  id: string;
  name: string;
  lead_id: string;
  status: string;
}

interface PermissionGrant {
  id: string;
  grantee_id: string;
  permission_key: string;
  resource_type: string | null;
  resource_id: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
}

interface AuditLog {
  id: string;
  actor_kind: string;
  actor_profile_id: string | null;
  action: string;
  target_type: string;
  target_id: string;
  created_at: string;
}

type Tab = 'members' | 'permissions' | 'audit' | 'contact_requests';

const ROLE_LABELS: Record<string, string> = {
  super_admin: '超级管理员',
  team_lead: '团队负责人',
  internal_consultant: '内部顾问',
};

const PERMISSION_LABELS: Record<string, string> = {
  team_data_read: '团队数据查看',
  team_progress_manage: '团队推进管理',
  publication_edit: '公开岗位编辑',
  publication_publish: '公开岗位发布',
  publication_operate: 'Showcase 岗位运营',
  showcase_analytics: 'Showcase 数据查看',
  talent_contact_read: '人才联系方式查看',
  external_collaboration_manage: '外部顾问协作管理',
};

export default function TeamPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>}>
      <TeamPageContent />
    </Suspense>
  );
}

function TeamPageContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as Tab) || 'members';
  const validTabs: Tab[] = ['members', 'permissions', 'audit'];
  const [tab, setTab] = useState<Tab>(validTabs.includes(initialTab) ? initialTab : 'members');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [grants, setGrants] = useState<PermissionGrant[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [contactRequests, setContactRequests] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [tab]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'members') {
        const [profilesRes, teamsRes] = await Promise.all([
          fetch('/api/team/members'),
          fetch('/api/team/teams'),
        ]);
        if (profilesRes.ok) setProfiles(await profilesRes.json().then(r => r.data ?? []));
        if (teamsRes.ok) setTeams(await teamsRes.json().then(r => r.data ?? []));
      } else if (tab === 'permissions') {
        const res = await fetch('/api/team/permissions');
        if (res.ok) setGrants(await res.json().then(r => r.data ?? []));
      } else if (tab === 'audit') {
        const res = await fetch('/api/team/audit-logs');
        if (res.ok) setAuditLogs(await res.json().then(r => r.data ?? []));
      } else if (tab === 'contact_requests') {
        const res = await fetch('/api/team/contact-requests');
        if (res.ok) setContactRequests(await res.json().then(r => r.data ?? []));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">团队与权限</h1>
        <p className="text-slate-500 mt-1">管理团队成员、权限授权和操作审计</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        {([
          { key: 'members' as Tab, label: '团队成员', icon: Users },
          { key: 'permissions' as Tab, label: '权限授权', icon: Key },
          { key: 'contact_requests' as Tab, label: '联系方式审批', icon: UserPlus },
          { key: 'audit' as Tab, label: '操作审计', icon: FileText },
        ]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {tab === 'members' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  共 {profiles.length} 名成员
                </span>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                  <UserPlus className="w-4 h-4" />
                  邀请成员
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">姓名</th>
                    <th className="px-4 py-3">角色</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {profiles.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">
                        {p.full_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          p.role === 'super_admin'
                            ? 'bg-purple-100 text-purple-700'
                            : p.role === 'team_lead'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {ROLE_LABELS[p.role] ?? p.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          p.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {p.status === 'active' ? '活跃' : '停用'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-sm text-blue-600 hover:text-blue-700">
                          管理
                        </button>
                      </td>
                    </tr>
                  ))}
                  {profiles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                        暂无团队成员
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'permissions' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  共 {grants.length} 条授权记录
                </span>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                  <Key className="w-4 h-4" />
                  新增授权
                </button>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">被授权人</th>
                    <th className="px-4 py-3">权限</th>
                    <th className="px-4 py-3">资源范围</th>
                    <th className="px-4 py-3">状态</th>
                    <th className="px-4 py-3">过期时间</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grants.map((g) => {
                    const grantee = profiles.find(p => p.id === g.grantee_id);
                    return (
                      <tr key={g.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {grantee?.full_name ?? g.grantee_id.slice(0, 8)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {PERMISSION_LABELS[g.permission_key] ?? g.permission_key}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {g.resource_type ? `${g.resource_type}:${g.resource_id?.slice(0, 8)}` : '全局'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            g.status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {g.status === 'active' ? '生效中' : '已撤销'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {g.expires_at ? new Date(g.expires_at).toLocaleDateString() : '永久'}
                        </td>
                        <td className="px-4 py-3">
                          {g.status === 'active' && (
                            <button className="text-sm text-red-600 hover:text-red-700">
                              撤销
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {grants.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                        暂无权限授权记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'audit' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <span className="text-sm font-medium text-slate-700">
                  共 {auditLogs.length} 条操作记录
                </span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">时间</th>
                    <th className="px-4 py-3">操作者</th>
                    <th className="px-4 py-3">操作</th>
                    <th className="px-4 py-3">目标</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {log.actor_kind === 'system' ? '系统' : log.actor_profile_id?.slice(0, 8) ?? '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {log.target_type}:{log.target_id.slice(0, 8)}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-500">
                        暂无操作审计记录
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'contact_requests' && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200">
                <span className="text-sm font-medium text-slate-700">
                  共 {contactRequests.length} 条待审批请求
                </span>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">申请人</th>
                    <th className="px-4 py-3">人才</th>
                    <th className="px-4 py-3">原因</th>
                    <th className="px-4 py-3">申请时间</th>
                    <th className="px-4 py-3">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {contactRequests.map((req) => {
                    const requester = req.requester as Record<string, string> | null;
                    const talent = req.talent as Record<string, string> | null;
                    return (
                      <tr key={req.id as string} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {requester?.full_name ?? (req.requester_id as string)?.slice(0, 8) ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-900">
                          {talent?.full_name ?? (req.talent_id as string)?.slice(0, 8) ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {(req.reason as string) || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 whitespace-nowrap">
                          {new Date(req.created_at as string).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                const talentId = req.talent_id as string;
                                const res = await fetch(`/api/talents/${talentId}/contact-access`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ decision: 'approve' }),
                                });
                                if (res.ok) {
                                  setContactRequests(prev => prev.filter(r => r.id !== req.id));
                                }
                              }}
                              className="px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100"
                            >
                              批准
                            </button>
                            <button
                              onClick={async () => {
                                const talentId = req.talent_id as string;
                                const res = await fetch(`/api/talents/${talentId}/contact-access`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ decision: 'reject' }),
                                });
                                if (res.ok) {
                                  setContactRequests(prev => prev.filter(r => r.id !== req.id));
                                }
                              }}
                              className="px-2 py-1 rounded bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100"
                            >
                              拒绝
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {contactRequests.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                        暂无待审批的联系方式访问请求
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
