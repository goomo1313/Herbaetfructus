import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {publicProfiles,slugify,renderProfile,renderArchive,mainLogo} from '../scripts/variety-seo-lib.mjs';

const fixtures={
 sections:[{id:'paradajky',name:'Paradajky',hidden:false},{id:'tajne',name:'Súkromné',hidden:true}],
 varieties:[
  {name:'Ildi',section:'paradajky',hidden:false,type:'Multiflora',info:'Sladké žlté plody',
   img:'https://img.example.com/ildi.jpg',gallery:['javascript:alert(1)','https://img.example.com/ildi2.jpg'],
   properties:{flavor:'Sladké'},price:'1.50',stock:8,seedsPerPack:'10 ks'},
  {name:'Tajný kultivar',section:'paradajky',hidden:true,info:'NEZVEREJŇOVAŤ'},
  {name:'Skrytá sekcia',section:'tajne',hidden:false,info:'NEZVEREJŇOVAŤ'},
  {name:'Neoznačený',section:'paradajky',info:'Nedefinovaná viditeľnosť'}
 ]
};
test('exportuje iba explicitne verejné odrody vo verejných sekciách',()=>{
 const profiles=publicProfiles(fixtures);
 assert.equal(profiles.length,1);
 assert.equal(profiles[0].name,'Ildi');
 assert.deepEqual(profiles[0].photos,['https://img.example.com/ildi.jpg','https://img.example.com/ildi2.jpg']);
 assert.equal('price' in profiles[0],false);
 assert.equal('stock' in profiles[0],false);
 assert.equal('seedsPerPack' in profiles[0],false);
});
test('bez živých údajov cloudu sa export bezpečne zastaví',()=>{
 assert.throws(()=>publicProfiles({}),/Chýbajú aktuálne/);
 assert.throws(()=>publicProfiles({sections:fixtures.sections,varieties:[]}),/Žiadna verejná/);
});
test('profily majú skutočný text, správny canonical, logo a bez citlivých interných údajov',()=>{
 const one=publicProfiles(fixtures)[0];
 const html=renderProfile(one,mainLogo(readFileSync('index.html','utf8')));
 assert.match(html,/<h1>Ildi<\/h1>/);
 assert.match(html,/rel="canonical" href="https:\/\/herbaetfructus.sk\/odrody\/ildi\/"/);
 assert.match(html,/Sladké žlté plody/);
 assert.match(html,/application\/ld\+json/);
 assert.match(html,/<svg/);
 assert.doesNotMatch(html,/NEZVEREJŇOVAŤ|data-stock|data-price|seedsPerPack/);
 assert.match(renderArchive([one],mainLogo(readFileSync('index.html','utf8'))),/href="\/odrody\/ildi\/"/);
});
test('URL názvy sú predvídateľné a pri rôznej diakritike sa neprepisujú',()=>{
 assert.equal(slugify('Dívčí prs'),'divci-prs');
 const entries=publicProfiles({sections:fixtures.sections,varieties:[
  {...fixtures.varieties[0],name:'Býčie srdce'},
  {...fixtures.varieties[0],name:'Bycie srdce'}
 ]});
 assert.notEqual(entries[0].slug,entries[1].slug);
 assert.throws(()=>publicProfiles({sections:fixtures.sections,varieties:[
  fixtures.varieties[0],{...fixtures.varieties[0]}
 ]}),/Duplicitný/);
});
test('skutočne publikované profily sú zosúladené s verejným manifestom a sitemap',()=>{
 if(!existsSync('odrody/manifest.json'))return;
 const manifest=JSON.parse(readFileSync('odrody/manifest.json','utf8'));
 const sitemap=readFileSync('sitemap.xml','utf8');
 assert.ok(manifest.length>0);
 assert.equal(new Set(manifest.map(x=>x.slug)).size,manifest.length);
 for(const entry of manifest){
  const file='odrody/'+entry.slug+'/index.html';
  assert.ok(existsSync(file),file);
  const html=readFileSync(file,'utf8');
  assert.ok(html.includes('https://herbaetfructus.sk/odrody/'+entry.slug+'/'));
  assert.match(sitemap,new RegExp('odrody/'+entry.slug+'/'));
  assert.doesNotMatch(html,/data-stock|data-price|seedsPerPack|name="price"/);
 }
});


test('SEO titulky a meta popisy zostávajú stručné a výstižné',()=>{
 const profile=publicProfiles(fixtures)[0];
 const page=renderProfile(profile,mainLogo(readFileSync('index.html','utf8')));
 const title=page.match(/<title>([^<]+)<\/title>/)?.[1]||'';
 const description=page.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
 assert.ok(title.length>0&&title.length<=60,title);
 assert.ok(description.length>=75&&description.length<=155,description);
 if(existsSync('odrody/manifest.json')){
  const published=JSON.parse(readFileSync('odrody/manifest.json','utf8'));
  for(const p of published){
   const html=readFileSync('odrody/'+p.slug+'/index.html','utf8');
   assert.match(html,/<title>[^<]+<\/title>/);
  }
 }
});
