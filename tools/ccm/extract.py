"""Reproducible CCM extraction. Usage: python3 tools/ccm/extract.py SOURCE_DIRECTORY"""
import hashlib,json,re,sys
from pathlib import Path
from zipfile import ZipFile
from xml.etree import ElementTree as E
ROOT=Path(__file__).resolve().parent
NS={'p':'http://schemas.openxmlformats.org/presentationml/2006/main','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
def extract(source, output=ROOT):
    source,output=Path(source),Path(output)
    deck=source/'CCM teacher agent 學生操作介面_圖文說明_20261015.pptx'
    def sha(b): return hashlib.sha256(b).hexdigest()
    with ZipFile(deck) as z:
        if len([n for n in z.namelist() if re.fullmatch(r'ppt/slides/slide\d+.xml',n)])!=21: raise ValueError('Expected 21 source slides; review mapping')
        def texts(i):
            return [''.join(t.text or '' for t in s.findall('.//a:t',NS)).strip() for s in E.fromstring(z.read(f'ppt/slides/slide{i}.xml')).findall('.//p:spTree/p:sp',NS)]
        for i,word in [(2,'心臟的功能'),(14,'血球在哪裡生成'),(20,'血球生成的解釋')]:
            if not any(word in t for t in texts(i)): raise ValueError(f'Source slide {i} changed')
        (output/'assets').mkdir(parents=True,exist_ok=True)
        image=z.read('ppt/media/image1.png');(output/'assets/heart-preview.png').write_bytes(image)
        titles=['迷思概念外顯化','心臟模擬與觀察','心臟概念診斷與討論','心臟概念重建後作答','骨髓模擬與觀察','血球生成診斷與討論','血球生成概念重建後作答']
        stages=['initial','observation','discussion','final','observation','discussion','final']
        mappings=[(2,[3,12]),(5,[10,11,12]),(8,[]),(11,[4,7]),(14,[10,11,12]),(17,[]),(20,[3,7])]
        metadata=['\n\n'.join(texts(4)),'\n\n'.join(texts(7)),'\n\n'.join(texts(16))]
        pages=[]
        for i,(slide,indices) in enumerate(mappings):
            mental=1 if i<4 else 2
            topic='心臟的功能是什麼？' if mental==1 else '血球在哪裡生成？'
            presentation={'version':1,'stage':'ccm-'+stages[i],'chatEnabled':i in [2,5],'mentalSet':mental}
            if i==0:presentation.update(preview=True,previewLabel='靜態示意圖・下一頁可操作心臟模擬')
            else:presentation['simulationId']='ccm-heart-v1' if mental==1 else 'ccm-marrow-v1'
            if i in [1,4]:presentation['textChoices']={'1':['相同','不相同']}
            if i==4:presentation['notice']='ccm-linear-test'
            if i in [2,5]:
                observation=1 if i==2 else 4
                presentation['answerReferences']=[{'pageIndex':p,'questionIndex':q,'label':label} for p,q,label in [(0,0,'第一頁：心臟功能的原始預測'),(0,1,'第一頁：預測理由'),(observation,0,'STEP 2：模擬實驗觀察現象'),(observation,1,'STEP 2：與原始預測是否相同'),(observation,2,'STEP 2：理由')]]
            prompts=[]
            for j,k in enumerate(indices):
                raw=texts(slide)[k]
                match=re.match(r'(\d+)\.\s*(.*)',raw)
                if not match:raise ValueError(f'Missing source number in slide {slide}: {raw}')
                prompt=match[2].split('□')[0].strip()
                prompts.append({'type':'TEXT','sourceNumber':int(match[1]),'label':f'題目 {match[1]}','prompt':prompt})
            heading=next(t for t in texts(slide) if t.startswith('STEP '))
            # User-requested English wording; retain source wording in the audit notes.
            if i==0:heading='STEP 1. 迷思概念的外顯化（Naive Conceptual Articulation）'
            description=f'## {heading}\n\n> 問題：{topic}'
            pages.append({'code':f'ccm-{i+1}','title':f'{i+1:02d} {titles[i]}','sourceSlide':slide,'description':description,'questions':prompts,'presentation':presentation,'images':[{'file':'assets/heart-preview.png','mimeType':'image/png','sha256':sha(image),'sourceMedia':'ppt/media/image1.png'}] if i==0 else [],'imageDescriptionForLLM':metadata[0 if i==0 else 1 if mental==1 else 2]+'\n\n測試版固定線性流程，所有學生皆學習 Mental Set 2，沒有依迷思進行分流。回答整理中的初始預測指第一頁心臟功能回答。模擬狀態僅為當前設定，不代表已完成觀察或正式評分。'})
        m={'schemaVersion':1,'code':'ccm-heart-and-blood','title':'CCM：心臟的功能與血球的生成','source':{'filename':deck.name,'sha256':sha(deck.read_bytes())},'sourceNotes':['第一頁英文標題依使用者要求使用 Naive Conceptual Articulation；原稿為 Naïve Conception Articulation。','21 張來源整理為七頁；3/6/10/12/15/19/21 為重複文字排版，4/7/9/16/18 為圖說與表格註記，1/13 為階段封面。','第 21 張末題誤寫心臟功能，依第 20 張血球生成的解釋保存。','第 9/18 張的表格由本次學生答案呈現；不把示意表格當靜態答案圖片。','影片縮圖與播放介面由原始 HTML 模擬取代；不重複放入投影片的播放器 UI。'],'pages':pages}
        (output/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=4)+'\n')
    return m
if __name__=='__main__':
    m=extract(sys.argv[1]);print(f'{len(m["pages"])} pages, {sum(len(p["questions"]) for p in m["pages"])} TEXT questions')
