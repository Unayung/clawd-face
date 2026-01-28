# 🤖 Clawd Face — ボットと対面で話そう

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | **[日本語](README.ja.md)**

AIエージェント向けの表情豊かなSVGフェイスエンジン。依存ゼロ。スクリプトを読み込むだけ。

![Clawd Face](https://img.shields.io/badge/dependencies-zero-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

## クイックスタート

### フェイスのみ（サーバー不要）

```bash
open index.html
```

どこでもクリックして表情を切り替え。以上。

### 音声機能付き（TTS + 音声認識）

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

`npm install` 不要 — 依存ゼロ。

### iOS/モバイル（マイクにHTTPS必須）

```bash
npm run gen-certs   # 自己署名証明書を生成
npm start           # HTTPS は port 3738
```

### ページに埋め込む

```html
<script src="face.js"></script>
<script>
  face.set('happy', 5000);
</script>
```

モジュールがCSS、SVG、DOMを自動注入。設定不要。

### カスタムコンテナ

```html
<div id="my-face" style="width: 400px; height: 300px;"></div>
<script src="face.js" data-container="my-face"></script>
```

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
example-clawdbot.html?gw=ws://localhost:18789&token=YOUR_TOKEN
```

完了。フェイスが接続し、入力バーでチャットできます。

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
| `gatewayUrl` | `ws://localhost:18789` | Clawdbotゲートウェイ WebSocket URL |
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
| `index.html` | 最小デモ — `face.js`を読み込み、クリックで表情切替 |
| `clawdbot.js` | Clawdbotゲートウェイ統合モジュール |
| `example-clawdbot.html` | チャット入力付き完全サンプル |
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
