# 单词热 (WordHeat) - 微信小程序

> 🎓 专为中小学生打造的课标同步背单词小程序

<p align="center">
  <img src="https://img.shields.io/badge/Platform-WeChat%20Mini%20Program-brightgreen" alt="Platform">
  <img src="https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-blue" alt="Backend">
  <img src="https://img.shields.io/badge/Database-SQLite%20%2F%20MySQL-orange" alt="Database">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">
</p>

---

## 📖 项目介绍

**单词热**是一款面向中国中小学生的小程序英语学习应用，专注于提供与课标同步的单词学习体验。我们采用科学的艾宾浩斯记忆曲线算法，结合游戏化的学习方式，让背单词变得轻松有趣。

### ✨ 核心优势

- 📚 **课标同步** - 紧密跟随人教版PEP等主流教材
- 🧠 **科学记忆** - 基于艾宾浩斯遗忘曲线的智能复习
- 🎮 **趣味学习** - 闯关模式、打卡挑战、成就系统
- 📊 **数据可视** - 家长报告、学习统计、记忆曲线
- 🎙️ **语音支持** - 真人发音、跟读练习

---

## 🚀 功能列表

### 学习功能
- [x] 📖 单词学习（艾宾浩斯复习算法）
- [x] 🎯 选择题练习
- [x] 🔊 真人发音（TTS）
- [x] 📝 错题本
- [x] ⭐ 单词收藏

### 游戏化功能
- [x] 📅 每日打卡
- [x] 🔥 连续打卡奖励
- [x] 🏆 学习成就
- [x] 💰 金币系统

### 家长功能
- [x] 👨‍👩‍👧 学习报告
- [x] 📈 学习进度追踪
- [x] 📊 记忆曲线分析
- [x] 👀 错题监控

### 会员功能
- [x] 💎 VIP会员（月度/季度/年度）
- [x] 💳 微信支付
- [x] 🎁 会员专属内容

---

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端** | 微信小程序原生 | WXML + WXSS + JavaScript |
| **后端** | NestJS + TypeScript | 模块化、TypeSafe RESTful API |
| **数据库** | SQLite / MySQL | Prisma ORM，开发/生产灵活切换 |
| **缓存** | Redis（预留） | 会话、验证码缓存 |
| **支付** | 微信支付 | 小程序支付集成 |
| **测试** | Jest + Supertest | 单元测试、E2E测试 |
| **部署** | Docker + PM2 | 容器化、进程管理 |

---

## 📁 项目结构

```
单词热/
├── 📱 frontend/              # 小程序前端
│   ├── pages/               # 页面代码
│   ├── components/         # 组件
│   ├── utils/              # 工具函数
│   └── images/             # 静态图片
│
├── ⚙️ backend/               # NestJS 后端
│   ├── src/
│   │   ├── main.ts         # 应用入口
│   │   ├── app.module.ts   # 根模块
│   │   ├── common/         # 公共模块（Guards、Filters）
│   │   └── modules/        # 业务模块
│   │       ├── auth/       # 认证
│   │       ├── users/      # 用户
│   │       ├── words/      # 单词学习
│   │       ├── wordbank/   # 词库管理
│   │       ├── checkin/    # 打卡
│   │       ├── reports/    # 学习报告
│   │       ├── payment/    # 支付
│   │       └── tts/        # 语音
│   ├── test/               # E2E测试
│   ├── prisma/             # 数据库Schema
│   └── package.json
│
├── 🗄️ database/              # 数据库
│   ├── schema.sql          # 表结构
│   ├── mock_data.sql       # 测试数据
│   └── scripts/            # 数据导入脚本
│
├── 🐳 docker-compose.yml     # Docker配置
└── 📖 README.md              # 本文件
```

---

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- 微信开发者工具
- Docker（可选，用于本地开发）

### 1. 克隆项目

```bash
git clone https://github.com/yourusername/wordheat.git
cd wordheat
```

### 2. 启动后端服务 (NestJS)

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库和微信参数

# 启动开发服务器
npm run start:dev

# 或使用 Docker
cd ..
docker-compose up -d
```

**NestJS 特性：**
- 📝 TypeScript 类型安全
- 📚 访问 Swagger 文档: http://localhost:3000/api/docs
- 🧪 E2E 测试: `npm run test:e2e`

### 3. 导入测试数据

```bash
# SQLite（开发环境）
sqlite3 wordheat.db < database/mock_data.sql

# MySQL（生产环境）
mysql -u root -p wordheat < database/schema.sql
mysql -u root -p wordheat < database/mock_data.sql
```

### 4. 运行小程序

1. 打开微信开发者工具
2. 选择「导入项目」
3. 选择 `frontend` 目录
4. 填写你的小程序 AppID
5. 点击「编译」

### 5. 运行测试

```bash
cd backend

# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 监视模式运行测试
npm run test:watch
```

---

## ⚙️ 环境变量配置

复制 `.env.example` 到 `.env` 并根据环境配置：

```bash
# 应用配置
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-key

# 数据库配置（双模式支持）
# SQLite（开发环境）
DB_TYPE=sqlite
SQLITE_PATH=./wordheat.db

# MySQL（生产环境）
# DB_TYPE=mysql
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=your-password
# DB_NAME=wordheat

# 微信小程序配置
WX_APPID=your-wx-appid
WX_SECRET=your-wx-secret

# 微信支付配置
WX_MCH_ID=your-mch-id
WX_API_KEY=your-api-key
WX_NOTIFY_URL=https://your-domain.com/api/v1/payment/notify

# TTS配置（可选）
TTS_APP_ID=your-tts-appid
TTS_API_KEY=your-tts-apikey
```

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| [API文档](./docs/API文档.md) | RESTful API 详细文档 |
| [部署指南](./docs/DEPLOY.md) | 生产环境部署步骤 |
| [架构设计](./docs/ARCHITECTURE_V2.md) | 系统架构设计文档 |
| [产品需求](./docs/PRD.md) | 产品需求文档 |

---

## 🧪 测试覆盖

| 模块 | 状态 | 覆盖率 |
|------|------|--------|
| 认证模块 | ✅ | 95% |
| 用户模块 | ✅ | 90% |
| 单词学习 | ✅ | 88% |
| 词库管理 | ✅ | 85% |
| 打卡系统 | ✅ | 92% |
| 支付系统 | ✅ | 80% |
| TTS服务 | ✅ | 75% |

---

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

---

## 📄 许可证

[MIT](LICENSE) © 2026 单词热团队

---

<p align="center">
  Made with ❤️ for students learning English
</p>
