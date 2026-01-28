/**
 * Clawd Face — Express Server for Voice Features
 *
 * Provides:
 * - SSE for real-time expression push
 * - TTS via OpenAI API
 * - Speech-to-text via Whisper API
 * - Static file serving
 *
 * Usage:
 *   OPENAI_API_KEY=sk-xxx node server.js
 *
 * Or create a .env file:
 *   OPENAI_API_KEY=sk-xxx
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ── Configuration ──
const PORT = process.env.PORT || 3737;
const HTTPS_PORT = process.env.HTTPS_PORT || 3738;
const HOST = process.env.HOST || '0.0.0.0';
const DIR = __dirname;

// Load .env file if present
const envPath = path.join(DIR, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && !process.env[key]) {
      process.env[key.trim()] = val.join('=').trim();
    }
  });
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// ── SSE clients for expression push ──
const sseClients = new Set();

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.webm': 'audio/webm',
  '.m4a': 'audio/mp4',
  '.aiff': 'audio/aiff',
};

function handleRequest(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const url = req.url.split('?')[0];

  // ── SSE: GET /expression-stream ──
  if (req.method === 'GET' && url === '/expression-stream') {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const sessionKey = params.get('sessionKey') || '__default__';

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    res.write(':\n\n'); // SSE comment to establish connection

    res._sessionKey = sessionKey;
    sseClients.add(res);
    console.log(`[sse] + ${sessionKey} (${sseClients.size} clients)`);

    req.on('close', () => {
      sseClients.delete(res);
      console.log(`[sse] - ${sessionKey} (${sseClients.size} clients)`);
    });
    return;
  }

  // ── POST /expression ──
  if (req.method === 'POST' && url === '/expression') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const ts = Date.now();
        const targetSession = data.sessionKey;
        const state = { ...data, ts };
        delete state.sessionKey;

        // Write to state.json for polling fallback
        fs.writeFileSync(path.join(DIR, 'state.json'), JSON.stringify(state));

        // Push to SSE clients
        const event = `data: ${JSON.stringify(state)}\n\n`;
        let sent = 0;
        for (const client of sseClients) {
          if (targetSession && client._sessionKey !== targetSession) continue;
          try {
            client.write(event);
            sent++;
          } catch {
            sseClients.delete(client);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, ts, sent }));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── POST /speak — Text-to-Speech via OpenAI ──
  if (req.method === 'POST' && url === '/speak') {
    if (!OPENAI_API_KEY) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }));
    }

    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { text, voice } = JSON.parse(body);
        if (!text?.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'missing text' }));
        }

        const resp = await fetch('https://api.openai.com/v1/audio/speech', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'tts-1',
            voice: voice || 'onyx',
            input: text.trim().slice(0, 4096),
          }),
        });

        if (!resp.ok) {
          const err = await resp.text();
          res.writeHead(502, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: err }));
        }

        const arrayBuf = await resp.arrayBuffer();
        res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
        res.end(Buffer.from(arrayBuf));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── POST /transcribe — Speech-to-Text via Whisper ──
  if (req.method === 'POST' && url === '/transcribe') {
    if (!OPENAI_API_KEY) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }));
    }

    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const audioData = Buffer.concat(chunks);
        const tmpDir = path.join(DIR, 'tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

        const tmpFile = path.join(tmpDir, `rec-${Date.now()}.webm`);
        const mp3File = tmpFile.replace('.webm', '.mp3');
        fs.writeFileSync(tmpFile, audioData);

        // Convert to MP3 (ffmpeg required)
        try {
          execSync(`ffmpeg -y -i "${tmpFile}" -ar 16000 -ac 1 "${mp3File}" 2>/dev/null`);
        } catch {
          // Fallback: try using the file as-is
          fs.copyFileSync(tmpFile, mp3File);
        }

        // Build multipart form data
        const boundary = '----FormBoundary' + Date.now();
        const mp3Data = fs.readFileSync(mp3File);
        const parts = [
          `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nwhisper-1\r\n`,
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.mp3"\r\nContent-Type: audio/mpeg\r\n\r\n`,
        ];
        const bodyBuf = Buffer.concat([
          Buffer.from(parts[0]),
          Buffer.from(parts[1]),
          mp3Data,
          Buffer.from(`\r\n--${boundary}--\r\n`),
        ]);

        const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
          },
          body: bodyBuf,
        });

        const result = await resp.json();

        // Cleanup
        try { fs.unlinkSync(tmpFile); } catch {}
        try { fs.unlinkSync(mp3File); } catch {}

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ text: result.text || '' }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // ── POST /clear-played — Clear subtitle/audio from state ──
  if (req.method === 'POST' && url === '/clear-played') {
    const stateFile = path.join(DIR, 'state.json');
    try {
      if (fs.existsSync(stateFile)) {
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        delete state.subtitle;
        delete state.audioFile;
        fs.writeFileSync(stateFile, JSON.stringify(state));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end('{"ok":true}');
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // ── GET /media-proxy — Serve local audio files ──
  if (req.method === 'GET' && url === '/media-proxy') {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const filePath = params.get('file');

    if (!filePath) {
      res.writeHead(400);
      return res.end('missing file param');
    }

    // Security: only allow audio extensions
    const allowed = ['.mp3', '.wav', '.ogg', '.webm', '.m4a', '.aiff'];
    const ext = path.extname(filePath).toLowerCase();
    if (!allowed.includes(ext)) {
      res.writeHead(403);
      return res.end('forbidden file type');
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end('not found');
      }
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'audio/mpeg' });
      res.end(data);
    });
    return;
  }

  // ── GET /health — Health check ──
  if (req.method === 'GET' && url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      ok: true,
      sseClients: sseClients.size,
      hasOpenAI: !!OPENAI_API_KEY,
    }));
  }

  // ── Static files ──
  let filePath = path.join(DIR, url === '/' ? 'index.html' : url);

  // Security: prevent directory traversal
  if (!filePath.startsWith(DIR)) {
    res.writeHead(403);
    return res.end('forbidden');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('not found');
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

// ── Start HTTP server ──
http.createServer(handleRequest).listen(PORT, HOST, () => {
  console.log(`Clawd Face server running:`);
  console.log(`  HTTP:  http://${HOST}:${PORT}`);
  console.log(`  OpenAI: ${OPENAI_API_KEY ? 'configured' : 'not configured (TTS/STT disabled)'}`);
});

// ── Start HTTPS server (optional, for iOS mic access) ──
const certDir = path.join(DIR, 'certs');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  const sslOpts = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
  };
  https.createServer(sslOpts, handleRequest).listen(HTTPS_PORT, HOST, () => {
    console.log(`  HTTPS: https://${HOST}:${HTTPS_PORT}`);
  });
} else {
  console.log(`  HTTPS: disabled (no certs in ${certDir})`);
  console.log(`         Generate with: npm run gen-certs`);
}
