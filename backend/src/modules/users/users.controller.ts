// src/modules/users/users.controller.ts
import { Controller, Get, Put, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateUserInfoDto } from './dto/users.dto';

@ApiTags('用户')
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('info')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户信息' })
  async getUserInfo(@CurrentUser('id') userId: number) {
    return this.usersService.getUserInfo(userId);
  }

  @Put('info')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新用户信息' })
  async updateUserInfo(
    @CurrentUser('id') userId: number,
    @Query() dto: UpdateUserInfoDto,
  ) {
    return this.usersService.updateUserInfo(userId, dto);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取用户统计' })
  async getUserStats(@CurrentUser('id') userId: number) {
    return this.usersService.getUserStats(userId);
  }

  @Get('progress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取学习进度' })
  async getLearningProgress(
    @CurrentUser('id') userId: number,
    @Query('grade') grade?: number,
  ) {
    return this.usersService.getLearningProgress(userId, grade);
  }
}
