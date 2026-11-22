import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {publicProfiles,renderProfile,mainLogo} from '../scripts/variety-seo-lib.mjs';

const script=readFileSync('variety-taxonomy.js','utf8');
const html=readFileSync('index.html','utf8');
const bulk=readFileSync('variety-bulk-fields.js','utf8');
const filters=readFileSync('site-enhancements.js','utf8');
function taxonomy(){const ctx={window:{}};runInNewContext(script,ctx);return ctx.window.HERBA_TAXONOMY;}

test('samostatné kategórie a rast bez hádania neznámeho údaja',()=>{
 const T=taxonomy();
 assert.equal(T.fruitType({type:'Indeterminantná'}),'Neurčený');
 assert.equal(T.growthHabit({type:'Indeterminantná'}),'Indeterminantná');
 assert.equal(T.fruitType({type:'Multiflora'}),'Multiflora');
 assert.equal(T.growthHabit({type:'Multiflora'}),'Neurčený');
 assert.equal(T.growthHabit({growthHabit:'Polodeterminantná',fruitType:'Cherry & Koktailová'}),'Polodeterminantná');
 assert.equal(T.fruitType({type:'Determinantná',fruitType:'Cherry & Koktailová'}),'Cherry & Koktailová');
});
test('editor zachováva nezávislé hodnoty a odmietne prehodenú kategóriu',()=>{
 const T=taxonomy();
 const previous={name:'Ildi',weight:'10–20 g',price:'1.50',stock:2,img:'https://example.com/a.jpg'};
 const updated=T.fromEditor(previous,'Multiflora','Indeterminantná');
 assert.equal(updated.fruitType,'Multiflora');
 assert.equal(updated.type,'Multiflora');
 assert.equal(updated.growthHabit,'Indeterminantná');
 assert.equal(updated.price,previous.price);
 assert.equal(updated.img,previous.img);
 assert.throws(()=>T.fromEditor(previous,'Determinantná','Neurčený'),/samostatného/);
});
test('katalóg a hromadné úpravy majú dva nezávislé ovládače',()=>{
 assert.match(html,/id="varGrowthHabit"/);
 assert.match(html,/id="varType"/);
 assert.match(html,/id="growthChips_\$\{sec.id\}"/);
 assert.doesNotMatch(html,/<select id="growthFilter_/);
 assert.match(html,/function filterByGrowth\(/);
 assert.match(html,/renderGrowthFilterChipsForSection\(secId\)/);
 assert.match(html,/container\.dataset\.selectedGrowth\s*=\s*currentGrowth/);
 assert.match(filters,/typeof currentGrowth/);
 assert.match(html,/dataset\.growth/);
 assert.match(filters,/matchGrowth/);
 assert.match(bulk,/key:'growthHabit'/);
});
test('SEO profil uvádza spôsob rastu aj typ plodu',()=>{
 const fixtures={sections:[{id:'paradajky',name:'Paradajky',hidden:false}],
  varieties:[{name:'Ildi',section:'paradajky',hidden:false,fruitType:'Multiflora',type:'Multiflora',growthHabit:'Indeterminantná',color:'Žltá / Oranžová',weight:'10–20 g',info:'Žlté drobné plody.',img:''}]};
 const profile=publicProfiles(fixtures)[0];
 assert.equal(profile.growthHabit,'Indeterminantná');
 assert.equal(profile.type,'Multiflora');
 const page=renderProfile(profile,mainLogo(html));
 assert.match(page,/Typ plodu \/ využitie/);
 assert.match(page,/Spôsob rastu/);
 assert.match(page,/Indeterminantná/);
});
