// src/modules/wordbank/wordbank.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { db } from '../../config/database.config';
import { SearchWordsDto, CreateWordDto, UpdateWordDto } from './dto/wordbank.dto';

@Injectable()
export class WordbankService {
  /**
   * 获取所有词库版本
   */
  async getVersions() {
    const [versions] = await db.query(
      `SELECT id, version, description, total_words, created_at 
       FROM word_versions 
       ORDER BY created_at DESC`
    );

    return {
      success: true,
      data: versions,
    };
  }

  /**
   * 获取指定版本详情
   */
  async getVersionDetail(id: number) {
    const [versions] = await db.query(
      'SELECT * FROM word_versions WHERE id = ?',
      [id]
    );

    if (versions.length === 0) {
      throw new HttpException(
        { success: false, message: '版本不存在' },
        HttpStatus.NOT_FOUND
      );
    }

    // 获取年级分布统计
    const [gradeStats] = await db.query(
      `SELECT grade, COUNT(*) as word_count 
       FROM word_banks 
       WHERE version = ? 
       GROUP BY grade 
       ORDER BY grade`,
      [id]
    );

    return {
      success: true,
      data: {
        ...versions[0],
        grade_stats: gradeStats,
      },
    };
  }

  /**
   * 获取单词列表
   */
  async getWords(query: SearchWordsDto) {
    const {
      version,
      grade,
      unit,
      keyword,
      difficulty,
      tag,
      page = 1,
      pageSize = 20,
    } = query;

    const whereConditions: string[] = ['1=1'];
    const params: any[] = [];

    if (version) {
      whereConditions.push('version = ?');
      params.push(version);
    }

    if (grade) {
      whereConditions.push('grade = ?');
      params.push(grade);
    }

    if (unit) {
      whereConditions.push('unit = ?');
      params.push(unit);
    }

    if (keyword) {
      whereConditions.push('(word LIKE ? OR meaning LIKE ?)');
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (difficulty) {
      whereConditions.push('difficulty = ?');
      params.push(difficulty);
    }

    if (tag) {
      whereConditions.push('JSON_CONTAINS(tags, ?)');
      params.push(`"${tag}"`);
    }

    const whereClause = whereConditions.join(' AND ');

    // 获取总数
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM word_banks WHERE ${whereClause}`,
      params
    );

    const total = countResult[0].total;
    const offset = (page - 1) * pageSize;

    // 获取单词列表
    const [words] = await db.query(
      `SELECT 
        id, word, phonetic, meaning, pos, 
        example, example_translation, difficulty,
        grade, unit, tags
       FROM word_banks 
       WHERE ${whereClause}
       ORDER BY grade, unit, id
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    // 解析tags JSON
    const formattedWords = words.map((w: any) => ({
      ...w,
      tags: JSON.parse(w.tags || '[]'),
    }));

    return {
      success: true,
      data: {
        words: formattedWords,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 获取单词详情
   */
  async getWordDetail(userId: number, wordId: number) {
    // 获取单词信息
    const [words] = await db.query(
      `SELECT * FROM word_banks WHERE id = ?`,
      [wordId]
    );

    if (words.length === 0) {
      throw new HttpException(
        { success: false, message: '单词不存在' },
        HttpStatus.NOT_FOUND
      );
    }

    const word = words[0];

    // 获取用户学习记录
    const [learningRecords] = await db.query(
      `SELECT familiarity, status, review_count, correct_count, wrong_count
       FROM learning_records 
       WHERE user_id = ? AND word_id = ?`,
      [userId, wordId]
    );

    return {
      success: true,
      data: {
        ...word,
        tags: JSON.parse(word.tags || '[]'),
        learning_status: learningRecords[0] || null,
      },
    };
  }

  /**
   * 搜索单词
   */
  async searchWords(q: string, limit: number = 10) {
    if (!q || q.length < 2) {
      throw new HttpException(
        { success: false, message: '搜索关键词至少需要2个字符' },
        HttpStatus.BAD_REQUEST
      );
    }

    const [words] = await db.query(
      `SELECT 
        id, word, phonetic, meaning, 
        grade, unit
       FROM word_banks 
       WHERE word LIKE ? OR meaning LIKE ? OR phonetic LIKE ?
       ORDER BY 
         CASE 
           WHEN word = ? THEN 0
           WHEN word LIKE ? THEN 1
           ELSE 2
         END,
         word
       LIMIT ?`,
      [q, `%${q}%`, `%${q}%`, q, `${q}%`, limit]
    );

    return {
      success: true,
      data: words,
    };
  }

  /**
   * 获取年级/单元列表
   */
  async getGradeUnits(version?: string) {
    let whereClause = '1=1';
    const params: any[] = [];

    if (version) {
      whereClause = 'version = ?';
      params.push(version);
    }

    const [results] = await db.query(
      `SELECT DISTINCT grade, unit 
       FROM word_banks 
       WHERE ${whereClause}
       ORDER BY grade, unit`,
      params
    );

    // 组织为层级结构
    const gradeMap = new Map();

    for (const { grade, unit } of results) {
      if (!gradeMap.has(grade)) {
        gradeMap.set(grade, []);
      }
      gradeMap.get(grade).push(unit);
    }

    const grades = [];
    for (const [grade, units] of gradeMap) {
      grades.push({ grade, units });
    }

    return {
      success: true,
      data: grades,
    };
  }

  /**
   * 获取标签列表
   */
  async getTags() {
    const [words] = await db.query('SELECT tags FROM word_banks');

    const tagSet = new Set();

    for (const { tags } of words) {
      try {
        const tagList = JSON.parse(tags || '[]');
        tagList.forEach((tag: string) => tagSet.add(tag));
      } catch (e) {
        // 忽略解析错误
      }
    }

    return {
      success: true,
      data: Array.from(tagSet).sort(),
    };
  }

  /**
   * 添加单词
   */
  async createWord(dto: CreateWordDto) {
    if (!dto.word || !dto.meaning) {
      throw new HttpException(
        { success: false, message: '单词和释义不能为空' },
        HttpStatus.BAD_REQUEST
      );
    }

    try {
      const [result] = await db.query(
        `INSERT INTO word_banks 
         (word, phonetic, meaning, pos, example, example_translation,
          difficulty, grade, unit, tags, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          dto.word,
          dto.phonetic || '',
          dto.meaning,
          dto.pos || '',
          dto.example || '',
          dto.example_translation || '',
          dto.difficulty || 1,
          dto.grade || 1,
          dto.unit || 1,
          JSON.stringify(dto.tags || []),
        ]
      );

      return {
        success: true,
        data: { id: result.insertId },
        message: '单词添加成功',
      };
    } catch (err: any) {
      if (err.code === 'ER_DUP_ENTRY') {
        throw new HttpException(
          { success: false, message: '单词已存在' },
          HttpStatus.BAD_REQUEST
        );
      }
      throw err;
    }
  }

  /**
   * 更新单词
   */
  async updateWord(id: number, dto: UpdateWordDto) {
    const allowedFields = [
      'word', 'phonetic', 'meaning', 'pos', 'example',
      'example_translation', 'difficulty', 'grade', 'unit', 'tags'
    ];

    const setClauses: string[] = [];
    const values: any[] = [];

    for (const field of allowedFields) {
      if (dto[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        values.push(field === 'tags' ? JSON.stringify(dto[field]) : dto[field]);
      }
    }

    if (setClauses.length === 0) {
      throw new HttpException(
        { success: false, message: '没有要更新的字段' },
        HttpStatus.BAD_REQUEST
      );
    }

    values.push(id);

    await db.query(
      `UPDATE word_banks SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    return {
      success: true,
      message: '单词更新成功',
    };
  }

  /**
   * 删除单词
   */
  async deleteWord(id: number) {
    await db.query('DELETE FROM word_banks WHERE id = ?', [id]);

    return {
      success: true,
      message: '单词删除成功',
    };
  }
}
