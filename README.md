# 🤖 Clawd Face

**Speak to your clawdbot — face to face.**

An expressive SVG face engine for AI agents. Zero dependencies. Drop-in module. Just include the script.

![Clawd Face](https://img.shields.io/badge/dependencies-zero-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

## Quick Start

### Option 1: Open the demo

```bash
open index.html
```

**Click anywhere** to cycle through expressions.

### Option 2: Add to your own page

```html
<script src="face.js"></script>
<script>
  face.set('happy', 5000);
</script>
```

The module self-injects all CSS, SVG, and DOM elements. No other setup needed.

### Option 3: Use a custom container

```html
<div id="my-face" style="width: 400px; height: 300px;"></div>
<script src="face.js" data-container="my-face"></script>
```

Without `data-container`, the face is appended to `document.body`.

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

## Browser Support

Works in all modern browsers. Tested on:
- Chrome / Edge
- Firefox
- Safari (macOS & iOS)
- Mobile Safari & Chrome

## License

MIT — do whatever you want with it.
