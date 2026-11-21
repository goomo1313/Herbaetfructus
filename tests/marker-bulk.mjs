import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';
import {splitMarkers,makeZip,MAX_NAMES,BATCH_SIZE} from '../marker-batches.mjs';
import {publicProfiles,renderProfile,mainLogo} from '../scripts/variety-seo-lib.mjs';

const html=readFileSync('index.html','utf8');
const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean).join('\n');

test('30 vybraných odrôd sa spracuje do troch bezpečných dávok 12/12/6',()=>{
 assert.equal(MAX_NAMES,60);
 assert.equal(BATCH_SIZE,12);
 const names=Array.from({length:30},(_,i)=>'Odroda '+(i+1));
 const parts=splitMarkers(names);
 assert.deepEqual(parts.map(x=>x.length),[12,12,6]);
 assert.equal(parts.flat().join('|'),names.join('|'));
 assert.throws(()=>splitMarkers(Array.from({length:61},(_,i)=>String(i))),/1 až 60/);
 assert.throws(()=>splitMarkers(['x'.repeat(41)]),/40 znakov/);
 assert.deepEqual(splitMarkers(['Ľalička','Ildi']),[['Ľalička','Ildi']]);
});

test('ZIP obsahuje všetky binárne súbory a korektnú centrálnu hlavičku',()=>{
 const entries=[
  {name:'Herba-stitky-01.stl',bytes:new Uint8Array([0,1,2,3,4])},
  {name:'Herba-stitky-02.stl',bytes:new Uint8Array([5,6,7,8])},
  {name:'Herba-stitky-03.stl',bytes:new Uint8Array([9,10])},
  {name:'CITAJ-MA.txt',text:'30 štítkov'}
 ];
 const zip=makeZip(entries);
 const view=new DataView(zip.buffer);
 assert.equal(view.getUint32(0,true),0x04034b50);
 let offset=0;
 for(let i=0;i<entries.length;i++){
  assert.equal(view.getUint32(offset,true),0x04034b50);
  const nameLength=view.getUint16(offset+26,true);
  const size=view.getUint32(offset+18,true);
  const name=new TextDecoder().decode(zip.subarray(offset+30,offset+30+nameLength));
  assert.equal(name,entries[i].name);
  assert.ok(size>0);
  offset+=30+nameLength+size;
 }
 assert.equal(view.getUint32(offset,true),0x02014b50);
 assert.equal(view.getUint32(zip.length-22,true),0x06054b50);
 assert.equal(view.getUint16(zip.length-22+10,true),entries.length);
});

test('zákazník prenesie naraz 30 odrôd z výberu bez cien a počtu balení',()=>{
 const nav={href:''},record=[];
 const sessionStorage={setItem(k,v){record.push({key:k,value:v});}};
 const button={hidden:true,disabled:false,textContent:''};
 const doc={
  addEventListener(){},
  querySelectorAll(selector){
   if(selector!=='#formTomatoSelector .selector-item')return [];
   return names.map(name=>({querySelector(sel){
    return sel==='input[type="checkbox"]'?{checked:true,value:name}:null;
   }}));
  },
  querySelector(){return null;},
  getElementById(id){return id==='selectedMarkersButton'?button:null;},
  body:{classList:{contains(){return false;}}}
 };
 const win={HERBA_CONFIG:{},location:nav};
 const ctx=createContext({window:win,document:doc,sessionStorage,console:{warn(){},error(){},info(){}},localStorage:{getItem(){return null}},setTimeout(){},alert(){}});
 runInContext(script,ctx);
 const names=runInContext('varietyDatabase.slice(0,30).map(x=>x.name)',ctx);
 runInContext('farmSettings.generatorPaused=false;updateMarkerSelectionButton();',ctx);
 assert.equal(button.hidden,false);
 assert.match(button.textContent,/30 odrôd/);
 assert.equal(runInContext('openMarkerGeneratorForSelection()',ctx),true);
 assert.equal(nav.href,'/3d/?vyber=1');
 assert.equal(record.length,2);
 const sent=record.find(row=>row.key==='herba_3d_names_v1');
 const cart=record.find(row=>row.key==='herba_cart_restore_v1');
 assert.ok(sent&&cart);
 assert.deepEqual(JSON.parse(sent.value),Array.from(names));
 assert.equal(JSON.parse(cart.value).length,30);
 assert.equal(JSON.parse(cart.value)[0].quantity,1);
 assert.doesNotMatch(sent.value,/price|stock|balenia|email/);
 nav.href='';record.length=0;
 runInContext('farmSettings.generatorPaused=true;updateMarkerSelectionButton();',ctx);
 assert.equal(button.hidden,true);
 assert.equal(runInContext('openMarkerGeneratorForSelection()',ctx),false);
 assert.equal(nav.href,'');
 assert.equal(record.length,0);
});

test('návrat z 3D dielne obnoví výber semien bez prepísania skladu alebo cien',()=>{
 const saved=new Map();
 const cb={checked:false,disabled:false,value:'Ildi',dataset:{price:'1.50'}};
 const qty={value:'1',dataset:{max:'2'}};
 const row={querySelector(sel){return sel==='input[type="checkbox"]'?cb:sel==='.form-qty-input'?qty:null;}};
 const doc={
  addEventListener(){},
  querySelectorAll(sel){return sel==='#formTomatoSelector .selector-item'?[row]:[];},
  querySelector(){return null;},
  getElementById(){return null;},
  body:{classList:{contains(){return false;}}}
 };
 const store={
  setItem(k,v){saved.set(k,v);},
  getItem(k){return saved.get(k)||null;},
  removeItem(k){saved.delete(k);}
 };
 const ctx=createContext({
  window:{HERBA_CONFIG:{}},document:doc,sessionStorage:store,
  console:{warn(){},error(){},info(){}},localStorage:{getItem(){return null}},
  setTimeout(){},alert(){}
 });
 runInContext(script,ctx);
 saved.set('herba_cart_restore_v1',JSON.stringify([{name:'Ildi',quantity:3},{name:'Skrytá',quantity:1}]));
 assert.equal(runInContext('restoreMarkerCart()',ctx),true);
 assert.equal(cb.checked,true);
 assert.equal(qty.value,'2');
 assert.equal(saved.has('herba_cart_restore_v1'),false);
 assert.equal(runInContext('farmSettings.generatorPaused',ctx),undefined);
});

test('3D linky v profile sa zobrazia až po overení pozastavenia',()=>{
 const sample=publicProfiles({sections:[{id:'paradajky',name:'Paradajky',hidden:false}],varieties:[{name:'Ildi',section:'paradajky',hidden:false,info:'Žlté plody.'}]})[0];
 const page=renderProfile(sample,mainLogo(html),[sample]);
 assert.match(page,/class="profile-marker" data-marker-link href="\/3d\/\?odroda=Ildi" hidden/);
 assert.match(page,/variety-marker-link\.js/);
 assert.match(page,/config\.js/);
 const gate=readFileSync('variety-marker-link.js','utf8');
 assert.match(gate,/generatorPaused===true/);
 assert.match(gate,/link.hidden=false/);
 assert.match(gate,/cache:'no-store'/);
 assert.match(html,/id="detailMarker3D"/);
 const catalogue=readFileSync('catalogue-ui.js','utf8');
 assert.match(catalogue,/markerLink\.hidden = paused \|\| !!item.hidden/);
 assert.match(html,/class="marker-3d-card"/);
 assert.match(html,/!isGeneratorPaused\(\) && !t.hidden/);
});

test('generátor prenáša predvyplnené názvy aj dávky 30 štítkov',()=>{
 const js=readFileSync('generator-3d.js','utf8');
 const source=readFileSync('3d/index.html','utf8');
 assert.match(js,/params\.get\('odroda'\)/);
 assert.match(js,/sessionStorage\.getItem\('herba_3d_names_v1'\)/);
 assert.match(js,/params\.has\('odrody'\)/);
 assert.match(js,/splitMarkers\(values.names\)/);
 assert.match(js,/makeZip\(/);
 assert.match(js,/for\(let i=0;i<groups.length;i\+\+\)/);
 assert.match(js,/if\(i>0&&await readGeneratorPaused\(\)\)/);
 assert.match(source,/maxLength|maxlength="3000"/);
 assert.match(source,/\(1 až 60/);
 assert.match(source,/Stiahnuť STL model/);
});
