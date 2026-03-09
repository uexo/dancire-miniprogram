// src/modules/users/users.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { db } from '../../config/database.config';
import { UpdateUserInfoDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  /**
   * 获取用户信息
   */
  async getUserInfo(userId: number) {
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
      throw new HttpException(
        { success: false, message: '用户不存在' },
        HttpStatus.NOT_FOUND
      );
    }

    const user = users[0];

    // 检查VIP是否过期
    const isVipValid = user.is_vip && user.vip_expire_at && new Date(user.vip_expire_at) > new Date();

    return {
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
        createdAt: user.created_at,
      },
    };
  }

  /**
   * 更新用户信息
   */
  async updateUserInfo(userId: number, dto: UpdateUserInfoDto) {
    const updates: string[] = [];
    const values: any[] = [];

    if (dto.nickname !== undefined) {
      updates.push('nickname = ?');
      values.push(dto.nickname);
    }

    if (dto.avatarUrl !== undefined) {
      updates.push('avatar_url = ?');
      values.push(dto.avatarUrl);
    }

    if (dto.grade !== undefined) {
      updates.push('grade = ?');
      values.push(dto.grade);
    }

    if (dto.textbookVersion !== undefined) {
      updates.push('textbook_version = ?');
      values.push(dto.textbookVersion);
    }

    if (updates.length === 0) {
      throw new HttpException(
        { success: false, message: '没有要更新的字段' },
        HttpStatus.BAD_REQUEST
      );
    }

    values.push(userId);

    await db.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      values
    );

    return { success: true, message: '更新成功' };
  }

  /**
   * 获取用户统计
   */
  async getUserStats(userId: number) {
    // 单词统计
    const [wordStats] = await db.query(
      `SELECT 
        COUNT(*) as total_words,
        SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END) as mastered_words,
        SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END) as learning_words
      FROM learning_records 
      WHERE user_id = ?`,
      [userId]
    );

    // 打卡统计
    const [checkinStats] = await db.query(
      `SELECT 
        COUNT(*) as total_days,
        MAX(continuous_days) as continuous_days
      FROM checkin_records 
      WHERE user_id = ?`,
      [userId]
    );

    // 今日任务数
    const today = new Date().toISOString().split('T')[0];
    const [todayTasks] = await db.query(
      `SELECT COUNT(*) as count 
       FROM learning_records 
       WHERE user_id = ? 
         AND DATE(next_review_at) <= ?
         AND status != 'mastered'`,
      [userId, today]
    );

    return {
      success: true,
      data: {
        total_words: wordStats[0].total_words || 0,
        mastered_words: wordStats[0].mastered_words || 0,
        learning_words: wordStats[0].learning_words || 0,
        total_days: checkinStats[0].total_days || 0,
        continuous_days: checkinStats[0].continuous_days || 0,
        today_tasks: todayTasks[0].count || 0,
      },
    };
  }

  /**
   * 获取学习进度
   */
  async getLearningProgress(userId: number, grade?: number) {
    // 先获取用户年级
    const [users] = await db.query(
      'SELECT grade FROM users WHERE id = ?',
      [userId]
    );

    const targetGrade = grade || users[0]?.grade || 3;

    // 获取该年级所有单词
    const [totalWords] = await db.query(
      `SELECT COUNT(*) as count 
       FROM word_banks 
       WHERE grade = ?`,
      [targetGrade]
    );

    // 获取已学习单词
    const [learnedWords] = await db.query(
      `SELECT COUNT(DISTINCT lr.word_id) as count
       FROM learning_records lr
       JOIN word_banks w ON lr.word_id = w.id
       WHERE lr.user_id = ? AND w.grade = ?`,
      [userId, targetGrade]
    );

    // 获取已掌握单词
    const [masteredWords] = await db.query(
      `SELECT COUNT(DISTINCT lr.word_id) as count
       FROM learning_records lr
       JOIN word_banks w ON lr.word_id = w.id
       WHERE lr.user_id = ? AND w.grade = ? AND lr.status = 'mastered'`,
      [userId, targetGrade]
    );

    const total = totalWords[0].count;
    const learned = learnedWords[0].count;
    const mastered = masteredWords[0].count;

    return {
      success: true,
      data: {
        total_words: total,
        learned_words: learned,
        mastered_words: mastered,
        progress_percent: total > 0 ? Math.round((learned / total) * 100) : 0,
        mastery_percent: total > 0 ? Math.round((mastered / total) * 100) : 0,
      },
    };
  }
}
