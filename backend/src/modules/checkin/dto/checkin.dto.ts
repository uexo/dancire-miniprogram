// src/modules/checkin/dto/checkin.dto.ts
import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ClaimRewardDto {
  @ApiProperty({ description: '连续打卡天数' })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  day: number;
}
