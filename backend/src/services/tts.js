/**
 * TTS Service - 文字转语音
 * 支持百度、腾讯、阿里云TTS
 */

const crypto = require('crypto');
const https = require('https');
const querystring = require('querystring');

class TTSService {
  constructor() {
    this.provider = process.env.TTS_PROVIDER || 'baidu';
    this.appId = process.env.TTS_APP_ID;
    this.apiKey = process.env.TTS_API_KEY;
    this.secretKey = process.env.TTS_SECRET_KEY;
  }

  /**
   * 生成单词音频
   * @param {string} word - 单词
   * @param {string} lang - 语言 (en/zh)
   * @returns {Promise<Buffer>} - 音频数据
   */
  async generateWordAudio(word, lang = 'en') {
    switch (this.provider) {
      case 'baidu':
        return this._baiduTTS(word, lang);
      case 'tencent':
        return this._tencentTTS(word, lang);
      case 'aliyun':
        return this._aliyunTTS(word, lang);
      default:
        throw new Error(`Unsupported TTS provider: ${this.provider}`);
    }
  }

  /**
   * 百度 TTS
   */
  async _baiduTTS(text, lang) {
    // 获取 access token
    const token = await this._getBaiduToken();
    
    const postData = querystring.stringify({
      tex: encodeURIComponent(text),
      tok: token,
      cuid: 'wordheat_app',
      ctp: 1,
      lan: lang === 'en' ? 'en' : 'zh',
      spd: 3,  // 语速
      pit: 5,  // 音调
      vol: 5,  // 音量
      per: lang === 'en' ? 1 : 0  // 发音人
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'tsn.baidu.com',
        path: '/text2audio',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        const chunks = [];
        
        res.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          
          // 检查是否返回错误（JSON格式）
          if (res.headers['content-type']?.includes('application/json')) {
            const error = JSON.parse(buffer.toString());
            reject(new Error(`TTS Error: ${error.err_msg}`));
          } else {
            resolve(buffer);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  /**
   * 获取百度 Access Token
   */
  async _getBaiduToken() {
    const postData = querystring.stringify({
      grant_type: 'client_credentials',
      client_id: this.apiKey,
      client_secret: this.secretKey
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'aip.baidubce.com',
        path: '/oauth/2.0/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.access_token) {
              resolve(result.access_token);
            } else {
              reject(new Error(`Token Error: ${result.error_description}`));
            }
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  /**
   * 生成示例音频（用于演示，无网络时）
   */
  async generateDemoAudio(word) {
    // 返回一个空的 buffer，实际项目中可以返回默认音频
    console.log(`[TTS Demo] Would generate audio for: ${word}`);
    return Buffer.from([]);
  }
}

module.exports = TTSService;
