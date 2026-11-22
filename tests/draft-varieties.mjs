import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createContext,runInContext,Script} from 'node:vm';
import {publicProfiles} from '../scripts/variety-seo-lib.mjs';

const html=readFileSync('index.html','utf8');
const js=readFileSync('draft-varieties.js','utf8');
const code=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).filter(Boolean).join('\n');

const base=[
 {name:'Ildi',section:'paradajky',hidden:false,type:'Multiflora',color:'Žltá',info:'Hotový opis',img:'https://example.org/ildi.jpg',price:'1.5',stock:2,seedsPerPack:'10 ks'},
 {name:'Nová položka',section:'pripravujeme',hidden:true,type:'Neurčené',color:'Neurčená',info:'',img:'',price:'0.00',stock:0,seedsPerPack:''}
];
const full={
 name:'Nová položka',section:'pripravujeme',hidden:true,type:'Indeterminantná',
 color:'Červená',info:'Overené informácie o tejto pestovanej odrode majú dostatočný rozsah pre správcu; ide o konkrétny opis plodov a zdroja semien, nie o všeobecnú reklamu.',
 img:'https://example.org/photo.jpg',price:'1.50',stock:2,seedsPerPack:'10 ks'
};
function environment(overrides={}){
 const errors=[],records=[];
 const elements={};
 const doc={
  addEventListener(){},
  querySelectorAll(){return[];},
  getElementById(id){return elements[id]||null;},
  body:{classList:{contains(){return true;}}}
 };
 const window={HERBA_CONFIG:{}};
 const ctx=createContext({
   window,document:doc,console:{error(){},warn(){},info(){}},
   localStorage:{getItem(){return null;}},sessionStorage:{getItem(){return null;}},
   setTimeout(){},confirm:()=>true,alert:message=>errors.push(message)
 });
 runInContext(code,ctx);
 runInContext(js,ctx);
 runInContext('adminAuthenticated=true;cloudDatabaseReady=true;varietyDatabase = '+JSON.stringify(base)+';',ctx);
 runInContext('sectionsDatabase = '+JSON.stringify([
  {id:'paradajky',name:'Paradajky',hidden:false},
  {id:'tekvice',name:'Tekvice a cukety',hidden:false},
  {id:'blog',name:'Blog',hidden:false}
 ])+';',ctx);
 runInContext('renderAll=()=>{};queueCloudSave=async(id,data)=>{window.__writes.push({id,data});return '+(overrides.reject?'false':'true')+';}',ctx);
 window.__writes=records;
 return {ctx,window,errors,records};
}
test('pracovná knižnica je dostupná iba prihlásenému správcovi',()=>{
 assert.doesNotThrow(()=>new Script(js));
 const {ctx,window,errors}=environment();
 runInContext('adminAuthenticated=false',ctx);
 assert.equal(window.HERBA_DRAFTS.open(),false);
 assert.equal(errors.length,1);
 assert.equal(window.HERBA_DRAFTS.readiness(full).length,0);
});
test('neúplné profily nemožno publikovať a nerobia žiadne zápisy',async()=>{
 const {window,records}=environment();
 const result=await window.HERBA_DRAFTS.move('Nová položka','paradajky',true);
 assert.equal(result,false);assert.equal(records.length,0);
 assert.equal(window.HERBA_DRAFTS.drafts().length,1);
});
test('na zverejnenie treba verejnú cieľovú kategóriu a platné údaje',async()=>{
 const {ctx,window,records}=environment();
 runInContext('varietyDatabase[1]='+JSON.stringify(full),ctx);
 assert.equal(await window.HERBA_DRAFTS.move('Nová položka','blog',true),false);
 assert.equal(await window.HERBA_DRAFTS.move('Nová položka','neexistuje',true),false);
 assert.equal(records.length,0);
 assert.equal(await window.HERBA_DRAFTS.move('Nová položka','paradajky',true),true);
 assert.equal(records.length,1);
 assert.equal(records[0].id,'varieties');
 assert.equal(records[0].data[1].section,'paradajky');
 assert.equal(records[0].data[1].hidden,false);
 assert.equal(records[0].data[0].name,'Ildi');
 assert.equal(records[0].data[0].price,'1.5');
 assert.equal(window.HERBA_DRAFTS.drafts().length,0);
});
test('nezverejnený presun zachová nastavenie hidden=true',async()=>{
 const {ctx,window,records}=environment();
 runInContext('varietyDatabase[1]='+JSON.stringify(full),ctx);
 assert.equal(await window.HERBA_DRAFTS.move('Nová položka','tekvice',false),true);
 assert.equal(records[0].data[1].hidden,true);
 assert.equal(records[0].data[1].section,'tekvice');
});
test('po zlyhaní cloudového zápisu zostanú rozpracované odrody nezmenené',async()=>{
 const {ctx,window,records}=environment({reject:true});
 runInContext('varietyDatabase[1]='+JSON.stringify(full),ctx);
 assert.equal(await window.HERBA_DRAFTS.move('Nová položka','paradajky',true),false);
 assert.equal(records.length,1);
 assert.equal(window.HERBA_DRAFTS.drafts()[0].hidden,true);
});
test('SEO export a verejné časti nikdy nesmú zahŕňať Pripravujeme',()=>{
 const records={
  sections:[{id:'paradajky',name:'Paradajky',hidden:false},{id:'pripravujeme',name:'Pripravujeme',hidden:false}],
  varieties:[...base,full]
 };
 const rows=publicProfiles(records);
 assert.deepEqual(rows.map(x=>x.name),['Ildi']);
 assert.match(html,/window\.HERBA_DRAFTS\?\.syncEditor\(\)/);
 assert.match(html,/const hidden = isDraft \|\| document\.getElementById\('varHidden'\)\.checked/);
 assert.match(html,/if \(idx >= 0 && varietyDatabase\[idx\]\?\.section === 'pripravujeme' && !isDraft && !hidden\)/);
 assert.match(html,/draftsOverlay/);
 assert.match(html,/draft-varieties\.js/);
});
