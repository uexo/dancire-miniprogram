#!/usr/bin/env node
/**
 * 后端API测试脚本
 * 用于快速验证API是否正常工作
 */

const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3000;

// 简单的HTTP请求函数
function request(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsedData });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// 测试用例
async function runTests() {
  console.log('🧪 开始测试单词热API...\n');

  // 1. 健康检查
  console.log('1. 测试健康检查接口...');
  try {
    const health = await request('/health');
    if (health.status === 200 && health.data.status === 'ok') {
      console.log('   ✅ 健康检查通过\n');
    } else {
      console.log('   ❌ 健康检查失败\n');
    }
  } catch (err) {
    console.log('   ❌ 无法连接服务器，请确保服务已启动 (npm start)\n');
    return;
  }

  // 2. 获取产品价格
  console.log('2. 测试产品价格接口...');
  try {
    const products = await request('/api/v1/payment/products');
    if (products.status === 200 && products.data.success) {
      console.log(`   ✅ 获取到 ${products.data.data.length} 个产品\n`);
    } else {
      console.log('   ❌ 获取产品失败\n');
    }
  } catch (err) {
    console.log('   ❌ 请求失败:', err.message, '\n');
  }

  // 3. 词库数据测试（需要数据库连接）
  console.log('3. 测试词库接口...');
  try {
    const words = await request('/api/v1/wordbank/grades');
    if (words.status === 200) {
      console.log('   ✅ 词库接口正常\n');
    } else {
      console.log('   ⚠️  词库接口返回异常，可能需要导入数据\n');
    }
  } catch (err) {
    console.log('   ⚠️  词库接口需要数据库连接\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('测试完成！');
  console.log('如要完整测试，请：');
  console.log('1. 配置 .env 文件');
  console.log('2. 创建并导入数据库');
  console.log('3. 运行 npm start 启动服务');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

runTests();
