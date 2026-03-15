#!/usr/bin/env python3
"""
GitHub AI Explorer - Local Bridge Server (Python)
Run this script to allow the web terminal to execute real commands on your machine.

Usage:
  python3 bridge-server.py          # default port 7681
  PORT=7682 python3 bridge-server.py
"""

import os
import sys
import json
import subprocess
import urllib.parse
import http.server

PORT = int(os.environ.get("PORT", 7681))
SHELL = os.environ.get("SHELL", "/bin/bash")

# On Windows fall back to cmd
if sys.platform == "win32":
    SHELL = os.environ.get("COMSPEC", "cmd.exe")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


class BridgeHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # suppress noisy access log

    def _send(self, code=200, ctype="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        for k, v in CORS_HEADERS.items():
            self.send_header(k, v)
        self.end_headers()

    def do_OPTIONS(self):
        self._send(204)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)

        if parsed.path == "/health":
            self._send()
            self.wfile.write(json.dumps({"status": "ok", "shell": SHELL}).encode())

        elif parsed.path == "/stream":
            cmd = qs.get("command", [""])[0]
            if not cmd:
                self._send(400)
                self.wfile.write(b'{"error":"no command"}')
                return
            self._send(200, "text/event-stream")
            try:
                use_shell_flag = sys.platform == "win32"
                executable = None if use_shell_flag else SHELL
                proc = subprocess.Popen(
                    cmd,
                    shell=True,
                    executable=executable,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                )
                for line in iter(proc.stdout.readline, ""):
                    self.wfile.write(f"data: {line.rstrip()}\n".encode())
                    self.wfile.flush()
                proc.wait()
                self.wfile.write(f"exit: {proc.returncode}\n".encode())
                self.wfile.flush()
            except Exception as exc:
                self.wfile.write(f"data: ERROR: {exc}\n".encode())
                self.wfile.write(b"exit: 1\n")

        elif parsed.path == "/fs":
            dir_path = qs.get("path", [os.path.expanduser("~")])[0]
            try:
                entries = []
                for name in sorted(os.listdir(dir_path)):
                    full = os.path.join(dir_path, name)
                    try:
                        st = os.stat(full)
                        entries.append({
                            "name": name,
                            "path": full,
                            "type": "directory" if os.path.isdir(full) else "file",
                            "size": st.st_size,
                            "modified": str(st.st_mtime),
                        })
                    except PermissionError:
                        pass
                self._send()
                self.wfile.write(json.dumps(entries).encode())
            except Exception as exc:
                self._send(500)
                self.wfile.write(json.dumps({"error": str(exc)}).encode())

        else:
            self._send(404)
            self.wfile.write(b'{"error":"not found"}')

    def do_POST(self):
        if self.path == "/execute":
            length = int(self.headers.get("Content-Length", 0))
            try:
                body = json.loads(self.rfile.read(length))
            except json.JSONDecodeError:
                self._send(400)
                self.wfile.write(b'{"error":"bad json"}')
                return
            cmd = body.get("command", "")
            if not cmd:
                self._send(400)
                self.wfile.write(b'{"error":"no command"}')
                return
            try:
                use_shell_flag = sys.platform == "win32"
                executable = None if use_shell_flag else SHELL
                result = subprocess.run(
                    cmd,
                    shell=True,
                    executable=executable,
                    capture_output=True,
                    text=True,
                    timeout=60,
                )
                self._send()
                self.wfile.write(
                    json.dumps({
                        "stdout": result.stdout,
                        "stderr": result.stderr,
                        "exitCode": result.returncode,
                    }).encode()
                )
            except subprocess.TimeoutExpired:
                self._send(504)
                self.wfile.write(b'{"error":"timeout"}')
            except Exception as exc:
                self._send(500)
                self.wfile.write(json.dumps({"error": str(exc)}).encode())
        else:
            self._send(404)
            self.wfile.write(b'{"error":"not found"}')


if __name__ == "__main__":
    print(f"[bridge] GitHub AI Explorer bridge server")
    print(f"[bridge] Listening on http://127.0.0.1:{PORT}")
    print(f"[bridge] Shell: {SHELL}")
    print("[bridge] Press Ctrl+C to stop.")
    server = http.server.HTTPServer(("127.0.0.1", PORT), BridgeHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[bridge] Stopped.")
