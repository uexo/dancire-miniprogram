// src/modules/tts/tts.controller.ts
import { Controller, Get, Post, Param, Query, Body, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { TtsService } from './tts.service';
import { BatchTtsDto } from './dto/tts.dto';

@ApiTags('语音服务')
@Controller('api/v1/tts')
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @Get('word/:word')
  @ApiOperation({ summary: '获取单词音频' })
  async getWordAudio(
    @Param('word') word: string,
    @Query('lang') lang: string = 'en',
    @Query('force') force: string = 'false',
    @Res() res: Response,
  ) {
    const result = await this.ttsService.getWordAudio(word, lang, force === 'true');
    
    if (result.buffer) {
      res.set('Content-Type', 'audio/mpeg');
      res.set('X-Cache', result.cached ? 'HIT' : 'MISS');
      res.send(result.buffer);
    } else {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        success: false,
        message: result.message,
        demo: result.demo,
      });
    }
  }

  @Post('batch')
  @ApiOperation({ summary: '批量预生成音频' })
  async batchGenerate(@Body() dto: BatchTtsDto) {
    return this.ttsService.batchGenerate(dto.words, dto.lang);
  }

  @Get('check/:word')
  @ApiOperation({ summary: '检查音频是否存在' })
  async checkAudio(
    @Param('word') word: string,
    @Query('lang') lang: string = 'en',
  ) {
    return this.ttsService.checkAudio(word, lang);
  }
}
