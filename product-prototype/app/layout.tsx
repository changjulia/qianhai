import type { Metadata } from 'next';
import './globals.css';
import './workflows.css';
import './agent-entry.css';
import './agent-desk.css';
import './content-simple.css';
import './auto-workflow.css';
import './task-card-visuals.css';
import './delivery-create.css';
import './campaign-header.css';
import './workflow-context.css';
import './dimension-filter.css';
import './schedule-simple.css';
import './lingshu-live.css';
import './ui-unification.css';
import './onboarding.css';

export const metadata: Metadata = {
  title: '黔海 Global Growth OS',
  description: 'AI 驱动的产业出海内容增长平台',
  icons: { icon: '/favicon.svg', shortcut: '/favicon.svg' },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
