import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ description: '产品类型 (month/quarter/year)' })
  @IsString()
  @IsNotEmpty()
  productType: string;
}
