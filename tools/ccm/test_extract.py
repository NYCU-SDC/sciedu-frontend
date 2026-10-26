import json,tempfile,unittest,hashlib,sys
from pathlib import Path
from extract import extract
ROOT=Path(__file__).resolve().parent
class CCMExtraction(unittest.TestCase):
    def test_reproducible(self):
        source=Path(sys.argv_source)
        with tempfile.TemporaryDirectory() as d:
            a=extract(source,d);first=Path(d,'manifest.json').read_bytes();b=extract(source,d)
            self.assertEqual(a,b);self.assertEqual(first,Path(d,'manifest.json').read_bytes())
            self.assertEqual(a,json.loads((ROOT/'manifest.json').read_text()))
            self.assertEqual(len(a['pages']),7)
            self.assertEqual(sum(len(p['questions']) for p in a['pages']),12)
            self.assertEqual([p['presentation']['chatEnabled'] for p in a['pages']],[False,False,True,False,False,True,False])
            self.assertTrue(all(q['type']=='TEXT' for p in a['pages'] for q in p['questions']))
            self.assertIn('血球生成的解釋',a['pages'][6]['questions'][1]['prompt'])
            self.assertIn('紅骨髓',a['pages'][5]['imageDescriptionForLLM'])
            for p in a['pages']:
                for i in p['images']:self.assertEqual(hashlib.sha256(Path(d,i['file']).read_bytes()).hexdigest(),i['sha256'])
if __name__=='__main__':
    sys.argv_source=sys.argv.pop(1);unittest.main()
