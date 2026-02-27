// backend/src/middleware/auth.js
// JWT认证中间件

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// 验证token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: '未提供token' });
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // 从数据库获取用户信息
    const db = require('../db');
    const [users] = await db.query(
      'SELECT id, openid, nickname, grade, textbook_version, is_vip FROM users WHERE id = ?',
      [decoded.userId]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }
    
    req.user = users[0];
    next();
  } catch (err) {
    console.error('认证失败:', err);
    return res.status(401).json({ success: false, message: 'token无效' });
  }
};

// 生成token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

module.exports = {
  authenticate,
  generateToken
};
