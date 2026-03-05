// backend/src/utils/cache.js - 缓存工具
const NodeCache = require('node-cache');

// 多级缓存策略
const caches = {
  // 高频读取，很少变更（单词数据）
  words: new NodeCache({ stdTTL: 300, checkperiod: 60 }), // 5分钟
  
  // 用户相关数据
  user: new NodeCache({ stdTTL: 60, checkperiod: 30 }),    // 1分钟
  
  // 临时计算结果
  temp: new NodeCache({ stdTTL: 10, checkperiod: 5 })      // 10秒
};

module.exports = {
  get: (type, key) => caches[type].get(key),
  set: (type, key, value, ttl) => caches[type].set(key, value, ttl),
  del: (type, key) => caches[type].del(key),
  flush: (type) => caches[type].flushAll()
};
