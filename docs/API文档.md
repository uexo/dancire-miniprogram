# 单词热 API 文档

> 后端 RESTful API 接口文档

## 基础信息

- **Base URL**: `https://api.wordheat.com/api/v1`
- **Content-Type**: `application/json`
- **认证方式**: Bearer Token (JWT)

---

## 认证相关

### 1. 微信登录

```http
POST /auth/wx-login
```

**请求参数:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | ✅ | 微信登录临时code |
| userInfo | object | ❌ | 用户信息 |
| userInfo.nickName | string | ❌ | 昵称 |
| userInfo.avatarUrl | string | ❌ | 头像URL |
| userInfo.grade | number | ❌ | 年级 |

**响应示例:**

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "userInfo": {
      "id": 1,
      "nickname": "小明",
      "avatarUrl": "https://...",
      "grade": 3,
      "isVip": false
    }
  }
}
```

---

### 2. 手机号登录

```http
POST /auth/phone-login
```

**请求参数:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| wxCode | string | ✅ | 微信登录code |
| phoneCode | string | ✅ | 获取手机号code |

---

### 3. 发送验证码

```http
POST /auth/send-code
```

**请求参数:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phoneNumber | string | ✅ | 手机号 |

---

### 4. 验证码登录

```http
POST /auth/verify-code-login
```

**请求参数:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| phoneNumber | string | ✅ | 手机号 |
| verifyCode | string | ✅ | 验证码 |

---

### 5. 刷新 Token

```http
POST /auth/refresh-token
```

**请求参数:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| token | string | ✅ | 当前token |

---

### 6. 退出登录

```http
POST /auth/logout
```

---

## 用户相关

### 1. 获取用户信息

```http
GET /users/info
Authorization: Bearer {token}
```

**响应示例:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "nickname": "小明",
    "avatarUrl": "https://...",
    "phone": "13800138000",
    "grade": 3,
    "textbookVersion": "pep",
    "isVip": false,
    "vipExpireAt": null
  }
}
```

---

### 2. 更新用户信息

```http
PUT /users/info
Authorization: Bearer {token}
```

**请求参数:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | ❌ | 昵称 |
| avatarUrl | string | ❌ | 头像URL |
| grade | number | ❌ | 年级 |
| textbookVersion | string | ❌ | 教材版本 |

---

### 3. 获取用户统计

```http
GET /users/stats
Authorization: Bearer {token}
```

**响应示例:**

```json
{
  "success": true,
  "data": {
    "total_words": 100,
    "mastered_words": 50,
    "learning_words": 50,
    "total_days": 30,
    "continuous_days": 7,
    "today_tasks": 20
  }
}
```

---

### 4. 获取学习进度

```http
GET /users/progress?grade=3
Authorization: Bearer {token}
```

**响应示例:**

```json
{
  "success": true,
  "data": {
    "total_words": 200,
    "learned_words": 100,
    "mastered_words": 50,
    "progress_percent": 50,
    "mastery_percent": 25
  }
}
```

---

## 单词学习

### 1. 获取今日任务

```http
GET /words/today
Authorization: Bearer {token}
```

**响应示例:**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "word": "apple",
      "phonetic": "/ˈæpl/",
      "meaning": "苹果",
      "pos": "n.",
      "example": "I like to eat apples.",
      "options": ["苹果", "香蕉", "橙子", "葡萄"],
      "correctIndex": 0
    }
  ]
}
```

---

### 2. 提交答案

```http
POST /words/answer
Authorization: Bearer {token}
```

**请求参数:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| wordId | number | ✅ | 单词ID |
| correct | boolean | ✅ | 是否答对 |

**响应示例:**

```json
{
  "success": true,
  "data": {
    "familiarity": 80,
    "status": "learning",
    "isMastered": false,
    "nextReviewAt": "2026-03-10T00:00:00Z"
  }
}
```

---

## 词库管理

### 1. 获取词库版本

```http
GET /wordbank/versions
```

---

### 2. 获取单词列表

```http
GET /wordbank/words?page=1&pageSize=20&grade=3
Authorization: Bearer {token}
```

**查询参数:**

| 字段 | 类型 | 说明 |
|------|------|------|
| version | string | 版本 |
| grade | number | 年级 |
| unit | string | 单元 |
| keyword | string | 关键词搜索 |
| page | number | 页码（默认1） |
| pageSize | number | 每页数量（默认20） |

---

### 3. 获取单词详情

```http
GET /wordbank/words/:id
Authorization: Bearer {token}
```

---

### 4. 搜索单词

```http
GET /wordbank/search?q=apple&limit=10
Authorization: Bearer {token}
```

---

### 5. 获取年级单元列表

```http
GET /wordbank/grade-units
```

---

### 6. 添加单词（管理）

```http
POST /wordbank/words
Authorization: Bearer {token}
```

---

## 打卡系统

### 1. 获取本月打卡数据

```http
GET /checkin/month
Authorization: Bearer {token}
```

**响应示例:**

```json
{
  "success": true,
  "data": {
    "checkinDays": [1, 2, 3, 5, 8, 9, 10],
    "continuousDays": 3,
    "totalDays": 30,
    "todayCheckin": false,
    "rewards": [
      { "day": 1, "coin": 10, "canClaim": true, "claimed": false },
      { "day": 7, "coin": 100, "canClaim": false, "claimed": false }
    ]
  }
}
```

---

### 2. 今日打卡

```http
POST /checkin/today
Authorization: Bearer {token}
```

**响应示例:**

```json
{
  "success": true,
  "data": {
    "continuousDays": 4,
    "coin": 18,
    "reward": null,
    "message": "连续打卡4天，获得18金币！"
  }
}
```

---

### 3. 领取奖励

```http
POST /checkin/claim-reward
Authorization: Bearer {token}
```

**请求参数:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| day | number | ✅ | 天数（1/3/7/15/30） |

---

## 学习报告

### 1. 获取学习统计

```http
GET /reports/stats?childId=1
Authorization: Bearer {token}
```

---

### 2. 获取记忆曲线

```http
GET /reports/memory-curve?days=30
Authorization: Bearer {token}
```

---

### 3. 获取打卡日历

```http
GET /reports/calendar?year=2026&month=3
Authorization: Bearer {token}
```

---

### 4. 获取错题本

```http
GET /reports/wrong-words?page=1&pageSize=20
Authorization: Bearer {token}
```

---

## 支付系统

### 1. 获取产品价格

```http
GET /payment/products
```

**响应示例:**

```json
{
  "success": true,
  "data": [
    {
      "type": "month",
      "id": "vip_month",
      "name": "月度会员",
      "price": 29.9,
      "duration": 30,
      "description": "30天VIP会员"
    },
    {
      "type": "quarter",
      "id": "vip_quarter",
      "name": "季度会员",
      "price": 69.9,
      "duration": 90,
      "description": "90天VIP会员（省20元）"
    },
    {
      "type": "year",
      "id": "vip_year",
      "name": "年度会员",
      "price": 199,
      "duration": 365,
      "description": "365天VIP会员（省160元）"
    }
  ]
}
```

---

### 2. 创建支付订单

```http
POST /payment/create
Authorization: Bearer {token}
```

**请求参数:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productType | string | ✅ | 产品类型（month/quarter/year） |

**响应示例:**

```json
{
  "success": true,
  "data": {
    "orderNo": "WH20260308123456",
    "paymentParams": {
      "appId": "wx...",
      "timeStamp": "1646712345",
      "nonceStr": "...",
      "package": "prepay_id=wx...",
      "signType": "MD5",
      "paySign": "..."
    }
  }
}
```

---

### 3. 查询订单

```http
GET /payment/order/:orderNo
Authorization: Bearer {token}
```

---

### 4. 支付回调

```http
POST /payment/notify
Content-Type: text/xml
```

---

## TTS 语音

### 1. 获取单词音频

```http
GET /tts/word/:word?lang=en&force=false
```

**响应:**

- 成功: `audio/mpeg` 音频流
- 未配置: `503 Service Unavailable`

---

### 2. 批量生成音频

```http
POST /tts/batch
```

**请求参数:**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| words | array | ✅ | 单词列表 |
| lang | string | ❌ | 语言（默认en） |

---

### 3. 检查音频是否存在

```http
GET /tts/check/:word?lang=en
```

---

## 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 参数错误 |
| 401 | 未认证/Token过期 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |
| 503 | 服务不可用（如TTS未配置） |

---

## 错误响应格式

```json
{
  "success": false,
  "message": "错误描述",
  "code": "ERROR_CODE"
}
```

---

## 更新日志

### v1.0.0 (2026-03-08)

- ✅ 完成所有核心API
- ✅ 集成微信支付
- ✅ 添加TTS语音支持
- ✅ 完善单元测试
