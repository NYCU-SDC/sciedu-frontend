"""Build the one-time Dev description repair; never creates courses or questions."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
plan=json.loads((ROOT/'description-revision.json').read_text())
engine=(ROOT/'revise_descriptions.mjs').read_text().replace('export async function','async function',1)
script='(async()=>{\n'+engine+'\nconst plan='+json.dumps(plan,ensure_ascii=False)+';\n'+'''
const report=await reviseDescriptions(plan,{fetch:window.fetch.bind(window),storage:localStorage,locks:navigator.locks,origin:location.origin});
const box=document.createElement('aside');box.style.cssText='position:fixed;z-index:2147483647;right:20px;bottom:20px;max-width:560px;padding:24px;background:white;color:#163c35;border:2px solid #267c6c;border-radius:16px;font:16px/1.5 system-ui';
const text=document.createElement('p');text.textContent=report.status==='VERIFIED'?'CCM 七頁 STEP 標題已修正並核對。課程、題目與答案 ID 保留。':'修正停止：'+report.error;
const button=document.createElement('button');button.textContent='下載 CCM 修正報告';button.onclick=()=>{const u=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=u;a.download='sciedu-ccm-description-revision.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),60000);};
box.append(text,button);document.body.append(box);
console.info('CCM description revision',report);
})().catch(e=>console.error('修正停止',e.message));
'''
out=ROOT/'build/REVISE-DESCRIPTIONS.js';out.parent.mkdir(exist_ok=True);out.write_text(script);print(out)
