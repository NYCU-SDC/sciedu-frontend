"""Loopback-only integration fixture for the actual application routes. No remote API or credentials.
Run Vite on 5178 with VITE_BACKEND_BASE_URL=http://localhost:3003, then run this script.
Evidence: GET /fixture/evidence. All answers/chats are synthetic and in-memory.
"""
import argparse
import json
import mimetypes
import threading
import uuid
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--port', type=int, default=3003)
parser.add_argument('--vite-port', type=int, default=5178)
parser.add_argument('--standard', action='store_true')
args = parser.parse_args()
now = datetime.now(timezone.utc).isoformat()
RESOURCES = {}; MEDIA = {}; CHATS = {}; ANSWERS = {}; EVIDENCE = []; LOCK = threading.RLock()
user = dict(id='local-user', name='教材測試者',email='tester@example.test',roles=['ADMIN','STUDENT'],createdAt=now,updatedAt=now)
experiment = dict(id='local-experiment',name='CCM 與科學論證測試',description='僅限本機驗收，不連線正式服務。'+('' if args.standard else '\n\n<!-- sciedu-experience:v1:practice -->'),status='ACTIVE',scheduledStartAt='2020-01-01T00:00:00Z',scheduledEndAt='2100-01-01T00:00:00Z',configuration=dict(maxAttempts=1,allowRetry=False,showScore=True,showExplanations=False,gradingMode='AUTOMATIC',correctAnswerReleaseMode='NEVER'),createdBy=user['id'],createdAt=now,updatedAt=now,participantCount=1,courseCount=2)
courses=[]
for n, folder in enumerate(['ccm','argumentation'],1):
    manifest=json.loads((ROOT/'tools'/folder/'manifest.json').read_text())
    cid=f'10000000-0000-4000-8000-{n:012}'
    course=dict(id=cid,code=manifest['code'],title=manifest['title'],status='PUBLISHED',description='本機測試教材',createdAt=now,updatedAt=now)
    courses.append(course);RESOURCES[f'/api/courses/{cid}']=course;pages=[]
    for i,page in enumerate(manifest['pages']):
        pid=f'{folder}-{i}';blocks=[]
        def text(name,content,order):
            rid=f'{pid}-{name}';RESOURCES[f'/api/content/text/{rid}']=dict(id=rid,type='TEXT',content=content)
            blocks.append(dict(id=rid+'-block',pageId=pid,type='TEXT',resourceId=rid,displayOrder=order,required=False))
        text('body',page['description'],0);text('context',page['imageDescriptionForLLM'],200);text('presentation',json.dumps(page['presentation']),201)
        for j,img in enumerate(page['images']):
            rid=f'{pid}-image-{j}'
            MEDIA[f'/api/content/media/{rid}']=ROOT/'tools'/folder/img['file']
            blocks.append(dict(id=rid+'-block',pageId=pid,type='MEDIA',resourceId=rid,displayOrder=10+j*10,required=False))
        for j,q in enumerate(page['questions']):
            qid=f'{pid}-question-{j}';text(f'title-{j}',q['label'],100+j*10)
            RESOURCES[f'/api/questions/{qid}']=dict(id=qid,type='TEXT',content=q['prompt'],options=[])
            blocks.append(dict(id=qid+'-block',pageId=pid,type='QUESTION',resourceId=qid,displayOrder=101+j*10,required=True))
        detail=dict(id=pid,courseId=cid,title=page['title'],displayOrder=i,blocks=blocks)
        pages.append({k:v for k,v in detail.items() if k!='blocks'});RESOURCES[f'/api/pages/{pid}']=detail
    RESOURCES[f'/api/courses/{cid}/pages']=pages
RESOURCES['/api/users/me']=user
RESOURCES['/api/auth/session']=dict(username=user['name'],email=user['email'],accessTokenExpiresAt='2100-01-01T00:00:00Z')
RESOURCES['/api/experiments/current']=dict(experiment=experiment,courses=courses)
RESOURCES['/api/experiments/local-experiment']=experiment
RESOURCES['/api/experiments/local-experiment/courses']=[dict(course=c,linkedAt=now) for c in courses]
RESOURCES['/api/experiments/local-experiment/participants']=[dict(participant=user,assignedAt=now)]
ended={**experiment,'id':'ended-experiment','name':'已到期的測試實驗','scheduledStartAt':'2020-01-01T00:00:00Z','scheduledEndAt':'2021-01-01T00:00:00Z'}
RESOURCES['/api/experiments/ended-experiment']=ended
class Handler(BaseHTTPRequestHandler):
    def log_message(self,*args): pass
    def send(self,data,status=200,content_type='application/json'):
        self.send_response(status);self.send_header('Content-Type',content_type);self.send_header('Cache-Control','no-store');self.end_headers()
        self.wfile.write(data if isinstance(data,bytes) else json.dumps(data,ensure_ascii=False).encode())
    def handle_request(self,method):
        if self.headers.get('Host') not in [f'localhost:{args.port}',f'127.0.0.1:{args.port}']:self.send({},403);return
        path=urlsplit(self.path).path
        if method=='POST' and self.headers.get('Origin')!=f'http://localhost:{args.port}':self.send({},403);return
        if path.startswith('/api/'):
            EVIDENCE.append(dict(method=method,path=path))
        if method=='GET' and path=='/fixture/evidence':self.send(EVIDENCE);return
        if method=='GET' and path in MEDIA:
            file=MEDIA[path];self.send(file.read_bytes(),content_type=mimetypes.guess_type(file)[0]);return
        def paginated(items):return dict(items=items,totalPages=1,currentPage=1,totalItems=len(items),pageSize=100,hasNextPage=False)
        if method=='GET' and path=='/api/experiments':self.send(paginated([experiment,ended]));return
        if method=='GET' and path in RESOURCES:
            value=RESOURCES[path];self.send(paginated(value) if path.endswith(('/participants','/courses')) else value);return
        if method=='GET' and path=='/api/chat':self.send(paginated(list(CHATS.values())));return
        if method=='POST' and path=='/api/chat':
            cid=str(uuid.uuid4());CHATS[cid]=dict(id=cid,title='',createdAt=now,updatedAt=now,messages=[]);self.send(dict(chatID=cid),201);return
        if method=='GET' and path.startswith('/api/chat/stream/'):
            mid=path.rsplit('/',1)[1];m=next((m for c in CHATS.values() for m in c['messages'] if m['id']==mid),None)
            if not m:self.send({},404);return
            self.send(('data: '+json.dumps(dict(delta=m['content'],isFinished=False),ensure_ascii=False)+'\n\ndata: {"delta":"","isFinished":true}\n\n').encode(),content_type='text/event-stream');return
        if path.startswith('/api/chat/'):
            cid=path.rsplit('/',1)[1];c=CHATS.get(cid)
            if not c:self.send({},404);return
            if method=='GET':self.send(c);return
            body=json.loads(self.rfile.read(int(self.headers.get('Content-Length','0'))))
            EVIDENCE[-1]['body']=body
            if set(body)-{'content','previousID','preset'}:self.send({},400);return
            u=dict(id=str(uuid.uuid4()),role='user',content=body['content'],previousID=body.get('previousID'),createdAt=now,status='completed')
            r=dict(id=str(uuid.uuid4()),role='assistant',content='【本機測試替身】已收到本輪教材、答案及模擬設定。',previousID=u['id'],createdAt=now,status='completed')
            c['messages'].extend([u,r]);c['title']=u['content'][:40];self.send(dict(message=u,replyMessageID=r['id']),201);return
        if path.startswith('/api/questions/') and method=='POST' and path.endswith('/answers'):
            qid=path.split('/')[3]
            if qid in ANSWERS:self.send(dict(detail='already submitted'),409);return
            body=json.loads(self.rfile.read(int(self.headers.get('Content-Length','0'))));a=dict(id=str(uuid.uuid4()),questionId=qid,experimentId=experiment['id'],userId=user['id'],createdAt=now,**body);ANSWERS[qid]=a;self.send(a,201);return
        if path.endswith('/result'):
            self.send(dict(answerId=path.split('/')[-2],questionId=path.split('/')[3],status='PENDING',resultVisible=False));return
        if path.startswith('/api/'):self.send(dict(detail='Unsupported fixture endpoint'),404);return
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{args.vite_port}'+self.path,timeout=15) as r:self.send(r.read(),content_type=r.headers.get('Content-Type','text/plain'))
        except Exception:self.send(dict(detail='Start Vite on the configured loopback port'),502)
    def do_GET(self):
        with LOCK:self.handle_request('GET')
    def do_POST(self):
        with LOCK:self.handle_request('POST')
if __name__=='__main__':ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
