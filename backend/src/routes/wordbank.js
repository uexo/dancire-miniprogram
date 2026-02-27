// backend/src/routes/wordbank.js
// 词库管理API

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// ========== 词库版本管理 ==========

// 获取所有词库版本
router.get('/versions', async (req, res) => {
  try {
    const [versions] = await db.query(
      `SELECT id, version, description, total_words, created_at 
       FROM word_versions 
       ORDER BY created_at DESC`
    );
    
    res.json({
      success: true,
      data: versions
    });
  } catch (err) {
    console.error('获取词库版本失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取指定版本详情
router.get('/versions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [versions] = await db.query(
      'SELECT * FROM word_versions WHERE id = ?',
      [id]
    );
    
    if (versions.length === 0) {
      return res.status(404).json({ success: false, message: '版本不存在' });
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
    
    res.json({
      success: true,
      data: {
        ...versions[0],
        grade_stats: gradeStats
      }
    });
  } catch (err) {
    console.error('获取版本详情失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 单词查询 ==========

// 获取单词列表（支持筛选）
router.get('/words', authenticate, async (req, res) => {
  try {
    const {
      version,
      grade,
      unit,
      keyword,
      difficulty,
      tag,
      page = 1,
      pageSize = 20
    } = req.query;
    
    let whereConditions = ['1=1'];
    let params = [];
    
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
      [...params, parseInt(pageSize), parseInt(offset)]
    );
    
    // 解析tags JSON
    const formattedWords = words.map(w => ({
      ...w,
      tags: JSON.parse(w.tags || '[]')
    }));
    
    res.json({
      success: true,
      data: {
        words: formattedWords,
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (err) {
    console.error('获取单词列表失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取单词详情
router.get('/words/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // 获取单词信息
    const [words] = await db.query(
      `SELECT * FROM word_banks WHERE id = ?`,
      [id]
    );
    
    if (words.length === 0) {
      return res.status(404).json({ success: false, message: '单词不存在' });
    }
    
    const word = words[0];
    
    // 获取用户学习记录
    const [learningRecords] = await db.query(
      `SELECT familiarity, status, review_count, correct_count, wrong_count
       FROM learning_records 
       WHERE user_id = ? AND word_id = ?`,
      [userId, id]
    );
    
    res.json({
      success: true,
      data: {
        ...word,
        tags: JSON.parse(word.tags || '[]'),
        learning_status: learningRecords[0] || null
      }
    });
  } catch (err) {
    console.error('获取单词详情失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 搜索单词
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: '搜索关键词至少需要2个字符' 
      });
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
      [q, `%${q}%`, `%${q}%`, q, `${q}%`, parseInt(limit)]
    );
    
    res.json({
      success: true,
      data: words
    });
  } catch (err) {
    console.error('搜索单词失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取年级/单元列表
router.get('/grade-units', async (req, res) => {
  try {
    const { version } = req.query;
    
    let whereClause = '1=1';
    let params = [];
    
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
    
    res.json({
      success: true,
      data: grades
    });
  } catch (err) {
    console.error('获取年级单元列表失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取标签列表
router.get('/tags', async (req, res) => {
  try {
    const [words] = await db.query('SELECT tags FROM word_banks');
    
    const tagSet = new Set();
    
    for (const { tags } of words) {
      try {
        const tagList = JSON.parse(tags || '[]');
        tagList.forEach(tag => tagSet.add(tag));
      } catch (e) {
        // 忽略解析错误
      }
    }
    
    res.json({
      success: true,
      data: Array.from(tagSet).sort()
    });
  } catch (err) {
    console.error('获取标签列表失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// ========== 管理接口（需要管理员权限） ==========

// 添加单词
router.post('/words', authenticate, async (req, res) => {
  try {
    // TODO: 检查管理员权限
    const {
      word,
      phonetic,
      meaning,
      pos,
      example,
      example_translation,
      difficulty,
      grade,
      unit,
      tags
    } = req.body;
    
    if (!word || !meaning) {
      return res.status(400).json({ 
        success: false, 
        message: '单词和释义不能为空' 
      });
    }
    
    const [result] = await db.query(
      `INSERT INTO word_banks 
       (word, phonetic, meaning, pos, example, example_translation,
        difficulty, grade, unit, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        word,
        phonetic || '',
        meaning,
        pos || '',
        example || '',
        example_translation || '',
        difficulty || 1,
        grade || 1,
        unit || 1,
        JSON.stringify(tags || [])
      ]
    );
    
    res.json({
      success: true,
      data: { id: result.insertId },
      message: '单词添加成功'
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        message: '单词已存在' 
      });
    }
    console.error('添加单词失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 更新单词
router.put('/words/:id', authenticate, async (req, res) => {
  try {
    // TODO: 检查管理员权限
    const { id } = req.params;
    const updates = req.body;
    
    const allowedFields = [
      'word', 'phonetic', 'meaning', 'pos', 'example',
      'example_translation', 'difficulty', 'grade', 'unit', 'tags'
    ];
    
    const setClauses = [];
    const values = [];
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        values.push(field === 'tags' ? JSON.stringify(updates[field]) : updates[field]);
      }
    }
    
    if (setClauses.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: '没有要更新的字段' 
      });
    }
    
    values.push(id);
    
    await db.query(
      `UPDATE word_banks SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );
    
    res.json({
      success: true,
      message: '单词更新成功'
    });
  } catch (err) {
    console.error('更新单词失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 删除单词
router.delete('/words/:id', authenticate, async (req, res) => {
  try {
    // TODO: 检查管理员权限
    const { id } = req.params;
    
    await db.query('DELETE FROM word_banks WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: '单词删除成功'
    });
  } catch (err) {
    console.error('删除单词失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
