'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Eye, MousePointer, Loader2 } from 'lucide-react';

interface AnalyticsData {
  total_views: number;
  total_clicks: number;
  total_applications: number;
  conversion_rate: number;
}

export default function ShowcaseAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/showcase/analytics')
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d?.data ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">展示数据</h1>
        <p className="text-slate-500 mt-1">Showcase 页面访问与转化数据</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: '页面访问', value: data?.total_views ?? 0, icon: Eye, color: 'blue' },
          { label: '点击次数', value: data?.total_clicks ?? 0, icon: MousePointer, color: 'green' },
          { label: '投递数', value: data?.total_applications ?? 0, icon: TrendingUp, color: 'purple' },
          { label: '转化率', value: `${((data?.conversion_rate ?? 0) * 100).toFixed(1)}%`, icon: BarChart3, color: 'orange' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${color}-50`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
              <div>
                <p className="text-sm text-slate-500">{label}</p>
                <p className="text-xl font-bold text-slate-900">{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">趋势图表</h2>
        <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
          图表功能开发中
        </div>
      </div>
    </div>
  );
}
