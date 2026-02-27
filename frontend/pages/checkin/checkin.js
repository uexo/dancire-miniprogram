// pages/checkin/checkin.js
const api = require('../../utils/api.js');

Page({
  data: {
    currentMonth: '',
    currentYear: '',
    calendarDays: [],
    continuousDays: 0,
    totalDays: 0,
    todayCheckin: false,
    rewards: [
      { day: 1, coin: 10, claimed: false },
      { day: 3, coin: 30, claimed: false },
      { day: 7, coin: 100, claimed: false },
      { day: 15, coin: 200, claimed: false },
      { day: 30, coin: 500, claimed: false }
    ]
  },

  onLoad() {
    this.initCalendar();
    this.loadCheckinData();
  },

  onShow() {
    this.loadCheckinData();
  },

  // 初始化日历
  initCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    
    this.setData({
      currentYear: year,
      currentMonth: month
    });
    
    this.generateCalendar(year, month);
  },

  // 生成日历
  generateCalendar(year, month) {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date().getDate();
    
    const days = [];
    
    // 填充空白（上月）
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: '', type: 'empty' });
    }
    
    // 填充日期
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        type: i === today ? 'today' : 'normal',
        checked: false // 从后端获取打卡记录后更新
      });
    }
    
    this.setData({ calendarDays: days });
  },

  // 加载打卡数据
  async loadCheckinData() {
    try {
      const res = await api.get('/checkin/month');
      const data = res.data;
      
      // 更新日历打卡状态
      const days = this.data.calendarDays.map(day => {
        if (day.type === 'empty') return day;
        return {
          ...day,
          checked: data.checkinDays.includes(day.day),
          isToday: day.day === new Date().getDate()
        };
      });
      
      this.setData({
        calendarDays: days,
        continuousDays: data.continuousDays,
        totalDays: data.totalDays,
        todayCheckin: data.todayCheckin,
        rewards: data.rewards || this.data.rewards
      });
    } catch (err) {
      console.error('加载打卡数据失败:', err);
    }
  },

  // 今日打卡
  async onCheckinToday() {
    if (this.data.todayCheckin) {
      wx.showToast({ title: '今日已打卡', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '打卡中...' });
      
      const res = await api.post('/checkin/today');
      
      if (res.data.success) {
        // 打卡成功动画
        this.showCheckinSuccess(res.data);
        
        // 更新本地数据
        this.setData({
          todayCheckin: true,
          continuousDays: this.data.continuousDays + 1
        });
        
        // 刷新日历
        this.loadCheckinData();
      }
    } catch (err) {
      console.error('打卡失败:', err);
      wx.showToast({ title: '打卡失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 显示打卡成功
  showCheckinSuccess(data) {
    const { continuousDays, coin, reward } = data;
    
    let content = `已连续打卡 ${continuousDays} 天\n`;
    content += `获得 ${coin} 金币`;
    
    if (reward) {
      content += `\n额外奖励: ${reward.name}`;
    }
    
    wx.showModal({
      title: '打卡成功！🎉',
      content,
      showCancel: false,
      success: () => {
        // 可以播放动画或音效
      }
    });
  },

  // 领取连续打卡奖励
  async onClaimReward(e) {
    const day = e.currentTarget.dataset.day;
    
    try {
      const res = await api.post('/checkin/claim-reward', { day });
      
      if (res.data.success) {
        wx.showToast({
          title: `获得 ${res.data.coin} 金币`,
          icon: 'success'
        });
        
        // 更新奖励状态
        const rewards = this.data.rewards.map(r => {
          if (r.day === day) {
            return { ...r, claimed: true };
          }
          return r;
        });
        
        this.setData({ rewards });
      }
    } catch (err) {
      wx.showToast({ title: '领取失败', icon: 'none' });
    }
  },

  // 分享打卡
  onShareCheckin() {
    return {
      title: `我已连续打卡 ${this.data.continuousDays} 天，一起来背单词吧！`,
      path: '/pages/checkin/checkin',
      imageUrl: '/assets/images/share-checkin.png'
    };
  }
});
