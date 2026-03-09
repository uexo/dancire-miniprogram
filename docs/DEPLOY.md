# 单词热 - 部署指南

> 生产环境部署完整指南

---

## 📋 部署方式概览

| 方式 | 适用场景 | 复杂度 | 推荐度 |
|------|----------|--------|--------|
| **Docker Compose** | 单机部署、开发测试 | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **PM2** | Node.js 生产环境 | ⭐⭐ | ⭐⭐⭐⭐ |
| **Kubernetes** | 大规模集群 | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## 🐳 方式一：Docker Compose 部署（推荐）

### 1. 环境准备

```bash
# 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 验证安装
docker --version
docker-compose --version
```

### 2. 创建部署目录

```bash
mkdir -p /opt/wordheat
cd /opt/wordheat
```

### 3. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: wordheat-app
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DB_TYPE=mysql
      - DB_HOST=db
      - DB_PORT=3306
      - DB_USER=wordheat
      - DB_PASSWORD=${DB_PASSWORD}
      - DB_NAME=wordheat
      - JWT_SECRET=${JWT_SECRET}
      - WX_APPID=${WX_APPID}
      - WX_SECRET=${WX_SECRET}
      - WX_MCH_ID=${WX_MCH_ID}
      - WX_API_KEY=${WX_API_KEY}
      - WX_NOTIFY_URL=${WX_NOTIFY_URL}
    depends_on:
      - db
      - redis
    volumes:
      - ./logs:/app/logs
      - ./cache:/app/cache
    networks:
      - wordheat-network

  db:
    image: mysql:8.0
    container_name: wordheat-db
    restart: always
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_ROOT_PASSWORD}
      - MYSQL_DATABASE=wordheat
      - MYSQL_USER=wordheat
      - MYSQL_PASSWORD=${DB_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
      - ./database/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
      - ./database/mock_data.sql:/docker-entrypoint-initdb.d/02-mock_data.sql
    ports:
      - "3306:3306"
    networks:
      - wordheat-network

  redis:
    image: redis:7-alpine
    container_name: wordheat-redis
    restart: always
    volumes:
      - redis-data:/data
    networks:
      - wordheat-network

  nginx:
    image: nginx:alpine
    container_name: wordheat-nginx
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - ./logs/nginx:/var/log/nginx
    depends_on:
      - app
    networks:
      - wordheat-network

volumes:
  mysql-data:
  redis-data:

networks:
  wordheat-network:
    driver: bridge
```

### 4. 创建 Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY backend/package*.json ./
RUN npm ci --only=production

# 复制源码
COPY backend/src ./src

# 创建日志和缓存目录
RUN mkdir -p logs cache/audio

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# 启动应用
CMD ["node", "src/app.js"]
```

### 5. 创建 Nginx 配置

```nginx
# nginx.conf
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    upstream wordheat {
        server app:3000;
    }

    server {
        listen 80;
        server_name api.wordheat.com;

        # 重定向到 HTTPS
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name api.wordheat.com;

        # SSL 证书
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # API 代理
        location / {
            proxy_pass http://wordheat;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # 支付回调特殊配置
        location /api/v1/payment/notify {
            proxy_pass http://wordheat;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_read_timeout 300s;
        }
    }
}
```

### 6. 配置环境变量

```bash
# 创建环境变量文件
cat > .env << 'EOF'
# 数据库配置
DB_ROOT_PASSWORD=YourStrongRootPassword123!
DB_PASSWORD=YourStrongDBPassword456!

# JWT密钥（生成随机字符串）
JWT_SECRET=$(openssl rand -base64 32)

# 微信小程序配置
WX_APPID=wx1234567890abcdef
WX_SECRET=your-wx-secret-here

# 微信支付配置
WX_MCH_ID=1234567890
WX_API_KEY=YourWxApiKeyHere
WX_NOTIFY_URL=https://api.wordheat.com/api/v1/payment/notify

# TTS配置（可选）
TTS_APP_ID=your-tts-appid
TTS_API_KEY=your-tts-apikey
EOF
```

### 7. 启动服务

```bash
# 拉取并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 检查服务状态
docker-compose ps
```

---

## ⚡ 方式二：PM2 部署

### 1. 安装 Node.js 和 PM2

```bash
# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PM2
npm install -g pm2
```

### 2. 部署应用

```bash
cd /opt/wordheat/backend

# 安装依赖
npm ci --only=production

# 使用 PM2 启动
pm2 start src/app.js --name wordheat-api \
  --env production \
  --instances max \
  --log-date-format "YYYY-MM-DD HH:mm:ss Z"

# 保存配置
pm2 save
pm2 startup
```

### 3. PM2 配置文件

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'wordheat-api',
    script: './src/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    merge_logs: true,
    log_type: 'json'
  }]
};
```

---

## 🔒 安全配置

### 1. 防火墙配置

```bash
# Ubuntu/Debian
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. SSL 证书配置

```bash
# 使用 Let's Encrypt
certbot --nginx -d api.wordheat.com

# 或手动配置
# 将证书放到 ./ssl/ 目录
cp /path/to/fullchain.pem ./ssl/
cp /path/to/privkey.pem ./ssl/
```

---

## 📊 监控与日志

### 1. 查看应用日志

```bash
# Docker 方式
docker-compose logs -f --tail=100 app

# PM2 方式
pm2 logs wordheat-api --lines 100
```

### 2. 设置日志轮转

```bash
# Docker 日志轮转
cat > /etc/logrotate.d/wordheat << 'EOF'
/opt/wordheat/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
EOF
```

---

## 🔄 更新部署

### 1. 滚动更新（Docker）

```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker-compose down
docker-compose up -d --build

# 清理旧镜像
docker image prune -f
```

### 2. 零停机更新（PM2）

```bash
# 拉取最新代码
git pull origin main

# 安装依赖
npm ci

# 热重载
pm2 reload wordheat-api

# 或零停机重启
pm2 restart wordheat-api
```

---

## 🚨 故障排查

### 常见问题

#### 1. 数据库连接失败

```bash
# 检查 MySQL 状态
docker-compose ps db
docker-compose logs db

# 检查连接配置
docker-compose exec app env | grep DB_
```

#### 2. 微信支付回调失败

```bash
# 检查 Nginx 日志
docker-compose exec nginx tail -f /var/log/nginx/access.log

# 检查域名解析
nslookup api.wordheat.com
```

#### 3. 内存不足

```bash
# 查看资源使用
docker stats

# 限制容器内存
docker-compose.yml:
  deploy:
    resources:
      limits:
        memory: 1G
```

---

## 📞 技术支持

遇到问题？查看以下资源：

- 📖 [API文档](./API文档.md)
- 🏗️ [架构设计](./ARCHITECTURE_V2.md)
- 📝 [README](../README.md)

---

**部署完成！** 🎉

访问 `https://api.wordheat.com` 验证服务是否正常运行。
