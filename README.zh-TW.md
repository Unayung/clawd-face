# 🤖 Clawd Face — 與你的機器人面對面交談

[English](README.md) | **[繁體中文](README.zh-TW.md)** | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

給你的 [Clawdbot](https://github.com/clawdbot/clawdbot) 或 [Moltbot](https://github.com/moltbot/moltbot) 一張臉。零依賴。即插即用。

![Clawd Face](https://img.shields.io/badge/dependencies-zero-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

## 快速開始

### 單純看臉

```bash
open index.html
```

點擊任意位置切換表情。就這樣。

### 加入語音（Push-to-Talk）

```bash
# 1. 複製專案
git clone https://github.com/user/clawd-face.git
cd clawd-face

# 2. 設定你的 OpenAI API 金鑰
cp .env.example .env
# 編輯 .env: OPENAI_API_KEY=sk-你的金鑰

# 3. 執行
npm start
# → http://localhost:3737
```

不需要 `npm install` — 零依賴。🎤 PTT 按鈕會自動出現。

### 連接 Clawdbot / Moltbot Gateway

加入 Gateway URL 和 token 作為 query 參數：

```
http://localhost:3737?gw=wss://your-gateway.example.com&token=YOUR_TOKEN
```

連線成功後會自動出現聊天輸入框。

### iOS/手機版（麥克風需要 HTTPS）

```bash
npm run gen-certs   # 產生自簽憑證
npm start           # HTTPS 在 port 3738
```

## 自適應 UI

`index.html` 會自動偵測可用功能並調整介面：

| 執行環境 | 顯示內容 |
|---|---|
| 什麼都沒有（直接開檔案） | 純臉部展示 — 點擊切換表情 |
| 有 `server.js` 運行 | 🎤 Push-to-Talk 按鈕（長按錄音 → Whisper 語音轉文字） |
| Gateway 已連線（`?gw=...&token=...`） | 💬 文字輸入框 + 送出按鈕 |
| 兩者都有 | 🎤 PTT + 💬 文字輸入 — 完整體驗 |

**運作方式：**

1. 載入時，頁面探測 `GET /health` — 伺服器有回應就啟用 PTT
2. 若有 `?gw=` 和 `?token=` URL 參數，透過 WebSocket 連接 Clawdbot/Moltbot Gateway
3. 底部列和控制元件只在偵測到至少一項功能時才顯示
4. 右上角狀態徽章顯示連線狀態

**PTT 流程：** 按住 🎤 按鈕 → 錄音 → 放開 → 音訊傳到 `/transcribe`（Whisper）→ 轉出的文字自動送到 Gateway（如已連線）或顯示為字幕。

### URL 參數

| 參數 | 預設值 | 說明 |
|---|---|---|
| `gw` | — | Gateway WebSocket URL（例如 `wss://your-gateway.example.com`） |
| `token` | — | Gateway 認證 token |
| `session` | `face` | 聊天 session key |

### 嵌入你自己的網站

複製 `face.js` 到你的專案，然後加到任何 HTML 頁面：

```html
<!-- your-page.html -->
<!DOCTYPE html>
<html>
<head><title>我的頁面</title></head>
<body>
  <h1>歡迎</h1>

  <!-- 只要加這一行 -->
  <script src="face.js"></script>

  <script>
    // 控制臉部
    face.set('happy', 5000);
  </script>
</body>
</html>
```

模組會自動注入 CSS、SVG 和 DOM。不需額外設定。

### 自訂容器

預設情況下，臉部會附加到 `<body>`。若要放在特定元素內：

```html
<div id="avatar-area" style="width: 400px; height: 300px;"></div>
<script src="face.js" data-container="avatar-area"></script>
```

## 架構

Clawd Face 採用模組化設計。只用你需要的部分：

```
┌─────────────────────────────────────────────────────────────────┐
│                           瀏覽器                                 │
│                                                                 │
│   ┌──────────┐       ┌──────────────┐                          │
│   │ face.js  │ <──── │ clawdbot.js  │                          │
│   │          │       │              │                          │
│   │  - SVG   │       │  - WebSocket │                          │
│   │  - CSS   │       │  - 事件監聽   │                          │
│   │  - API   │       │  - 自動表情   │                          │
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
│  - STT (Whisper)│    │  - 工具呼叫     │
└─────────────────┘    └─────────────────┘
        ↑
        │ POST /expression
┌─────────────────┐
│   你的 Agent    │
│   (任何後端)     │
└─────────────────┘
```

### 使用模式

| 模式 | 需要的檔案 | 說明 |
|-----|-----------|------|
| **A. 純展示** | `face.js` | 只有臉，用 JS 控制 |
| **B. + Clawdbot** | `face.js` + `clawdbot.js` | 連接 Clawdbot 閘道，自動表情 |
| **C. + 自己的後端** | `face.js` + `server.js` | 用 SSE 推表情，加 TTS/STT |

### 各檔案職責

| 檔案 | 角色 | 網路 |
|-----|------|------|
| `face.js` | 臉部渲染 + `window.face` API | 無 |
| `clawdbot.js` | Clawdbot 閘道客戶端，收到事件時呼叫 `face.set()` | WebSocket 到閘道 |
| `server.js` | SSE 端點 + 透過 OpenAI 的 TTS/STT | HTTP/SSE |

**注意：** `clawdbot.js` 直接連到 Clawdbot Gateway — 不經過 `server.js`。它們是平行的整合選項。

## 表情

內建 16 種表情，各有獨特的眼睛樣式、嘴型和環境光暈：

| 表情 | 標籤 | 說明 |
|-----|------|------|
| `idle` | idle | 預設休息狀態 |
| `happy` | happy | 瞇眼笑、大笑容 |
| `thinking` | thinking | 眼睛看向旁邊 |
| `investigating` | investigating | 睜大眼、扁嘴 |
| `sleepy` | zzz... | 下垂弧形眼 |
| `bored` | bored | 半閉眼 |
| `amused` | haha | 瞇眼、超大笑容 |
| `surprised` | !? | 大圓眼、張嘴 |
| `focused` | working | 皺眉、專注 |
| `cool` | cool | 墨鏡 😎 |
| `confused` | huh? | 不對稱眼睛 |
| `excited` | !! | 星星眼、大笑 |
| `sad` | ... | 下垂瞳孔、皺眉 |
| `love` | ♥ | 愛心眼 |
| `alert` | alert | 睜大眼、緊繃嘴 |
| `working` | working hard... | 皺眉、專注 |

## JavaScript API

透過 `window.face` 程式化控制臉部：

```js
// 設定表情（5 秒後回到 idle）
face.set('happy', 5000);

// 永久設定（直到改變）
face.set('cool');

// 回到 idle 循環
face.idle();

// 嘴巴說話動畫（3 秒）
face.talk(3000);

// 停止說話
face.stop();

// 顯示打字字幕
face.subtitle('你好世界！', 4000);

// 列出所有表情
face.list();
// → ['idle', 'happy', 'thinking', ...]

// 取得當前表情
face.current();
// → 'happy'

// 存取表情定義
face.expressions;
```

## 功能特色

- 🎨 **16 種表情** 各有獨特眼睛樣式（愛心、星星、墨鏡等）
- 👁️ **自然眨眼** 隨機間隔，偶爾連續眨兩次
- 👀 **瞳孔漂移** — 閒置時眼睛會微微遊移
- 🫁 **呼吸動畫** — 輕柔的縮放脈動
- 🌈 **環境光暈** — 背景顏色隨表情變化
- 💬 **字幕系統** — 打字機風格文字疊加
- 🗣️ **說話動畫** — 隨機嘴型配合語音同步
- 🔄 **閒置循環** — 無控制時自動輪換表情
- 📱 **行動裝置友善** — 響應式、全螢幕、禁止選取

## 連接 Clawdbot

Clawd Face 內建 [Clawdbot](https://github.com/clawdbot/clawdbot) 整合 — 一個 AI 助理閘道。

### 快速設定

1. 執行 Clawdbot 實例（[安裝指南](https://docs.clawd.bot)）
2. 開啟範例並填入閘道資訊：

```
example-clawdbot.html?gw=wss://your-gateway.example.com&token=你的TOKEN
```

完成。臉部會連接，你可以透過輸入欄聊天。

> **安全提示：** 正式環境請使用 `wss://`（安全 WebSocket）。`ws://` 僅限本地開發使用（`ws://localhost:...`）。

### 自動行為

連接 Clawdbot 後，臉部會：

- 🤔 發送訊息時顯示 **thinking**
- 🔧 助理使用工具時顯示 **working/investigating/focused**
- 😊 從回應內容推斷表情（happy、amused、love 等）
- 💬 以打字字幕顯示回應
- 😕 錯誤時顯示 **confused**

### 設定選項

| 選項 | 預設值 | 說明 |
|-----|-------|------|
| `gatewayUrl` | `wss://your-gateway.example.com` | Clawdbot 閘道 WebSocket URL |
| `token` | `''` | 閘道認證 token |
| `sessionKey` | `'face'` | 此裝置的 session key |
| `clientId` | `'clawd-face'` | 客戶端識別碼 |
| `locale` | `'en'` | 語系 |
| `autoExpressions` | `true` | 自動映射事件到表情 |

### 工具表情映射

啟用 `autoExpressions` 時，工具使用會觸發對應表情：

| 工具模式 | 表情 | 持續時間 |
|---------|------|---------|
| `web_search`、`fetch` | `investigating` | 10 秒 |
| `exec`、`bash`、`shell` | `working` | 10 秒 |
| `read`、`file`、`glob`、`grep` | `thinking` | 8 秒 |
| `write`、`edit`、`create` | `focused` | 10 秒 |
| `tts`、`speak`、`audio` | `happy` | 5 秒 |
| 其他工具 | `focused` | 8 秒 |

## 執行伺服器

內含的 `server.js` 提供語音功能和即時表情推送。

### 快速開始

```bash
# 不需安裝 — 零依賴，使用 Node 內建模組

# 不含語音功能執行
node server.js

# 含 OpenAI TTS/STT 執行
OPENAI_API_KEY=sk-xxx node server.js

# 或使用 .env 檔案
cp .env.example .env
# 編輯 .env 填入 API 金鑰
node server.js
```

伺服器預設在 `http://localhost:3737` 執行。

### API 端點

| 端點 | 方法 | 說明 |
|-----|------|------|
| `/` | GET | 提供 `index.html` |
| `/expression-stream` | GET | 即時表情推送的 SSE 串流 |
| `/expression` | POST | 設定表情 `{ expression, duration, sessionKey? }` |
| `/speak` | POST | OpenAI TTS `{ text, voice? }` → MP3 |
| `/transcribe` | POST | Whisper STT（音訊 body）→ `{ text }` |
| `/media-proxy` | GET | 代理本地音訊檔 `?file=/path/to/audio.mp3` |
| `/health` | GET | 健康檢查 `{ ok, sseClients, hasOpenAI }` |

### 環境變數

| 變數 | 預設值 | 說明 |
|-----|-------|------|
| `OPENAI_API_KEY` | — | `/speak` 和 `/transcribe` 必需 |
| `PORT` | `3737` | HTTP 連接埠 |
| `HTTPS_PORT` | `3738` | HTTPS 連接埠（如有憑證） |
| `HOST` | `0.0.0.0` | 綁定位址 |

## 檔案說明

| 檔案 | 說明 |
|-----|------|
| `face.js` | 核心臉部引擎 — 獨立運作，自動注入所有內容 |
| `index.html` | 自適應 UI — 自動偵測 server 與 gateway，顯示 PTT / 聊天輸入 |
| `clawdbot.js` | Clawdbot/Moltbot 閘道整合模組 |
| `example-clawdbot.html` | 獨立範例，固定聊天輸入（無功能偵測） |
| `server.js` | Node.js 伺服器（SSE、TTS、STT） |
| `.env.example` | 環境設定範例 |

## 瀏覽器支援

支援所有現代瀏覽器。測試於：
- Chrome / Edge
- Firefox
- Safari（macOS 和 iOS）
- 行動版 Safari 和 Chrome

## 授權

MIT — 隨你怎麼用。
