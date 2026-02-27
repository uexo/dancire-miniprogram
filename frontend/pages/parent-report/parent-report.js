/** 家长报告页 - 查看孩子学习数据 */
const api = require('../../utils/api.js');
const algorithm = require('../../utils/algorithm.js');

Page({
  data: {
    // 加载状态
    loading: true,
    
    // 学习统计
    stats: {
      totalWords: 0,      // 已学单词总数
      masteredWords: 0,   // 已掌握单词数
      accuracy: 0,        // 平均正确率
      studyMinutes: 0,    // 学习时长(分钟)
      continuousDays: 0,  // 连续打卡天数
      totalDays: 0        // 累计学习天数
    },
    
    // 艾宾浩斯记忆曲线数据
    memoryCurve: [],
    
    // 打卡日历数据
    calendar: {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      days: []
    },
    
    // 错题本
    wrongWords: [],
    wrongWordsPage: 1,
    wrongWordsTotal: 0,
    
    // 建议提醒
    suggestions: [],
    
    // 当前选中tab
    activeTab: 'stats', // stats, calendar, wrongwords
    
    // 分享信息
    shareInfo: null
  },

  onLoad(options) {
    // 支持通过参数指定查看的孩子ID（家长视角）
    const childId = options.childId || null;
    this.setData({ childId });
    
    this.loadReportData();
  },

  onShow() {
    this.loadReportData();
  },

  onPullDownRefresh() {
    this.loadReportData().finally(() => {
      wx.stopPullDownRefresh();
    });
  },

  onShareAppMessage() {
    return {
      title: `${this.data.shareInfo?.childName || '孩子'}的学习报告 - 单词热`,
      path: `/pages/parent-report/parent-report?childId=${this.data.childId || ''}`,
      imageUrl: '/assets/images/share-report.png'
    };
  },

  // 加载报告数据
  async loadReportData() {
    this.setData({ loading: true });
    
    try {
      await Promise.all([
        this.loadStudyStats(),
        this.loadMemoryCurve(),
        this.loadCalendarData(),
        this.loadWrongWords(),
        this.generateSuggestions()
      ]);
    } catch (err) {
      console.error('加载报告数据失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载学习统计数据
  async loadStudyStats() {
    try {
      const res = await api.get('/reports/stats', {
        childId: this.data.childId
      });
      
      const stats = res.data;
      this.setData({
        stats: {
          totalWords: stats.total_words || 0,
          masteredWords: stats.mastered_words || 0,
          accuracy: stats.accuracy || 0,
          studyMinutes: stats.study_minutes || 0,
          continuousDays: stats.continuous_days || 0,
          totalDays: stats.total_days || 0
        },
        shareInfo: {
          childName: stats.child_name || '孩子'
        }
      });
    } catch (err) {
      console.error('加载统计数据失败:', err);
    }
  },

  // 加载艾宾浩斯记忆曲线数据
  async loadMemoryCurve() {
    try {
      const res = await api.get('/reports/memory-curve', {
        childId: this.data.childId,
        days: 30
      });
      
      const curveData = res.data || [];
      
      // 生成记忆曲线图表数据
      const memoryCurve = this.generateMemoryCurveData(curveData);
      
      this.setData({ memoryCurve });
    } catch (err) {
      console.error('加载记忆曲线失败:', err);
    }
  },

  // 生成记忆曲线可视化数据
  generateMemoryCurveData(rawData) {
    const days = 30;
    const data = [];
    
    // 艾宾浩斯遗忘曲线理论值
    const ebbinghausCurve = [
      { day: 0, retention: 100 },
      { day: 1, retention: 56 },
      { day: 2, retention: 36 },
      { day: 6, retention: 25 },
      { day: 14, retention: 21 },
      { day: 30, retention: 18 }
    ];
    
    // 插值计算每天的保留率
    for (let i = 0; i <= days; i++) {
      let retention = 100;
      
      // 找到对应区间进行线性插值
      for (let j = 0; j < ebbinghausCurve.length - 1; j++) {
        const curr = ebbinghausCurve[j];
        const next = ebbinghausCurve[j + 1];
        
        if (i >= curr.day && i <= next.day) {
          const ratio = (i - curr.day) / (next.day - curr.day);
          retention = curr.retention + (next.retention - curr.retention) * ratio;
          break;
        }
      }
      
      // 计算实际保留率（基于复习情况）
      const dayData = rawData.find(d => d.day_offset === i);
      const actualRetention = dayData ? dayData.retention : retention;
      
      data.push({
        day: i,
        theoretical: Math.round(retention),
        actual: Math.round(actualRetention),
        reviewed: !!dayData?.reviewed
      });
    }
    
    return data;
  },

  // 加载打卡日历数据
  async loadCalendarData() {
    try {
      const { year, month } = this.data.calendar;
      
      const res = await api.get('/reports/calendar', {
        childId: this.data.childId,
        year,
        month
      });
      
      const studyDays = res.data?.study_days || [];
      const dailyStats = res.data?.daily_stats || {};
      
      // 生成当月日历
      const days = this.generateCalendarDays(year, month, studyDays, dailyStats);
      
      this.setData({
        'calendar.days': days
      });
    } catch (err) {
      console.error('加载日历数据失败:', err);
    }
  },

  // 生成日历天数
  generateCalendarDays(year, month, studyDays, dailyStats) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
    
    const days = [];
    
    // 填充月初空白
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ type: 'empty' });
    }
    
    // 填充日期
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const hasStudy = studyDays.includes(day);
      const stats = dailyStats[dateStr];
      
      let status = 'none';
      if (hasStudy) {
        if (stats) {
          if (stats.accuracy >= 90) status = 'excellent';
          else if (stats.accuracy >= 70) status = 'good';
          else status = 'normal';
        } else {
          status = 'normal';
        }
      }
      
      days.push({
        day,
        type: 'day',
        isToday,
        status,
        stats: stats || null
      });
    }
    
    return days;
  },

  // 切换月份
  onChangeMonth(e) {
    const delta = e.currentTarget.dataset.delta;
    let { year, month } = this.data.calendar;
    
    month += parseInt(delta);
    
    if (month > 12) {
      month = 1;
      year++;
    } else if (month < 1) {
      month = 12;
      year--;
    }
    
    this.setData({
      'calendar.year': year,
      'calendar.month': month
    }, () => {
      this.loadCalendarData();
    });
  },

  // 加载错题本
  async loadWrongWords(page = 1) {
    try {
      const res = await api.get('/reports/wrong-words', {
        childId: this.data.childId,
        page,
        pageSize: 20
      });
      
      const { words, total } = res.data;
      
      this.setData({
        wrongWords: page === 1 ? words : [...this.data.wrongWords, ...words],
        wrongWordsPage: page,
        wrongWordsTotal: total
      });
    } catch (err) {
      console.error('加载错题本失败:', err);
    }
  },

  // 加载更多错题
  onLoadMoreWrongWords() {
    const { wrongWordsPage, wrongWords, wrongWordsTotal } = this.data;
    
    if (wrongWords.length >= wrongWordsTotal) {
      return;
    }
    
    this.loadWrongWords(wrongWordsPage + 1);
  },

  // 生成学习建议
  async generateSuggestions() {
    const { stats } = this.data;
    const suggestions = [];
    
    // 基于正确率的建议
    if (stats.accuracy < 60) {
      suggestions.push({
        type: 'warning',
        icon: '⚠️',
        title: '正确率偏低',
        content: `当前正确率为${stats.accuracy}%，建议降低学习难度，多复习基础单词。`
      });
    } else if (stats.accuracy >= 90) {
      suggestions.push({
        type: 'success',
        icon: '🎉',
        title: '表现优秀',
        content: '正确率很高，可以适当增加每日学习量。'
      });
    }
    
    // 基于学习时长的建议
    if (stats.studyMinutes < 60) {
      suggestions.push({
        type: 'info',
        icon: '💡',
        title: '学习时长不足',
        content: '本周学习时长较短，建议每天保持15-20分钟的学习时间。'
      });
    }
    
    // 基于连续天数的建议
    if (stats.continuousDays === 0) {
      suggestions.push({
        type: 'warning',
        icon: '⏰',
        title: '坚持打卡',
        content: '已经中断打卡，建议重新开始每日学习计划。'
      });
    } else if (stats.continuousDays >= 7) {
      suggestions.push({
        type: 'success',
        icon: '🔥',
        title: '连续打卡',
        content: `已经连续打卡${stats.continuousDays}天，保持这个好习惯！`
      });
    }
    
    // 基于错题数量的建议
    const wrongWordsCount = this.data.wrongWords.length;
    if (wrongWordsCount > 50) {
      suggestions.push({
        type: 'warning',
        icon: '📝',
        title: '错题较多',
        content: `错题本有${wrongWordsCount}个单词，建议定期复习错题。`
      });
    }
    
    this.setData({ suggestions });
  },

  // 切换tab
  onSwitchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  // 查看单词详情
  onViewWordDetail(e) {
    const wordId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/word-detail/word-detail?id=${wordId}`
    });
  },

  // 开始复习错题
  onReviewWrongWords() {
    const wrongWordIds = this.data.wrongWords.map(w => w.id);
    
    if (wrongWordIds.length === 0) {
      wx.showToast({ title: '暂无错题', icon: 'none' });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/study/study?mode=wrong&wordIds=${wrongWordIds.join(',')}`
    });
  },

  // 导出报告
  onExportReport() {
    wx.showActionSheet({
      itemList: ['生成图片分享', '发送给家长'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.generateReportImage();
        } else if (res.tapIndex === 1) {
          this.shareToParent();
        }
      }
    });
  },

  // 生成报告图片
  generateReportImage() {
    wx.showLoading({ title: '生成中...' });
    
    // 使用canvas生成分享图
    const query = wx.createSelectorQuery();
    query.select('#reportCanvas').fields({ node: true, size: true }).exec((res) => {
      const canvas = res[0].node;
      const ctx = canvas.getContext('2d');
      
      // 绘制白色背景
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 750, 1200);
      
      // 绘制标题
      ctx.fillStyle = '#4CAF50';
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('学习周报', 375, 80);
      
      // TODO: 绘制更多内容
      
      wx.hideLoading();
      
      wx.canvasToTempFilePath({
        canvas,
        success: (res) => {
          wx.previewImage({
            urls: [res.tempFilePath]
          });
        }
      });
    });
  },

  // 分享给家长
  shareToParent() {
    // 生成分享链接
    const shareToken = this.generateShareToken();
    
    wx.showModal({
      title: '发送给家长',
      content: '报告链接已生成，请在微信中分享给家长查看。',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: `https://wordheat.com/report/${shareToken}`,
            success: () => {
              wx.showToast({ title: '链接已复制' });
            }
          });
        }
      }
    });
  },

  // 生成分享token
  generateShareToken() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `${this.data.childId || 'self'}_${timestamp}_${random}`;
  }
});
