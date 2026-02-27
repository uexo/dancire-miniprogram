#!/usr/bin/env node
/**
 * 词库数据导入脚本
 * 用于将JSON格式的单词数据导入数据库
 * 
 * 使用方法:
 *   node import_words.js --file=./data/pep_primary_words.json
 *   node import_words.js --file=./data/pep_primary_words.json --grade=3 --unit=1
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wordheat',
  waitForConnections: true,
  connectionLimit: 10
};

// 解析命令行参数
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      options[key] = value || true;
    }
  });
  
  return options;
}

// 读取JSON文件
function readWordData(filePath) {
  const fullPath = path.resolve(__dirname, filePath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`文件不存在: ${fullPath}`);
  }
  
  const content = fs.readFileSync(fullPath, 'utf8');
  return JSON.parse(content);
}

// 检查词库版本是否已存在
async function checkVersionExists(connection, version) {
  const [rows] = await connection.execute(
    'SELECT id FROM word_versions WHERE version = ?',
    [version]
  );
  return rows.length > 0;
}

// 创建词库版本
async function createVersion(connection, data) {
  const [result] = await connection.execute(
    `INSERT INTO word_versions (version, description, total_words, created_at) 
     VALUES (?, ?, ?, NOW())`,
    [data.version, data.description, data.total_words]
  );
  return result.insertId;
}

// 插入单词
async function insertWord(connection, word, grade, unit, versionId) {
  try {
    const [result] = await connection.execute(
      `INSERT INTO word_banks 
       (word, phonetic, meaning, pos, example, example_translation, 
        difficulty, grade, unit, version, tags, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        word.word,
        word.phonetic || '',
        word.meaning,
        word.pos || '',
        word.example || '',
        word.example_translation || '',
        word.difficulty || 1,
        grade,
        unit,
        versionId,
        JSON.stringify(word.tags || [])
      ]
    );
    return result.insertId;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      console.log(`  ⚠️ 单词已存在: ${word.word}`);
      return null;
    }
    throw err;
  }
}

// 导入单词数据
async function importWords(data, options) {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log('📚 开始导入词库数据...\n');
    console.log(`版本: ${data.version}`);
    console.log(`描述: ${data.description}`);
    console.log(`预计单词数: ${data.total_words}\n`);
    
    // 检查版本是否已存在
    const exists = await checkVersionExists(connection, data.version);
    if (exists && !options.force) {
      console.log('⚠️ 该版本词库已存在，使用 --force 参数强制重新导入');
      return;
    }
    
    // 开始事务
    await connection.beginTransaction();
    
    // 创建版本记录
    const versionId = await createVersion(connection, data);
    console.log(`✅ 创建版本记录，ID: ${versionId}\n`);
    
    let totalImported = 0;
    let totalSkipped = 0;
    
    // 遍历年级
    for (const gradeData of data.grades) {
      const grade = gradeData.grade;
      
      // 如果指定了年级，跳过其他年级
      if (options.grade && parseInt(options.grade) !== grade) {
        continue;
      }
      
      console.log(`📖 年级: ${grade}`);
      
      // 遍历单元
      for (const unitData of gradeData.units) {
        const unit = unitData.unit;
        
        // 如果指定了单元，跳过其他单元
        if (options.unit && parseInt(options.unit) !== unit) {
          continue;
        }
        
        console.log(`  📑 单元 ${unit}: ${unitData.title}`);
        
        // 导入单词
        for (const word of unitData.words) {
          const wordId = await insertWord(connection, word, grade, unit, versionId);
          if (wordId) {
            totalImported++;
            process.stdout.write(`    ✅ ${word.word}\n`);
          } else {
            totalSkipped++;
          }
        }
        
        console.log('');
      }
    }
    
    // 提交事务
    await connection.commit();
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 导入完成!');
    console.log(`✅ 成功导入: ${totalImported} 个单词`);
    console.log(`⚠️ 跳过重复: ${totalSkipped} 个单词`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
  } catch (err) {
    // 回滚事务
    await connection.rollback();
    console.error('\n❌ 导入失败:', err.message);
    throw err;
  } finally {
    await connection.end();
  }
}

// 导出单词数据（从数据库导出为JSON）
async function exportWords(version, outputPath) {
  const connection = await mysql.createConnection(dbConfig);
  
  try {
    console.log(`📤 导出词库数据，版本: ${version}...\n`);
    
    // 获取版本信息
    const [versions] = await connection.execute(
      'SELECT * FROM word_versions WHERE version = ?',
      [version]
    );
    
    if (versions.length === 0) {
      throw new Error(`版本不存在: ${version}`);
    }
    
    // 获取所有单词
    const [words] = await connection.execute(
      `SELECT * FROM word_banks WHERE version = ? ORDER BY grade, unit, id`,
      [versions[0].id]
    );
    
    // 组织数据结构
    const data = {
      version: versions[0].version,
      description: versions[0].description,
      total_words: words.length,
      grades: []
    };
    
    // 按年级和单元分组
    const gradeMap = new Map();
    
    for (const word of words) {
      const gradeKey = word.grade;
      const unitKey = word.unit;
      
      if (!gradeMap.has(gradeKey)) {
        gradeMap.set(gradeKey, new Map());
      }
      
      const unitMap = gradeMap.get(gradeKey);
      if (!unitMap.has(unitKey)) {
        unitMap.set(unitKey, []);
      }
      
      unitMap.get(unitKey).push({
        word: word.word,
        phonetic: word.phonetic,
        meaning: word.meaning,
        pos: word.pos,
        example: word.example,
        example_translation: word.example_translation,
        difficulty: word.difficulty,
        tags: JSON.parse(word.tags || '[]')
      });
    }
    
    // 转换为数组结构
    for (const [grade, unitMap] of gradeMap) {
      const gradeData = { grade, units: [] };
      
      for (const [unit, wordList] of unitMap) {
        gradeData.units.push({
          unit,
          title: `Unit ${unit}`,
          words: wordList
        });
      }
      
      gradeData.units.sort((a, b) => a.unit - b.unit);
      data.grades.push(gradeData);
    }
    
    data.grades.sort((a, b) => a.grade - b.grade);
    
    // 写入文件
    const fullPath = path.resolve(__dirname, outputPath);
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2), 'utf8');
    
    console.log(`✅ 导出完成: ${fullPath}`);
    console.log(`📊 共 ${words.length} 个单词`);
    
  } finally {
    await connection.end();
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
词库数据导入导出工具

用法:
  node import_words.js [命令] [选项]

命令:
  import    导入词库数据 (默认)
  export    导出词库数据

选项:
  --file=PATH       JSON文件路径
  --version=NAME    词库版本名称 (导出时使用)
  --grade=N         仅导入指定年级
  --unit=N          仅导入指定单元
  --output=PATH     导出文件路径 (默认: ./data/export_[version].json)
  --force           强制重新导入已存在的版本
  --help            显示帮助信息

示例:
  node import_words.js --file=./data/pep_primary_words.json
  node import_words.js --file=./data/pep_primary_words.json --grade=3
  node import_words.js export --version="人教版PEP小学英语" --output=./data/export.json
`);
}

// 主函数
async function main() {
  const options = parseArgs();
  
  if (options.help) {
    showHelp();
    return;
  }
  
  // 默认命令为 import
  const command = process.argv[2] && !process.argv[2].startsWith('--') 
    ? process.argv[2] 
    : 'import';
  
  try {
    if (command === 'import') {
      if (!options.file) {
        console.error('❌ 请指定JSON文件路径: --file=./data/xxx.json');
        process.exit(1);
      }
      
      const data = readWordData(options.file);
      await importWords(data, options);
      
    } else if (command === 'export') {
      if (!options.version) {
        console.error('❌ 请指定词库版本: --version="版本名称"');
        process.exit(1);
      }
      
      const outputPath = options.output || `./data/export_${Date.now()}.json`;
      await exportWords(options.version, outputPath);
      
    } else {
      console.error(`❌ 未知命令: ${command}`);
      showHelp();
      process.exit(1);
    }
    
  } catch (err) {
    console.error('\n❌ 错误:', err.message);
    process.exit(1);
  }
}

main();
