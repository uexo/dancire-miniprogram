// backend/src/routes/words.js
const express = require('express');
const router = express.Router();
const db = require('../db');
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
    const [reviewWords] = await db.query(`
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
      const [existingWordIds] = await db.query(
        'SELECT word_id FROM learning_records WHERE user_id = ?',
        [userId]
      );
      const existingIds = existingWordIds.map(r => r.word_id);
      
      const [freshWords] = await db.query(`
        SELECT * FROM word_banks
        WHERE grade = ? 
          AND textbook_version = ?
          ${existingIds.length > 0 ? 'AND id NOT IN (?)' : ''}
        ORDER BY unit ASC, id ASC
        LIMIT ?
      `, [req.user.grade, req.user.textbook_version, existingIds, needNewWords]);
      
      newWords = freshWords;
    }

    // 3. 创建新单词的学习记录
    for (const word of newWords) {
      await db.query(`
        INSERT INTO learning_records 
        (user_id, word_id, status, next_review_at)
        VALUES (?, ?, 'new', NOW())
      `, [userId, word.id]);
    }

    // 4. 合并结果并生成选项（如果是选择题）
    const allWords = [...reviewWords, ...newWords];
    const wordsWithOptions = await generateOptions(allWords);

    res.json({
      success: true,
      data: wordsWithOptions
    });
  } catch (err) {
    console.error('获取今日任务失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 提交答案
router.post('/answer', authenticate, async (req, res) => {
  try {
    const { wordId, correct } = req.body;
    const userId = req.user.id;

    // 获取当前学习记录
    const [records] = await db.query(
      'SELECT * FROM learning_records WHERE user_id = ? AND word_id = ?',
      [userId, wordId]
    );

    if (records.length === 0) {
      return res.status(404).json({ success: false, message: '学习记录不存在' });
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

    // 更新数据库
    await db.query(`
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
      await db.query(`
        INSERT INTO wrong_words (user_id, word_id, wrong_count, last_wrong_at)
        VALUES (?, ?, 1, NOW())
        ON DUPLICATE KEY UPDATE
          wrong_count = wrong_count + 1,
          last_wrong_at = NOW()
      `, [userId, wordId]);
    }

    // 更新用户统计
    await updateUserStats(userId);

    res.json({
      success: true,
      data: {
        familiarity: newFamiliarity,
        status,
        isMastered,
        nextReviewAt
      }
    });
  } catch (err) {
    console.error('提交答案失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 生成选择题选项
async function generateOptions(words) {
  const wordIds = words.map(w => w.id);
  
  // 获取干扰项（同级别的其他单词释义）
  const [distractions] = await db.query(`
    SELECT meaning FROM word_banks
    WHERE id NOT IN (?)
    ORDER BY RAND()
    LIMIT ${words.length * 3}
  `, [wordIds]);

  return words.map((word, index) => {
    const options = [word.meaning];
    const startIdx = index * 3;
    for (let i = 0; i < 3 && distractions[startIdx + i]; i++) {
      options.push(distractions[startIdx + i].meaning);
    }
    
    // 打乱选项顺序
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

// 更新用户统计
async function updateUserStats(userId) {
  const [stats] = await db.query(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END) as mastered,
      SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END) as learning
    FROM learning_records
    WHERE user_id = ?
  `, [userId]);

  await db.query(`
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
