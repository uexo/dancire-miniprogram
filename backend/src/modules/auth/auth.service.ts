// src/modules/auth/auth.service.ts
import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as db from '../../common/database/db';
import { generateToken } from '../../common/guards/jwt.guard';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AuthService {
  private readonly WX_APPID: string;
  private readonly WX_SECRET: string;
  private readonly JWT_SECRET: string;

  constructor() {
    this.WX_APPID = process.env.WX_APPID || 'your-wx-appid';
    this.WX_SECRET = process.env.WX_SECRET || 'your-wx-secret';
    this.JWT_SECRET = process.env.JWT_SECRET || 'wordheat-secret-key-change-in-production';
  }

  /**
   * 获取微信session
   */
  private async getWxSession(code: string): Promise<{ openid: string; session_key: string; unionid?: string }> {
    // 实际应调用微信API
    // const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${this.WX_APPID}&secret=${this.WX_SECRET}&js_code=${code}&grant_type=authorization_code`;
    // const response = await fetch(url);
    // const data = await response.json();

    // 模拟返回（实际部署时替换为真实API调用）
    return {
      openid: `mock_openid_${code.substring(0, 10)}`,
      session_key: crypto.randomBytes(16).toString('hex'),
      unionid: `mock_unionid_${code.substring(0, 8)}`,
    };
  }

  /**
   * 获取手机号（通过code）
   */
  private async getPhoneNumber(code: string): Promise<string> {
    // 实际应调用微信API解密
    // 模拟返回
    return `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
  }

  /**
   * 获取或创建用户
   */
  private async getOrCreateUser(openid: string, userInfo: any = {}): Promise<any> {
    // 查找现有用户
    const [existingUsers]: any = await db.query(
      'SELECT * FROM users WHERE openid = ?',
      [openid],
    );

    if (existingUsers && existingUsers.length > 0) {
      // 更新登录时间
      await db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [
        existingUsers[0].id,
      ]);
      return existingUsers[0];
    }

    // 创建新用户
    const [result]: any = await db.query(
      `
      INSERT INTO users 
      (openid, nickname, avatar_url, grade, textbook_version, created_at, last_login_at) 
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `,
      [
        openid,
        userInfo.nickName || `用户${Date.now().toString().slice(-6)}`,
        userInfo.avatarUrl || '',
        userInfo.grade || 3,
        userInfo.textbookVersion || 'pep',
      ],
    );

    // 初始化用户统计
    await db.query(
      `
      INSERT INTO user_statistics (user_id, total_words, mastered_words, learning_words) 
      VALUES (?, 0, 0, 0)
    `,
      [result.insertId],
    );

    // 返回新用户
    const [newUsers]: any = await db.query(
      'SELECT * FROM users WHERE id = ?',
      [result.insertId],
    );

    return newUsers[0];
  }

  /**
   * 微信登录
   */
  async wxLogin(code: string, userInfo?: any) {
    if (!code) {
      throw new BadRequestException('缺少code参数');
    }

    // 获取微信session
    const session = await this.getWxSession(code);

    if (!session.openid) {
      throw new BadRequestException('微信登录失败');
    }

    // 获取或创建用户
    const user = await this.getOrCreateUser(session.openid, userInfo);

    // 生成token
    const token = generateToken(user.id);

    return {
      success: true,
      data: {
        token,
        userInfo: {
          id: user.id,
          nickname: user.nickname,
          avatarUrl: user.avatar_url,
          grade: user.grade,
          textbookVersion: user.textbook_version,
          isVip: user.is_vip,
          vipExpireAt: user.vip_expire_at,
        },
      },
    };
  }

  /**
   * 手机号快捷登录
   */
  async phoneLogin(wxCode: string, phoneCode: string) {
    if (!wxCode || !phoneCode) {
      throw new BadRequestException('缺少必要参数');
    }

    // 获取微信session
    const session = await this.getWxSession(wxCode);

    if (!session.openid) {
      throw new BadRequestException('微信登录失败');
    }

    // 获取手机号
    const phoneNumber = await this.getPhoneNumber(phoneCode);

    // 获取或创建用户（同时保存手机号）
    let [existingUsers]: any = await db.query(
      'SELECT * FROM users WHERE openid = ?',
      [session.openid],
    );

    let user: any;
    if (existingUsers && existingUsers.length > 0) {
      user = existingUsers[0];
      // 更新手机号和登录时间
      await db.query(
        'UPDATE users SET phone = ?, last_login_at = NOW() WHERE id = ?',
        [phoneNumber, user.id],
      );
    } else {
      // 创建新用户
      const [result]: any = await db.query(
        `
        INSERT INTO users 
        (openid, phone, nickname, created_at, last_login_at) 
        VALUES (?, ?, ?, NOW(), NOW())
      `,
        [session.openid, phoneNumber, `用户${phoneNumber.slice(-4)}`],
      );

      const [newUsers]: any = await db.query(
        'SELECT * FROM users WHERE id = ?',
        [result.insertId],
      );
      user = newUsers[0];
    }

    // 生成token
    const token = generateToken(user.id);

    return {
      success: true,
      data: {
        token,
        userInfo: {
          id: user.id,
          nickname: user.nickname,
          avatarUrl: user.avatar_url,
          phone: phoneNumber,
          grade: user.grade,
          textbookVersion: user.textbook_version,
          isVip: user.is_vip,
          vipExpireAt: user.vip_expire_at,
        },
      },
    };
  }

  /**
   * 发送验证码
   */
  async sendCode(phoneNumber: string) {
    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      throw new BadRequestException('手机号格式错误');
    }

    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 保存到Redis（设置5分钟过期）
    // await redis.setex(`verify_code:${phoneNumber}`, 300, code);

    // TODO: 调用短信服务发送验证码
    console.log(`验证码已发送到 ${phoneNumber}: ${code}`);

    return {
      success: true,
      message: '验证码已发送',
      // 开发环境返回验证码
      data: process.env.NODE_ENV === 'development' ? { code } : undefined,
    };
  }

  /**
   * 验证码登录
   */
  async verifyCodeLogin(phoneNumber: string, verifyCode: string) {
    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      throw new BadRequestException('手机号格式错误');
    }

    // TODO: 从Redis获取验证码并验证
    // const savedCode = await redis.get(`verify_code:${phoneNumber}`);
    // if (savedCode !== verifyCode) {
    //   throw new BadRequestException('验证码错误或已过期');
    // }

    // 查找或创建用户
    let [existingUsers]: any = await db.query(
      'SELECT * FROM users WHERE phone = ?',
      [phoneNumber],
    );

    let user: any;
    if (existingUsers && existingUsers.length > 0) {
      user = existingUsers[0];
      await db.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = ?',
        [user.id],
      );
    } else {
      // 创建新用户
      const openid = `phone_${phoneNumber}`;
      const [result]: any = await db.query(
        `
        INSERT INTO users 
        (openid, phone, nickname, created_at, last_login_at) 
        VALUES (?, ?, ?, NOW(), NOW())
      `,
        [openid, phoneNumber, `用户${phoneNumber.slice(-4)}`],
      );

      const [newUsers]: any = await db.query(
        'SELECT * FROM users WHERE id = ?',
        [result.insertId],
      );
      user = newUsers[0];
    }

    // 生成token
    const token = generateToken(user.id);

    return {
      success: true,
      data: {
        token,
        userInfo: {
          id: user.id,
          nickname: user.nickname,
          avatarUrl: user.avatar_url,
          phone: phoneNumber,
          grade: user.grade,
          textbookVersion: user.textbook_version,
          isVip: user.is_vip,
          vipExpireAt: user.vip_expire_at,
        },
      },
    };
  }

  /**
   * 刷新token
   */
  async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as any;

      // 获取最新用户信息
      const [users]: any = await db.query(
        'SELECT id, openid FROM users WHERE id = ?',
        [decoded.userId],
      );

      if (!users || users.length === 0) {
        throw new UnauthorizedException('用户不存在');
      }

      // 生成新token
      const newToken = generateToken(users[0].id);

      return {
        success: true,
        data: { token: newToken },
      };
    } catch (err) {
      throw new UnauthorizedException('token无效');
    }
  }
}
