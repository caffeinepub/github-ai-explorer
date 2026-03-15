#!/bin/bash
# GitHub AI Explorer - Local Bridge Server
# This script runs a lightweight HTTP server on your machine
# so the web terminal can execute real commands.

set -euo pipefail

PORT=${PORT:-7681}
HOST="127.0.0.1"

command_exists() { command -v "$1" &>/dev/null; }

if ! command_exists nc && ! command_exists ncat; then
  echo "[bridge] Warning: nc/ncat not found; using bash TCP fallback"
fi

echo "[bridge] Starting GitHub AI Explorer bridge on http://${HOST}:${PORT}"
echo "[bridge] Shell: $("$SHELL" --version 2>/dev/null | head -1 || echo $SHELL)"
echo "[bridge] Press Ctrl+C to stop."

# Require socat or netcat for raw HTTP — prefer Python if available
if command_exists python3; then
  exec python3 - <<'PYEOF'
import os, sys, json, subprocess, threading, http.server, urllib.parse

PORT = int(os.environ.get("PORT", 7681))
SHELL = os.environ.get("SHELL", "/bin/bash")

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # suppress default access log

    def send_cors(self, code=200, ctype="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        for k, v in CORS.items():
            self.send_header(k, v)
        self.end_headers()

    def do_OPTIONS(self):
        self.send_cors(204)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        qs = urllib.parse.parse_qs(parsed.query)

        if path == "/health":
            self.send_cors()
            self.wfile.write(json.dumps({"status": "ok", "shell": SHELL}).encode())

        elif path == "/stream":
            cmd = qs.get("command", [""])[0]
            if not cmd:
                self.send_cors(400)
                self.wfile.write(b'{"error":"no command"}')
                return
            self.send_cors(200, "text/event-stream")
            try:
                proc = subprocess.Popen(
                    cmd, shell=True, executable=SHELL,
                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                    text=True, bufsize=1
                )
                for line in iter(proc.stdout.readline, ""):
                    self.wfile.write(f"data: {line.rstrip()}\n".encode())
                    self.wfile.flush()
                proc.wait()
                self.wfile.write(f"exit: {proc.returncode}\n".encode())
                self.wfile.flush()
            except Exception as e:
                self.wfile.write(f"data: ERROR: {e}\n".encode())
                self.wfile.write(b"exit: 1\n")

        elif path == "/fs":
            dir_path = qs.get("path", [os.path.expanduser("~")])[0]
            try:
                entries = []
                for name in sorted(os.listdir(dir_path)):
                    full = os.path.join(dir_path, name)
                    st = os.stat(full)
                    entries.append({
                        "name": name,
                        "path": full,
                        "type": "directory" if os.path.isdir(full) else "file",
                        "size": st.st_size,
                        "modified": str(st.st_mtime),
                    })
                self.send_cors()
                self.wfile.write(json.dumps(entries).encode())
            except Exception as e:
                self.send_cors(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_cors(404)
            self.wfile.write(b'{"error":"not found"}')

    def do_POST(self):
        if self.path == "/execute":
            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length))
            cmd = body.get("command", "")
            if not cmd:
                self.send_cors(400)
                self.wfile.write(b'{"error":"no command"}')
                return
            try:
                result = subprocess.run(
                    cmd, shell=True, executable=SHELL,
                    capture_output=True, text=True, timeout=60
                )
                self.send_cors()
                self.wfile.write(json.dumps({
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "exitCode": result.returncode,
                }).encode())
            except subprocess.TimeoutExpired:
                self.send_cors(504)
                self.wfile.write(b'{"error":"timeout"}')
            except Exception as e:
                self.send_cors(500)
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_cors(404)
            self.wfile.write(b'{"error":"not found"}')

print(f"[bridge] Listening on http://127.0.0.1:{PORT}  (shell: {SHELL})")
httpd = http.server.HTTPServer(("127.0.0.1", PORT), Handler)
httpd.serve_forever()
PYEOF
elif command_exists node; then
  node - <<'JSEOF'
const http = require('http');
const { execFile } = require('child_process');
const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = parseInt(process.env.PORT || '7681', 10);
const SHELL = process.env.SHELL || '/bin/bash';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function sendJSON(res, code, obj, extra = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json', ...CORS, ...extra });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const p = parsed.pathname;

  if (req.method === 'OPTIONS') {
    res.writeHead(204, CORS); res.end(); return;
  }

  if (req.method === 'GET' && p === '/health') {
    sendJSON(res, 200, { status: 'ok', shell: SHELL }); return;
  }

  if (req.method === 'GET' && p === '/stream') {
    const cmd = parsed.query.command || '';
    if (!cmd) { sendJSON(res, 400, { error: 'no command' }); return; }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', ...CORS });
    const proc = spawn(SHELL, ['-c', cmd], { stdio: ['ignore', 'pipe', 'pipe'] });
    const onData = (d) => res.write('data: ' + d.toString().replace(/\n/g, '\ndata: ') + '\n');
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('close', (code) => { res.write('exit: ' + (code || 0) + '\n'); res.end(); });
    req.on('close', () => proc.kill());
    return;
  }

  if (req.method === 'GET' && p === '/fs') {
    const dir = parsed.query.path || require('os').homedir();
    try {
      const entries = fs.readdirSync(dir).sort().map(name => {
        const full = path.join(dir, name);
        const st = fs.statSync(full);
        return { name, path: full, type: st.isDirectory() ? 'directory' : 'file', size: st.size, modified: String(st.mtimeMs) };
      });
      sendJSON(res, 200, entries); return;
    } catch (e) { sendJSON(res, 500, { error: String(e) }); return; }
  }

  if (req.method === 'POST' && p === '/execute') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      let cmd;
      try { cmd = JSON.parse(body).command; } catch { sendJSON(res, 400, { error: 'bad json' }); return; }
      if (!cmd) { sendJSON(res, 400, { error: 'no command' }); return; }
      const r = spawnSync(SHELL, ['-c', cmd], { encoding: 'utf8', timeout: 60000 });
      sendJSON(res, 200, { stdout: r.stdout || '', stderr: r.stderr || '', exitCode: r.status || 0 });
    });
    return;
  }

  sendJSON(res, 404, { error: 'not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[bridge] Listening on http://127.0.0.1:${PORT}  (shell: ${SHELL})`);
});
JSEOF
else
  echo "[bridge] ERROR: Neither python3 nor node found. Please install one and try again."
  exit 1
fi
