import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: '昵称' })
  @IsOptional()
  @IsString()
  nickname?: string;

  @ApiPropertyOptional({ description: '头像URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: '年级 (1-9)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9)
  grade?: number;

  @ApiPropertyOptional({ description: '教材版本' })
  @IsOptional()
  @IsString()
  textbookVersion?: string;
}