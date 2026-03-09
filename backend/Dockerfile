# 开发环境 Dockerfile (NestJS)
FROM node:18-alpine

WORKDIR /app

# 安装依赖工具
RUN apk add --no-cache python3 make g++

# 复制 package.json
COPY package*.json ./

# 安装依赖（包含开发依赖）
RUN npm install

# 暴露端口
EXPOSE 3000

# 默认命令
CMD ["npm", "run", "start:dev"]
