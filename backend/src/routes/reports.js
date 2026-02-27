// backend/src/routes/reports.js
// 学习报告API - 家长报告页数据接口

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// 获取学习统计数据
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = req.query.childId || req.user.id;
    
    // 1. 获取单词学习统计
    const [wordStats] = await db.query(`
      SELECT 
        COUNT(*) as total_words,
        SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END) as mastered_words,
        SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END) as learning_words,
        AVG(familiarity) as avg_familiarity
      FROM learning_records 
      WHERE user_id = ?
    `, [userId]);
    
    // 2. 获取正确率统计
    const [accuracyStats] = await db.query(`
      SELECT 
        SUM(correct_count) as total_correct,
        SUM(wrong_count) as total_wrong
      FROM learning_records 
      WHERE user_id = ? AND (correct_count > 0 OR wrong_count > 0)
    `, [userId]);
    
    const totalAttempts = (accuracyStats[0].total_correct || 0) + (accuracyStats[0].total_wrong || 0);
    const accuracy = totalAttempts > 0 
      ? Math.round((accuracyStats[0].total_correct / totalAttempts) * 100) 
      : 0;
    
    // 3. 获取学习时长统计（从打卡记录）
    const [timeStats] = await db.query(`
      SELECT 
        SUM(studied_words * 0.5) as estimated_minutes
      FROM checkin_records 
      WHERE user_id = ?
    `, [userId]);
    
    // 4. 获取打卡统计
    const [checkinStats] = await db.query(`
      SELECT 
        COUNT(*) as total_days,
        MAX(continuous_days) as max_continuous_days
      FROM checkin_records 
      WHERE user_id = ?
    `, [userId]);
    
    // 5. 获取当前连续打卡天数
    const [latestCheckin] = await db.query(`
      SELECT continuous_days 
      FROM checkin_records 
      WHERE user_id = ? 
      ORDER BY checkin_date DESC 
      LIMIT 1
    `, [userId]);
    
    // 6. 获取孩子名字（如果是家长查看）
    const [userInfo] = await db.query(
      'SELECT nickname FROM users WHERE id = ?',
      [userId]
    );
    
    res.json({
      success: true,
      data: {
        total_words: wordStats[0].total_words || 0,
        mastered_words: wordStats[0].mastered_words || 0,
        learning_words: wordStats[0].learning_words || 0,
        accuracy: accuracy,
        avg_familiarity: Math.round(wordStats[0].avg_familiarity || 0),
        study_minutes: Math.round(timeStats[0].estimated_minutes || 0),
        total_days: checkinStats[0].total_days || 0,
        continuous_days: latestCheckin[0]?.continuous_days || 0,
        max_continuous_days: checkinStats[0].max_continuous_days || 0,
        child_name: userInfo[0]?.nickname || '孩子'
      }
    });
  } catch (err) {
    console.error('获取学习统计失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取记忆曲线数据
router.get('/memory-curve', authenticate, async (req, res) => {
  try {
    const userId = req.query.childId || req.user.id;
    const days = parseInt(req.query.days) || 30;
    
    // 获取近30天的学习记录和复习情况
    const [reviewRecords] = await db.query(`
      SELECT 
        DATEDIFF(NOW(), next_review_at) as day_offset,
        familiarity,
        review_count,
        correct_count,
        wrong_count
      FROM learning_records 
      WHERE user_id = ? 
        AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY created_at DESC
    `, [userId, days]);
    
    // 计算每天的记忆保持率
    const curveData = [];
    const now = new Date();
    
    for (let i = 0; i <= days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // 查找当天的学习记录
      const dayRecords = reviewRecords.filter(r => {
        const recordDate = new Date(r.next_review_at);
        return recordDate.toISOString().split('T')[0] === dateStr;
      });
      
      if (dayRecords.length > 0) {
        // 计算平均熟悉度作为记忆保持率
        const avgFamiliarity = dayRecords.reduce((sum, r) => sum + r.familiarity, 0) / dayRecords.length;
        const reviewedCount = dayRecords.filter(r => r.review_count > 0).length;
        
        curveData.push({
          day_offset: i,
          retention: avgFamiliarity,
          reviewed: reviewedCount > 0,
          word_count: dayRecords.length
        });
      }
    }
    
    res.json({
      success: true,
      data: curveData
    });
  } catch (err) {
    console.error('获取记忆曲线失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取打卡日历数据
router.get('/calendar', authenticate, async (req, res) => {
  try {
    const userId = req.query.childId || req.user.id;
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || (new Date().getMonth() + 1);
    
    // 获取指定月份的打卡记录
    const [checkins] = await db.query(`
      SELECT 
        DAY(checkin_date) as day,
        studied_words,
        accuracy,
        continuous_days
      FROM checkin_records 
      WHERE user_id = ? 
        AND YEAR(checkin_date) = ? 
        AND MONTH(checkin_date) = ?
      ORDER BY checkin_date ASC
    `, [userId, year, month]);
    
    const studyDays = checkins.map(c => c.day);
    
    // 构建每日统计
    const dailyStats = {};
    checkins.forEach(c => {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`;
      dailyStats[dateStr] = {
        studied_words: c.studied_words,
        accuracy: c.accuracy,
        continuous_days: c.continuous_days
      };
    });
    
    res.json({
      success: true,
      data: {
        study_days: studyDays,
        daily_stats: dailyStats,
        total_checkins: checkins.length
      }
    });
  } catch (err) {
    console.error('获取日历数据失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取错题本
router.get('/wrong-words', authenticate, async (req, res) => {
  try {
    const userId = req.query.childId || req.user.id;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;
    
    // 获取错题总数
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total 
      FROM wrong_words 
      WHERE user_id = ?
    `, [userId]);
    
    const total = countResult[0].total;
    
    // 获取错题列表
    const [wrongWords] = await db.query(`
      SELECT 
        w.id,
        w.word,
        w.phonetic,
        w.meaning,
        w.audio_url,
        ww.wrong_count,
        ww.last_wrong_at,
        lr.familiarity
      FROM wrong_words ww
      JOIN word_banks w ON ww.word_id = w.id
      LEFT JOIN learning_records lr ON lr.word_id = w.id AND lr.user_id = ?
      WHERE ww.user_id = ?
      ORDER BY ww.wrong_count DESC, ww.last_wrong_at DESC
      LIMIT ? OFFSET ?
    `, [userId, userId, pageSize, offset]);
    
    // 格式化数据
    const formattedWords = wrongWords.map(w => ({
      id: w.id,
      word: w.word,
      phonetic: w.phonetic,
      meaning: w.meaning,
      audio_url: w.audio_url,
      wrong_count: w.wrong_count,
      familiarity: w.familiarity || 0,
      last_wrong_at: formatDate(w.last_wrong_at)
    }));
    
    res.json({
      success: true,
      data: {
        words: formattedWords,
        total: total,
        page: page,
        pageSize: pageSize
      }
    });
  } catch (err) {
    console.error('获取错题本失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 格式化日期
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

module.exports = router;
