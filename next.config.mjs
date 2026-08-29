import withPWAInit from '@ducanh2912/next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 允许从 Supabase Storage / 公开资源 加载远程图片
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },

  // PWA + Server Action 在某些版本的 Next.js 上需要显声明
  experimental: {
    // 启用 typedRoutes（可选，路由类型补全）
    // typedRoutes: true,
  },

  // 避免在开发模式下 SW 缓存干扰 HMR
  // （disable 由 PWA 插件处理）
};

const withPWA = withPWAInit({
  // 产物输出目录（默认 public）
  dest: 'public',

  // 自定义 Service Worker 源文件 + 输出位置
  swSrc: 'public/sw-custom.js',
  swDest: 'public/sw.js',

  // 开发环境禁用 PWA（避免 HMR 缓存导致更新不及时）
  disable: process.env.NODE_ENV === 'development',

  // 自动注册 SW
  register: true,

  // 新版本 SW 立即接管，不等待旧标签页关闭
  skipWaiting: true,

  // 前端导航时优先使用缓存（适合 SPA 风格）
  cacheOnFrontEndNav: true,

  // 激进的前端缓存（首屏更快）
  aggressiveFrontEndNavCaching: true,

  // 网络恢复后自动 reload
  reloadOnOnline: true,
});

export default withPWA(nextConfig);
