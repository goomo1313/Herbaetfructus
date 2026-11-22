import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext,Script} from 'node:vm';

const html=readFileSync('index.html','utf8');
const enhancements=readFileSync('site-enhancements.js','utf8');
const bulk=readFileSync('variety-bulk.js','utf8');
const drafts=readFileSync('draft-varieties.js','utf8');
const inline=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).filter(Boolean).join('\n');

const publicRows=[
 {name:'Ildi',section:'paradajky',hidden:false,info:'Žltá paradajka',type:'Multiflora',color:'Žltá',stock:4,img:'https://example.org/i.jpg',price:'1.5'},
 {name:'Skrytá odroda',section:'paradajky',hidden:true,info:'Skrytý test',type:'Cherry',color:'Červená',stock:1},
 {name:'Perun',section:'paradajky',hidden:false,info:'Žlté plody',type:'Cherry',color:'Žltá',stock:2}
];
const privateRows=[
 {id:'draft-001',content:{name:'Nová zberateľská',section:'pripravujeme',hidden:true,info:'',targetSection:'paradajky',stock:0}},
 {id:'draft-002',content:{name:'Skúšobná rozpracovaná',section:'pripravujeme',hidden:true,info:'Opis pripraveného konceptu',stock:1}}
];
function baseEnv(){
 const nodes=new Map(),written=new Map();
 const createEl=()=>({
  children:[],style:{},dataset:{},classList:{add(){},remove(){},contains(){return false}},
  textContent:'',value:'',hidden:false,disabled:false,
  setAttribute(){},getAttribute(){return null;},addEventListener(type,fn){this['on_'+type]=fn},
  append(...items){this.children.push(...items)},appendChild(x){this.children.push(x);return x},
  replaceChildren(...items){this.children=[...items]},focus(){},querySelector(){return null},
  querySelectorAll(){return []}
 });
 const doc={
  activeElement:{focus(){}},body:{classList:{contains(){return false}}},
  addEventListener(){},querySelector(){return null},querySelectorAll(){return []},
  getElementById(id){return nodes.get(id)||null},createElement:createEl
 };
 const client={from(){return {select:async()=>({data:[],error:null})}}};
 const win={HERBA_CONFIG:{supabaseUrl:'https://test.supabase.co',supabaseAnonKey:'sb_publishable_example'},
  supabase:{createClient(){return client}},location:{href:''}};
 const storage={setItem(k,v){written.set(k,String(v))},getItem(k){return written.get(k)||null},
  removeItem(k){written.delete(k)}};
 const ctx=createContext({window:win,document:doc,sessionStorage:storage,
  localStorage:{getItem(){return null}},console:{error(){},warn(){},info(){}},
  setTimeout(){},alert(){},confirm(){return true},URL});
 runInContext(inline,ctx);
 runInContext(enhancements,ctx);
 runInContext(bulk,ctx);
 runInContext('varietyDatabase = '+JSON.stringify(publicRows)+'; adminAuthenticated=true; cloudDatabaseReady=true; farmSettings.generatorPaused=false;',ctx);
 const add=(id,props={})=>{const el=Object.assign(createEl(),props);nodes.set(id,el);return el};
 return {ctx,win,doc,nodes,written,add};
}
test('správca prepne medzi zverejnenými, súkromnými a skrytými bez miešania databáz',async()=>{
 const e=baseEnv();
 const scope=e.add('enhancedDashboardScope',{value:'published'});
 const search=e.add('enhancedDashboardSearch',{value:''});
 const status=e.add('enhancedDashboardStatus',{value:'all',options:[
  {value:'all'},{value:'hidden'},{value:'out'},{value:'ready'}]});
 const tbody=e.add('enhancedDashboardRows'), count=e.add('enhancedDashboardCount');
 e.add('enhancedDashboardStats');e.add('enhancedDashboardActions');
 e.add('enhancedDashboardHint');e.add('enhancedDashboardEmpty');
 let loads=0,edits=[];
 e.win.HERBA_DRAFTS={
  async load(){loads++;return true},
  entries(){return privateRows},
  readiness(row){return row.name==='Skúšobná rozpracovaná'?[]:['opis','fotografia']},
  edit(id){edits.push(id)}
 };
 const api=e.win.HERBA_IMPROVEMENTS;
 api.dashboardRender();
 assert.deepEqual(api.dashboardRecords().map(r=>r.item.name),['Ildi','Perun']);
 assert.equal(tbody.children.length,2);
 assert.equal(count.textContent,'Zobrazených 2 z 2 odrôd');
 scope.value='drafts';
 assert.equal(await api.dashboardScopeChange(),true);
 assert.equal(loads,1);
 assert.deepEqual(api.dashboardRecords().map(r=>r.item.name),privateRows.map(r=>r.content.name));
 assert.equal(tbody.children.length,2);
 assert.equal(count.textContent,'Zobrazených 2 z 2 odrôd');
 assert.equal(status.options.find(o=>o.value==='hidden').disabled,true);
 status.value='ready';api.dashboardFilter();
 assert.equal(tbody.children.length,1);
 assert.equal(tbody.children[0].children[0].textContent,'Skúšobná rozpracovaná');
 // Tlačidlo editácie konceptu odovzdá súkromné ID, nie index verejného katalógu.
 const tr=tbody.children[0],last=tr.children[tr.children.length-1];
 assert.equal(typeof last.children[0].on_click,'function');
 last.children[0].on_click();
 assert.deepEqual(edits,['draft-002']);
 scope.value='catalogue';
 await api.dashboardScopeChange();
 assert.equal(status.value,'all');
 assert.equal(tbody.children.length,3);
 assert.ok(tbody.children.map(r=>r.children[0].textContent).includes('Skrytá odroda'));
 assert.deepEqual(Array.from(runInContext('varietyDatabase.map(v=>v.name)',e.ctx)),publicRows.map(v=>v.name));
});
test('neúspešné súkromné načítanie nesprístupní údaje verejnej databázy v Pripravujeme',async()=>{
 const e=baseEnv();
 const scope=e.add('enhancedDashboardScope',{value:'drafts'});
 e.add('enhancedDashboardStatus',{value:'all',options:[]});
 e.add('enhancedDashboardSearch',{value:''});
 const count=e.add('enhancedDashboardCount'), rows=e.add('enhancedDashboardRows');
 e.add('enhancedDashboardStats');e.add('enhancedDashboardActions');e.add('enhancedDashboardHint');
 e.win.HERBA_DRAFTS={async load(){throw new Error('Unauthorized')},entries(){return []}};
 assert.equal(await e.win.HERBA_IMPROVEMENTS.dashboardScopeChange(),false);
 assert.equal(rows.children.length,0);
 assert.match(count.textContent,/Súkromné koncepty nie sú dostupné/);
});
test('3D štítky používajú iba zvolených 1–60 názvov, bez Supabase zápisu',()=>{
 const e=baseEnv();
 e.win.HERBA_BULK_FIELDS={fields(){return [{key:'fake'}]},field(){return null}};
 e.add('bulkSearch',{value:''});
 e.add('bulkField',{value:'fake'});
 e.add('bulkStatus');e.add('bulkVarietyModal');
 const api=e.win.HERBA_BULK;
 assert.equal(api.open(),true);
 api.selectVisible();
 const names=api.selectedMarkerNames();
 assert.deepEqual(Array.from(names),publicRows.map(row=>row.name));
 assert.equal(api.markerValidation(),'');
 const original=runInContext('JSON.stringify(varietyDatabase)',e.ctx);
 assert.equal(api.openMarkers(),true);
 assert.equal(e.win.location.href,'/3d/?vyber=1');
 assert.deepEqual(JSON.parse(e.written.get('herba_3d_names_v1')),names);
 assert.equal(runInContext('JSON.stringify(varietyDatabase)',e.ctx),original);
 assert.equal(e.written.has('herba_cart_restore_v1'),false);
});
test('3D hromadná akcia rešpektuje zákaz generátora, limit a dĺžku názvov',()=>{
 const e=baseEnv();
 e.win.HERBA_BULK_FIELDS={fields(){return [{key:'fake'}]},field(){return null}};
 e.add('bulkSearch',{value:''});
 e.add('bulkField',{value:'fake'});e.add('bulkStatus');e.add('bulkVarietyModal');
 const api=e.win.HERBA_BULK;
 api.open();api.selectVisible();
 runInContext('farmSettings.generatorPaused=true',e.ctx);
 assert.match(api.markerValidation(),/pozastavený/);
 assert.equal(api.openMarkers(),false);
 assert.equal(e.win.location.href,'');
 runInContext('farmSettings.generatorPaused=false',e.ctx);
 api.open();api.selectVisible();
 // Nový výber 61 odrôd sa nemôže odoslať.
 runInContext('varietyDatabase = Array.from({length:61},(_,i)=>({name:"Odroda "+i,section:"paradajky",hidden:false}))',e.ctx);
 api.open();api.selectVisible();
 assert.match(api.markerValidation(),/najviac 60/);
 assert.equal(api.openMarkers(),false);
 runInContext('varietyDatabase = [{name:"A".repeat(41),section:"paradajky",hidden:false}]',e.ctx);
 api.open();api.selectVisible();
 assert.match(api.markerValidation(),/40 znakov/);
 assert.equal(api.openMarkers(),false);
});
test('UI súčasti oboch akcií ostávajú iba v správcoch',()=>{
 assert.match(html,/id="enhancedDashboardScope"/);
 assert.match(html,/option value="published"/);
 assert.match(html,/option value="drafts"/);
 assert.match(html,/option value="catalogue"/);
 assert.match(html,/id="bulkGenerateMarkers"/);
 assert.match(html,/id="bulkMarkerHint"/);
 assert.doesNotThrow(()=>new Script(bulk));
 assert.match(drafts,/const entries=\(\)=>adminReady\(\)&&loaded/);
 assert.match(enhancements,/window\.HERBA_DRAFTS\?\.edit\(row\.id\)/);
 assert.match(bulk,/sessionStorage\.setItem\('herba_3d_names_v1'/);
});
