// backend/src/routes/words.js - 优化版
const express = require('express');
const router = express.Router();
const { query, transaction } = require('../db');
const algorithm = require('../utils/algorithm');
const { authenticate } = require('../middleware/auth');

// 获取今日学习任务
router.get('/today', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. 获取需要复习的单词
    const [reviewWords] = await query(`
      SELECT w.*, lr.familiarity, lr.review_count
      FROM learning_records lr
      JOIN word_banks w ON lr.word_id = w.id
      WHERE lr.user_id = ? 
        AND lr.next_review_at < ?
        AND lr.status != 'mastered'
      ORDER BY lr.next_review_at ASC
      LIMIT 20
    `, [userId, tomorrow]);

    // 2. 如果复习单词不足，补充新单词
    const needNewWords = 20 - reviewWords.length;
    let newWords = [];
    
    if (needNewWords > 0) {
      const [existingWordIds] = await query(
        'SELECT word_id FROM learning_records WHERE user_id = ?',
        [userId]
      );
      const existingIds = existingWordIds.map(r => r.word_id);
      
      // 使用事务批量获取新单词并创建学习记录
      newWords = await transaction(async (conn) => {
        // 安全处理数组参数 - 修复 SQL 注入风险
        let sql = `
          SELECT * FROM word_banks
          WHERE grade = ? 
            AND textbook_version = ?
        `;
        const params = [req.user.grade, req.user.textbook_version];
        
        if (existingIds.length > 0) {
          // 验证所有ID都是整数
          const validIds = existingIds.filter(id => Number.isInteger(Number(id)));
          if (validIds.length > 0) {
            sql += ` AND id NOT IN (${validIds.map(() => '?').join(',')})`;
            params.push(...validIds);
          }
        }
        
        sql += ` ORDER BY unit ASC, id ASC LIMIT ?`;
        params.push(Math.min(needNewWords, 50));
        
        const [freshWords] = await conn.execute(sql, params);
        
        // 3. 批量创建新单词的学习记录（事务内）
        if (freshWords.length > 0) {
          const values = freshWords.map(() => '(?, ?, ?, NOW())').join(',');
          const insertParams = freshWords.flatMap(word => [userId, word.id, 'new']);
          
          await conn.execute(`
            INSERT INTO learning_records 
            (user_id, word_id, status, next_review_at)
            VALUES ${values}
            ON DUPLICATE KEY UPDATE
              status = VALUES(status),
              next_review_at = VALUES(next_review_at)
          `, insertParams);
        }
        
        return freshWords;
      });
    }

    // 4. 合并结果并生成选项
    const allWords = [...reviewWords, ...newWords];
    const wordsWithOptions = await generateOptions(allWords);

    res.json({
      success: true,
      data: wordsWithOptions
    });
  } catch (err) {
    console.error('获取今日任务失败:', err);
    res.status(500).json({ success: false, message: '服务器错误', code: 'SERVER_ERROR' });
  }
});

// 提交答案
router.post('/answer', authenticate, async (req, res) => {
  try {
    const { wordId, correct } = req.body;
    const userId = req.user.id;

    // 验证参数
    if (!wordId || typeof correct !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        message: '参数错误',
        code: 'INVALID_PARAMS'
      });
    }

    const result = await transaction(async (conn) => {
      // 获取当前学习记录
      const [records] = await conn.execute(
        'SELECT * FROM learning_records WHERE user_id = ? AND word_id = ?',
        [userId, wordId]
      );

      if (records.length === 0) {
        throw { status: 404, message: '学习记录不存在', code: 'RECORD_NOT_FOUND' };
      }

      const record = records[0];
      
      // 更新熟悉度
      const newFamiliarity = algorithm.updateFamiliarity(
        record.familiarity,
        correct
      );

      // 更新对错次数
      const correctCount = correct ? record.correct_count + 1 : record.correct_count;
      const wrongCount = correct ? record.wrong_count : record.wrong_count + 1;

      // 计算下次复习时间
      const nextReviewAt = algorithm.calculateNextReview(newFamiliarity, wrongCount);

      // 判断是否已掌握
      const isMastered = algorithm.isMastered(newFamiliarity, correctCount);
      const status = isMastered ? 'mastered' : 'learning';

      // 更新学习记录
      await conn.execute(`
        UPDATE learning_records
        SET familiarity = ?,
            correct_count = ?,
            wrong_count = ?,
            status = ?,
            next_review_at = ?,
            review_count = review_count + 1,
            last_studied_at = NOW()
        WHERE id = ?
      `, [newFamiliarity, correctCount, wrongCount, status, nextReviewAt, record.id]);

      // 如果是错题，加入错题本
      if (!correct) {
        await conn.execute(`
          INSERT INTO wrong_words (user_id, word_id, wrong_count, last_wrong_at)
          VALUES (?, ?, 1, NOW())
          ON DUPLICATE KEY UPDATE
            wrong_count = wrong_count + 1,
            last_wrong_at = NOW()
        `, [userId, wordId]);
      }

      // 更新用户统计
      await updateUserStats(conn, userId);

      return {
        familiarity: newFamiliarity,
        status,
        isMastered,
        nextReviewAt
      };
    });

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('提交答案失败:', err);
    if (err.status) {
      return res.status(err.status).json({ 
        success: false, 
        message: err.message,
        code: err.code
      });
    }
    res.status(500).json({ 
      success: false, 
      message: '服务器错误',
      code: 'SERVER_ERROR'
    });
  }
});

// 生成选择题选项 - 优化版（避免N+1查询）
async function generateOptions(words) {
  if (words.length === 0) return [];
  
  const wordIds = words.map(w => w.id);
  const grades = [...new Set(words.map(w => w.grade))];
  
  // 一次性获取干扰项（同级别）- 优化N+1查询
  const [distractions] = await query(`
    SELECT meaning, grade
    FROM word_banks
    WHERE id NOT IN (${wordIds.map(() => '?').join(',')})
      AND grade IN (${grades.map(() => '?').join(',')})
    ORDER BY RAND()
    LIMIT ?
  `, [...wordIds, ...grades, words.length * 4]);

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

// 更新用户统计 - 使用传入的连接（支持事务）
async function updateUserStats(conn, userId) {
  const [stats] = await conn.execute(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END) as mastered,
      SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END) as learning
    FROM learning_records
    WHERE user_id = ?
  `, [userId]);

  await conn.execute(`
    INSERT INTO user_statistics 
    (user_id, total_words, mastered_words, learning_words, updated_at)
    VALUES (?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      total_words = VALUES(total_words),
      mastered_words = VALUES(mastered_words),
      learning_words = VALUES(learning_words),
      updated_at = NOW()
  `, [userId, stats[0].total, stats[0].mastered, stats[0].learning]);
}

module.exports = router;
