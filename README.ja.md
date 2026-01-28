# 🤖 Clawd Face — ボットと対面で話そう

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | **[日本語](README.ja.md)**

[Clawdbot](https://github.com/clawdbot/clawdbot) や [Moltbot](https://github.com/moltbot/moltbot) に顔を。依存ゼロ。ドロップイン。

![Clawd Face](https://img.shields.io/badge/dependencies-zero-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

## クイックスタート

### フェイスのみ

```bash
open index.html
```

どこでもクリックして表情を切り替え。以上。

### 音声付き（Push-to-Talk）

```bash
# 1. クローン
git clone https://github.com/user/clawd-face.git
cd clawd-face

# 2. OpenAI APIキーを設定
cp .env.example .env
# .envを編集: OPENAI_API_KEY=sk-あなたのキー

# 3. 実行
npm start
# → http://localhost:3737
```

`npm install` 不要 — 依存ゼロ。🎤 PTTボタンが自動的に表示されます。

### Clawdbot / Moltbot Gatewayに接続

Gateway URLとtokenをクエリパラメータとして追加：

```
http://localhost:3737?gw=wss://your-gateway.example.com&token=YOUR_TOKEN
```

接続成功後、チャット入力欄が自動的に表示されます。

### iOS/モバイル（マイクにHTTPS必須）

```bash
npm run gen-certs   # 自己署名証明書を生成
npm start           # HTTPS は port 3738
```

## アダプティブUI

`index.html` は利用可能な機能を自動検出し、インターフェースを適応させます：

| 実行環境 | 表示内容 |
|---|---|
| 何もなし（ファイルを直接開く） | フェイスのみ — クリックで表情切り替え |
| `server.js` 稼働中 | 🎤 Push-to-Talkボタン（長押しで録音 → Whisper音声認識） |
| Gateway接続済み（`?gw=...&token=...`） | 💬 テキスト入力 + 送信ボタン |
| 両方あり | 🎤 PTT + 💬 テキスト入力 — フル体験 |

**仕組み：**

1. 読み込み時、`GET /health` を探査 — サーバーが応答すればPTTを有効化
2. `?gw=` と `?token=` URLパラメータがあれば、WebSocketでClawdbot/Moltbot Gatewayに接続
3. 下部バーとコントロールは少なくとも1つの機能が検出された場合のみ表示
4. 右上のステータスバッジが接続状態を表示

**PTTフロー：** 🎤ボタンを長押し → 録音 → 離す → 音声を `/transcribe`（Whisper）に送信 → テキストをGatewayに自動送信（接続済みの場合）またはサブタイトルとして表示。

### URLパラメータ

| パラメータ | デフォルト | 説明 |
|---|---|---|
| `gw` | — | Gateway WebSocket URL（例: `wss://your-gateway.example.com`） |
| `token` | — | Gateway認証トークン |
| `session` | `face` | チャットセッションキー |

### 自分のウェブサイトに埋め込む

`face.js` をプロジェクトにコピーし、任意のHTMLページに追加：

```html
<!-- your-page.html -->
<!DOCTYPE html>
<html>
<head><title>マイページ</title></head>
<body>
  <h1>ようこそ</h1>

  <!-- この1行を追加するだけ -->
  <script src="face.js"></script>

  <script>
    // フェイスを制御
    face.set('happy', 5000);
  </script>
</body>
</html>
```

モジュールがCSS、SVG、DOMを自動注入。設定不要。

### カスタムコンテナ

デフォルトでは、フェイスは `<body>` に追加されます。特定の要素に配置するには：

```html
<div id="avatar-area" style="width: 400px; height: 300px;"></div>
<script src="face.js" data-container="avatar-area"></script>
```

## アーキテクチャ

Clawd Face はモジュラー設計。必要な部分だけ使用：

```
┌─────────────────────────────────────────────────────────────────┐
│                         ブラウザ                                 │
│                                                                 │
│   ┌──────────┐       ┌──────────────┐                          │
│   │ face.js  │ <──── │ clawdbot.js  │                          │
│   │          │       │              │                          │
│   │  - SVG   │       │  - WebSocket │                          │
│   │  - CSS   │       │  - イベント   │                          │
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
│  - SSE プッシュ  │    │                 │
│  - TTS (OpenAI) │    │  - AIエージェント│
│  - STT (Whisper)│    │  - ツール呼出   │
└─────────────────┘    └─────────────────┘
        ↑
        │ POST /expression
┌─────────────────┐
│ あなたのAgent   │
│ (任意のバックエンド)│
└─────────────────┘
```

### 使用モード

| モード | 必要なファイル | 説明 |
|-------|--------------|------|
| **A. 表示のみ** | `face.js` | フェイスのみ、JSで制御 |
| **B. + Clawdbot** | `face.js` + `clawdbot.js` | Clawdbotゲートウェイに接続、自動表情 |
| **C. + 独自バックエンド** | `face.js` + `server.js` | SSEで表情プッシュ、TTS/STT追加 |

### 各ファイルの役割

| ファイル | 役割 | ネットワーク |
|---------|------|------------|
| `face.js` | フェイス描画 + `window.face` API | なし |
| `clawdbot.js` | Clawdbotゲートウェイクライアント、イベント時に `face.set()` を呼出 | WebSocket to gateway |
| `server.js` | SSEエンドポイント + OpenAI経由のTTS/STT | HTTP/SSE |

**注意：** `clawdbot.js` は Clawdbot Gateway に直接接続 — `server.js` を経由しません。並列の統合オプションです。

## 表情

16種類の表情を内蔵。それぞれ独自の目のスタイル、口の形、環境グローを持つ：

| 表情 | ラベル | 説明 |
|-----|-------|------|
| `idle` | idle | デフォルトの休息状態 |
| `happy` | happy | 細目笑い、大きな笑顔 |
| `thinking` | thinking | 目が横を向く |
| `investigating` | investigating | 大きな目、一文字口 |
| `sleepy` | zzz... | 垂れた弧形の目 |
| `bored` | bored | 半開きの目 |
| `amused` | haha | 細目、大笑い |
| `surprised` | !? | 大きな丸い目、開いた口 |
| `focused` | working | 眉を寄せ、集中 |
| `cool` | cool | サングラス 😎 |
| `confused` | huh? | 非対称の目 |
| `excited` | !! | キラキラ目、大きな笑顔 |
| `sad` | ... | 垂れた瞳孔、しかめ面 |
| `love` | ♥ | ハート目 |
| `alert` | alert | 大きな目、緊張した口 |
| `working` | working hard... | 眉を寄せ、集中 |

## JavaScript API

`window.face` でプログラム的に制御：

```js
// 表情を設定（5秒後にidleに戻る）
face.set('happy', 5000);

// 永続的に設定（変更するまで）
face.set('cool');

// idleサイクルに戻る
face.idle();

// 口の話すアニメーション（3秒）
face.talk(3000);

// 話すのを停止
face.stop();

// タイプ字幕を表示
face.subtitle('こんにちは！', 4000);

// 全表情をリスト
face.list();
// → ['idle', 'happy', 'thinking', ...]

// 現在の表情を取得
face.current();
// → 'happy'

// 表情定義にアクセス
face.expressions;
```

## 機能

- 🎨 **16種類の表情** 独自の目スタイル（ハート、星、サングラスなど）
- 👁️ **自然なまばたき** ランダム間隔、時々二重まばたき
- 👀 **瞳孔のドリフト** — アイドル時に目が微妙に動く
- 🫁 **呼吸アニメーション** — 穏やかなスケールパルス
- 🌈 **環境グロー** — 表情に応じて背景色が変化
- 💬 **字幕システム** — タイプライタースタイルのテキストオーバーレイ
- 🗣️ **話すアニメーション** — 音声同期用のランダム口形
- 🔄 **アイドルサイクル** — 制御されていない時に表情を自動ローテーション
- 📱 **モバイル対応** — レスポンシブ、フルスクリーン対応、テキスト選択禁止

## Clawdbotに接続

Clawd Faceには [Clawdbot](https://github.com/clawdbot/clawdbot) 統合が組み込まれています — AIエージェントゲートウェイ。

### クイックセットアップ

1. Clawdbotインスタンスを実行（[インストールガイド](https://docs.clawd.bot)）
2. ゲートウェイ情報を入力してサンプルを開く：

```
example-clawdbot.html?gw=wss://your-gateway.example.com&token=YOUR_TOKEN
```

完了。フェイスが接続し、入力バーでチャットできます。

> **セキュリティ注意：** 本番環境では `wss://`（セキュアWebSocket）を使用してください。`ws://` はローカル開発専用です（`ws://localhost:...`）。

### 自動動作

Clawdbot接続時、フェイスは：

- 🤔 メッセージ送信時に **thinking** を表示
- 🔧 エージェントがツール使用時に **working/investigating/focused** を表示
- 😊 応答内容から表情を推測（happy、amused、loveなど）
- 💬 応答をタイプ字幕で表示
- 😕 エラー時に **confused** を表示

### 設定オプション

| オプション | デフォルト | 説明 |
|-----------|----------|------|
| `gatewayUrl` | `wss://your-gateway.example.com` | Clawdbotゲートウェイ WebSocket URL |
| `token` | `''` | ゲートウェイ認証トークン |
| `sessionKey` | `'face'` | このデバイスのセッションキー |
| `clientId` | `'clawd-face'` | クライアント識別子 |
| `locale` | `'en'` | ロケール |
| `autoExpressions` | `true` | イベントを表情に自動マッピング |

### ツール表情マッピング

`autoExpressions` 有効時、ツール使用がコンテキスト対応の表情をトリガー：

| ツールパターン | 表情 | 持続時間 |
|--------------|------|---------|
| `web_search`、`fetch` | `investigating` | 10秒 |
| `exec`、`bash`、`shell` | `working` | 10秒 |
| `read`、`file`、`glob`、`grep` | `thinking` | 8秒 |
| `write`、`edit`、`create` | `focused` | 10秒 |
| `tts`、`speak`、`audio` | `happy` | 5秒 |
| その他のツール | `focused` | 8秒 |

## サーバーを実行

同梱の `server.js` は音声機能とリアルタイム表情プッシュを提供。

### クイックスタート

```bash
# インストール不要 — 依存ゼロ、Node組み込みを使用

# 音声機能なしで実行
node server.js

# OpenAI TTS/STT付きで実行
OPENAI_API_KEY=sk-xxx node server.js

# または .env ファイルを使用
cp .env.example .env
# .envにAPIキーを入力
node server.js
```

サーバーはデフォルトで `http://localhost:3737` で実行。

### APIエンドポイント

| エンドポイント | メソッド | 説明 |
|--------------|--------|------|
| `/` | GET | `index.html` を提供 |
| `/expression-stream` | GET | リアルタイム表情プッシュ用SSEストリーム |
| `/expression` | POST | 表情を設定 `{ expression, duration, sessionKey? }` |
| `/speak` | POST | OpenAI TTS `{ text, voice? }` → MP3 |
| `/transcribe` | POST | Whisper STT（音声ボディ）→ `{ text }` |
| `/media-proxy` | GET | ローカル音声ファイルをプロキシ `?file=/path/to/audio.mp3` |
| `/health` | GET | ヘルスチェック `{ ok, sseClients, hasOpenAI }` |

### 環境変数

| 変数 | デフォルト | 説明 |
|-----|----------|------|
| `OPENAI_API_KEY` | — | `/speak` と `/transcribe` に必須 |
| `PORT` | `3737` | HTTPポート |
| `HTTPS_PORT` | `3738` | HTTPSポート（証明書がある場合） |
| `HOST` | `0.0.0.0` | バインドアドレス |

## ファイル

| ファイル | 説明 |
|--------|------|
| `face.js` | コアフェイスエンジン — 自己完結、全てを自動注入 |
| `index.html` | アダプティブUI — server・gateway を自動検出、PTT/チャット入力を表示 |
| `clawdbot.js` | Clawdbot/Moltbotゲートウェイ統合モジュール |
| `example-clawdbot.html` | 独立サンプル、固定チャット入力（機能検出なし） |
| `server.js` | Node.jsサーバー（SSE、TTS、STT） |
| `.env.example` | 環境設定サンプル |

## ブラウザサポート

全ての最新ブラウザで動作。テスト済み：
- Chrome / Edge
- Firefox
- Safari（macOS と iOS）
- モバイルSafari と Chrome

## ライセンス

MIT — 好きに使ってください。
