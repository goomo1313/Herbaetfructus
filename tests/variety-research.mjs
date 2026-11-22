import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifiedVarietyResearch, publicProfiles, renderProfile, mainLogo } from '../scripts/variety-seo-lib.mjs';

const research=JSON.parse(readFileSync('variety-research.json','utf8'));
const html=readFileSync('index.html','utf8');

test('27 curated profiles have expanded text and two explicitly named HTTPS sources',()=>{
 const entries=Object.entries(research);
 assert.equal(entries.length,27);
 const names=new Set();
 for(const [name,row] of entries){
  assert.ok(!names.has(name.toLocaleLowerCase('sk')),name+' duplicate');names.add(name.toLocaleLowerCase('sk'));
  assert.ok(Array.isArray(row.paragraphs)&&row.paragraphs.length>=3,name+' missing paragraphs');
  assert.ok(row.paragraphs.every(text=>typeof text==='string'&&text.length>=100),name+' short paragraphs');
  assert.ok(Array.isArray(row.sources)&&row.sources.length>=2,name+' missing references');
  assert.ok(row.sources.every(src=>src.title && /^https:\/\//i.test(src.url)),name+' invalid URL');
  assert.notEqual(new URL(row.sources[0].url).hostname,new URL(row.sources[1].url).hostname,
    name+' sources are not independent domains');
  assert.ok(verifiedVarietyResearch(name),name+' is not loaded by generator');
 }
});

test('no invented claims about own harvest, fake metrics or seller ratings in expanded copy',()=>{
 for(const [name,row] of Object.entries(research)){
  const text=row.paragraphs.join(' ').toLocaleLowerCase('sk');
  assert.doesNotMatch(text,/z našej úrody máme|naša garantovaná úroda|v našom záhone dosiahla/i,name);
  assert.ok(row.status.includes('osiva'),name+' missing identity qualification');
 }
});

test('public profile includes full citations and retains original Supabase description',()=>{
 const base={name:'Ildi',section:'paradajky',hidden:false,type:'Multiflora',
   info:'PÔVODNÝ opis správcu, ktorý sa nesmie prepísať.',img:'https://example.com/image.jpg',
   properties:{growth:'Kolíková'},stock:2,price:'1.5'};
 const p=publicProfiles({sections:[{id:'paradajky',name:'Paradajky',hidden:false}],
   varieties:[base]})[0];
 const page=renderProfile(p,mainLogo(html),[p]);
 assert.ok(page.includes('PÔVODNÝ opis správcu'));
 assert.match(page,/Podrobnejší opis a overené zdroje/);
 assert.match(page,/Zdroje na overenie/);
 assert.match(page,/rhs\.org\.uk\/plants\/293891/);
 assert.match(page,/tomatofest\.com\/Ildi/);
 assert.match(page,/Konkrétna línia v našej zbierke sa môže líšiť/);
 assert.match(page,/rel="noopener noreferrer"/);
 assert.equal(p.info,base.info);
});

test('research only published for exact matched variety names',()=>{
 const p=publicProfiles({sections:[{id:'paradajky',name:'Paradajky',hidden:false}],
  varieties:[{name:'Nezávislá skúšobná odroda',section:'paradajky',hidden:false,info:'Len náš vlastný opis.'}]})[0];
 const result=renderProfile(p,mainLogo(html),[p]);
 assert.doesNotMatch(result,/Podrobnejší opis a overené zdroje/);
 assert.match(result,/Len náš vlastný opis/);
});

test('private drafts are never released through static public SEO regardless of research text',()=>{
 const list=publicProfiles({
  sections:[{id:'paradajky',name:'Paradajky',hidden:false},{id:'pripravujeme',name:'Pripravujeme',hidden:false}],
  varieties:[
   {name:'Ildi',section:'pripravujeme',hidden:true,info:'Private draft'},
   {name:'Banana Legs',section:'paradajky',hidden:false,info:'Public variety'}
  ]});
 assert.deepEqual(list.map(x=>x.name),['Banana Legs']);
 assert.match(renderProfile(list[0],mainLogo(html),list),/Podrobnejší opis a overené zdroje/);
});
