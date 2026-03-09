// src/modules/tts/dto/tts.dto.ts
import { IsString, IsOptional, IsArray, ArrayNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BatchTtsDto {
  @ApiProperty({ description: '单词列表', type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  words: string[];

  @ApiPropertyOptional({ description: '语言', default: 'en' })
  @IsString()
  @IsOptional()
  lang?: string = 'en';
}
