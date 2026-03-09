// src/modules/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('认证')
@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('wx-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '微信登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  async wxLogin(@Body() body: { code: string; userInfo?: any }) {
    return this.authService.wxLogin(body.code, body.userInfo);
  }

  @Post('phone-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '手机号快捷登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 400, description: '参数错误' })
  async phoneLogin(@Body() body: { wxCode: string; phoneCode: string }) {
    return this.authService.phoneLogin(body.wxCode, body.phoneCode);
  }

  @Post('send-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送验证码' })
  @ApiResponse({ status: 200, description: '发送成功' })
  @ApiResponse({ status: 400, description: '手机号格式错误' })
  async sendCode(@Body() body: { phoneNumber: string }) {
    return this.authService.sendCode(body.phoneNumber);
  }

  @Post('verify-code-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '验证码登录' })
  @ApiResponse({ status: 200, description: '登录成功' })
  @ApiResponse({ status: 400, description: '验证码错误' })
  async verifyCodeLogin(
    @Body() body: { phoneNumber: string; verifyCode: string },
  ) {
    return this.authService.verifyCodeLogin(body.phoneNumber, body.verifyCode);
  }

  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新Token' })
  @ApiResponse({ status: 200, description: '刷新成功' })
  @ApiResponse({ status: 401, description: 'Token无效' })
  async refreshToken(@Body() body: { token: string }) {
    return this.authService.refreshToken(body.token);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '退出登录' })
  @ApiResponse({ status: 200, description: '退出成功' })
  async logout() {
    return { success: true, message: '退出成功' };
  }
}
