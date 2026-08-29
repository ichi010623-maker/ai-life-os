# AI Life OS

> 个人专属 AI 全局操作系统 · 任务 / 财务 / 产品 / 健康 / 知识 · PWA · 移动原生体验

一个用 Next.js 15 + Supabase + Vercel AI SDK 构建的个人 Life OS。⌘/Ctrl + K 唤起 QuickCapture，AI 自动归类到 5 大模块。

## ✨ 特性

- **⌘K Universal Quick Capture** — 一句话录入，自动分类到 Task / Finance / Food / Product / Knowledge
- **5 层嵌套任务树** — GOAL → STRATEGIC → PROJECT → TASK → SUBTASK
- **财富管理** — 月度预算建模、三大支出桶、阈值预警
- **产品研发看板** — 5 阶段 Kanban + 拖拽切换 + 关联任务与打样支出
- **健康冰箱 + AI 菜谱** — 保质期追踪、基于现有食材的 GPT 菜谱生成
- **Bento Dashboard** — 打开 App 第一秒纵览全局
- **PWA** — 添加到 iPhone 主屏幕，Standalone 模式离线可用

## 🚀 技术栈

- **框架**: Next.js 15 (App Router) + React 19 + TypeScript
- **样式**: Tailwind CSS + Shadcn UI 风格组件
- **数据库**: Supabase (Postgres + Auth + RLS)
- **AI**: Vercel AI SDK + Google Gemini 1.5 Flash（免费）（结构化输出）
- **PWA**: @ducanh2912/next-pwa（Workbox）+ 自定义 Service Worker
- **部署**: Vercel

## 📁 目录结构

```
ai-life-os/
├── app/                          # App Router
│   ├── (workspace)/             # 主工作台（Dashboard + 5 模块）
│   ├── api/quick-capture/       # 全局录入 API
│   ├── layout.tsx               # Root Layout（PWA meta）
│   ├── globals.css
│   └── manifest.ts              # （可选）原生 manifest
├── components/                   # UI 组件
│   ├── dashboard/               # Bento Dashboard + Knowledge
│   ├── finance/                 # 财务中心
│   ├── health/                  # 健康 + AI 菜谱
│   ├── layout/                  # QuickCapture
│   ├── products/                # 产品 Kanban
│   └── tasks/                   # 5 层任务树
├── actions/                      # Server Actions（5 模块 + dashboard + knowledge）
├── lib/supabase/                 # Supabase 客户端
├── types/index.ts                # TS 类型
├── supabase/migrations/          # SQL Schema
├── public/
│   ├── manifest.json             # PWA Manifest
│   ├── sw-custom.js              # 自定义 Service Worker
│   └── icons/                    # PWA 图标（需自行生成）
├── next.config.mjs               # Next.js + PWA 配置
├── vercel.json                   # Vercel 部署配置
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 🛠 本地开发

### 1. 安装依赖

```bash
npm install
# 或 pnpm install / yarn install
```

### 2. 配置环境变量

```bash
cp .env.example .env.local
```

填入：
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`（从 aistudio.google.com/apikey 免费拿，2025+ 格式为 AQ. 开头）

### 3. 初始化 Supabase

#### 方式 A：托管 Supabase Cloud（推荐）

1. 访问 [supabase.com/dashboard](https://supabase.com/dashboard)
2. New Project → 选区域（建议 `Singapore` 或 `Hong Kong`）
3. 等项目创建完（约 1-2 分钟）
4. 进入 SQL Editor → 粘贴 `supabase/migrations/0001_init.sql` 全文 → Run
5. 在 Settings → API 复制 URL 和 anon key 到 `.env.local`
6. 在 Settings → Authentication → Providers 启用 Email auth

#### 方式 B：本地 Supabase（Docker）

```bash
npx supabase init
npx supabase start
# 等容器起来后会自动打印 API URL + keys

# 应用 schema
npx supabase db reset
# （会执行 supabase/migrations/0001_init.sql）
```

### 4. 生成类型

```bash
# 替换 YOUR_PROJECT_ID 为你的 Supabase 项目 ID
npm run db:types
# 或手动：
supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/database.types.ts
```

### 5. 启动

```bash
npm run dev
# 打开 http://localhost:3000
```

## 🚢 部署到 Vercel

### 方式 A：GitHub 集成（推荐）

1. 把代码推送到 GitHub：
   ```bash
   git init
   git add .
   git commit -m "feat: AI Life OS MVP"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/ai-life-os.git
   git push -u origin main
   ```

2. 访问 [vercel.com/new](https://vercel.com/new)
3. Import Git Repository → 选你的 repo
4. Framework Preset 自动识别为 **Next.js**
5. 在 **Environment Variables** 添加：
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJ...
   GOOGLE_GENERATIVE_AI_API_KEY = AIzaSy...
   ```
6. 点 **Deploy**，约 1-2 分钟后会得到 `https://ai-life-os-xxx.vercel.app`

### 方式 B：Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
# 按提示添加环境变量
```

### 部署后必须做的事

1. **回填生产 URL**（影响 OG / canonical）：
   ```bash
   # 在 Vercel → Settings → Environment Variables
   NEXT_PUBLIC_APP_URL = https://your-domain.com
   ```

2. **绑定自定义域名**（可选）：
   - Vercel → Project Settings → Domains → 添加 `lifeos.yourdomain.com`
   - DNS 添加 CNAME 记录：`lifeos` → `cname.vercel-dns.com`

3. **生成 PWA 图标**（添加到主屏幕才会显示）：
   ```bash
   # 用 sharp 一键生成（需要源 logo SVG）
   mkdir -p public/icons
   npx sharp -i source-logo.svg -o public/icons/ \
     resize 192 192 -o icon-192.png \
     resize 512 512 -o icon-512.png \
     resize 512 512 --fit contain --padding 64 -o icon-512-maskable.png \
     resize 180 180 -o apple-touch-icon-180.png \
     resize 96 96 -o shortcut-capture.png
   ```

4. **测试 PWA**：
   - Chrome DevTools → Application → Manifest 检查无报错
   - Lighthouse → PWA 跑分（应 ≥ 90）
   - 真机 Safari → 分享 → 添加到主屏幕

## 📱 iPhone 添加到主屏幕

1. Safari 打开 `https://your-domain.com`
2. 点底部分享按钮 📤
3. **添加到主屏幕**
4. 主屏幕出现 Life OS 图标
5. 点击进入：全屏、无 Safari UI

> ⚠️ 必须 HTTPS。localhost 不行，需要真域名或 Vercel 临时域名。

## 🔒 安全 Checklist

- [x] 所有 5 张表启用 RLS（数据库 Schema 已包含）
- [x] `.env.local` 不进 git（.gitignore 已配）
- [x] Supabase service_role key 仅服务端使用（不暴露给客户端）
- [x] OpenAI API key 仅服务端使用
- [ ] 启用 Vercel 部署保护（按需）
- [ ] 启用 Supabase 2FA

## 📜 License

MIT
