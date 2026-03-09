// src/modules/payment/payment.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import * as crypto from 'crypto';
import { db } from '../../config/database.config';
import { CreatePaymentDto, RefundDto } from './dto/payment.dto';

// 微信支付配置
const WX_PAY_CONFIG = {
  appId: process.env.WX_APPID || 'your-wx-appid',
  mchId: process.env.WX_MCH_ID || 'your-mch-id',
  apiKey: process.env.WX_API_KEY || 'your-api-key',
  notifyUrl: process.env.WX_NOTIFY_URL || 'https://api.wordheat.com/api/v1/payment/notify',
  certPath: process.env.WX_CERT_PATH || '',
  keyPath: process.env.WX_KEY_PATH || '',
};

// 产品配置
const PRODUCTS: Record<string, { id: string; name: string; price: number; duration: number; description: string }> = {
  month: {
    id: 'vip_month',
    name: '月度会员',
    price: 29.9,
    duration: 30,
    description: '30天VIP会员',
  },
  quarter: {
    id: 'vip_quarter',
    name: '季度会员',
    price: 69.9,
    duration: 90,
    description: '90天VIP会员（省20元）',
  },
  year: {
    id: 'vip_year',
    name: '年度会员',
    price: 199,
    duration: 365,
    description: '365天VIP会员（省160元）',
  },
};

@Injectable()
export class PaymentService {
  /**
   * 创建支付订单
   */
  async createPayment(userId: number, openid: string, dto: CreatePaymentDto) {
    const { productType } = dto;

    const product = PRODUCTS[productType];
    if (!product) {
      throw new HttpException(
        { success: false, message: '产品类型错误' },
        HttpStatus.BAD_REQUEST
      );
    }

    // 检查是否已是VIP
    const [userInfo] = await db.query(
      'SELECT is_vip, vip_expire_at FROM users WHERE id = ?',
      [userId]
    );

    if (userInfo[0]?.is_vip) {
      if (userInfo[0].vip_expire_at && new Date(userInfo[0].vip_expire_at) > new Date()) {
        const currentExpire = new Date(userInfo[0].vip_expire_at);
        const newExpire = new Date(currentExpire);
        newExpire.setDate(newExpire.getDate() + product.duration);

        const maxExpire = new Date();
        maxExpire.setFullYear(maxExpire.getFullYear() + 2);

        if (newExpire > maxExpire) {
          throw new HttpException(
            { success: false, message: 'VIP续费期限不能超过2年' },
            HttpStatus.BAD_REQUEST
          );
        }
      }
    }

    // 生成订单号
    const orderNo = this.generateOrderNo();

    // 创建订单记录
    await db.query(
      `INSERT INTO orders 
       (order_no, user_id, product_type, product_name, amount, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
      [orderNo, userId, productType, product.name, product.price]
    );

    // 调用微信统一下单
    const wxResult = await this.unifiedOrder({
      body: product.description,
      outTradeNo: orderNo,
      totalFee: product.price,
      openid: openid,
      attach: JSON.stringify({ userId, productType }),
    });

    if (wxResult.return_code !== 'SUCCESS' || wxResult.result_code !== 'SUCCESS') {
      await db.query(
        'UPDATE orders SET status = "failed", error_msg = ? WHERE order_no = ?',
        [wxResult.err_code_des || '统一下单失败', orderNo]
      );

      throw new HttpException(
        { success: false, message: wxResult.err_code_des || '创建支付订单失败' },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    // 更新订单的prepay_id
    await db.query(
      'UPDATE orders SET prepay_id = ?, wx_nonce_str = ? WHERE order_no = ?',
      [wxResult.prepay_id, wxResult.nonce_str, orderNo]
    );

    // 生成支付参数
    const paymentParams = this.buildPaymentParams(wxResult.prepay_id);

    return {
      success: true,
      data: {
        orderNo,
        paymentParams,
      },
    };
  }

  /**
   * 查询订单
   */
  async getOrder(userId: number, orderNo: string) {
    const [orders] = await db.query(
      `SELECT 
        order_no, product_name, amount, status, 
        paid_at, expire_at, created_at
       FROM orders 
       WHERE order_no = ? AND user_id = ?`,
      [orderNo, userId]
    );

    if (orders.length === 0) {
      throw new HttpException(
        { success: false, message: '订单不存在' },
        HttpStatus.NOT_FOUND
      );
    }

    return {
      success: true,
      data: orders[0],
    };
  }

  /**
   * 微信支付回调
   */
  async handleNotify(data: any): Promise<string> {
    const xmlData = data;

    // 解析XML
    const parsedData = this.parseXml(xmlData);

    // 验证签名
    const sign = this.generateSign(parsedData, WX_PAY_CONFIG.apiKey);
    if (sign !== parsedData.sign) {
      return this.buildXml({ return_code: 'FAIL', return_msg: '签名错误' });
    }

    if (parsedData.return_code === 'SUCCESS' && parsedData.result_code === 'SUCCESS') {
      const orderNo = parsedData.out_trade_no;
      const transactionId = parsedData.transaction_id;

      // 查询订单
      const [orders] = await db.query(
        'SELECT * FROM orders WHERE order_no = ?',
        [orderNo]
      );

      if (orders.length === 0) {
        return this.buildXml({ return_code: 'SUCCESS' });
      }

      const order = orders[0];

      if (order.status === 'paid') {
        return this.buildXml({ return_code: 'SUCCESS' });
      }

      // 更新订单状态
      await db.query(
        `UPDATE orders 
         SET status = 'paid', 
             transaction_id = ?, 
             paid_at = NOW()
         WHERE order_no = ?`,
        [transactionId, orderNo]
      );

      // 获取产品配置
      const product = PRODUCTS[order.product_type];

      // 计算VIP到期时间
      const [userInfo] = await db.query(
        'SELECT vip_expire_at FROM users WHERE id = ?',
        [order.user_id]
      );

      let newExpireDate: Date;
      if (userInfo[0]?.vip_expire_at && new Date(userInfo[0].vip_expire_at) > new Date()) {
        newExpireDate = new Date(userInfo[0].vip_expire_at);
        newExpireDate.setDate(newExpireDate.getDate() + product.duration);
      } else {
        newExpireDate = new Date();
        newExpireDate.setDate(newExpireDate.getDate() + product.duration);
      }

      // 更新用户VIP状态
      await db.query(
        `UPDATE users 
         SET is_vip = TRUE, 
             vip_expire_at = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [newExpireDate, order.user_id]
      );

      // 更新订单的到期时间
      await db.query(
        'UPDATE orders SET expire_at = ? WHERE order_no = ?',
        [newExpireDate, orderNo]
      );
    }

    return this.buildXml({ return_code: 'SUCCESS' });
  }

  /**
   * 申请退款
   */
  async refund(dto: RefundDto) {
    const { orderNo, refundAmount, reason } = dto;

    const [orders] = await db.query(
      'SELECT * FROM orders WHERE order_no = ? AND status = "paid"',
      [orderNo]
    );

    if (orders.length === 0) {
      throw new HttpException(
        { success: false, message: '订单不存在或未支付' },
        HttpStatus.NOT_FOUND
      );
    }

    const order = orders[0];

    const refundFee = refundAmount || order.amount;
    if (refundFee > order.amount) {
      throw new HttpException(
        { success: false, message: '退款金额不能大于订单金额' },
        HttpStatus.BAD_REQUEST
      );
    }

    const refundNo = 'RF' + Date.now() + Math.random().toString(36).substr(2, 4);

    await db.query(
      `INSERT INTO refunds 
       (refund_no, order_no, user_id, amount, reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', NOW())`,
      [refundNo, orderNo, order.user_id, refundFee, reason]
    );

    return {
      success: true,
      data: { refundNo },
      message: '退款申请已提交',
    };
  }

  /**
   * 获取产品价格列表
   */
  async getProducts() {
    const products = Object.entries(PRODUCTS).map(([key, value]) => ({
      type: key,
      ...value,
    }));

    return {
      success: true,
      data: products,
    };
  }

  // ========== 私有方法 ==========

  private generateOrderNo(): string {
    const date = new Date();
    const timestamp = date.getTime().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return 'WH' + timestamp + random;
  }

  private generateNonceStr(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }

  private generateTimeStamp(): string {
    return Math.floor(Date.now() / 1000).toString();
  }

  private generateSign(params: Record<string, any>, key: string): string {
    const filtered: Record<string, any> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== '' && v !== undefined && v !== null && k !== 'sign') {
        filtered[k] = v;
      }
    }

    const sortedKeys = Object.keys(filtered).sort();
    const stringA = sortedKeys.map((k) => `${k}=${filtered[k]}`).join('&');
    const stringSignTemp = stringA + '&key=' + key;

    return crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();
  }

  private async unifiedOrder(orderData: {
    body: string;
    outTradeNo: string;
    totalFee: number;
    openid: string;
    attach: string;
  }): Promise<any> {
    const { body, outTradeNo, totalFee, openid, attach } = orderData;

    const params: Record<string, any> = {
      appid: WX_PAY_CONFIG.appId,
      mch_id: WX_PAY_CONFIG.mchId,
      nonce_str: this.generateNonceStr(),
      body: body,
      attach: attach,
      out_trade_no: outTradeNo,
      total_fee: Math.round(totalFee * 100),
      spbill_create_ip: '127.0.0.1',
      notify_url: WX_PAY_CONFIG.notifyUrl,
      trade_type: 'JSAPI',
      openid: openid,
    };

    params.sign = this.generateSign(params, WX_PAY_CONFIG.apiKey);

    // 模拟返回（实际应调用微信API）
    return {
      return_code: 'SUCCESS',
      result_code: 'SUCCESS',
      prepay_id: `wx${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
      nonce_str: params.nonce_str,
    };
  }

  private buildPaymentParams(prepayId: string): any {
    const params = {
      appId: WX_PAY_CONFIG.appId,
      timeStamp: this.generateTimeStamp(),
      nonceStr: this.generateNonceStr(),
      package: `prepay_id=${prepayId}`,
      signType: 'MD5',
    };

    return {
      ...params,
      paySign: this.generateSign(params, WX_PAY_CONFIG.apiKey),
    };
  }

  private buildXml(obj: Record<string, any>): string {
    let xml = '<xml>';
    for (const [key, value] of Object.entries(obj)) {
      xml += `<${key}><![CDATA[${value}]]></${key}>`;
    }
    xml += '</xml>';
    return xml;
  }

  private parseXml(xml: string): Record<string, any> {
    const result: Record<string, any> = {};
    const matches = xml.match(/<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>/g);
    if (matches) {
      matches.forEach((match) => {
        const [, key, value] = match.match(/<(\w+)><!\[CDATA\[(.*?)\]\]><\/\1>/) || [];
        if (key) result[key] = value;
      });
    }
    return result;
  }
}
