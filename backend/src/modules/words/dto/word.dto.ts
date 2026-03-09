import { IsInt, IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SubmitAnswerDto {
  @ApiProperty({ description: '单词ID' })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  wordId: number;

  @ApiProperty({ description: '是否答对' })
  @IsBoolean()
  @IsNotEmpty()
  correct: boolean;
}