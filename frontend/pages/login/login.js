/** 登录页 - 微信授权登录 */
const api = require('../../utils/api.js');

Page({
  data: {
    // 加载状态
    loading: false,
    
    // 登录方式
    loginType: 'wx', // wx, phone
    
    // 手机号登录
    phoneNumber: '',
    verifyCode: '',
    counting: false,
    countDown: 60,
    
    // 用户协议
    agreeProtocol: false,
    
    // 错误提示
    errorMsg: ''
  },

  onLoad(options) {
    // 检查是否已登录
    this.checkLoginStatus();
    
    // 保存跳转页面
    if (options.redirect) {
      this.redirectUrl = decodeURIComponent(options.redirect);
    }
  },

  // 检查登录状态
  async checkLoginStatus() {
    const token = wx.getStorageSync('token');
    if (token) {
      try {
        // 验证token有效性
        const res = await api.get('/users/info');
        if (res.success) {
          // 已登录，跳转到首页
          wx.switchTab({ url: '/pages/index/index' });
        }
      } catch (err) {
        // token无效，清除
        wx.removeStorageSync('token');
        wx.removeStorageSync('userInfo');
      }
    }
  },

  // 勾选用户协议
  onToggleProtocol() {
    this.setData({
      agreeProtocol: !this.data.agreeProtocol,
      errorMsg: ''
    });
  },

  // 查看用户协议
  onViewProtocol() {
    wx.navigateTo({
      url: '/pages/protocol/protocol?type=user'
    });
  },

  // 查看隐私政策
  onViewPrivacy() {
    wx.navigateTo({
      url: '/pages/protocol/protocol?type=privacy'
    });
  },

  // 微信登录按钮点击
  onWxLogin() {
    if (!this.data.agreeProtocol) {
      this.setData({ errorMsg: '请先同意用户协议和隐私政策' });
      return;
    }

    this.setData({ loading: true, errorMsg: '' });

    // 获取微信登录code
    wx.login({
      success: (res) => {
        if (res.code) {
          this.handleWxLogin(res.code);
        } else {
          this.setData({ 
            loading: false, 
            errorMsg: '微信登录失败：' + res.errMsg 
          });
        }
      },
      fail: (err) => {
        this.setData({ 
          loading: false, 
          errorMsg: '微信登录失败：' + err.errMsg 
        });
      }
    });
  },

  // 处理微信登录
  async handleWxLogin(code) {
    try {
      // 调用后端登录接口
      const res = await api.post('/auth/wx-login', { code });
      
      if (res.success) {
        // 保存token和用户信息
        wx.setStorageSync('token', res.data.token);
        wx.setStorageSync('userInfo', res.data.userInfo);
        
        // 设置全局数据
        getApp().globalData.userInfo = res.data.userInfo;
        getApp().globalData.isLogin = true;
        
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        });
        
        // 延迟跳转
        setTimeout(() => {
          this.navigateAfterLogin();
        }, 1500);
      } else {
        this.setData({ 
          loading: false, 
          errorMsg: res.message || '登录失败' 
        });
      }
    } catch (err) {
      console.error('登录请求失败:', err);
      this.setData({ 
        loading: false, 
        errorMsg: '网络错误，请稍后重试' 
      });
    }
  },

  // 获取手机号（微信快速验证组件）
  onGetPhoneNumber(e) {
    if (!this.data.agreeProtocol) {
      this.setData({ errorMsg: '请先同意用户协议和隐私政策' });
      return;
    }

    if (e.detail.errMsg !== 'getPhoneNumber:ok') {
      this.setData({ errorMsg: '获取手机号失败' });
      return;
    }

    this.setData({ loading: true, errorMsg: '' });

    // 获取微信登录code
    wx.login({
      success: (res) => {
        if (res.code) {
          this.handlePhoneLogin(res.code, e.detail.code);
        }
      }
    });
  },

  // 处理手机号登录
  async handlePhoneLogin(wxCode, phoneCode) {
    try {
      const res = await api.post('/auth/phone-login', {
        wxCode,
        phoneCode
      });
      
      if (res.success) {
        wx.setStorageSync('token', res.data.token);
        wx.setStorageSync('userInfo', res.data.userInfo);
        
        getApp().globalData.userInfo = res.data.userInfo;
        getApp().globalData.isLogin = true;
        
        wx.showToast({ title: '登录成功', icon: 'success' });
        
        setTimeout(() => {
          this.navigateAfterLogin();
        }, 1500);
      } else {
        this.setData({ 
          loading: false, 
          errorMsg: res.message || '登录失败' 
        });
      }
    } catch (err) {
      this.setData({ 
        loading: false, 
        errorMsg: '网络错误，请稍后重试' 
      });
    }
  },

  // 登录后跳转
  navigateAfterLogin() {
    if (this.redirectUrl) {
      wx.navigateTo({ url: this.redirectUrl });
    } else {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  // 切换登录方式
  onSwitchLoginType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ 
      loginType: type,
      errorMsg: '' 
    });
  },

  // 输入手机号
  onPhoneInput(e) {
    this.setData({
      phoneNumber: e.detail.value,
      errorMsg: ''
    });
  },

  // 输入验证码
  onCodeInput(e) {
    this.setData({
      verifyCode: e.detail.value,
      errorMsg: ''
    });
  },

  // 发送验证码
  async onSendCode() {
    const { phoneNumber, counting } = this.data;
    
    if (counting) return;
    
    // 验证手机号
    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      this.setData({ errorMsg: '请输入正确的手机号' });
      return;
    }

    try {
      const res = await api.post('/auth/send-code', {
        phoneNumber
      });
      
      if (res.success) {
        wx.showToast({ title: '验证码已发送', icon: 'success' });
        this.startCountDown();
      } else {
        this.setData({ errorMsg: res.message || '发送失败' });
      }
    } catch (err) {
      this.setData({ errorMsg: '网络错误，请稍后重试' });
    }
  },

  // 开始倒计时
  startCountDown() {
    this.setData({ counting: true, countDown: 60 });
    
    this.countDownTimer = setInterval(() => {
      const countDown = this.data.countDown - 1;
      
      if (countDown <= 0) {
        clearInterval(this.countDownTimer);
        this.setData({ counting: false, countDown: 60 });
      } else {
        this.setData({ countDown });
      }
    }, 1000);
  },

  // 手机号登录提交
  async onPhoneLogin() {
    const { phoneNumber, verifyCode, agreeProtocol } = this.data;
    
    if (!agreeProtocol) {
      this.setData({ errorMsg: '请先同意用户协议和隐私政策' });
      return;
    }
    
    if (!/^1[3-9]\d{9}$/.test(phoneNumber)) {
      this.setData({ errorMsg: '请输入正确的手机号' });
      return;
    }
    
    if (!/^\d{6}$/.test(verifyCode)) {
      this.setData({ errorMsg: '请输入6位验证码' });
      return;
    }

    this.setData({ loading: true, errorMsg: '' });

    try {
      const res = await api.post('/auth/verify-code-login', {
        phoneNumber,
        verifyCode
      });
      
      if (res.success) {
        wx.setStorageSync('token', res.data.token);
        wx.setStorageSync('userInfo', res.data.userInfo);
        
        getApp().globalData.userInfo = res.data.userInfo;
        getApp().globalData.isLogin = true;
        
        wx.showToast({ title: '登录成功', icon: 'success' });
        
        setTimeout(() => {
          this.navigateAfterLogin();
        }, 1500);
      } else {
        this.setData({ 
          loading: false, 
          errorMsg: res.message || '登录失败' 
        });
      }
    } catch (err) {
      this.setData({ 
        loading: false, 
        errorMsg: '网络错误，请稍后重试' 
      });
    }
  },

  // 游客模式
  onGuestLogin() {
    wx.showModal({
      title: '游客模式',
      content: '游客模式下数据不会保存，建议登录后使用完整功能',
      confirmText: '继续',
      success: (res) => {
        if (res.confirm) {
          // 设置游客标识
          wx.setStorageSync('isGuest', true);
          wx.switchTab({ url: '/pages/index/index' });
        }
      }
    });
  },

  onUnload() {
    // 清除定时器
    if (this.countDownTimer) {
      clearInterval(this.countDownTimer);
    }
  }
});
