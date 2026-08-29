#!/bin/bash
# ============================================================
# AI Life OS · 一键部署脚本
# 推送代码到 GitHub（Vercel 部署在网页操作）
# ============================================================
set -e

cd "$(dirname "$0")/.."
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}→ 检查 git 配置...${NC}"
if [ -z "$(git config --global user.name 2>/dev/null)" ]; then
  echo "首次使用：请输入 git 用户信息（只输一次）"
  read -p "  GitHub 用户名: " GIT_NAME
  read -p "  GitHub 邮箱:   " GIT_EMAIL
  git config --global user.name "$GIT_NAME"
  git config --global user.email "$GIT_EMAIL"
fi

echo -e "${YELLOW}→ 初始化 git（如果还没）...${NC}"
if [ ! -d .git ]; then
  git init
  git branch -M main
fi

echo -e "${YELLOW}→ 配置远程仓库...${NC}"
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/ichi010623-maker/ai-life-os.git

echo -e "${YELLOW}→ 添加并提交...${NC}"
git add .
git commit -m "feat: AI Life OS MVP — Next.js 15 + Supabase + Gemini + PWA" || echo "(无新文件需要提交)"

echo -e "${YELLOW}→ 推送到 GitHub...${NC}"
git push -u origin main --force

echo ""
echo -e "${GREEN}✓ 代码已推送到 GitHub${NC}"
echo ""
echo "下一步："
echo "  1. 打开 https://vercel.com/new"
echo "  2. 选 'Import Git Repository' → 选 ichi010623-maker/ai-life-os"
echo "  3. 在 Environment Variables 添加 3 条凭证（见 README）"
echo "  4. 点 Deploy"
