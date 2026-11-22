import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext,Script} from 'node:vm';

const code=readFileSync('draft-bulk.js','utf8');
const fields=readFileSync('variety-bulk-fields.js','utf8');
const html=readFileSync('index.html','utf8');
const overview=readFileSync('site-enhancements.js','utf8');
function environment(){
 const nodes=new Map(),calls=[],events=[];
 function element(){
  const classes=new Set();
  return {
   value:'',textContent:'',children:[],hidden:false,disabled:false,style:{},checked:false,
   classList:{add(x){classes.add(x)},remove(x){classes.delete(x)},contains(x){return classes.has(x)}},
   setAttribute(){},getAttribute(){return null;},focus(){},querySelector(){return null;},
   append(...xs){this.children.push(...xs);},appendChild(x){this.children.push(x);return x;},
   replaceChildren(...xs){this.children=xs;},
   addEventListener(name,fn){this['on_'+name]=fn;}
  };
 }
 const doc={body:element(),createElement:element,getElementById(id){return nodes.get(id)||null;},
  addEventListener(name,fn){events.push([name,fn]);}};
 const ids=['draftBulkClose','draftBulkSearch','draftBulkSelect','draftBulkClear','draftBulkCount',
  'draftBulkFiltered','draftBulkList','draftBulkField','draftBulkValue','draftBulkChoice',
  'draftBulkLong','draftBulkErase','draftBulkClearWrap','draftBulkHelp','draftBulkPreview',
  'draftBulkApply','draftBulkStatus'];
 for(const id of ids)nodes.set(id,element());
 let rows=[
  {id:'draft-a',content:{name:'Prvá',section:'pripravujeme',hidden:true,stock:2,targetSection:'paradajky'}},
  {id:'draft-b',content:{name:'Druhá',section:'pripravujeme',hidden:true,stock:3,targetSection:'paradajky'}}
 ];
 const client={from(table){
  assert.equal(table,'site_drafts');
  return {upsert(payload){
   calls.push(payload);
   rows=rows.map(row=>payload.find(p=>p.id===row.id)?{...row,content:payload.find(p=>p.id===row.id).content}:row);
   return {select:async()=>({data:payload.map(x=>({id:x.id})),error:null})};
  }};
 }};
 const api={async load(){return true},entries(){return rows.map(x=>({id:x.id,content:{...x.content}}))}};
 const win={HERBA_DRAFTS:api,HERBA_VARIETY_PROPERTIES:{fields:[]}};
 const ctx=createContext({window:win,document:doc,adminSupabase:client,cloudDatabaseReady:true,
  requireAdmin:()=>true,sectionsDatabase:[{id:'paradajky',name:'Paradajky',hidden:false}],
  confirm:()=>true,alert(){},console});
 runInContext(fields,ctx);runInContext(code,ctx);
 return {nodes,ctx,win,calls,rows:()=>rows,api};
}
test('Pripravujeme má vlastné hromadné operácie v prehľade i v sekcii',()=>{
 assert.doesNotThrow(()=>new Script(code));
 assert.match(overview,/HERBA_DRAFT_BULK\?\.open\(\)/);
 assert.match(html,/onclick="window\.HERBA_DRAFT_BULK\?\.open\(\)"/);
 assert.match(html,/src="\.\/draft-bulk\.js/);
 assert.doesNotMatch(code,/queueCloudSave\(/);
});
test('hromadná zmena skladu upraví iba označený koncept a zachová súkromie',async()=>{
 const e=environment();
 assert.equal(await e.win.HERBA_DRAFT_BULK.open(),true);
 e.nodes.get('draftBulkSearch').value='Prvá';
 e.nodes.get('draftBulkSearch').on_input();
 e.nodes.get('draftBulkSelect').on_click();
 e.nodes.get('draftBulkField').value='stock';
 e.nodes.get('draftBulkField').on_change();
 e.nodes.get('draftBulkValue').value='9';
 e.nodes.get('draftBulkValue').on_input();
 assert.equal(e.nodes.get('draftBulkApply').disabled,false);
 await e.nodes.get('draftBulkApply').on_click();
 assert.equal(e.calls.length,1);
 assert.equal(e.calls[0].length,1);
 assert.equal(e.calls[0][0].id,'draft-a');
 assert.equal(e.rows()[0].content.stock,9);
 assert.equal(e.rows()[1].content.stock,3);
 assert.equal(e.rows()[0].content.hidden,true);
 assert.equal(e.rows()[0].content.section,'pripravujeme');
 assert.match(e.nodes.get('draftBulkStatus').textContent,/Uložených 1/);
});
test('pokus zmeniť viditeľnosť konceptov nie je dostupnou hromadnou operáciou',async()=>{
 const e=environment();
 await e.win.HERBA_DRAFT_BULK.open();
 const keys=e.nodes.get('draftBulkField').children.map(x=>x.value);
 assert.equal(keys.includes('hidden'),false);
 assert.equal(keys.includes('section'),false);
 assert.equal(keys.includes('name'),false);
 assert.ok(keys.includes('targetSection'));
});
test('pri konflikte so súbežnou zmenou sa hromadný zápis zablokuje',async()=>{
 const e=environment();
 await e.win.HERBA_DRAFT_BULK.open();
 e.nodes.get('draftBulkSelect').on_click();
 e.nodes.get('draftBulkField').value='stock';
 e.nodes.get('draftBulkField').on_change();
 e.nodes.get('draftBulkValue').value='8';
 e.nodes.get('draftBulkValue').on_input();
 const oldLoad=e.api.load;
 e.api.load=async()=>{e.rows()[0].content.stock=7;return oldLoad();};
 await e.nodes.get('draftBulkApply').on_click();
 assert.equal(e.calls.length,0);
 assert.match(e.nodes.get('draftBulkStatus').textContent,/medzitým zmenil/);
});