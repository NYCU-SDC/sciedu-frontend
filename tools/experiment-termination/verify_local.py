#!/usr/bin/env python3
"""Exercise archive/transfer with real local API sessions. Never resets data.

Creates uniquely named QA courses/experiments, archives only those experiments,
and records HTTP evidence without cookies or authorization headers.
"""
import argparse
import http.cookiejar
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
import urllib.error
import urllib.request
import uuid

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--api-base', required=True, choices=['http://localhost:58080'])
parser.add_argument('--admin-session', required=True, type=Path)
parser.add_argument('--student-session', required=True, type=Path)
parser.add_argument('--student-id', required=True)
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args()
trace, checks, experiments = [], [], []
run_id = 'ARCHIVE-QA-' + uuid.uuid4().hex[:10]

class Client:
    def __init__(self, role, path):
        self.role = role
        jar = http.cookiejar.CookieJar()
        for c in json.loads(path.read_text())['cookies']:
            jar.set_cookie(http.cookiejar.Cookie(0, c['name'], c['value'], None, False,
                'localhost.local', False, False, c['path'], True, False,
                int(c['expires']), False, None, None, {'HttpOnly': None}))
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

    def request(self, method, path, body=None, expected=200):
        req = urllib.request.Request(args.api_base + path,
            data=json.dumps(body).encode() if body is not None else None,
            headers={'Content-Type': 'application/json', 'Origin': 'http://localhost:5173'}, method=method)
        try:
            response = self.opener.open(req, timeout=20)
        except urllib.error.HTTPError as error:
            response = error
        raw = response.read()
        data = json.loads(raw) if raw else None
        if path not in ['/api/auth/session', '/api/users/me']:
            trace.append(dict(role=self.role, method=method, path=path, status=response.status,
                              request=body, response=data))
        assert response.status == expected, f'{method} {path}: expected {expected}, got {response.status}'
        return data

admin = Client('admin', args.admin_session)
student = Client('student', args.student_session)
config = dict(maxAttempts=1, allowRetry=False, showScore=True, showExplanations=False,
              gradingMode='AUTOMATIC', correctAnswerReleaseMode='NEVER')
now = datetime.now(timezone.utc)

def make_experiment(label):
    item = admin.request('POST', '/api/experiments', dict(name=f'{run_id} {label}',
        description='Dedicated local archive acceptance fixture',
        scheduledStartAt=(now-timedelta(hours=1)).isoformat(),
        scheduledEndAt=(now+timedelta(hours=2)).isoformat(), configuration=config), 201)
    experiments.append(item)
    return '/api/experiments/' + item['id']

def archive(path):
    record = admin.request('PUT', path+'/status', {'status':'ARCHIVED'})
    assert record['status'] == 'ARCHIVED'
    return record

try:
    admin.request('GET', '/api/users/me')
    student.request('GET', '/api/auth/session')
    # This account must be a dedicated fixture. Stop if it has a current experiment.
    student.request('GET', '/api/experiments/current', expected=404)
    course = admin.request('POST', '/api/courses', dict(code=run_id, title=run_id), 201)
    question = admin.request('POST', '/api/questions', dict(type='TEXT', content='QA：請輸入測試答案'), 201)
    page = admin.request('POST', f"/api/courses/{course['id']}/pages", dict(title='QA', displayOrder=0), 201)
    admin.request('POST', f"/api/pages/{page['id']}/blocks",
        dict(type='QUESTION', resourceId=question['id'], displayOrder=0, required=True), 201)
    admin.request('PUT', f"/api/courses/{course['id']}/status", {'status':'PUBLISHED'})
    old, new = make_experiment('ACTIVE old'), make_experiment('ACTIVE next')
    for path in [old, new]:
        admin.request('POST', path+'/courses', {'courseIds':[course['id']]})
    admin.request('POST', old+'/participants', {'userIds':[args.student_id]})
    admin.request('PUT', old+'/status', {'status':'ACTIVE'})
    before = admin.request('GET', old)
    participants = admin.request('GET', old+'/participants')
    courses = admin.request('GET', old+'/courses')
    student.request('PUT', old+'/status', {'status':'ARCHIVED'}, 403)
    answer = student.request('POST', f"/api/questions/{question['id']}/answers", {'textAnswer':'Archive QA retained answer'}, 201)
    answers = admin.request('GET', f"/api/questions/{question['id']}/answers?experimentId={old.rsplit('/',1)[1]}")
    admin.request('POST', new+'/participants', {'userIds':[args.student_id]}, 409)
    after = archive(old)
    for field in ['scheduledStartAt','scheduledEndAt','participantCount','courseCount','configuration']:
        assert after[field] == before[field], field
    assert admin.request('GET', old+'/participants') == participants
    assert admin.request('GET', old+'/courses') == courses
    assert admin.request('GET', f"/api/questions/{question['id']}/answers?experimentId={old.rsplit('/',1)[1]}") == answers
    student.request('GET', '/api/experiments/current', expected=404)
    student.request('GET', f"/api/courses/{course['id']}", expected=403)
    admin.request('POST', new+'/participants', {'userIds':[args.student_id]})
    admin.request('PUT', new+'/status', {'status':'ACTIVE'})
    current = student.request('GET', '/api/experiments/current')
    assert current['experiment']['id'] == new.rsplit('/',1)[1]
    student.request('GET', f"/api/courses/{course['id']}")
    checks.append(dict(name='ACTIVE archive releases overlap; preserves schedule, assignments, answer; student transfers', status='PASS', answerId=answer['id']))
    archive(new)
    for status in ['DRAFT','SCHEDULED','COMPLETED']:
        old, new = make_experiment(status+' old'), make_experiment(status+' next')
        admin.request('POST', old+'/participants', {'userIds':[args.student_id]})
        if status != 'DRAFT':
            admin.request('PUT', old+'/status', {'status':status})
        admin.request('POST', new+'/participants', {'userIds':[args.student_id]}, 409)
        archive(old)
        admin.request('POST', new+'/participants', {'userIds':[args.student_id]})
        archive(new)
        checks.append(dict(name=status+' archive releases overlap', status='PASS'))
except Exception as error:
    checks.append(dict(name='acceptance', status='FAIL', detail=str(error)))
    raise
finally:
    # Never delete: retain created fixtures for inspection. Archive only this run's IDs.
    for record in experiments:
        try:
            archive('/api/experiments/'+record['id'])
        except Exception:
            checks.append(dict(name='cleanup '+record['id'], status='FAIL'))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(dict(runId=run_id, apiBase=args.api_base,
        createdAt=now.isoformat(), checks=checks, http=trace), ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(checks, ensure_ascii=False))
