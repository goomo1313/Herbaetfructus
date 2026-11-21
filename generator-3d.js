/* Herba et Fructus: WebAssembly OpenSCAD -> skutočný STL, 3D náhľad cez three.js. */
import {MAX_NAMES,BATCH_SIZE,splitMarkers,makeZip} from './marker-batches.mjs';
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
const state={source:'',last:null,worker:null,timeout:null,renderer:null,model:null,controls:null,paused:false,busy:false,cancelPending:null,runToken:0};
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
function updateCount(){
 const count=namesFromText().length;
 $('nameCount').textContent=String(count);
 const batches=$('batchCount');
 if(batches)batches.textContent=count?Math.ceil(count/BATCH_SIZE)+' tlačových '+(Math.ceil(count/BATCH_SIZE)===1?'dávka':'dávok'):'0 dávok';
 const scad=$('downloadScad');
 if(scad)scad.textContent=count>BATCH_SIZE?'Stiahnuť SCAD balík (ZIP)':'Stiahnuť SCAD';
}
function snapshot(){
 const names=namesFromText();
 if(!names.length||names.length>MAX_NAMES)throw Error('Zadajte 1 až '+MAX_NAMES+' názvov rastlín, každý na samostatnom riadku.');
 if(names.some(n=>Array.from(n).length>40))throw Error('Jeden názov môže obsahovať najviac 40 znakov.');
 if(names.some(n=>/[\x00-\x1f]/.test(n)))throw Error('Názvy nesmú obsahovať riadiace znaky.');
 splitMarkers(names);
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
  if(values.names.length<=BATCH_SIZE){
   download(overrideScad(state.source,values),'Herba-'+safeName(values.names[0])+'.scad','text/plain;charset=utf-8');
  } else {
   const groups=splitMarkers(values.names);
   const files=groups.map((names,i)=>({
    name:'Herba-stitky-'+String(i+1).padStart(2,'0')+'.scad',
    text:overrideScad(state.source,{names,params:values.params})
   }));
   files.push({name:'CITAJ-MA.txt',text:'Každá dávka má najviac 12 štítkov. Spustite jednotlivé .scad súbory v OpenSCAD. Názvy a rozmery zostali zachované.\n'});
   download(makeZip(files),'Herba-SCAD-'+values.names.length+'-stitkov.zip','application/zip');
  }
 }catch(e){error(e.message);}
}
function setBusy(busy){
 state.busy=busy;
 $('generateBtn').disabled=busy;
 $('downloadScad').disabled=busy;
 $('downloadStl').disabled=busy||!state.last;
 $('generateBtn').textContent=busy?'Generujem STL dávky…':'Vytvoriť 3D náhľad a súbory';
}
function setDirty(){
 ++state.runToken;
 if(state.busy){stopWorker();setBusy(false);}
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
 const cancel=state.cancelPending;state.cancelPending=null;
 if(cancel)cancel(new Error('Generovanie bolo prerušené.'));
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
function renderBatch(names,params,batchIndex,batchTotal){
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./generator-3d-worker.js',import.meta.url),{type:'module'});
  state.worker=worker;
  let done=false;
  const finish=(err,bytes)=>{
   if(done)return;done=true;
   clearTimeout(state.timeout);state.timeout=null;
   worker.terminate();
   if(state.worker===worker)state.worker=null;
   state.cancelPending=null;
   if(err)reject(err);else resolve(bytes);
  };
  state.cancelPending=error=>finish(error);
  worker.onmessage=message=>{
   const msg=message.data||{};
   if(msg.type==='status'){
    status('Dávka '+(batchIndex+1)+'/'+batchTotal+': '+msg.message,'busy');
   }else if(msg.type==='error'){
    finish(Error(msg.message||'Výpočet sa nepodaril.'));
   }else if(msg.type==='result'){
    if(!(msg.bytes instanceof ArrayBuffer)||msg.bytes.byteLength<84)
     finish(Error('OpenSCAD nevytvoril platný STL súbor.'));
    else finish(null,msg.bytes);
   }
  };
  worker.onerror=event=>finish(Error(event.message||'Chyba vykonávania WebAssembly.'));
  state.timeout=setTimeout(()=>finish(Error('Časový limit výpočtu dávky vypršal.')),180000);
  worker.postMessage({source:state.source,names,params});
 });
}
async function readGeneratorPaused(){
 const conf=window.HERBA_CONFIG;
 if(!conf?.supabaseUrl||!conf?.supabaseAnonKey)throw Error('Nie je nastavené overovanie generátora.');
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
 return rows[0].content.generatorPaused===true;
}
function blockPaused(){
 state.paused=true;
 ++state.runToken;
 stopWorker();
 state.last=null;
 $('generatorGate').hidden=false;
 $('generatorGate').textContent='⏸ 3D generátor je momentálne pozastavený. Ostatné časti webu zostávajú dostupné.';
 $('generatorApp').hidden=true;
}
async function render(){
 if(state.busy)return;
 clearError();
 let values;
 try{values=snapshot();}catch(e){error(e.message);return;}
 if(!state.source){error('Zdroj OpenSCAD ešte nie je dostupný.');return;}
 const token=++state.runToken;
 state.last=null;
 setBusy(true);
 $('layerHeight').textContent=String(values.params.base_height).replace('.',',');
 try{
  status('Overujem dostupnosť generátora…','busy');
  if(await readGeneratorPaused()){blockPaused();return;}
  if(token!==state.runToken)return;
  const groups=splitMarkers(values.names);
  const parts=[];
  for(let i=0;i<groups.length;i++){
   if(token!==state.runToken)return;
   // Administrátor môže nástroj pozastaviť aj počas prípravy väčšieho balíka.
   if(i>0&&await readGeneratorPaused()){blockPaused();return;}
   const bytes=await renderBatch(groups[i],values.params,i,groups.length);
   if(token!==state.runToken)return;
   parts.push({name:'Herba-stitky-'+String(i+1).padStart(2,'0')+'.stl',bytes});
   if(i===0)showMesh(bytes.slice(0),{...values,names:groups[i]});
   status('Hotových '+parts.length+' z '+groups.length+' dávok.','busy');
  }
  const data=parts.length===1?parts[0].bytes:makeZip([
   ...parts,
   {name:'CITAJ-MA.txt',text:'Herba et Fructus – 3D záhradné štítky. Každý STL obsahuje do 12 štítkov. Všetky '+values.names.length+' názvy sú rozdelené podľa poradia zadania. V sliceri skontrolujte rozmery a prípadnú výmenu farby vo výške základne ('+values.params.base_height+' mm).\n'}
  ]);
  state.last={data,values,kind:parts.length>1?'zip':'stl'};
  $('downloadStl').textContent=parts.length>1?'Stiahnuť '+parts.length+' STL súbory (ZIP)':'Stiahnuť STL model';
  $('modelStats').textContent=values.names.length+' štítkov · '+parts.length+' '+(parts.length===1?'dávka':'dávky')+' · '+Math.round(data.byteLength/1024)+' kB';
  status('Hotovo: '+values.names.length+' štítkov, '+parts.length+' '+(parts.length===1?'dávka':'dávky')+'. Náhľad ukazuje prvú dávku.','ok');
 }catch(e){
  if(token!==state.runToken)return;
  state.last=null;
  error('STL sa nepodarilo vygenerovať: '+e.message);
  status('Generovanie sa nepodarilo dokončiť. SCAD môžete stiahnuť aj bez STL.','error');
 }finally{
  if(token===state.runToken)setBusy(false);
 }
}
function enableUI(){
 $('generatorGate').hidden=true;
 $('generatorApp').hidden=false;
 const params=new URLSearchParams(location.search);
 const hint=params.get('odroda');
 if(hint){
  const name=hint.replace(/[\r\n\0]/g,' ').trim().slice(0,40);
  if(name)$('names').value=name;
 } else if(params.has('odrody')||params.get('vyber')==='1'){
  try{
   let selected;
   if(params.has('odrody')){
    selected=params.get('odrody').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
   }else{
    const raw=sessionStorage.getItem('herba_3d_names_v1');
    sessionStorage.removeItem('herba_3d_names_v1');
    selected=JSON.parse(raw);
   }
   splitMarkers(selected);
   $('names').value=selected.join('\n');
   status('Načítaných '+selected.length+' odrôd z vášho výberu. Vytvorte štítky jedným kliknutím.','ok');
  }catch(_){status('Výber odrôd nie je dostupný. Názvy môžete vložiť ručne.');}
 }
 $('markerForm').addEventListener('submit',e=>{e.preventDefault();render();});
 $('downloadScad').addEventListener('click',downloadSource);
 $('downloadStl').addEventListener('click',async()=>{
  if(!state.last||state.busy)return;
  const entry=state.last;
  $('downloadStl').disabled=true;
  try{
   if(await readGeneratorPaused()){blockPaused();return;}
   if(state.last!==entry)return;
   const {data,values,kind}=entry;
   download(data,'Herba-'+safeName(values.names[0])+(kind==='zip'?'-'+values.names.length+'-stitkov.zip':'.stl'),kind==='zip'?'application/zip':'model/stl');
  }catch(e){error('Dostupnosť generátora sa nedá overiť: '+e.message);}
  finally{if(!state.paused)$('downloadStl').disabled=!state.last;}
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
  if(await readGeneratorPaused()){
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
