// utils/api.js
// 小程序API请求封装

const BASE_URL = 'https://api.wordheat.com/api/v1'; // 生产环境
// const BASE_URL = 'http://localhost:3000/api/v1'; // 开发环境

// 请求拦截器
const request = (options) => {
  return new Promise((resolve, reject) => {
    // 获取token
    const token = wx.getStorageSync('token');
    
    wx.request({
      url: BASE_URL + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          // token过期，重新登录
          wx.navigateTo({ url: '/pages/login/login' });
          reject(new Error('未登录'));
        } else {
          reject(new Error(res.data.message || '请求失败'));
        }
      },
      fail: (err) => {
        reject(err);
      }
    });
  });
};

// GET请求
const get = (url, params = {}) => {
  // 构建查询字符串
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const fullUrl = queryString ? `${url}?${queryString}` : url;
  
  return request({ url: fullUrl, method: 'GET' });
};

// POST请求
const post = (url, data = {}) => {
  return request({ url, method: 'POST', data });
};

module.exports = {
  get,
  post
};
