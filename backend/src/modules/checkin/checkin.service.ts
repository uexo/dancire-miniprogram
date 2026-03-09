// src/modules/checkin/checkin.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { db } from '../../config/database.config';
import { ClaimRewardDto } from './dto/checkin.dto';

@Injectable()
export class CheckinService {
  /**
   * 获取本月打卡数据
   */
  async getMonthCheckins(userId: number) {
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

    const checkinDays = checkins.map((c: any) => c.day);

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

    return {
      success: true,
      data: {
        checkinDays,
        continuousDays,
        totalDays: totalResult[0].total,
        todayCheckin: todayCheckin.length > 0,
        rewards: this.getRewardsStatus(continuousDays),
      },
    };
  }

  /**
   * 今日打卡
   */
  async checkinToday(userId: number) {
    const today = new Date().toISOString().split('T')[0];

    // 检查是否已打卡
    const [existing] = await db.query(
      'SELECT id FROM checkin_records WHERE user_id = ? AND checkin_date = ?',
      [userId, today]
    );

    if (existing.length > 0) {
      throw new HttpException(
        { success: false, message: '今日已打卡' },
        HttpStatus.BAD_REQUEST
      );
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
    const coin = this.calculateCoin(continuousDays);
    const reward = this.getReward(continuousDays);

    return {
      success: true,
      data: {
        continuousDays,
        coin,
        reward,
        message: `连续打卡${continuousDays}天，获得${coin}金币！`,
      },
    };
  }

  /**
   * 领取连续打卡奖励
   */
  async claimReward(userId: number, dto: ClaimRewardDto) {
    const { day } = dto;

    // 检查是否达到天数
    const [latest] = await db.query(
      'SELECT continuous_days FROM checkin_records WHERE user_id = ? ORDER BY checkin_date DESC LIMIT 1',
      [userId]
    );

    if (latest.length === 0 || latest[0].continuous_days < day) {
      throw new HttpException(
        { success: false, message: '未达到领取条件' },
        HttpStatus.BAD_REQUEST
      );
    }

    // 奖励配置
    const rewardConfig: Record<number, { coin: number }> = {
      1: { coin: 10 },
      3: { coin: 30 },
      7: { coin: 100 },
      15: { coin: 200 },
      30: { coin: 500 },
    };

    const reward = rewardConfig[day];
    if (!reward) {
      throw new HttpException(
        { success: false, message: '奖励不存在' },
        HttpStatus.BAD_REQUEST
      );
    }

    return {
      success: true,
      data: {
        coin: reward.coin,
        message: `获得${reward.coin}金币！`,
      },
    };
  }

  /**
   * 计算金币奖励
   */
  private calculateCoin(continuousDays: number): number {
    const baseCoin = 10;
    const bonus = Math.min(continuousDays * 2, 50);
    return baseCoin + bonus;
  }

  /**
   * 获取连续打卡奖励状态
   */
  private getRewardsStatus(continuousDays: number) {
    const rewards = [
      { day: 1, coin: 10 },
      { day: 3, coin: 30 },
      { day: 7, coin: 100 },
      { day: 15, coin: 200 },
      { day: 30, coin: 500 },
    ];

    return rewards.map((r) => ({
      ...r,
      canClaim: continuousDays >= r.day,
      claimed: false,
    }));
  }

  /**
   * 获取特殊奖励
   */
  private getReward(continuousDays: number) {
    if (continuousDays === 7) {
      return { name: '7天成就勋章', type: 'badge' };
    } else if (continuousDays === 30) {
      return { name: '30天超级学霸', type: 'title' };
    }
    return null;
  }
}
