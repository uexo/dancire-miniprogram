// backend/src/routes/payment.js
// 微信支付API - 统一下单、支付回调、订单查询

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

// 微信支付配置
const WX_PAY_CONFIG = {
  appId: process.env.WX_APPID || 'your-wx-appid',
  mchId: process.env.WX_MCH_ID || 'your-mch-id',
  apiKey: process.env.WX_API_KEY || 'your-api-key',
  notifyUrl: process.env.WX_NOTIFY_URL || 'https://api.wordheat.com/api/v1/payment/notify',
  // 商户证书路径（退款时需要）
  certPath: process.env.WX_CERT_PATH || '',
  keyPath: process.env.WX_KEY_PATH || ''
};

// 产品配置
const PRODUCTS = {
  month: { 
    id: 'vip_month', 
    name: '月度会员', 
    price: 29.9, 
    duration: 30,
    description: '30天VIP会员'
  },
  quarter: { 
    id: 'vip_quarter', 
    name: '季度会员', 
    price: 69.9, 
    duration: 90,
    description: '90天VIP会员（省20元）'
  },
  year: { 
    id: 'vip_year', 
    name: '年度会员', 
    price: 199, 
    duration: 365,
    description: '365天VIP会员（省160元）'
  }
};

/**
 * 生成随机字符串
 */
function generateNonceStr() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * 生成时间戳
 */
function generateTimeStamp() {
  return Math.floor(Date.now() / 1000).toString();
}

/**
 * 生成签名
 * @param {Object} params - 参数对象
 * @param {string} key - API密钥
 */
function generateSign(params, key) {
  // 过滤空值和sign字段
  const filtered = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== '' && v !== undefined && v !== null && k !== 'sign') {
      filtered[k] = v;
    }
  }
  
  // 按ASCII码排序并拼接
  const sortedKeys = Object.keys(filtered).sort();
  const stringA = sortedKeys.map(k => `${k}=${filtered[k]}`).join('&');
  const stringSignTemp = stringA + '&key=' + key;
  
  // MD5加密并转大写
  return crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();
}

/**
 * 生成订单号
 */
function generateOrderNo() {
  const date = new Date();
  const timestamp = date.getTime().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return 'WH' + timestamp + random;
}

/**
 * 调用微信统一下单API
 * @param {Object} orderData - 订单数据
 */
async function unifiedOrder(orderData) {
  const {
    body,
    outTradeNo,
    totalFee,
    openid,
    attach = ''
  } = orderData;
  
  const params = {
    appid: WX_PAY_CONFIG.appId,
    mch_id: WX_PAY_CONFIG.mchId,
    nonce_str: generateNonceStr(),
    body: body,
    attach: attach,
    out_trade_no: outTradeNo,
    total_fee: Math.round(totalFee * 100), // 转为分
    spbill_create_ip: '127.0.0.1', // 用户IP
    notify_url: WX_PAY_CONFIG.notifyUrl,
    trade_type: 'JSAPI',
    openid: openid
  };
  
  // 生成签名
  params.sign = generateSign(params, WX_PAY_CONFIG.apiKey);
  
  // 构建XML
  const xml = buildXml(params);
  
  // 调用微信API（实际部署时启用）
  // const response = await fetch('https://api.mch.weixin.qq.com/pay/unifiedorder', {
  //   method: 'POST',
  //   body: xml,
  //   headers: { 'Content-Type': 'text/xml' }
  // });
  // const resultXml = await response.text();
  // const result = parseXml(resultXml);
  
  // 模拟返回（开发测试用）
  console.log('统一下单请求:', params);
  
  return {
    return_code: 'SUCCESS',
    result_code: 'SUCCESS',
    prepay_id: `wx${Date.now()}${Math.random().toString(36).substr(2, 6)}`,
    nonce_str: params.nonce_str
  };
}

/**
 * 构建XML
 */
function buildXml(obj) {
  let xml = '<xml>';
  for (const [key, value] of Object.entries(obj)) {
    xml += `<${key}><![CDATA[${value}]]></${key}>`;
  }
  xml += '</xml>';
  return xml;
}

/**
 * 解析XML
 */
function parseXml(xml) {
  const result = {};
  const matches = xml.match(/<(\w+)>>!\[CDATA\[(.*?)\]\]><\/\1>/g);
  if (matches) {
    matches.forEach(match => {
      const [, key, value] = match.match(/<(\w+)>>!\[CDATA\[(.*?)\]\]\u003e<\/\1>/);
      result[key] = value;
    });
  }
  return result;
}

/**
 * 生成小程序支付参数
 */
function buildPaymentParams(prepayId) {
  const params = {
    appId: WX_PAY_CONFIG.appId,
    timeStamp: generateTimeStamp(),
    nonceStr: generateNonceStr(),
    package: `prepay_id=${prepayId}`,
    signType: 'MD5'
  };
  
  params.paySign = generateSign(params, WX_PAY_CONFIG.apiKey);
  
  return params;
}

// ========== API路由 ==========

// 创建支付订单
router.post('/create', authenticate, async (req, res) => {
  try {
    const { productType } = req.body;
    const userId = req.user.id;
    const openid = req.user.openid;
    
    const product = PRODUCTS[productType];
    if (!product) {
      return res.status(400).json({ success: false, message: '产品类型错误' });
    }
    
    // 检查是否已是VIP
    if (req.user.is_vip) {
      const [userInfo] = await db.query(
        'SELECT vip_expire_at FROM users WHERE id = ?',
        [userId]
      );
      
      if (userInfo.length > 0 && userInfo[0].vip_expire_at > new Date()) {
        // VIP未过期，计算续费后的到期时间
        const currentExpire = new Date(userInfo[0].vip_expire_at);
        const newExpire = new Date(currentExpire);
        newExpire.setDate(newExpire.getDate() + product.duration);
        
        // 检查是否超过最大续费期限（例如2年）
        const maxExpire = new Date();
        maxExpire.setFullYear(maxExpire.getFullYear() + 2);
        
        if (newExpire > maxExpire) {
          return res.status(400).json({ 
            success: false, 
            message: 'VIP续费期限不能超过2年' 
          });
        }
      }
    }
    
    // 生成订单号
    const orderNo = generateOrderNo();
    
    // 创建订单记录
    await db.query(`
      INSERT INTO orders 
      (order_no, user_id, product_type, product_name, amount, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', NOW())
    `, [orderNo, userId, productType, product.name, product.price]);
    
    // 调用微信统一下单
    const wxResult = await unifiedOrder({
      body: product.description,
      outTradeNo: orderNo,
      totalFee: product.price,
      openid: openid,
      attach: JSON.stringify({ userId, productType })
    });
    
    if (wxResult.return_code !== 'SUCCESS' || wxResult.result_code !== 'SUCCESS') {
      // 更新订单状态为失败
      await db.query(
        'UPDATE orders SET status = "failed", error_msg = ? WHERE order_no = ?',
        [wxResult.err_code_des || '统一下单失败', orderNo]
      );
      
      return res.status(500).json({ 
        success: false, 
        message: wxResult.err_code_des || '创建支付订单失败' 
      });
    }
    
    // 更新订单的prepay_id
    await db.query(
      'UPDATE orders SET prepay_id = ?, wx_nonce_str = ? WHERE order_no = ?',
      [wxResult.prepay_id, wxResult.nonce_str, orderNo]
    );
    
    // 生成支付参数
    const paymentParams = buildPaymentParams(wxResult.prepay_id);
    
    res.json({
      success: true,
      data: {
        orderNo,
        paymentParams
      }
    });
  } catch (err) {
    console.error('创建支付订单失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 查询订单状态
router.get('/order/:orderNo', authenticate, async (req, res) => {
  try {
    const { orderNo } = req.params;
    const userId = req.user.id;
    
    const [orders] = await db.query(
      `SELECT 
        order_no, product_name, amount, status, 
        paid_at, expire_at, created_at
       FROM orders 
       WHERE order_no = ? AND user_id = ?`,
      [orderNo, userId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在' });
    }
    
    res.json({
      success: true,
      data: orders[0]
    });
  } catch (err) {
    console.error('查询订单失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 微信支付回调
router.post('/notify', express.raw({ type: 'text/xml' }), async (req, res) => {
  try {
    const xmlData = req.body;
    const data = parseXml(xmlData);
    
    console.log('收到支付回调:', data);
    
    // 验证签名
    const sign = generateSign(data, WX_PAY_CONFIG.apiKey);
    if (sign !== data.sign) {
      console.error('支付回调签名验证失败');
      return res.send(buildXml({
        return_code: 'FAIL',
        return_msg: '签名错误'
      }));
    }
    
    if (data.return_code === 'SUCCESS' && data.result_code === 'SUCCESS') {
      const orderNo = data.out_trade_no;
      const transactionId = data.transaction_id;
      
      // 查询订单
      const [orders] = await db.query(
        'SELECT * FROM orders WHERE order_no = ?',
        [orderNo]
      );
      
      if (orders.length === 0) {
        console.error('订单不存在:', orderNo);
        return res.send(buildXml({ return_code: 'SUCCESS' }));
      }
      
      const order = orders[0];
      
      // 检查订单状态
      if (order.status === 'paid') {
        return res.send(buildXml({ return_code: 'SUCCESS' }));
      }
      
      // 更新订单状态
      await db.query(`
        UPDATE orders 
        SET status = 'paid', 
            transaction_id = ?, 
            paid_at = NOW()
        WHERE order_no = ?
      `, [transactionId, orderNo]);
      
      // 获取产品配置
      const product = PRODUCTS[order.product_type];
      
      // 计算VIP到期时间
      const [userInfo] = await db.query(
        'SELECT vip_expire_at FROM users WHERE id = ?',
        [order.user_id]
      );
      
      let newExpireDate;
      if (userInfo[0]?.vip_expire_at && new Date(userInfo[0].vip_expire_at) > new Date()) {
        // 续费，从当前到期时间延长
        newExpireDate = new Date(userInfo[0].vip_expire_at);
        newExpireDate.setDate(newExpireDate.getDate() + product.duration);
      } else {
        // 新购，从当前时间开始
        newExpireDate = new Date();
        newExpireDate.setDate(newExpireDate.getDate() + product.duration);
      }
      
      // 更新用户VIP状态
      await db.query(`
        UPDATE users 
        SET is_vip = TRUE, 
            vip_expire_at = ?,
            updated_at = NOW()
        WHERE id = ?
      `, [newExpireDate, order.user_id]);
      
      // 更新订单的到期时间
      await db.query(
        'UPDATE orders SET expire_at = ? WHERE order_no = ?',
        [newExpireDate, orderNo]
      );
      
      console.log(`订单 ${orderNo} 支付成功，VIP到期时间: ${newExpireDate}`);
    }
    
    // 返回成功响应给微信
    res.send(buildXml({ return_code: 'SUCCESS' }));
  } catch (err) {
    console.error('处理支付回调失败:', err);
    res.send(buildXml({
      return_code: 'FAIL',
      return_msg: '处理失败'
    }));
  }
});

// 申请退款
router.post('/refund', authenticate, async (req, res) => {
  try {
    // TODO: 检查管理员权限
    const { orderNo, refundAmount, reason } = req.body;
    
    // 查询订单
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE order_no = ? AND status = "paid"',
      [orderNo]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: '订单不存在或未支付' });
    }
    
    const order = orders[0];
    
    // 检查退款金额
    const refundFee = refundAmount || order.amount;
    if (refundFee > order.amount) {
      return res.status(400).json({ success: false, message: '退款金额不能大于订单金额' });
    }
    
    // 生成退款单号
    const refundNo = 'RF' + Date.now() + Math.random().toString(36).substr(2, 4);
    
    // 保存退款记录
    await db.query(`
      INSERT INTO refunds 
      (refund_no, order_no, user_id, amount, reason, status, created_at)
      VALUES (?, ?, ?, ?, ?, 'pending', NOW())
    `, [refundNo, orderNo, order.user_id, refundFee, reason]);
    
    // TODO: 调用微信退款API（需要商户证书）
    
    res.json({
      success: true,
      data: { refundNo },
      message: '退款申请已提交'
    });
  } catch (err) {
    console.error('申请退款失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

// 获取产品价格列表
router.get('/products', async (req, res) => {
  try {
    const products = Object.entries(PRODUCTS).map(([key, value]) => ({
      type: key,
      ...value
    }));
    
    res.json({
      success: true,
      data: products
    });
  } catch (err) {
    console.error('获取产品价格失败:', err);
    res.status(500).json({ success: false, message: '服务器错误' });
  }
});

module.exports = router;
