// src/modules/words/words.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { WordsService } from './words.service';

@ApiTags('单词学习')
@Controller('api/v1/words')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class WordsController {
  constructor(private readonly wordsService: WordsService) {}

  @Get('today')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取今日学习任务' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getTodayTasks(@Req() req: any) {
    return this.wordsService.getTodayTasks(req.user);
  }

  @Post('answer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '提交答案' })
  @ApiResponse({ status: 200, description: '提交成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  async submitAnswer(
    @Req() req: any,
    @Body() body: { wordId: number; correct: boolean },
  ) {
    return this.wordsService.submitAnswer(req.user.id, body.wordId, body.correct);
  }
}
