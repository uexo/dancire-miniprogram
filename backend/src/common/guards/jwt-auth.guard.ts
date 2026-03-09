// src/common/guards/jwt-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { db } from '../../config/database.config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly JWT_SECRET = process.env.JWT_SECRET;
  private readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

  constructor() {
    if (!this.JWT_SECRET) {
      throw new Error('JWT_SECRET 环境变量必须设置');
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    // 复用原有的认证逻辑
    if (!authHeader) {
      throw new UnauthorizedException({
        success: false,
        message: '未提供认证信息',
        code: 'AUTH_HEADER_MISSING'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        success: false,
        message: '认证格式错误，应使用 Bearer token',
        code: 'AUTH_FORMAT_INVALID'
      });
    }

    const token = authHeader.substring(7);

    if (!token || token.length < 10) {
      throw new UnauthorizedException({
        success: false,
        message: 'Token无效',
        code: 'TOKEN_INVALID'
      });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, this.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        throw new UnauthorizedException({
          success: false,
          message: 'Token已过期，请重新登录',
          code: 'TOKEN_EXPIRED'
        });
      }
      if (jwtErr.name === 'JsonWebTokenError') {
        throw new UnauthorizedException({
          success: false,
          message: 'Token格式错误',
          code: 'TOKEN_MALFORMED'
        });
      }
      throw jwtErr;
    }

    // 从数据库获取用户信息
    const [users] = await db.query(
      `SELECT id, openid, nickname, grade, textbook_version, is_vip, status 
       FROM users 
       WHERE id = ? AND status = 'active'`,
      [decoded.userId]
    );

    if (users.length === 0) {
      throw new UnauthorizedException({
        success: false,
        message: '用户不存在或已被禁用',
        code: 'USER_NOT_FOUND'
      });
    }

    const user = users[0];

    // 更新最后活动时间
    await db.query(
      'UPDATE users SET last_active_at = NOW() WHERE id = ?',
      [user.id]
    );

    request.user = user;
    return true;
  }
}
