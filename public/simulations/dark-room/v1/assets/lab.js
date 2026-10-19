/* Optical Lab • real WebGL scene, independent analytic models, offline. */
(()=>{'use strict';
const topics=new Map();
const api=window.OpticsLab={register:(id,def)=>{if(topics.has(id))throw Error('Duplicate topic '+id);topics.set(id,def);},topics};
const T=window.THREE,V=a=>new T.Vector3(...a),$=id=>document.getElementById(id);
const palette={metal:'#526577',white:'#f0eee6',glass:'#b8e1ed',ink:'#1d384d',ray:'#f8b84b'};
const topicThemes=[
 {end:3,name:'光與視覺',accent:'#087b99',dark:'#075c76',soft:'#e4f5fa',edge:'#b5dce7',hardware:'#26788d'},
 {end:6,name:'影子與針孔',accent:'#aa631d',dark:'#825020',soft:'#fff2dd',edge:'#ead3a7',hardware:'#356c88'},
 {end:10,name:'光的反射',accent:'#17856d',dark:'#116953',soft:'#e4f5ef',edge:'#b9dfd1',hardware:'#287c75'},
 {end:14,name:'鏡面成像',accent:'#7860a4',dark:'#5d4689',soft:'#f0eafb',edge:'#d7c9e9',hardware:'#566e9a'},
 {end:18,name:'折射與視位置',accent:'#087f9c',dark:'#066079',soft:'#e3f5fb',edge:'#b3dce9',hardware:'#2b7997'},
 {end:24,name:'透鏡與成像',accent:'#526bc4',dark:'#3c529c',soft:'#ebeffe',edge:'#c7d2f4',hardware:'#4c6f9c'},
 {end:26,name:'眼睛與視力',accent:'#be5c58',dark:'#943d41',soft:'#fff0ea',edge:'#eec9bf',hardware:'#367a89'},
 {end:32,name:'色散與顏色',accent:'#a14d86',dark:'#7e3967',soft:'#f9eaf3',edge:'#e8c6dc',hardware:'#446d87'}
];
let topicTheme=topicThemes[0];
function applyTopicTheme(id){topicTheme=topicThemes.find(t=>id<=t.end)||topicThemes[0];const root=document.documentElement;for(const [key,value]of Object.entries(topicTheme))if(['accent','dark','soft','edge'].includes(key))root.style.setProperty(key==='accent'?'--accent':'--accent-'+key,value);root.style.setProperty('--blue',topicTheme.accent);document.body.dataset.topic=String(id);let family=document.querySelector('.topic-family');if(!family){family=document.createElement('p');family.className='topic-family';$('title').before(family);}family.textContent=topicTheme.name;}
let renderer,scene,camera,content,rays,guides,labels=[],labelRoot,model,state,definition,hemisphere,keyLight,fillLight,envMap;
let viewport,raf=0,dirty=true,orbit={},cameraDefault={},showRays=true,showLabels=true,renderCount=0,resizeObserver;
let comparisonData=null,comparisonRenderer,comparisonScene,comparisonCamera,comparisonGroup,comparisonBox;
const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
let showFlow=!motionPreference.matches,manualFlowChoice=null,sceneVisible=true,flowPaths=[],flowParticles=[],flowPoints=null,flowTime=0,flowSampleTime=0,lastFlowTick=null,lastPaint=0,refreshReflections=true;
const materials=[];const resources=[];
function mat(color,options={}){const {virtual,axis,...settings}=options;const opacity=options.opacity??1;const m=new T.MeshStandardMaterial({color,roughness:.45,metalness:.05,...settings,transparent:options.transparent??opacity<1,opacity,depthWrite:opacity>=1});materials.push(m);return m;}
// Presentation surfaces remain readable even when the experiment's light is off.
// Never use this material on an object whose observed colour is a learning outcome.
function presentationMaterial(color,options={}){const {emissiveIntensity,emissive,...physical}=options;const m=new T.MeshPhysicalMaterial({color,roughness:.52,metalness:0,envMap,envMapIntensity:1.05,...physical});m.userData.presentationOnly=true;return m;}
function enamel(color=topicTheme.hardware){const m=presentationMaterial(color,{roughness:.27,metalness:.45,clearcoat:.32,clearcoatRoughness:.22});materials.push(m);return m;}
// Rounded manufacturing edges are confined to mounts and housings, never optical surfaces.
function roundedGeometry(width,height,depth,radius=.04){const r=Math.min(radius,width*.22,height*.22,depth*.22),shape=new T.Shape(),x=width/2-r,y=height/2-r;shape.moveTo(-x,-y);shape.lineTo(x,-y);shape.lineTo(x,y);shape.lineTo(-x,y);shape.closePath();const geometry=new T.ExtrudeGeometry(shape,{depth:depth-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:4,steps:1,curveSegments:8});geometry.translate(0,0,-depth/2+r);return geometry;}
function screw(parent,pos,r=.026,axis='y'){const material=presentationMaterial('#aebcc4',{metalness:.9,roughness:.22}),head=new T.Mesh(new T.CylinderGeometry(r,r,r*.5,16),material);head.position.set(...pos);if(axis==='x')head.rotation.z=Math.PI/2;if(axis==='z')head.rotation.x=Math.PI/2;parent.add(head);const slot=new T.Mesh(new T.BoxGeometry(r*1.24,r*.04,r*.22),presentationMaterial('#3d4b54',{metalness:.6,roughness:.45}));slot.position.y=r*.27;head.add(slot);return head;}
function contactShadow(parent,pos,rx=.5,rz=rx,opacity=.18){const material=new T.ShaderMaterial({uniforms:{strength:{value:opacity}},vertexShader:'varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform float strength;void main(){float a=(1.-smoothstep(.08,1.,length(p)));gl_FragColor=vec4(.12,.17,.19,a*a*strength);}',transparent:true,depthWrite:false});const shadow=new T.Mesh(new T.PlaneGeometry(rx*2,rz*2),material);shadow.rotation.x=-Math.PI/2;shadow.position.set(pos[0],pos[1]+.004,pos[2]);parent.add(shadow);return shadow;}
function add(obj,parent=content){parent.add(obj);return obj;}
function mesh(geometry,material,pos,parent){const o=new T.Mesh(geometry,material);o.position.copy(V(pos));o.castShadow=true;o.receiveShadow=true;add(o,parent);return o;}
function box(pos,size,color,opts){return mesh(new T.BoxGeometry(...size),mat(color,opts),pos);}
function sphere(pos,r,color,opts){return mesh(new T.SphereGeometry(r,40,24),mat(color,opts),pos);}
function segment(a,b,r,color,opts={},parent=content){const av=V(a),bv=V(b),d=bv.clone().sub(av),len=d.length();if(len<1e-7)return new T.Group();const o=mesh(new T.CylinderGeometry(r,r,len,12),mat(color,opts),av.clone().add(bv).multiplyScalar(.5).toArray(),parent);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o;}
function line(points,color=palette.ink,dashed=false,parent=content){const geometry=new T.BufferGeometry().setFromPoints(points.map(V));const material=dashed?new T.LineDashedMaterial({color,dashSize:.13,gapSize:.1,transparent:true,opacity:.75}):new T.LineBasicMaterial({color});const o=new T.Line(geometry,material);o.computeLineDistances();add(o,parent);return o;}
function ray(points,color=palette.ray,dashed=false,flow=true,flowPower=null){
 if(points.length<2)return;
 if(dashed)return line(points,color,true,rays);
 if(flow){const vertices=points.map(V),lengths=[0];for(let i=1;i<vertices.length;i++)lengths.push(lengths[i-1]+vertices[i].distanceTo(vertices[i-1]));const length=lengths.at(-1),power=flowPower===null?null:Math.max(0,Math.min(1,Number(flowPower)||0));if(Number.isFinite(length)&&length>.04)flowPaths.push({vertices,lengths,length,color,power});}
 const g=new T.Group();for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];const beam=segment(a,b,.014,color,{},g);if(beam.material){beam.material.dispose();beam.material=new T.MeshBasicMaterial({color,toneMapped:false,depthWrite:false});beam.castShadow=false;}
  const d=V(b).sub(V(a)),len=d.length();if(len>.38){const at=V(a).addScaledVector(d,.56);const tip=new T.Mesh(new T.ConeGeometry(.044,.14,12),new T.MeshBasicMaterial({color,depthWrite:false}));tip.position.copy(at);tip.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());g.add(tip);}
 }return add(g,rays);
}
function createFlow(){
 if(!flowPaths.length)return;
 const positions=[],colors=[],alphas=[];flowParticles=[];
 // Intensity-controlled rays use a gentler eight-dot range, without brightening-driven speed changes.
 // Keep a visible sample for nonzero background light; all other rays retain their original density.
 flowPaths.forEach((path,pathIndex)=>{const count=path.power===null?Math.max(2,Math.min(20,Math.ceil(path.length/1.05))):path.power>0?Math.max(1,Math.round(8*path.power)):0,color=new T.Color(path.color);for(let i=0;i<count;i++){flowParticles.push({pathIndex,phase:i/count,distance:0});positions.push(0,0,0);colors.push(color.r,color.g,color.b);alphas.push(1);}});
 if(!flowParticles.length)return;
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage));geometry.setAttribute('flowColor',new T.Float32BufferAttribute(colors,3));geometry.setAttribute('flowAlpha',new T.Float32BufferAttribute(alphas,1).setUsage(T.DynamicDrawUsage));
 const material=new T.ShaderMaterial({uniforms:{pointScale:{value:1},pixelRatio:{value:renderer.getPixelRatio()}},transparent:true,depthTest:true,depthWrite:false,toneMapped:false,
  vertexShader:'attribute vec3 flowColor; attribute float flowAlpha; uniform float pointScale; uniform float pixelRatio; varying vec3 vFlowColor; varying float vFlowAlpha; void main(){vFlowColor=flowColor;vFlowAlpha=flowAlpha;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(.10*pointScale/max(.1,-p.z),3.5*pixelRatio,11.*pixelRatio);}',
  fragmentShader:'varying vec3 vFlowColor; varying float vFlowAlpha; void main(){float r=length(gl_PointCoord-vec2(.5))*2.;float edge=1.-smoothstep(.68,1.,r);float core=1.-smoothstep(.08,.57,r);float alpha=edge*vFlowAlpha*.96;if(alpha<.012)discard;vec3 c=mix(vFlowColor,vec3(1.),core*.90);c=mix(c,vFlowColor*.48,smoothstep(.66,.98,r)*.65);gl_FragColor=vec4(c,alpha);\n#include <colorspace_fragment>\n}'});
 flowPoints=new T.Points(geometry,material);flowPoints.frustumCulled=false;flowPoints.renderOrder=4;flowPoints.visible=showFlow;add(flowPoints,rays);updateFlow();
}
function updateFlow(){
 if(!flowPoints)return;flowSampleTime=flowTime;const position=flowPoints.geometry.attributes.position,alpha=flowPoints.geometry.attributes.flowAlpha;
 for(let i=0;i<flowParticles.length;i++){const particle=flowParticles[i],path=flowPaths[particle.pathIndex],speed=path.power===null?1.3:.45,distance=(flowTime*speed+particle.phase*path.length)%path.length;particle.distance=distance;let segmentIndex=1;while(segmentIndex<path.lengths.length-1&&path.lengths[segmentIndex]<distance)segmentIndex++;const start=path.vertices[segmentIndex-1],end=path.vertices[segmentIndex],length=path.lengths[segmentIndex]-path.lengths[segmentIndex-1],t=length>1e-8?(distance-path.lengths[segmentIndex-1])/length:0;position.setXYZ(i,start.x+(end.x-start.x)*t,start.y+(end.y-start.y)*t,start.z+(end.z-start.z)*t);const fade=Math.min(.14,path.length*.12);alpha.setX(i,Math.min(1,distance/fade,(path.length-distance)/fade));}
 position.needsUpdate=true;alpha.needsUpdate=true;flowPoints.material.uniforms.pointScale.value=viewport.clientHeight*renderer.getPixelRatio()*camera.projectionMatrix.elements[5]*.5;
}
function flowRunning(){return showFlow&&showRays&&flowParticles.length>0&&sceneVisible&&!document.hidden;}
function flowSnapshot(){return {enabled:showFlow,running:flowRunning(),time:flowSampleTime,pathCount:flowPaths.length,particleCount:flowParticles.length,paths:flowPaths.map(p=>({points:p.vertices.map(v=>v.toArray()),length:p.length,color:p.color,power:p.power})),particles:flowParticles.map((p,i)=>({path:p.pathIndex,distance:p.distance,position:Array.from(flowPoints.geometry.attributes.position.array.slice(i*3,i*3+3))}))};}
function label(text,pos,opts={}){const el=document.createElement('span');el.className='scene-label'+(opts.kind?' '+opts.kind:'');el.textContent=text;el.dataset.labelId=String(labels.length);labelRoot.append(el);labels.push({el,point:pos?.isObject3D?null:V(pos),object:pos?.isObject3D?pos:null,localPoint:V(opts.localAnchor||[0,0,0]),opts,index:labels.length,slot:null,last:null});return el;}
function labelWorldPoint(lab){return lab.object?lab.object.localToWorld(lab.localPoint.clone()):lab.point.clone();}
const labelRaycaster=new T.Raycaster();
function labelOccluded(lab,world){
 if(!lab.opts.occlude)return false;
 const direction=world.clone().sub(camera.position),distance=direction.length(),margin=lab.opts.occlusionRadius??.05;if(distance<=margin)return false;
 labelRaycaster.set(camera.position,direction.normalize());labelRaycaster.near=0;labelRaycaster.far=distance-margin;
 return labelRaycaster.intersectObjects(content.children,true).some(hit=>{
  if(!hit.object.isMesh)return false;for(let o=hit.object;o;o=o.parent){if(!o.visible||o===rays||o===guides||o===lab.object)return false;}
  const m=Array.isArray(hit.object.material)?hit.object.material[hit.face?.materialIndex||0]:hit.object.material;
  return m&&m.visible!==false&&(m.opacity??1)>.9&&(m.transmission??0)<.1;
 });
}
function arrow(base,height,color='#c76b3a',opts={}){
 const group=new T.Group(),h=Math.abs(height),sgn=Math.sign(height)||1,r=Math.max(.025,Math.min(.07,h*.06)),head=Math.min(.28,h*.3),m=mat(color,opts);
 const shaft=new T.Mesh(new T.CylinderGeometry(r,r,Math.max(.005,h-head),16),m);shaft.position.set(base[0],base[1]+sgn*(h-head)/2,base[2]);group.add(shaft);
 const tip=new T.Mesh(new T.ConeGeometry(r*2.5,Math.max(.01,head),24),m);tip.position.set(base[0],base[1]+sgn*(h-head/2),base[2]);if(sgn<0)tip.rotation.z=Math.PI;group.add(tip);
 group.traverse(o=>{if(o.isMesh){o.castShadow=!opts.virtual;o.receiveShadow=true;}});return add(group,opts.virtual?guides:content);
}
function stand(pos,height=1,color=palette.metal){const g=new T.Group(),metal=presentationMaterial('#becad0',{metalness:.94,roughness:.19}),coat=enamel(color===palette.metal?topicTheme.hardware:color);const rod=segment(pos,[pos[0],pos[1]+height,pos[2]],.038,'#becad0',{},g);rod.material.dispose();rod.material=metal;
 mesh(roundedGeometry(.68,.10,.56,.035),coat,[pos[0],pos[1]+.065,pos[2]],g);mesh(new T.CylinderGeometry(.116,.135,.18,40),metal,[pos[0],pos[1]+.19,pos[2]],g);
 const clamp=mesh(new T.CylinderGeometry(.095,.095,.10,36),coat,[pos[0],pos[1]+Math.min(height*.6,.62),pos[2]],g);const thumb=new T.Mesh(new T.CylinderGeometry(.05,.05,.13,24),metal);thumb.rotation.z=Math.PI/2;thumb.position.x=.118;clamp.add(thumb);
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2,ridge=new T.Mesh(new T.BoxGeometry(.035,.012,.012),presentationMaterial('#667d8c',{metalness:.8,roughness:.35}));ridge.position.set(.17,Math.cos(a)*.048,Math.sin(a)*.048);ridge.rotation.x=a;clamp.add(ridge);}
 for(const dx of[-.24,.24])screw(g,[pos[0]+dx,pos[1]+.121,pos[2]],.027);for(const dx of[-.25,.25])for(const dz of[-.19,.19])mesh(new T.CylinderGeometry(.045,.052,.028,16),presentationMaterial('#414c53',{roughness:.88}),[pos[0]+dx,pos[1]+.014,pos[2]+dz],g);contactShadow(g,pos,.46,.38);return add(g);}
function lamp(pos,target,color='#fff1ce',on=true,floorY=0){
 const g=new T.Group(),direction=V(target).sub(V(pos)).normalize();g.position.copy(V(pos));g.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction);
 const barrel=new T.Mesh(new T.CylinderGeometry(.2,.22,.48,48),[enamel(),presentationMaterial('#3c5262',{metalness:.55,roughness:.3}),presentationMaterial('#3c5262',{metalness:.55,roughness:.3})]);g.add(barrel);
 const rim=new T.Mesh(new T.CylinderGeometry(.225,.225,.055,64),presentationMaterial('#c0d4db',{metalness:.93,roughness:.18}));rim.position.y=.24;g.add(rim);
 for(const yy of[-.21,-.16,.16]){const band=new T.Mesh(new T.TorusGeometry(.213,.008,8,48),presentationMaterial('#758995',{metalness:.9,roughness:.25}));band.rotation.x=Math.PI/2;band.position.y=yy;g.add(band);}
 for(let i=0;i<24;i++){const a=i/24*Math.PI*2,grip=new T.Mesh(new T.BoxGeometry(.01,.065,.009),presentationMaterial('#7693a2',{metalness:.7,roughness:.38}));grip.position.set(Math.cos(a)*.218,.20,Math.sin(a)*.218);grip.rotation.y=-a;g.add(grip);}
 const socket=new T.Mesh(new T.CylinderGeometry(.066,.066,.028,32),presentationMaterial('#3f4b56',{metalness:.6,roughness:.3}));socket.position.y=-.254;g.add(socket);
 const face=new T.Mesh(new T.CircleGeometry(.175,40),new T.MeshStandardMaterial({color:on?color:'#28343c',emissive:on?color:'#000000',emissiveIntensity:on?1.5:0,roughness:.2}));face.rotation.x=-Math.PI/2;face.position.y=.271;g.add(face);add(g);
 if(on){const l=new T.PointLight(color,3.5,10,2);l.position.copy(V(pos).addScaledVector(direction,.3));add(l);}
 const mount=new T.Group(),steel=presentationMaterial('#b8c6ce',{metalness:.94,roughness:.19}),black=presentationMaterial('#354f60',{metalness:.65,roughness:.28});
 mesh(new T.CylinderGeometry(.067,.078,.20,32),steel,[pos[0],pos[1]-.38,pos[2]],mount);mesh(new T.SphereGeometry(.086,28,18),black,[pos[0],pos[1]-.253,pos[2]],mount);
 const adjust=mesh(new T.CylinderGeometry(.048,.048,.16,24),black,[pos[0]+.095,pos[1]-.34,pos[2]],mount);adjust.rotation.z=Math.PI/2;screw(mount,[pos[0]+.18,pos[1]-.34,pos[2]],.028,'x');
 const cradle=mesh(roundedGeometry(.30,.045,.26,.015),steel,[pos[0],pos[1]-.195,pos[2]],mount);cradle.quaternion.copy(g.quaternion);add(mount);
 stand([pos[0],floorY,pos[2]],Math.max(.05,pos[1]-.47-floorY));return g;
}
function eye(pos,target){const g=new T.Group();g.position.copy(V(pos));g.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),V(target).sub(V(pos)).normalize());
 const ball=new T.Mesh(new T.SphereGeometry(.22,40,24),presentationMaterial('#f9f5e7',{emissiveIntensity:.45,roughness:.3}));g.add(ball);
 const iris=new T.Mesh(new T.SphereGeometry(.11,32,20),presentationMaterial('#438e95',{emissiveIntensity:.28,roughness:.23}));iris.scale.z=.34;iris.position.z=.198;g.add(iris);
 const pupil=new T.Mesh(new T.SphereGeometry(.049,24,16),mat('#101c29',{roughness:.16}));pupil.scale.z=.35;pupil.position.z=.232;g.add(pupil);return add(g);
}
function glass(color='#c6eaf0',opacity=.38){const m=new T.MeshPhysicalMaterial({color,metalness:0,roughness:.045,transmission:.72,thickness:.12,ior:1.5,transparent:true,opacity,side:T.DoubleSide,depthWrite:false,envMapIntensity:1.4,clearcoat:.5,clearcoatRoughness:.1});materials.push(m);return m;}
function lens(pos,radius,type='convex'){
 const n=40,rings=20,vertices=[],indices=[],half=.16;
 for(let face=0;face<2;face++)for(let j=0;j<=rings;j++){const r=radius*j/rings;let t=type==='concave'?.035+.14*(r/radius)**2:half*Math.sqrt(Math.max(0,1-(r/radius)**2))+.018;
  for(let i=0;i<=n;i++){const theta=i/n*Math.PI*2;vertices.push((face?1:-1)*t,r*Math.cos(theta),r*Math.sin(theta));}}
 const stride=n+1,surface=(rings+1)*stride;
 for(let face=0;face<2;face++)for(let j=0;j<rings;j++)for(let i=0;i<n;i++){const a=face*surface+j*stride+i,b=a+stride;indices.push(a,b,a+1,a+1,b,b+1);}
 for(let i=0;i<n;i++){const a=rings*stride+i,b=surface+a;indices.push(a,a+1,b,a+1,b+1,b);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
 const g=new T.Group();g.position.copy(V(pos));const optic=new T.Mesh(geo,glass());g.add(optic);
 const rim=new T.Mesh(new T.TorusGeometry(radius+.035,.055,16,96),presentationMaterial('#9fadb5',{metalness:.94,roughness:.19}));rim.rotation.y=Math.PI/2;g.add(rim);
 for(const side of[-1,1]){const retaining=new T.Mesh(new T.TorusGeometry(radius+.013,.016,10,96),presentationMaterial('#344650',{metalness:.65,roughness:.26}));retaining.rotation.y=Math.PI/2;retaining.position.x=side*.046;g.add(retaining);for(let i=0;i<3;i++){const a=i*Math.PI*2/3+.4;screw(g,[side*.05,(radius+.048)*Math.cos(a),(radius+.048)*Math.sin(a)],.02,'x');}}add(g);
 if(pos[1]-radius>0)stand([pos[0],0,pos[2]],pos[1]-radius);return g;
}
function screen(pos,width,height,opts={}){const g=new T.Group();g.position.copy(V(pos));if(opts.axis==='z')g.rotation.y=Math.PI/2;
 const panel=new T.Mesh(new T.BoxGeometry(.07,height,width),mat(opts.color||'#eceee8',{roughness:.92,metalness:0}));panel.receiveShadow=true;g.add(panel);
 const frameMat=presentationMaterial('#92a7b5',{metalness:.85,roughness:.28});for(const y of[-height/2,height/2]){const f=new T.Mesh(roundedGeometry(.12,.065,width+.1,.015),frameMat);f.position.y=y;g.add(f);}for(const z of[-width/2,width/2]){const f=new T.Mesh(roundedGeometry(.12,height,.065,.015),frameMat);f.position.z=z;g.add(f);}for(const y of[-height/2,height/2])for(const z of[-width/2,width/2])screw(g,[-.066,y,z],.018,'x');add(g);
 if(pos[1]-height/2>0)stand([pos[0],0,pos[2]],pos[1]-height/2);return g;
}
function disc(pos,r,color,opts={}){const m=new T.MeshBasicMaterial({color,side:T.DoubleSide,transparent:(opts.opacity??1)<1,opacity:opts.opacity??1,depthWrite:false});const o=mesh(new T.CircleGeometry(r,64),m,pos);if(opts.axis==='x'||!opts.axis)o.rotation.y=Math.PI/2;else if(opts.axis==='y')o.rotation.x=-Math.PI/2;o.castShadow=false;return o;}
function prism(verticesXY,depth=1,color='#b9e4ed'){const shape=new T.Shape();verticesXY.forEach((p,i)=>i?shape.lineTo(...p):shape.moveTo(...p));shape.closePath();const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false});geo.translate(0,0,-depth/2);const o=mesh(geo,glass(color,.5),[0,0,0]);const edges=new T.LineSegments(new T.EdgesGeometry(geo),new T.LineBasicMaterial({color:'#79a4b6',transparent:true,opacity:.7}));add(edges);return o;}
function ruler(xmin,xmax,y,z,scale=1){line([[xmin,y,z],[xmax,y,z]],'#8b9caa');const step=scale;for(let x=Math.ceil(xmin/step)*step;x<=xmax+.0001;x+=step)line([[x,y,z-.04],[x,y,z+.04]],'#8b9caa');}
function planarMirror(pos,width,height,normal=[-1,0,0]){
 const g=new T.Group();g.position.copy(V(pos));g.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),V(normal).normalize());
 if(T.Reflector){const mirror=new T.Reflector(new T.PlaneGeometry(width,height),{color:0xd7e0e7,textureWidth:768,textureHeight:768,clipBias:.003});const original=mirror.onBeforeRender;mirror.onBeforeRender=function(...args){if(!refreshReflections)return;const rv=rays.visible,gv=guides.visible;rays.visible=false;guides.visible=false;original.apply(this,args);rays.visible=rv;guides.visible=gv;};g.add(mirror);resources.push(mirror);}
 else g.add(new T.Mesh(new T.PlaneGeometry(width,height),mat('#b2c2cc',{metalness:1,roughness:.06})));
 const backing=new T.Mesh(roundedGeometry(width,height,.05,.015),presentationMaterial('#acb9bf',{metalness:.8,roughness:.26}));backing.position.z=-.032;g.add(backing);const frame=enamel();for(const x of[-width/2,width/2]){const f=new T.Mesh(roundedGeometry(.085,height+.13,.12,.016),frame);f.position.x=x;g.add(f);}for(const y of[-height/2,height/2]){const f=new T.Mesh(roundedGeometry(width,.085,.12,.016),frame);f.position.y=y;g.add(f);}for(const x of[-width/2,width/2])for(const y of[-height/2,height/2])screw(g,[x,y,.067],.017,'z');add(g);stand([pos[0],0,pos[2]],Math.max(.1,pos[1]-height/2));return g;
}
function setEnvironment({dark=false,space=false}={}){scene.background=new T.Color(dark?'#142234':space?'#edf4fa':'#f1f5f7');hemisphere.intensity=dark?.025:1.15;keyLight.intensity=dark?.015:2.5;fillLight.intensity=dark?0:.7;scene.environment=dark?null:envMap;const note=$('presentation-note');if(note)note.hidden=!dark;}
function disposeContent(){flowPaths=[];flowParticles=[];flowPoints=null;flowTime=0;flowSampleTime=0;lastFlowTick=null;labels.forEach(l=>l.el.remove());labels=[];resources.splice(0).forEach(r=>{if(r.dispose)r.dispose();});if(content){content.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());}});scene.remove(content);}materials.length=0;content=new T.Group();rays=new T.Group();guides=new T.Group();content.add(rays,guides);scene.add(content);}
function setupScene(){
 viewport=$('viewport');labelRoot=$('labels');
 renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;viewport.prepend(renderer.domElement);renderer.domElement.setAttribute('aria-label','可旋轉與縮放的立體光學實驗');renderer.domElement.setAttribute('role','img');
 renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
 scene=new T.Scene();scene.background=new T.Color('#edf5f9');camera=new T.PerspectiveCamera(38,1,.08,150);
 const studio=new T.Scene();studio.background=new T.Color('#88929b');for(const [x,y,z,sx,sy,sz,intensity]of[[0,8,0,13,.1,9,3],[-8,3,2,.1,7,8,2.4],[5,4,-8,7,6,.1,1.7],[8,1,2,.1,5,10,.07]]){const p=new T.Mesh(new T.BoxGeometry(sx,sy,sz),new T.MeshBasicMaterial({color:new T.Color(intensity,intensity,intensity)}));p.position.set(x,y,z);studio.add(p);}const pm=new T.PMREMGenerator(renderer);envMap=pm.fromScene(studio,.025).texture;scene.environment=envMap;pm.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 hemisphere=new T.HemisphereLight('#f4f9ff','#8a7864',2.1);scene.add(hemisphere);
 keyLight=new T.DirectionalLight('#fff6e7',3.3);keyLight.position.set(-4,11,5);keyLight.castShadow=true;keyLight.shadow.mapSize.set(2048,2048);Object.assign(keyLight.shadow.camera,{left:-11,right:11,top:8,bottom:-8,near:.1,far:30});keyLight.shadow.bias=-.0004;keyLight.shadow.normalBias=.025;scene.add(keyLight);
 fillLight=new T.DirectionalLight('#d9eaff',1);fillLight.position.set(8,5,-7);scene.add(fillLight);
 if(document.body.dataset.topic!=='1'){
 const bench=new T.Mesh(roundedGeometry(16,.20,8.5,.065),presentationMaterial('#d4dee3',{roughness:.42,metalness:.5}));bench.position.y=-.105;bench.receiveShadow=true;scene.add(bench);
 const apron=new T.Mesh(roundedGeometry(15.86,.36,8.36,.08),presentationMaterial('#b4c8d3',{roughness:.32,metalness:.35}));apron.position.y=-.34;scene.add(apron);
 const ground=new T.Mesh(new T.PlaneGeometry(200,200),new T.MeshBasicMaterial({color:'#f1f5f7',toneMapped:false}));ground.rotation.x=-Math.PI/2;ground.position.y=-1.7;scene.add(ground);
 for(const x of[-6.8,6.8])for(const z of[-3.3,3.3]){const leg=new T.Mesh(roundedGeometry(.25,1.13,.25,.025),presentationMaterial('#a5b8c2',{metalness:.84,roughness:.25}));leg.position.set(x,-1.12,z);scene.add(leg);contactShadow(scene,[x,-1.696,z],.7,.7,.12);}
 // Recessed mounting-grid marks add a manufactured optical-bench surface in one draw call.
 const holeGeo=new T.CircleGeometry(.018,12),holeMat=new T.MeshBasicMaterial({color:'#7994a1',transparent:true,opacity:.38,depthWrite:false}),holes=new T.InstancedMesh(holeGeo,holeMat,25*12),placement=new T.Object3D();let hole=0;for(let i=0;i<25;i++)for(let j=0;j<12;j++){placement.position.set((i-12)*.6,.0005,(j-5.5)*.6);placement.rotation.x=-Math.PI/2;placement.updateMatrix();holes.setMatrixAt(hole++,placement.matrix);}holes.instanceMatrix.needsUpdate=true;scene.add(holes);
 for(const z of[-4.16,4.16]){const strip=new T.Mesh(roundedGeometry(15.65,.027,.027,.006),presentationMaterial('#f4f0e2',{metalness:.82,roughness:.2}));strip.position.set(0,-.04,z);scene.add(strip);}
 }
 const note=document.createElement('p');note.id='presentation-note';note.className='presentation-note';note.hidden=true;note.textContent='背景僅供展示；物體明暗依光源設定。';document.querySelector('.scene-footer').after(note);
 resizeObserver=new ResizeObserver(resize);resizeObserver.observe(viewport);resize();bindCamera();resetCamera();
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{sceneVisible=entries[0].isIntersecting;lastFlowTick=null;invalidate();});observer.observe(viewport);}
 document.addEventListener('visibilitychange',()=>{lastFlowTick=null;if(document.hidden){if(raf)cancelAnimationFrame(raf);raf=0;}else invalidate();});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('error').hidden=false;$('error').textContent='3D 暫停了。請重新整理頁面。';});
}
function imageComparison(data){comparisonData=data;}
function renderComparison(){
 if(!comparisonData){if(comparisonBox)comparisonBox.hidden=true;return;}
 if(!comparisonRenderer){
  comparisonBox=document.createElement('div');comparisonBox.className='image-comparison';comparisonBox.innerHTML='<p class="comparison-title">物像等比例放大</p><div class="comparison-canvas"></div><div class="comparison-labels"><span></span><span></span></div>';$('metrics').after(comparisonBox);
  comparisonRenderer=new T.WebGLRenderer({antialias:true,alpha:true});comparisonRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));comparisonRenderer.outputColorSpace=T.SRGBColorSpace;
  comparisonBox.querySelector('.comparison-canvas').append(comparisonRenderer.domElement);comparisonRenderer.domElement.setAttribute('role','img');
  comparisonScene=new T.Scene();comparisonCamera=new T.OrthographicCamera(-2.6,2.6,1.7,-1.7,.1,30);comparisonCamera.position.set(0,0,10);comparisonScene.add(new T.HemisphereLight('#ffffff','#8a9aa6',2));const light=new T.DirectionalLight('#fff7e8',2.3);light.position.set(-3,5,6);comparisonScene.add(light);
 }
 comparisonBox.hidden=false;
 if(comparisonGroup){comparisonGroup.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});comparisonScene.remove(comparisonGroup);}
 comparisonGroup=new T.Group();comparisonScene.add(comparisonGroup);
 const {objectHeight,imageHeight,real}=comparisonData,finite=typeof imageHeight==='number'&&Number.isFinite(imageHeight),maxH=Math.max(Math.abs(objectHeight),finite?Math.abs(imageHeight):0,.001),scale=1.38/maxH;
 for(const [i,value,color]of[[0,objectHeight,'#d66a32'],[1,finite?imageHeight:0,'#168b9c']]){
  const x=i?1.2:-1.2,h=Math.abs(value)*scale,sign=Math.sign(value)||1;
  const base=new T.Mesh(new T.BoxGeometry(1.2,.017,.045),new T.MeshBasicMaterial({color:'#a5bac8'}));base.position.set(x,0,-.09);comparisonGroup.add(base);
  if(h>0){const head=Math.min(h*.3,.27),r=Math.max(.018,Math.min(.065,h*.09)),material=new T.MeshStandardMaterial({color,metalness:.12,roughness:.3,transparent:i===1&&!real,opacity:i===1&&!real?.58:1});
   const body=new T.Mesh(new T.CylinderGeometry(r,r,Math.max(.002,h-head),20),material);body.position.set(x,sign*(h-head)/2,0);comparisonGroup.add(body);
   const tip=new T.Mesh(new T.ConeGeometry(r*2.3,head,24),material.clone());tip.position.set(x,sign*(h-head/2),0);if(sign<0)tip.rotation.z=Math.PI;comparisonGroup.add(tip);
  }
 }
 const short=n=>Number(Math.abs(n).toFixed(2));const spans=comparisonBox.querySelectorAll('.comparison-labels span');spans[0].textContent=`物 ${short(objectHeight)} cm`;spans[1].textContent=finite?`${real?'實像':'虛像'} ${short(imageHeight)} cm`:'無有限像';comparisonRenderer.domElement.setAttribute('aria-label',`等比例物像比較。物高${short(objectHeight)}公分；${finite?(imageHeight<0?'倒立':'正立')+'像高'+short(imageHeight)+'公分':'無有限距離的像'}`);
 const w=comparisonBox.clientWidth||240;comparisonRenderer.setSize(w,160);comparisonCamera.left=-1.7*w/160;comparisonCamera.right=1.7*w/160;comparisonCamera.updateProjectionMatrix();comparisonRenderer.render(comparisonScene,comparisonCamera);
}
function context(){return {T,group:content,add,mat,presentationMaterial,roundedGeometry,contactShadow,invalidate,box,sphere,cylinder:segment,line,ray,label,arrow,stand,lamp,eye,lens,screen,disc,prism,ruler,planarMirror,imageComparison,setEnvironment};}
function resize(){if(!renderer)return;const w=viewport.clientWidth,h=viewport.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.zoom=1.08*Math.min(1,camera.aspect/(w<570?(definition.mobileFitAspect||1.6):1.6));camera.updateProjectionMatrix();if(comparisonData)renderComparison();invalidate();}
function resetCamera(){const c=definition.camera||{},pos=c.position||[9,7.5,13],target=c.target||[0,1.6,0];cameraDefault={position:pos,target};camera.position.copy(V(pos));orbit.target=V(target);syncOrbit();invalidate();}
function syncOrbit(){const v=camera.position.clone().sub(orbit.target);orbit.r=v.length();orbit.theta=Math.atan2(v.x,v.z);orbit.phi=Math.acos(v.y/orbit.r);camera.lookAt(orbit.target);}
function updateCamera(){const s=Math.sin(orbit.phi);camera.position.set(orbit.target.x+orbit.r*s*Math.sin(orbit.theta),orbit.target.y+orbit.r*Math.cos(orbit.phi),orbit.target.z+orbit.r*s*Math.cos(orbit.theta));camera.lookAt(orbit.target);invalidate();}
function bindCamera(){let drag=null,pinch=null;const points=new Map(),canvas=renderer.domElement;
 canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);points.set(e.pointerId,[e.clientX,e.clientY]);drag={x:e.clientX,y:e.clientY};if(points.size===2)pinch=Math.hypot(...[...points.values()][0].map((v,i)=>v-[...points.values()][1][i]));});
 canvas.addEventListener('pointermove',e=>{if(!points.has(e.pointerId))return;points.set(e.pointerId,[e.clientX,e.clientY]);if(points.size===2){const p=[...points.values()],d=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);if(pinch)orbit.r=Math.max(4,Math.min(34,orbit.r*pinch/d));pinch=d;updateCamera();return;}if(drag){orbit.theta-=(e.clientX-drag.x)*.006;orbit.phi=Math.max(.08,Math.min(Math.PI*.485,orbit.phi+(e.clientY-drag.y)*.006));drag={x:e.clientX,y:e.clientY};updateCamera();}});
 for(const type of['pointerup','pointercancel'])canvas.addEventListener(type,e=>{points.delete(e.pointerId);drag=null;pinch=null;});
 canvas.addEventListener('wheel',e=>{e.preventDefault();orbit.r=Math.max(4,Math.min(34,orbit.r*Math.exp(e.deltaY*.001)));updateCamera();},{passive:false});
 canvas.addEventListener('contextmenu',e=>e.preventDefault());
}
function layoutLabels(){
 const w=viewport.clientWidth,h=viewport.clientHeight,occupied=[],mobile=w<570,leaders=$('label-lines');leaders.replaceChildren();leaders.setAttribute('viewBox',`0 0 ${w} ${h}`);
 // Anchors live on the apparatus in world space. Only the lettering faces the reader.
 // Never clamp a distant label to the viewport or push it to an unrelated object.
 camera.updateMatrixWorld(true);const projectedLabels=[];
 for(const lab of labels){lab.last=null;lab.el.style.display=showLabels?'':'none';if(!showLabels)continue;const world=labelWorldPoint(lab),p=world.clone().project(camera),px=(p.x+1)*w/2,py=(1-p.y)*h/2;
  if(p.z<-1||p.z>1||px<4||px>w-4||py<4||py>h-4||labelOccluded(lab,world)){lab.el.style.display='none';continue;}
  if(projectedLabels.some(p=>p.lab.el.textContent===lab.el.textContent&&p.world.distanceToSquared(world)<1e-10)){lab.el.style.display='none';continue;}
  projectedLabels.push({lab,world,px,py,ew:lab.el.offsetWidth,eh:lab.el.offsetHeight});
 }
 projectedLabels.sort((a,b)=>(b.lab.opts.priority||0)-(a.lab.opts.priority||0)||a.lab.index-b.lab.index);
 const overlaps=(a,b,pad=4)=>a.x<b.x+b.w+pad&&a.x+a.w+pad>b.x&&a.y<b.y+b.h+pad&&a.y+a.h+pad>b.y;
 const svg=(tag,attrs)=>{const e=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));return e;};
 const tip=$('viewport').querySelector('.view-tip'),tipRect=tip?.getBoundingClientRect(),vpRect=viewport.getBoundingClientRect();if(tipRect)occupied.push({x:tipRect.x-vpRect.x,y:tipRect.y-vpRect.y,w:tipRect.width,h:tipRect.height});
 for(const {lab,world,px,py,ew,eh}of projectedLabels){
  const candidates=[];for(const gap of[10,18,mobile?25:30]){const positions=[[px-ew/2,py-eh-gap],[px+gap,py-eh/2],[px-ew/2,py+gap],[px-ew-gap,py-eh/2],[px+gap,py-eh-gap],[px-ew-gap,py-eh-gap],[px+gap,py+gap],[px-ew-gap,py+gap]];
   positions.forEach(([x,y],direction)=>{const ex=Math.max(x,Math.min(x+ew,px)),ey=Math.max(y,Math.min(y+eh,py));candidates.push({x,y,w:ew,h:eh,ex,ey,length:Math.hypot(ex-px,ey-py),slot:gap+':'+direction});});
  }
  // Keep an existing nearby slot while orbiting, instead of making text jump sides.
  candidates.sort((a,b)=>(a.slot===lab.slot?-1:b.slot===lab.slot?1:0)||a.length-b.length);
  const selected=candidates.find(r=>r.length<=(mobile?36:43)&&r.x>=6&&r.y>=6&&r.x+r.w<=w-6&&r.y+r.h<=h-6&&!occupied.some(o=>overlaps(r,o))&&!projectedLabels.some(p=>p.lab!==lab&&Math.hypot(p.px-px,p.py-py)>5&&p.px>r.x-4&&p.px<r.x+r.w+4&&p.py>r.y-4&&p.py<r.y+r.h+4));
  if(!selected){lab.el.style.display='none';continue;}
  occupied.push(selected);lab.slot=selected.slot;lab.el.style.left=selected.x+'px';lab.el.style.top=selected.y+'px';lab.last={world:world.toArray(),anchor:[px,py],rect:{x:selected.x,y:selected.y,w:ew,h:eh},leaderLength:selected.length};
  const g=svg('g',{'data-label-id':lab.index}),ends={x1:px,y1:py,x2:selected.ex,y2:selected.ey,fill:'none','stroke-linecap':'round'};
  g.append(svg('line',{...ends,stroke:'#ffffff','stroke-width':3.5,'stroke-opacity':.9}),svg('line',{...ends,stroke:'#345b70','stroke-width':1.4}),svg('circle',{cx:px,cy:py,r:2.7,fill:'#ffffff',stroke:'#345b70','stroke-width':1.3}));leaders.append(g);
 }
}
function invalidate(){dirty=true;if(!raf)raf=requestAnimationFrame(render);}
function render(now=performance.now()){
 raf=0;if(!renderer)return;const active=flowRunning();
 if(active){if(lastFlowTick!==null)flowTime+=Math.min(.08,Math.max(0,(now-lastFlowTick)/1000));lastFlowTick=now;}else lastFlowTick=null;
 if(dirty||(active&&now-lastPaint>=1000/30)){const sceneChanged=dirty;refreshReflections=sceneChanged;dirty=false;rays.visible=showRays;guides.visible=showRays;if(flowPoints){flowPoints.visible=showFlow;updateFlow();}renderer.render(scene,camera);if(sceneChanged)layoutLabels();lastPaint=now;renderCount++;}
 if(active&&!raf)raf=requestAnimationFrame(render);
}
function createFlowControl(){
 let input=$('flowToggle');if(!input){const labelEl=document.createElement('label');input=document.createElement('input');input.type='checkbox';input.id='flowToggle';labelEl.append(input,document.createTextNode('流動'));$('labelsToggle').closest('label').before(labelEl);}
 input.checked=showFlow;input.addEventListener('change',()=>{showFlow=input.checked;manualFlowChoice=showFlow;lastFlowTick=null;invalidate();});
 const note=document.querySelector('.scene-footer small');if(note&&document.body.dataset.topic!=='1')note.textContent=definition.flowIntensity?'光越強，光點越多':'光點僅示意方向';
 motionPreference.addEventListener('change',event=>{showFlow=!event.matches&&manualFlowChoice!==false;input.checked=showFlow;lastFlowTick=null;invalidate();});
}
function createControls(){const container=$('controls');container.replaceChildren();for(const c of definition.controls){const field=document.createElement('div');field.className='control';const header=document.createElement('div');header.className='control-head';const labelEl=document.createElement('label');labelEl.htmlFor='control-'+c.key;labelEl.textContent=c.label;const output=document.createElement('output');output.id='value-'+c.key;output.setAttribute('for','control-'+c.key);header.append(labelEl,output);field.append(header);let input;
 if(c.type==='select'){input=document.createElement('select');c.options.forEach(o=>{const opt=document.createElement('option');opt.value=o.value;opt.textContent=o.label;input.append(opt);});}
 else{input=document.createElement('input');input.type=c.type==='toggle'?'checkbox':'range';if(c.type==='range'){input.min=c.min;input.max=c.max;input.step=c.step??1;}if(c.type==='toggle')input.className='switch';}
 input.id='control-'+c.key;input.dataset.key=c.key;input.addEventListener('input',()=>{const raw=input.type==='checkbox'?input.checked:input.value;state[c.key]=c.type==='range'?Number(raw):c.type==='select'&&typeof c.value==='number'?Number(raw):raw;update();});field.append(input);container.append(field);
 }}
function update(){
 for(const c of definition.controls){const input=$('control-'+c.key);input.closest('.control').hidden=c.visibleWhen?!c.visibleWhen(state):false;input.disabled=c.disabledWhen?Boolean(c.disabledWhen(state)):false;if(c.type==='toggle')input.checked=Boolean(state[c.key]);else input.value=state[c.key];$('value-'+c.key).textContent=c.type==='range'?state[c.key]+(c.unit?' '+c.unit:''):c.type==='toggle'?(c.key==='partition'?(state[c.key]?'有':'無'):(state[c.key]?'開啟':'關閉')):'';}
 try{model=definition.model({...state});disposeContent();setEnvironment();comparisonData=null;definition.build(context(),{...state},model);createFlow();renderer.shadowMap.needsUpdate=true;$('status').textContent=model.status||'';const metrics=$('metrics');metrics.replaceChildren();for(const m of(model.metrics||[]).slice(0,3)){const item=document.createElement('div');const labelEl=document.createElement('span');labelEl.textContent=m.label;const value=document.createElement('strong');value.textContent=String(m.value);item.append(labelEl,value);metrics.append(item);}renderComparison();$('error').hidden=true;invalidate();window.__labReady=true;
 delete window.__labError;
 }catch(e){window.__labError=String(e.stack||e);$('error').hidden=false;$('error').textContent='此設定無法顯示，請按「重新開始」。';console.error(e);}
}
function controlsDefaults(){return Object.fromEntries(definition.controls.map(c=>[c.key,c.value]));}
function setView(view){if(view==='3d'){resetCamera();return;}orbit.target=V(cameraDefault.target);const r=orbit.r||17;camera.position.copy(orbit.target).add(V(view==='top'?[0,r,.001]:view==='side'?[r,2,0]:[0,1.3,r]));syncOrbit();invalidate();}
function details(){const container=$('model-details');for(const text of definition.details||[]){const p=document.createElement('p');const parts=String(text).split(/(https?:\/\/[^\s）)；，]+)/);for(const part of parts){if(/^https?:\/\//.test(part)){const a=document.createElement('a');a.href=part;a.target='_blank';a.rel='noreferrer';a.textContent='參考資料';p.append(a);}else p.append(document.createTextNode(part));}container.append(p);}const p=document.createElement('p');p.textContent='3D 器材為立體教學模型；光路線用來標示方向，在乾淨空氣中不一定看得見。材質光影不代替光學計算。';container.append(p);}
api.start=function(id){definition=topics.get(Number(id));if(!definition)throw Error('Missing topic '+id);applyTopicTheme(Number(id));state=controlsDefaults();$('title').textContent=definition.title;$('question').textContent=definition.question;$('hint').textContent=definition.hint;$('number').textContent=String(id).padStart(2,'0');document.title='主題 '+String(id).padStart(2,'0')+'｜'+definition.title;createControls();if(Number(id)===29)for(const [key,color]of Object.entries({r:'#c03949',g:'#137657',b:'#315fbb'}))$('control-'+key).closest('.control').style.setProperty('--control-accent',color);details();createFlowControl();const flowNote=document.createElement('p');flowNote.textContent=definition.flowIntensity?'同一光源調亮時，光點增多；調暗時減少。光點只示意相對光量與方向，不代表實際光子數、大小或光速；非零微光保留至少一點。虛線延長線與法線不播放流動。':'流動光點僅表示傳播方向，不代表真實光速、光量或光子的大小。虛線延長線與法線不播放流動。';$('model-details').append(flowNote);
 $('raysToggle').addEventListener('change',e=>{showRays=e.target.checked;$('flowToggle').disabled=!showRays;lastFlowTick=null;invalidate();});$('labelsToggle').addEventListener('change',e=>{showLabels=e.target.checked;invalidate();});$('reset').addEventListener('click',()=>{state=controlsDefaults();showRays=true;showLabels=true;manualFlowChoice=null;showFlow=!motionPreference.matches;$('raysToggle').checked=true;$('labelsToggle').checked=true;$('flowToggle').checked=showFlow;$('flowToggle').disabled=false;resetCamera();update();});document.querySelectorAll('[data-view]').forEach(el=>el.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(x=>x.setAttribute('aria-pressed',String(x===el)));setView(el.dataset.view);}));$('zoomIn').addEventListener('click',()=>{orbit.r=Math.max(4,orbit.r*.82);updateCamera();});$('zoomOut').addEventListener('click',()=>{orbit.r=Math.min(34,orbit.r*1.22);updateCamera();});
 try{setupScene();update();}catch(e){window.__labError=String(e.stack||e);$('error').hidden=false;$('error').textContent='無法啟用 3D。請用新版 Chrome 或 Edge，並開啟硬體加速。';console.error(e);}
 window.__lab={topic:Number(id),get state(){return {...state};},get model(){return model;},set:patch=>{state={...state,...patch};update();},view:setView,reset:()=>{state=controlsDefaults();resetCamera();update();},get stats(){return {renderCount,triangles:renderer?.info.render.triangles,geometries:renderer?.info.memory.geometries,labels:labels.length};},get camera(){return camera.position.toArray();},get labels(){return labels.map(l=>({text:l.el.textContent,visible:l.el.style.display!=='none',world:labelWorldPoint(l).toArray(),...l.last}));},get flow(){return flowSnapshot();},test:()=>definition.tests?definition.tests():[]};
};
const initialize=api.start,assetLoads=new Map();
function loadLocalAsset(file,globalName){if(assetLoads.has(file))return assetLoads.get(file);const ready=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('assets/'+file,document.baseURI).href;script.onload=()=>{const asset=window[globalName];if(!asset)return reject(Error('Missing asset factory '+globalName));Promise.resolve(asset.ready).then(resolve,reject);};script.onerror=()=>reject(Error('Cannot load local model '+file));document.head.append(script);});assetLoads.set(file,ready);return ready;}
api.start=function(id){const numeric=Number(id),required=numeric===30?[['apple-assets.js','OpticsApple']]:[12,32].includes(numeric)?[['realistic-head.js','OpticsHead']]:[];
 if(!required.length)return initialize(id);
 const loading=$('error');loading.hidden=false;loading.textContent='載入本機寫實模型…';
 return Promise.all(required.map(([file,name])=>loadLocalAsset(file,name))).then(()=>{initialize(id);const credit=document.createElement('p');credit.className='source-credit';
 if(numeric===30)credit.innerHTML='蘋果模型與貼圖：<a href="https://polyhaven.com/a/food_apple_01" target="_blank" rel="noreferrer">Oliver Harries / Poly Haven</a>（<a href="https://polyhaven.com/license" target="_blank" rel="noreferrer">CC0</a>）；已調整尺寸與教學光色材質。';
 else credit.innerHTML='掃描人頭：Lee Perry-Smith / Infinite-Realities，經 McGuire、Cardenas 與 Three.js 整理（<a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>）。已裁去肩胸、縮放並調整材質；原作者不代表對本教材的背書。<a href="assets/realistic-head-LICENSE.txt" target="_blank" rel="noreferrer">來源與改製說明</a>。';$('model-details').append(credit);
 }).catch(error=>{window.__labError=String(error);loading.hidden=false;loading.textContent='模型未能載入，請確認 assets 資料夾完整後重新整理。';console.error(error);});
};
})();

