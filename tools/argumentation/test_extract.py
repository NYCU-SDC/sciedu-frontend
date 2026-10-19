import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from zipfile import ZipFile
from xml.etree import ElementTree as E

spec=importlib.util.spec_from_file_location('extract',Path(__file__).with_name('extract.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class ExtractionTest(unittest.TestCase):
    def deck(self,path, changed=False):
        p=module.NS['p'];a=module.NS['a'];title='黑暗房間中的玩偶能被看見嗎？'
        stages=['題目與初始作答','開始做論證','Simulation 與論證','回答問題（無 AI）']
        with ZipFile(path,'w') as z:
            z.writestr('ppt/slides/slide1.xml','<cover/>')
            for i,stage in enumerate(stages):
                values={j:f'來源文字{j}' for j in range(40)}
                values.update({2:f'{i+1:02d} {stage}',4:title})
                if i==0: values.update({24:'論證任務',25:'初始論證問題'})
                if i==1: values.update({27:'論證任務',28:'第二頁任務'})
                if i==2:
                    values[21]='你的論證應包括'
                    for j,n in enumerate([23,25,27,29,31]): values[n]=f'引導問題{j+1}'
                if i==3:
                    values[11]='回答問題'
                    for j,n in enumerate([13,15,17,19,21]): values[n]=f'引導問題{j+1}'
                if changed and i==3: values[13]='已修改問題'
                root=E.Element(f'{{{p}}}sld');tree=E.SubElement(root,f'{{{p}}}spTree')
                for j in range(40):
                    shape=E.SubElement(tree,f'{{{p}}}sp');node=E.SubElement(shape,f'{{{a}}}t');node.text=values[j]
                z.writestr(f'ppt/slides/slide{i+2}.xml',E.tostring(root))
                z.writestr(f'ppt/slides/_rels/slide{i+2}.xml.rels','<Relationships><Relationship Type="test/image" Target="../media/preview.jpeg"/></Relationships>')
            z.writestr('ppt/media/preview.jpeg',b'original embedded image bytes')
    def test_repeatable_content_and_one_answer_per_assessment(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);deck=root/'source.pptx';self.deck(deck)
            first=module.extract(deck,root/'a');second=module.extract(deck,root/'b')
            self.assertEqual(first,second)
            self.assertEqual([p['sourceSlide'] for p in first['pages']],[2,3,4,5])
            self.assertEqual([len(p['questions']) for p in first['pages']],[1,0,0,1])
            self.assertEqual([p['presentation']['chatEnabled'] for p in first['pages']],[False,True,True,False])
            self.assertEqual(first['pages'][3]['questions'][0]['prompt'],'\n\n'.join(f'{i:02d} 引導問題{i}' for i in range(1,6)))
            self.assertEqual((root/'a/assets/preview.jpeg').read_bytes(),b'original embedded image bytes')
    def test_changed_source_requires_review(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'changed.pptx';self.deck(path,True)
            with self.assertRaisesRegex(ValueError,'guiding questions differ'):module.extract(path,Path(tmp)/'out')
    def test_committed_manifest_uses_only_registered_simulation(self):
        manifest=json.loads(Path(__file__).with_name('manifest.json').read_text())
        self.assertEqual([p['presentation'].get('simulationId') for p in manifest['pages']],[None,None,'dark-room-v1','dark-room-v1'])
        self.assertEqual(manifest['pages'][1]['presentation']['previousAnswerPageIndex'],0)

    def test_simulation_and_preview_bytes_match_recorded_sources(self):
        import hashlib
        root=Path(__file__).resolve().parent
        manifest=json.loads((root/'manifest.json').read_text())
        image=manifest['pages'][0]['images'][0]
        self.assertEqual(hashlib.sha256((root/image['file']).read_bytes()).hexdigest(),image['sha256'])
        records=json.loads((root/'simulation-source.json').read_text())['unchangedAssets']
        assets=root.parent.parent/'public/simulations/dark-room/v1/assets'
        for name, digest in records.items():
            self.assertEqual(hashlib.sha256((assets/name).read_bytes()).hexdigest(),digest)

if __name__=='__main__':unittest.main()
