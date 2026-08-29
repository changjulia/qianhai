import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '黔海 Global Growth OS',
  description: 'AI 驱动的产业出海内容增长平台',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
