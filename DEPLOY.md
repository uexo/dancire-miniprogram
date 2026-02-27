# 单词热 - 部署指南

## 📋 部署前准备

### 1. 服务器要求
- Linux服务器（Ubuntu 20.04+ / CentOS 8+）
- Node.js 16+
- MySQL 8.0+
- Nginx（反向代理）
- 域名和SSL证书

### 2. 微信小程序准备
- 注册微信小程序账号
- 获取 AppID 和 AppSecret
- 配置服务器域名（request合法域名）
- 开通微信支付（如需支付功能）

---

## 🚀 部署步骤

### 第一步：部署后端服务

```bash
# 1. 进入后端目录
cd /path/to/单词热/backend

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入真实配置

# 4. 创建数据库
mysql -u root -p
CREATE DATABASE wordheat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 5. 导入数据库表结构
mysql -u root -p wordheat < database/schema.sql

# 6. 导入词库数据
node database/scripts/import_words.js --file=./data/pep_primary_words.json

# 7. 启动服务（开发模式）
npm start

# 8. 生产模式使用 PM2
npm install -g pm2
pm2 start src/app.js --name wordheat-api
pm2 startup
pm2 save
```

### 第二步：配置 Nginx

```nginx
server {
    listen 80;
    server_name api.wordheat.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.wordheat.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 第三步：部署小程序前端

1. 下载并安装微信开发者工具
2. 导入项目 `frontend` 目录
3. 修改 `utils/api.js` 中的 `BASE_URL` 为生产环境地址
4. 在开发者工具中上传代码
5. 登录微信公众平台提交审核

---

## ⚙️ 环境变量配置

```bash
# .env 文件配置

NODE_ENV=production
PORT=3000

# 数据库
DB_HOST=localhost
DB_USER=wordheat
DB_PASSWORD=your_secure_password
DB_NAME=wordheat

# JWT密钥（随机生成）
JWT_SECRET=your_random_secret_key_here

# 微信小程序
WX_APPID=wx_xxxxxxxxxxxxxxxx
WX_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 微信支付
WX_MCH_ID=1234567890
WX_API_KEY=your_api_key_here
WX_NOTIFY_URL=https://api.wordheat.com/api/v1/payment/notify

# 可选：TTS服务
TTS_PROVIDER=baidu
TTS_APP_ID=your_app_id
TTS_API_KEY=your_api_key
TTS_SECRET_KEY=your_secret_key
```

---

## 📊 词库数据

项目已包含人教版PEP小学英语3-6年级单词数据：
- 文件：`database/data/pep_primary_words.json`
- 数量：约800个单词
- 内容：单词、音标、释义、例句、难度等级

如需导入其他版本教材，按相同JSON格式准备数据后运行：
```bash
node database/scripts/import_words.js --file=./data/your_words.json
```

---

## 🔒 安全建议

1. **修改默认密钥**：务必修改 JWT_SECRET 和 WX_API_KEY
2. **数据库安全**：使用独立数据库用户，限制访问权限
3. **HTTPS**：生产环境必须使用 HTTPS
4. **防火墙**：仅开放必要端口（80, 443）
5. **日志监控**：配置日志轮转和异常监控

---

## 📱 小程序配置

### 服务器域名配置
登录微信公众平台 → 开发 → 开发设置 → 服务器域名：
- request合法域名：`https://api.wordheat.com`
- uploadFile合法域名：`https://api.wordheat.com`
- downloadFile合法域名：`https://api.wordheat.com`

### 业务域名配置（webview）
如有需要，配置业务域名用于展示网页内容。

---

## 🧪 测试检查清单

- [ ] 微信登录正常
- [ ] 单词学习流程完整
- [ ] 艾宾浩斯复习提醒准确
- [ ] 打卡功能正常
- [ ] 家长报告数据正确
- [ ] 微信支付流程（如开通）
- [ ] 分享功能正常

---

## 🆘 常见问题

### 1. 数据库连接失败
检查MySQL服务状态和连接配置，确保用户权限正确。

### 2. 微信登录失败
确认AppID和AppSecret正确，服务器IP已添加到白名单。

### 3. 支付回调失败
检查notify_url是否可外网访问，SSL证书是否有效。

### 4. 词库导入失败
确认JSON格式正确，数据库表结构已导入。

---

## 📞 技术支持

如有问题，请联系：
- 邮箱：support@wordheat.com
- 微信：wordheat_support
