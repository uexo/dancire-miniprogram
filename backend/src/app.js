// backend/src/app.js
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const wordRoutes = require('./routes/words');
const wordbankRoutes = require('./routes/wordbank');
const checkinRoutes = require('./routes/checkin');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payment');
const authRoutes = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const ttsRoutes = require('./routes/tts');
const { errorHandler } = require('./middleware/error');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// 路由
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/words', wordRoutes);
app.use('/api/v1/wordbank', wordbankRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/checkin', checkinRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/payment', paymentRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/tts', ttsRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API文档: http://localhost:${PORT}/health`);
});
