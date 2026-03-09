// src/modules/wordbank/wordbank.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { WordbankService } from './wordbank.service';

@ApiTags('词库管理')
@Controller('api/v1/wordbank')
export class WordbankController {
  constructor(private readonly wordbankService: WordbankService) {}

  // ========== 词库版本管理 ==========

  @Get('versions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取所有词库版本' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getVersions() {
    return this.wordbankService.getVersions();
  }

  @Get('versions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取指定版本详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '版本不存在' })
  async getVersionDetail(@Param('id') id: string) {
    return this.wordbankService.getVersionDetail(parseInt(id));
  }

  // ========== 单词查询 ==========

  @Get('words')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取单词列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getWords(
    @Query() query: {
      version?: string;
      grade?: string;
      unit?: string;
      keyword?: string;
      difficulty?: string;
      tag?: string;
      page?: string;
      pageSize?: string;
    },
  ) {
    return this.wordbankService.getWords(query);
  }

  @Get('words/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取单词详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '单词不存在' })
  async getWordDetail(@Param('id') id: string, @Req() req: any) {
    return this.wordbankService.getWordDetail(parseInt(id), req.user.id);
  }

  @Get('search')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '搜索单词' })
  @ApiResponse({ status: 200, description: '搜索成功' })
  @ApiResponse({ status: 400, description: '搜索关键词过短' })
  async searchWords(
    @Query('q') q: string,
    @Query('limit') limit: string,
  ) {
    return this.wordbankService.searchWords(q, parseInt(limit || '10'));
  }

  @Get('grade-units')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取年级/单元列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getGradeUnits(@Query('version') version?: string) {
    return this.wordbankService.getGradeUnits(version);
  }

  @Get('tags')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取标签列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getTags() {
    return this.wordbankService.getTags();
  }

  // ========== 管理接口 ==========

  @Post('words')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '添加单词' })
  @ApiResponse({ status: 200, description: '添加成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  async addWord(@Body() body: any) {
    return this.wordbankService.addWord(body);
  }

  @Put('words/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '更新单词' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 404, description: '单词不存在' })
  async updateWord(@Param('id') id: string, @Body() body: any) {
    return this.wordbankService.updateWord(parseInt(id), body);
  }

  @Delete('words/:id')
  @UseGuards(JwtGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除单词' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '单词不存在' })
  async deleteWord(@Param('id') id: string) {
    return this.wordbankService.deleteWord(parseInt(id));
  }
}
