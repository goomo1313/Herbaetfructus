import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createContext,runInContext,Script} from 'node:vm';
import {publicProfiles} from '../scripts/variety-seo-lib.mjs';

const html=readFileSync('index.html','utf8');
const js=readFileSync('draft-varieties.js','utf8');
const sql=readFileSync('SUPABASE_PRIPRAVUJEME.sql','utf8');
const appScript=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).filter(Boolean).join('\n');

const original={name:'Ildi',section:'paradajky',hidden:false,type:'Multiflora',color:'Žltá',
 info:'Hotový opis',img:'https://example.org/ildi.jpg',price:'1.5',stock:2,seedsPerPack:'10 ks'};
const unready={name:'Nová položka',section:'pripravujeme',hidden:true,type:'Neurčené',color:'Neurčená',
 info:'',img:'',price:'0.00',stock:0,seedsPerPack:''};
const finished={...unready,type:'Indeterminantná',color:'Červená',
 info:'Overené informácie o odrode s konkrétnym popisom plodov, ich použitím a potrebami rastliny. Identitu osiva ešte potvrdí správca a až potom ju zverejní.',
 img:'https://example.org/photo.jpg',price:'1.50',stock:2,seedsPerPack:'10 ks'};
function environment(opts={}){
 const alerts=[],publicWrites=[],privateWrites=[],privateRows=[
  {id:'draft-example-1',content:JSON.parse(JSON.stringify(unready))}
 ];
 const client={from(table){
  assert.equal(table,'site_drafts');
  return {
   select:async()=>({data:opts.loadFails?null:privateRows,error:opts.loadFails?{message:'table missing'}:null}),
   upsert:async row=>{
    privateWrites.push(row);
    if(opts.saveFails)return{error:{message:'RLS write rejected'}};
    const i=privateRows.findIndex(v=>v.id===row.id);
    if(i<0)privateRows.push({id:row.id,content:row.content});
    else privateRows[i]={id:row.id,content:row.content};
    return{error:null};
   },
   delete:()=>({eq:async(_,id)=>{
     const i=privateRows.findIndex(v=>v.id===id);
     if(i>=0)privateRows.splice(i,1);
     return{error:null};
   }})
  };
 }};
 const win={HERBA_CONFIG:{supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'sb_publishable_test_key',adminUserId:'00000000-0000-0000-0000-000000000001'},
  supabase:{createClient(){return client;}},__publicWrites:publicWrites};
 const doc={getElementById(){return null;},addEventListener(){},querySelectorAll(){return[]},
  body:{classList:{contains(){return true;}}}};
 const ctx=createContext({window:win,document:doc,localStorage:{getItem(){return null}},
  setTimeout(){},confirm:()=>true,alert:message=>alerts.push(message),
  console:{error(){},warn(){},info(){}}});
 runInContext(appScript,ctx);
 runInContext(js,ctx);
 runInContext('adminAuthenticated=true;cloudDatabaseReady=true;varietyDatabase = '+JSON.stringify([original])+';',ctx);
 runInContext('sectionsDatabase = '+JSON.stringify([
  {id:'paradajky',name:'Paradajky',hidden:false},
  {id:'tekvice',name:'Tekvice a cukety',hidden:false},
  {id:'hidden',name:'Skrytá kategória',hidden:true}
 ])+';',ctx);
 runInContext('renderAll=()=>{};queueCloudSave=async(id,data)=>{window.__publicWrites.push({id,data});return '+(opts.publicFails?'false':'true')+';}',ctx);
 return {ctx,win,alerts,privateRows,privateWrites,publicWrites,api:win.HERBA_DRAFTS};
}
test('Pripravujeme je dostupné len prihlásenému správcovi a nie cez verejný site_content',async()=>{
 assert.doesNotThrow(()=>new Script(js));
 const {ctx,api,alerts}=environment();
 runInContext('adminAuthenticated=false',ctx);
 assert.equal(await api.open(),false);
 assert.equal(alerts.length,1);
 assert.equal(api.drafts().length,0);
 assert.match(sql,/alter table public\.site_drafts enable row level security/i);
 assert.match(sql,/revoke all on table public\.site_drafts from anon/i);
 assert.match(sql,/to authenticated/i);
 assert.doesNotMatch(sql,/to anon\s+using \(true\)/i);
});
test('neúplný koncept nejde publikovať ani zapísať do verejného katalógu',async()=>{
 const {api,publicWrites}=environment();
 assert.equal(await api.load(),true);
 assert.equal(api.drafts().length,1);
 assert.ok(api.readiness(unready).length>=4);
 assert.equal(await api.move('draft-example-1','paradajky',true),false);
 assert.equal(publicWrites.length,0);
});
test('cieľová kategória sa uchováva súkromne bez zverejnenia',async()=>{
 const {api,privateRows,publicWrites}=environment();
 await api.load();
 assert.equal(await api.move('draft-example-1','tekvice',false),true);
 assert.equal(publicWrites.length,0);
 assert.equal(privateRows[0].content.section,'pripravujeme');
 assert.equal(privateRows[0].content.hidden,true);
 assert.equal(privateRows[0].content.targetSection,'tekvice');
});
test('hotový koncept sa publikuje až po zápise do cloudu; ostatné dáta ostanú',async()=>{
 const {api,ctx,publicWrites,privateRows}=environment();
 await api.load();
 assert.equal(await api.saveDraft(finished,'draft-example-1'),true);
 assert.equal(api.readiness(finished).length,0);
 assert.equal(await api.move('draft-example-1','paradajky',true),true);
 assert.equal(publicWrites.length,1);
 assert.equal(publicWrites[0].id,'varieties');
 assert.equal(publicWrites[0].data.length,2);
 assert.equal(publicWrites[0].data[1].section,'paradajky');
 assert.equal(publicWrites[0].data[1].hidden,false);
 assert.equal(publicWrites[0].data[0].price,'1.5');
 assert.equal(privateRows.length,0);
 assert.equal(api.drafts().length,0);
 assert.equal(runInContext('varietyDatabase.length',ctx),2);
});
test('neúspešné verejné uloženie nesmie zmeniť ani zmazať súkromný koncept',async()=>{
 const {api,privateRows,publicWrites}=environment({publicFails:true});
 await api.load();
 await api.saveDraft(finished,'draft-example-1');
 assert.equal(await api.move('draft-example-1','paradajky',true),false);
 assert.equal(publicWrites.length,1);
 assert.equal(api.drafts()[0].hidden,true);
 assert.equal(privateRows.length,1);
});
test('súkromný koncept sa nedá presunúť do neplatnej alebo skrytej kategórie',async()=>{
 const {api,publicWrites}=environment();
 await api.load();await api.saveDraft(finished,'draft-example-1');
 assert.equal(await api.move('draft-example-1','hidden',true),false);
 assert.equal(await api.move('draft-example-1','neexistuje',true),false);
 assert.equal(publicWrites.length,0);
});
test('staging zostáva mimo SEO exportu a vlastného katalógového JSON',()=>{
 const profiles=publicProfiles({
  sections:[{id:'paradajky',name:'Paradajky',hidden:false},{id:'pripravujeme',name:'Pripravujeme',hidden:false}],
  varieties:[original,unready]
 });
 assert.deepEqual(profiles.map(p=>p.name),['Ildi']);
 assert.match(html,/await window\.HERBA_DRAFTS\?\.saveDraft\(item\)/);
 assert.match(html,/if \(isDraft\) \{[\s\S]*?saveDraft\(item\)/);
 assert.match(html,/window\.HERBA_DRAFTS\?\.inDraftEditor\(\)/);
 assert.match(html,/draftsOverlay/);
 assert.match(html,/draft-varieties\.js/);
});
