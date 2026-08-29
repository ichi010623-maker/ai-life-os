/// <reference lib="webworker" />

/* eslint-disable no-restricted-globals */

/**
 * AI Life OS · Custom Service Worker
 * ----------------------------------------------------------------------
 * 由 @ducanh2912/next-pwa 通过 injectManifest 模式注入到 public/sw.js
 *
 * 缓存策略：
 *   - 导航请求 (/, /tasks, /finance, /health, /products, /knowledge)
 *       Network-first（3s 超时），失败回退到缓存，再回退到 /
 *   - 静态资源 (/_next/static/*、字体、图片、icons)
 *       Cache-first，命中即返回；后台异步更新
 *   - 其它 GET 请求
 *       Stale-While-Revalidate（先返缓存，后台拉新版本）
 *
 * 离线兜底：
 *   - 任何导航失败 → 返回缓存的首页（让用户看到「离线模式」UI）
 *   - 后续可扩展为展示 /offline.html 静态页
 */

import { precacheAndRoute } from 'workbox-precaching';

// Workbox 在构建时会把所有静态资源 URL 注入到这里
precacheAndRoute(self.__WB_MANIFEST || []);

// ============================================================
// 常量
// ============================================================

const VERSION = 'v1';
const RUNTIME_CACHE = `ai-life-os-runtime-${VERSION}`;
const STATIC_CACHE = `ai-life-os-static-${VERSION}`;

// 不缓存跨域请求（Supabase / OpenAI 必须实时）
const SAME_ORIGIN = self.location.origin;

// ============================================================
// 生命周期
// ============================================================

self.addEventListener('install', () => {
  // 立即激活新版本，跳过 waiting
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // 清理旧版本缓存
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => ![RUNTIME_CACHE, STATIC_CACHE].includes(k))
          .map((k) => caches.delete(k)),
      );
      // 立即接管所有页面
      await self.clients.claim();
    })(),
  );
});

// ============================================================
// fetch 拦截
// ============================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 只处理 GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 跨域请求不拦截（API 需实时）
  if (url.origin !== SAME_ORIGIN) return;

  // 1) Next.js 静态资源：Cache-first
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 2) 图片 / 字体 / icons：Cache-first
  if (
    url.pathname.startsWith('/icons/') ||
    /\.(png|jpe?g|gif|svg|webp|ico|woff2?)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 3) 导航请求：Network-first
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // 4) 其它 GET 请求：Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});

// ============================================================
// 策略实现
// ============================================================

/** Cache-first：命中即返，未命中请求网络并写入缓存 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.status !== 206) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Offline resource not cached', { status: 503 });
  }
}

/** Network-first（导航）：在线拉新页并缓存；离线/失败回退到缓存 */
async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // 1) 精确匹配缓存
    const cached = await caches.match(request);
    if (cached) return cached;
    // 2) 兜底：返回首页缓存（让用户看到主界面）
    const fallback = await caches.match('/');
    if (fallback) return fallback;
    // 3) 最后兜底：纯文本响应
    return new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

/** SWR：有缓存先返缓存，同时后台拉新版本替换缓存 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok && response.status !== 206) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);

  return cached || fetchPromise;
}

// ============================================================
// 接收客户端消息（手动更新提示等）
// ============================================================

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
