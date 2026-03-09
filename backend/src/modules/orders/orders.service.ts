// src/modules/orders/orders.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as crypto from 'crypto';
import { db } from '../../config/database.config';
import { CreateOrderDto } from './dto/orders.dto';

// 产品价格配置
const PRODUCT_CONFIG: Record<string, { price: number; duration: number; name: string }> = {
  month: { price: 29.9, duration: 30, name: '月度会员' },
  quarter: { price: 69.9, duration: 90, name: '季度会员' },
  year: { price: 199, duration: 365, name: '年度会员' },
};

@Injectable()
export class OrdersService {
  /**
   * 创建订单
   */
  async createOrder(userId: number, dto: CreateOrderDto) {
    const { productType } = dto;

    const config = PRODUCT_CONFIG[productType];
    if (!config) {
      throw new HttpException(
        { success: false, message: '产品类型错误' },
        HttpStatus.BAD_REQUEST
      );
    }

    // 生成订单号
    const orderNo = this.generateOrderNo();

    // 保存订单
    await db.query(
      `INSERT INTO orders (order_no, user_id, product_type, amount, status) 
       VALUES (?, ?, ?, ?, 'pending')`,
      [orderNo, userId, productType, config.price]
    );

    // 调用微信支付统一下单
    const paymentParams = await this.createWxPayment(orderNo, config, '');

    return {
      success: true,
      data: {
        orderNo,
        paymentParams,
      },
    };
  }

  /**
   * 查询订单状态
   */
  async getOrderStatus(userId: number, orderNo: string) {
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE order_no = ? AND user_id = ?',
      [orderNo, userId]
    );

    if (orders.length === 0) {
      throw new HttpException(
        { success: false, message: '订单不存在' },
        HttpStatus.NOT_FOUND
      );
    }

    const order = orders[0];

    return {
      success: true,
      data: {
        orderNo: order.order_no,
        status: order.status,
        expireAt: order.expire_at,
      },
    };
  }

  /**
   * 微信支付回调
   */
  async handleNotify(data: any) {
    // 验证签名
    if (!this.verifyNotifySign(data)) {
      return '<xml><return_code><![CDATA[FAIL]]></return_code></xml>';
    }

    if (data.return_code === 'SUCCESS' && data.result_code === 'SUCCESS') {
      const orderNo = data.out_trade_no;

      // 更新订单状态
      await db.query(
        'UPDATE orders SET status = "paid", paid_at = NOW() WHERE order_no = ?',
        [orderNo]
      );

      // 获取订单信息
      const [orders] = await db.query(
        'SELECT user_id, product_type FROM orders WHERE order_no = ?',
        [orderNo]
      );

      if (orders.length > 0) {
        const order = orders[0];
        const config = PRODUCT_CONFIG[order.product_type];

        // 计算会员到期时间
        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + config.duration);

        // 更新用户VIP状态
        await db.query(
          `UPDATE users 
           SET is_vip = TRUE, vip_expire_at = ? 
           WHERE id = ?`,
          [expireDate, order.user_id]
        );

        // 更新订单到期时间
        await db.query(
          'UPDATE orders SET expire_at = ? WHERE order_no = ?',
          [expireDate, orderNo]
        );
      }
    }

    return '<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>';
  }

  /**
   * 生成订单号
   */
  private generateOrderNo(): string {
    const date = new Date();
    const timestamp = date.getTime().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return 'WH' + timestamp + random;
  }

  /**
   * 创建微信支付参数（简化版）
   */
  private async createWxPayment(
    orderNo: string,
    config: { price: number; name: string },
    openid: string
  ): Promise<any> {
    const timeStamp = String(Math.floor(Date.now() / 1000));
    const nonceStr = this.generateNonceStr();
    const packageStr = 'prepay_id=wx' + orderNo;

    return {
      timeStamp,
      nonceStr,
      package: packageStr,
      signType: 'RSA',
      paySign: this.generatePaySign(timeStamp, nonceStr, packageStr),
    };
  }

  /**
   * 生成随机字符串
   */
  private generateNonceStr(): string {
    return Math.random().toString(36).substr(2, 15);
  }

  /**
   * 生成支付签名（简化版）
   */
  private generatePaySign(timeStamp: string, nonceStr: string, packageStr: string): string {
    const data = [timeStamp, nonceStr, packageStr].join('&');
    return crypto.createHash('md5').update(data).digest('hex');
  }

  /**
   * 验证微信支付回调签名
   */
  private verifyNotifySign(data: any): boolean {
    // 实际应验证微信返回的签名
    return true;
  }
}
