'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  FileText,
  Users,
  UserPlus,
  GitBranch,
  BarChart3,
  Handshake,
  LogOut,
  Building,
  ChevronDown,
  ChevronRight,
  Key,
  ClipboardList,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: '业务资源',
    items: [
      { href: '/companies', label: '公司与岗位', icon: Building2 },
      { href: '/jobs', label: '内部岗位', icon: Briefcase },
    ],
  },
  {
    label: '展示运营',
    items: [
      { href: '/publications', label: '公开岗位', icon: FileText },
      { href: '/leads', label: '新投递', icon: UserPlus },
      { href: '/showcase/analytics', label: '展示数据', icon: BarChart3 },
    ],
  },
  {
    label: '人才交付',
    items: [
      { href: '/talents', label: '人才库', icon: Users },
      { href: '/pipeline', label: '招聘推进', icon: GitBranch },
    ],
  },
  {
    label: '外部协作',
    items: [
      { href: '/external', label: '外部顾问', icon: Handshake },
    ],
  },
  {
    label: '团队与权限',
    items: [
      { href: '/team?tab=members', label: '团队成员', icon: Users },
      { href: '/team?tab=permissions', label: '权限授权', icon: Key },
      { href: '/team?tab=audit', label: '操作日志', icon: ClipboardList },
    ],
  },
  {
    label: '数据分析',
    items: [
      { href: '/analytics', label: '数据看板', icon: BarChart3 },
    ],
  },
];

function NavItemComponent({ item, pathname }: { item: NavItem; pathname: string }) {
  const itemPath = item.href.split('?')[0]; // Strip query params for comparison
  const isActive = pathname === itemPath || pathname.startsWith(itemPath + '/');
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        isActive
          ? 'bg-blue-50 text-blue-700 font-medium'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon className="w-4 h-4" />
      {item.label}
    </Link>
  );
}

function NavGroupComponent({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors w-full"
      >
        {isExpanded ? (
          <ChevronDown className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
        {group.label}
      </button>
      {isExpanded && (
        <div className="mt-1 space-y-0.5">
          {group.items.map((item) => (
            <NavItemComponent key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    window.location.href = '/login';
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 h-14">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-slate-900">量子招聘中台</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-56 bg-white border-r border-slate-200 min-h-[calc(100vh-3.5rem)] p-4 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
          {/* Dashboard */}
          <div className="mb-4">
            <NavItemComponent
              item={{ href: '/', label: '工作台', icon: LayoutDashboard }}
              pathname={pathname}
            />
          </div>

          {/* Navigation Groups */}
          {NAV_GROUPS.map((group) => (
            <NavGroupComponent key={group.label} group={group} pathname={pathname} />
          ))}
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 p-6 min-h-[calc(100vh-3.5rem)]">
          {children}
        </main>
      </div>
    </div>
  );
}
