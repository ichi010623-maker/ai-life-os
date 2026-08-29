import type { Metadata, Viewport } from 'next';
import './globals.css';

/**
 * AI Life OS · Root Layout
 * ----------------------------------------------------------------------
 * 提供 html / body 骨架与 PWA 所需的全局元数据：
 *   - iOS Standalone 模式（appleWebApp.capable + statusBarStyle）
 *   - 灵动岛 / 刘海屏适配（viewportFit: 'cover'）
 *   - 防止双击放大（maximumScale: 1 + userScalable: false）
 *   - themeColor 与 background 与 manifest 对齐（#09090b）
 */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#09090b',
};

export const metadata: Metadata = {
  title: {
    default: 'AI Life OS',
    template: '%s · AI Life OS',
  },
  description: '个人专属 AI 全局操作系统 · 任务 / 财务 / 产品 / 健康 / 知识',
  applicationName: 'Life OS',
  authors: [{ name: 'AI Life OS' }],
  keywords: ['PWA', 'Life OS', 'Tasks', 'Finance', 'Health', 'Productivity'],

  // iOS Web App 配置
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Life OS',
    startupImage: [
      // 可选：iOS 启动图，建议 1170×2532 / 1179×2556 等机型尺寸
      // { url: '/splash/apple-splash-1170-2532.png', media: '(device-width: 390px) and (device-height: 844px)' },
    ],
  },

  // 图标
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },

  // 防止 iOS Safari 自动识别电话 / 邮箱 / 地址
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },

  // Android Chrome
  other: {
    'mobile-web-app-capable': 'yes',
  },

  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
