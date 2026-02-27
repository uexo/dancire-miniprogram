/**
 * TTS API Routes - 音频生成接口
 */

const express = require('express');
const router = express.Router();
const TTSService = require('../services/tts');
const path = require('path');
const fs = require('fs').promises;

const ttsService = new TTSService();
const AUDIO_CACHE_DIR = path.join(__dirname, '../../cache/audio');

// 确保缓存目录存在
(async () => {
  try {
    await fs.mkdir(AUDIO_CACHE_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create audio cache dir:', err);
  }
})();

/**
 * 获取单词音频
 * GET /api/v1/tts/word/:word
 */
router.get('/word/:word', async (req, res) => {
  try {
    const { word } = req.params;
    const { lang = 'en', force = false } = req.query;
    
    // 缓存文件路径
    const cacheFile = path.join(AUDIO_CACHE_DIR, `${word}_${lang}.mp3`);
    
    // 检查缓存
    if (!force) {
      try {
        const cachedAudio = await fs.readFile(cacheFile);
        res.set('Content-Type', 'audio/mpeg');
        res.set('X-Cache', 'HIT');
        return res.send(cachedAudio);
      } catch (err) {
        // 缓存不存在，继续生成
      }
    }
    
    // 检查 TTS 配置
    if (!process.env.TTS_APP_ID) {
      // 未配置 TTS，返回演示模式
      return res.status(503).json({
        success: false,
        message: 'TTS服务未配置，请在后台添加TTS配置',
        demo: true
      });
    }
    
    // 生成音频
    const audioBuffer = await ttsService.generateWordAudio(word, lang);
    
    // 保存到缓存
    await fs.writeFile(cacheFile, audioBuffer);
    
    // 返回音频
    res.set('Content-Type', 'audio/mpeg');
    res.set('X-Cache', 'MISS');
    res.send(audioBuffer);
    
  } catch (error) {
    console.error('TTS Error:', error);
    res.status(500).json({
      success: false,
      message: '生成音频失败',
      error: error.message
    });
  }
});

/**
 * 批量预生成音频（管理接口）
 * POST /api/v1/tts/batch
 */
router.post('/batch', async (req, res) => {
  try {
    const { words, lang = 'en' } = req.body;
    
    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供单词列表'
      });
    }
    
    const results = [];
    
    for (const word of words.slice(0, 10)) {  // 限制批量数量
      try {
        const cacheFile = path.join(AUDIO_CACHE_DIR, `${word}_${lang}.mp3`);
        
        // 检查是否已缓存
        try {
          await fs.access(cacheFile);
          results.push({ word, status: 'cached' });
          continue;
        } catch (err) {
          // 未缓存，生成
        }
        
        if (process.env.TTS_APP_ID) {
          const audioBuffer = await ttsService.generateWordAudio(word, lang);
          await fs.writeFile(cacheFile, audioBuffer);
          results.push({ word, status: 'generated' });
        } else {
          results.push({ word, status: 'skipped', reason: 'TTS not configured' });
        }
        
        // 延迟，避免请求过快
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        results.push({ word, status: 'error', error: err.message });
      }
    }
    
    res.json({
      success: true,
      data: results
    });
    
  } catch (error) {
    console.error('Batch TTS Error:', error);
    res.status(500).json({
      success: false,
      message: '批量生成失败',
      error: error.message
    });
  }
});

/**
 * 检查音频是否存在
 * GET /api/v1/tts/check/:word
 */
router.get('/check/:word', async (req, res) => {
  try {
    const { word } = req.params;
    const { lang = 'en' } = req.query;
    
    const cacheFile = path.join(AUDIO_CACHE_DIR, `${word}_${lang}.mp3`);
    
    try {
      const stats = await fs.stat(cacheFile);
      res.json({
        success: true,
        exists: true,
        size: stats.size,
        updatedAt: stats.mtime
      });
    } catch (err) {
      res.json({
        success: true,
        exists: false
      });
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '检查失败',
      error: error.message
    });
  }
});

module.exports = router;
