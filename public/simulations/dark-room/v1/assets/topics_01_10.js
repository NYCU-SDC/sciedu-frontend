(function () {
  'use strict';
  const PI = Math.PI, R = PI / 180;
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const mul = (a, k) => a.map(v => v * k);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const dot = (a, b) => a.reduce((v, x, i) => v + x * b[i], 0);
  const norm = a => mul(a, 1 / Math.hypot(...a));
  const reflect = (d, n) => sub(d, mul(n, 2 * dot(d, n)));
  const close = (a, b, eps = 1e-7) => Math.abs(a - b) < eps;
  const nval = (v, fallback) => Number.isFinite(Number(v)) ? Number(v) : fallback;
  const on = v => v !== false && v !== 'false' && v !== 0;
  const fmt = (n, digits = 1) => Number(n.toFixed(digits)).toString();
  const range = (key, label, value, min, max, step, unit) => ({key, label, type:'range',value,min,max,step,unit});
  const toggle = (key, label, value) => ({key,label,type:'toggle',value});
  const select = (key,label,value,options) => ({key,label,type:'select',value,options:options.map(p=>({value:p[0],label:p[1]}))});
  const metric = (label, value) => ({label,value});
  function register(id, def, cases) {
    const defaults = Object.fromEntries(def.controls.map(c => [c.key,c.value]));
    const calc = def.model;
    def.model = s => calc(Object.assign({},defaults,s));
    def.tests = () => {
      const errors=[];
      cases.forEach(([label,state,predicate]) => {
        try { const result=def.model(state); if(!predicate(result.values,result))errors.push(id+': '+label); }
        catch(e){errors.push(id+': '+label+' '+e.message);}
      });
      function finite(v,p){if(typeof v==='number'&&!Number.isFinite(v))errors.push(id+': nonfinite '+p);else if(v&&typeof v==='object')Object.keys(v).forEach(k=>finite(v[k],p+'.'+k));}
      cases.forEach(c=>finite(def.model(c[1]),'model'));
      return errors;
    };
    window.OpticsLab.register(id,def);
  }
  // All manufacturing detail is geometry or analytic material shading, never a bitmap illustration.
  function roundedCase(ctx,p,size,color,options={},radius=.035,parent){
    const T=ctx.T,r=Math.min(radius,...size.map(v=>v*.48)),geo=new T.BoxGeometry(...size,8,8,8),pos=geo.attributes.position,n=geo.attributes.normal,v=new T.Vector3(),q=new T.Vector3(),half=size.map(v=>v/2);
    for(let i=0;i<pos.count;i++){
      v.fromBufferAttribute(pos,i);
      ['x','y','z'].forEach((axis,j)=>{const t=Math.abs(v[axis])/half[j];v[axis]=Math.sign(v[axis])*(t===0?0:half[j]-r+r*(t-.25)/.75);q[axis]=Math.max(-half[j]+r,Math.min(half[j]-r,v[axis]));});
      const normal=v.clone().sub(q).normalize();v.copy(q).addScaledVector(normal,r);pos.setXYZ(i,v.x,v.y,v.z);n.setXYZ(i,normal.x,normal.y,normal.z);
    }
    const mesh=new T.Mesh(geo,typeof color==='object'?color:ctx.mat(color,options));mesh.position.fromArray(p);mesh.castShadow=true;mesh.receiveShadow=true;(parent||ctx.group).add(mesh);return mesh;
  }
  function ringMesh(ctx,group,r,tube,y,material){const mesh=new ctx.T.Mesh(new ctx.T.TorusGeometry(r,tube,8,48),material);mesh.rotation.x=PI/2;mesh.position.y=y;group.add(mesh);return mesh;}
  function fastener(ctx,group,p,axis='y',r=.022){
    const T=ctx.T,g=new T.Group();g.position.fromArray(p);if(axis==='x')g.rotation.z=-PI/2;if(axis==='z')g.rotation.x=PI/2;
    const head=new T.Mesh(new T.CylinderGeometry(r,r,r*.24,20),ctx.mat('#bcc8cd',{metalness:.9,roughness:.29}));g.add(head);
    // A recessed-looking hex socket remains legible when the assembly is enlarged.
    const socket=new T.Mesh(new T.CylinderGeometry(r*.43,r*.43,r*.027,6),ctx.mat('#314149',{metalness:.48,roughness:.52}));socket.position.y=r*.126;g.add(socket);group.add(g);return g;
  }
  function fabricGrain(material,scale=280,strength=.10){
    material.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vFabricPoint;').replace('#include <begin_vertex>','#include <begin_vertex>\nvFabricPoint = position;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vFabricPoint;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
        vec3 fabricP = vFabricPoint * ${scale.toFixed(1)};
        float weave = sin(fabricP.x * 1.71 + sin(fabricP.z * .73)) * sin(fabricP.y * 1.37 + fabricP.z * .91);
        float nap = sin(dot(fabricP,vec3(.73,1.93,1.21))) * sin(dot(fabricP,vec3(2.43,.83,1.67)));
        vec3 fabricQ0 = dFdx(-vViewPosition), fabricQ1 = dFdy(-vViewPosition);
        vec3 fabricR1 = cross(fabricQ1,normal), fabricR2 = cross(normal,fabricQ0);
        float fabricDet = dot(fabricQ0,fabricR1);
        float fabricHeight = (weave * .55 + nap * .45) * ${strength.toFixed(5)} / ${scale.toFixed(1)};
        normal = normalize(abs(fabricDet) * normal - sign(fabricDet) * (dFdx(fabricHeight) * fabricR1 + dFdy(fabricHeight) * fabricR2));
      `);
    };
    material.customProgramCacheKey=()=>`optics-fabric-${scale}-${strength}`;return material;
  }
  function sensor(ctx,p,target,lit,color='#63d8a7') {
    const T=ctx.T,d=norm(sub(target,p)),g=new T.Group(),steel=ctx.mat('#c3d0d6',{metalness:.92,roughness:.24}),rubber=ctx.mat('#273c46',{roughness:.84,metalness:0});
    g.position.fromArray(p);g.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...d));ctx.add(g);
    const profile=[[0,-.16],[.155,-.16],[.184,-.145],[.198,-.12],[.20,-.08],[.20,.08],[.19,.12],[.162,.137],[.132,.137],[.129,.106],[0,.106]].map(q=>new T.Vector2(...q));
    const housing=new T.Mesh(new T.LatheGeometry(profile,64),ctx.mat('#28657a',{metalness:.68,roughness:.29}));g.add(housing);
    for(const y of[-.118,-.095,.079,.105])ringMesh(ctx,g,y<0?.199:.195,.006,y,steel);
    ringMesh(ctx,g,.143,.012,.137,steel);ringMesh(ctx,g,.128,.005,.140,rubber);
    const window=new T.Mesh(new T.CylinderGeometry(.123,.123,.018,48),ctx.mat(lit?color:'#111d25',{emissive:lit?color:'#000000',emissiveIntensity:lit?.48:0,metalness:.1,roughness:.18}));window.position.y=.128;g.add(window);
    // The receiving aperture is centred on the original optical axis, with fasteners outside it.
    for(let i=0;i<3;i++){const a=i*2*PI/3;fastener(ctx,g,[.166*Math.cos(a),.134,.166*Math.sin(a)],'y',.016);}
    const connector=new T.Mesh(new T.CylinderGeometry(.048,.041,.10,20),steel);connector.position.y=-.20;g.add(connector);ringMesh(ctx,g,.044,.005,-.225,rubber);
    const rear=add(p,mul(d,-.24)),bottom=[p[0]-.04,Math.max(.15,p[1]-.7),p[2]-.12];
    const cable=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(...rear),new T.Vector3(...add(rear,[0,-.13,0])),new T.Vector3(...bottom)]),16,.011,6,false),rubber);ctx.add(cable);
    ctx.stand([p[0],0,p[2]],Math.max(.1,p[1]-.18));
  }
  function rail(ctx,x1,x2,z=0){
    const g=new ctx.T.Group();ctx.add(g);roundedCase(ctx,[(x1+x2)/2,.08,z],[x2-x1,.12,.16],'#8fa7b2',{metalness:.85,roughness:.25},.017,g);
    roundedCase(ctx,[(x1+x2)/2,.141,z],[x2-x1-.04,.004,.028],'#425866',{metalness:.62,roughness:.42},.001,g);
    for(const x of[x1+.055,x2-.055]){roundedCase(ctx,[x,.08,z],[.05,.125,.165],'#465e6b',{metalness:.52,roughness:.39},.012,g);fastener(ctx,g,[x,.147,z],'y',.016);}
  }
  function doll(ctx,p,h=1,color='#cda57f',illumination=1) {
    const T=ctx.T,g=new T.Group(),furSources=[],tone=new T.Color(color),gain=illumination>0?.05+.95*Math.sqrt(Math.min(1,illumination)):.04;
    const base=tone.clone().multiplyScalar(gain),pad=tone.clone().lerp(new T.Color('#e8d3b8'),.42).multiplyScalar(gain),thread=base.clone().multiplyScalar(.58);
    g.position.fromArray(p);g.scale.setScalar(h);ctx.add(g);
    const fabric=new T.MeshPhysicalMaterial({color:base,roughness:.96,metalness:0,sheen:1,sheenColor:base,sheenRoughness:.88});
    const patch=new T.MeshPhysicalMaterial({color:pad,roughness:1,metalness:0,sheen:.8,sheenColor:pad,sheenRoughness:.95});
    const faceFabric=new T.MeshPhysicalMaterial({color:'#ffffff',vertexColors:true,roughness:.96,metalness:0,sheen:1,sheenColor:base,sheenRoughness:.88});
    const seamMaterial=new T.MeshStandardMaterial({color:thread,roughness:1,metalness:0});
    const bead=new T.MeshPhysicalMaterial({color:new T.Color('#191715').multiplyScalar(gain),roughness:.23,metalness:0,clearcoat:.65*gain,clearcoatRoughness:.19});
    const glintMaterial=new T.MeshStandardMaterial({color:new T.Color('#e6e3dc').multiplyScalar(gain),roughness:.32,metalness:0});
    fabricGrain(fabric,310,.24);fabricGrain(patch,390,.14);fabricGrain(faceFabric,350,.20);
    // Sewn, closed fabric surfaces: the body is pear-shaped and the head has an integrated muzzle.
    function surface(point,material,cols=48,rows=32,tint){
      const vertices=[],colors=[],indices=[];
      for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
        const v=j/rows,a=i/cols*2*PI,xyz=point(v,a);vertices.push(...xyz);
        if(tint){const c=tint(xyz);colors.push(c.r,c.g,c.b);}
      }
      for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;indices.push(a,b,b+1,a,b+1,a+1);}
      const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);
      if(tint)geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.computeVertexNormals();
      const mesh=new T.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);if(material===fabric||material===faceFabric)furSources.push(mesh);return mesh;
    }
    function sewnCurve(points,radius=.0025,material=seamMaterial){
      const curve=new T.CatmullRomCurve3(points.map(q=>new T.Vector3(...q))),mesh=new T.Mesh(new T.TubeGeometry(curve,Math.max(10,points.length*4),radius,5,false),material);g.add(mesh);return mesh;
    }
    function stuffedLimb(points,radius,flatten=1){
      const curve=new T.CatmullRomCurve3(points.map(q=>new T.Vector3(...q))),frames=curve.computeFrenetFrames(32,false);
      return surface((v,a)=>{const k=Math.min(32,Math.round(v*32)),q=curve.getPointAt(v),r=radius*Math.pow(Math.sin(PI*v),.42)*(1+.16*v);q.addScaledVector(frames.normals[k],r*Math.cos(a)).addScaledVector(frames.binormals[k],-r*Math.sin(a)*flatten);return q.toArray();},fabric,32,32);
    }
    surface((v,a)=>{const r=Math.pow(Math.sin(PI*v),.62)*(.25+.08*(1-v));return [r*Math.cos(a),.04+.64*v,.94*r*Math.sin(a)+.04*Math.sin(PI*v)];},fabric);
    const headPoint=(v,a)=>{
      const sy=-Math.cos(PI*v),ring=Math.sin(PI*v),y=.80+.25*sy,cheek=1+.10*Math.exp(-(((y-.72)/.085)**2)),forward=Math.max(0,Math.sin(a));
      return [.28*ring*Math.cos(a)*cheek,y,.225*ring*Math.sin(a)-.005+.115*forward**6*Math.exp(-(((y-.737)/.079)**2))];
    };
    surface(headPoint,faceFabric,64,48,q=>{const snout=Math.exp(-((q[0]/.135)**4+((q[1]-.737)/.095)**4))*Math.max(0,Math.min(1,(q[2]-.17)/.10));return base.clone().lerp(pad,snout);});
    [-1,1].forEach(k=>{
      // Ear fronts are cupped, with a separately sewn inset rather than a stack of spheres.
      surface((v,a)=>{const sy=-Math.cos(PI*v),ring=Math.sin(PI*v),z=ring*Math.sin(a);return [k*.215+.117*ring*Math.cos(a),1.025+.12*sy,-.018+.078*z-.035*Math.max(0,z)**3];},fabric,32,24);
      surface((v,a)=>{const sy=-Math.cos(PI*v),ring=Math.sin(PI*v),z=ring*Math.sin(a);return [k*.215+.075*ring*Math.cos(a),1.026+.080*sy,.024+.016*z-.008*Math.max(0,z)**2];},patch,28,20);
      stuffedLimb([[k*.20,.55,.015],[k*.31,.43,.035],[k*.36,.255,.105]],.102,.86);
      stuffedLimb([[k*.125,.21,.025],[k*.165,.10,.045],[k*.20,-.015,.15]],.118,.91);
      surface((v,a)=>{const sy=-Math.cos(PI*v),ring=Math.sin(PI*v),forward=ring*Math.sin(a);return [k*.19+.127*ring*Math.cos(a)*(1-.10*forward),-.043+.077*sy,.13+.19*forward];},fabric,40,24);
      // Pads lie on the front/top of each stuffed foot and end in three tiny toe seams.
      const footPad=surface((v,a)=>{const sy=-Math.cos(PI*v),ring=Math.sin(PI*v);return [k*.19+.081*ring*Math.cos(a),-.005+.037*sy,.252+.020*ring*Math.sin(a)];},patch,28,20);footPad.rotation.x=-.12;
      for(let toe=-1;toe<=1;toe++)sewnCurve([[k*.19+toe*.042,.016,.265],[k*.19+toe*.042,-.002,.274]],.002);
      const eye=new T.Mesh(new T.SphereGeometry(.0205,20,16),bead);eye.position.set(k*.128,.849,.215);eye.scale.set(1,1.06,.56);g.add(eye);
      const glint=new T.Mesh(new T.SphereGeometry(.0042,10,8),glintMaterial);glint.position.set(k*.128-.004,.855,.227);g.add(glint);
      const earSeam=Array.from({length:19},(_,i)=>{const a=i/18*PI;return [k*.215+.088*Math.cos(a),1.025+.095*Math.sin(a),.030];});sewnCurve(earSeam,.0022);
    });
    const nose=surface((v,a)=>{const sy=-Math.cos(PI*v),ring=Math.sin(PI*v),width=.040*(.80+.25*sy);return [width*ring*Math.cos(a),.753+.027*sy,.329+.024*ring*Math.sin(a)];},bead,28,20);
    nose.castShadow=false;
    const onFace=(x,y)=>{const ring=Math.sqrt(1-((y-.80)/.25)**2),cheek=1+.10*Math.exp(-(((y-.72)/.085)**2)),forward=Math.sqrt(1-(x/(.28*ring*cheek))**2);return [x,y,.225*ring*forward-.005+.115*forward**6*Math.exp(-(((y-.737)/.079)**2))+.0025];};
    sewnCurve([[0,.735],[0,.715],[0,.698]].map(q=>onFace(...q)),.0032);
    for(const k of[-1,1])sewnCurve([[0,.698],[k*.025,.686],[k*.050,.704]].map(q=>onFace(...q)),.003);
    // Fine running stitches follow the front panel, providing fabric detail without a bitmap texture.
    for(let i=0;i<13;i++){
      const y=.115+i*.034,v=(y-.04)/.64,r=Math.pow(Math.sin(PI*v),.62)*(.25+.08*(1-v)),z=.94*r+.04*Math.sin(PI*v)+.0018;
      sewnCurve([[-.006,y,z],[.006,y+.009,z+.0008]],.0017);
    }
    // Short, tapered, crossed fibre ribbons give the silhouette real pile at close range.
    // They are one merged 3-D mesh, with deterministic positions and the same off-state dimming.
    const fibres=[],fibreNormals=[],fibreColors=[],fibreIndices=[],rand=n=>{const v=Math.sin(n*12.9898+78.233)*43758.5453;return v-Math.floor(v);};
    const rootPoint=new T.Vector3(),hairNormal=new T.Vector3(),tangent=new T.Vector3(),bitangent=new T.Vector3(),vertex=new T.Vector3(),hairColor=new T.Color();let seed=1;
    for(const source of furSources){const geo=source.geometry,positions=geo.attributes.position,normals=geo.attributes.normal,colors=geo.attributes.color,ids=geo.index.array;
      for(let tri=0;tri<ids.length;tri+=24){seed++;const a=ids[tri],b=ids[tri+1],c=ids[tri+2],s=Math.sqrt(rand(seed)),weights=[1-s,s*(1-rand(seed+2)),s*rand(seed+2)];rootPoint.set(0,0,0);hairNormal.set(0,0,0);hairColor.setRGB(0,0,0);
        [a,b,c].forEach((id,i)=>{rootPoint.addScaledVector(vertex.fromBufferAttribute(positions,id),weights[i]);hairNormal.addScaledVector(vertex.fromBufferAttribute(normals,id),weights[i]);const tint=colors?new T.Color().fromBufferAttribute(colors,id):base;hairColor.r+=tint.r*weights[i];hairColor.g+=tint.g*weights[i];hairColor.b+=tint.b*weights[i];});
        hairNormal.normalize();if(!hairNormal.lengthSq())continue;tangent.crossVectors(hairNormal,Math.abs(hairNormal.y)<.9?new T.Vector3(0,1,0):new T.Vector3(1,0,0)).normalize();bitangent.crossVectors(hairNormal,tangent).normalize();
        const length=.004+.007*rand(seed+7),lean=(rand(seed+9)-.5)*.003;hairColor.multiplyScalar(.82+.35*rand(seed+11));
        for(const across of[tangent,bitangent]){const start=fibres.length/3;for(let station=0;station<3;station++){const t=station/2,width=.00085*(1-t)+.00010;for(const sign of[-1,1]){vertex.copy(rootPoint).addScaledVector(hairNormal,.0005+length*t).addScaledVector(tangent,lean*t*t).addScaledVector(across,sign*width);fibres.push(vertex.x,vertex.y,vertex.z);fibreNormals.push(hairNormal.x,hairNormal.y,hairNormal.z);fibreColors.push(hairColor.r,hairColor.g,hairColor.b);}}for(let j=0;j<2;j++){const a=start+j*2;fibreIndices.push(a,a+1,a+3,a,a+3,a+2);}}
      }
    }
    const pileGeometry=new T.BufferGeometry();pileGeometry.setAttribute('position',new T.Float32BufferAttribute(fibres,3));pileGeometry.setAttribute('normal',new T.Float32BufferAttribute(fibreNormals,3));pileGeometry.setAttribute('color',new T.Float32BufferAttribute(fibreColors,3));pileGeometry.setIndex(fibreIndices);
    const pile=new T.Mesh(pileGeometry,new T.MeshPhysicalMaterial({color:'#ffffff',vertexColors:true,side:T.DoubleSide,roughness:1,metalness:0,sheen:.85,sheenColor:base,sheenRoughness:1}));g.add(pile);
    const backSeam=Array.from({length:25},(_,i)=>{const q=headPoint(.13+i*.032,1.5*PI);q[2]-=.0018;return q;});sewnCurve(backSeam,.0018);
    // This support is a non-optical display prop; all teaching ray endpoints remain on the toy.
    const standProfile=[[0,0],[.40,0],[.42,.025],[.42,.065],[.37,.075],[.32,.12],[.29,.71],[.31,.77],[.34,.788],[.34,.83],[.32,.848],[0,.848]].map(q=>new T.Vector2(...q));
    const stand=new T.Mesh(new T.LatheGeometry(standProfile,64),ctx.presentationMaterial('#c4d1d5',{roughness:.44,metalness:.4,emissiveIntensity:.15}));stand.position.set(p[0],.32,p[2]);stand.receiveShadow=true;ctx.add(stand);
  }
  function mirror(ctx,p,width=5,depth=2,tilt=0) {
    const normal=[-Math.sin(tilt),Math.cos(tilt),0];
    const m=ctx.planarMirror?ctx.planarMirror(p,width,depth,normal):ctx.box(add(p,mul(normal,-.04)),[width,.08,depth],'#d8e8ef',{metalness:.98,roughness:.035});
    if(!ctx.planarMirror)m.rotation.z=tilt;
    const mount=new ctx.T.Group();mount.position.fromArray(p);mount.rotation.z=tilt;ctx.add(mount);
    roundedCase(ctx,[0,-.063,0],[width+.018,.072,depth+.018],'#839aa7',{metalness:.88,roughness:.27},.026,mount);
    for(const x of[-width/2+.09,width/2-.09])for(const z of[-depth/2+.09,depth/2-.09])fastener(ctx,mount,[x,-.025,z],'y',.024);
    const hinge=new ctx.T.Mesh(new ctx.T.CylinderGeometry(.115,.115,.38,32),ctx.mat('#657d8a',{metalness:.85,roughness:.27}));hinge.rotation.x=PI/2;hinge.position.y=-.15;mount.add(hinge);
    ctx.stand([p[0],0,p[2]],Math.max(.2,p[1]-.12)); return m;
  }
  // Flat source and receiving images are genuine meshes in the laboratory's yz planes.
  // Their 3-D locations are calculated by straight projection through the actual holes.
  const outline=[[-.19,-.7],[.19,-.7],[.19,.14],[.46,.14],[0,.78],[-.46,.14],[-.19,.14]];
  function clipPolygon(points,axis,sign) {
    const out=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],aa=sign*a[axis]>=-1e-9,bb=sign*b[axis]>=-1e-9;if(aa)out.push(a);if(aa!==bb){const t=-a[axis]/(b[axis]-a[axis]);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}}
    return out;
  }
  function face(ctx,x,cy,cz,points,color,opacity=1) {
    if(points.length<3)return;
    const shape=new ctx.T.Shape();shape.moveTo(-points[0][0],points[0][1]);points.slice(1).forEach(p=>shape.lineTo(-p[0],p[1]));shape.closePath();
    const mesh=new ctx.T.Mesh(new ctx.T.ShapeGeometry(shape),new ctx.T.MeshBasicMaterial({color,side:ctx.T.DoubleSide,transparent:opacity<1,opacity,depthWrite:opacity>=1,polygonOffset:true,polygonOffsetFactor:-2}));
    mesh.rotation.y=PI/2;mesh.position.set(x,cy,cz);ctx.add(mesh);return mesh;
  }
  function pattern(ctx,x,cy,cz,opts={}) {
    const scale=opts.scale===undefined?1:opts.scale,mask=opts.mask||'none',opacity=opts.opacity===undefined?1:opts.opacity;
    let polygon=outline;
    if(mask==='upper')polygon=clipPolygon(polygon,1,-1);
    if(mask==='left')polygon=clipPolygon(polygon,0,1);
    face(ctx,x,cy,cz,polygon.map(p=>[p[0]*scale,p[1]*scale]),opts.color||'#ffc54d',opacity);
    if(mask!=='upper'){
      const circle=Array.from({length:32},(_,i)=>[.67+.11*Math.cos(i*PI/16),.27+.11*Math.sin(i*PI/16)]);
      face(ctx,x-.001,cy,cz,circle.map(p=>p.map(v=>v*scale)),opts.marker||'#ef6c53',opacity);
    }
    if(opts.center!==false)face(ctx,x-.003,cy,cz,Array.from({length:24},(_,i)=>[.065*Math.cos(i*PI/12)*scale,.065*Math.sin(i*PI/12)*scale]),'#61d6c5',opacity);
  }
  function apertureBoard(ctx,x,y,holes,radius) {
    const sh=new ctx.T.Shape();sh.moveTo(-1.7,-1.65);sh.lineTo(1.7,-1.65);sh.lineTo(1.7,1.65);sh.lineTo(-1.7,1.65);sh.closePath();
    holes.forEach(h=>{const hole=new ctx.T.Path();hole.absarc(-h[1],h[0],radius,0,2*PI,true);sh.holes.push(hole);});
    const geo=new ctx.T.ExtrudeGeometry(sh,{depth:.002,bevelEnabled:false,curveSegments:32});
    const mesh=new ctx.T.Mesh(geo,ctx.mat('#195f76',{metalness:.24,roughness:.44}));mesh.rotation.y=PI/2;mesh.position.set(x,y,0);mesh.castShadow=true;ctx.add(mesh);ctx.stand([x,0,0],y-1.65);
    // The original perforated optical surface remains untouched; only its outside frame is added.
    const frame=new ctx.T.Group();ctx.add(frame);
    for(const z of[-1.744,1.744])roundedCase(ctx,[x,y,z],[.115,3.39,.088],'#9caeb7',{metalness:.88,roughness:.3},.014,frame);
    for(const yy of[y-1.694,y+1.694])roundedCase(ctx,[x,yy,0],[.115,.088,3.576],'#9caeb7',{metalness:.88,roughness:.3},.014,frame);
    for(const z of[-1.744,1.744])for(const yy of[y-1.54,y+1.54]){fastener(ctx,frame,[x-.061,yy,z],'x',.026);fastener(ctx,frame,[x+.061,yy,z],'x',.026);}
  }
  function pinholeBench(ctx,holes,radius,screenWidth=4.6) {
    rail(ctx,-4.6,4.6);apertureBoard(ctx,0,2.15,holes,radius);
    ctx.screen([4.05,2.15,0],screenWidth,3.85);
    // Open source frame keeps the physical arrow visible from either camera side.
    const sourceFrame=new ctx.T.Group();ctx.add(sourceFrame);
    for(const z of[-.97,.97])roundedCase(ctx,[-4.06,2.15,z],[.10,1.94,.055],'#236f9b',{metalness:.58,roughness:.27},.012,sourceFrame);
    for(const y of[1.2,3.1])roundedCase(ctx,[-4.06,y,0],[.10,.055,1.98],'#236f9b',{metalness:.58,roughness:.27},.012,sourceFrame);
    for(const z of[-.97,.97])for(const y of[1.23,3.07])fastener(ctx,sourceFrame,[-4.114,y,z],'x',.017);
    ctx.stand([-4,0,0],1.2);
    // A cutaway camera body: floor and rear rail stay visible without hiding the optical path.
    const floor=roundedCase(ctx,[2,.36,0],[4,.07,3.4],ctx.presentationMaterial('#c1d7dd',{metalness:.35,roughness:.42,emissiveIntensity:.10}),{},.018);
    const rear=roundedCase(ctx,[2,.56,-1.67],[4,.4,.06],ctx.presentationMaterial('#b5ccd4',{metalness:.35,roughness:.42,emissiveIntensity:.10}),{},.014);
    const brackets=new ctx.T.Group();ctx.add(brackets);
    for(const x of[.14,3.86]){roundedCase(ctx,[x,.395,-1.49],[.16,.045,.31],'#92a6b0',{metalness:.9,roughness:.3},.009,brackets);fastener(ctx,brackets,[x,.424,-1.43],'y',.029);roundedCase(ctx,[x,.48,-1.622],[.16,.20,.032],'#92a6b0',{metalness:.9,roughness:.3},.009,brackets);}
    ctx.label('物體',[-4,2.6,0]);ctx.label('孔片',[0,3.45,.8]);ctx.label('屏幕',[4.015,3.65,1.95]);
  }
  function projection(point,hole,ratio=1) {return [hole[0]*(1+ratio)-point[0]*ratio,hole[1]*(1+ratio)-point[1]*ratio];}
  function boundBook(ctx){
    const T=ctx.T,g=new T.Group();ctx.add(g);
    roundedCase(ctx,[0,1.065,0],[2.98,.2,2.12],'#d9d3c5',{roughness:.99,metalness:0},.010,g);
    // Small differences in the signature edges make this a bound paper block, not a painted cuboid.
    for(let i=0;i<15;i++){
      const y=.973+i*.0126,width=2.974-(i%3)*.0016,depth=2.114-(i%4)*.0014;
      roundedCase(ctx,[.002,y,0],[width,.0035,depth],i%3===0?'#ece6d9':'#e2ddcf',{roughness:1,metalness:0},.0015,g);
    }
    const cloth=fabricGrain(ctx.mat('#387a87',{roughness:.87,metalness:0}),190,.10);
    roundedCase(ctx,[0,.9475,0],[3.1,.035,2.2],cloth,{},.012,g);
    const spine=roundedCase(ctx,[-1.515,1.07,0],[.07,.26,2.2],fabricGrain(ctx.mat('#2a6471',{roughness:.89,metalness:0}),230,.12),{},.028,g);
    // The recessed hinge and sewn headbands stay away from the ray's point on the upper cover.
    for(const z of[-1.063,1.063]){
      roundedCase(ctx,[-1.436,1.064,z],[.074,.188,.016],'#c8bc9e',{roughness:1},.005,g);
      for(let i=0;i<12;i++)roundedCase(ctx,[-1.433,.984+i*.014,z+(z>0?.009:-.009)],[.069,.005,.004],i%2?'#6c8384':'#ded8c5',{roughness:1},.0015,g);
    }
    roundedCase(ctx,[-1.382,1.2005,0],[.013,.0015,2.08],'#265963',{roughness:1},.0005,g);
    roundedCase(ctx,[-1.405,.938,0],[.012,.003,2.08],'#265963',{roughness:1},.0007,g);
    ctx.box([0,1.205,-.45],[1.8,.007,.075],'#dde3d4',{roughness:.96,metalness:0});
  }
  function cutawayCase(ctx){
    const frame=new ctx.T.Group();ctx.add(frame);
    roundedCase(ctx,[0,.26,0],[10,.12,5.6],ctx.presentationMaterial('#cedee2',{roughness:.47,metalness:.25,emissiveIntensity:.13}),{},.035,frame);
    roundedCase(ctx,[0,1.5,-2.7],[10,2.4,.09],ctx.presentationMaterial('#dce7e7',{roughness:.54,metalness:.13,emissiveIntensity:.13}),{},.029,frame);
    for(const z of[-2.75,2.75])roundedCase(ctx,[0,.259,z],[9.88,.062,.044],'#91a5af',{metalness:.87,roughness:.29},.012,frame);
    for(const x of[-4.82,4.82]){
      roundedCase(ctx,[x,.341,-2.53],[.23,.05,.30],'#a7b6bd',{metalness:.85,roughness:.25},.009,frame);
      roundedCase(ctx,[x,.46,-2.64],[.23,.28,.03],'#a7b6bd',{metalness:.85,roughness:.25},.009,frame);
      fastener(ctx,frame,[x,.371,-2.47],'y',.038);fastener(ctx,frame,[x,.49,-2.619],'z',.036);
      for(const z of[-2.48,2.48])fastener(ctx,frame,[x,.325,z],'y',.035);
    }
  }
  function vacuumFittings(ctx,z){
    const T=ctx.T,steel=ctx.mat('#aabfc9',{metalness:.92,roughness:.25}),seal=ctx.mat('#405764',{metalness:.2,roughness:.75});
    for(const x of[-3.77,2.97]){const g=new T.Group();g.position.set(x,1.2,z);g.rotation.z=-PI/2;ctx.add(g);ringMesh(ctx,g,.55,.038,0,steel);ringMesh(ctx,g,.554,.017,.045,seal);ringMesh(ctx,g,.555,.023,-.05,steel);
      for(let i=0;i<8;i++){const a=i*PI/4;fastener(ctx,g,[.592*Math.cos(a),.01,.592*Math.sin(a)],'y',.025);}
    }
    const valve=new T.Group();valve.position.set(-.6,.62,z);ctx.add(valve);
    roundedCase(ctx,[0,-.015,0],[.25,.16,.25],'#829fae',{metalness:.88,roughness:.3},.034,valve);
    const stem=new T.Mesh(new T.CylinderGeometry(.085,.085,.18,32),steel);stem.position.y=.10;valve.add(stem);ringMesh(ctx,valve,.102,.018,.115,seal);
  }
  function tabletopRayBox(ctx,source,target,floorY){
    const T=ctx.T,g=new T.Group(),direction=new T.Vector3(...target).sub(new T.Vector3(...source)).normalize(),steel=ctx.mat('#afc0c9',{metalness:.9,roughness:.26}),rubber=ctx.mat('#34444f',{roughness:.9,metalness:0});
    g.name='tabletop-ray-box';g.position.fromArray(source);g.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),direction);ctx.add(g);
    // The offset body and all feet are on the left sheet; only a tiny low port reaches the axis.
    roundedCase(ctx,[.245,.056,-.154],[.42,.16,.28],'#2c6278',{metalness:.65,roughness:.3},.017,g);
    roundedCase(ctx,[.245,.139,-.154],[.378,.012,.242],steel,{},.005,g);
    for(const x of[.09,.40])for(const z of[-.06,-.24]){
      const foot=new T.Mesh(new T.CylinderGeometry(.026,.031,.021,24),rubber);foot.name='ray-box-foot';foot.position.set(x,floorY-source[1]+.0105,z);g.add(foot);
      fastener(ctx,g,[x,.147,z],'y',.018);
    }
    const knob=new T.Mesh(new T.CylinderGeometry(.050,.054,.033,32),rubber);knob.position.set(.29,.165,-.15);g.add(knob);
    for(let i=0;i<16;i++){const a=i*PI/8,grip=new T.Mesh(new T.BoxGeometry(.006,.031,.006),steel);grip.position.set(.29+.052*Math.cos(a),.165,-.15+.052*Math.sin(a));grip.rotation.y=-a;g.add(grip);}
    // Raised cantilever clears the folded sheet even at normal incidence; the port itself stays low.
    roundedCase(ctx,[.073,.056,-.054],[.182,.076,.078],steel,{},.008,g);
    roundedCase(ctx,[.006,.020,-.054],[.009,.03,.032],steel,{},.002,g);
    const socket=new T.Mesh(new T.CylinderGeometry(.0068,.0068,.069,40),rubber);socket.rotation.x=PI/2;socket.position.z=-.0365;g.add(socket);
    const rim=new T.Mesh(new T.TorusGeometry(.0055,.0018,8,40),steel);rim.position.z=-.003;g.add(rim);
    const port=new T.Mesh(new T.CircleGeometry(.004,32),ctx.mat('#ffe4a3',{emissive:'#ffe4a3',emissiveIntensity:1.5,roughness:.2,metalness:0}));g.add(port);
    // Keep the old lamp's display illumination unchanged, including its exact forward offset.
    const light=new T.PointLight('#ffe4a3',3.5,10,2);light.position.copy(new T.Vector3(...source).addScaledVector(direction,.3));ctx.add(light);
  }

  // Topic 01 is a self-contained dark-box experiment. The removed front and roof
  // are presentation cutaways, not openings that admit outside illumination.
  function darkRoomBox(ctx){
    const T=ctx.T,g=new T.Group();g.name='dark-room-cutaway';ctx.add(g);
    const shell=ctx.presentationMaterial('#253443',{roughness:.87,metalness:.06});
    const inside=ctx.presentationMaterial('#15222e',{roughness:1,metalness:0});
    const edge=ctx.presentationMaterial('#577183',{roughness:.48,metalness:.4});
    roundedCase(ctx,[0,.26,0],[9.8,.16,4.45],shell,{},.045,g);
    roundedCase(ctx,[0,.349,0],[9.55,.018,4.2],inside,{},.007,g);
    roundedCase(ctx,[0,2.13,-2.17],[9.8,3.66,.13],shell,{},.025,g);
    roundedCase(ctx,[4.82,2.13,0],[.16,3.66,4.45],shell,{},.025,g);
    // A continuous upper rim and four corner uprights communicate a closed box.
    for(const x of[-4.82,4.82])for(const z of[-2.17,2.17])roundedCase(ctx,[x,2.13,z],[.065,3.70,.065],edge,{},.013,g);
    for(const z of[-2.17,2.17])roundedCase(ctx,[0,3.98,z],[9.70,.075,.075],edge,{},.014,g);
    for(const x of[-4.82,4.82])roundedCase(ctx,[x,3.98,0],[.075,.075,4.4],edge,{},.014,g);
    roundedCase(ctx,[0,.40,2.17],[9.65,.10,.075],edge,{},.012,g);
    for(const x of[-4.65,4.65])for(const z of[-1.95,1.95])fastener(ctx,g,[x,.363,z],'y',.025);
    return g;
  }
  function darkBoxLED(ctx,source,enabled){
    const T=ctx.T,g=new T.Group();g.name='LED-emitter';g.position.fromArray(source);ctx.add(g);
    const metal=ctx.presentationMaterial('#a3b4bf',{metalness:.8,roughness:.31});
    const housing=ctx.presentationMaterial('#4b6a7a',{metalness:.3,roughness:.4});
    const stem=new T.Mesh(new T.CylinderGeometry(.065,.075,source[1]-.58,28),metal);stem.position.y=-(source[1]-.58)/2-.24;g.add(stem);
    const base=new T.Mesh(new T.CylinderGeometry(.37,.43,.12,48),housing);base.position.y=.42-source[1];base.castShadow=true;g.add(base);
    const socket=new T.Mesh(new T.CylinderGeometry(.20,.24,.17,40),housing);socket.position.y=-.17;g.add(socket);
    const rim=new T.Mesh(new T.TorusGeometry(.19,.025,10,48),metal);rim.rotation.x=PI/2;rim.position.y=-.072;g.add(rim);
    const bulb=new T.Mesh(new T.SphereGeometry(.185,40,28),new T.MeshStandardMaterial({color:enabled?'#fff3c5':'#566774',emissive:enabled?'#ffdd75':'#000000',emissiveIntensity:enabled?1.7:0,roughness:.27,metalness:0}));bulb.scale.y=1.24;g.add(bulb);
    if(enabled){const ledLight=new T.PointLight('#ffde93',4.5,8,2);ledLight.position.fromArray(source);ledLight.castShadow=true;ledLight.shadow.mapSize.set(1024,1024);ledLight.shadow.bias=-.001;ctx.add(ledLight);}
    return g;
  }
  function humanObserver(ctx,position,target){
    const T=ctx.T,g=new T.Group();g.name='human-observer';g.position.fromArray(position);
    g.rotation.y=Math.atan2(target[0]-position[0],target[2]-position[2]);ctx.add(g);
    const skin=ctx.presentationMaterial('#e7b189',{roughness:.72,metalness:0});
    const shirt=ctx.presentationMaterial('#42b9b0',{roughness:.84,metalness:0});
    const trousers=ctx.presentationMaterial('#263f58',{roughness:.9,metalness:0});
    const hair=ctx.presentationMaterial('#322924',{roughness:.94,metalness:0});
    const shoes=ctx.presentationMaterial('#e5e9e5',{roughness:.7,metalness:0});
    function ellipsoid(p,size,material){const o=new T.Mesh(new T.SphereGeometry(1,36,24),material);o.position.fromArray(p);o.scale.fromArray(size);o.castShadow=true;o.receiveShadow=true;g.add(o);return o;}
    function limb(a,b,r,material){const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av),o=new T.Mesh(new T.CylinderGeometry(r*.91,r,delta.length(),24),material);o.position.copy(av.clone().add(bv).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());o.castShadow=true;g.add(o);ellipsoid(a,[r,r,r],material);ellipsoid(b,[r,r,r],material);return o;}
    for(const side of[-1,1]){
      limb([side*.16,.27,0],[side*.16,.93,0],.135,trousers);
      ellipsoid([side*.16,.13,.08],[.15,.12,.25],shoes);
    }
    ellipsoid([0,1.26,0],[.40,.53,.26],shirt);
    ellipsoid([0,1.65,0],[.30,.19,.25],shirt);
    limb([0,1.67,0],[0,1.91,0],.145,skin);
    for(const side of[-1,1]){
      limb([side*.33,1.59,0],[side*.46,1.24,.03],.125,shirt);
      limb([side*.46,1.24,.03],[side*.43,.98,.12],.092,skin);
      ellipsoid([side*.43,.95,.12],[.10,.13,.09],skin);
    }
    // A complete, softly rounded head with real ears, hair, nose, cheeks and eyes.
    ellipsoid([0,2.15,0],[.39,.43,.34],skin);
    for(const side of[-1,1])ellipsoid([side*.385,2.12,-.01],[.068,.12,.055],skin);
    const cap=new T.Mesh(new T.SphereGeometry(1,40,24,0,2*PI,0,PI*.52),hair);cap.scale.set(.407,.46,.355);cap.position.set(0,2.18,-.023);g.add(cap);
    for(const [x,y,z,sx,sy,sz]of[[-.24,2.43,.16,.16,.16,.17],[-.03,2.48,.21,.18,.13,.14],[.19,2.45,.19,.14,.14,.14]])ellipsoid([x,y,z],[sx,sy,sz],hair);
    ellipsoid([0,2.10,.334],[.071,.085,.071],skin);
    const whites=ctx.presentationMaterial('#f8f4e9',{roughness:.4}),pupil=ctx.presentationMaterial('#253647',{roughness:.24});
    const pupils=[];
    for(const side of[-1,1]){
      ellipsoid([side*.139,2.22,.297],[.074,.067,.033],whites);
      const iris=ellipsoid([side*.139,2.22,.327],[.036,.042,.017],pupil);pupils.push(iris);
      ellipsoid([side*.139-.011,2.232,.342],[.008,.01,.005],whites);
      ellipsoid([side*.237,2.078,.266],[.062,.031,.018],ctx.presentationMaterial('#d98d7c',{roughness:.85}));
      const brow=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(side*.205,2.32,.281),new T.Vector3(side*.14,2.34,.311),new T.Vector3(side*.08,2.322,.322)]),12,.012,7,false),hair);g.add(brow);
    }
    const smile=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(-.08,2.005,.296),new T.Vector3(0,1.983,.318),new T.Vector3(.08,2.005,.296)]),16,.012,8,false),ctx.presentationMaterial('#8d5146',{roughness:.8}));g.add(smile);
    // End each optical ray on a pupil, not on the head centre or a floating eye.
    g.updateMatrixWorld(true);
    return {group:g,eyes:pupils.map(o=>o.localToWorld(new T.Vector3(0,0,1)).toArray())};
  }
  register(1,{
    title:'暗室中的玩偶看得見嗎？',question:'LED 的光，能經由玩偶到達人的眼睛嗎？',hint:'先判斷 LED 是否開啟，再觀察有沒有隔板。',
    controls:[toggle('led','LED 開關',true),toggle('partition','是否有隔板',false)],
    camera:{position:[-7.8,5.7,13],target:[0,1.8,0]},
    model(s){
      const ledOn=on(s.led),partitionOn=on(s.partition),illumination=ledOn&&!partitionOn?1:0,received=illumination,caseNo=!ledOn?1:partitionOn?3:2;
      return {status:!ledOn?'LED 關閉，觀察者看不見玩偶。':partitionOn?'隔板擋住照向玩偶的光，觀察者看不見玩偶。':'LED 照亮玩偶，反射光進入眼睛，觀察者看得見玩偶。',
        metrics:[metric('LED',ledOn?'開啟':'關閉'),metric('隔板',partitionOn?'有':'無'),metric('看見玩偶',received>0?'可以':'不可以')],
        values:{ledOn,partitionOn,illumination,received,visible:received>0,blocked:partitionOn,caseNo}};
    },
    build(ctx,s,m){
      const T=ctx.T,v=m.values,light=[-3.5,2.23,.85],toy=[0,1.32,0],partitionX=-1.8;ctx.setEnvironment({dark:true});
      // Neutral inspection illumination only helps read the cutaway apparatus.
      // The toy itself is independently dimmed by the experiment's model.
      const inspection=new T.DirectionalLight('#c4d6e4',1.25);inspection.position.set(-3,7,6);ctx.add(inspection);
      ctx.add(new T.HemisphereLight('#aec6da','#16232e',.46));darkRoomBox(ctx);
      doll(ctx,toy,1.45,v.illumination?'#d3a075':'#29343e',v.illumination);
      darkBoxLED(ctx,light,v.ledOn);
      const observer=humanObserver(ctx,[3.40,.36,.85],[0,2.5,.40]);
      if(v.partitionOn){
        const board=ctx.box([partitionX,2.145,0],[.11,3.57,4.17],'#293d4b',{roughness:1,metalness:0});board.name='opaque-partition';
        const panelFrame=ctx.presentationMaterial('#83a1af',{roughness:.52,metalness:.38});
        for(const z of[-2.07,2.07])roundedCase(ctx,[partitionX,2.145,z],[.15,3.61,.065],panelFrame,{},.013);
        roundedCase(ctx,[partitionX,3.935,0],[.15,.065,4.20],panelFrame,{},.013);
        ctx.label('不透光隔板',[partitionX,3.49,.70]);
      }
      if(v.ledOn){
        // Sample several distinct LED directions. All source-to-toy samples
        // stop at the actual front face of the opaque partition when present.
        const toyPoints=[[0,2.07,.39],[0,2.36,.47],[0,2.58,.33]];
        const otherEnds=[[-4.70,2.91,.15],[-4.70,1.42,1.53],[-3.80,3.89,-.05],[-2.87,3.89,1.42],[-2.80,.38,1.48],[-3.05,2.67,-2.07],[-2.43,1.35,-2.07],[-.75,3.89,-.94]];
        const clipAtPartition=q=>{if(!v.partitionOn||q[0]<partitionX-.058)return q;const t=(partitionX-.058-light[0])/(q[0]-light[0]);return add(light,mul(sub(q,light),t));};
        otherEnds.forEach(q=>ctx.ray([light,clipAtPartition(q)],'#f2c567',false,true));
        toyPoints.forEach((q,i)=>{ctx.ray([light,clipAtPartition(q)],'#ffd878',false,true);if(v.visible)ctx.ray([q,observer.eyes[i%2]],'#70dfd0',false,true);});
      }
      ctx.label('LED',[-3.5,2.77,.85]);ctx.label('3D 玩偶',[0,3.04,.10]);ctx.label('觀察者',[3.45,3.16,.75]);
    },
    details:['箱體採剖視呈現，面向你的箱壁與頂板省略，實驗中仍視為不透光的封閉暗室。器材的微亮外觀只是操作示意，不是另一個照明光源。',
      '先判斷 LED 開關，再判斷有無隔板。隔板位在 LED 與玩偶之間，橫跨箱體，擋住照向玩偶的直接光。',
      '黃色光路代表 LED 發出的多個方向；青綠色光路代表玩偶的部分反射光進入人的眼睛。光路線只是示意；玩偶本身不發光。',
      '此模型忽略黑色箱壁的微弱反射與邊緣繞射。LED 關閉或隔板擋住照明時，模型中沒有玩偶的光進入眼睛。']
  },[['LED 關閉、無隔板',{led:false,partition:false},v=>v.caseNo===1&&v.illumination===0&&v.received===0&&!v.visible],
    ['LED 關閉、有隔板',{led:false,partition:true},v=>v.caseNo===1&&v.illumination===0&&v.received===0&&!v.visible],
    ['LED 開啟、無隔板',{led:true,partition:false},v=>v.caseNo===2&&v.illumination===1&&v.received===1&&v.visible],
    ['LED 開啟、有隔板',{led:true,partition:true},v=>v.caseNo===3&&v.illumination===0&&v.received===0&&!v.visible],
    ['預設僅 LED 開啟',{},v=>v.ledOn&&!v.partitionOn&&v.visible],
    ['字串 false 仍關閉',{led:'false',partition:'false'},v=>!v.ledOn&&!v.partitionOn&&!v.visible]]);

  register(2,{
    title:'不同方向的感光器都收得到LED光嗎',question:'眼睛移動會改變配光嗎',hint:'移動眼睛，再遮住一個方向',
    controls:[toggle('light','LED',true),toggle('shield','左側遮片',false),select('observer','觀察者','none',[['none','未靠近'],['front','正前方'],['right','右前方']])],
    camera:{position:[9,6,11],target:[0,2.4,0]},
    model(s){const readings=on(s.light)?[160,on(s.shield)?0:90,90,70,65]:[0,0,0,0,0];return {status:!on(s.light)?'LED關閉':on(s.shield)?'只有被遮方向降到背景':'五個方向都有光，不必一樣亮',metrics:[metric('正前',readings[0]),metric('左／右',readings[1]+'／'+readings[2]),metric('上／下',readings[3]+'／'+readings[4])],values:{readings,front:readings[0],left:readings[1],right:readings[2],upper:readings[3],lower:readings[4]}};},
    build(ctx,s,m){const p=[-2,2.6,0],r=2.5,k=Math.SQRT1_2,dirs=[[1,0,0],[k,0,-k],[k,0,k],[k,k,0],[k,-k,0]],names=['正前','左前','右前','斜上','斜下'];
      ctx.sphere(p,.2,on(s.light)?'#ffdf9b':'#899093',{emissive:on(s.light)?'#ffd479':'#000000',roughness:.16,metalness:0});ctx.cylinder([-2,.3,0],[-2,2.4,0],.09,'#98b1be',{metalness:.88,roughness:.23});
      const emitter=new ctx.T.Group();emitter.position.fromArray(p);emitter.rotation.z=-PI/2;ctx.add(emitter);const ceramic=new ctx.T.Mesh(new ctx.T.CylinderGeometry(.20,.18,.12,48),ctx.mat('#e2e6dd',{roughness:.42,metalness:0}));ceramic.position.y=-.16;emitter.add(ceramic);ringMesh(ctx,emitter,.195,.016,-.098,ctx.mat('#a6bcc5',{metalness:.92,roughness:.25}));for(let i=0;i<3;i++){const a=i*2*PI/3;fastener(ctx,emitter,[.155*Math.cos(a),-.227,.155*Math.sin(a)],'y',.021);}
      dirs.forEach((d,i)=>{const q=add(p,mul(d,r));sensor(ctx,q,p,m.values.readings[i]>0);ctx.label(names[i]+' '+m.values.readings[i],q);if(on(s.light))ctx.ray([p,i===1&&on(s.shield)?add(p,mul(d,r*.47)):q]);});
      if(on(s.shield)){const q=add(p,mul(dirs[1],r*.5)),b=ctx.box(q,[.08,.7,.7],'#263340',{metalness:.08,roughness:.84});b.rotation.y=PI/4;ctx.stand([q[0],0,q[2]],q[1]-.35);}
      if(s.observer!=='none'){const e=s.observer==='front'?[2.05,2.9,-.6]:[1.5,2.9,2.7];ctx.eye(e,p);}
      ctx.label('LED',p);
    },details:['五個相同感光器與LED等距、正對光源。160、90、90、70、65 是原題教學配光值，任意單位，並非所有LED的實測特性。','觀察者只表示眼睛位置，不遮住器材；移動觀察者不會改變LED配光。遮片只攔截左前感光器的光路。','不同方向可能都有光，但不同方向亮度不必相同。']
  },[['五方向',{},v=>v.readings.length===5&&v.front===160&&v.lower===65],['遮片局部',{shield:true},v=>v.left===0&&v.right===90],['熄燈',{light:false},v=>v.readings.every(x=>x===0)],['眼位不影響',{observer:'right'},v=>v.front===160&&v.left===90&&v.upper===70]]);

  register(3,{
    title:'太空中的雷射訊號能傳遞嗎',question:'抽氣後光與聲音有何不同',hint:'換氣體狀態，再比較介質',
    controls:[select('gas','管內狀態','air',[['air','有空氣'],['evacuated','抽氣後'],['vacuum','理想真空']]),select('medium','透明介質','glass',[['air','空氣'],['water','水'],['glass','玻璃']]),range('angle','入射角',40,0,60,5,'°')],
    camera:{position:[9,7,11],target:[0,2.1,0]},
    model(s){const speed={air:3e8,water:2.25e8,glass:2e8}[s.medium]||3e8,n=3e8/speed,a=nval(s.angle,40),r=Math.asin(Math.sin(a*R)/n)/R;return {status:s.gas==='vacuum'?'理想真空仍能傳光':s.gas==='evacuated'?'抽氣後仍能收到光':'空氣中可收到光與聲音',metrics:[metric('聲音',{air:'可傳遞',evacuated:'減弱 未必消失',vacuum:'不能經真空傳聲'}[s.gas]),metric('光速',(speed/1e8).toFixed(2)+' ×10⁸ m/s'),metric('透射角',fmt(r)+'°')],values:{lightReceived:true,speed,n,incidence:a,refraction:r,residualGas:s.gas!=='vacuum',soundThroughGas:s.gas!=='vacuum'}};},
    build(ctx,s,m){const z=-1.9;ctx.cylinder([-3.8,1.2,z],[3,1.2,z],.55,'#a8dbe4',{transparent:true,opacity:.16,roughness:.12});ctx.lamp([-4.2,1.2,z],[3.4,1.2,z],'#ff766a',true);sensor(ctx,[3.5,1.2,z],[-4,1.2,z],true);ctx.ray([[-4.15,1.2,z],[3.4,1.2,z]],'#ff685d');
      vacuumFittings(ctx,z);
      const count=s.gas==='air'?22:s.gas==='evacuated'?3:0;for(let i=0;i<count;i++)ctx.sphere([-3.4+(i*1.271)%5.8,.85+(i*.293)% .7,z-.25+(i*.317)%.5],.045,'#8fa6b0');
      ctx.box([-.6,.32,z],[1.2,.6,1],'#2e7fa2',{metalness:.32,roughness:.3});ctx.label(s.gas==='vacuum'?'理想真空':s.gas==='evacuated'?'仍有殘氣':'有空氣',[0,1.2,z]);
      const p=[0,2.65,1.65],a=m.values.incidence*R,b=m.values.refraction*R,start=add(p,[-2.3*Math.cos(a),2.3*Math.sin(a),0]),end=add(p,[2.3*Math.cos(b),-2.3*Math.sin(b),0]);
      const mediumBox=ctx.box([1.5,2.3,1.65],[3,4,1.25],s.medium==='air'?'#d6e5ee':'#80c5d6',{transparent:true,opacity:s.medium==='air'?.045:.15,roughness:.12});if(s.medium!=='air')mediumBox.add(new ctx.T.LineSegments(new ctx.T.EdgesGeometry(mediumBox.geometry),new ctx.T.LineBasicMaterial({color:'#679eb2',transparent:true,opacity:.5,depthWrite:false})));ctx.lamp(start,p,'#ffe5a0',true);sensor(ctx,end,p,true);ctx.ray([start,p]);ctx.ray([p,end],'#6ce0d5');ctx.ray([[-1.1,2.65,1.65],[1.1,2.65,1.65]],'#96a8bb',true);
      ctx.label({air:'空氣',water:'水',glass:'玻璃'}[s.medium],[1.5,2.3,1.65]);ctx.label('介質內接收',end);
    },details:['上方抽氣裝置與下方介質槽是兩個分開的比較。抽氣後不等於絕對真空；殘餘氣體及固體支架仍可能傳聲。','下方光由空氣進入均勻介質，接收器位在該介質內，因此不畫第二次出射介面。光速是近似參考值，不是這台動畫實測。','在均勻介質內用直線光路；只有有透射的介面才使用折射角。忽略微弱反射與吸收。']
  },[['抽氣仍光',{gas:'evacuated'},v=>v.lightReceived&&v.residualGas],['真空光聲',{gas:'vacuum'},v=>v.lightReceived&&!v.soundThroughGas],['垂直玻璃',{medium:'glass',angle:0},v=>v.refraction===0&&v.speed===2e8],['空氣角度',{medium:'air',angle:60},v=>close(v.refraction,60)],['水速率',{medium:'water'},v=>v.speed===2.25e8&&v.refraction<v.incidence]]);

  register(4,{
    title:'手影大小由什麼決定',question:'同一物體為何有不同大小的影子',hint:'把小人移近光源或白幕',
    controls:[select('distance','距光源','20',[['20','20 cm'],['40','40 cm'],['60','60 cm'],['100','100 cm']]),toggle('present','放入小人',true),toggle('fill','補光燈',false)],camera:{position:[-10,6,11],target:[0,1.8,0]},
    model(s){const u=nval(s.distance,20),h=on(s.present)?360/u:0;return {status:!on(s.present)?'移開物體，原暗區消失':on(s.fill)?'原暗區收到補光':'靠近光源時，影子較大',metrics:[metric('物高','3 cm'),metric('影高',fmt(h)+' cm'),metric('燈到白幕','120 cm')],values:{u,shadowHeight:h,magnification:120/u,darkShadow:on(s.present)&&!on(s.fill)}};},
    build(ctx,s,m){const scale=.09,sx=-5.4,screen=5.4,cy=2.1,ox=sx+m.values.u*scale,h=.27;rail(ctx,sx,screen);ctx.lamp([sx,cy,0],[screen,cy,0],'#ffde99',true);ctx.screen([screen,cy,0],3.8,3.7);ctx.label('點光源',[sx,cy,0]);ctx.label('白幕',[screen-.035,3.75,1.5]);
      const person=[[-.23,-.5],[-.07,-.5],[0,-.18],[.07,-.5],[.23,-.5],[.12,0],[.36,-.1],[.42,.03],[.12,.18],[.12,.27],[.18,.35],[.12,.5],[-.12,.5],[-.18,.35],[-.12,.27],[-.12,.18],[-.42,.03],[-.36,-.1],[-.12,0]];
      if(on(s.present)){face(ctx,ox,cy,0,person.map(p=>p.map(v=>v*h)),'#18222c');ctx.stand([ox,0,0],cy-h/2);const mag=m.values.magnification;face(ctx,screen-.07,cy,0,person.map(p=>p.map(v=>v*h*mag)),on(s.fill)?'#bbbaa5':'#27333d');
        [[-.12,.5],[.23,-.5],[-.42,.03],[.42,.03]].forEach(q=>{const p=[ox,cy+q[1]*h,q[0]*h],end=[screen-.08,cy+q[1]*h*mag,q[0]*h*mag];ctx.ray([[sx,cy,0],p,end]);});ctx.label('小人 3 cm',[ox,cy,0]);}
      else ctx.ray([[sx,cy,0],[screen-.08,cy,0]]);
      if(on(s.fill)){const p=[4,3.8,2.1];ctx.lamp(p,[screen,cy,0],'#fff4bd',true);ctx.ray([p,[screen-.08,cy,0]],'#8ce3cc');ctx.label('補光燈',p);}
      ctx.ruler(sx,screen,.25,2.25,scale);ctx.label('120 cm',[0,.25,2.25]);
    },details:['小燈近似點光源，燈到白幕固定120 cm，直立小人高3 cm。世界座標按相同縮尺建立光源、物體和投影。','影高依相似三角形計算。補光讓原暗區得到另一盞燈的光，不會解除小人對第一盞燈的遮擋。','不處理有限光源造成的半影；光路線是計算輔助，不是清潔空氣中可見的發光線。']
  },[['20 cm',{distance:'20'},v=>v.shadowHeight===18],['40 cm',{distance:'40'},v=>v.shadowHeight===9],['60 cm',{distance:'60'},v=>v.shadowHeight===6],['100 cm',{distance:'100'},v=>v.shadowHeight===3.6],['移出',{present:false},v=>v.shadowHeight===0],['補光保留幾何影',{fill:true},v=>v.shadowHeight===18&&!v.darkShadow]]);

  register(5,{
    title:'針孔為什麼形成倒立影像',question:'上方與右側的記號會到哪裡',hint:'遮住上半或左半，再旋轉查看',
    controls:[select('mask','遮住物體','none',[['none','不遮'],['upper','上半'],['left','左半']]),toggle('center','中央亮點',true)],camera:{position:[-10,6,11],target:[.2,2,0]},
    model(s){const points=[[.72,0],[-.65,0],[.27,.67],[0,0]].map((p,i)=>({object:p,image:projection(p,[0,0]),visible:(s.mask!=='upper'||p[0]<=0)&&(s.mask!=='left'||p[1]>=0)&&(i!==3||on(s.center))}));return {status:'每個未遮住的物點，各自通過小孔',metrics:[metric('上下','相反'),metric('左右','相反'),metric('中央點',on(s.center)?'有對應像點':'已遮住')],values:{points,magnification:-1,invertedY:true,invertedZ:true,centerVisible:on(s.center)}};},
    build(ctx,s,m){pinholeBench(ctx,[[0,0]],.025);pattern(ctx,-4,2.15,0,{mask:s.mask,center:on(s.center)});pattern(ctx,4,2.15,0,{mask:s.mask,center:on(s.center),scale:-1});
      m.values.points.forEach((p,i)=>{if(p.visible)ctx.ray([[-4,2.15+p.object[0],p.object[1]],[0,2.15,0],[4,2.15+p.image[0],p.image[1]]],['#f4cc5d','#b796ec','#f58a77','#67dacf'][i]);});
      if(s.mask!=='none'){const upper=s.mask==='upper';ctx.box([-3.95,upper?2.61:2.15,upper?0:-.48],[.025,upper?.92:1.85,upper?1.9:.96],'#111c27',{roughness:.9,metalness:0});}
      ctx.line([[-4,1.1,0],[-4,1.1,.8]],'#91a4b4');ctx.label('房間右側',[-4,1.1,.8]);
    },details:['沒有透鏡，物距與孔屏距相等。固定房間座標中，上下與左右皆反向；旋轉相機不重新定義物體的左右。','孔片是有真實開孔的立體網格；像位由各物點通過孔心的直線投影決定。圖像亮度僅作觀察示意。','理想小孔模型不計繞射。物體亮點與像點顏色相同，小孔不替光染色。']
  },[['上下反轉',{},v=>v.points[0].image[0]<0&&v.points[1].image[0]>0],['左右反轉',{},v=>v.points[2].image[1]<0],['遮上',{mask:'upper'},v=>!v.points[0].visible&&v.points[1].visible],['中央獨立',{center:false},v=>!v.points[3].visible&&v.points[0].visible],['倍率',{},v=>v.magnification===-1]]);

  register(6,{
    title:'針孔越大影像越清楚嗎',question:'亮度和清晰度能一起增加嗎',hint:'比較孔徑，再開第二個孔',
    controls:[select('diameter','孔徑','0.5',[['0.5','0.5 mm'],['1','1 mm'],['3','3 mm']]),select('holes','孔數','1',[['1','單孔'],['2','雙孔'],['3','三孔']]),select('spacing','孔間距','2',[['0.5','0.5 cm'],['2','2 cm'],['4','4 cm']])],camera:{position:[-10,6,14],target:[.4,2.05,0]},
    model(s){const d=nval(s.diameter,.5),count=nval(s.holes,1),spacing=nval(s.spacing,2),holes=Array.from({length:count},(_,i)=>[0,(i-(count-1)/2)*spacing*.2]);return {status:count>1?'每個孔都形成一幅完整的像':'大孔較亮，單一物點也較散',metrics:[metric('通光量',fmt(count*(d/.5)**2)+' 倍'),metric('單點光斑',fmt(2*d)+' mm'),metric('完整像數',count+' 幅')],values:{diameter:d,count,holes,relativeFlux:count*(d/.5)**2,spotDiameterMm:2*d,imageCenters:holes.map(h=>projection([0,0],h))}};},
    build(ctx,s,m){const v=m.values;const radius=v.diameter*.01;pinholeBench(ctx,v.holes,radius,5);pattern(ctx,-4,2.15,0);const samples=v.diameter>=3?19:v.diameter>=1?9:1;
      v.holes.forEach((h,k)=>{const center=projection([0,0],h);for(let i=0;i<samples;i++){const a=i*2.399963,r=i===0?0:2*radius*Math.sqrt(i/(samples-1));pattern(ctx,4-i*.00001-k*.0001,2.15+center[0]+r*Math.sin(a),center[1]+r*Math.cos(a),{scale:-1,opacity:(v.diameter===.5?.45:v.diameter===1?.7:.95)/samples});}
        const point=[-4,2.78,0];[-1,1].forEach(sign=>{const hp=[0,2.15+h[0]+sign*radius,h[1]],out=[4,2*hp[1]-point[1],2*hp[2]-point[2]];ctx.ray([point,hp,out],'#f4ce6c');});
      });
    },details:['物距與孔屏距均20 cm；物體照明、曝光、每孔直徑不隨孔數改變。孔間距是相鄰孔中心距離。','幾何模型中通光量與總孔面積成正比，以單個0.5 mm孔為1；這是相對通光量，不是人眼感覺亮度的倍數。','同一物點的幾何光斑直徑為孔徑兩倍。有限孔徑以多條平直光路積分成像，雙孔或三孔各保留完整同色圖像。','真實極小孔會受繞射影響，不能將孔越小越清楚外推至無限小。螢幕顏色經顯示映射，請用獨立的光斑與通光量指標比較。']
  },[['小孔',{diameter:'0.5'},v=>v.relativeFlux===1&&v.spotDiameterMm===1],['一毫米',{diameter:'1'},v=>v.relativeFlux===4&&v.spotDiameterMm===2],['三毫米',{diameter:'3'},v=>v.relativeFlux===36&&v.spotDiameterMm===6],['雙孔',{holes:'2'},v=>v.count===2&&v.relativeFlux===2&&v.imageCenters[0][1]!==v.imageCenters[1][1]],['三孔',{holes:'3'},v=>v.count===3&&v.imageCenters.length===3],['間距',{holes:'2',spacing:'4'},v=>close(v.imageCenters[1][1]-v.imageCenters[0][1],1.6)]]);

  register(7,{
    title:'粗糙課本也會反射光嗎',question:'不發光的課本怎樣讓眼睛看見',hint:'更換表面，再移動接收器',
    controls:[toggle('light','照明',true),select('material','表面','book',[['mirror','鏡子'],['paper','白紙'],['book','課本'],['cloth','黑布']]),range('angle','接收角',40,10,75,5,'°'),select('azimuth','接收方位','0',[['0','正前'],['45','側前'],['90','側方']])],camera:{position:[8,7,11],target:[0,1.7,0]},
    model(s){const angle=nval(s.angle,40),az=nval(s.azimuth,0),d=[Math.sin(angle*R)*Math.cos(az*R),Math.cos(angle*R),Math.sin(angle*R)*Math.sin(az*R)],ideal=[Math.sin(40*R),Math.cos(40*R),0],inBeam=dot(d,ideal)>=Math.cos(3*R),rho={paper:.8,book:.5,cloth:.05,mirror:.9}[s.material]||.5,signal=!on(s.light)?0:s.material==='mirror'?(inBeam?rho:0):rho*Math.cos(angle*R);return {status:signal===0?'這個位置未收到反射光':s.material==='mirror'?'接收器在主要反射方向':'粗糙表面也會把光送入眼睛',metrics:[metric('表面',{mirror:'鏡子',paper:'白紙',book:'課本',cloth:'黑布'}[s.material]),metric('接收狀態',signal===0?'背景':s.material==='cloth'?'較弱，非零':'有反射光'),metric('入射角','40°')],values:{angle,azimuth:az,direction:d,signal,received:signal>0,inBeam}};},
    build(ctx,s,m){const p=[0,1.2,0],a=40*R,source=[-3.3*Math.sin(a),1.2+3.3*Math.cos(a),0],target=add(p,mul(m.values.direction,3.3));
      const colors={mirror:'#cbdde6',paper:'#e7e4dc',book:'#387a87',cloth:'#25262b'};if(s.material==='book')roundedCase(ctx,[0,1.1825,0],[3.1,.035,2.2],fabricGrain(ctx.mat(colors.book,{roughness:.9,metalness:0}),190,.10),{},.012);else ctx.box([0,1.12,0],[3.1,.16,2.2],colors[s.material],{roughness:s.material==='mirror'?.03:1,metalness:s.material==='mirror'?.97:0});ctx.stand([0,0,0],1.05);
      if(s.material==='mirror'&&ctx.planarMirror)ctx.planarMirror([0,1.205,0],3.1,2.2,[0,1,0]);
      if(s.material==='book')boundBook(ctx);
      if(s.material==='cloth')for(let i=0;i<18;i++)ctx.line([[-1.5,1.206,-1+i*.12],[1.5,1.206,-1+i*.12]],'#4e5054');
      ctx.lamp(source,p,'#ffe7a8',on(s.light));sensor(ctx,target,p,m.values.received);ctx.ray([p,add(p,[0,2.8,0])],'#93a2b0',true);
      if(on(s.light)){ctx.ray([source,p]);if(s.material==='mirror')ctx.ray([p,add(p,[3.3*Math.sin(a),3.3*Math.cos(a),0])],'#74d9d5');else{for(let i=0;i<11;i++){const t=(20+(i*17)%55)*R,f=i*2.399;ctx.ray([p,add(p,[2.1*Math.sin(t)*Math.cos(f),2.1*Math.cos(t),2.1*Math.sin(t)*Math.sin(f)])],'#8ac9ca');}ctx.ray([p,target],'#7be0cb');}}
      ctx.label('光源',source);ctx.label('接收器',target);ctx.label({mirror:'平整鏡面',paper:'白紙',book:'課本封面',cloth:'黑布'}[s.material],[.7,1.205,.5]);
    },details:['接收角從表面法線量起；方位改變是繞法線移動，因此可從立體空間比較不同接收位置。','光源只把窄束照在材料上；模型不計直接照到接收器的光。普通粗糙表面用半球漫反射近似，鏡面用有限寬光束。','材料反射強弱是定性模型，不是這些材料的實測反射率。黑色表面反射較弱，不等於完全不反射。']
  },[['無照明',{light:false},v=>v.signal===0],['課本側方',{material:'book',azimuth:'90'},v=>v.signal>0],['黑布仍反射',{material:'cloth',angle:75},v=>v.signal>0],['鏡面對準',{material:'mirror',angle:40,azimuth:'0'},v=>v.received],['鏡面偏方位',{material:'mirror',azimuth:'45'},v=>!v.received],['鏡面偏角',{material:'mirror',angle:75},v=>!v.received]]);

  register(8,{
    title:'粗糙鋁箔的反射還守定律嗎',question:'光向不同方向反射就沒有規律嗎',hint:'比較每個小面的法線和角度',
    controls:[select('surface','表面','rough',[['rough','粗糙面'],['flat','平整面']]),range('angle','共同入射',35,20,50,5,'°')],camera:{position:[8,7,11],target:[0,1.6,0]},
    model(s){const a=nval(s.angle,35),tilts=s.surface==='flat'?[0,0,0]:[-15,0,15],d=[Math.sin(a*R),-Math.cos(a*R),0],facets=tilts.map(t=>{const n=[Math.sin(t*R),Math.cos(t*R),0],r=reflect(d,n);return{tilt:t,normal:n,incoming:d,outgoing:r,incidence:Math.acos(Math.max(-1,Math.min(1,-dot(d,n))))/R,reflection:Math.acos(Math.max(-1,Math.min(1,dot(r,n))))/R};});return{status:s.surface==='flat'?'法線相同，平行光同向反射':'每一小面仍然等角反射',metrics:facets.map((f,i)=>metric('小面'+(i+1),fmt(f.incidence)+'° = '+fmt(f.reflection)+'°')),values:{facets,angle:a}};},
    build(ctx,s,m){m.values.facets.forEach((f,i)=>{const p=[-3+i*3,1.35,0];mirror(ctx,p,1.85,1.7,-f.tilt*R);ctx.ray([add(p,mul(f.incoming,-2.5)),p]);ctx.ray([p,add(p,mul(f.outgoing,2.5))],'#73dbd2');ctx.ray([add(p,mul(f.normal,-.35)),add(p,mul(f.normal,2))],'#96a4b7',true);ctx.lamp(add(p,mul(f.incoming,-2.5)),p,'#ffe4a1',true);ctx.label('小面'+(i+1)+' '+fmt(f.incidence)+'°',p);});},
    details:['粗糙鋁箔放大為三片朝向不同的小鏡面。所有入射光方向相同，角度分別從各處局部法線量起。','預設三處為20°、35°、50°，是幾何模型計算，不是真實鋁箔逐點實測。三片均使用向量反射式，並非任意指定反射方向。','平整與粗糙只改變局部表面朝向；鏡面位置與材質保持相同。']
  },[['預設三角',{},v=>v.facets.every((f,i)=>close(f.incidence,[20,35,50][i]))],['全部等角',{},v=>v.facets.every(f=>close(f.incidence,f.reflection))],['平面共向',{surface:'flat'},v=>v.facets.every(f=>close(f.outgoing[0],v.facets[0].outgoing[0]))],['低角邊界',{angle:20},v=>v.facets.every(f=>f.incidence>=0&&close(f.incidence,f.reflection))],['高角邊界',{angle:50},v=>v.facets.every(f=>f.incidence<90&&close(f.incidence,f.reflection))]]);

  register(9,{
    title:'反射角應該從哪裡量',question:'鏡面與法線量到的是同一個角嗎',hint:'換量角基準，再折起右側紙',
    controls:[range('angle','入射角',40,0,70,5,'°'),select('reference','量角基準','normal',[['normal','法線'],['surface','鏡面']]),toggle('fold','折起接光紙',false)],camera:{position:[8,8,10],target:[0,1.1,1.5]},
    model(s){const a=nval(s.angle,40);return{status:s.reference==='normal'?'入射角與反射角從法線量起':'這是與鏡面夾角，不叫入射角',metrics:[metric('入射／反射',a+'°／'+a+'°'),metric('目前量角',(s.reference==='normal'?a:90-a)+'°'),metric('紙上原亮線',on(s.fold)?a===0?'與折線重疊':'不在折起紙面':'留在原平面')],values:{incidence:a,reflection:a,surfaceAngle:90-a,shownAngle:s.reference==='normal'?a:90-a,onPaper:!on(s.fold)||a===0,coplanar:true}};},
    build(ctx,s,m){const y=1.08,a=m.values.incidence*R,p=[0,y+.025,0],L=3.7,source=[-L*Math.sin(a),p[1],L*Math.cos(a)],end=[L*Math.sin(a),p[1],L*Math.cos(a)];
      ctx.box([-2,y-.06,2],[4,.08,4],'#d4d6cc',{roughness:.96,metalness:0});const f=on(s.fold)?55*R:0;const sheet=ctx.box([2*Math.cos(f),y-.06+2*Math.sin(f),2],[4,.08,4],'#e5e3d7',{roughness:.96,metalness:0});sheet.rotation.z=f;
      if(ctx.planarMirror)ctx.planarMirror([0,1.8,0],8,1.6,[0,0,1]);
      else ctx.box([0,1.8,-.06],[8,1.6,.12],'#bfdae4',{metalness:.98,roughness:.035});ctx.stand([-3.7,0,-.1],1.8);ctx.stand([3.7,0,-.1],1.8);
      tabletopRayBox(ctx,source,p,y-.02);ctx.ray([source,p]);ctx.ray([p,end],'#62d8d6');ctx.ray([[0,p[1],-.5],[0,p[1],3.9]],'#7e8e9e',true);
      const arc=(from,to,color)=>ctx.line(Array.from({length:33},(_,i)=>{const t=from+(to-from)*i/32;return[.95*Math.sin(t),p[1]+.04,.95*Math.cos(t)];}),color);
      if(s.reference==='normal'){arc(-a,0,'#f2bc46');arc(0,a,'#3ea9b3');}else{arc(-PI/2,-a,'#f2bc46');arc(a,PI/2,'#3ea9b3');}
      const angleMid=s.reference==='normal'?a/2:(PI/2+a)/2;
      ctx.label('鏡面',[0,1.8,0]);ctx.label('法線',[0,p[1],3.8]);ctx.label(m.values.shownAngle+'°',[-.95*Math.sin(angleMid),p[1]+.04,.95*Math.cos(angleMid)]);ctx.label(m.values.shownAngle+'°',[.95*Math.sin(angleMid),p[1]+.04,.95*Math.cos(angleMid)]);if(on(s.fold))ctx.label('紙已折起',[2.4*Math.cos(f)-.04*Math.sin(f),y-.06+2.4*Math.sin(f)+.04*Math.cos(f),3]);
    },details:['鏡面垂直接光紙。入射光、反射光與法線位於同一原紙面，旋轉相機只改變觀看方向。','相對鏡面的兩個餘角也相等，但依定義不是入射角與反射角。0°入射時兩條路徑重疊，且位於兩紙共同折線，不能用這個特例檢驗離面現象。','折起的紙繞原紙面中線轉動；反射光的傳播平面不跟著紙改變。可見光路線是輔助線，非清潔空氣中的真實亮線。']
  },[['垂直',{angle:0},v=>v.incidence===0&&v.surfaceAngle===90],['七十度',{angle:70},v=>v.reflection===70&&v.surfaceAngle===20],['改基準',{angle:20,reference:'surface'},v=>v.shownAngle===70&&v.incidence===20],['折紙不改光',{fold:true},v=>!v.onPaper&&v.coplanar&&v.reflection===40],['原紙',{fold:false},v=>v.onPaper],['折線特例',{fold:true,angle:0},v=>v.onPaper&&v.reflection===0]]);

  register(10,{
    title:'交換雷射與感光器後路徑會改變嗎',question:'沿原路反向射入，光會到哪裡',hint:'交換兩端，再改瞄準或鏡面',
    controls:[select('direction','光源位置','forward',[['forward','A到B'],['reverse','B到A']]),toggle('aligned','對準M點',true),range('tilt','鏡面轉角',0,-15,15,5,'°')],camera:{position:[8,7,11],target:[0,2,0]},
    model(s){const t=nval(s.tilt,0)*R,A=[-3,3.7,0],B=[3,3.7,0],source=s.direction==='forward'?A:B,target=s.direction==='forward'?B:A,offset=on(s.aligned)?0:.8,hit=[offset*Math.cos(t),1.3+offset*Math.sin(t),0],normal=[-Math.sin(t),Math.cos(t),0],incoming=norm(sub(hit,source)),outgoing=reflect(incoming,normal),to=sub(target,hit),along=dot(to,outgoing),miss=Math.sqrt(Math.max(0,dot(to,to)-along*along)),received=along>0&&miss<.15;let length=received?along:5;
      outgoing.forEach((v,i)=>{const low=[-6,.15,-3][i],high=[6,4.8,3][i];if(v>0)length=Math.min(length,(high-hit[i])/v);else if(v<0)length=Math.min(length,(low-hit[i])/v);});
      const end=add(hit,mul(outgoing,Math.max(0,length)));return{status:received?'感光器收到光':'光未射入原感光器',metrics:[metric('方向',s.direction==='forward'?'A → M → B':'B → M → A'),metric('鏡面轉角',nval(s.tilt,0)+'°'),metric('接收器',received?'亮起':'未亮')],values:{source,target,hit,normal,incoming,outgoing,end,received,miss}};},
    build(ctx,s,m){const v=m.values;mirror(ctx,[0,1.3,0],5,2.2,nval(s.tilt,0)*R);ctx.lamp(v.source,v.hit,'#ffe3a0',true);sensor(ctx,v.target,v.hit,v.received);ctx.ray([v.source,v.hit]);ctx.ray([v.hit,v.end],'#64dace');ctx.ray([add(v.hit,mul(v.normal,-.3)),add(v.hit,mul(v.normal,1.8))],'#93a7b9',true);ctx.sphere([0,1.35,0],.055,'#f58a73');
      ctx.label(s.direction==='forward'?'A 光源':'A 感光器',[-3,3.7,0]);ctx.label(s.direction==='forward'?'B 感光器':'B 光源',[3,3.7,0]);ctx.label('原M點',[0,1.35,0]);
    },details:['A與B固定；光源瞄準鏡面上的實際入射點，反射方向由該處法線按向量定律計算。','只有沿原光路反向射入並保持鏡面方向，才能比較同一可逆光路。交換位置不等於自動瞄準。','順向與反向的實際光路都用實線，虛線只表示法線。接收器有有限孔徑，偏離可使其無光。']
  },[['順向命中',{direction:'forward'},v=>v.received],['反向命中',{direction:'reverse'},v=>v.received],['偏離M',{direction:'reverse',aligned:false},v=>!v.received],['鏡面傾斜',{tilt:10},v=>!v.received],['負傾角',{tilt:-15},v=>!v.received],['等角向量',{},v=>close(-dot(v.incoming,v.normal),dot(v.outgoing,v.normal))]]);
})();
