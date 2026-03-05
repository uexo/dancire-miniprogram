# 单词热项目优化报告

**生成时间**: 2026-03-04  
**项目路径**: `/root/.openclaw/workspace/products/单词热`  
**分析范围**: Backend (Node.js/Express) + Frontend (微信小程序)

---

## 🚨 高优先级问题

### 1. 数据库连接池配置不当

**问题**: `db.js` 缺少关键连接池参数

```javascript
// 当前代码 ❌
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wordheat',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
```

**风险**:
- 没有连接超时设置，可能导致连接泄露
- 没有启用连接保持，可能导致MySQL `wait_timeout` 断连
- 缺少错误处理和重连机制

**优化方案** ✅

```javascript
// backend/src/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wordheat',
  
  // 连接池优化
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_LIMIT) || 20,
  queueLimit: 0,
  
  // 连接保持
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  
  // 超时设置
  connectTimeout: 10000,      // 连接超时10秒
  acquireTimeout: 60000,      // 获取连接超时60秒
  timeout: 60000,             // 查询超时60秒
  
  // 连接验证
  testOnBorrow: true,
  
  // 错误处理
  reconnect: true
});

// 监听连接池错误
pool.on('error', (err) => {
  console.error('数据库连接池错误:', err);
});

// 健康检查
pool.on('acquire', (connection) => {
  console.log('连接已获取: ', connection.threadId);
});

pool.on('release', (connection) => {
  console.log('连接已释放: ', connection.threadId);
});

// 导出带重试的查询方法
module.exports = {
  query: async (sql, params) => {
    const maxRetries = 3;
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const [results] = await pool.execute(sql, params);
        return [results];
      } catch (err) {
        lastError = err;
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || 
            err.code === 'ECONNREFUSED') {
          console.warn(`数据库查询失败，第${i + 1}次重试...`);
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  },
  
  // 事务支持
  transaction: async (callback) => {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  },
  
  pool
};
```

---

### 2. SQL注入风险

**问题**: `words.js` 中动态SQL拼接

```javascript
// 当前代码 ❌
const [freshWords] = await db.query(`
  SELECT * FROM word_banks
  WHERE grade = ? 
    AND textbook_version = ?
    ${existingIds.length > 0 ? 'AND id NOT IN (?)' : ''}
  ORDER BY unit ASC, id ASC
  LIMIT ?
`, [req.user.grade, req.user.textbook_version, existingIds, needNewWords]);
```

**风险**: 虽然使用了参数化查询，但 `existingIds` 是数组，mysql2 的 `?` 占位符对数组的处理可能产生意外行为。

**优化方案** ✅

```javascript
// backend/src/routes/words.js - 安全查询
async function getNewWords(userId, grade, textbookVersion, existingIds, limit) {
  // 使用事务保证数据一致性
  return await db.transaction(async (conn) => {
    let query = `
      SELECT wb.* FROM word_banks wb
      WHERE wb.grade = ? 
        AND wb.textbook_version = ?
    `;
    const params = [grade, textbookVersion];
    
    // 安全处理数组参数
    if (existingIds.length > 0) {
      // 验证所有ID都是整数
      const validIds = existingIds.filter(id => Number.isInteger(Number(id)));
      if (validIds.length > 0) {
        query += ` AND wb.id NOT IN (${validIds.map(() => '?').join(',')})`;
        params.push(...validIds);
      }
    }
    
    query += ` ORDER BY wb.unit ASC, wb.id ASC LIMIT ?`;
    params.push(Math.min(limit, 50)); // 限制最大数量
    
    const [rows] = await conn.execute(query, params);
    return rows;
  });
}
```

---

### 3. JWT密钥硬编码风险

**问题**: `auth.js` 中密钥使用环境变量回退到默认值

```javascript
// 当前代码 ❌
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
```

**风险**: 如果环境变量未设置，使用默认密钥，极易被破解。

**优化方案** ✅

```javascript
// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

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
    
    // 从数据库获取用户信息（使用缓存优化）
    const db = require('../db');
    const cacheKey = `user:${decoded.userId}`;
    
    // TODO: 可以添加Redis缓存
    // let user = await redis.get(cacheKey);
    // if (!user) {
    
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
    
    // 检查token版本（支持强制登出）
    if (decoded.tokenVersion && user.token_version && 
        decoded.tokenVersion !== user.token_version) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token已失效，请重新登录',
        code: 'TOKEN_REVOKED'
      });
    }
    
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

// 生成token（添加token版本支持）
const generateToken = (userId, tokenVersion = '1') => {
  return jwt.sign(
    { userId, tokenVersion }, 
    JWT_SECRET, 
    { 
      expiresIn: JWT_EXPIRES_IN,
      issuer: 'wordheat-api',
      audience: 'wordheat-app'
    }
  );
};

// 刷新token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少refresh token' 
      });
    }
    
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const newToken = generateToken(decoded.userId, decoded.tokenVersion);
    
    res.json({
      success: true,
      data: { token: newToken }
    });
  } catch (err) {
    res.status(401).json({ 
      success: false, 
      message: 'Token刷新失败' 
    });
  }
};

module.exports = {
  authenticate,
  generateToken,
  refreshToken
};
```

---

### 4. 数据库事务不一致风险

**问题**: `words.js` 中多次独立数据库操作，没有使用事务

```javascript
// 当前代码 ❌ - 创建学习记录时独立操作
for (const word of newWords) {
  await db.query(`
    INSERT INTO learning_records 
    (user_id, word_id, status, next_review_at)
    VALUES (?, ?, 'new', NOW())
  `, [userId, word.id]);
}
```

**风险**: 如果中间某条失败，会导致数据不一致。

**优化方案** ✅

```javascript
// 批量插入使用事务
async function createLearningRecords(userId, words) {
  if (words.length === 0) return;
  
  return await db.transaction(async (conn) => {
    // 批量插入优化
    const values = words.map(() => '(?, ?, ?, NOW())').join(',');
    const params = words.flatMap(word => [userId, word.id, 'new']);
    
    const [result] = await conn.execute(`
      INSERT INTO learning_records 
      (user_id, word_id, status, next_review_at)
      VALUES ${values}
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        next_review_at = VALUES(next_review_at)
    `, params);
    
    return result.affectedRows;
  });
}
```

---

## ⚡ 中优先级问题

### 5. 性能优化：N+1查询问题

**问题**: `generateOptions` 函数中每个单词单独查询

**优化方案** ✅

```javascript
// 优化后的干扰项生成
async function generateOptions(words) {
  if (words.length === 0) return [];
  
  const wordIds = words.map(w => w.id);
  const grades = [...new Set(words.map(w => w.grade))];
  
  // 一次性获取干扰项（同级别、同词性）
  const [distractions] = await db.query(`
    SELECT meaning, grade, part_of_speech
    FROM word_banks
    WHERE id NOT IN (?) 
      AND grade IN (?)
    ORDER BY RAND()
    LIMIT ?
  `, [wordIds, grades, words.length * 4]);

  return words.map((word, index) => {
    // 筛选同级别的干扰项
    const relevantDistractions = distractions
      .filter(d => d.grade === word.grade && d.meaning !== word.meaning)
      .slice(index * 3, index * 3 + 3)
      .map(d => d.meaning);
    
    const options = [word.meaning, ...relevantDistractions];
    
    // Fisher-Yates 洗牌算法
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }

    return {
      ...word,
      options,
      correctIndex: options.indexOf(word.meaning)
    };
  });
}
```

---

### 6. 缓存策略缺失

**问题**: 热点数据（如单词库、用户统计）没有缓存

**优化方案** ✅

```javascript
// backend/src/utils/cache.js
const NodeCache = require('node-cache');

// 多级缓存策略
const caches = {
  // 高频读取，很少变更（单词数据）
  words: new NodeCache({ stdTTL: 300, checkperiod: 60 }), // 5分钟
  
  // 用户相关数据
  user: new NodeCache({ stdTTL: 60, checkperiod: 30 }),    // 1分钟
  
  // 临时计算结果
  temp: new NodeCache({ stdTTL: 10, checkperiod: 5 })      // 10秒
};

module.exports = {
  get: (type, key) => caches[type].get(key),
  set: (type, key, value, ttl) => caches[type].set(key, value, ttl),
  del: (type, key) => caches[type].del(key),
  flush: (type) => caches[type].flushAll()
};

// 使用示例 - words.js
const cache = require('../utils/cache');

router.get('/today', authenticate, async (req, res) => {
  const cacheKey = `today:${req.user.id}`;
  
  // 尝试从缓存获取
  let result = cache.get('user', cacheKey);
  if (result) {
    return res.json({ success: true, data: result, cached: true });
  }
  
  // 查询逻辑...
  result = await fetchTodayTasks(req.user.id);
  
  // 缓存结果
  cache.set('user', cacheKey, result, 30);
  
  res.json({ success: true, data: result });
});
```

---

### 7. 错误处理不规范

**问题**: 错误信息直接暴露给用户，可能泄露敏感信息

**优化方案** ✅

```javascript
// backend/src/middleware/error.js
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || '服务器错误';
  
  // 开发环境返回详细错误
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code || 'UNKNOWN_ERROR',
      stack: err.stack,
      error: err
    });
  }
  
  // 生产环境只返回安全信息
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code
    });
  }
  
  // 非预期错误，记录日志但不暴露细节
  console.error('ERROR 💥', err);
  
  return res.status(500).json({
    success: false,
    message: '服务器内部错误',
    code: 'INTERNAL_ERROR'
  });
};

module.exports = { AppError, errorHandler };
```

---

## 🔧 低优先级建议

### 8. 算法优化

```javascript
// backend/src/utils/algorithm.js - 优化版

/**
 * 艾宾浩斯记忆曲线参数
 * 基于遗忘曲线理论优化
 */
const EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15, 30, 90, 180];

/**
 * 计算下次复习时间
 * @param {number} familiarity - 熟悉度 0-100
 * @param {number} wrongCount - 错误次数
 * @param {number} streak - 连续正确次数
 * @returns {Date} 下次复习时间
 */
function calculateNextReview(familiarity, wrongCount = 0, streak = 0) {
  // 基础间隔等级
  let level = Math.floor(familiarity / (100 / EBBINGHAUS_INTERVALS.length));
  level = Math.max(0, Math.min(level, EBBINGHAUS_INTERVALS.length - 1));
  
  let days = EBBINGHAUS_INTERVALS[level];
  
  // 连续正确奖励
  if (streak > 0) {
    days *= (1 + streak * 0.1); // 每连续正确一次增加10%
  }
  
  // 错误惩罚（渐进式）
  if (wrongCount > 0) {
    const penalty = Math.min(wrongCount * 0.2, 0.6); // 最大60%惩罚
    days *= (1 - penalty);
  }
  
  // 熟悉度加成（熟练单词间隔延长）
  if (familiarity > 90) {
    days *= 1.2;
  }
  
  // 确保至少1天后复习
  days = Math.max(1, Math.round(days));
  
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + days);
  nextReview.setHours(9, 0, 0, 0); // 固定在早上9点复习
  
  return nextReview;
}

/**
 * 使用sigmoid函数平滑更新熟悉度
 */
function updateFamiliarity(currentFamiliarity, isCorrect, responseTime = 0) {
  const baseChange = isCorrect ? 10 : -8;
  
  // 难度系数（熟悉度越高越难提升）
  const difficulty = currentFamiliarity / 100;
  let change = baseChange * (1 - difficulty * 0.5);
  
  // 响应时间加成（快速答对有额外奖励）
  if (isCorrect && responseTime < 2000) {
    change += 2;
  }
  
  // 使用sigmoid平滑
  const newFamiliarity = Math.max(0, Math.min(100, 
    currentFamiliarity + change
  ));
  
  return Math.round(newFamiliarity * 10) / 10; // 保留1位小数
}

/**
 * 判断是否已掌握（多维度评估）
 */
function isMastered(familiarity, correctCount, wrongCount = 0) {
  const totalAttempts = correctCount + wrongCount;
  if (totalAttempts < 3) return false; // 至少练习3次
  
  const accuracy = correctCount / totalAttempts;
  return familiarity >= 85 && accuracy >= 0.8 && correctCount >= 3;
}

module.exports = {
  calculateNextReview,
  updateFamiliarity,
  isMastered
};
```

---

### 9. API限流和防护

```javascript
// backend/src/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

// 通用限流
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP 100次请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// 提交答案限流（更严格）
const answerLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分钟
  max: 30, // 30次提交
  skipSuccessfulRequests: true // 成功请求不计数
});

module.exports = { apiLimiter, answerLimiter };

// app.js 中使用
app.use('/api/', apiLimiter);
app.use('/api/v1/words/answer', answerLimiter);
```

---

### 10. 前端性能优化

```javascript
// frontend/pages/study/study.js - 优化版
Page({
  data: {
    currentWord: null,
    wordList: [],
    currentIndex: 0,
    mode: 'learn',
    showAnswer: false,
    selectedOption: null,
    isCorrect: null,
    progress: { current: 0, total: 0 },
    studyStats: { correct: 0, wrong: 0 },
    
    // 新增优化
    isSubmitting: false,  // 防止重复提交
    audioContext: null    // 复用音频上下文
  },

  onLoad(options) {
    this.setData({ 
      mode: options.mode || 'learn',
      audioContext: wx.createInnerAudioContext()
    });
    this.loadTodayTasks();
  },
  
  onUnload() {
    // 清理资源
    if (this.data.audioContext) {
      this.data.audioContext.destroy();
    }
    // 取消未完成的请求
    if (this._request) {
      this._request.abort();
    }
  },

  // 防抖提交
  async submitAnswer(isCorrect) {
    if (this.data.isSubmitting) return;
    this.setData({ isSubmitting: true });
    
    try {
      // 提交逻辑...
    } finally {
      this.setData({ isSubmitting: false });
    }
  },

  // 优化音频播放
  onPlayAudio() {
    const { currentWord, audioContext } = this.data;
    if (!currentWord) return;
    
    // 停止之前的播放
    audioContext.stop();
    
    // 使用CDN或TTS
    const audioUrl = currentWord.audioUrl || 
      `https://tts-api.example.com/speak?word=${encodeURIComponent(currentWord.word)}`;
    
    audioContext.src = audioUrl;
    audioContext.play();
    
    // 错误处理
    audioContext.onError((err) => {
      console.error('音频播放失败:', err);
      wx.showToast({ title: '播放失败', icon: 'none' });
    });
  }
});
```

---

## 📊 优化优先级汇总

| 优先级 | 问题 | 影响 | 工作量 |
|--------|------|------|--------|
| 🔴 高 | 数据库连接池配置 | 稳定性 | 2小时 |
| 🔴 高 | SQL注入风险 | 安全性 | 1小时 |
| 🔴 高 | JWT密钥硬编码 | 安全性 | 30分钟 |
| 🔴 高 | 数据库事务 | 数据一致性 | 2小时 |
| 🟡 中 | N+1查询问题 | 性能 | 2小时 |
| 🟡 中 | 缓存策略 | 性能 | 4小时 |
| 🟡 中 | 错误处理 | 安全性 | 2小时 |
| 🟢 低 | 算法优化 | 体验 | 2小时 |
| 🟢 低 | API限流 | 稳定性 | 1小时 |
| 🟢 低 | 前端优化 | 体验 | 2小时 |

---

## 🚀 快速修复脚本

创建优化脚本一键应用基础修复：

```bash
#!/bin/bash
# optimize-wordheat.sh

echo "🚀 开始优化单词热项目..."

# 1. 安装依赖
cd backend
npm install node-cache express-rate-limit

# 2. 备份原文件
mkdir -p backups
cp src/db.js backups/db.js.bak
cp src/middleware/auth.js backups/auth.js.bak
cp src/routes/words.js backups/words.js.bak

# 3. 应用优化（需要手动复制上述优化代码）
echo "⚠️ 请手动应用优化代码："
echo "  - backend/src/db.js"
echo "  - backend/src/middleware/auth.js"
echo "  - backend/src/routes/words.js"
echo "  - backend/src/utils/algorithm.js"

echo "✅ 优化准备完成！"
```

---

**报告完成** 🎉

需要我详细展开某个优化点，或者帮你生成具体的迁移代码吗？
