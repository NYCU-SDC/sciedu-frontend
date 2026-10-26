"""In-memory Chat API substitute for frontend browser checks. No model, credentials or upstream calls."""
import json
import threading
import uuid
from datetime import datetime, timezone

CHATS = {}
REQUESTS = []
LOCK = threading.Lock()


def handle(handler, method, path):
    if not (path.startswith('/api/chat') or path == '/fixture/chat-evidence'):
        return False
    with LOCK:
        if method == 'GET' and path == '/fixture/chat-evidence':
            handler.send(json.dumps(REQUESTS, ensure_ascii=False).encode())
            return True
        if method == 'POST' and path == '/api/chat':
            cid = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            CHATS[cid] = dict(id=cid, title='', createdAt=now, updatedAt=now, messages=[])
            handler.send(json.dumps(dict(chatID=cid)).encode(), status=201)
            return True
        if path.startswith('/api/chat/stream/') and method == 'GET':
            mid = path.rsplit('/', 1)[1]
            message = next((m for c in CHATS.values() for m in c['messages'] if m['id'] == mid), None)
            if not message:
                handler.send_error(404)
                return True
            # Legacy streaming is still supported by the deployed API contract.
            events = [dict(delta=message['content'], isFinished=False), dict(delta='', isFinished=True)]
            handler.send(''.join('data: ' + json.dumps(e, ensure_ascii=False) + '\n\n' for e in events).encode(), 'text/event-stream')
            return True
        if path == '/api/chat' and method == 'GET':
            handler.send(json.dumps(dict(items=list(CHATS.values()), totalPages=1,totalItems=len(CHATS),currentPage=1,pageSize=20,hasNextPage=False), ensure_ascii=False).encode())
            return True
        cid = path.rsplit('/', 1)[1]
        chat = CHATS.get(cid)
        if not chat:
            handler.send_error(404)
            return True
        if method == 'GET':
            handler.send(json.dumps(chat, ensure_ascii=False).encode())
            return True
        if method != 'POST':
            handler.send_error(405)
            return True
        body = json.loads(handler.rfile.read(int(handler.headers.get('Content-Length', '0'))))
        if set(body) - {'content', 'previousID', 'preset'} or body.get('preset') != 'augmentation_teacher_and_peer':
            handler.send_error(400, 'Unexpected API fields or preset')
            return True
        REQUESTS.append(dict(chatID=cid, **body))
        now = datetime.now(timezone.utc).isoformat()
        user = dict(id=str(uuid.uuid4()), role='user', content=body['content'], createdAt=now, status='completed')
        if body.get('previousID'):
            user['previousID'] = body['previousID']
        reply = dict(id=str(uuid.uuid4()), role='assistant', content='【本機測試替身】已收到教材快照。請說明你的主張，以及支持主張的觀察。', previousID=user['id'], createdAt=now,status='completed')
        chat['messages'].extend([user, reply])
        chat['title'] = body['content'][:40]
        handler.send(json.dumps(dict(message=user,replyMessageID=reply['id']),ensure_ascii=False).encode(), status=201)
        return True
