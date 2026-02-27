# 单词热 (WordHeat) - 微信小程序

> 专为中小学生打造的课标同步背单词小程序

## ✨ 功能特性

- 📚 **课标同步** - 人教版PEP小学英语3-6年级单词
- 🧠 **艾宾浩斯记忆** - 科学复习算法，抗遗忘
- 🎮 **游戏化学习** - 闯关模式，趣味背单词
- 📊 **家长报告** - 学习数据可视化，效果看得见
- 💎 **VIP会员** - 解锁更多高级功能

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 微信小程序原生 |
| 后端 | Node.js + Express |
| 数据库 | MySQL 8.0 |
| 缓存 | Redis（预留） |
| 支付 | 微信支付 |

## 📁 项目结构

```
单词热/
├── frontend/          # 小程序前端
│   ├── pages/        # 页面代码
│   └── utils/        # 工具函数
├── backend/          # 后端服务
│   ├── src/routes/   # API路由
│   └── config/       # 配置文件
├── database/         # 数据库
│   ├── schema.sql    # 表结构
│   └── data/         # 词库数据
└── docs/             # 文档
```

## 🚀 快速开始

### 1. 启动后端服务
```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 配置数据库和微信参数
npm start
```

### 2. 导入词库数据
```bash
node database/scripts/import_words.js \
  --file=./database/data/pep_primary_words.json
```

### 3. 运行小程序
使用微信开发者工具打开 `frontend` 目录即可预览。

## 📊 项目进度 - ✅ 100% 完成

- ✅ 数据库设计 (100%)
- ✅ 艾宾浩斯算法 (100%)
- ✅ 前端页面 (100%)
- ✅ 后端API (100%)
- ✅ 微信支付框架 (100%)
- ✅ **音频TTS** (100%)
- ✅ **单元测试** (100%)
- ✅ **部署配置** (100%)

**状态**: 🎉 MVP 开发完成，准备部署上线！

## 📄 相关文档

- [部署指南](./DEPLOY.md)
- [开发进度报告](./开发进度报告.md)
- [API文档](./docs/API文档.md)
- [产品需求文档](./docs/PRD.md)

## 📝 License

MIT License

---
Made with ❤️ for students learning English
