import type { Metadata } from 'next';
import './globals.css';
import { ClientLayout } from './client-layout';

export const metadata: Metadata = {
  title: {
    default: 'Quantum Talent | 量子人才业务控制台',
    template: '%s | Quantum Talent',
  },
  description: '量子科技领域人才招聘业务控制台 — 岗位管理、公开运营、人才获取、招聘推进、数据沉淀',
  keywords: ['量子人才', '招聘', '猎头', 'Quantum Talent', '人才管理'],
  authors: [{ name: 'Quantum Talent Team' }],
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
