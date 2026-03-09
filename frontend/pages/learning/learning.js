// pages/learning/learning.js
// 学习模式选择中心 - 基于 PRD 5.2.1

const api = require('../../utils/api.js');

Page({
  data: {
    // 当前词库信息
    currentWordbank: {
      id: 1,
      name: '人教版PEP三年级上册',
      totalWords: 64,
      masteredWords: 23,
      progress: 36
    },
    
    // 学习模式列表
    learningModes: [
      {
        id: 'card',
        name: '卡片学习',
        icon: '🎴',
        desc: '图像记忆，生动有趣',
        masteryRate: 75,
        color: '#6D28D9'
      },
      {
        id: 'choice',
        name: '选择题',
        icon: '✅',
        desc: '四选一测试理解',
        masteryRate: 60,
        color: '#3B82F6'
      },
      {
        id: 'spelling',
        name: '拼写练习',
        icon: '✍️',
        desc: '键盘输入拼写练习',
        masteryRate: 45,
        color: '#10B981',
        isNew: true
      },
      {
        id: 'dictation',
        name: '听写练习',
        icon: '🎧',
        desc: '听音频写单词',
        masteryRate: 30,
        color: '#F59E0B'
      },
      {
        id: 'smart',
        name: '智能混合',
        icon: '🤖',
        desc: 'AI适应性学习',
        masteryRate: 65,
        color: '#EF4444',
        isVip: true
      }
    ],
    
    // 学习设置
    settings: {
      dailyCount: 20,
      autoPlay: true,
      speechRate: 'normal'
    },
    
    // 上次学习记录
    lastStudy: {
      mode: 'card',
      wordIndex: 15,
      date: '2025-03-05'
    },
    
    // 页面状态
    showSettings: false,
    isVip: false
  },

  onLoad() {
    this.loadUserInfo();
    this.loadWordbankInfo();
    this.loadLearningStats();
  },

  onShow() {
    // 每次显示页面时刷新数据
    this.loadLearningStats();
  },

  // 加载用户信息
  async loadUserInfo() {
    try {
      const res = await api.get('/users/info');
      this.setData({
        isVip: res.data.is_vip || false
      });
    } catch (err) {
      console.error('加载用户信息失败:', err);
    }
  },

  // 加载词库信息
  async loadWordbankInfo() {
    try {
      const res = await api.get('/wordbank/current');
      this.setData({
        currentWordbank: res.data
      });
    } catch (err) {
      console.error('加载词库信息失败:', err);
      // 使用默认数据
    }
  },

  // 加载学习统计
  async loadLearningStats() {
    try {
      const res = await api.get('/users/learning-stats');
      const stats = res.data;
      
      // 更新各模式的掌握率
      const modes = this.data.learningModes.map(mode => {
        return {
          ...mode,
          masteryRate: stats[mode.id] || mode.masteryRate
        };
      });
      
      this.setData({
        learningModes: modes,
        lastStudy: stats.lastStudy || this.data.lastStudy
      });
    } catch (err) {
      console.error('加载学习统计失败:', err);
    }
  },

  // 选择学习模式
  onSelectMode(e) {
    const modeId = e.currentTarget.dataset.mode;
    const mode = this.data.learningModes.find(m => m.id === modeId);
    
    // 检查VIP权限
    if (mode.isVip && !this.data.isVip) {
      wx.showModal({
        title: 'VIP功能',
        content: '该功能需要VIP会员，是否立即开通？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/vip/vip'
            });
          }
        }
      });
      return;
    }
    
    // 进入学习页面
    wx.navigateTo({
      url: `/pages/study/study?mode=${modeId}`
    });
  },

  // 继续上次学习
  onContinueStudy() {
    const { lastStudy } = this.data;
    wx.navigateTo({
      url: `/pages/study/study?mode=${lastStudy.mode}&continue=1`
    });
  },

  // 切换设置显示
  onToggleSettings() {
    this.setData({
      showSettings: !this.data.showSettings
    });
  },

  // 更改每日学习数量
  onChangeDailyCount(e) {
    const count = parseInt(e.detail.value);
    this.setData({
      'settings.dailyCount': count
    });
    this.saveSettings();
  },

  // 切换自动播放
  onToggleAutoPlay(e) {
    this.setData({
      'settings.autoPlay': e.detail.value
    });
    this.saveSettings();
  },

  // 更改语速
  onChangeSpeechRate(e) {
    const rates = ['slow', 'normal', 'fast'];
    const rate = rates[e.detail.value];
    this.setData({
      'settings.speechRate': rate
    });
    this.saveSettings();
  },

  // 保存设置
  saveSettings() {
    wx.setStorageSync('learningSettings', this.data.settings);
    // 同步到服务器
    api.post('/users/settings', this.data.settings).catch(err => {
      console.error('保存设置失败:', err);
    });
  },

  // 更换词库
  onChangeWordbank() {
    wx.navigateTo({
      url: '/pages/library/library'
    });
  },

  // 查看学习统计
  onViewStats() {
    wx.navigateTo({
      url: '/pages/parent-report/parent-report'
    });
  },

  // 下拉刷新
  async onPullDownRefresh() {
    await this.loadLearningStats();
    wx.stopPullDownRefresh();
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: '单词热 - 让背单词变得有趣',
      path: '/pages/learning/learning',
      imageUrl: '/assets/images/share-learning.png'
    };
  }
});
