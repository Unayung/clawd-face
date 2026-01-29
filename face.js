/**
 * Clawd Face — Expressive SVG Face Engine
 *
 * Zero dependencies. Injects its own CSS, SVG, and DOM elements.
 * Exposes window.face API for programmatic control.
 *
 * Usage:
 *   <script src="face.js"></script>
 *   <script>face.set('happy', 5000);</script>
 *
 * Or with a container:
 *   <div id="face-container"></div>
 *   <script src="face.js" data-container="face-container"></script>
 */

(function () {
  'use strict';

  // ── Inject CSS ──
  const css = `
    #clawd-face-root {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      font-family: 'Courier New', 'Menlo', monospace;
      -webkit-user-select: none;
      user-select: none;
    }
    #clawd-glow {
      position: absolute;
      width: 50vmin; height: 50vmin;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.1;
      transition: background 1.2s ease;
      pointer-events: none;
      z-index: 0;
    }
    #clawd-scene {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      animation: clawd-breathe 4s ease-in-out infinite;
    }
    @keyframes clawd-breathe {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.015); }
    }
    #clawd-face-svg {
      width: 85vmin; height: 60vmin;
      max-width: 1000px; max-height: 700px;
      z-index: 1;
      overflow: visible;
      transition: opacity 0.4s ease;
    }
    #clawd-face-svg.fading { opacity: 0; }
    #clawd-label {
      margin-top: 1.5rem;
      font-size: clamp(0.7rem, 1.8vw, 1.2rem);
      color: #8a7aaa;
      text-transform: uppercase;
      letter-spacing: 0.35em;
      transition: opacity 0.5s ease;
      z-index: 1;
    }
    #clawd-subtitle {
      position: fixed;
      bottom: calc(15vh + env(safe-area-inset-bottom, 0px)); left: 50%;
      transform: translateX(-50%);
      max-width: 80vw;
      text-align: center;
      font-size: clamp(1rem, 2.8vw, 1.8rem);
      color: #4a3f5c;
      line-height: 1.6;
      letter-spacing: 0.02em;
      opacity: 0;
      transition: opacity 0.4s ease;
      z-index: 10;
      pointer-events: none;
      text-shadow: 0 1px 4px rgba(255,255,255,0.6);
    }
    #clawd-subtitle.visible { opacity: 1; }
    #clawd-thought {
      position: fixed;
      top: 15vh;
      left: 50%;
      transform: translateX(-50%);
      max-width: 85vw;
      padding: 1em 1.5em;
      background: rgba(255,255,255,0.85);
      border-radius: 1.5em;
      font-size: clamp(1.1rem, 3.5vw, 1.6rem);
      color: #5a4a7a;
      font-style: italic;
      text-align: center;
      opacity: 0;
      transition: opacity 0.5s ease;
      z-index: 8;
      pointer-events: none;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    #clawd-thought::before {
      content: '💭';
      margin-right: 0.5em;
      font-size: 1.2em;
    }
    #clawd-thought.visible { opacity: 1; }
    
    /* Working mode background */
    body.working-mode {
      background: linear-gradient(135deg, #FFE5E5 0%, #FFCCCC 50%, #FFD6D6 100%) !important;
      transition: background 0.8s ease;
    }
    body {
      transition: background 0.8s ease;
    }
    .clawd-eye-shape { fill: #4a3f5c; stroke: none; transition: opacity 0.08s ease; }
    .clawd-pupil { fill: #fff; stroke: none; }
    .clawd-mouth { stroke: #4a3f5c; stroke-width: 3; fill: none; stroke-linecap: round; }
  `;

  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── Find or create container ──
  const script = document.currentScript;
  const containerId = script?.getAttribute('data-container');
  let container = containerId ? document.getElementById(containerId) : null;
  if (!container) {
    container = document.body;
  }

  // ── Inject DOM ──
  const root = document.createElement('div');
  root.id = 'clawd-face-root';
  root.innerHTML = `
    <div id="clawd-glow"></div>
    <div id="clawd-scene">
      <svg id="clawd-face-svg" viewBox="0 0 400 260">
        <g id="clawd-eye-left" transform="translate(130, 105)"></g>
        <g id="clawd-eye-right" transform="translate(270, 105)"></g>
        <path class="clawd-mouth" id="clawd-mouth" d="M 170,180 Q 200,200 230,180" />
      </svg>
      <div id="clawd-label">idle</div>
    </div>
    <div id="clawd-subtitle"></div>
    <div id="clawd-thought"></div>
  `;
  container.appendChild(root);

  // ── DOM refs ──
  const svgEl = document.getElementById('clawd-face-svg');
  const labelEl = document.getElementById('clawd-label');
  const glowEl = document.getElementById('clawd-glow');
  const mouthEl = document.getElementById('clawd-mouth');
  const eyeLeftGroup = document.getElementById('clawd-eye-left');
  const eyeRightGroup = document.getElementById('clawd-eye-right');
  const subtitleEl = document.getElementById('clawd-subtitle');
  const thoughtEl = document.getElementById('clawd-thought');

  // ── Expression Definitions ──
  const expressions = {
    idle:          { eyeRx: 18, eyeRy: 20, pupilR: 7, pupilOffY: 2, mouth: "M 170,180 Q 200,198 230,180", label: "idle", glow: "#4a9eff" },
    happy:         { eyeRx: 18, eyeRy: 12, pupilR: 6, pupilOffY: 0, eyeStyle: "happy", mouth: "M 165,175 Q 200,212 235,175", label: "happy", glow: "#ffda6b" },
    thinking:      { eyeRx: 16, eyeRy: 20, pupilR: 7, pupilOffY: 0, pupilOffX: 6, mouth: "M 175,185 Q 200,185 225,180", label: "thinking", glow: "#a78bfa" },
    investigating: { eyeRx: 22, eyeRy: 24, pupilR: 5, pupilOffY: 0, mouth: "M 180,185 L 220,185", label: "investigating", glow: "#f97316" },
    sleepy:        { eyeRx: 16, eyeRy: 5, pupilR: 4, pupilOffY: 0, eyeStyle: "sleepy", mouth: "M 175,183 Q 200,190 225,183", label: "zzz...", glow: "#3b4f7a", noBlink: true },
    bored:         { eyeRx: 18, eyeRy: 10, pupilR: 6, pupilOffY: 2, eyeStyle: "halfopen", mouth: "M 180,185 L 220,185", label: "bored", glow: "#6b7280" },
    amused:        { eyeRx: 16, eyeRy: 11, pupilR: 5, pupilOffY: 0, eyeStyle: "happy", mouth: "M 160,172 Q 200,218 240,172", label: "haha", glow: "#34d399" },
    surprised:     { eyeRx: 24, eyeRy: 26, pupilR: 5, pupilOffY: 0, mouth: "M 185,180 Q 200,200 215,180 Q 200,200 185,180", mouthStyle: "open", label: "!?", glow: "#f43f5e" },
    focused:       { eyeRx: 16, eyeRy: 14, pupilR: 6, pupilOffY: 2, eyeStyle: "focused", mouth: "M 180,185 L 220,183", label: "working", glow: "#06b6d4" },
    cool:          { eyeRx: 20, eyeRy: 8, pupilR: 0, pupilOffY: 0, eyeStyle: "cool", mouth: "M 172,180 Q 200,195 228,180", label: "cool", glow: "#8b5cf6", noBlink: true },
    confused:      { eyeRx: 18, eyeRy: 20, pupilR: 7, pupilOffY: 0, pupilOffX: -3, eyeStyle: "confused", mouth: "M 175,183 Q 200,183 220,190", label: "huh?", glow: "#fbbf24" },
    excited:       { eyeRx: 20, eyeRy: 20, pupilR: 4, pupilOffY: -2, eyeStyle: "star", mouth: "M 160,170 Q 200,218 240,170", label: "!!", glow: "#ec4899" },
    sad:           { eyeRx: 16, eyeRy: 18, pupilR: 7, pupilOffY: 5, mouth: "M 172,195 Q 200,178 228,195", label: "...", glow: "#475569" },
    love:          { eyeRx: 18, eyeRy: 18, pupilR: 0, pupilOffY: 0, eyeStyle: "heart", mouth: "M 165,175 Q 200,212 235,175", label: "♥", glow: "#f43f5e", noBlink: true },
    alert:         { eyeRx: 22, eyeRy: 22, pupilR: 4, pupilOffY: 0, mouth: "M 185,170 L 215,170", label: "alert", glow: "#ef4444" },
    working:       { eyeRx: 15, eyeRy: 12, pupilR: 5, pupilOffY: 2, eyeStyle: "working", mouth: "M 182,186 L 218,186", label: "working hard...", glow: "#3b82f6" },
  };

  const FACE_COLOR = '#4a3f5c';
  const LID_COLOR = '#d4b8f0';
  const idlePool = ['idle', 'happy', 'sleepy', 'bored', 'thinking', 'cool', 'amused'];

  let currentExpression = 'idle';
  let currentExprData = expressions.idle;
  let idleTimer = null;
  let isIdle = true;
  let manualOverrideTimeout = null;
  let blinkTimer = null;
  let isBlinking = false;
  let isSpeaking = false;
  let talkAnimFrame = null;
  let subtitleTimeout = null;
  let subtitleTypingTimer = null;
  let labelDotsTimer = null;
  let labelDotsCount = 1;
  let thoughtTimer = null;
  let thoughtHideTimer = null;

  // Random idle thoughts (static fallback)
  const staticThoughts = [
    '今天天氣不錯...',
    '晚餐要吃什麼呢',
    '好想喝咖啡',
    '應該來整理一下桌面',
    '等等要做什麼來著...',
    'bug 藏在哪裡呢',
    '這個 function 可以重構',
    '記得要 commit',
    '好睏...',
    '週末要幹嘛',
    '...',
  ];

  // Dynamic thoughts from trending data
  let dynamicThoughts = [];
  let lastTrendingFetch = 0;
  const TRENDING_CACHE_MS = 5 * 60 * 1000; // Cache for 5 minutes

  async function fetchTrendingThoughts() {
    const now = Date.now();
    if (now - lastTrendingFetch < TRENDING_CACHE_MS && dynamicThoughts.length > 0) {
      return; // Use cached data
    }
    try {
      const resp = await fetch('/api/trending');
      const data = await resp.json();
      if (data.ok && data.thoughts?.length) {
        dynamicThoughts = data.thoughts.map(t => t.text);
        lastTrendingFetch = now;
        console.log('[thoughts] fetched', dynamicThoughts.length, 'trending items');
      }
    } catch (e) {
      console.log('[thoughts] fetch error:', e.message);
    }
  }

  function getRandomThought() {
    // 70% chance to use dynamic thoughts if available
    if (dynamicThoughts.length > 0 && Math.random() < 0.7) {
      return dynamicThoughts[Math.floor(Math.random() * dynamicThoughts.length)];
    }
    return staticThoughts[Math.floor(Math.random() * staticThoughts.length)];
  }

  // ── SVG Helpers ──
  function svgCreate(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  function drawNormalEye(g, rx, ry, pr, offX, offY) {
    g.appendChild(svgCreate('ellipse', { class: 'clawd-eye-shape', cx: 0, cy: 0, rx, ry }));
    if (pr > 0) g.appendChild(svgCreate('circle', { class: 'clawd-pupil', cx: offX, cy: offY, r: pr }));
    g.appendChild(svgCreate('ellipse', { class: 'clawd-eye-lid', cx: 0, cy: 0, rx: rx + 3, ry: 0, fill: LID_COLOR }));
  }
  function drawArcEye(g, droopy) {
    g.appendChild(svgCreate('path', {
      d: droopy ? "M -16,2 Q 0,12 16,2" : "M -16,0 Q 0,-14 16,0",
      fill: 'none', stroke: FACE_COLOR, 'stroke-width': 3.5, 'stroke-linecap': 'round'
    }));
  }
  function drawCoolEye(g) {
    g.appendChild(svgCreate('rect', { x: -22, y: -8, width: 44, height: 16, rx: 3, fill: FACE_COLOR, opacity: 0.9 }));
    g.appendChild(svgCreate('rect', { x: -19, y: -5, width: 38, height: 10, rx: 2, fill: '#2d2640' }));
  }
  function drawHeartEye(g) {
    g.appendChild(svgCreate('path', { d: "M 0,10 C -5,0 -18,-5 -18,-14 C -18,-22 -8,-26 0,-16 C 8,-26 18,-22 18,-14 C 18,-5 5,0 0,10 Z", fill: '#f43f5e' }));
  }
  function addSparkle(g) {
    g.appendChild(svgCreate('path', { d: "M 12,-16 L 14,-10 L 20,-12 L 15,-7 L 20,-2 L 14,-5 L 12,2 L 10,-5 L 4,-2 L 9,-7 L 4,-12 L 10,-10 Z", fill: '#fbbf24', opacity: 0.9 }));
  }
  function addBrow(g, dir) {
    g.appendChild(svgCreate('line', { x1: -14, y1: -28 + dir * 3, x2: 14, y2: -28 - dir * 3, stroke: FACE_COLOR, 'stroke-width': 3, 'stroke-linecap': 'round' }));
  }
  function addFurrowedBrow(g, dir) {
    g.appendChild(svgCreate('line', { x1: -16, y1: -24 + dir * 5, x2: 14, y2: -26 - dir * 5, stroke: FACE_COLOR, 'stroke-width': 3.5, 'stroke-linecap': 'round' }));
    g.appendChild(svgCreate('line', { x1: dir * 14, y1: -28, x2: dir * 12, y2: -22, stroke: FACE_COLOR, 'stroke-width': 1.5, 'stroke-linecap': 'round', opacity: 0.5 }));
  }
  function addLid(g, rx, ry) {
    g.appendChild(svgCreate('ellipse', { class: 'clawd-eye-lid-half', cx: 0, cy: -ry * 0.3, rx, ry, fill: LID_COLOR }));
  }

  // ── Draw Expression ──
  function drawExpression(name) {
    const expr = expressions[name];
    if (!expr) return;
    currentExprData = expr;
    const ox = expr.pupilOffX || 0;
    const oy = expr.pupilOffY || 0;
    eyeLeftGroup.innerHTML = '';
    eyeRightGroup.innerHTML = '';
    const style = expr.eyeStyle || 'normal';

    if (style === 'happy')        { drawArcEye(eyeLeftGroup, false); drawArcEye(eyeRightGroup, false); }
    else if (style === 'sleepy')  { drawArcEye(eyeLeftGroup, true);  drawArcEye(eyeRightGroup, true); }
    else if (style === 'halfopen') {
      drawNormalEye(eyeLeftGroup, expr.eyeRx, expr.eyeRy, expr.pupilR, ox, oy);
      drawNormalEye(eyeRightGroup, expr.eyeRx, expr.eyeRy, expr.pupilR, ox, oy);
      addLid(eyeLeftGroup, expr.eyeRx + 2, expr.eyeRy * 0.5);
      addLid(eyeRightGroup, expr.eyeRx + 2, expr.eyeRy * 0.5);
    } else if (style === 'cool') { drawCoolEye(eyeLeftGroup); drawCoolEye(eyeRightGroup); }
    else if (style === 'heart')  { drawHeartEye(eyeLeftGroup); drawHeartEye(eyeRightGroup); }
    else if (style === 'star') {
      drawNormalEye(eyeLeftGroup, expr.eyeRx, expr.eyeRy, expr.pupilR, ox, oy);
      drawNormalEye(eyeRightGroup, expr.eyeRx, expr.eyeRy, expr.pupilR, ox, oy);
      addSparkle(eyeLeftGroup); addSparkle(eyeRightGroup);
    } else if (style === 'working') {
      drawNormalEye(eyeLeftGroup, expr.eyeRx, expr.eyeRy, expr.pupilR, ox, oy);
      drawNormalEye(eyeRightGroup, expr.eyeRx, expr.eyeRy, expr.pupilR, ox, oy);
      addFurrowedBrow(eyeLeftGroup, -1); addFurrowedBrow(eyeRightGroup, 1);
      addLid(eyeLeftGroup, expr.eyeRx + 2, expr.eyeRy * 0.4);
      addLid(eyeRightGroup, expr.eyeRx + 2, expr.eyeRy * 0.4);
    } else if (style === 'focused') {
      drawNormalEye(eyeLeftGroup, expr.eyeRx, expr.eyeRy, expr.pupilR, ox, oy);
      drawNormalEye(eyeRightGroup, expr.eyeRx, expr.eyeRy, expr.pupilR, ox, oy);
      addBrow(eyeLeftGroup, -1); addBrow(eyeRightGroup, 1);
    } else if (style === 'confused') {
      drawNormalEye(eyeLeftGroup, 16, 18, 7, ox, oy);
      drawNormalEye(eyeRightGroup, 22, 24, 8, ox, oy);
    } else {
      drawNormalEye(eyeLeftGroup, expr.eyeRx, expr.eyeRy, expr.pupilR, ox, oy);
      drawNormalEye(eyeRightGroup, expr.eyeRx, expr.eyeRy, expr.pupilR, ox, oy);
    }

    mouthEl.setAttribute('d', expr.mouth);
    mouthEl.style.fill = expr.mouthStyle === 'open' ? FACE_COLOR : 'none';
    mouthEl.style.stroke = FACE_COLOR;
    glowEl.style.background = expr.glow;

    // Animated dots for "working" labels
    clearInterval(labelDotsTimer);
    labelDotsTimer = null;
    if (expr.label.toLowerCase().includes('working')) {
      const baseLabel = expr.label.replace(/\.+$/, '');
      labelDotsCount = 1;
      labelEl.textContent = baseLabel + '.';
      labelDotsTimer = setInterval(() => {
        labelDotsCount = (labelDotsCount % 3) + 1;
        labelEl.textContent = baseLabel + '.'.repeat(labelDotsCount);
      }, 400);
    } else {
      labelEl.textContent = expr.label;
    }
  }

  // ── Expression Switching ──
  const workingExpressions = ['working', 'focused', 'investigating'];
  
  function setExpression(name, options = {}) {
    if (!expressions[name]) return;
    const { manual = false, duration = 0 } = options;
    
    // Toggle working mode background
    if (workingExpressions.includes(name)) {
      document.body.classList.add('working-mode');
    } else {
      document.body.classList.remove('working-mode');
    }
    
    svgEl.classList.add('fading');
    labelEl.style.opacity = '0';
    setTimeout(() => {
      currentExpression = name;
      drawExpression(name);
      svgEl.classList.remove('fading');
      labelEl.style.opacity = '1';
    }, 400);
    if (manual) {
      isIdle = false;
      clearTimeout(idleTimer);
      clearTimeout(manualOverrideTimeout);
      hideThought();
      if (duration > 0) {
        manualOverrideTimeout = setTimeout(() => { isIdle = true; startIdleCycle(); startPupilDrift(); startThoughtCycle(); }, duration);
      }
    }
  }

  // ── Idle Cycle ──
  function startIdleCycle() {
    clearTimeout(idleTimer);
    (function next() {
      idleTimer = setTimeout(() => {
        if (!isIdle) return;
        let n; do { n = idlePool[Math.floor(Math.random() * idlePool.length)]; } while (n === currentExpression && idlePool.length > 1);
        setExpression(n);
        next();
      }, 15000 + Math.random() * 30000);
    })();
  }

  // ── Blink ──
  function blink() {
    if (currentExprData.noBlink || currentExprData.eyeStyle === 'happy' || currentExprData.eyeStyle === 'sleepy' || isBlinking) return;
    isBlinking = true;
    const lids = root.querySelectorAll('.clawd-eye-lid');
    lids.forEach(lid => {
      const w = lid.parentElement.querySelector('.clawd-eye-shape');
      if (w) lid.setAttribute('ry', parseFloat(w.getAttribute('ry')) + 3);
    });
    setTimeout(() => { lids.forEach(lid => lid.setAttribute('ry', 0)); isBlinking = false; }, 120);
  }
  function scheduleNextBlink() {
    blinkTimer = setTimeout(() => {
      blink();
      if (Math.random() < 0.2) setTimeout(blink, 250);
      scheduleNextBlink();
    }, 2500 + Math.random() * 4000);
  }

  // ── Pupil Drift ──
  function startPupilDrift() {
    (function drift() {
      if (!isIdle) return;
      const pupils = root.querySelectorAll('.clawd-pupil');
      const dx = (Math.random() - 0.5) * 6;
      const dy = (Math.random() - 0.5) * 4;
      pupils.forEach(p => { p.setAttribute('cx', dx); p.setAttribute('cy', (currentExprData.pupilOffY || 0) + dy); });
      setTimeout(() => {
        pupils.forEach(p => { p.setAttribute('cx', currentExprData.pupilOffX || 0); p.setAttribute('cy', currentExprData.pupilOffY || 0); });
      }, 800 + Math.random() * 1200);
      setTimeout(drift, 4000 + Math.random() * 6000);
    })();
  }

  // ── Talk Animation ──
  const mouthShapes = [
    "M 180,180 Q 200,196 220,180", "M 172,177 Q 200,208 228,177",
    "M 178,180 Q 200,192 222,180", "M 185,182 Q 200,194 215,182",
    "M 168,175 Q 200,212 232,175",
  ];
  function animateTalking() {
    if (!isSpeaking) { const e = expressions[currentExpression]; if (e) { mouthEl.setAttribute('d', e.mouth); mouthEl.style.fill = 'none'; } return; }
    mouthEl.setAttribute('d', mouthShapes[Math.floor(Math.random() * mouthShapes.length)]);
    mouthEl.style.fill = 'none';
    talkAnimFrame = setTimeout(animateTalking, 80 + Math.random() * 100);
  }

  // ── Subtitle ──
  function cancelSubtitle() {
    clearTimeout(subtitleTimeout); clearTimeout(subtitleTypingTimer);
    subtitleEl.classList.remove('visible'); subtitleEl.textContent = '';
  }

  // ── Random Thoughts ──
  const thoughtfulExpressions = ['idle', 'bored', 'thinking', 'sleepy', 'confused'];
  
  function showThought() {
    // Show thoughts when idle OR in thoughtful expressions
    if (!isIdle && !thoughtfulExpressions.includes(currentExpression)) return;
    const thought = getRandomThought();
    thoughtEl.textContent = thought;
    thoughtEl.classList.add('visible');
    clearTimeout(thoughtHideTimer);
    thoughtHideTimer = setTimeout(() => {
      thoughtEl.classList.remove('visible');
    }, 5000 + Math.random() * 3000);
  }

  function hideThought() {
    clearTimeout(thoughtTimer);
    clearTimeout(thoughtHideTimer);
    thoughtEl.classList.remove('visible');
  }

  function startThoughtCycle() {
    clearTimeout(thoughtTimer);
    fetchTrendingThoughts(); // Fetch on start
    (function next() {
      thoughtTimer = setTimeout(async () => {
        if (!isIdle) return;
        await fetchTrendingThoughts(); // Refresh if cache expired
        if (Math.random() < 0.85) showThought(); // 85% chance to show
        next();
      }, 10000); // Every 10 seconds
    })();
  }
  function showSubtitle(text, durationMs) {
    cancelSubtitle();
    if (!text) return;
    const chars = [...text];
    const charDelay = Math.max((durationMs * 0.9) / chars.length, 30);
    let i = 0;
    subtitleEl.textContent = '';
    subtitleEl.classList.add('visible');
    (function typeNext() {
      if (i < chars.length) { subtitleEl.textContent += chars[i++]; subtitleTypingTimer = setTimeout(typeNext, charDelay); }
      else { subtitleTimeout = setTimeout(() => subtitleEl.classList.remove('visible'), 2000); }
    })();
  }

  // ── Public API ──
  window.face = {
    set(name, duration) { setExpression(name, { manual: true, duration: duration || 0 }); },
    idle() { isIdle = true; startIdleCycle(); startPupilDrift(); startThoughtCycle(); },
    list() { return Object.keys(expressions); },
    current() { return currentExpression; },
    talk(durationMs) {
      isSpeaking = true; animateTalking();
      setTimeout(() => { isSpeaking = false; clearTimeout(talkAnimFrame); const e = expressions[currentExpression]; if (e) { mouthEl.setAttribute('d', e.mouth); mouthEl.style.fill = 'none'; } }, durationMs || 3000);
    },
    stop() { isSpeaking = false; clearTimeout(talkAnimFrame); const e = expressions[currentExpression]; if (e) { mouthEl.setAttribute('d', e.mouth); mouthEl.style.fill = 'none'; } },
    subtitle(text, durationMs) { showSubtitle(text, durationMs || 5000); },
    expressions,
  };

  // ── Init ──
  drawExpression('idle');
  startIdleCycle();
  scheduleNextBlink();
  startPupilDrift();
  startThoughtCycle();

})();
