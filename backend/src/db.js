// backend/src/db.js - 优化版
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
  testOnBorrow: true
});

// 监听连接池错误
pool.on('error', (err) => {
  console.error('数据库连接池错误:', err);
});

// 导出带重试的查询方法
const query = async (sql, params) => {
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
};

// 事务支持
const transaction = async (callback) => {
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
};

module.exports = {
  query,
  transaction,
  pool
};
