/**
 * Clawd Face — Clawdbot Gateway Integration
 *
 * Connects the face to a Clawdbot instance via WebSocket.
 * Provides two-way chat + automatic expression mapping.
 *
 * Usage:
 *   <script src="clawdbot.js"></script>
 *   <script>
 *     const bot = new ClawdbotFace({
 *       gatewayUrl: 'wss://your-gateway.example.com',  // Use wss:// for production
 *       token: 'your-gateway-token',
 *       sessionKey: 'face',
 *     });
 *     bot.connect();
 *     bot.send('Hello!');
 *   </script>
 *
 * Security Note:
 *   Always use wss:// (secure WebSocket) in production.
 *   ws:// should only be used for local development.
 */

class ClawdbotFace {
  constructor(options = {}) {
    // Default to empty string - user must provide their own gateway URL
    this.gatewayUrl = options.gatewayUrl || '';
    this.token = options.token || '';
    this.sessionKey = options.sessionKey || 'face';
    this.protocolVersion = 3;
    this.clientId = options.clientId || 'webchat';
    this.locale = options.locale || 'en';

    // Callbacks
    this.onConnect = options.onConnect || null;
    this.onDisconnect = options.onDisconnect || null;
    this.onMessage = options.onMessage || null;     // (text, payload) => {}
    this.onDelta = options.onDelta || null;          // (text, payload) => {}
    this.onToolUse = options.onToolUse || null;      // (toolNames, payload) => {}
    this.onError = options.onError || null;           // (error) => {}

    // Auto expression mapping (requires window.face)
    this.autoExpressions = options.autoExpressions !== false;

    // State
    this._ws = null;
    this._connected = false;
    this._reconnectTimer = null;
    this._reconnectDelay = 1000;
    this._pendingRequests = {};
    this._idCounter = 0;
  }

  // ── Connection ──

  connect() {
    if (this._ws) return;
    try {
      this._ws = new WebSocket(this.gatewayUrl);
    } catch (e) {
      console.error('[clawdbot] WebSocket creation failed:', e);
      this._scheduleReconnect();
      return;
    }

    this._ws.onopen = () => {
      console.log('[clawdbot] WS open, awaiting challenge...');
    };

    this._ws.onmessage = (evt) => {
      let msg;
      try { msg = JSON.parse(evt.data); } catch { return; }
      this._handleMessage(msg);
    };

    this._ws.onclose = (evt) => {
      this._connected = false;
      console.log('[clawdbot] WS closed:', evt.code, evt.reason);
      this._ws = null;
      if (this.onDisconnect) this.onDisconnect(evt);
      this._scheduleReconnect();
    };

    this._ws.onerror = (evt) => {
      console.error('[clawdbot] WS error:', evt);
    };
  }

  disconnect() {
    clearTimeout(this._reconnectTimer);
    this._reconnectTimer = null;
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this._connected = false;
  }

  get connected() {
    return this._connected;
  }

  // ── Chat ──

  /** Send a message to the Clawdbot session */
  send(text) {
    if (!this._connected) {
      console.warn('[clawdbot] Not connected');
      return Promise.reject(new Error('Not connected'));
    }

    if (this.autoExpressions && window.face) {
      window.face.set('thinking', 30000);
    }

    return this._request('chat.send', {
      sessionKey: this.sessionKey,
      message: text,
      idempotencyKey: this._uuid(),
    });
  }

  // ── Internal ──

  _handleMessage(msg) {
    // Connect challenge
    if (msg.type === 'event' && msg.event === 'connect.challenge') {
      this._send({
        type: 'req',
        id: this._nextId(),
        method: 'connect',
        params: {
          minProtocol: this.protocolVersion,
          maxProtocol: this.protocolVersion,
          client: {
            id: this.clientId,
            version: '1.0.0',
            platform: 'browser',
            mode: 'webchat'
          },
          role: 'operator',
          scopes: ['operator.read', 'operator.write'],
          caps: [],
          commands: [],
          permissions: {},
          auth: { token: this.token },
          locale: this.locale,
          userAgent: 'clawd-face/1.0.0'
        }
      });
      return;
    }

    // Responses
    if (msg.type === 'res') {
      if (msg.ok && msg.payload?.type === 'hello-ok') {
        this._connected = true;
        this._reconnectDelay = 1000;
        console.log('[clawdbot] Connected ✓');
        if (this.onConnect) this.onConnect();
        return;
      }
      // Resolve pending requests
      const pending = this._pendingRequests[msg.id];
      if (pending) {
        if (msg.ok && msg.payload?.status === 'accepted') return; // wait for final
        delete this._pendingRequests[msg.id];
        if (msg.ok) pending.resolve(msg.payload);
        else pending.reject(new Error(msg.error?.message || 'error'));
      }
      return;
    }

    // Events
    if (msg.type === 'event') {
      if (msg.event === 'chat') this._handleChatEvent(msg.payload);
      if (msg.event === 'agent') this._handleAgentEvent(msg.payload);
    }
  }

  _handleChatEvent(payload) {
    if (!payload) return;
    if (payload.sessionKey && payload.sessionKey !== this.sessionKey) return;

    const text = this._extractText(payload.message);

    if (payload.state === 'delta') {
      if (this.autoExpressions && window.face) {
        const cur = window.face.current();
        if (cur === 'thinking') window.face.set('focused', 15000);
      }
      if (this.onDelta) this.onDelta(text, payload);
    }

    if (payload.state === 'final') {
      if (text) {
        // Auto expression from content
        if (this.autoExpressions && window.face) {
          const clean = text.replace(/MEDIA:\S+/g, '').trim();
          const expr = ClawdbotFace.inferExpression(clean);
          window.face.set(expr, Math.max(clean.length * 80, 5000));
        }
        // Auto subtitle
        if (window.face && window.face.subtitle) {
          let clean = text.replace(/MEDIA:\S+/g, '').trim();
          // Strip markdown formatting
          clean = clean
            .replace(/```[\s\S]*?```/g, '[code]')     // code blocks
            .replace(/`([^`]+)`/g, '$1')              // inline code
            .replace(/\*\*([^*]+)\*\*/g, '$1')        // bold **
            .replace(/__([^_]+)__/g, '$1')            // bold __
            .replace(/\*([^*]+)\*/g, '$1')            // italic *
            .replace(/_([^_]+)_/g, '$1')              // italic _
            .replace(/~~([^~]+)~~/g, '$1')            // strikethrough
            .replace(/^#{1,6}\s+/gm, '')              // headers
            .replace(/^\s*[-*+]\s+/gm, '• ')          // list items
            .replace(/^\s*\d+\.\s+/gm, '')            // numbered lists
            .replace(/^\s*>/gm, '')                   // blockquotes
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // links
            .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')   // images
            .replace(/\|/g, ' ')                      // table separators
            .replace(/\n{3,}/g, '\n\n')               // excessive newlines
            .trim();
          if (clean) window.face.subtitle(clean, Math.max(clean.length * 120, 8000));
        }
      }
      if (this.onMessage) this.onMessage(text, payload);
    }

    if (payload.state === 'error') {
      if (this.autoExpressions && window.face) {
        window.face.set('confused', 5000);
      }
      if (this.onError) this.onError(payload.errorMessage || 'Unknown error');
    }

    if (payload.state === 'aborted') {
      if (this.autoExpressions && window.face) {
        window.face.set('surprised', 3000);
      }
    }
  }

  _handleAgentEvent(payload) {
    if (!payload) return;
    if (!this.autoExpressions || !window.face) return;

    // Extract tool name - support multiple protocol versions:
    // v1: payload.toolCalls array (legacy)
    // v2: payload.state === 'toolUse' (legacy)
    // v3+: payload.stream === 'tool' with payload.data.name (current)
    let toolName = '';

    if (payload.stream === 'tool' && payload.data?.name) {
      // Current protocol (v3+): stream-based tool events
      toolName = payload.data.name;
    } else if (payload.toolCalls && Array.isArray(payload.toolCalls)) {
      // Legacy: toolCalls array
      toolName = payload.toolCalls.map(t => t.name || '').join(',');
    } else if (payload.state === 'toolUse') {
      // Legacy: state-based tool indicator
      toolName = payload.toolName || payload.name || 'unknown';
    } else {
      // No tool event detected
      return;
    }

    // Map tool names to expressions
    if (/web_search|web_fetch|search|fetch/i.test(toolName)) {
      window.face.set('investigating', 10000);
    } else if (/exec|bash|shell|command/i.test(toolName)) {
      window.face.set('working', 10000);
    } else if (/tts|speak|audio|voice/i.test(toolName)) {
      window.face.set('happy', 5000);
    } else if (/read|file|glob|grep/i.test(toolName)) {
      window.face.set('thinking', 8000);
    } else if (/write|edit|create/i.test(toolName)) {
      window.face.set('focused', 10000);
    } else {
      window.face.set('focused', 8000);
    }

    if (this.onToolUse) this.onToolUse(toolName, payload);
  }

  _extractText(message) {
    if (!message) return '';
    if (typeof message === 'string') return message;
    if (typeof message.text === 'string') return message.text;
    const content = message.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content
        .filter(b => b.type === 'text' && typeof b.text === 'string')
        .map(b => b.text)
        .join('\n');
    }
    return '';
  }

  _send(data) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(JSON.stringify(data));
    }
  }

  _request(method, params) {
    return new Promise((resolve, reject) => {
      const id = this._nextId();
      this._pendingRequests[id] = { resolve, reject };
      this._send({ type: 'req', id, method, params });
      // Timeout after 60s
      setTimeout(() => {
        if (this._pendingRequests[id]) {
          delete this._pendingRequests[id];
          reject(new Error('Request timeout'));
        }
      }, 60000);
    });
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) return;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this.connect();
      this._reconnectDelay = Math.min(this._reconnectDelay * 1.5, 15000);
    }, this._reconnectDelay);
  }

  _nextId() {
    return `cf-${++this._idCounter}-${Date.now()}`;
  }

  _uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ── Expression Inference ──

  /** Infer expression from response text */
  static inferExpression(text) {
    if (!text) return 'happy';
    if (/😂|🤣|哈哈|笑|haha|lol/i.test(text)) return 'amused';
    if (/❤|♥|愛|喜歡|love/i.test(text)) return 'love';
    if (/😮|!!|！！|wow|哇/i.test(text)) return 'surprised';
    if (/🤔|嗯|想想|不確定|hmm/i.test(text)) return 'thinking';
    if (/😢|😞|抱歉|sorry|難過|sad/i.test(text)) return 'sad';
    if (/⚠|警告|注意|alert/i.test(text)) return 'alert';
    if (/🎉|太好|成功|！|excited|棒/i.test(text)) return 'excited';
    if (/😎|cool|酷/i.test(text)) return 'cool';
    return 'happy';
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ClawdbotFace;
}
