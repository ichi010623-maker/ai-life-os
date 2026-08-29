#!/bin/bash
# ============================================================
# AI Life OS · 一键部署脚本（v2 改进）
# ============================================================
set -e
cd "$(dirname "$0")/.."

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
RED='\033[0;31m'
NC='\033[0m'

REPO_URL="https://github.com/ichi010623-maker/ai-life-os.git"

echo -e "${CYAN}━━━ AI Life OS · 部署脚本 v2 ━━━${NC}"

# ─── 检查 gh CLI（推荐路径） ─────────────────────────
if command -v gh &> /dev/null && gh auth status &> /dev/null 2>&1; then
  echo -e "${GREEN}✓ 检测到 gh CLI 已登录，将自动鉴权${NC}"
  USE_GH=1
else
  USE_GH=0
  # 检查 git 全局配置
  if [ -z "$(git config --global user.name 2>/dev/null)" ]; then
    echo "首次使用：请输入 git 用户信息"
    read -p "  GitHub 用户名: " GIT_NAME
    read -p "  GitHub 邮箱:   " GIT_EMAIL
    git config --global user.name "$GIT_NAME"
    git config --global user.email "$GIT_EMAIL"
  fi
fi

echo -e "${YELLOW}→ 初始化 git...${NC}"
[ ! -d .git ] && git init && git branch -M main

echo -e "${YELLOW}→ 配置远程仓库...${NC}"
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

echo -e "${YELLOW}→ 添加并提交...${NC}"
git add .
git commit -m "feat: AI Life OS MVP — Next.js 15 + Supabase + Gemini + PWA" 2>/dev/null \
  || echo "(无新文件需要提交)"

echo -e "${YELLOW}→ 推送到 GitHub...${NC}"

if [ "$USE_GH" = "1" ]; then
  # 使用 gh CLI，自动处理鉴权
  gh auth setup-git 2>/dev/null
  git push -u origin main --force
else
  echo ""
  echo -e "${CYAN}┌─────────────────────────────────────────────────┐${NC}"
  echo -e "${CYAN}│  ⚠️  接下来会弹出鉴权提示，请按下面输入：              │${NC}"
  echo -e "${CYAN}│                                                    │${NC}"
  echo -e "${CYAN}│  Username:  ichi010623-maker      （只填用户名）    │${NC}"
  echo -e "${CYAN}│  Password:  ghp_xxxx...          （粘贴 PAT，不是密码）│${NC}"
  echo -e "${CYAN}│                                                    │${NC}"
  echo -e "${CYAN}│  💡 PAT 在 https://github.com/settings/tokens/new   │${NC}"
  echo -e "${CYAN}│     生成，勾选 repo 即可                            │${NC}"
  echo -e "${CYAN}└─────────────────────────────────────────────────┘${NC}"
  echo ""
  git push -u origin main --force
fi

echo ""
echo -e "${GREEN}✓ 代码已推送到 GitHub${NC}"
echo ""
echo -e "${CYAN}━━━ 下一步：Vercel 部署 ━━━${NC}"
echo "  1. 打开 https://vercel.com/new"
echo "  2. Import 'ichi010623-maker/ai-life-os'"
echo "  3. 在 Environment Variables 添加 3 条凭证（见 README）"
echo "  4. 点 Deploy"
