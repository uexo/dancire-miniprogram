// backend/src/middleware/auth.js - 优化版
const jwt = require('jsonwebtoken');

// 强制要求环境变量设置
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET 环境变量必须设置');
}

if (JWT_SECRET.length < 32) {
  console.warn('警告: JWT_SECRET 建议至少32个字符');
}

// 验证token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: '未提供认证信息',
        code: 'AUTH_HEADER_MISSING'
      });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: '认证格式错误，应使用 Bearer token',
        code: 'AUTH_FORMAT_INVALID'
      });
    }
    
    const token = authHeader.substring(7);
    
    if (!token || token.length < 10) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token无效',
        code: 'TOKEN_INVALID'
      });
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Token已过期，请重新登录',
          code: 'TOKEN_EXPIRED'
        });
      }
      if (jwtErr.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Token格式错误',
          code: 'TOKEN_MALFORMED'
        });
      }
      throw jwtErr;
    }
    
    // 从数据库获取用户信息
    const db = require('../db');
    const [users] = await db.query(
      `SELECT id, openid, nickname, grade, textbook_version, is_vip, status 
       FROM users 
       WHERE id = ? AND status = 'active'`,
      [decoded.userId]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ 
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
    
    req.user = user;
    next();
  } catch (err) {
    console.error('认证失败:', err);
    return res.status(500).json({ 
      success: false, 
      message: '认证服务错误',
      code: 'AUTH_ERROR'
    });
  }
};

// 生成token
const generateToken = (userId) => {
  return jwt.sign(
    { userId }, 
    JWT_SECRET, 
    { 
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'wordheat-api',
      audience: 'wordheat-app'
    }
  );
};

module.exports = {
  authenticate,
  generateToken
};
