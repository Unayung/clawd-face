# 🤖 Clawd Face — 与你的机器人面对面交谈

[English](README.md) | [繁體中文](README.zh-TW.md) | **[简体中文](README.zh-CN.md)** | [日本語](README.ja.md)

给你的 [Clawdbot](https://github.com/clawdbot/clawdbot) 或 [Moltbot](https://github.com/moltbot/moltbot) 一张脸。零依赖。即插即用。

![Clawd Face](https://img.shields.io/badge/dependencies-zero-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

## 快速开始

### 单纯看脸（不需服务器）

```bash
open index.html
```

点击任意位置切换表情。就这样。

### 加入语音功能（TTS + 语音识别）

```bash
# 1. 克隆项目
git clone https://github.com/user/clawd-face.git
cd clawd-face

# 2. 配置你的 OpenAI API 密钥
cp .env.example .env
# 编辑 .env: OPENAI_API_KEY=sk-你的密钥

# 3. 运行
npm start
# → http://localhost:3737
```

不需要 `npm install` — 零依赖。

### iOS/手机版（麦克风需要 HTTPS）

```bash
npm run gen-certs   # 生成自签证书
npm start           # HTTPS 在 port 3738
```

### 嵌入你自己的网站

复制 `face.js` 到你的项目，然后加到任何 HTML 页面：

```html
<!-- your-page.html -->
<!DOCTYPE html>
<html>
<head><title>我的页面</title></head>
<body>
  <h1>欢迎</h1>

  <!-- 只要加这一行 -->
  <script src="face.js"></script>

  <script>
    // 控制脸部
    face.set('happy', 5000);
  </script>
</body>
</html>
```

模块会自动注入 CSS、SVG 和 DOM。不需额外配置。

### 自定义容器

默认情况下，脸部会附加到 `<body>`。若要放在特定元素内：

```html
<div id="avatar-area" style="width: 400px; height: 300px;"></div>
<script src="face.js" data-container="avatar-area"></script>
```

## 架构

Clawd Face 采用模块化设计。只用你需要的部分：

```
┌─────────────────────────────────────────────────────────────────┐
│                           浏览器                                 │
│                                                                 │
│   ┌──────────┐       ┌──────────────┐                          │
│   │ face.js  │ <──── │ clawdbot.js  │                          │
│   │          │       │              │                          │
│   │  - SVG   │       │  - WebSocket │                          │
│   │  - CSS   │       │  - 事件监听   │                          │
│   │  - API   │       │  - 自动表情   │                          │
│   └──────────┘       └──────┬───────┘                          │
│        ↑                    │                                   │
│        │ SSE                │ WebSocket                         │
└────────│────────────────────│───────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐    ┌─────────────────┐
│   server.js     │    │    Clawdbot     │
│                 │    │    Gateway      │
│  - SSE 推送     │    │                 │
│  - TTS (OpenAI) │    │  - AI 助理      │
│  - STT (Whisper)│    │  - 工具调用     │
└─────────────────┘    └─────────────────┘
        ↑
        │ POST /expression
┌─────────────────┐
│   你的 Agent    │
│   (任何后端)     │
└─────────────────┘
```

### 使用模式

| 模式 | 需要的文件 | 说明 |
|-----|-----------|------|
| **A. 纯展示** | `face.js` | 只有脸，用 JS 控制 |
| **B. + Clawdbot** | `face.js` + `clawdbot.js` | 连接 Clawdbot 网关，自动表情 |
| **C. + 自己的后端** | `face.js` + `server.js` | 用 SSE 推表情，加 TTS/STT |

### 各文件职责

| 文件 | 角色 | 网络 |
|-----|------|------|
| `face.js` | 脸部渲染 + `window.face` API | 无 |
| `clawdbot.js` | Clawdbot 网关客户端，收到事件时调用 `face.set()` | WebSocket 到网关 |
| `server.js` | SSE 端点 + 通过 OpenAI 的 TTS/STT | HTTP/SSE |

**注意：** `clawdbot.js` 直接连到 Clawdbot Gateway — 不经过 `server.js`。它们是并行的集成选项。

## 表情

内置 16 种表情，各有独特的眼睛样式、嘴型和环境光晕：

| 表情 | 标签 | 说明 |
|-----|------|------|
| `idle` | idle | 默认休息状态 |
| `happy` | happy | 眯眼笑、大笑容 |
| `thinking` | thinking | 眼睛看向旁边 |
| `investigating` | investigating | 睁大眼、扁嘴 |
| `sleepy` | zzz... | 下垂弧形眼 |
| `bored` | bored | 半闭眼 |
| `amused` | haha | 眯眼、超大笑容 |
| `surprised` | !? | 大圆眼、张嘴 |
| `focused` | working | 皱眉、专注 |
| `cool` | cool | 墨镜 😎 |
| `confused` | huh? | 不对称眼睛 |
| `excited` | !! | 星星眼、大笑 |
| `sad` | ... | 下垂瞳孔、皱眉 |
| `love` | ♥ | 爱心眼 |
| `alert` | alert | 睁大眼、紧绷嘴 |
| `working` | working hard... | 皱眉、专注 |

## JavaScript API

通过 `window.face` 程序化控制脸部：

```js
// 设置表情（5 秒后回到 idle）
face.set('happy', 5000);

// 永久设置（直到改变）
face.set('cool');

// 回到 idle 循环
face.idle();

// 嘴巴说话动画（3 秒）
face.talk(3000);

// 停止说话
face.stop();

// 显示打字字幕
face.subtitle('你好世界！', 4000);

// 列出所有表情
face.list();
// → ['idle', 'happy', 'thinking', ...]

// 获取当前表情
face.current();
// → 'happy'

// 访问表情定义
face.expressions;
```

## 功能特色

- 🎨 **16 种表情** 各有独特眼睛样式（爱心、星星、墨镜等）
- 👁️ **自然眨眼** 随机间隔，偶尔连续眨两次
- 👀 **瞳孔漂移** — 闲置时眼睛会微微游移
- 🫁 **呼吸动画** — 轻柔的缩放脉动
- 🌈 **环境光晕** — 背景颜色随表情变化
- 💬 **字幕系统** — 打字机风格文字叠加
- 🗣️ **说话动画** — 随机嘴型配合语音同步
- 🔄 **闲置循环** — 无控制时自动轮换表情
- 📱 **移动端友好** — 响应式、全屏、禁止选取

## 连接 Clawdbot

Clawd Face 内置 [Clawdbot](https://github.com/clawdbot/clawdbot) 集成 — 一个 AI 助理网关。

### 快速配置

1. 运行 Clawdbot 实例（[安装指南](https://docs.clawd.bot)）
2. 打开示例并填入网关信息：

```
example-clawdbot.html?gw=ws://localhost:18789&token=你的TOKEN
```

完成。脸部会连接，你可以通过输入栏聊天。

### 自动行为

连接 Clawdbot 后，脸部会：

- 🤔 发送消息时显示 **thinking**
- 🔧 助理使用工具时显示 **working/investigating/focused**
- 😊 从回复内容推断表情（happy、amused、love 等）
- 💬 以打字字幕显示回复
- 😕 错误时显示 **confused**

### 配置选项

| 选项 | 默认值 | 说明 |
|-----|-------|------|
| `gatewayUrl` | `ws://localhost:18789` | Clawdbot 网关 WebSocket URL |
| `token` | `''` | 网关认证 token |
| `sessionKey` | `'face'` | 此设备的 session key |
| `clientId` | `'clawd-face'` | 客户端标识 |
| `locale` | `'en'` | 语言 |
| `autoExpressions` | `true` | 自动映射事件到表情 |

### 工具表情映射

启用 `autoExpressions` 时，工具使用会触发对应表情：

| 工具模式 | 表情 | 持续时间 |
|---------|------|---------|
| `web_search`、`fetch` | `investigating` | 10 秒 |
| `exec`、`bash`、`shell` | `working` | 10 秒 |
| `read`、`file`、`glob`、`grep` | `thinking` | 8 秒 |
| `write`、`edit`、`create` | `focused` | 10 秒 |
| `tts`、`speak`、`audio` | `happy` | 5 秒 |
| 其他工具 | `focused` | 8 秒 |

## 运行服务器

内含的 `server.js` 提供语音功能和实时表情推送。

### 快速开始

```bash
# 不需安装 — 零依赖，使用 Node 内置模块

# 不含语音功能运行
node server.js

# 含 OpenAI TTS/STT 运行
OPENAI_API_KEY=sk-xxx node server.js

# 或使用 .env 文件
cp .env.example .env
# 编辑 .env 填入 API 密钥
node server.js
```

服务器默认在 `http://localhost:3737` 运行。

### API 端点

| 端点 | 方法 | 说明 |
|-----|------|------|
| `/` | GET | 提供 `index.html` |
| `/expression-stream` | GET | 实时表情推送的 SSE 流 |
| `/expression` | POST | 设置表情 `{ expression, duration, sessionKey? }` |
| `/speak` | POST | OpenAI TTS `{ text, voice? }` → MP3 |
| `/transcribe` | POST | Whisper STT（音频 body）→ `{ text }` |
| `/media-proxy` | GET | 代理本地音频文件 `?file=/path/to/audio.mp3` |
| `/health` | GET | 健康检查 `{ ok, sseClients, hasOpenAI }` |

### 环境变量

| 变量 | 默认值 | 说明 |
|-----|-------|------|
| `OPENAI_API_KEY` | — | `/speak` 和 `/transcribe` 必需 |
| `PORT` | `3737` | HTTP 端口 |
| `HTTPS_PORT` | `3738` | HTTPS 端口（如有证书） |
| `HOST` | `0.0.0.0` | 绑定地址 |

## 文件说明

| 文件 | 说明 |
|-----|------|
| `face.js` | 核心脸部引擎 — 独立运作，自动注入所有内容 |
| `index.html` | 精简演示 — 加载 `face.js`，点击切换表情 |
| `clawdbot.js` | Clawdbot 网关集成模块 |
| `example-clawdbot.html` | 含聊天输入的完整示例 |
| `server.js` | Node.js 服务器（SSE、TTS、STT） |
| `.env.example` | 环境配置示例 |

## 浏览器支持

支持所有现代浏览器。测试于：
- Chrome / Edge
- Firefox
- Safari（macOS 和 iOS）
- 移动版 Safari 和 Chrome

## 许可证

MIT — 随你怎么用。
