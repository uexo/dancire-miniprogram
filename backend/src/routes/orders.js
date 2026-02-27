// backend/src/routes/orders.js
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// 产品价格配置
const PRODUCT_CONFIG = {
  month: { price: 29.9, duration: 30, name: '月度会员' },
  quarter: { price: 69.9, duration: 90, name: '季度会员' },
  year: { price: 199, duration: 365, name: '年度会员' }
};

// 创建订单
router.post('/create', authenticate, async (req, res) => {
  try {
    const { productType } = req.body;
    const userId = req.user.id;
    
    const config = PRODUCT_CONFIG[productType];
    if (!config) {
      return res.status(400).json({ success: false, message: '产品类型错误' });
    }
    
    // 生成订单号
    const orderNo = generateOrderNo();
    
    // 保存订单
    await db.query(
      `INSERT INTO orders (order_no, user_id, product_type, amount, status) 
       VALUES (?, ?, ?, ?, 'pending')`,
      [orderNo, userId, productType, config.price]
    );
    
    // 调用微信支付统一下单
    const paymentParams = await createWxPayment(orderNo, config, req.user.openid);
    
    res.json({
      success: true,
      data: {
        orderNo,
        paymentParams
      }
    });
  } catch (err) {
    console.error('创建订单失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 查询订单状态
router.get('/:orderNo/status', authenticate, async (req, res) => {
  try {
    const { orderNo } = req.params;
    const userId = req.user.id;
    
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE order_no = ? AND user_id = ?',
      [orderNo, userId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    
    const order = orders[0];
    
    res.json({
      success: true,
      data: {
        orderNo: order.order_no,
        status: order.status,
        expireAt: order.expire_at
      }
    });
  } catch (err) {
    console.error('查询订单失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 微信支付回调
router.post('/notify', async (req, res) => {
  try {
    const data = req.body;
    
    // 验证签名
    if (!verifyNotifySign(data)) {
      return res.send('<xml><return_code><![CDATA[FAIL]]></return_code></xml>');
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
    
    res.send('<xml><return_code><![CDATA[SUCCESS]]></return_code></xml>');
  } catch (err) {
    console.error('支付回调处理失败:', err);
    res.send('<xml><return_code><![CDATA[FAIL]]></return_code></xml>');
  }
});

// 生成订单号
function generateOrderNo() {
  const date = new Date();
  const timestamp = date.getTime().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return 'WH' + timestamp + random;
}

// 创建微信支付参数（简化版，实际需要调用微信API）
async function createWxPayment(orderNo, config, openid) {
  // 这里应该调用微信统一下单API
  // 简化返回，实际需要根据微信SDK生成
  
  const timeStamp = String(Math.floor(Date.now() / 1000));
  const nonceStr = generateNonceStr();
  const packageStr = 'prepay_id=wx' + orderNo; // 实际应从微信API获取
  
  return {
    timeStamp,
    nonceStr,
    package: packageStr,
    signType: 'RSA',
    paySign: generatePaySign(timeStamp, nonceStr, packageStr)
  };
}

// 生成随机字符串
function generateNonceStr() {
  return Math.random().toString(36).substr(2, 15);
}

// 生成支付签名（简化版）
function generatePaySign(timeStamp, nonceStr, packageStr) {
  // 实际应使用微信支付私钥签名
  const data = [timeStamp, nonceStr, packageStr].join('&');
  return crypto.createHash('md5').update(data).digest('hex');
}

// 验证微信支付回调签名
function verifyNotifySign(data) {
  // 实际应验证微信返回的签名
  return true;
}

module.exports = router;
