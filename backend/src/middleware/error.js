// backend/src/middleware/error.js - 错误处理中间件
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
