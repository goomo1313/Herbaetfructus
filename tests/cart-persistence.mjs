import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';

const page=readFileSync('index.html','utf8');
const appScript=[...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).filter(x=>x.trim()).join('\n');
const thanks=readFileSync('dakujeme.html','utf8');
const thanksScript=[...thanks.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(x=>x.trim()).join('\n');

function environment() {
 const local=new Map(),session=new Map();
 const storage=(map)=>({
   getItem(key){return map.has(key)?map.get(key):null;},
   setItem(key,value){map.set(key,String(value));},
   removeItem(key){map.delete(key);}
 });
 const varieties=[
   {name:'Ildi',stock:2,hidden:false,price:'1.50'},
   {name:'Golden Canary',stock:8,hidden:false,price:'1.20'},
   {name:'Skrytá',stock:5,hidden:true,price:'20'},
   {name:'Vypredaná',stock:0,hidden:false,price:'1.10'}
 ];
 const rows=varieties.map(v=>{
    const cb={checked:false,disabled:v.hidden||v.stock<1,value:v.name,dataset:{price:v.price}};
    const qty={value:'1',dataset:{max:String(v.stock)}};
    return {cb,qty,querySelector(sel){return sel==='input[type="checkbox"]'?cb:sel==='.form-qty-input'?qty:null;}};
 });
 const clear={hidden:true};
 const doc={
    addEventListener(){},
    querySelectorAll(sel){if(sel==='#formTomatoSelector .selector-item')return rows;if(sel==='.variety-card')return [];return [];},
    querySelector(){return null;},
    getElementById(id){return id==='clearSavedCartButton'?clear:null;},
    body:{classList:{contains(){return false;}}}
 };
 const ctx=createContext({
   document:doc,window:{HERBA_CONFIG:{}},localStorage:storage(local),sessionStorage:storage(session),
   console:{warn(){},error(){},info(){}},
   setTimeout(){},alert(){},
 });
 runInContext(appScript,ctx);
 runInContext('varietyDatabase = '+JSON.stringify(varieties)+';',ctx);
 return {ctx,rows,clear,local,session};
}

test('výber sa neprepíše prázdnym košíkom pred dokončením asynchrónneho načítania',()=>{
 const {ctx,local}=environment();
 local.set('herba_cart_v1','[{"name":"Ildi","quantity":2}]');
 runInContext('updateSelectionCounter()',ctx);
 assert.match(local.get('herba_cart_v1'),/"Ildi"/);
 assert.equal(runInContext('cartReadyToPersist',ctx),false);
});

test('obnova sa riadi aktuálnym skladom a neobnoví skryté či neexistujúce odrody',()=>{
 const {ctx,rows,local,clear}=environment();
 local.set('herba_cart_v1',JSON.stringify([
   {name:'Ildi',quantity:999},
   {name:'Skrytá',quantity:1},
   {name:'Vypredaná',quantity:1},
   {name:'Neexistuje',quantity:1},
   {name:'Golden Canary',quantity:3},
   {name:'Ildi',quantity:1}
 ]));
 assert.equal(runInContext('restoreSavedSelection()',ctx),2);
 assert.equal(rows[0].cb.checked,true);
 assert.equal(rows[0].qty.value,'2');
 assert.equal(rows[1].cb.checked,true);
 assert.equal(rows[1].qty.value,'3');
 assert.equal(rows[2].cb.checked,false);
 assert.equal(rows[3].cb.checked,false);
 assert.equal(clear.hidden,false);
 assert.deepEqual(JSON.parse(local.get('herba_cart_v1')),[
   {name:'Ildi',quantity:2},{name:'Golden Canary',quantity:3}
 ]);
});

test('každá zmena výberu aktualizuje lokálnu kópiu bez osobných dát a dá sa vymazať',()=>{
 const {ctx,rows,local,clear}=environment();
 runInContext('restoreSavedSelection()',ctx);
 rows[0].cb.checked=true;rows[0].qty.value='1';
 rows[1].cb.checked=true;rows[1].qty.value='5';
 runInContext('updateSelectionCounter()',ctx);
 const items=JSON.parse(local.get('herba_cart_v1'));
 assert.equal(items.length,2);
 assert.equal(items[1].quantity,5);
 assert.deepEqual(Object.keys(items[0]).sort(),['name','quantity']);
 assert.doesNotMatch(local.get('herba_cart_v1'),/email|price|stock|meno|adresa/i);
 assert.equal(runInContext('clearSavedSelection()',ctx),true);
 assert.equal(local.has('herba_cart_v1'),false);
 assert.equal(clear.hidden,true);
 assert.ok(rows.every(row=>!row.cb.checked));
});

test('neplatný alebo pozastavený formulár nedáva súhlas na zmazanie košíka',()=>{
 const {ctx,rows,session}=environment();
 rows[0].cb.checked=true;
 runInContext("farmSettings.email='test@example.com';farmSettings.orderFormPaused=true",ctx);
 let canceled=false;
 const submit=runInContext('handleFormSubmit',ctx);
 assert.equal(submit({preventDefault(){canceled=true;}}),false);
 assert.equal(canceled,true);
 assert.equal(session.has('herba_inquiry_pending_v1'),false);
 runInContext('farmSettings.orderFormPaused=false',ctx);
 assert.equal(submit({preventDefault(){}}),true);
 assert.ok(Number(session.get('herba_inquiry_pending_v1'))>0);
});

test('ďakovná stránka nemaže výber pri priamom otvorení ani pri starom potvrdení',()=>{
 const {local,session,ctx}=environment();
 const thanksCtx=createContext({localStorage:ctx.localStorage,sessionStorage:ctx.sessionStorage,Date});
 local.set('herba_cart_v1','[{"name":"Ildi","quantity":1}]');
 runInContext(thanksScript,thanksCtx);
 assert.ok(local.has('herba_cart_v1'));
 session.set('herba_inquiry_pending_v1',String(Date.now()-40*60*1000));
 runInContext(thanksScript,thanksCtx);
 assert.ok(local.has('herba_cart_v1'));
 session.set('herba_inquiry_pending_v1',String(Date.now()));
 runInContext(thanksScript,thanksCtx);
 assert.equal(local.has('herba_cart_v1'),false);
 assert.equal(session.has('herba_inquiry_pending_v1'),false);
});

test('pretrvávanie výberu je nezávislé od Supabase a nenahrádza FormSubmit serverovú validáciu',()=>{
 assert.match(page,/savedCartStorageKey = 'herba_cart_v1'/);
 assert.match(page,/localStorage\.setItem\(savedCartStorageKey/);
 assert.match(page,/await loadCloudContent\(\);[\s\S]*restoreSavedSelection\(\);[\s\S]*restoreMarkerCart\(\)/);
 assert.match(page,/id="clearSavedCartButton"/);
 assert.match(page,/id="contactForm" method="POST" onsubmit="handleFormSubmit\(event\)"/);
 assert.match(page,/https:\/\/formsubmit\.co/);
 assert.match(thanks,/meta name="robots" content="noindex,follow"/);
});
