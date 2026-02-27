// backend/src/routes/auth.js
// 认证相关API - 微信登录、手机号登录、JWT token管理

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'wordheat-secret-key-change-in-production';
const JWT_EXPIRES = '7d';

// 微信小程序配置
const WX_APPID = process.env.WX_APPID || 'your-wx-appid';
const WX_SECRET = process.env.WX_SECRET || 'your-wx-secret';

/**
 * 生成JWT token
 * @param {Object} payload - token payload
 * @returns {string} JWT token
 */
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/**
 * 验证JWT token
 * @param {string} token - JWT token
 * @returns {Object|null} 解码后的payload或null
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * 获取微信session
 * @param {string} code - 微信登录code
 * @returns {Promise<Object>} session信息
 */
async function getWxSession(code) {
  // 实际应调用微信API
  // const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APPID}&secret=${WX_SECRET}&js_code=${code}&grant_type=authorization_code`;
  // const response = await fetch(url);
  // const data = await response.json();
  
  // 模拟返回（实际部署时替换为真实API调用）
  return {
    openid: `mock_openid_${code.substring(0, 10)}`,
    session_key: crypto.randomBytes(16).toString('hex'),
    unionid: `mock_unionid_${code.substring(0, 8)}`
  };
}

/**
 * 获取手机号（通过code）
 * @param {string} code - 微信获取手机号code
 * @returns {Promise<string>} 手机号
 */
async function getPhoneNumber(code) {
  // 实际应调用微信API解密
  // 模拟返回
  return `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
}

/**
 * 获取或创建用户
 * @param {string} openid - 微信openid
 * @param {Object} userInfo - 用户信息
 * @returns {Promise<Object>} 用户对象
 */
async function getOrCreateUser(openid, userInfo = {}) {
  // 查找现有用户
  const [existingUsers] = await db.query(
    'SELECT * FROM users WHERE openid = ?',
    [openid]
  );
  
  if (existingUsers.length > 0) {
    // 更新登录时间
    await db.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [existingUsers[0].id]
    );
    return existingUsers[0];
  }
  
  // 创建新用户
  const [result] = await db.query(`
    INSERT INTO users 
    (openid, nickname, avatar_url, grade, textbook_version, created_at, last_login_at) 
    VALUES (?, ?, ?, ?, ?, NOW(), NOW())
  `, [
    openid,
    userInfo.nickName || `用户${Date.now().toString().slice(-6)}`,
    userInfo.avatarUrl || '',
    userInfo.grade || 3,
    userInfo.textbookVersion || 'pep'
  ]);
  
  // 初始化用户统计
  await db.query(`
    INSERT INTO user_statistics (user_id, total_words, mastered_words, learning_words) 
    VALUES (?, 0, 0, 0)
  `, [result.insertId]);
  
  // 返回新用户
  const [newUsers] = await db.query(
    'SELECT * FROM users WHERE id = ?',
    [result.insertId]
  );
  
  return newUsers[0];
}

// ========== API路由 ==========

// 微信登录
router.post('/wx-login', async (req, res) => {
  try {
    const { code, userInfo } = req.body;
    
    if (!code) {
      return res.status(400).json({ success: false, message: '缺少code参数' });
    }
    
    // 获取微信session
    const session = await getWxSession(code);
    
    if (!session.openid) {
      return res.status(400).json({ success: false, message: '微信登录失败' });
    }
    
    // 获取或创建用户
    const user = await getOrCreateUser(session.openid, userInfo);
    
    // 生成token
    const token = generateToken({
      userId: user.id,
      openid: user.openid
    });
    
    res.json({
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
          vipExpireAt: user.vip_expire_at
        }
      }
    });
  } catch (err) {
    console.error('微信登录失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 手机号快捷登录
router.post('/phone-login', async (req, res) => {
  try {
    const { wxCode, phoneCode } = req.body;
    
    if (!wxCode || !phoneCode) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少必要参数' 
      });
    }
    
    // 获取微信session
    const session = await getWxSession(wxCode);
    
    if (!session.openid) {
      return res.status(400).json({ success: false, message: '微信登录失败' });
    }
    
    // 获取手机号
    const phoneNumber = await getPhoneNumber(phoneCode);
    
    // 获取或创建用户（同时保存手机号）
    let [existingUsers] = await db.query(
      'SELECT * FROM users WHERE openid = ?',
      [session.openid]
    );
    
    let user;
    if (existingUsers.length > 0) {
      user = existingUsers[0];
      // 更新手机号和登录时间
      await db.query(
        'UPDATE users SET phone = ?, last_login_at = NOW() WHERE id = ?',
        [phoneNumber, user.id]
      );
    } else {
      // 创建新用户
      const [result] = await db.query(`
        INSERT INTO users 
        (openid, phone, nickname, created_at, last_login_at) 
        VALUES (?, ?, ?, NOW(), NOW())
      `, [session.openid, phoneNumber, `用户${phoneNumber.slice(-4)}`]);
      
      const [newUsers] = await db.query(
        'SELECT * FROM users WHERE id = ?',
        [result.insertId]
      );
      user = newUsers[0];
    }
    
    // 生成token
    const token = generateToken({
      userId: user.id,
      openid: user.openid
    });
    
    res.json({
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
          vipExpireAt: user.vip_expire_at
        }
      }
    });
  } catch (err) {
    console.error('手机号登录失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 发送验证码
router.post('/send-code', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      return res.status(400).json({ success: false, message: '手机号格式错误' });
    }
    
    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 保存到Redis（设置5分钟过期）
    // await redis.setex(`verify_code:${phoneNumber}`, 300, code);
    
    // TODO: 调用短信服务发送验证码
    console.log(`验证码已发送到 ${phoneNumber}: ${code}`);
    
    res.json({
      success: true,
      message: '验证码已发送',
      // 开发环境返回验证码
      data: process.env.NODE_ENV === 'development' ? { code } : undefined
    });
  } catch (err) {
    console.error('发送验证码失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 验证码登录
router.post('/verify-code-login', async (req, res) => {
  try {
    const { phoneNumber, verifyCode } = req.body;
    
    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      return res.status(400).json({ success: false, message: '手机号格式错误' });
    }
    
    // TODO: 从Redis获取验证码并验证
    // const savedCode = await redis.get(`verify_code:${phoneNumber}`);
    // if (savedCode !== verifyCode) {
    //   return res.status(400).json({ success: false, message: '验证码错误或已过期' });
    // }
    
    // 查找或创建用户
    let [existingUsers] = await db.query(
      'SELECT * FROM users WHERE phone = ?',
      [phoneNumber]
    );
    
    let user;
    if (existingUsers.length > 0) {
      user = existingUsers[0];
      await db.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = ?',
        [user.id]
      );
    } else {
      // 创建新用户
      const openid = `phone_${phoneNumber}`;
      const [result] = await db.query(`
        INSERT INTO users 
        (openid, phone, nickname, created_at, last_login_at) 
        VALUES (?, ?, ?, NOW(), NOW())
      `, [openid, phoneNumber, `用户${phoneNumber.slice(-4)}`]);
      
      const [newUsers] = await db.query(
        'SELECT * FROM users WHERE id = ?',
        [result.insertId]
      );
      user = newUsers[0];
    }
    
    // 生成token
    const token = generateToken({
      userId: user.id,
      openid: user.openid
    });
    
    res.json({
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
          vipExpireAt: user.vip_expire_at
        }
      }
    });
  } catch (err) {
    console.error('验证码登录失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 刷新token
router.post('/refresh-token', async (req, res) => {
  try {
    const { token } = req.body;
    
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'token无效' });
    }
    
    // 获取最新用户信息
    const [users] = await db.query(
      'SELECT id, openid FROM users WHERE id = ?',
      [decoded.userId]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: '用户不存在' });
    }
    
    // 生成新token
    const newToken = generateToken({
      userId: users[0].id,
      openid: users[0].openid
    });
    
    res.json({
      success: true,
      data: { token: newToken }
    });
  } catch (err) {
    console.error('刷新token失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 退出登录
router.post('/logout', async (req, res) => {
  // 客户端清除token即可，服务端可选择加入黑名单
  res.json({
    success: true,
    message: '退出成功'
  });
});

module.exports = router;
