// backend/src/routes/users.js
// 用户信息API

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// 获取用户信息
router.get('/info', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [users] = await db.query(
      `SELECT 
        id, nickname, avatar_url, phone, 
        grade, textbook_version, 
        is_vip, vip_expire_at,
        created_at
       FROM users WHERE id = ?`,
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: '用户不存在' });
    }
    
    const user = users[0];
    
    // 检查VIP是否过期
    const isVipValid = user.is_vip && user.vip_expire_at && new Date(user.vip_expire_at) > new Date();
    
    res.json({
      success: true,
      data: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatar_url,
        phone: user.phone,
        grade: user.grade,
        textbookVersion: user.textbook_version,
        isVip: isVipValid,
        vipExpireAt: user.vip_expire_at,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('获取用户信息失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新用户信息
router.put('/info', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { nickname, avatarUrl, grade, textbookVersion } = req.body;
    
    const updates = [];
    const values = [];
    
    if (nickname !== undefined) {
      updates.push('nickname = ?');
      values.push(nickname);
    }
    
    if (avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      values.push(avatarUrl);
    }
    
    if (grade !== undefined) {
      updates.push('grade = ?');
      values.push(grade);
    }
    
    if (textbookVersion !== undefined) {
      updates.push('textbook_version = ?');
      values.push(textbookVersion);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: '没有要更新的字段' });
    }
    
    values.push(userId);
    
    await db.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );
    
    res.json({ success: true, message: '更新成功' });
  } catch (err) {
    console.error('更新用户信息失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取用户统计
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // 单词统计
    const [wordStats] = await db.query(`
      SELECT 
        COUNT(*) as total_words,
        SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END) as mastered_words,
        SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END) as learning_words
      FROM learning_records 
      WHERE user_id = ?
    `, [userId]);
    
    // 打卡统计
    const [checkinStats] = await db.query(`
      SELECT 
        COUNT(*) as total_days,
        MAX(continuous_days) as continuous_days
      FROM checkin_records 
      WHERE user_id = ?
    `, [userId]);
    
    // 今日任务数
    const today = new Date().toISOString().split('T')[0];
    const [todayTasks] = await db.query(`
      SELECT COUNT(*) as count 
      FROM learning_records 
      WHERE user_id = ? 
        AND DATE(next_review_at) <= ?
        AND status != 'mastered'
    `, [userId, today]);
    
    res.json({
      success: true,
      data: {
        total_words: wordStats[0].total_words || 0,
        mastered_words: wordStats[0].mastered_words || 0,
        learning_words: wordStats[0].learning_words || 0,
        total_days: checkinStats[0].total_days || 0,
        continuous_days: checkinStats[0].continuous_days || 0,
        today_tasks: todayTasks[0].count || 0
      }
    });
  } catch (err) {
    console.error('获取用户统计失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取学习进度
router.get('/progress', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { grade } = req.query;
    
    // 获取该年级所有单词
    const [totalWords] = await db.query(`
      SELECT COUNT(*) as count 
      FROM word_banks 
      WHERE grade = ?
    `, [grade || req.user.grade]);
    
    // 获取已学习单词
    const [learnedWords] = await db.query(`
      SELECT COUNT(DISTINCT lr.word_id) as count
      FROM learning_records lr
      JOIN word_banks w ON lr.word_id = w.id
      WHERE lr.user_id = ? AND w.grade = ?
    `, [userId, grade || req.user.grade]);
    
    // 获取已掌握单词
    const [masteredWords] = await db.query(`
      SELECT COUNT(DISTINCT lr.word_id) as count
      FROM learning_records lr
      JOIN word_banks w ON lr.word_id = w.id
      WHERE lr.user_id = ? AND w.grade = ? AND lr.status = 'mastered'
    `, [userId, grade || req.user.grade]);
    
    const total = totalWords[0].count;
    const learned = learnedWords[0].count;
    const mastered = masteredWords[0].count;
    
    res.json({
      success: true,
      data: {
        total_words: total,
        learned_words: learned,
        mastered_words: mastered,
        progress_percent: total > 0 ? Math.round((learned / total) * 100) : 0,
        mastery_percent: total > 0 ? Math.round((mastered / total) * 100) : 0
      }
    });
  } catch (err) {
    console.error('获取学习进度失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
