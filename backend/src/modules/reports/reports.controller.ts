// src/modules/reports/reports.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { CalendarQueryDto, WrongWordsQueryDto } from './dto/reports.dto';

@ApiTags('学习报告')
@Controller('api/v1/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取学习统计数据' })
  async getStats(
    @CurrentUser('id') userId: number,
    @Query('childId') childId?: string,
  ) {
    return this.reportsService.getStats(userId, childId ? parseInt(childId) : undefined);
  }

  @Get('memory-curve')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取记忆曲线数据' })
  async getMemoryCurve(
    @CurrentUser('id') userId: number,
    @Query('childId') childId?: string,
    @Query('days') days?: number,
  ) {
    return this.reportsService.getMemoryCurve(
      userId, 
      childId ? parseInt(childId) : undefined,
      days
    );
  }

  @Get('calendar')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取打卡日历数据' })
  async getCalendar(
    @CurrentUser('id') userId: number,
    @Query() query: CalendarQueryDto,
  ) {
    return this.reportsService.getCalendar(userId, query);
  }

  @Get('wrong-words')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取错题本' })
  async getWrongWords(
    @CurrentUser('id') userId: number,
    @Query() query: WrongWordsQueryDto,
  ) {
    return this.reportsService.getWrongWords(userId, query);
  }
}
