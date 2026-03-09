// src/modules/wordbank/dto/wordbank.dto.ts
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SearchWordsDto {
  @ApiPropertyOptional({ description: '词库版本' })
  @IsString()
  @IsOptional()
  version?: string;

  @ApiPropertyOptional({ description: '年级' })
  @IsInt()
  @IsOptional()
  grade?: number;

  @ApiPropertyOptional({ description: '单元' })
  @IsInt()
  @IsOptional()
  unit?: number;

  @ApiPropertyOptional({ description: '关键词' })
  @IsString()
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: '难度', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  difficulty?: number;

  @ApiPropertyOptional({ description: '标签' })
  @IsString()
  @IsOptional()
  tag?: string;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsInt()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsInt()
  @IsOptional()
  pageSize?: number = 20;
}

export class CreateWordDto {
  @ApiProperty({ description: '单词' })
  @IsString()
  word: string;

  @ApiPropertyOptional({ description: '音标' })
  @IsString()
  @IsOptional()
  phonetic?: string;

  @ApiProperty({ description: '释义' })
  @IsString()
  meaning: string;

  @ApiPropertyOptional({ description: '词性' })
  @IsString()
  @IsOptional()
  pos?: string;

  @ApiPropertyOptional({ description: '例句' })
  @IsString()
  @IsOptional()
  example?: string;

  @ApiPropertyOptional({ description: '例句翻译' })
  @IsString()
  @IsOptional()
  example_translation?: string;

  @ApiPropertyOptional({ description: '难度', default: 1 })
  @IsInt()
  @IsOptional()
  difficulty?: number = 1;

  @ApiPropertyOptional({ description: '年级', default: 1 })
  @IsInt()
  @IsOptional()
  grade?: number = 1;

  @ApiPropertyOptional({ description: '单元', default: 1 })
  @IsInt()
  @IsOptional()
  unit?: number = 1;

  @ApiPropertyOptional({ description: '标签' })
  @IsOptional()
  tags?: string[];
}

export class UpdateWordDto {
  @ApiPropertyOptional({ description: '单词' })
  @IsString()
  @IsOptional()
  word?: string;

  @ApiPropertyOptional({ description: '音标' })
  @IsString()
  @IsOptional()
  phonetic?: string;

  @ApiPropertyOptional({ description: '释义' })
  @IsString()
  @IsOptional()
  meaning?: string;

  @ApiPropertyOptional({ description: '词性' })
  @IsString()
  @IsOptional()
  pos?: string;

  @ApiPropertyOptional({ description: '例句' })
  @IsString()
  @IsOptional()
  example?: string;

  @ApiPropertyOptional({ description: '例句翻译' })
  @IsString()
  @IsOptional()
  example_translation?: string;

  @ApiPropertyOptional({ description: '难度' })
  @IsInt()
  @IsOptional()
  difficulty?: number;

  @ApiPropertyOptional({ description: '年级' })
  @IsInt()
  @IsOptional()
  grade?: number;

  @ApiPropertyOptional({ description: '单元' })
  @IsInt()
  @IsOptional()
  unit?: number;

  @ApiPropertyOptional({ description: '标签' })
  @IsOptional()
  tags?: string[];
}
