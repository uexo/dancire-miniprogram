// pages/library/library.js
// 词库页面

Page({
  data: {
    wordbanks: [
      { id: 1, name: '人教版PEP三年级上册', grade: 3, count: 64, progress: 35 },
      { id: 2, name: '人教版PEP三年级下册', grade: 3, count: 72, progress: 0 },
      { id: 3, name: '人教版PEP四年级上册', grade: 4, count: 68, progress: 0 },
      { id: 4, name: '人教版PEP四年级下册', grade: 4, count: 75, progress: 0 },
      { id: 5, name: '小升初必备词汇', grade: 6, count: 500, progress: 0, isVip: true }
    ]
  },

  onSelectWordbank(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({
      title: '已切换词库',
      icon: 'success'
    });
  }
});
