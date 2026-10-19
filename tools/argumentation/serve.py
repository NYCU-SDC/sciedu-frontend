"""Loopback-only uploader. Keep --state outside the repository. Cookies stay in browser.
Usage: python3 tools/argumentation/serve.py --state /absolute/private/state.json
Optional Vite preview forwarded from port 5175. No dev API proxy or credential storage.
"""
import argparse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
import json
import mimetypes
import os
import urllib.request
import urllib.error
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--fixture', action='store_true', help='Enable local synthetic course API for browser acceptance only')
parser.add_argument('--state', type=Path, required=True)
args = parser.parse_args()
STATE = args.state.resolve()
STATE.parent.mkdir(parents=True, exist_ok=True)

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args): pass
    def valid_host(self): return self.headers.get('Host') in ['localhost:3000', '127.0.0.1:3000']
    def send(self, raw, content_type='application/json'):
        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(raw)
    def do_GET(self):
        if not self.valid_host(): self.send_error(403); return
        path = urlsplit(self.path).path
        if args.fixture:
            from fixture import RESOURCES
            if path in RESOURCES: self.send(json.dumps(RESOURCES[path], ensure_ascii=False).encode()); return
            if path == '/api/content/media/preview-image': self.send((ROOT/'assets/preview.jpeg').read_bytes(), 'image/jpeg'); return
        if path == '/state.json': self.send(STATE.read_bytes() if STATE.exists() else b'null'); return
        if path in ['/', '/index.html', '/upload.js', '/manifest.json', '/assets/preview.jpeg']:
            p = ROOT / (path.lstrip('/') or 'index.html')
            self.send(p.read_bytes(), mimetypes.guess_type(p)[0] or 'application/octet-stream'); return
        try:
            with urllib.request.urlopen('http://127.0.0.1:5175' + self.path, timeout=15) as response:
                self.send(response.read(), response.headers.get('Content-Type', 'text/plain'))
        except urllib.error.URLError: self.send_error(502, 'Start the local Vite preview on port 5175')
    def do_POST(self):
        if args.fixture and self.valid_host() and self.path.startswith('/api/questions/preview-page-') and self.path.endswith('/answers'):
            from datetime import datetime, timezone
            body=json.loads(self.rfile.read(int(self.headers.get('Content-Length', '0'))))
            qid=self.path.split('/')[3]
            self.send(json.dumps(dict(id='answer-'+qid, questionId=qid, experimentId='local-preview', userId='local-preview', createdAt=datetime.now(timezone.utc).isoformat(), **body)).encode()); return
        if not self.valid_host() or self.path != '/state.json' or self.headers.get('Origin') != 'http://localhost:3000': self.send_error(403); return
        size = int(self.headers.get('Content-Length', '0'))
        if size > 5000000: self.send_error(413); return
        data = json.loads(self.rfile.read(size))
        temp = STATE.with_suffix('.tmp')
        with temp.open('w') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush(); os.fsync(f.fileno())
        temp.replace(STATE)
        self.send(b'{}')

if __name__ == '__main__': ThreadingHTTPServer(('127.0.0.1', 3000), Handler).serve_forever()
