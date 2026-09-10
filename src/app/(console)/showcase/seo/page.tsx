'use client';

import { Globe, Loader2 } from 'lucide-react';

export default function ShowcaseSeoPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">SEO 管理</h1>
        <p className="text-slate-500 mt-1">管理 Showcase 页面的 SEO 配置</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">SEO 配置</h2>
            <p className="text-sm text-slate-500">管理页面标题、描述、关键词等 SEO 元素</p>
          </div>
        </div>
        <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
          SEO 管理功能开发中
        </div>
      </div>
    </div>
  );
}
