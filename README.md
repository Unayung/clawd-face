# 🤖 Clawd Face

An expressive SVG face engine for AI agents. Zero dependencies. Single HTML file. Just open it.

![Clawd Face](https://img.shields.io/badge/dependencies-zero-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue)

## Quick Start

```bash
# That's it. Open the file.
open index.html
```

Or serve it:

```bash
npx serve .
```

**Click anywhere** to cycle through expressions.

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

The face uses CSS custom colors. Key values in the `<style>` block:

- Background gradient: `body { background: ... }`
- Face color: `.eye-shape { fill: #4a3f5c }` and `.mouth-line { stroke: #4a3f5c }`
- Lid color: `fill: '#d4b8f0'` in eye drawing functions
- Label color: `#label { color: #8a7aaa }`

## Browser Support

Works in all modern browsers. Tested on:
- Chrome / Edge
- Firefox
- Safari (macOS & iOS)
- Mobile Safari & Chrome

## License

MIT — do whatever you want with it.
