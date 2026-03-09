// src/modules/words/words.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import * as db from '../../common/database/db';
import {
  calculateNextReview,
  updateFamiliarity,
  isMastered,
} from '../../common/utils/algorithm';

@Injectable()
export class WordsService {
  /**
   * 获取今日学习任务
   */
  async getTodayTasks(user: any) {
    const userId = user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 1. 获取需要复习的单词
    const [reviewWords]: any = await db.query(
      `
      SELECT w.*, lr.familiarity, lr.review_count
      FROM learning_records lr
      JOIN word_banks w ON lr.word_id = w.id
      WHERE lr.user_id = ? 
        AND lr.next_review_at < ?
        AND lr.status != 'mastered'
      ORDER BY lr.next_review_at ASC
      LIMIT 20
    `,
      [userId, tomorrow],
    );

    // 2. 如果复习单词不足，补充新单词
    const needNewWords = 20 - (reviewWords?.length || 0);
    let newWords: any[] = [];

    if (needNewWords > 0) {
      const [existingWordIds]: any = await db.query(
        'SELECT word_id FROM learning_records WHERE user_id = ?',
        [userId],
      );
      const existingIds = existingWordIds?.map((r: any) => r.word_id) || [];

      // 使用事务批量获取新单词并创建学习记录
      newWords = await db.transaction(async (conn: any) => {
        // 安全处理数组参数
        let sql = `
          SELECT * FROM word_banks
          WHERE grade = ? 
            AND textbook_version = ?
        `;
        const params = [user.grade, user.textbook_version];

        if (existingIds.length > 0) {
          // 验证所有ID都是整数
          const validIds = existingIds.filter((id: any) => Number.isInteger(Number(id)));
          if (validIds.length > 0) {
            sql += ` AND id NOT IN (${validIds.map(() => '?').join(',')})`;
            params.push(...validIds);
          }
        }

        sql += ` ORDER BY unit ASC, id ASC LIMIT ?`;
        params.push(Math.min(needNewWords, 50));

        const [freshWords]: any = await conn.execute(sql, params);

        // 3. 批量创建新单词的学习记录（事务内）
        if (freshWords?.length > 0) {
          const values = freshWords.map(() => '(?, ?, ?, NOW())').join(',');
          const insertParams = freshWords.flatMap((word: any) => [userId, word.id, 'new']);

          await conn.execute(
            `
            INSERT INTO learning_records 
            (user_id, word_id, status, next_review_at)
            VALUES ${values}
            ON DUPLICATE KEY UPDATE
              status = VALUES(status),
              next_review_at = VALUES(next_review_at)
          `,
            insertParams,
          );
        }

        return freshWords || [];
      });
    }

    // 4. 合并结果并生成选项
    const allWords = [...(reviewWords || []), ...newWords];
    const wordsWithOptions = await this.generateOptions(allWords);

    return {
      success: true,
      data: wordsWithOptions,
    };
  }

  /**
   * 提交答案
   */
  async submitAnswer(userId: number, wordId: number, correct: boolean) {
    // 验证参数
    if (!wordId || typeof correct !== 'boolean') {
      throw new BadRequestException({
        success: false,
        message: '参数错误',
        code: 'INVALID_PARAMS',
      });
    }

    const result = await db.transaction(async (conn: any) => {
      // 获取当前学习记录
      const [records]: any = await conn.execute(
        'SELECT * FROM learning_records WHERE user_id = ? AND word_id = ?',
        [userId, wordId],
      );

      if (!records || records.length === 0) {
        throw new NotFoundException({
          success: false,
          message: '学习记录不存在',
          code: 'RECORD_NOT_FOUND',
        });
      }

      const record = records[0];

      // 更新熟悉度
      const newFamiliarity = updateFamiliarity(record.familiarity, correct);

      // 更新对错次数
      const correctCount = correct ? record.correct_count + 1 : record.correct_count;
      const wrongCount = correct ? record.wrong_count : record.wrong_count + 1;

      // 计算下次复习时间
      const nextReviewAt = calculateNextReview(newFamiliarity, wrongCount);

      // 判断是否已掌握
      const isMasteredStatus = isMastered(newFamiliarity, correctCount);
      const status = isMasteredStatus ? 'mastered' : 'learning';

      // 更新学习记录
      await conn.execute(
        `
        UPDATE learning_records
        SET familiarity = ?,
            correct_count = ?,
            wrong_count = ?,
            status = ?,
            next_review_at = ?,
            review_count = review_count + 1,
            last_studied_at = NOW()
        WHERE id = ?
      `,
        [newFamiliarity, correctCount, wrongCount, status, nextReviewAt, record.id],
      );

      // 如果是错题，加入错题本
      if (!correct) {
        await conn.execute(
          `
          INSERT INTO wrong_words (user_id, word_id, wrong_count, last_wrong_at)
          VALUES (?, ?, 1, NOW())
          ON DUPLICATE KEY UPDATE
            wrong_count = wrong_count + 1,
            last_wrong_at = NOW()
        `,
          [userId, wordId],
        );
      }

      // 更新用户统计
      await this.updateUserStats(conn, userId);

      return {
        familiarity: newFamiliarity,
        status,
        isMastered: isMasteredStatus,
        nextReviewAt,
      };
    });

    return {
      success: true,
      data: result,
    };
  }

  /**
   * 生成选择题选项 - 优化版（避免N+1查询）
   */
  private async generateOptions(words: any[]): Promise<any[]> {
    if (words.length === 0) return [];

    const wordIds = words.map((w) => w.id);
    const grades = [...new Set(words.map((w) => w.grade))];

    // 一次性获取干扰项（同级别）- 优化N+1查询
    const [distractions]: any = await db.query(
      `
      SELECT meaning, grade
      FROM word_banks
      WHERE id NOT IN (${wordIds.map(() => '?').join(',')})
        AND grade IN (${grades.map(() => '?').join(',')})
      ORDER BY RAND()
      LIMIT ?
    `,
      [...wordIds, ...grades, words.length * 4],
    );

    return words.map((word, index) => {
      // 筛选同级别的干扰项
      const relevantDistractions = (distractions || [])
        .filter((d: any) => d.grade === word.grade && d.meaning !== word.meaning)
        .slice(index * 3, index * 3 + 3)
        .map((d: any) => d.meaning);

      const options = [word.meaning, ...relevantDistractions];

      // Fisher-Yates 洗牌算法
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }

      return {
        ...word,
        options,
        correctIndex: options.indexOf(word.meaning),
      };
    });
  }

  /**
   * 更新用户统计 - 使用传入的连接（支持事务）
   */
  private async updateUserStats(conn: any, userId: number) {
    const [stats]: any = await conn.execute(
      `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END) as mastered,
        SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END) as learning
      FROM learning_records
      WHERE user_id = ?
    `,
      [userId],
    );

    await conn.execute(
      `
      INSERT INTO user_statistics 
      (user_id, total_words, mastered_words, learning_words, updated_at)
      VALUES (?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        total_words = VALUES(total_words),
        mastered_words = VALUES(mastered_words),
        learning_words = VALUES(learning_words),
        updated_at = NOW()
    `,
      [userId, stats[0].total, stats[0].mastered, stats[0].learning],
    );
  }
}
