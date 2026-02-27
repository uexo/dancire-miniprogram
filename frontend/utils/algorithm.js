// utils/algorithm.js
// 艾宾浩斯记忆曲线算法

/**
 * 根据熟悉度和错误次数计算下次复习时间
 * @param {number} familiarity - 熟悉度 0-100
 * @param {number} wrongCount - 错误次数
 * @returns {Date} 下次复习时间
 */
function calculateNextReview(familiarity, wrongCount = 0) {
  // 艾宾浩斯遗忘曲线间隔（天数）
  const intervals = [1, 2, 4, 7, 15, 30, 90];
  
  // 根据熟悉度确定复习间隔等级
  let level = Math.floor(familiarity / 15);
  level = Math.max(0, Math.min(level, intervals.length - 1));
  
  // 基础间隔天数
  let days = intervals[level];
  
  // 错误惩罚：每错一次增加50%间隔
  if (wrongCount > 0) {
    days = Math.max(1, days * (1 - wrongCount * 0.3));
  }
  
  // 计算下次复习时间
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + Math.round(days));
  
  return nextReview;
}

/**
 * 更新熟悉度
 * @param {number} currentFamiliarity - 当前熟悉度
 * @param {boolean} isCorrect - 是否答对
 * @returns {number} 新熟悉度
 */
function updateFamiliarity(currentFamiliarity, isCorrect) {
  let change = isCorrect ? 10 : -5;
  
  // 熟悉度越高，提升越难，下降越快
  if (currentFamiliarity > 80) {
    change = isCorrect ? 5 : -10;
  } else if (currentFamiliarity > 50) {
    change = isCorrect ? 8 : -8;
  }
  
  const newFamiliarity = Math.max(0, Math.min(100, currentFamiliarity + change));
  return newFamiliarity;
}

/**
 * 判断单词是否已掌握
 * @param {number} familiarity - 熟悉度
 * @param {number} correctCount - 连续答对次数
 * @returns {boolean}
 */
function isMastered(familiarity, correctCount) {
  return familiarity >= 80 && correctCount >= 3;
}

/**
 * 获取今日学习任务
 * @param {Array} records - 用户学习记录
 * @returns {Array} 今日需复习的单词ID列表
 */
function getTodayTasks(records) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return records.filter(record => {
    const reviewTime = new Date(record.next_review_at);
    return reviewTime >= today && reviewTime < tomorrow;
  }).map(r => r.word_id);
}

module.exports = {
  calculateNextReview,
  updateFamiliarity,
  isMastered,
  getTodayTasks
};
