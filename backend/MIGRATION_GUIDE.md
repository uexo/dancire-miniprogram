# Express → NestJS 迁移对比文档

## 迁移概述

| 项目 | Express 版本 | NestJS 版本 |
|------|-------------|-------------|
| **架构模式** | 函数式/中间件 | 模块化/面向对象 |
| **语言** | JavaScript | TypeScript |
| **依赖注入** | 手动 | 自动（装饰器） |
| **API 文档** | 手动维护 | Swagger 自动生成 |
| **路由定义** | `router.get('/path', handler)` | `@Get('path')` |
| **类型安全** | 无 | 完整类型支持 |

## 核心差异对比

### 1. 路由定义

**Express:**
```javascript
// routes/auth.js
const express = require('express');
const router = express.Router();

router.post('/wx-login', async (req, res) => {
  // 处理逻辑
  res.json({ success: true, data: {...} });
});

module.exports = router;

// app.js
app.use('/api/v1/auth', authRoutes);
```

**NestJS:**
```typescript
// auth.controller.ts
@Controller('api/v1/auth')
export class AuthController {
  @Post('wx-login')
  async wxLogin(@Body() dto: WxLoginDto) {
    return this.authService.wxLogin(dto);
  }
}

// auth.module.ts
@Module({
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
```

### 2. 认证守卫

**Express:**
```javascript
// middleware/auth.js
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: '未提供认证信息' });
  }
  // 验证逻辑...
  req.user = user;
  next();
};
```

**NestJS:**
```typescript
// jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    // 验证逻辑...
    request.user = user;
    return true;
  }
}

// 使用
@Get('profile')
@UseGuards(JwtAuthGuard)
getProfile(@CurrentUser() user: User) {
  return user;
}
```

### 3. 数据库访问

**Express 和 NestJS 保持一致：**

两者都使用相同的 `db.js` 模块：

```typescript
// NestJS
import { db } from '../../config/database.config';

@Injectable()
export class UsersService {
  async getUserInfo(userId: number) {
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    return users[0];
  }
}
```

### 4. 请求/响应处理

**Express:**
```javascript
router.get('/info', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserInfo(userId);
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});
```

**NestJS:**
```typescript
@Get('info')
@UseGuards(JwtAuthGuard)
async getUserInfo(@CurrentUser('id') userId: number) {
  return this.usersService.getUserInfo(userId);
}
```

### 5. 错误处理

**Express:**
```javascript
// middleware/error.js
const errorHandler = (err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || '服务器错误'
  });
};
```

**NestJS:**
```typescript
// http-exception.filter.ts
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    const status = exception.getStatus();
    response.status(status).json({
      success: false,
      message: exception.message
    });
  }
}
```

## API 路径对比

| 功能 | Express 路径 | NestJS 路径 | 变化 |
|------|-------------|-------------|------|
| 微信登录 | `POST /api/v1/auth/wx-login` | `POST /api/v1/auth/wx-login` | ❌ 无 |
| 获取用户信息 | `GET /api/v1/users/info` | `GET /api/v1/users/info` | ❌ 无 |
| 今日单词 | `GET /api/v1/words/today` | `GET /api/v1/words/today` | ❌ 无 |
| 提交答案 | `POST /api/v1/words/answer` | `POST /api/v1/words/answer` | ❌ 无 |
| 词库列表 | `GET /api/v1/wordbank/words` | `GET /api/v1/wordbank/words` | ❌ 无 |
| 今日打卡 | `POST /api/v1/checkin/today` | `POST /api/v1/checkin/today` | ❌ 无 |
| 学习报告 | `GET /api/v1/reports/stats` | `GET /api/v1/reports/stats` | ❌ 无 |
| 创建订单 | `POST /api/v1/payment/create` | `POST /api/v1/payment/create` | ❌ 无 |
| 支付回调 | `POST /api/v1/payment/notify` | `POST /api/v1/payment/notify` | ❌ 无 |

**所有 API 路径保持不变！** 前端小程序无需任何修改。

## 项目结构对比

### Express 结构
```
backend/src/
├── app.js
├── db.js
├── middleware/
│   ├── auth.js
│   └── error.js
├── routes/
│   ├── auth.js
│   ├── users.js
│   ├── words.js
│   ├── wordbank.js
│   ├── checkin.js
│   ├── orders.js
│   ├── payment.js
│   ├── reports.js
│   └── tts.js
├── services/
│   └── tts.js
└── utils/
    └── algorithm.js
```

### NestJS 结构
```
nestjs-backend/src/
├── main.ts
├── app.module.ts
├── config/
│   └── database.config.ts  # 包装 db.js
├── common/
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   ├── decorators/
│   │   └── current-user.decorator.ts
│   └── filters/
│       └── http-exception.filter.ts
└── modules/
    ├── auth/
    │   ├── auth.module.ts
    │   ├── auth.controller.ts
    │   ├── auth.service.ts
    │   └── dto/
    │       └── auth.dto.ts
    ├── users/
    ├── words/
    ├── wordbank/
    ├── checkin/
    ├── orders/
    ├── payment/
    ├── reports/
    └── tts/
```

## 依赖对比

### Express 依赖
```json
{
  "express": "^4.x",
  "cors": "^2.x",
  "morgan": "^1.x",
  "jsonwebtoken": "^9.x",
  "mysql2": "^3.x",
  "sqlite3": "^5.x",
  "dotenv": "^16.x"
}
```

### NestJS 依赖
```json
{
  "@nestjs/common": "^10.x",
  "@nestjs/core": "^10.x",
  "@nestjs/platform-express": "^10.x",
  "@nestjs/swagger": "^7.x",
  "@nestjs/config": "^3.x",
  "jsonwebtoken": "^9.x",
  "mysql2": "^3.x",
  "sqlite3": "^5.x",
  "class-validator": "^0.14.x",
  "class-transformer": "^0.5.x"
}
```

## 优势对比

| 特性 | Express | NestJS |
|------|---------|--------|
| 学习曲线 | 平缓 | 较陡 |
| 代码组织 | 自由 | 规范 |
| 类型安全 | 弱 | 强 |
| IDE 支持 | 一般 | 优秀 |
| 测试友好 | 需额外配置 | 内置支持 |
| 文档生成 | 手动 | 自动生成 |
| 依赖注入 | 无 | 内置 |
| 模块化 | 手动 | 原生支持 |
| 企业级功能 | 需额外实现 | 内置 |

## 迁移收益

1. **类型安全** - TypeScript 编译时检查减少运行时错误
2. **更好的 IDE 支持** - 代码提示、重构、导航
3. **自动生成 API 文档** - Swagger UI 可视化接口
4. **模块化架构** - 代码更易维护和扩展
5. **测试友好** - 依赖注入便于单元测试
6. **装饰器语法** - 声明式编程，代码更简洁
7. **企业级特性** - 拦截器、管道、守卫等

## 注意事项

1. **数据库层未改动** - 完全复用原有的 `db.js`
2. **API 路径保持一致** - 前端无需修改
3. **JWT 密钥保持一致** - 确保 token 兼容
4. **环境变量保持一致** - 复用原有配置
5. **业务逻辑保持一致** - 仅迁移代码结构

## 启动命令对比

| 操作 | Express | NestJS |
|------|---------|--------|
| 开发模式 | `npm start` | `npm run start:dev` |
| 生产构建 | 无 | `npm run build` |
| 生产启动 | `node src/app.js` | `npm run start:prod` |
| 运行测试 | 无 | `npm test` |
