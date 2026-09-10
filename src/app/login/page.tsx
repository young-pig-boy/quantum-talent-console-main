'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseLogin } from './supabase-actions';
import { Building2, Shield, Users, Loader2 } from 'lucide-react';

type LoginMode = 'super_admin' | 'team';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('team');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Super Admin form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Team form state
  const [email, setEmail] = useState('');
  const [teamPassword, setTeamPassword] = useState('');

  function handleSuperAdminSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/super-admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || '登录失败');
          return;
        }
        router.push('/');
        router.refresh();
      } catch {
        setError('网络错误，请重试');
      }
    });
  }

  function handleTeamSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(() => {
      supabaseLogin(email, teamPassword).then((result) => {
        if (result?.error) {
          setError(result.error);
        } else {
          router.push('/');
          router.refresh();
        }
      });
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">量子招聘中台</h1>
          <p className="text-slate-500 mt-1">Quantum Talent Console</p>
        </div>

        {/* Mode Tabs */}
        <div className="flex rounded-lg bg-slate-100 p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode('team'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'team'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            团队登录
          </button>
          <button
            type="button"
            onClick={() => { setMode('super_admin'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'super_admin'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Shield className="w-4 h-4" />
            超级管理员
          </button>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          {mode === 'team' ? (
            <form onSubmit={handleTeamSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                  邮箱
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={isPending}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
                />
              </div>
              <div>
                <label htmlFor="team-password" className="block text-sm font-medium text-slate-700 mb-1">
                  密码
                </label>
                <input
                  id="team-password"
                  type="password"
                  value={teamPassword}
                  onChange={(e) => setTeamPassword(e.target.value)}
                  placeholder="输入密码"
                  required
                  disabled={isPending}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
                />
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                登录
              </button>
            </form>
          ) : (
            <form onSubmit={handleSuperAdminSubmit} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                超级管理员入口仅限系统维护使用。所有操作将记录审计日志。
              </div>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
                  用户名
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="输入超级管理员用户名"
                  required
                  disabled={isPending}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                  密码
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码"
                  required
                  disabled={isPending}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50"
                />
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-slate-900 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                登录
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Quantum Talent Console v2.0
        </p>
      </div>
    </div>
  );
}
