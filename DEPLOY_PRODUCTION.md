# 单词热 - 生产部署配置

## 🚀 快速部署指南

### 1. 环境要求
- Node.js 18+
- MySQL 8.0+
- PM2 (进程管理)
- Nginx (反向代理)

### 2. 服务器准备

```bash
# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 MySQL
sudo apt-get install mysql-server

# 安装 PM2
npm install -g pm2

# 安装 Nginx
sudo apt-get install nginx
```

### 3. 数据库设置

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE wordheat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 创建用户
CREATE USER 'wordheat'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON wordheat.* TO 'wordheat'@'localhost';
FLUSH PRIVILEGES;
EXIT;

# 导入表结构
mysql -u wordheat -p wordheat < database/schema.sql

# 导入词库数据
node database/scripts/import_words.js
```

### 4. 应用部署

```bash
# 克隆代码
cd /var/www
git clone <your-repo> wordheat
cd wordheat/backend

# 安装依赖
npm install --production

# 配置环境变量
cp .env.example .env
nano .env  # 编辑配置

# 使用 PM2 启动
pm2 start app.js --name wordheat
pm2 save
pm2 startup
```

### 5. Nginx 配置

```nginx
# /etc/nginx/sites-available/wordheat
server {
    listen 80;
    server_name api.wordheat.com;
    
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

# 启用配置
sudo ln -s /etc/nginx/sites-available/wordheat /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. SSL 证书 (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d api.wordheat.com
```

### 7. 监控与日志

```bash
# 查看应用日志
pm2 logs wordheat

# 查看错误日志
tail -f /var/www/wordheat/backend/logs/error.log

# 重启应用
pm2 restart wordheat
```

---

## 📋 部署检查清单

- [ ] 服务器环境准备完成
- [ ] MySQL 数据库创建并导入数据
- [ ] 环境变量配置正确
- [ ] 应用使用 PM2 启动
- [ ] Nginx 反向代理配置
- [ ] SSL 证书配置
- [ ] 域名 DNS 解析
- [ ] 微信小程序后台配置服务器域名
- [ ] 支付回调 URL 配置

---

## 🔧 常用命令

```bash
# 重启应用
pm2 restart wordheat

# 查看状态
pm2 status

# 查看日志
pm2 logs wordheat --lines 100

# 更新代码后重启
cd /var/www/wordheat && git pull && pm2 restart wordheat
```

---

## 🚨 故障排查

### 数据库连接失败
```bash
# 检查 MySQL 状态
sudo systemctl status mysql

# 检查连接配置
mysql -u wordheat -p -e "SELECT 1"
```

### 端口被占用
```bash
# 查看端口占用
sudo lsof -i :3000

# 杀死进程
sudo kill -9 <PID>
```

### 权限问题
```bash
# 修复文件权限
sudo chown -R www-data:www-data /var/www/wordheat
```

---

**部署完成！** 🎉
