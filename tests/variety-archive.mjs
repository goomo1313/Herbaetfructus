import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {publicProfiles,renderArchive,mainLogo} from '../scripts/variety-seo-lib.mjs';

const data={
 sections:[{id:'paradajky',name:'Paradajky',hidden:false},{id:'tekvice',name:'Tekvice a cukety',hidden:false}],
 varieties:[
  {name:'Ildi',section:'paradajky',hidden:false,img:'https://example.org/ildi.jpg',info:'Žltá cherry',price:5,stock:200},
  {name:'Dívčí prs',section:'paradajky',hidden:false,img:'https://example.org/divci.jpg'},
  {name:'Hokkaido',section:'tekvice',hidden:false},
  {name:'Skrytá',section:'paradajky',hidden:true}
 ]
};

test('verejný archív má prístupné filtre, kategórie a nevypíše súkromné údaje',()=>{
 const profiles=publicProfiles(data);
 const page=renderArchive(profiles,mainLogo(readFileSync('index.html','utf8')));
 assert.match(page,/id="profile-search"/);
 assert.match(page,/id="profile-section"/);
 assert.match(page,/id="profile-reset"/);
 assert.match(page,/id="profile-count" aria-live="polite"/);
 assert.match(page,/id="profile-empty" hidden/);
 assert.match(page,/id="profile-list"/);
 assert.match(page,/src="\.\.\/variety-archive\.js" defer/);
 assert.match(page,/data-section="paradajky"/);
 assert.match(page,/data-section="tekvice"/);
 assert.match(page,/<option value="tekvice">Tekvice a cukety<\/option>/);
 assert.equal((page.match(/class="profile-card"/g)||[]).length,3);
 assert.doesNotMatch(page,/Skrytá|stock|price|200/);
 const structured=page.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)?.[1];
 assert.ok(structured);
 const schema=JSON.parse(structured);
 assert.equal(schema['@type'],'CollectionPage');
 assert.equal(schema.mainEntity.numberOfItems,3);
 assert.equal(schema.mainEntity.itemListElement.length,3);
});

test('filterovanie ignoruje diakritiku, kombinuje skupiny, oznamuje počty a funguje reset',()=>{
 const listeners={};
 const element=(values={})=>({
  value:'',hidden:false,textContent:'',dataset:{},listeners:{},
  addEventListener(event,listener){this.listeners[event]=listener;},
  focus(){this.focused=true;},
  ...values
 });
 const search=element(),section=element(),reset=element(),count=element(),empty=element(),form=element();
 const card=(name,group)=>element({dataset:{section:group},querySelector(sel){return sel==='strong'?{textContent:name}:null;}});
 const cards=[card('Dívčí prs','paradajky'),card('Ildi','paradajky'),card('Hokkaido','tekvice')];
 const list=element({querySelectorAll(){return cards;}});
 const elements={
  'profile-search':search,'profile-section':section,'profile-reset':reset,
  'profile-count':count,'profile-empty':empty,'profile-filters':form,'profile-list':list
 };
 const doc={getElementById(id){return elements[id]||null;}};
 runInNewContext(readFileSync('variety-archive.js','utf8'),{document:doc});
 assert.equal(count.textContent,'3 odrody');
 search.value='divci';
 search.listeners.input();
 assert.equal(count.textContent,'1 odroda');
 assert.deepEqual(cards.map(x=>x.hidden),[false,true,true]);
 section.value='tekvice';
 section.listeners.change();
 assert.equal(count.textContent,'0 odrôd');
 assert.equal(empty.hidden,false);
 let prevented=false;
 form.listeners.submit({preventDefault(){prevented=true;}});
 assert.equal(prevented,true);
 reset.listeners.click();
 assert.equal(search.value,'');
 assert.equal(section.value,'');
 assert.deepEqual(cards.map(x=>x.hidden),[false,false,false]);
 assert.equal(empty.hidden,true);
 assert.equal(search.focused,true);
});

test('publikovaný archív naozaj obsahuje vyhľadávanie aj všetkých aktuálnych 51 odrôd',()=>{
 const manifest=JSON.parse(readFileSync('odrody/manifest.json','utf8'));
 const page=readFileSync('odrody/index.html','utf8');
 assert.ok(manifest.length>0);
 assert.match(page,/id="profile-search"/);
 assert.equal((page.match(/class="profile-card"/g)||[]).length,manifest.length);
 for(const p of manifest){
  assert.ok(page.includes('href="/odrody/'+p.slug+'/"'),p.slug);
  assert.ok(page.includes('data-section="'+p.section+'"'),p.section);
 }
});
