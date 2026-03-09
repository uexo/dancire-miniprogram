// app.js - 单词热小程序入口
// 全局数据和生命周期管理

App({
  // 全局数据
  globalData: {
    userInfo: null,
    token: null,
    apiBaseUrl: 'https://api.wordheat.com/api/v1', // 生产环境
    // apiBaseUrl: 'http://localhost:3000/api/v1', // 开发环境
  },

  // 小程序启动
  onLaunch() {
    console.log('单词热小程序启动');
    
    // 检查登录状态
    this.checkLoginStatus();
    
    // 获取系统信息
    this.getSystemInfo();
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      console.log('已登录，token存在');
    } else {
      console.log('未登录');
    }
  },

  // 获取系统信息
  getSystemInfo() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res;
        console.log('系统信息:', res);
      }
    });
  },

  // 设置全局数据
  setGlobalData(key, value) {
    this.globalData[key] = value;
    // 持久化存储
    if (key === 'token') {
      wx.setStorageSync('token', value);
    }
  },

  // 清除登录状态
  clearLoginStatus() {
    this.globalData.token = null;
    this.globalData.userInfo = null;
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
  }
});
