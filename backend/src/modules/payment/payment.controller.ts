// src/modules/payment/payment.controller.ts
import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentService } from './payment.service';
import { CreatePaymentDto, RefundDto } from './dto/payment.dto';

@ApiTags('微信支付')
@Controller('api/v1/payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建支付订单' })
  async createPayment(
    @CurrentUser('id') userId: number,
    @CurrentUser('openid') openid: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentService.createPayment(userId, openid, dto);
  }

  @Get('order/:orderNo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询订单' })
  async getOrder(
    @CurrentUser('id') userId: number,
    @Param('orderNo') orderNo: string,
  ) {
    return this.paymentService.getOrder(userId, orderNo);
  }

  @Post('notify')
  @ApiOperation({ summary: '微信支付回调' })
  async handleNotify(@Body() data: any) {
    return this.paymentService.handleNotify(data);
  }

  @Post('refund')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '申请退款' })
  async refund(
    @CurrentUser('id') userId: number,
    @Body() dto: RefundDto,
  ) {
    return this.paymentService.refund(dto);
  }

  @Get('products')
  @ApiOperation({ summary: '获取产品价格列表' })
  async getProducts() {
    return this.paymentService.getProducts();
  }
}
