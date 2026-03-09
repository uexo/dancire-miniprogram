import { IsString, IsOptional, IsObject, IsPhoneNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WxUserInfoDto {
  @ApiPropertyOptional({ description: '昵称' })
  @IsOptional()
  @IsString()
  nickName?: string;

  @ApiPropertyOptional({ description: '头像URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: '年级' })
  @IsOptional()
  grade?: number;

  @ApiPropertyOptional({ description: '教材版本' })
  @IsOptional()
  @IsString()
  textbookVersion?: string;
}

export class WxLoginDto {
  @ApiProperty({ description: '微信登录code' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: '用户信息' })
  @IsOptional()
  @IsObject()
  userInfo?: WxUserInfoDto;
}

export class PhoneLoginDto {
  @ApiProperty({ description: '微信登录code' })
  @IsString()
  @IsNotEmpty()
  wxCode: string;

  @ApiProperty({ description: '获取手机号code' })
  @IsString()
  @IsNotEmpty()
  phoneCode: string;
}

export class SendCodeDto {
  @ApiProperty({ description: '手机号' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}

export class VerifyCodeLoginDto {
  @ApiProperty({ description: '手机号' })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({ description: '验证码' })
  @IsString()
  @IsNotEmpty()
  verifyCode: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: '当前token' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class UserInfoDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nickname: string;

  @ApiProperty()
  avatarUrl: string;

  @ApiProperty()
  grade: number;

  @ApiProperty()
  textbookVersion: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiProperty()
  isVip: boolean;

  @ApiPropertyOptional()
  vipExpireAt?: Date;
}

export class LoginResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  data: {
    token: string;
    userInfo: UserInfoDto;
  };
}