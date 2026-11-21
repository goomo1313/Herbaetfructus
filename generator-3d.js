/* Herba et Fructus: WebAssembly OpenSCAD -> skutočný STL, 3D náhľad cez three.js. */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';

const $=id=>document.getElementById(id);
const numeric={
 stick_length:[50,300],stick_width:[3,20],tip_length:[10,100],
 base_height:[1,10],text_height:[1,6],text_size:[6,20],
 border_radius:[0.5,5],max_text_length:[30,150],stick_roundness:[0,5],
 y_spacing:[10,50],text_right_margin:[0,20],text_y_factor:[0,1],
 cutout_length:[5,50],cutout_depth:[1,10],cutout_offset:[-50,50],
 hole_length:[5,50],hole_width:[1,10],hole_offset:[-50,50]
};
const state={source:'',last:null,worker:null,timeout:null,renderer:null,model:null,controls:null,paused:false,busy:false};
const safeName=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-|-$/g,'').slice(0,42)||'stitky';

function status(message,type=''){
 const el=$('renderStatus');
 el.textContent=message;
 el.className='render-status '+type;
}
function error(message){
 const el=$('formError');el.hidden=false;el.textContent=message;
}
function clearError(){const el=$('formError');el.hidden=true;el.textContent='';}
function namesFromText(){
 return $('names').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
}
function updateCount(){ $('nameCount').textContent=namesFromText().length; }
function snapshot(){
 const names=namesFromText();
 if(!names.length||names.length>12)throw Error('Zadajte 1 až 12 názvov rastlín, každý na samostatnom riadku.');
 if(names.some(n=>Array.from(n).length>40))throw Error('Jeden názov môže obsahovať najviac 40 znakov.');
 if(names.some(n=>/[\x00-\x1f]/.test(n)))throw Error('Názvy nesmú obsahovať riadiace znaky.');
 const params={};
 for(const [key,[min,max]] of Object.entries(numeric)){
  const input=$(key),value=Number(input.value);
  if(!input.value.trim()||!Number.isFinite(value)||value<min||value>max)
   throw Error('Skontrolujte parameter „'+input.previousElementSibling?.textContent+'“ ('+min+' – '+max+').');
  params[key]=value;
 }
 if(params.tip_length>=params.stick_length/2)throw Error('Špička musí byť kratšia než polovica dĺžky zápichu.');
 if(params.max_text_length>params.stick_length-params.tip_length)
  throw Error('Maximálna dĺžka textu je väčšia ako využiteľná rovná časť zápichu. Znížte ju alebo predĺžte zápich.');
 if(params.y_spacing<params.text_size+2*params.border_radius)
  throw Error('Rozstup štítkov je príliš malý vzhľadom na písmo a lem.');
 params.font_choice=$('font_choice').value;
 params.base_color=$('base_color').value;
 params.top_color=$('top_color').value;
 params.enable_cutouts=$('enable_cutouts').checked && params.stick_width>=10;
 params.enable_center_hole=$('enable_center_hole').checked && params.stick_width>=10;
 if(params.enable_center_hole&&params.hole_width>=params.stick_width)
  throw Error('Stredová dierka musí byť užšia než samotný zápich.');
 return {names,params};
}
function overrideScad(source,{names,params}){
 let result=source;
 const values=Object.fromEntries(Object.entries(params).filter(([key])=>key in numeric));
 values.font_choice=params.font_choice;
 values.enable_cutouts=params.enable_cutouts;
 values.enable_center_hole=params.enable_center_hole;
 for(let i=1;i<=12;i++) values['Name_'+i]=names[i-1]||'';
 for(const [key,value] of Object.entries(values)){
  const literal=typeof value==='string'?JSON.stringify(value):typeof value==='boolean'?String(value):String(value);
  const expression=new RegExp('^'+key+'\\s*=\\s*[^;]*;','m');
  if(!expression.test(result))throw Error('V SCAD šablóne chýba parameter '+key);
  result=result.replace(expression,()=>key+' = '+literal+';');
 }
 return result;
}
function download(bytes,filename,type){
 const link=document.createElement('a');
 const url=URL.createObjectURL(new Blob([bytes],{type}));
 link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function downloadSource(){
 try{
  if(!state.source)throw Error('Zdrojový model sa ešte nenačítal.');
  const values=snapshot();
  clearError();
  download(overrideScad(state.source,values),'Herba-'+safeName(values.names[0])+'.scad','text/plain;charset=utf-8');
 }catch(e){error(e.message);}
}
function setBusy(busy){
 state.busy=busy;
 $('generateBtn').disabled=busy;
 $('downloadScad').disabled=busy;
 $('downloadStl').disabled=busy||!state.last;
 $('generateBtn').textContent=busy?'Generujem STL…':'Vytvoriť 3D náhľad';
}
function setDirty(){
 if(state.busy)return;
 state.last=null;
 $('downloadStl').disabled=true;
 status('Nastavenia sa zmenili. Vygenerujte nový model.');
}
function applyWidth(){
 const wide=Number($('stick_width').value)>=10;
 $('enable_cutouts').disabled=!wide;
 $('enable_center_hole').disabled=!wide;
}
function stopWorker(){
 if(state.timeout)clearTimeout(state.timeout);
 state.timeout=null;
 if(state.worker){state.worker.terminate();state.worker=null;}
}
function splitByHeight(geometry,height){
 const pos=geometry.getAttribute('position');
 const norm=geometry.getAttribute('normal');
 const buckets=[{positions:[],normals:[]},{positions:[],normals:[]}];
 for(let i=0;i<pos.count;i+=3){
  let z=0;
  for(let v=0;v<3;v++)z+=pos.getZ(i+v);
  const bucket=buckets[z/3>height+0.02?1:0];
  for(let v=0;v<3;v++){
   const ix=i+v;
   bucket.positions.push(pos.getX(ix),pos.getY(ix),pos.getZ(ix));
   if(norm)bucket.normals.push(norm.getX(ix),norm.getY(ix),norm.getZ(ix));
  }
 }
 return buckets.map(b=>{
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(b.positions,3));
  if(b.normals.length)g.setAttribute('normal',new THREE.Float32BufferAttribute(b.normals,3));
  else g.computeVertexNormals();
  return g;
 });
}
function showMesh(arrayBuffer,values){
 const canvas=$('markerCanvas');
 if(!state.renderer){
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff,2.1));
  const sunlight=new THREE.DirectionalLight(0xffffff,2.2);sunlight.position.set(70,150,120);scene.add(sunlight);
  const camera=new THREE.PerspectiveCamera(35,1,0.1,5000);
  const orbit=new OrbitControls(camera,canvas);
  orbit.enableDamping=true;
  orbit.minDistance=20;
  orbit.maxDistance=1500;
  state.renderer={renderer,scene,camera};
  state.controls=orbit;
  const resize=()=>{
   const parent=canvas.parentElement;
   const w=Math.max(240,parent.clientWidth),h=Math.max(220,parent.clientHeight);
   renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas.parentElement);
  resize();
  const animate=()=>{requestAnimationFrame(animate);orbit.update();renderer.render(scene,camera);};
  animate();
 }
 const {scene,camera}=state.renderer;
 if(state.model){
  scene.remove(state.model);
  state.model.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();if(obj.material)obj.material.dispose();});
 }
 const geometry=new STLLoader().parse(arrayBuffer);
 geometry.computeBoundingBox();
 if(!geometry.boundingBox || !Number.isFinite(geometry.boundingBox.min.x))
  throw Error('STL nemá platnú geometriu.');
 const group=new THREE.Group();
 const parts=splitByHeight(geometry,values.params.base_height);
 geometry.dispose();
 for(const [i,g] of parts.entries()){
  if(!g.getAttribute('position').count)continue;
  const mat=new THREE.MeshStandardMaterial({color:i===0?values.params.base_color:values.params.top_color,metalness:0.05,roughness:0.75,side:THREE.DoubleSide});
  group.add(new THREE.Mesh(g,mat));
 }
 if(!group.children.length)throw Error('STL súbor neobsahuje trojuholníky.');
 group.rotation.x=-Math.PI/2;
 scene.add(group);
 state.model=group;
 const bounds=new THREE.Box3().setFromObject(group),size=new THREE.Vector3(),center=new THREE.Vector3();
 bounds.getSize(size);bounds.getCenter(center);
 group.position.sub(center);
 const longest=Math.max(size.x,size.y,size.z,50),distance=longest*1.65;
 camera.position.set(distance*.65,distance*.85,distance*.95);
 camera.lookAt(0,0,0);
 state.controls.target.set(0,0,0);
 state.controls.update();
 $('previewPlaceholder').hidden=true;
 $('modelStats').textContent=values.names.length+' ks · '+(arrayBuffer.byteLength/1024).toFixed(0)+' kB';
}
function render(){
 if(state.busy)return;
 clearError();
 let values;
 try{values=snapshot();}catch(e){error(e.message);return;}
 if(!state.source){error('Zdroj OpenSCAD ešte nie je dostupný.');return;}
 state.last=null;
 setBusy(true);
 $('layerHeight').textContent=String(values.params.base_height).replace('.',',');
 status('Pripravujem výpočet…','busy');
 try{
  const worker=new Worker(new URL('./generator-3d-worker.js',import.meta.url),{type:'module'});
  state.worker=worker;
  let finished=false;
  worker.onmessage=message=>{
   if(finished)return;
   const msg=message.data||{};
   if(msg.type==='status'){status(msg.message,'busy');return;}
   if(msg.type==='error'){
    finished=true;stopWorker();setBusy(false);error('STL sa nepodarilo vygenerovať: '+msg.message);
    status('Generovanie zlyhalo. Môžete stiahnuť SCAD a spracovať ho v OpenSCAD.','error');
    return;
   }
   if(msg.type==='result'){
    finished=true;stopWorker();
    try{
     if(!(msg.bytes instanceof ArrayBuffer)||msg.bytes.byteLength<84)throw Error('Neplatný STL súbor.');
     const blob=msg.bytes.slice(0);
     showMesh(blob,values);
     state.last={data:blob,values};
     status('Model je pripravený. STL môžete stiahnuť.','ok');
    }catch(e){error(e.message);status('Náhľad sa nepodarilo zobraziť.','error');}
    setBusy(false);
   }
  };
  worker.onerror=event=>{
   if(finished)return;finished=true;stopWorker();setBusy(false);
   status('Nepodarilo sa spustiť 3D výpočtový modul. Skúste aktuálny prehliadač.','error');
   error(event.message||'Chyba vykonávania WebAssembly.');
  };
  state.timeout=setTimeout(()=>{
   if(finished)return;finished=true;stopWorker();setBusy(false);
   status('Výpočet prekročil časový limit. Skúste menej štítkov alebo menší text.','error');
  },180000);
  worker.postMessage({source:state.source,names:values.names,params:values.params});
 }catch(e){
  stopWorker();setBusy(false);status('Vytváranie modelu zlyhalo.','error');error(e.message);
 }
}
function enableUI(){
 $('generatorGate').hidden=true;
 $('generatorApp').hidden=false;
 const hint=new URLSearchParams(location.search).get('odroda');
 if(hint){
  const name=hint.replace(/[\r\n\0]/g,' ').trim().slice(0,40);
  if(name)$('names').value=name;
 }
 $('markerForm').addEventListener('submit',e=>{e.preventDefault();render();});
 $('downloadScad').addEventListener('click',downloadSource);
 $('downloadStl').addEventListener('click',()=>{
  if(!state.last || state.busy)return;
  const {data,values}=state.last;
  download(data,'Herba-'+safeName(values.names[0])+(values.names.length>1?'-'+values.names.length+'ks':'')+'.stl','model/stl');
 });
 $('markerForm').addEventListener('input',()=>{
  updateCount();applyWidth();setDirty();clearError();
 });
 $('markerForm').addEventListener('change',()=>{
  updateCount();applyWidth();setDirty();clearError();
 });
 updateCount();applyWidth();
}
async function init(){
 try{
  const conf=window.HERBA_CONFIG;
  if(!conf?.supabaseUrl||!conf?.supabaseAnonKey)throw Error('Nie je nastavené overovanie dostupnosti generátora.');
  const url=new URL('/rest/v1/site_content',conf.supabaseUrl);
  url.searchParams.set('id','eq.settings');url.searchParams.set('select','content');
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  let response;
  try{response=await fetch(url,{headers:{apikey:conf.supabaseAnonKey,Accept:'application/json'},signal:controller.signal,cache:'no-store'});}
  finally{clearTimeout(timer);}
  if(!response.ok)throw Error('Nastavenia nie sú dostupné ('+response.status+').');
  const rows=await response.json();
  if(!Array.isArray(rows)||rows.length!==1||!rows[0]?.content||typeof rows[0].content!=='object')
   throw Error('V databáze chýba záznam nastavení.');
  if(rows[0].content.generatorPaused===true){
   state.paused=true;
   $('generatorGate').textContent='⏸ 3D generátor je momentálne pozastavený. Ostatné časti webu zostávajú dostupné.';
   return;
  }
  const source=await fetch('./model/plant-markers.scad',{cache:'no-cache'});
  if(!source.ok)throw Error('Zdrojový 3D model sa nepodarilo načítať.');
  state.source=await source.text();
  if(!state.source.includes('module plant_marker(txt)'))throw Error('Neplatný zdrojový 3D model.');
  enableUI();
 }catch(e){
  $('generatorGate').textContent='3D generátor sa momentálne nedá bezpečne spustiť: '+e.message+' Skúste to neskôr.';
 }
}
init();
