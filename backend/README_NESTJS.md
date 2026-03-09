# 单词热后端 - NestJS 版本

基于 NestJS + TypeScript + Prisma 重构的单词热小程序后端服务。

## 🚀 技术栈

- **框架**: NestJS 10.x
- **语言**: TypeScript 5.x
- **ORM**: Prisma 5.x
- **数据库**: MySQL 8.x / SQLite (开发模式)
- **认证**: JWT + Passport
- **文档**: Swagger/OpenAPI
- **测试**: Jest
- **验证**: class-validator + class-transformer

## 📁 项目结构

```
nestjs-backend/
├── prisma/                    # Prisma 配置
│   ├── schema.prisma         # 数据库模型定义
│   └── seed.ts               # 种子数据
├── src/
│   ├── main.ts               # 应用入口
│   ├── app.module.ts         # 根模块
│   ├── app.controller.ts     # 健康检查
│   ├── app.service.ts
│   ├── common/               # 公共模块
│   │   ├── decorators/       # 装饰器
│   │   ├── filters/          # 异常过滤器
│   │   ├── guards/           # 守卫
│   │   ├── interceptors/     # 拦截器
│   │   └── strategies/       # 认证策略
│   ├── database/             # 数据库模块
│   │   ├── database.module.ts
│   │   └── prisma.service.ts
│   └── modules/              # 业务模块
│       ├── auth/             # 认证模块
│       ├── users/            # 用户模块
│       ├── words/            # 单词学习模块
│       ├── wordbank/         # 词库模块
│       ├── checkin/          # 打卡模块
│       ├── orders/           # 订单模块
│       ├── payment/          # 支付模块
│       ├── reports/          # 学习报告模块
│       └── tts/              # TTS语音模块
├── test/                     # 测试文件
├── package.json
├── tsconfig.json
└── nest-cli.json
```

## 📋 API 模块列表

| 模块 | 路径 | 说明 |
|------|------|------|
| 认证 | `/api/v1/auth` | 微信登录、手机号登录、验证码 |
| 用户 | `/api/v1/users` | 用户信息、统计、进度 |
| 单词学习 | `/api/v1/words` | 今日任务、提交答案 |
| 词库 | `/api/v1/wordbank` | 单词查询、搜索、年级单元 |
| 打卡 | `/api/v1/checkin` | 每日打卡、奖励 |
| 订单 | `/api/v1/orders` | 创建订单、查询订单 |
| 支付 | `/api/v1/payment` | 微信支付、回调 |
| 学习报告 | `/api/v1/reports` | 统计、日历、错题本 |
| TTS语音 | `/api/v1/tts` | 单词音频、批量生成 |

## 🛠️ 快速开始

### 1. 安装依赖

```bash
cd nestjs-backend
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库和JWT密钥
```

### 3. 初始化数据库

**MySQL 模式:**
```bash
# 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS wordheat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 生成Prisma客户端
npx prisma generate

# 执行数据库迁移
npx prisma migrate dev --name init
```

**SQLite 模式 (开发推荐):**
```bash
# 设置环境变量
export USE_SQLITE=true
export SQLITE_PATH=./wordheat.sqlite

# 生成Prisma客户端 (使用SQLite provider)
# 需要先修改 prisma/schema.prisma 中的 provider
npx prisma generate

# 执行迁移
npx prisma migrate dev --name init
```

### 4. 启动开发服务器

```bash
npm run start:dev
```

服务启动后：
- API: http://localhost:3000/api/v1
- 文档: http://localhost:3000/api/docs
- 健康检查: http://localhost:3000/health

### 5. 运行测试

```bash
# 单元测试
npm test

# 测试覆盖率
npm run test:cov

# E2E测试
npm run test:e2e
```

## 📦 生产部署

### 1. 构建

```bash
npm run build
```

### 2. 生产环境变量

```bash
NODE_ENV=production
PORT=3000

# 数据库 - MySQL
DB_HOST=your-mysql-host
DB_PORT=3306
DB_USER=your-db-user
DB_PASSWORD=your-db-password
DB_NAME=wordheat

# JWT配置
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# 微信小程序
WX_APPID=your-wx-appid
WX_SECRET=your-wx-secret

# 微信支付
WX_MCH_ID=your-mch-id
WX_API_KEY=your-api-key
WX_NOTIFY_URL=https://api.yourdomain.com/api/v1/payment/notify
```

### 3. 数据库迁移

```bash
npx prisma migrate deploy
```

### 4. 启动服务

```bash
npm run start:prod
```

## 🔐 认证说明

所有需要认证的接口都需要在请求头中携带 JWT Token：

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

获取 Token 的方式：
1. 调用 `/api/v1/auth/wx-login` 微信登录
2. 调用 `/api/v1/auth/phone-login` 手机号登录
3. 调用 `/api/v1/auth/verify-code-login` 验证码登录

## 📝 与 Express 版本的主要差异

| 特性 | Express | NestJS |
|------|---------|--------|
| 语言 | JavaScript | TypeScript |
| 架构 | 函数式 | 面向对象 + 依赖注入 |
| 路由 | express.Router | 装饰器 + Controller |
| 认证 | 自定义中间件 | JWT Guard + Strategy |
| 数据库 | mysql2 + sqlite3 | Prisma ORM |
| 验证 | 手动验证 | class-validator |
| 错误处理 | 中间件 | Exception Filter |
| API文档 | 手动维护 | Swagger自动生成 |
| 测试 | Jest + Supertest | NestJS内置测试工具 |

## 🔄 迁移检查清单

- [x] TypeScript 类型定义
- [x] NestJS 模块结构
- [x] Prisma ORM 配置
- [x] JWT Guard + Strategy 认证
- [x] Exception Filter 错误处理
- [x] Swagger API文档
- [x] Jest 测试框架
- [x] class-validator 验证
- [x] SQLite + MySQL 双模式
- [x] API 路径兼容 `/api/v1/*`

## 🔗 与原有前端兼容

NestJS 版本保持 API 路径和响应格式与 Express 版本一致：

- 所有接口返回 `{ success: boolean, data: any }` 格式
- 错误返回 `{ success: false, message: string, code: string }`
- API 前缀保持 `/api/v1`

原有小程序前端无需修改即可接入 NestJS 后端。

## 📚 相关文档

- [NestJS 官方文档](https://docs.nestjs.com/)
- [Prisma 官方文档](https://www.prisma.io/docs/)
- [Swagger OpenAPI](https://swagger.io/specification/)

## 📄 License

MIT