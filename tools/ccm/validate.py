"""Validate committed CCM content and packaged assets without private source files."""
import base64
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
m = json.loads((ROOT / 'manifest.json').read_text())
assert m['code'] == 'ccm-heart-and-blood'
assert len(m['pages']) == 7
assert [p['sourceSlide'] for p in m['pages']] == [2, 5, 8, 11, 14, 17, 20]
assert [len(p['questions']) for p in m['pages']] == [2, 3, 0, 2, 3, 0, 2]
assert [p['presentation']['chatEnabled'] for p in m['pages']] == [False, False, True, False, False, True, False]
for i, page in enumerate(m['pages']):
    assert page['imageDescriptionForLLM'].strip()
    assert page['presentation']['mentalSet'] == (1 if i < 4 else 2)
    for question in page['questions']:
        assert question['type'] == 'TEXT' and question['prompt'].strip()
        assert type(question['sourceNumber']) is int
    for image in page['images']:
        assert hashlib.sha256((ROOT / image['file']).read_bytes()).hexdigest() == image['sha256']
for asset in json.loads((ROOT / 'simulation-source.json').read_text()):
    raw = (ROOT.parents[1] / asset['output']).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == asset['outputSha256']
    embedded = re.findall(r'data:[^;\"\']+;base64,([A-Za-z0-9+/=]+)', raw.decode())
    assert [hashlib.sha256(base64.b64decode(a)).hexdigest() for a in embedded] == asset['embeddedAssetSha256']
print('CCM validated: 7 pages, 12 TEXT questions, 1 preview, 2 self-contained simulations')
