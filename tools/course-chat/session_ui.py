"""Private loopback session handoff. Uses IssueSession output; no browser token extraction."""
from http.server import BaseHTTPRequestHandler,HTTPServer
from pathlib import Path
import json,os
ROOT=Path(os.environ["COURSE_CHAT_WORKSPACE"]).resolve()
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.end_headers()
        self.wfile.write(('''<!doctype html><html lang="zh-Hant"><title>教材 Chat 本機驗收</title><h1>教材 Chat 本機驗收</h1><p>獨立資料庫、真實 session；模型為可重複的測試替身。僅供本機驗收。</p>'''+''.join(f'<form method="post" action="/{role}"><button>{role}</button></form>' for role in ['admin','student-a','student-b','outsider'])).encode())
    def do_POST(self):
        if self.headers.get('Origin')!='http://127.0.0.1:5188':self.send_error(403);return
        role=self.path.strip('/')
        if role not in ['admin','student-a','student-b','outsider']:self.send_error(404);return
        cookies=json.loads((ROOT/'.runtime'/f'{role}.json').read_text())
        fixture=json.loads((ROOT/'.runtime/fixture.json').read_text())
        self.send_response(303)
        for c in cookies:self.send_header('Set-Cookie',f'{c["name"]}={c["value"]}; Path={c["path"]}; HttpOnly; SameSite=Lax')
        target='/admin/experiments/'+fixture['experimentId'] if role=='admin' else '/course/'+fixture['courseId']
        self.send_header('Location','http://127.0.0.1:5187'+target);self.end_headers()
    def log_message(self,*args):pass
HTTPServer(('127.0.0.1',5188),Handler).serve_forever()
