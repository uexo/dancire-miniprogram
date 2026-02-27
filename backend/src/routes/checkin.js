// backend/src/routes/checkin.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// 获取本月打卡数据
router.get('/month', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    // 获取本月所有打卡记录
    const [checkins] = await db.query(
      `SELECT DAY(checkin_date) as day, continuous_days 
       FROM checkin_records 
       WHERE user_id = ? AND YEAR(checkin_date) = ? AND MONTH(checkin_date) = ?
       ORDER BY checkin_date ASC`,
      [userId, year, month]
    );
    
    const checkinDays = checkins.map(c => c.day);
    
    // 获取连续打卡天数（最新一条记录）
    const latestCheckin = checkins[checkins.length - 1];
    const continuousDays = latestCheckin ? latestCheckin.continuous_days : 0;
    
    // 获取累计打卡天数
    const [totalResult] = await db.query(
      'SELECT COUNT(*) as total FROM checkin_records WHERE user_id = ?',
      [userId]
    );
    
    // 检查今日是否已打卡
    const today = new Date().toISOString().split('T')[0];
    const [todayCheckin] = await db.query(
      'SELECT id FROM checkin_records WHERE user_id = ? AND checkin_date = ?',
      [userId, today]
    );
    
    res.json({
      success: true,
      data: {
        checkinDays,
        continuousDays,
        totalDays: totalResult[0].total,
        todayCheckin: todayCheckin.length > 0,
        rewards: getRewardsStatus(continuousDays)
      }
    });
  } catch (err) {
    console.error('获取打卡数据失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 今日打卡
router.post('/today', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    // 检查是否已打卡
    const [existing] = await db.query(
      'SELECT id FROM checkin_records WHERE user_id = ? AND checkin_date = ?',
      [userId, today]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: '今日已打卡' });
    }
    
    // 计算连续打卡天数
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    const [yesterdayCheckin] = await db.query(
      'SELECT continuous_days FROM checkin_records WHERE user_id = ? AND checkin_date = ?',
      [userId, yesterdayStr]
    );
    
    const continuousDays = yesterdayCheckin.length > 0 
      ? yesterdayCheckin[0].continuous_days + 1 
      : 1;
    
    // 获取今日学习统计
    const [todayStats] = await db.query(
      `SELECT COUNT(*) as studied_words, 
              AVG(correct_count / (correct_count + wrong_count)) as accuracy
       FROM learning_records 
       WHERE user_id = ? AND DATE(last_studied_at) = ?`,
      [userId, today]
    );
    
    const stats = todayStats[0];
    const studiedWords = stats.studied_words || 0;
    const accuracy = stats.accuracy ? Math.round(stats.accuracy * 100) : 0;
    
    // 创建打卡记录
    await db.query(
      `INSERT INTO checkin_records 
       (user_id, checkin_date, continuous_days, studied_words, accuracy) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, today, continuousDays, studiedWords, accuracy]
    );
    
    // 计算奖励
    const coin = calculateCoin(continuousDays);
    const reward = getReward(continuousDays);
    
    res.json({
      success: true,
      data: {
        continuousDays,
        coin,
        reward,
        message: `连续打卡${continuousDays}天，获得${coin}金币！`
      }
    });
  } catch (err) {
    console.error('打卡失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 领取连续打卡奖励
router.post('/claim-reward', authenticate, async (req, res) => {
  try {
    const { day } = req.body;
    const userId = req.user.id;
    
    // 检查是否达到天数
    const [latest] = await db.query(
      'SELECT continuous_days FROM checkin_records WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 1',
      [userId]
    );
    
    if (latest.length === 0 || latest[0].continuous_days < day) {
      return res.status(400).json({ success: false, message: '未达到领取条件' });
    }
    
    // 奖励配置
    const rewardConfig = {
      1: { coin: 10 },
      3: { coin: 30 },
      7: { coin: 100 },
      15: { coin: 200 },
      30: { coin: 500 }
    };
    
    const reward = rewardConfig[day];
    if (!reward) {
      return res.status(400).json({ success: false, message: '奖励不存在' });
    }
    
    // TODO: 检查是否已领取（需要额外表记录）
    
    res.json({
      success: true,
      data: {
        coin: reward.coin,
        message: `获得${reward.coin}金币！`
      }
    });
  } catch (err) {
    console.error('领取奖励失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 计算金币奖励
function calculateCoin(continuousDays) {
  const baseCoin = 10;
  const bonus = Math.min(continuousDays * 2, 50); // 连续天数加成，最高50
  return baseCoin + bonus;
}

// 获取连续打卡奖励状态
function getRewardsStatus(continuousDays) {
  const rewards = [
    { day: 1, coin: 10 },
    { day: 3, coin: 30 },
    { day: 7, coin: 100 },
    { day: 15, coin: 200 },
    { day: 30, coin: 500 }
  ];
  
  return rewards.map(r => ({
    ...r,
    canClaim: continuousDays >= r.day,
    claimed: false // TODO: 从数据库获取实际状态
  }));
}

// 获取特殊奖励
function getReward(continuousDays) {
  if (continuousDays === 7) {
    return { name: '7天成就勋章', type: 'badge' };
  } else if (continuousDays === 30) {
    return { name: '30天超级学霸', type: 'title' };
  }
  return null;
}

module.exports = router;
