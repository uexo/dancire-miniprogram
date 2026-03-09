// src/modules/payment/dto/payment.dto.ts
import { IsString, IsIn, IsNumber, IsOptional, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ description: '产品类型', enum: ['month', 'quarter', 'year'] })
  @IsString()
  @IsIn(['month', 'quarter', 'year'])
  @IsNotEmpty()
  productType: string;
}

export class RefundDto {
  @ApiProperty({ description: '订单号' })
  @IsString()
  @IsNotEmpty()
  orderNo: string;

  @ApiPropertyOptional({ description: '退款金额' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  refundAmount?: number;

  @ApiPropertyOptional({ description: '退款原因' })
  @IsString()
  @IsOptional()
  reason?: string;
}
