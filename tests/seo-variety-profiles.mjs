import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {publicProfiles,slugify,renderProfile,renderArchive,mainLogo,describe,esc} from '../scripts/variety-seo-lib.mjs';

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


test('meta popisy verejných profilov sú úplné vety, bez náhodného useknutia',()=>{
 const original=publicProfiles(fixtures)[0];
 const profiles=[
  original,
  {...original,name:"Matt's Hornet",slug:"matt-s-hornet",info:'Drobné pretiahnuté červené plody so žltooranžovým pásikovaním a špicom. Zaujímavá odroda z línie Matt’s Folly, s bohatou rodivosťou.',weight:'13–19 g'},
  {...original,name:'Pink Jumbo Banana',slug:'pink-jumbo-banana',section:'tekvice',sectionTitle:'Tekvice',
   info:'Populárna, viac než sto rokov stará rodová odroda tekvice obrovskej (Cucurbita maxima), ktorá je známa svojím špecifickým podlhovastým tvarom pripomínajúcim obrovský banán a ružovo-lososovou šupkou. Má hustú, sladkú dužinu s vynikajúcou textúrou a skvele sa skladuje.',
   weight:'5 – 20 kg',type:'Tekvica',color:'Ružová'},
  {...original,name:'Podororo de saint jean de beauregard',slug:'podororo-de-saint-jean-de-beauregard',
   info:'Unikátna historická odroda s výbornou arómou.',weight:'100–160 g'}
 ];
 for(const p of profiles){
  const desc=describe(p);
  assert.ok(desc.length>=75&&desc.length<=155,p.slug+': '+desc);
  assert.match(desc,/[.!?…]$/,p.slug+': '+desc);
  assert.doesNotMatch(desc,/Fotografie a$|nájdete v$|Hmotnosť:$|Farba:$/);
  const html=renderProfile(p,mainLogo(readFileSync('index.html','utf8')));
  assert.ok(html.includes('<meta name="description" content="'+esc(desc)+'">'),p.slug);
  assert.ok(html.includes('<meta property="og:description" content="'+esc(desc)+'">'),p.slug);
 }
 assert.match(describe(profiles[2]),/tekvica/);
 assert.match(describe(profiles[2]),/Má hustú, sladkú dužinu/);
 assert.doesNotMatch(describe(profiles[2]),/Populárna, viac než sto rokov stará rodová odroda tekvice obrovskej/);
});
