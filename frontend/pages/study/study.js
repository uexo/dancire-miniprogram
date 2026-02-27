// pages/study/study.js
const api = require('../../utils/api.js');
const algorithm = require('../../utils/algorithm.js');

Page({
  data: {
    currentWord: null,
    wordList: [],
    currentIndex: 0,
    mode: 'learn', // learn, review, test
    showAnswer: false,
    selectedOption: null,
    isCorrect: null,
    progress: {
      current: 0,
      total: 0
    },
    studyStats: {
      correct: 0,
      wrong: 0
    }
  },

  onLoad(options) {
    const mode = options.mode || 'learn';
    this.setData({ mode });
    this.loadTodayTasks();
  },

  // 加载今日学习任务
  async loadTodayTasks() {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await api.get('/words/today');
      const wordList = res.data || [];
      
      if (wordList.length === 0) {
        wx.showToast({ 
          title: '今日任务已完成！', 
          icon: 'success',
          duration: 2000
        });
        setTimeout(() => wx.navigateBack(), 2000);
        return;
      }

      this.setData({
        wordList,
        'progress.total': wordList.length,
        currentWord: wordList[0]
      });
    } catch (err) {
      console.error('加载任务失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  // 显示答案
  onShowAnswer() {
    this.setData({ showAnswer: true });
  },

  // 选择选项（选择题模式）
  onSelectOption(e) {
    const index = e.currentTarget.dataset.index;
    const currentWord = this.data.currentWord;
    const isCorrect = index === currentWord.correctIndex;
    
    this.setData({
      selectedOption: index,
      isCorrect,
      showAnswer: true
    });

    // 延迟后自动下一题
    setTimeout(() => {
      this.submitAnswer(isCorrect);
    }, 1500);
  },

  // 提交答案
  async submitAnswer(isCorrect) {
    const { currentWord, currentIndex, wordList } = this.data;
    
    // 更新学习记录
    try {
      await api.post('/words/answer', {
        wordId: currentWord.id,
        correct: isCorrect
      });
    } catch (err) {
      console.error('提交答案失败:', err);
    }

    // 更新统计
    const statsKey = isCorrect ? 'studyStats.correct' : 'studyStats.wrong';
    this.setData({
      [statsKey]: this.data.studyStats[isCorrect ? 'correct' : 'wrong'] + 1
    });

    // 检查是否完成
    if (currentIndex >= wordList.length - 1) {
      this.onStudyComplete();
      return;
    }

    // 下一题
    const nextIndex = currentIndex + 1;
    this.setData({
      currentIndex: nextIndex,
      currentWord: wordList[nextIndex],
      'progress.current': nextIndex,
      showAnswer: false,
      selectedOption: null,
      isCorrect: null
    });
  },

  // 学习完成
  onStudyComplete() {
    const { studyStats, progress } = this.data;
    const accuracy = Math.round((studyStats.correct / progress.total) * 100);
    
    // 调用打卡接口
    api.post('/checkin', {
      studiedWords: progress.total,
      accuracy
    });

    wx.showModal({
      title: '今日任务完成！',
      content: `学习了${progress.total}个单词，正确率${accuracy}%`,
      showCancel: false,
      success: () => {
        wx.navigateBack();
      }
    });
  },

  // 播放发音
  onPlayAudio() {
    const { currentWord } = this.data;
    if (!currentWord.audioUrl) {
      // 使用微信TTS
      const innerAudioContext = wx.createInnerAudioContext();
      // 这里可以接入百度/腾讯TTS API
      wx.showToast({ title: '播放中...', icon: 'none' });
      return;
    }
    
    const innerAudioContext = wx.createInnerAudioContext();
    innerAudioContext.src = currentWord.audioUrl;
    innerAudioContext.play();
  },

  // 标记为太简单
  onMarkEasy() {
    const { currentWord } = this.data;
    api.post('/words/mark', {
      wordId: currentWord.id,
      type: 'easy'
    });
    this.nextWord();
  },

  // 标记为困难
  onMarkHard() {
    const { currentWord } = this.data;
    api.post('/words/mark', {
      wordId: currentWord.id,
      type: 'hard'
    });
  },

  // 下一题
  nextWord() {
    const { currentIndex, wordList } = this.data;
    if (currentIndex < wordList.length - 1) {
      const nextIndex = currentIndex + 1;
      this.setData({
        currentIndex: nextIndex,
        currentWord: wordList[nextIndex],
        'progress.current': nextIndex,
        showAnswer: false,
        selectedOption: null,
        isCorrect: null
      });
    }
  }
});
