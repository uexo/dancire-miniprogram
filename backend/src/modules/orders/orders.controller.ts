// src/modules/orders/orders.controller.ts
import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/orders.dto';

@ApiTags('订单')
@Controller('api/v1/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建订单' })
  async createOrder(
    @CurrentUser('id') userId: number,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(userId, dto);
  }

  @Get(':orderNo/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '查询订单状态' })
  async getOrderStatus(
    @CurrentUser('id') userId: number,
    @Param('orderNo') orderNo: string,
  ) {
    return this.ordersService.getOrderStatus(userId, orderNo);
  }

  @Post('notify')
  @ApiOperation({ summary: '微信支付回调' })
  async handleNotify(@Body() data: any) {
    return this.ordersService.handleNotify(data);
  }
}
