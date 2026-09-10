"use client";

import { useState } from "react";
import { User, Bell, Shield, Info, Check } from "lucide-react";

const TABS = [
  { id: "profile", label: "个人资料", icon: User },
  { id: "notifications", label: "通知设置", icon: Bell },
  { id: "security", label: "安全设置", icon: Shield },
  { id: "about", label: "关于系统", icon: Info },
];

function TabContent({ tab, saved, onSave }: { tab: string; saved: boolean; onSave: () => void }) {
  switch (tab) {
    case "profile":
      return (
        <div className="space-y-6">
          <div><label className="block text-sm font-medium text-foreground mb-1">姓名</label><input type="text" defaultValue="张猎头" className="w-full max-w-sm bg-muted border-none rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
          <div><label className="block text-sm font-medium text-foreground mb-1">邮箱</label><input type="email" defaultValue="zhang@quantum-hr.com" className="w-full max-w-sm bg-muted border-none rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
          <div><label className="block text-sm font-medium text-foreground mb-1">手机</label><input type="tel" defaultValue="138xxxx8888" className="w-full max-w-sm bg-muted border-none rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
          <div><label className="block text-sm font-medium text-foreground mb-1">职位</label><input type="text" defaultValue="高级猎头顾问" className="w-full max-w-sm bg-muted border-none rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
          <button onClick={onSave} className="bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-all inline-flex items-center gap-2">{saved ? <><Check className="w-3.5 h-3.5" />已保存</> : "保存修改"}</button>
        </div>
      );
    case "notifications":
      return (
        <div className="space-y-4">
          {["新投递通知", "候选人状态变更", "每日数据汇总", "系统公告"].map(item => (
            <div key={item} className="flex items-center justify-between max-w-sm py-2">
              <span className="text-sm text-foreground">{item}</span>
              <button className="w-10 h-5 rounded-full bg-muted relative transition-colors hover:bg-accent"><span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-primary" /></button>
            </div>
          ))}
        </div>
      );
    case "security":
      return (
        <div className="space-y-4 max-w-sm">
          <div><label className="block text-sm font-medium text-foreground mb-1">当前密码</label><input type="password" className="w-full bg-muted border-none rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
          <div><label className="block text-sm font-medium text-foreground mb-1">新密码</label><input type="password" className="w-full bg-muted border-none rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
          <div><label className="block text-sm font-medium text-foreground mb-1">确认新密码</label><input type="password" className="w-full bg-muted border-none rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
          <button className="bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-all">更新密码</button>
        </div>
      );
    case "about":
      return (
        <div className="space-y-3 text-sm">
          <div className="flex"><span className="text-muted-foreground w-24">系统名称：</span><span className="text-foreground font-medium">量子人才招聘中台</span></div>
          <div className="flex"><span className="text-muted-foreground w-24">版本号：</span><span className="text-foreground font-medium">v1.0.0-beta</span></div>
          <div className="flex"><span className="text-muted-foreground w-24">技术栈：</span><span className="text-foreground font-medium">Next.js 16 + React 19 + Tailwind CSS</span></div>
          <div className="flex"><span className="text-muted-foreground w-24">数据库：</span><span className="text-foreground font-medium">Supabase</span></div>
        </div>
      );
    default:
      return null;
  }
}

export default function SettingsPage() {
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="flex-1 min-w-0 overflow-y-auto bg-background p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">系统设置</h1>
        <p className="text-sm text-muted-foreground mt-1">管理个人信息、通知偏好与安全设置</p>
      </div>
      <div className="flex gap-6">
        <div className="w-48 shrink-0">
          <div className="bg-card rounded-lg shadow-card p-1.5 flex flex-col gap-0.5">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all text-left ${tab === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <t.icon className="w-4 h-4" />{t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 bg-card rounded-lg shadow-card p-6 max-w-xl">
          <TabContent tab={tab} saved={saved} onSave={handleSave} />
        </div>
      </div>
    </div>
  );
}
