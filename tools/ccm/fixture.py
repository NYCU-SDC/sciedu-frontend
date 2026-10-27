"""Local-only browser acceptance fixture, never forwarded to dev."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / 'manifest.json').read_text())
COURSE = dict(id='preview', code=manifest['code'], title=manifest['title'], status='DRAFT')
RESOURCES = {'/api/courses/preview': COURSE}
pages = []
for i, page in enumerate(manifest['pages']):
    pid = f'preview-page-{i}'
    blocks = []
    def text(name, content, order):
        rid = f'{pid}-{name}'
        RESOURCES[f'/api/content/text/{rid}'] = dict(id=rid, type='TEXT', content=content)
        blocks.append(dict(id=rid+'-block', pageId=pid, type='TEXT', resourceId=rid, displayOrder=order, required=False))
    text('description', page['description'], 0)
    text('context', page['imageDescriptionForLLM'], 200)
    text('presentation', json.dumps(page['presentation']), 201)
    for j, _ in enumerate(page['images']): blocks.append(dict(id=f'{pid}-image-{j}',pageId=pid,type='MEDIA',resourceId='preview-image',displayOrder=10+j*10,required=False))
    for j, q in enumerate(page['questions']):
        qid = f'{pid}-question-{j}'
        text(f'title-{j}', q['label'], 100+j*10)
        RESOURCES[f'/api/questions/{qid}'] = dict(id=qid,type='TEXT',content=q['prompt'],options=[])
        blocks.append(dict(id=qid+'-block',pageId=pid,type='QUESTION',resourceId=qid,displayOrder=101+j*10,required=True))
    detail=dict(id=pid,courseId='preview',title=page['title'],displayOrder=i,blocks=blocks)
    pages.append({k:v for k,v in detail.items() if k!='blocks'})
    RESOURCES[f'/api/pages/{pid}'] = detail
RESOURCES['/api/courses/preview/pages'] = pages
