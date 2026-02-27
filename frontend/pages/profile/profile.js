// pages/profile/profile.js
const api = require('../../utils/api.js');

Page({
  data: {
    userInfo: null,
    isLogin: false,
    stats: {
      totalWords: 0,
      masteredWords: 0,
      continuousDays: 0
    }
  },

  onLoad() {
    this.loadUserInfo();
  },

  onShow() {
    this.loadUserInfo();
  },

  // 加载用户信息
  async loadUserInfo() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (!token) {
      this.setData({ isLogin: false });
      return;
    }
    
    this.setData({ 
      isLogin: true,
      userInfo: userInfo 
    });
    
    // 加载统计数据
    this.loadStats();
  },

  // 加载统计数据
  async loadStats() {
    try {
      const res = await api.get('/users/stats');
      if (res.success) {
        this.setData({
          stats: {
            totalWords: res.data.total_words || 0,
            masteredWords: res.data.mastered_words || 0,
            continuousDays: res.data.continuous_days || 0
          }
        });
      }
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  },

  // 去登录
  onLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    });
  },

  // 查看学习报告
  onViewReport() {
    wx.navigateTo({
      url: '/pages/parent-report/parent-report'
    });
  },

  // 购买VIP
  onBuyVip() {
    wx.navigateTo({
      url: '/pages/vip/vip'
    });
  },

  // 设置年级和教材
  onSettings() {
    wx.showActionSheet({
      itemList: ['设置年级', '设置教材版本', '学习提醒'],
      success: (res) => {
        switch(res.tapIndex) {
          case 0:
            this.setGrade();
            break;
          case 1:
            this.setTextbook();
            break;
          case 2:
            wx.showToast({ title: '功能开发中', icon: 'none' });
            break;
        }
      }
    });
  },

  // 设置年级
  setGrade() {
    wx.showActionSheet({
      itemList: ['三年级', '四年级', '五年级', '六年级', '七年级', '八年级', '九年级'],
      success: async (res) => {
        const grades = [3, 4, 5, 6, 7, 8, 9];
        const grade = grades[res.tapIndex];
        
        try {
          await api.post('/users/update', { grade });
          
          // 更新本地数据
          const userInfo = this.data.userInfo;
          userInfo.grade = grade;
          wx.setStorageSync('userInfo', userInfo);
          
          this.setData({ userInfo });
          wx.showToast({ title: '设置成功', icon: 'success' });
        } catch (err) {
          wx.showToast({ title: '设置失败', icon: 'none' });
        }
      }
    });
  },

  // 设置教材
  setTextbook() {
    wx.showActionSheet({
      itemList: ['人教版PEP', '外研版', '牛津版'],
      success: async (res) => {
        const versions = ['pep', 'waiyan', 'oxford'];
        const textbookVersion = versions[res.tapIndex];
        
        try {
          await api.post('/users/update', { textbookVersion });
          
          const userInfo = this.data.userInfo;
          userInfo.textbookVersion = textbookVersion;
          wx.setStorageSync('userInfo', userInfo);
          
          this.setData({ userInfo });
          wx.showToast({ title: '设置成功', icon: 'success' });
        } catch (err) {
          wx.showToast({ title: '设置失败', icon: 'none' });
        }
      }
    });
  },

  // 联系客服
  onContact() {
    wx.showModal({
      title: '联系客服',
      content: '客服微信: wordheat_support\n客服电话: 400-xxx-xxxx',
      showCancel: false
    });
  },

  // 关于我们
  onAbout() {
    wx.showModal({
      title: '关于单词热',
      content: '单词热 v1.0.0\n专为中小学生打造的背单词小程序\n\n让背单词变得简单有趣！',
      showCancel: false
    });
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录信息
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          
          // 重置页面数据
          this.setData({
            isLogin: false,
            userInfo: null,
            stats: {
              totalWords: 0,
              masteredWords: 0,
              continuousDays: 0
            }
          });
          
          wx.showToast({ title: '已退出登录', icon: 'success' });
        }
      }
    });
  }
});
