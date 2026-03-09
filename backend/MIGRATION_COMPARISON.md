# Express → NestJS 迁移对比文档

## 概述

本文档对比了单词热后端从 Express (JavaScript) 到 NestJS (TypeScript) 的迁移变化。

## 📊 架构对比

### Express (原版本)

```
backend/
├── src/
│   ├── app.js              # Express 应用入口
│   ├── db.js               # 数据库连接 (mysql2 + sqlite3)
│   ├── routes/
│   │   ├── auth.js         # 路由处理器 (函数式)
│   │   ├── users.js
│   │   ├── words.js
│   │   └── ...
│   ├── middleware/
│   │   ├── auth.js         # 认证中间件
│   │   └── error.js        # 错误处理中间件
│   ├── utils/
│   │   ├── algorithm.js    # 工具函数
│   │   └── cache.js
│   └── services/
│       └── tts.js          # TTS服务
└── __tests__/              # Jest 测试
```

### NestJS (新版本)

```
nestjs-backend/
├── src/
│   ├── main.ts             # 应用入口
│   ├── app.module.ts       # 根模块
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── common/             # 公共模块
│   │   ├── decorators/     # 装饰器
│   │   ├── filters/        # 异常过滤器
│   │   ├── guards/         # 守卫
│   │   └── strategies/     # 策略
│   ├── database/           # 数据库模块
│   │   ├── database.module.ts
│   │   └── prisma.service.ts
│   └── modules/            # 业务模块
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   └── dto/
│       ├── users/
│       ├── words/
│       └── ...
├── prisma/
│   └── schema.prisma       # Prisma 模型定义
└── test/                   # E2E 测试
```

## 🔑 核心差异对比

| 特性 | Express | NestJS | 说明 |
|------|---------|--------|------|
| **语言** | JavaScript | TypeScript | 类型安全、更好的IDE支持 |
| **架构** | 函数式 | 面向对象 + DI | 模块化、可测试性高 |
| **路由** | `router.get('/', handler)` | `@Get() decorator` | 装饰器更直观 |
| **依赖管理** | `require()` | `import + DI` | 依赖注入解耦 |
| **认证** | 中间件 `authenticate` | JWT Guard + Strategy | 声明式安全 |
| **数据库** | 原生 SQL (mysql2) | Prisma ORM | 类型安全、迁移管理 |
| **验证** | 手动验证 | class-validator | DTO 自动验证 |
| **错误处理** | 中间件 | Exception Filter | 统一的错误格式 |
| **API文档** | 手动维护 | Swagger 自动生成 | 代码即文档 |
| **配置管理** | `process.env` | ConfigModule | 结构化配置 |

## 📝 代码示例对比

### 1. 路由定义

**Express:**
```javascript
// routes/users.js
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

router.get('/info', authenticate, async (req, res) => {
  const userId = req.user.id;
  // ...
  res.json({ success: true, data: user });
});

module.exports = router;
```

**NestJS:**
```typescript
// modules/users/users.controller.ts
@Controller('users')
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('info')
  @ApiOperation({ summary: '获取用户信息' })
  async getUserInfo(@CurrentUser('id') userId: number) {
    const data = await this.usersService.getUserInfo(userId);
    return { success: true, data };
  }
}
```

### 2. 数据库查询

**Express:**
```javascript
// 原生 SQL
const [users] = await db.query(
  'SELECT * FROM users WHERE id = ?',
  [userId]
);
```

**NestJS:**
```typescript
// Prisma ORM
const user = await this.prisma.user.findUnique({
  where: { id: userId },
  select: { id: true, nickname: true, ... }
});
```

### 3. 认证

**Express:**
```javascript
// middleware/auth.js
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.substring(7);
  const decoded = jwt.verify(token, secret);
  const [users] = await db.query('SELECT * FROM users WHERE id = ?', [decoded.userId]);
  req.user = users[0];
  next();
};
```

**NestJS:**
```typescript
// guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.substring(7);
    const decoded = this.jwtService.verify(token);
    const user = await this.prisma.user.findUnique({ where: { id: decoded.userId } });
    request.user = user;
    return true;
  }
}
```

### 4. 错误处理

**Express:**
```javascript
// middleware/error.js
const errorHandler = (err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message,
    code: err.code
  });
};
```

**NestJS:**
```typescript
// filters/http-exception.filter.ts
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    response.status(exception.statusCode || 500).json({
      success: false,
      message: exception.message,
      code: exception.code
    });
  }
}
```

## 🔄 数据模型对比

### Express (手动管理)
```sql
-- schema.sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openid VARCHAR(100) UNIQUE,
  nickname VARCHAR(100),
  ...
);
```

### NestJS (Prisma Schema)
```prisma
// schema.prisma
model User {
  id        Int      @id @default(autoincrement())
  openid    String   @unique
  nickname  String   @default("")
  
  learningRecords LearningRecord[]
  @@map("users")
}
```

## 📈 迁移收益

### 1. 类型安全
- TypeScript 编译时类型检查
- Prisma 自动生成类型定义
- DTO 参数验证

### 2. 可维护性
- 模块化架构，职责清晰
- 依赖注入便于测试
- 装饰器声明式编程

### 3. 开发效率
- Swagger 自动生成 API 文档
- Prisma Studio 数据库管理
- NestJS CLI 代码生成

### 4. 企业级特性
- 内置日志、验证、缓存
- 微服务支持
- GraphQL 支持

## 📋 迁移工作量

| 任务 | 工作量 | 说明 |
|------|--------|------|
| 项目初始化 | 1h | package.json, tsconfig, nest-cli |
| 数据库迁移 | 2h | Prisma schema, service |
| 模块迁移 (9个) | 6h | Controller + Service + DTO |
| 公共模块 | 2h | Guards, Filters, Decorators |
| 测试迁移 | 1h | Jest 配置, spec 文件 |
| 文档编写 | 1h | README, API 文档 |
| **总计** | **13h** | 约 1.5 个工作日 |

## ⚠️ 注意事项

### API 兼容性
- 保持原有响应格式 `{ success, data }`
- 保持原有错误格式 `{ success: false, message, code }`
- 保持 `/api/v1/*` 路径前缀

### 数据库兼容
- Prisma 迁移需要导入原有数据
- SQLite 开发模式需要修改 provider

### 环境变量
- Express: `dotenv.config()`
- NestJS: `ConfigModule.forRoot()`

## 🎯 建议

1. **新项目**: 直接使用 NestJS
2. **存量项目**: 逐步迁移（按模块）
3. **团队规模**: 3+ 人推荐 NestJS
4. **项目规模**: 中型以上推荐 NestJS

## 🔗 参考

- [NestJS 官方文档](https://docs.nestjs.com/)
- [Prisma 迁移指南](https://www.prisma.io/docs/guides/migrate)
- [Express to NestJS 迁移案例](https://)