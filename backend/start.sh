#!/bin/bash

# 单词热 NestJS 后端快速启动脚本

set -e

echo "🚀 单词热 NestJS 后端启动脚本"
echo "================================"

# 检查 Node.js 版本
echo "📋 检查环境..."
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 18 ]; then
    echo "❌ 需要 Node.js 18+，当前版本: $(node -v)"
    exit 1
fi
echo "✅ Node.js 版本: $(node -v)"

# 检查是否安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚙️  创建环境配置文件..."
    cp .env.example .env
    echo "📝 请编辑 .env 文件配置数据库连接"
fi

# 生成 Prisma 客户端
echo "🔧 生成 Prisma 客户端..."
npx prisma generate

# 检查数据库是否需要迁移
if [ "$1" == "--init-db" ]; then
    echo "🗄️  执行数据库迁移..."
    npx prisma migrate dev --name init
    
    echo "🌱 导入种子数据..."
    npx prisma db seed
fi

# 启动开发服务器
echo "🚀 启动开发服务器..."
echo ""
echo "服务启动后访问:"
echo "  - API文档: http://localhost:3000/api/docs"
echo "  - 健康检查: http://localhost:3000/health"
echo ""

npm run start:dev
