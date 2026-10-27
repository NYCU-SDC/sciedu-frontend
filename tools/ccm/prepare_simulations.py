"""Package supplied self-contained simulations; no external dependency downloads."""
from pathlib import Path
import hashlib,json,sys,re
ROOT=Path(__file__).resolve().parents[2]
def prepare(source):
    records=[]
    for name,kind in [('q1-heart-pump-simulation_心臟輸送_20261014.html','heart'),('q1-bone-marrow-simulation_血球生成_20261013.html','marrow')]:
        raw=(Path(source)/name).read_bytes();s=raw.decode()
        if re.search(r'(?:src|href)=[\"\']https?://',s):raise ValueError('Unexpected external asset')
        channel='sciedu-ccm-'+kind+'-v1'
        bridge='''
      // SciEdu: only simulation settings cross the sandbox boundary.
      const origin = document.referrer ? new URL(document.referrer).origin : null;
      const channel = CHANNEL;
      const send = (type, state) => { if (origin) parent.postMessage({channel, type, state}, origin); };
      let synchronized = false;
      const report = () => { if (synchronized) send('state', STATE); };
      addEventListener('message', e => {
        if (e.source !== parent || e.origin !== origin || e.data?.channel !== channel) return;
        if (e.data.type === 'hello') { READY; return; }
        if (e.data.type === 'reset' || e.data.type === 'restore') {
          const s = e.data.type === 'reset' ? DEFAULT : e.data.state;
          STOP;
          if (s && VALID) { RESTORE; }
          synchronized = true; report();
        }
      });
      addEventListener('pagehide', () => { STOP; });
      document.addEventListener('visibilitychange', () => { if (document.hidden) { STOP; } });
      REPORT_EVENTS
'''.replace('CHANNEL',json.dumps(channel))
        if kind=='heart':
            bridge=bridge.replace('STATE','{position: video.currentTime, speed: video.playbackRate}').replace('DEFAULT','{position:0,speed:.65}').replace('VALID','Number.isFinite(s.position) && s.position >= 0 && [.5,.65,.8,1].includes(s.speed)').replace('RESTORE','video.currentTime = Math.min(s.position, Number.isFinite(video.duration) ? video.duration : 0); video.playbackRate = s.speed; speedSelect.value = String(s.speed); updateUI()').replace('STOP','video.pause()').replace('READY',"send(video.error ? 'error' : video.readyState >= 1 ? 'ready' : 'loading')").replace('REPORT_EVENTS',"video.addEventListener('loadedmetadata', () => send('ready')); video.addEventListener('error', () => send('error')); video.addEventListener('timeupdate', report); video.addEventListener('ratechange', report);")
            s=s.replace("      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {\n        video.play().catch(() => updateUI());\n      } else {\n        video.pause();\n      }",'      video.pause();\n'+bridge)
        else:
            bridge=bridge.replace('STATE',"{position:index,speed:Number($('speedSelect').value)}").replace('DEFAULT','{position:0,speed:1}').replace('VALID','Number.isInteger(s.position) && s.position >= 0 && s.position <= 3 && [.75,1,1.25].includes(s.speed)').replace('RESTORE',"$('speedSelect').value=[...$('speedSelect').options].find(o => Number(o.value) === s.speed).value;setStage(s.position)").replace('STOP','stopPlay();cancelAnimationFrame(raf)').replace('READY',"send([...document.images].some(i => !i.complete || !i.naturalWidth) ? 'error' : 'ready')").replace('REPORT_EVENTS',"document.addEventListener('click', () => { cancelAnimationFrame(raf); raf=requestAnimationFrame(animate); report(); }); $('speedSelect').addEventListener('change',report);")
            s=s.replace('    setStage(0,false);cancelAnimationFrame(raf);raf=requestAnimationFrame(animate);',bridge+'\n    setStage(0,false);')
            # Report automatic stage changes as well as manual controls.
            s=s.replace('      start=performance.now();','      start=performance.now();\n      report();')
        css='''<style>html,body{margin:0;min-width:0;overflow:auto;background:#f1f8f6}body{padding:10px;box-sizing:border-box}header{margin:0 auto 10px}#player{max-width:100%;min-width:0!important}video{max-width:100%;object-fit:contain}.controls{flex-wrap:wrap}*{box-sizing:border-box}@media(max-width:600px){header h1{font-size:18px}.controls{gap:8px;padding:10px}header p{font-size:13px}}</style>'''
        if kind=='heart':
            # Container-relative labels stay aligned when the player is narrower than its iframe.
            css += '<style>.page{min-height:0;padding:8px;display:block}.player{container-type:inline-size}.controls{display:flex;flex-wrap:wrap;gap:8px;padding:8px}.control-button{white-space:nowrap;padding:0 12px;min-height:36px}.control-button.primary{min-width:80px}.timeline{flex:1 1 140px;min-width:80px}.speed-wrap{flex-wrap:wrap}.label{font-size:clamp(8px,1.45cqw,17px)}.orientation,.phase{font-size:clamp(8px,1.35cqw,14px)}.legend{font-size:clamp(8px,1.25cqw,13px)}header h1{font-size:clamp(18px,2vw,24px)}header .scope{display:none}.subtitle{font-size:13px}</style>'
            s=s.replace('Math.max(260, window.innerHeight - header.offsetHeight - controlsHeight - 58)', 'Math.max(150, window.innerHeight - header.offsetHeight - controlsHeight - 58)')
        if kind=='marrow':
            css += '<style>.app{min-height:0;padding:0;gap:10px}.topbar h1{font-size:20px}.subtitle{font-size:13px}.eyebrow{font-size:12px}.scope{display:none}.layout{grid-template-columns:1fr;gap:10px}.visual-card{padding:8px}.scene{width:min(100%,420px);margin:auto}.legend{gap:10px;font-size:11px}.control-card{min-height:0;padding:12px}.phase-title{font-size:18px;margin:5px 0}.phase-text{min-height:0;margin:0 0 8px}.steps{grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:8px}.step{min-height:40px}.transport{margin-bottom:8px}.btn{min-height:38px;padding:0 8px}.speed{flex-direction:row;align-items:center;flex-wrap:wrap}select{min-width:0;max-width:100%;padding:6px}.focus-strip{margin-top:10px;padding:8px;font-size:12px}@media(min-width:900px){.layout{grid-template-columns:minmax(0,1fr) 340px}.scene{width:100%;max-width:720px}}</style>'
        s=s.replace('</head>',css+'</head>')
        target=ROOT/f'public/simulations/ccm/v1/{kind}.html';target.write_text(s)
        embedded = re.findall(r'data:[^;\"\']+;base64,([A-Za-z0-9+/=]+)', raw.decode())
        assert embedded == re.findall(r'data:[^;\"\']+;base64,([A-Za-z0-9+/=]+)', s), 'Embedded asset changed'
        records.append({'source':name,'sourceSha256':hashlib.sha256(raw).hexdigest(),'output':str(target.relative_to(ROOT)),'outputSha256':hashlib.sha256(s.encode()).hexdigest(),'embeddedAssetSha256':[hashlib.sha256(__import__('base64').b64decode(asset)).hexdigest() for asset in embedded]})
    (ROOT/'tools/ccm/simulation-source.json').write_text(json.dumps(records,ensure_ascii=False,indent=4)+'\n')
if __name__=='__main__':prepare(sys.argv[1])
