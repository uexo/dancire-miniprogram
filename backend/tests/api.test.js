/**
 * API 路由单元测试
 */

const request = require('supertest');
const express = require('express');

// 模拟数据库
jest.mock('../src/db', () => ({
  query: jest.fn(),
  execute: jest.fn()
}));

const db = require('../src/db');

describe('API 测试', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // 模拟认证中间件
    app.use((req, res, next) => {
      req.user = { user_id: 1, openid: 'test_openid' };
      next();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('单词 API', () => {
    test('GET /words - 应该返回单词列表', async () => {
      const mockWords = [
        { word_id: 1, word: 'apple', meaning: '苹果' },
        { word_id: 2, word: 'banana', meaning: '香蕉' }
      ];
      
      db.query.mockResolvedValue([mockWords]);
      
      const wordsRouter = require('../src/routes/words');
      app.use('/api/v1/words', wordsRouter);
      
      const response = await request(app)
        .get('/api/v1/words')
        .query({ wordbank_id: 1 });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    test('GET /words/:id - 应该返回单个单词', async () => {
      const mockWord = { word_id: 1, word: 'apple', meaning: '苹果' };
      db.query.mockResolvedValue([[mockWord]]);
      
      const wordsRouter = require('../src/routes/words');
      app.use('/api/v1/words', wordsRouter);
      
      const response = await request(app)
        .get('/api/v1/words/1');
      
      expect(response.status).toBe(200);
      expect(response.body.data.word).toBe('apple');
    });
  });

  describe('打卡 API', () => {
    test('POST /checkin - 应该创建打卡记录', async () => {
      db.execute.mockResolvedValue([{ insertId: 1 }]);
      db.query
        .mockResolvedValueOnce([[]])  // 检查今天是否已打卡
        .mockResolvedValueOnce([[{ continuous_days: 5 }]]);  // 更新后的连续天数
      
      const checkinRouter = require('../src/routes/checkin');
      app.use('/api/v1/checkin', checkinRouter);
      
      const response = await request(app)
        .post('/api/v1/checkin')
        .send({ wordbank_id: 1 });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });

    test('GET /checkin/calendar - 应该返回打卡日历', async () => {
      const mockRecords = [
        { checkin_date: '2026-02-20', study_count: 10 },
        { checkin_date: '2026-02-19', study_count: 15 }
      ];
      db.query.mockResolvedValue([mockRecords]);
      
      const checkinRouter = require('../src/routes/checkin');
      app.use('/api/v1/checkin', checkinRouter);
      
      const response = await request(app)
        .get('/api/v1/checkin/calendar')
        .query({ month: '2026-02' });
      
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('用户 API', () => {
    test('GET /users/profile - 应该返回用户信息', async () => {
      const mockUser = {
        user_id: 1,
        nickname: 'TestUser',
        total_words: 100,
        mastered_words: 50
      };
      db.query.mockResolvedValue([[mockUser]]);
      
      const usersRouter = require('../src/routes/users');
      app.use('/api/v1/users', usersRouter);
      
      const response = await request(app)
        .get('/api/v1/users/profile');
      
      expect(response.status).toBe(200);
      expect(response.body.data.nickname).toBe('TestUser');
    });
  });
});
