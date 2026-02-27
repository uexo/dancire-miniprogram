/**
 * 艾宾浩斯算法单元测试
 */

const Algorithm = require('../src/utils/algorithm');

describe('艾宾浩斯算法测试', () => {
  
  describe('计算下次复习时间', () => {
    test('第一次学习，下次应该是1天后', () => {
      const result = Algorithm.calculateNextReview(0, 0, true);
      expect(result.interval).toBe(1);
    });

    test('第二次学习（答对），下次应该是2天后', () => {
      const result = Algorithm.calculateNextReview(1, 1, true);
      expect(result.interval).toBe(2);
    });

    test('答错应该重置间隔', () => {
      const result = Algorithm.calculateNextReview(4, 7, false);
      expect(result.interval).toBeLessThan(7);  // 应该减少
    });

    test('最大间隔不超过90天', () => {
      const result = Algorithm.calculateNextReview(6, 30, true);
      expect(result.interval).toBeLessThanOrEqual(90);
    });
  });

  describe('熟悉度更新', () => {
    test('答对应该增加熟悉度', () => {
      const result = Algorithm.calculateNextReview(50, 1, true);
      expect(result.familiarity).toBeGreaterThan(50);
    });

    test('答错应该减少熟悉度', () => {
      const result = Algorithm.calculateNextReview(50, 1, false);
      expect(result.familiarity).toBeLessThan(50);
    });

    test('熟悉度不能超过100', () => {
      const result = Algorithm.calculateNextReview(95, 1, true);
      expect(result.familiarity).toBeLessThanOrEqual(100);
    });

    test('熟悉度不能低于0', () => {
      const result = Algorithm.calculateNextReview(5, 1, false);
      expect(result.familiarity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('掌握度判断', () => {
    test('熟悉度>=80且连续答对3次为已掌握', () => {
      const result = Algorithm.checkMastered(85, 3);
      expect(result).toBe(true);
    });

    test('熟悉度<80未掌握', () => {
      const result = Algorithm.checkMastered(70, 5);
      expect(result).toBe(false);
    });

    test('连续答对次数<3未掌握', () => {
      const result = Algorithm.checkMastered(85, 2);
      expect(result).toBe(false);
    });
  });

  describe('获取今日复习单词', () => {
    test('应该返回今天需要复习的单词', () => {
      const words = [
        { word: 'apple', next_review: new Date().toISOString().split('T')[0] },
        { word: 'banana', next_review: '2025-01-01' },
        { word: 'cat', next_review: new Date().toISOString().split('T')[0] }
      ];
      
      const result = Algorithm.getTodayReviewWords(words);
      expect(result).toHaveLength(2);
      expect(result.map(w => w.word)).toContain('apple');
      expect(result.map(w => w.word)).toContain('cat');
    });

    test('空数组应该返回空', () => {
      const result = Algorithm.getTodayReviewWords([]);
      expect(result).toHaveLength(0);
    });
  });
});
