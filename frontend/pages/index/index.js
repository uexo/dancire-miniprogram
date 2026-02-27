// pages/index/index.js
const api = require('../../utils/api.js');

Page({
  data: {
    userInfo: null,
    todayTasks: 0,
    continuousDays: 0,
    totalWords: 0,
    masteredWords: 0,
    isVip: false,
    vipExpireDate: ''
  },

  onLoad() {
    this.loadUserInfo();
    this.loadTodayTasks();
  },

  onShow() {
    this.loadTodayTasks();
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const res = await api.get('/users/info');
      this.setData({
        userInfo: res.data,
        isVip: res.data.is_vip,
        vipExpireDate: res.data.vip_expire_at || ''
      });
    } catch (err) {
      console.error('加载用户信息失败:', err);
    }
  },

  // 加载今日任务
  async loadTodayTasks() {
    try {
      const res = await api.get('/users/stats');
      const stats = res.data;
      this.setData({
        todayTasks: stats.today_tasks || 0,
        continuousDays: stats.continuous_days || 0,
        totalWords: stats.total_words || 0,
        masteredWords: stats.mastered_words || 0
      });
    } catch (err) {
      console.error('加载统计失败:', err);
    }
  },

  // 开始学习
  onStartStudy() {
    wx.navigateTo({
      url: '/pages/study/study?mode=learn'
    });
  },

  // 继续学习
  onContinueStudy() {
    wx.navigateTo({
      url: '/pages/study/study?mode=review'
    });
  },

  // 打开VIP页面
  onOpenVip() {
    wx.navigateTo({
      url: '/pages/vip/vip'
    });
  },

  // 查看词库
  onViewWords() {
    wx.showToast({
      title: '功能开发中...',
      icon: 'none'
    });
  },

  // 查看错题本
  onViewWrongWords() {
    wx.showToast({
      title: '功能开发中...',
      icon: 'none'
    });
  }
});
