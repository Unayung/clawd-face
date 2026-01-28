# 🤖 Clawd Face — Speak to your bot, face to face

**[English](README.md)** | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md)

Give your [Clawdbot](https://github.com/clawdbot/clawdbot) or [Moltbot](https://github.com/moltbot/moltbot) a face. Zero dependencies. Drop-in module.

![Clawd Face](https://img.shields.io/badge/dependencies-zero-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

## Quick Start

### Just the Face (no server)

```bash
open index.html
```

Click anywhere to cycle through expressions. That's it.

### With Voice Features (TTS + Speech Recognition)

```bash
# 1. Clone
git clone https://github.com/user/clawd-face.git
cd clawd-face

# 2. Configure your OpenAI API key
cp .env.example .env
# Edit .env: OPENAI_API_KEY=sk-your-key-here

# 3. Run
npm start
# → http://localhost:3737
```

No `npm install` needed — zero dependencies.

### For iOS/Mobile (HTTPS required for mic)

```bash
npm run gen-certs   # Generate self-signed certificate
npm start           # HTTPS on port 3738
```

### Embed in Your Own Website

Copy `face.js` to your project and add to any HTML page:

```html
<!-- your-page.html -->
<!DOCTYPE html>
<html>
<head><title>My Page</title></head>
<body>
  <h1>Welcome</h1>

  <!-- Just add this line -->
  <script src="face.js"></script>

  <script>
    // Control the face
    face.set('happy', 5000);
  </script>
</body>
</html>
```

The module self-injects its own CSS, SVG, and DOM. No setup needed.

### Custom Container

By default, the face appends to `<body>`. To place it in a specific element:

```html
<div id="avatar-area" style="width: 400px; height: 300px;"></div>
<script src="face.js" data-container="avatar-area"></script>
```

## Architecture

Clawd Face has a modular design. Use only what you need:

```
┌─────────────────────────────────────────────────────────────────┐
│                           Browser                               │
│                                                                 │
│   ┌──────────┐       ┌──────────────┐                          │
│   │ face.js  │ <──── │ clawdbot.js  │                          │
│   │          │       │              │                          │
│   │  - SVG   │       │  - WebSocket │                          │
│   │  - CSS   │       │  - Events    │                          │
│   │  - API   │       │  - Auto-expr │                          │
│   └──────────┘       └──────┬───────┘                          │
│        ↑                    │                                   │
│        │ SSE                │ WebSocket                         │
└────────│────────────────────│───────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────────┐    ┌─────────────────┐
│   server.js     │    │    Clawdbot     │
│                 │    │    Gateway      │
│  - SSE push     │    │                 │
│  - TTS (OpenAI) │    │  - AI agent     │
│  - STT (Whisper)│    │  - Tool calls   │
└─────────────────┘    └─────────────────┘
        ↑
        │ POST /expression
┌─────────────────┐
│   Your Agent    │
│   (any backend) │
└─────────────────┘
```

### Usage Modes

| Mode | Files Needed | Description |
|------|--------------|-------------|
| **A. Display only** | `face.js` | Just the face, control via JS |
| **B. + Clawdbot** | `face.js` + `clawdbot.js` | Connect to Clawdbot gateway, auto-expressions |
| **C. + Your backend** | `face.js` + `server.js` | Push expressions via SSE, add TTS/STT |

### What Each File Does

| File | Role | Network |
|------|------|---------|
| `face.js` | Face rendering + `window.face` API | None |
| `clawdbot.js` | Clawdbot gateway client, calls `face.set()` on events | WebSocket to gateway |
| `server.js` | SSE endpoint + TTS/STT via OpenAI | HTTP/SSE |

**Note:** `clawdbot.js` connects directly to Clawdbot Gateway — it does NOT go through `server.js`. They are parallel integration options.

## Expressions

16 built-in expressions with unique eye styles, mouth shapes, and ambient glow:

| Expression | Label | Description |
|-----------|-------|-------------|
| `idle` | idle | Default resting state |
| `happy` | happy | Squinted happy eyes, big smile |
| `thinking` | thinking | Eyes looking sideways |
| `investigating` | investigating | Wide eyes, flat mouth |
| `sleepy` | zzz... | Droopy arc eyes |
| `bored` | bored | Half-lidded eyes |
| `amused` | haha | Squint eyes, huge grin |
| `surprised` | !? | Big round eyes, open mouth |
| `focused` | working | Brows drawn, determined |
| `cool` | cool | Sunglasses 😎 |
| `confused` | huh? | Asymmetric eyes |
| `excited` | !! | Sparkle eyes, wide smile |
| `sad` | ... | Downcast pupils, frown |
| `love` | ♥ | Heart eyes |
| `alert` | alert | Wide eyes, tense mouth |
| `working` | working hard... | Furrowed brows, focused |

## JavaScript API

Control the face programmatically via `window.face`:

```js
// Set an expression (returns to idle after 5 seconds)
face.set('happy', 5000);

// Set permanently (until changed)
face.set('cool');

// Return to idle cycle
face.idle();

// Mouth talking animation (3 seconds)
face.talk(3000);

// Stop talking
face.stop();

// Show typed subtitle
face.subtitle('Hello world!', 4000);

// List all expressions
face.list();
// → ['idle', 'happy', 'thinking', ...]

// Get current expression
face.current();
// → 'happy'

// Access expression definitions
face.expressions;
```

## Features

- 🎨 **16 expressions** with distinct eye styles (hearts, stars, sunglasses, etc.)
- 👁️ **Natural blinking** with random intervals and occasional double-blinks
- 👀 **Pupil drift** — eyes wander subtly when idle
- 🫁 **Breathing animation** — gentle scale pulse
- 🌈 **Ambient glow** — background color shifts per expression
- 💬 **Subtitle system** — typewriter-style text overlay
- 🗣️ **Talk animation** — randomized mouth shapes for speech sync
- 🔄 **Idle cycle** — auto-rotates through expressions when not controlled
- 📱 **Mobile-ready** — responsive, fullscreen-friendly, no text selection

## Integrating with Your AI Agent

The face is designed to be controlled by an AI agent or any backend. Here are some patterns:

### Server-Sent Events (SSE)

Add an SSE connection to push expressions in real-time:

```js
const es = new EventSource('/expression-stream');
es.onmessage = (evt) => {
  const { expression, duration, talk } = JSON.parse(evt.data);
  if (expression) face.set(expression, duration || 5000);
  if (talk) face.talk(talk);
};
```

### Polling

Poll a JSON endpoint for state changes:

```js
setInterval(async () => {
  const res = await fetch('/state.json');
  const state = await res.json();
  if (state.expression !== face.current()) {
    face.set(state.expression, state.duration || 0);
  }
}, 1000);
```

### WebSocket

Listen for expression events over an existing WebSocket:

```js
ws.addEventListener('message', (evt) => {
  const msg = JSON.parse(evt.data);
  if (msg.type === 'expression') {
    face.set(msg.expression, msg.duration || 5000);
  }
});
```

### HTTP Push (from your agent)

Have your agent POST to a lightweight server that broadcasts to the face:

```bash
curl -X POST http://localhost:3737/expression \
  -H 'Content-Type: application/json' \
  -d '{"expression":"excited","duration":5000}'
```

## Customization

### Add a new expression

```js
face.expressions.myExpr = {
  eyeRx: 18, eyeRy: 20, pupilR: 7, pupilOffY: 0,
  mouth: "M 170,180 Q 200,200 230,180",
  label: "custom", glow: "#ff6b6b"
};
face.set('myExpr', 3000);
```

### Change colors

The face injects its own CSS with these key classes:

| Selector | Default | Purpose |
|----------|---------|---------|
| `.clawd-eye-shape` | `#4a3f5c` | Eye fill color |
| `.clawd-pupil` | `#fff` | Pupil color |
| `.clawd-mouth` | `#4a3f5c` | Mouth stroke color |
| `#clawd-label` | `#8a7aaa` | Label text color |
| `#clawd-subtitle` | `#4a3f5c` | Subtitle text color |

Override after the script loads:

```css
.clawd-eye-shape { fill: #2d2640 !important; }
#clawd-label { color: #5a4a7a !important; }
```

For background styling, apply to your container or `body` — the module doesn't touch background colors.

## Connecting to Clawdbot

Clawd Face comes with a built-in integration for [Clawdbot](https://github.com/clawdbot/clawdbot) — an AI agent gateway.

### Quick Setup

1. Have a running Clawdbot instance ([install guide](https://docs.clawd.bot))
2. Open the example with your gateway details:

```
example-clawdbot.html?gw=ws://localhost:18789&token=YOUR_TOKEN
```

That's it. The face will connect, and you can chat via the input bar.

### What Happens Automatically

When connected to Clawdbot, the face:

- 🤔 Shows **thinking** when you send a message
- 🔧 Shows **working/investigating/focused** when the agent uses tools
- 😊 Infers expression from response content (happy, amused, love, etc.)
- 💬 Displays response as typed subtitle
- 😕 Shows **confused** on errors

### Using `clawdbot.js` in Your Own Page

```html
<script src="clawdbot.js"></script>
<script>
  const bot = new ClawdbotFace({
    gatewayUrl: 'ws://localhost:18789',
    token: 'your-token',
    sessionKey: 'face',

    // Optional callbacks
    onConnect: () => console.log('Connected!'),
    onMessage: (text) => console.log('Response:', text),
    onToolUse: (tools) => console.log('Tools:', tools),

    // Auto-map agent events to face expressions (default: true)
    autoExpressions: true,
  });

  bot.connect();
  bot.send('Hello!');
</script>
```

### Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `gatewayUrl` | `ws://localhost:18789` | Clawdbot gateway WebSocket URL |
| `token` | `''` | Gateway auth token |
| `sessionKey` | `'face'` | Session key for this device |
| `clientId` | `'clawd-face'` | Client identifier |
| `locale` | `'en'` | Locale for the session |
| `autoExpressions` | `true` | Auto-map events to face expressions |
| `onConnect` | `null` | Called when connected |
| `onDisconnect` | `null` | Called when disconnected |
| `onMessage` | `null` | Called with final response `(text, payload)` |
| `onDelta` | `null` | Called with streaming chunks `(text, payload)` |
| `onToolUse` | `null` | Called when agent uses tools `(toolName, payload)` |
| `onError` | `null` | Called on errors `(errorMessage)` |

### Tool Expression Mapping

When `autoExpressions` is enabled, tool usage triggers context-aware expressions:

| Tool Pattern | Expression | Duration |
|--------------|------------|----------|
| `web_search`, `fetch` | `investigating` | 10s |
| `exec`, `bash`, `shell` | `working` | 10s |
| `read`, `file`, `glob`, `grep` | `thinking` | 8s |
| `write`, `edit`, `create` | `focused` | 10s |
| `tts`, `speak`, `audio` | `happy` | 5s |
| Other tools | `focused` | 8s |

### Protocol Compatibility

`clawdbot.js` supports multiple Clawdbot/Moltbot gateway versions:

| Protocol | Format | Status |
|----------|--------|--------|
| v3+ (current) | `stream: 'tool'`, `data.name` | ✅ Supported |
| Legacy | `toolCalls` array | ✅ Supported |
| Legacy | `state: 'toolUse'` | ✅ Supported |

### Files

| File | Description |
|------|-------------|
| `face.js` | Core face engine — self-contained, injects everything |
| `index.html` | Minimal demo — loads `face.js`, click to cycle expressions |
| `clawdbot.js` | Clawdbot gateway integration module |
| `example-clawdbot.html` | Working example with chat input |
| `server.js` | Node.js server for voice features (SSE, TTS, STT) |
| `.env.example` | Example environment configuration |

## Running the Server

The included `server.js` provides voice features and real-time expression push.

### Quick Start

```bash
# Install nothing — zero dependencies, uses Node built-ins

# Run without voice features
node server.js

# Run with OpenAI TTS/STT
OPENAI_API_KEY=sk-xxx node server.js

# Or use a .env file
cp .env.example .env
# Edit .env with your API key
node server.js
```

Server runs on `http://localhost:3737` by default.

### Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serves `index.html` |
| `/expression-stream` | GET | SSE stream for real-time expression push |
| `/expression` | POST | Set expression `{ expression, duration, sessionKey? }` |
| `/speak` | POST | TTS via OpenAI `{ text, voice? }` → MP3 |
| `/transcribe` | POST | STT via Whisper (audio body) → `{ text }` |
| `/media-proxy` | GET | Proxy local audio files `?file=/path/to/audio.mp3` |
| `/health` | GET | Health check `{ ok, sseClients, hasOpenAI }` |

### Push Expressions from Your Agent

```bash
# Set expression for all connected clients
curl -X POST http://localhost:3737/expression \
  -H 'Content-Type: application/json' \
  -d '{"expression":"excited","duration":5000}'

# Target specific session
curl -X POST http://localhost:3737/expression \
  -H 'Content-Type: application/json' \
  -d '{"expression":"thinking","sessionKey":"face-abc123"}'
```

### SSE Client Example

```js
const es = new EventSource('/expression-stream?sessionKey=my-device');
es.onmessage = (evt) => {
  const { expression, duration } = JSON.parse(evt.data);
  face.set(expression, duration);
};
```

### HTTPS for iOS Microphone

iOS Safari requires HTTPS for microphone access:

```bash
# Create certs directory
mkdir -p certs

# Generate self-signed certificate
openssl req -x509 -newkey rsa:2048 \
  -keyout certs/key.pem -out certs/cert.pem \
  -days 365 -nodes -subj '/CN=localhost'

# Server will auto-detect and serve HTTPS on port 3738
node server.js
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | — | Required for `/speak` and `/transcribe` |
| `PORT` | `3737` | HTTP port |
| `HTTPS_PORT` | `3738` | HTTPS port (if certs exist) |
| `HOST` | `0.0.0.0` | Bind address |

## Voice Features Guide

### Text-to-Speech

```js
// Generate and play TTS audio
async function speakResponse(text) {
  const resp = await fetch('/speak', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice: 'onyx' })
  });
  const arrayBuffer = await resp.arrayBuffer();

  // Play with Web Audio API (iOS compatible)
  const audioCtx = new AudioContext();
  const buffer = await audioCtx.decodeAudioData(arrayBuffer);
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(audioCtx.destination);

  // Sync mouth animation
  face.talk(buffer.duration * 1000);
  source.start(0);
}
```

Available voices: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`

### Speech-to-Text

```js
// Record and transcribe audio
const mediaRecorder = new MediaRecorder(stream);
const chunks = [];

mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
mediaRecorder.onstop = async () => {
  const blob = new Blob(chunks, { type: 'audio/webm' });
  const resp = await fetch('/transcribe', {
    method: 'POST',
    body: blob
  });
  const { text } = await resp.json();
  console.log('Transcribed:', text);
};
```

Requires `ffmpeg` on the server for audio conversion.

### iOS Audio Unlock

iOS blocks audio until user gesture:

```js
// Unlock AudioContext on first interaction
let audioCtx;
document.addEventListener('click', () => {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}, { once: true });
```

## Browser Support

Works in all modern browsers. Tested on:
- Chrome / Edge
- Firefox
- Safari (macOS & iOS)
- Mobile Safari & Chrome

## License

MIT — do whatever you want with it.
