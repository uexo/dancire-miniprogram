/** VIP会员页 - 接入微信支付 */
const api = require('../../utils/api.js');

Page({
  data: {
    products: [],
    selectedProduct: '',
    isVip: false,
    vipExpireDate: '',
    loading: true
  },

  onLoad() {
    this.loadProducts();
    this.loadUserVipStatus();
  },

  onShow() {
    this.loadUserVipStatus();
  },

  // 加载产品价格
  async loadProducts() {
    try {
      const res = await api.get('/payment/products');
      
      if (res.success) {
        // 添加额外信息
        const products = res.data.map(p => ({
          id: p.type,
          name: p.name,
          duration: this.formatDuration(p.duration),
          price: p.price,
          originalPrice: this.calculateOriginalPrice(p.price, p.duration),
          description: p.description,
          features: this.getFeatures(p.type),
          tag: this.getTag(p.type),
          hot: p.type === 'quarter'
        }));
        
        const selectedProduct = products[1]?.id || products[0]?.id;
        const selectedProductData = products.find(p => p.id === selectedProduct);
        
        this.setData({
          products,
          selectedProduct,
          selectedProductPrice: selectedProductData?.price || 0,
          selectedProductOriginalPrice: selectedProductData?.originalPrice || 0,
          loading: false
        });
      }
    } catch (err) {
      console.error('加载产品价格失败:', err);
      // 使用默认数据
      const defaultProducts = this.getDefaultProducts();
      const defaultProduct = defaultProducts.find(p => p.id === 'quarter');
      this.setData({
        products: defaultProducts,
        selectedProduct: 'quarter',
        selectedProductPrice: defaultProduct?.price || 0,
        selectedProductOriginalPrice: defaultProduct?.originalPrice || 0,
        loading: false
      });
    }
  },

  // 格式化时长
  formatDuration(days) {
    if (days >= 365) return `${Math.floor(days / 365)}年`;
    if (days >= 30) return `${Math.floor(days / 30)}个月`;
    return `${days}天`;
  },

  // 计算原价（显示优惠用）
  calculateOriginalPrice(price, days) {
    const monthlyPrice = 39.9;
    const months = days / 30;
    return Math.round(monthlyPrice * months * 10) / 10;
  },

  // 获取产品特色
  getFeatures(type) {
    const featuresMap = {
      month: ['解锁全部词库', '无限学习次数', '去广告'],
      quarter: ['解锁全部词库', '无限学习次数', '去广告', '专属客服'],
      year: ['解锁全部词库', '无限学习次数', '去广告', '专属客服', '1对1督学']
    };
    return featuresMap[type] || featuresMap.month;
  },

  // 获取产品标签
  getTag(type) {
    const tagMap = {
      month: '限时优惠',
      quarter: '最受欢迎',
      year: '超值推荐'
    };
    return tagMap[type] || '';
  },

  // 默认产品数据
  getDefaultProducts() {
    return [
      {
        id: 'month',
        name: '月度会员',
        duration: '1个月',
        price: 29.9,
        originalPrice: 39.9,
        features: ['解锁全部词库', '无限学习次数', '去广告'],
        tag: '限时优惠',
        hot: false
      },
      {
        id: 'quarter',
        name: '季度会员',
        duration: '3个月',
        price: 69.9,
        originalPrice: 99.9,
        features: ['解锁全部词库', '无限学习次数', '去广告', '专属客服'],
        tag: '最受欢迎',
        hot: true
      },
      {
        id: 'year',
        name: '年度会员',
        duration: '12个月',
        price: 199,
        originalPrice: 299,
        features: ['解锁全部词库', '无限学习次数', '去广告', '专属客服', '1对1督学'],
        tag: '超值推荐',
        hot: false
      }
    ];
  },

  // 加载用户VIP状态
  async loadUserVipStatus() {
    try {
      const res = await api.get('/users/info');
      
      if (res.success) {
        const expireDate = res.data.vipExpireAt 
          ? this.formatDate(res.data.vipExpireAt) 
          : '';
        
        this.setData({
          isVip: res.data.isVip,
          vipExpireDate: expireDate
        });
      }
    } catch (err) {
      console.error('加载VIP状态失败:', err);
    }
  },

  // 格式化日期
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  },

  // 选择产品
  onSelectProduct(e) {
    const id = e.currentTarget.dataset.id;
    const product = this.data.products.find(p => p.id === id);
    this.setData({ 
      selectedProduct: id,
      selectedProductPrice: product?.price || 0,
      selectedProductOriginalPrice: product?.originalPrice || 0
    });
  },

  // 立即开通
  async onSubscribe() {
    // 检查登录状态
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.navigateTo({
        url: '/pages/login/login?redirect=' + encodeURIComponent('/pages/vip/vip')
      });
      return;
    }

    const product = this.data.products.find(p => p.id === this.data.selectedProduct);
    if (!product) return;

    // 如果是续费，提示
    if (this.data.isVip) {
      const res = await wx.showModal({
        title: '续费确认',
        content: `您当前已是VIP会员，确定要续费${product.name}吗？`,
        confirmText: '确认续费'
      });
      
      if (!res.confirm) return;
    }

    try {
      wx.showLoading({ title: '创建订单...', mask: true });

      // 1. 创建支付订单
      const orderRes = await api.post('/payment/create', {
        productType: product.id
      });

      if (!orderRes.success) {
        wx.showToast({ title: orderRes.message || '创建订单失败', icon: 'none' });
        return;
      }

      const { orderNo, paymentParams } = orderRes.data;

      // 2. 调起微信支付
      wx.hideLoading();
      
      const payResult = await this.requestPayment(paymentParams);
      
      // 3. 支付成功，查询订单状态
      wx.showLoading({ title: '确认中...', mask: true });
      
      await this.checkOrderStatus(orderNo);
      
    } catch (err) {
      console.error('支付失败:', err);
      wx.hideLoading();
      
      if (err.errMsg) {
        if (err.errMsg.includes('cancel')) {
          wx.showToast({ title: '支付已取消', icon: 'none' });
        } else if (err.errMsg.includes('fail')) {
          wx.showModal({
            title: '支付失败',
            content: '支付遇到问题，请重试或联系客服',
            confirmText: '重试',
            success: (res) => {
              if (res.confirm) {
                this.onSubscribe();
              }
            }
          });
        }
      } else {
        wx.showToast({ title: '支付失败，请重试', icon: 'none' });
      }
    }
  },

  // 请求微信支付
  requestPayment(params) {
    return new Promise((resolve, reject) => {
      wx.requestPayment({
        timeStamp: params.timeStamp,
        nonceStr: params.nonceStr,
        package: params.package,
        signType: params.signType || 'MD5',
        paySign: params.paySign,
        success: resolve,
        fail: reject
      });
    });
  },

  // 查询订单状态
  async checkOrderStatus(orderNo) {
    try {
      // 轮询检查订单状态（最多5次，间隔1秒）
      for (let i = 0; i < 5; i++) {
        const res = await api.get(`/payment/order/${orderNo}`);
        
        if (res.success) {
          if (res.data.status === 'paid') {
            wx.hideLoading();
            
            wx.showToast({
              title: '开通成功！',
              icon: 'success',
              duration: 2000
            });
            
            // 更新本地VIP状态
            this.setData({
              isVip: true,
              vipExpireDate: this.formatDate(res.data.expire_at)
            });

            // 触发刷新事件
            const pages = getCurrentPages();
            if (pages.length >= 2) {
              const prevPage = pages[pages.length - 2];
              if (prevPage.onShow) {
                prevPage.onShow();
              }
            }

            // 延迟返回
            setTimeout(() => {
              wx.navigateBack();
            }, 2000);
            
            return;
          }
        }
        
        // 等待1秒再查
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // 超过轮询次数
      wx.hideLoading();
      wx.showModal({
        title: '支付确认中',
        content: '支付结果确认中，请稍后在我的订单中查看',
        showCancel: false
      });
      
    } catch (err) {
      console.error('查询订单状态失败:', err);
      wx.hideLoading();
      wx.showToast({ title: '请稍后查看订单状态', icon: 'none' });
    }
  },

  // 查看会员权益
  onViewBenefits() {
    wx.showModal({
      title: '会员权益',
      content: '1. 解锁全部课本词库\n2. 无限次数学习\n3. 去除所有广告\n4. 专属学习报告\n5. 优先客服支持\n6. 1对1学习督学（年度会员）',
      showCancel: false
    });
  },

  // 联系客服
  onContactService() {
    wx.openCustomerServiceChat({
      extInfo: { url: '' },
      corpId: '',
      success: () => {
        console.log('打开客服成功');
      },
      fail: (err) => {
        console.error('打开客服失败:', err);
        wx.showToast({ title: '客服功能暂未开放', icon: 'none' });
      }
    });
  },

  // 查看订单记录
  onViewOrders() {
    wx.navigateTo({
      url: '/pages/orders/orders'
    });
  }
});
