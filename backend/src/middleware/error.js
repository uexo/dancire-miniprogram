// backend/src/middleware/error.js
// 错误处理中间件

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // 默认错误信息
  let statusCode = err.statusCode || 500;
  let message = err.message || '服务器内部错误';

  // MySQL错误处理
  if (err.code) {
    switch (err.code) {
      case 'ER_DUP_ENTRY':
        statusCode = 409;
        message = '数据已存在';
        break;
      case 'ER_NO_REFERENCED_ROW':
      case 'ER_NO_REFERENCED_ROW_2':
        statusCode = 400;
        message = '引用的数据不存在';
        break;
      case 'ER_BAD_NULL_ERROR':
        statusCode = 400;
        message = '必填字段不能为空';
        break;
      case 'ER_DATA_TOO_LONG':
        statusCode = 400;
        message = '数据长度超出限制';
        break;
      case 'ECONNREFUSED':
        statusCode = 503;
        message = '数据库连接失败';
        break;
    }
  }

  // JWT错误
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'token已过期';
  }

  // 验证错误
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * 404处理中间件
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
