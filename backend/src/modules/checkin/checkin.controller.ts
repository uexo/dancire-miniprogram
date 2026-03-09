// src/modules/checkin/checkin.controller.ts
import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CheckinService } from './checkin.service';
import { ClaimRewardDto } from './dto/checkin.dto';

@ApiTags('打卡')
@Controller('api/v1/checkin')
export class CheckinController {
  constructor(private readonly checkinService: CheckinService) {}

  @Get('month')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取本月打卡数据' })
  async getMonthCheckins(@CurrentUser('id') userId: number) {
    return this.checkinService.getMonthCheckins(userId);
  }

  @Post('today')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '今日打卡' })
  async checkinToday(@CurrentUser('id') userId: number) {
    return this.checkinService.checkinToday(userId);
  }

  @Post('claim-reward')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '领取连续打卡奖励' })
  async claimReward(
    @CurrentUser('id') userId: number,
    @Body() dto: ClaimRewardDto,
  ) {
    return this.checkinService.claimReward(userId, dto);
  }
}
