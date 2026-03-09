// backend/src/db.js - 支持 MySQL 和 SQLite 双模式
const path = require('path');

// 根据环境变量决定使用哪种数据库
const USE_SQLITE = process.env.USE_SQLITE === 'true' || !process.env.DB_HOST;

let db;

if (USE_SQLITE) {
  // SQLite 模式（开发环境）
  console.log('📦 使用 SQLite 数据库（开发模式）');
  
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../wordheat.sqlite');
  
  const sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('SQLite 连接失败:', err);
    } else {
      console.log('✅ SQLite 连接成功:', dbPath);
      // 启用外键约束
      sqliteDb.run('PRAGMA foreign_keys = ON');
    }
  });

  // 将 SQLite 回调风格包装为 Promise
  db = {
    query: (sql, params = []) => {
      // 转换 MySQL 语法为 SQLite 语法
      const sqliteSql = sql
        .replace(/\?/g, (match, offset, string) => {
          // 计算这是第几个问号
          const before = string.slice(0, offset);
          const index = (before.match(/\?/g) || []).length + 1;
          return `$${index}`;
        })
        .replace(/NOW\(\)/g, 'datetime(\'now\')')
        .replace(/RAND\(\)/g, 'RANDOM()')
        .replace(/AUTO_INCREMENT/g, 'AUTOINCREMENT')
        .replace(/UNSIGNED/g, '')
        .replace(/ENGINE=InnoDB DEFAULT CHARSET=utf8mb4/g, '');

      return new Promise((resolve, reject) => {
        // 判断是查询还是修改
        const isSelect = sqliteSql.trim().toLowerCase().startsWith('select');
        
        if (isSelect) {
          sqliteDb.all(sqliteSql, params, (err, rows) => {
            if (err) {
              console.error('SQLite 查询错误:', err);
              reject(err);
            } else {
              resolve([rows]);
            }
          });
        } else {
          sqliteDb.run(sqliteSql, params, function(err) {
            if (err) {
              console.error('SQLite 执行错误:', err);
              reject(err);
            } else {
              // 返回影响的行数和最后插入的ID
              resolve([{
                affectedRows: this.changes,
                insertId: this.lastID
              }]);
            }
          });
        }
      });
    },

    transaction: async (callback) => {
      return new Promise((resolve, reject) => {
        sqliteDb.serialize(async () => {
          try {
            sqliteDb.run('BEGIN TRANSACTION');
            const result = await callback({
              execute: (sql, params) => db.query(sql, params)
            });
            sqliteDb.run('COMMIT');
            resolve(result);
          } catch (err) {
            sqliteDb.run('ROLLBACK');
            reject(err);
          }
        });
      });
    },

    // 初始化数据库表
    init: async () => {
      const fs = require('fs');
      const schemaPath = path.join(__dirname, '../database/schema.sql');
      
      if (!fs.existsSync(schemaPath)) {
        console.log('⚠️ 未找到 schema.sql，跳过初始化');
        return;
      }

      const schema = fs.readFileSync(schemaPath, 'utf8');
      
      // 分割 SQL 语句并执行
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const stmt of statements) {
        try {
          await db.query(stmt);
        } catch (err) {
          // 表已存在等错误可以忽略
          if (!err.message.includes('already exists')) {
            console.error('初始化 SQL 错误:', err.message);
          }
        }
      }
      
      console.log('✅ 数据库表初始化完成');
    }
  };

} else {
  // MySQL 模式（生产环境）
  console.log('🐬 使用 MySQL 数据库（生产模式）');
  
  const mysql = require('mysql2/promise');
  
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'wordheat',
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_POOL_LIMIT) || 20,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 10000
  });

  pool.on('error', (err) => {
    console.error('数据库连接池错误:', err);
  });

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

  db = { query, transaction, pool };
}

module.exports = db;
