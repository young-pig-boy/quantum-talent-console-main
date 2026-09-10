'use client';

import { useEffect, useState } from 'react';
import { Handshake, UserPlus, Loader2, AlertCircle } from 'lucide-react';

interface ExternalConsultant {
  id: string;
  full_name: string;
  organization: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  created_at: string;
}

const STATUS_LABELS: Record<string, string> = {
  invited: '已邀请',
  active: '活跃',
  inactive: '停用',
};

export default function ExternalPage() {
  const [consultants, setConsultants] = useState<ExternalConsultant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/external/consultants')
      .then(r => r.ok ? r.json() : null)
      .then(d => setConsultants(d?.data ?? []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">外部顾问</h1>
        <p className="text-slate-500 mt-1">管理外部顾问协作与岗位访问权限</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2 mb-4">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700">
            共 {consultants.length} 名外部顾问
          </span>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
            <UserPlus className="w-4 h-4" />
            邀请顾问
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">姓名</th>
                <th className="px-4 py-3">机构</th>
                <th className="px-4 py-3">联系方式</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {consultants.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {c.full_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {c.organization ?? '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {c.email ?? c.phone ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      c.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : c.status === 'invited'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {STATUS_LABELS[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button className="text-sm text-blue-600 hover:text-blue-700">
                      管理
                    </button>
                  </td>
                </tr>
              ))}
              {consultants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                    暂无外部顾问
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
