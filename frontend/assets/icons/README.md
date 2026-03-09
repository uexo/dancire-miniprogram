# 图标占位文件

由于原始图标文件缺失，这里使用占位方案：

## 方案1: 使用 Emoji 作为临时图标
在 app.json 中可以使用文字图标，或者创建简单的纯色 PNG。

## 方案2: 创建简单 SVG 并转换
可以使用在线工具将以下 SVG 转换为 PNG:

### home.svg
```xml
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 20V38C12 39.1046 12.8954 40 14 40H20V28H28V40H34C35.1046 40 36 39.1046 36 38V20" stroke="#65728c" stroke-width="3" stroke-linecap="round"/>
  <path d="M6 22L24 8L42 22" stroke="#65728c" stroke-width="3" stroke-linecap="round"/>
</svg>
```

### learn.svg
```xml
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M24 8L6 18V40L24 30L42 40V18L24 8Z" stroke="#65728c" stroke-width="3" stroke-linejoin="round"/>
  <path d="M24 30V8" stroke="#65728c" stroke-width="3"/>
</svg>
```

### library.svg
```xml
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="8" y="6" width="10" height="36" rx="2" stroke="#65728c" stroke-width="3"/>
  <rect x="30" y="6" width="10" height="36" rx="2" stroke="#65728c" stroke-width="3"/>
  <rect x="19" y="12" width="10" height="30" rx="2" stroke="#65728c" stroke-width="3"/>
</svg>
```

### profile.svg
```xml
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="24" cy="16" r="8" stroke="#65728c" stroke-width="3"/>
  <path d="M8 40C8 31.1634 15.1634 24 24 24C32.8366 24 40 31.1634 40 40" stroke="#65728c" stroke-width="3" stroke-linecap="round"/>
</svg>
```

## 推荐方案
使用微信小程序的 `icon` 组件或 `text` 组件显示 Emoji，暂时跳过图标文件需求。

或者在开发工具中使用以下临时方案：
1. 使用微信开发者工具自带的图标
2. 使用纯色图片作为占位
3. 使用 `weui` 扩展库的图标

