"""Extract the approved four stages (not the cover) without copying mock UI.

Usage: python3 tools/argumentation/extract.py PATH.pptx [--output DIR]
Python standard library only. Unknown deck revisions fail explicitly.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
from xml.etree import ElementTree as E
from zipfile import ZipFile

NS = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
      'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
ROOT = Path(__file__).resolve().parent


def texts(archive, slide):
    shapes = E.fromstring(archive.read(f'ppt/slides/slide{slide}.xml')).findall('.//p:spTree/p:sp', NS)
    return {i: ''.join(n.text or '' for n in shape.findall('.//a:t', NS)).strip()
            for i, shape in enumerate(shapes)}


def extract(source, output):
    output = Path(output)
    with ZipFile(source) as z:
        slides = [n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+.xml', n)]
        if len(slides) != 5:
            raise ValueError('Expected cover + four learning stages')
        t = [texts(z, i) for i in range(2, 6)]
        title = '黑暗房間中的玩偶能被看見嗎？'
        stages = ['題目與初始作答', '開始做論證', 'Simulation 與論證', '回答問題（無 AI）']
        for i, s in enumerate(t):
            if s.get(4) != title or not s.get(2, '').endswith(stages[i]):
                raise ValueError(f'Unrecognized stage {i + 1}; review source mapping')
        if t[0].get(24) != '論證任務' or t[1].get(27) != '論證任務' or t[2].get(21) != '你的論證應包括' or t[3].get(11) != '回答問題':
            raise ValueError('Source section positions changed; review extraction')
        prompts = [t[3][i] for i in [13, 15, 17, 19, 21]]
        if prompts != [t[2][i] for i in [23, 25, 27, 29, 31]]:
            raise ValueError('Final and discussion guiding questions differ')
        picture_targets = []
        for slide in [2, 3]:
            relationships = E.fromstring(z.read(f'ppt/slides/_rels/slide{slide}.xml.rels'))
            images = [r.attrib['Target'] for r in relationships if r.attrib['Type'].endswith('/image')]
            if len(images) != 1: raise ValueError('Expected one static preview per initial stage')
            picture_targets.append(images[0])
        if picture_targets[0] != picture_targets[1]: raise ValueError('Preview images differ')
        image = z.read('ppt/' + picture_targets[0].removeprefix('../'))
        output.joinpath('assets').mkdir(parents=True, exist_ok=True)
        output.joinpath('assets/preview.jpeg').write_bytes(image)
        scenario = '\n\n'.join([t[0][4], t[0][5], t[0][6], '\n'.join(t[0][i] + '：' + t[0][i+1] for i in [7,9,11]), t[0][16], '\n'.join(t[0][i] + '：' + t[0][i+1] for i in [17,19,21])])
        guidance = '\n\n'.join(f'{i+1:02d} {p}' for i,p in enumerate(prompts))
        metadata = scenario + '\n\nSimulation：黑暗箱中的玩偶。LED 與隔板為可操作控制項；可旋轉、縮放場景，觀察光源、玩偶與觀察者。\n靜態預覽為簡報內嵌圖片。模型為暗箱剖視示意；展示照明不列入光學計算，忽略箱壁的二次反射，光路線用來表示傳播方向。'
        descriptions = [scenario, scenario + '\n\n論證任務\n' + t[1][28], t[2][4] + '\n\n論證任務\n' + t[2][20] + '\n\n你的論證應包括\n' + guidance, t[3][4] + '\n\n請操作模擬，並在下方同一份回答中依序回應五項問題。']
        pages = []
        for i in range(4):
            config = {'version': 1, 'stage': ['initial','argumentation','simulation','final'][i], 'chatEnabled': i in [1,2]}
            if i < 2: config['preview'] = True
            else: config['simulationId'] = 'dark-room-v1'
            if i == 1: config['previousAnswerPageIndex'] = 0
            questions = []
            if i in [0,3]: questions = [{'type': 'TEXT', 'sourceNumber': 1 if i == 0 else 2, 'label': '初始回答' if i == 0 else '最終回答', 'prompt': t[0][25] if i == 0 else guidance}]
            pages.append({'code': f'argumentation-{i+1}', 'title': f'{i+1:02d} {stages[i]}', 'sourceSlide': i+2, 'description': descriptions[i], 'images': [{'file': 'assets/preview.jpeg', 'sha256': hashlib.sha256(image).hexdigest(), 'sourceMedia': picture_targets[0]}] if i < 2 else [], 'questions': questions, 'imageDescriptionForLLM': metadata, 'presentation': config})
    manifest = {'schemaVersion': 1, 'code': 'scientific-argumentation-dark-room', 'title': '科學論證：' + title, 'source': {'filename': Path(source).name, 'sha256': hashlib.sha256(Path(source).read_bytes()).hexdigest()}, 'pages': pages}
    output.joinpath('manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=4) + '\n')
    return manifest

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, default=ROOT)
    args = parser.parse_args()
    result = extract(args.source, args.output)
    print(f'Extracted {len(result["pages"])} pages, 2 TEXT questions, 1 shared preview image.')
