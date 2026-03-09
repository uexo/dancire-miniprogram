// src/modules/tts/tts.service.ts
import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';

// 复用原有的 TTS 服务
const TTSService = require('../../backend/src/services/tts');

const AUDIO_CACHE_DIR = path.join(__dirname, '../../../cache/audio');

@Injectable()
export class TtsService {
  private readonly ttsService: any;

  constructor() {
    this.ttsService = new TTSService();
    // 确保缓存目录存在
    this.ensureCacheDir();
  }

  private async ensureCacheDir() {
    try {
      await fs.promises.mkdir(AUDIO_CACHE_DIR, { recursive: true });
    } catch (err) {
      console.error('Failed to create audio cache dir:', err);
    }
  }

  /**
   * 获取单词音频
   */
  async getWordAudio(
    word: string,
    lang: string = 'en',
    force: boolean = false
  ): Promise<{ buffer?: Buffer; cached?: boolean; message?: string; demo?: boolean }> {
    const cacheFile = path.join(AUDIO_CACHE_DIR, `${word}_${lang}.mp3`);

    // 检查缓存
    if (!force) {
      try {
        const cachedAudio = await fs.promises.readFile(cacheFile);
        return { buffer: cachedAudio, cached: true };
      } catch (err) {
        // 缓存不存在，继续生成
      }
    }

    // 检查 TTS 配置
    if (!process.env.TTS_APP_ID) {
      return {
        message: 'TTS服务未配置，请在后台添加TTS配置',
        demo: true,
      };
    }

    try {
      // 生成音频
      const audioBuffer = await this.ttsService.generateWordAudio(word, lang);

      // 保存到缓存
      await fs.promises.writeFile(cacheFile, audioBuffer);

      return { buffer: audioBuffer, cached: false };
    } catch (error) {
      console.error('TTS Error:', error);
      return {
        message: '生成音频失败',
        demo: false,
      };
    }
  }

  /**
   * 批量预生成音频
   */
  async batchGenerate(words: string[], lang: string = 'en') {
    const results = [];

    for (const word of words.slice(0, 10)) {
      try {
        const cacheFile = path.join(AUDIO_CACHE_DIR, `${word}_${lang}.mp3`);

        // 检查是否已缓存
        try {
          await fs.promises.access(cacheFile);
          results.push({ word, status: 'cached' });
          continue;
        } catch (err) {
          // 未缓存，生成
        }

        if (process.env.TTS_APP_ID) {
          const audioBuffer = await this.ttsService.generateWordAudio(word, lang);
          await fs.promises.writeFile(cacheFile, audioBuffer);
          results.push({ word, status: 'generated' });
        } else {
          results.push({ word, status: 'skipped', reason: 'TTS not configured' });
        }

        // 延迟，避免请求过快
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (err: any) {
        results.push({ word, status: 'error', error: err.message });
      }
    }

    return {
      success: true,
      data: results,
    };
  }

  /**
   * 检查音频是否存在
   */
  async checkAudio(word: string, lang: string = 'en') {
    const cacheFile = path.join(AUDIO_CACHE_DIR, `${word}_${lang}.mp3`);

    try {
      const stats = await fs.promises.stat(cacheFile);
      return {
        success: true,
        exists: true,
        size: stats.size,
        updatedAt: stats.mtime,
      };
    } catch (err) {
      return {
        success: true,
        exists: false,
      };
    }
  }
}
