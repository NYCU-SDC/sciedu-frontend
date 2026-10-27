from pathlib import Path
import subprocess,json,hashlib,base64,sys
ROOT=Path(__file__).resolve().parent
OUT=Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'build'
OUT.mkdir(parents=True,exist_ok=True)
COMMIT=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip()
raw=(ROOT/'manifest.json').read_bytes();m=json.loads(raw)
manifest_json=json.dumps(m,ensure_ascii=False,separators=(',',':'))
assets={}
for p in m['pages']:
 for img in p['images']:
  data=(ROOT/img['file']).read_bytes()
  assert hashlib.sha256(data).hexdigest()==img['sha256']
  assets[img['file']]=base64.b64encode(data).decode()
config={'version':1,'commit':COMMIT,'frontend':'https://dev.sciedu.sdc.nycu.club','backend':'https://dev.sciedu.sdc.nycu.club','email':'hsien.eason@gmail.com','manifestSha256':hashlib.sha256(manifest_json.encode()).hexdigest()}
pack={'config':config,'manifest':m,'assets':assets}
(OUT/'payload.json').write_text(json.dumps(pack,ensure_ascii=False,indent=2)+'\n')
engine=(ROOT/'uploader.mjs').read_text().replace('export async function','async function',1)
bundle='''// SciEdu one-time material upload. Run only on the signed-in official frontend.
// Contains no credentials. Creates and verifies the course, then publishes it.
(async () => {
"use strict";
'''+engine+'\nconst pack = '+json.dumps(pack,ensure_ascii=False,separators=(',',':'))+''';
const report = await uploadMaterial(pack, {
 fetch: window.fetch.bind(window), storage: window.localStorage, locks: navigator.locks,
 crypto: window.crypto, origin: window.location.origin,
 decodeBase64: s => Uint8Array.from(atob(s), c => c.charCodeAt(0)),
 log: message => console.info('[SciEdu 教材上傳]', message),
});
console.info('[SciEdu 上傳結果]', report);
const box=document.createElement('aside');
box.style.cssText='position:fixed;z-index:2147483647;right:16px;bottom:16px;max-width:480px;max-height:70vh;overflow:auto;background:white;color:#163c35;border:2px solid #28776b;padding:20px;border-radius:12px;box-shadow:0 4px 30px #0003;font:15px/1.6 system-ui';
const text=document.createElement('pre');text.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere';
text.textContent=report.status==='PUBLISHED' ? '教材已發布並核對完成\\n課程 ID：'+report.courseId+'\\n'+report.courseUrl : '上傳已停止\\n'+report.error+'\\n請保留瀏覽器進度，下載報告供查核。';
const button=document.createElement('button');button.textContent='下載核對報告';
button.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='sciedu-ccm-upload-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);};
const close=document.createElement('button');close.textContent='關閉';close.style.marginLeft='12px';close.onclick=()=>box.remove();
box.append(text,button,close);document.body.append(box);
return report;
})().catch(() => console.error('腳本未能啟動或顯示結果；請保留 Console 畫面，勿刪除進度後重跑。'));
'''
(OUT/'UPLOAD-PASTE-IN-CONSOLE.js').write_text(bundle)
record={**config,'sourceManifestFileSha256':hashlib.sha256(raw).hexdigest(),'bundleSha256':hashlib.sha256(bundle.encode()).hexdigest(),'imageSha256':m['pages'][0]['images'][0]['sha256']}
(OUT/'SOURCE.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
print('Built',len(bundle.encode()),'bytes; source commit',COMMIT)
