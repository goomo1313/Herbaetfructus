import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {publicProfiles,renderProfile,mainLogo} from '../scripts/variety-seo-lib.mjs';

const html=readFileSync('index.html','utf8');
const generator=readFileSync('scripts/variety-seo-lib.mjs','utf8');
const detail=readFileSync('catalogue-ui.js','utf8');

test('verejné profily zobrazujú iba pôvodný opis odrody, bez pridaných dlhých opisov',()=>{
 const base={name:'Ildi',section:'paradajky',hidden:false,type:'Multiflora',color:'Žltá',
  info:'PÔVODNÝ opis zo Supabase zostáva bez zmeny.',weight:'15 g',
  img:'https://example.org/ildi.jpg',stock:2,seedsPerPack:'10 ks',price:'1.50'};
 const p=publicProfiles({
  sections:[{id:'paradajky',name:'Paradajky',hidden:false}],
  varieties:[base]
 })[0];
 const page=renderProfile(p,mainLogo(html),[p]);
 assert.ok(page.includes('PÔVODNÝ opis zo Supabase zostáva bez zmeny.'));
 assert.match(page,/Vlastnosti odrody/);
 assert.match(page,/Ildi/);
 assert.doesNotMatch(page,/Podrobnejší opis a overené zdroje|Zdroje na overenie|profile-researched|research-sources/);
 assert.equal(p.info,base.info);
});

test('žiadne rozšírené cudzie texty sa nevrátia cez generátor ani dynamický detail',()=>{
 assert.doesNotMatch(generator,/variety-research\.json|verifiedVarietyResearch|researchMarkup/);
 assert.doesNotMatch(detail,/variety-research\.json|showResearched|detailResearched/);
 assert.doesNotMatch(html,/id="detailResearched"/);
 assert.ok(!existsSync('variety-research.json'),'Research dataset must not be served publicly');
});

test('bezpečne skryté a pripravované odrody zostávajú mimo verejného SEO',()=>{
 const list=publicProfiles({
  sections:[{id:'paradajky',name:'Paradajky',hidden:false},{id:'pripravujeme',name:'Pripravujeme',hidden:false}],
  varieties:[
   {name:'Ildi',section:'pripravujeme',hidden:true,info:'súkromný koncept'},
   {name:'Banana Legs',section:'paradajky',hidden:false,info:'Náš pôvodný opis.'}
  ]
 });
 assert.deepEqual(list.map(p=>p.name),['Banana Legs']);
 const result=renderProfile(list[0],mainLogo(html),list);
 assert.match(result,/Náš pôvodný opis/);
 assert.doesNotMatch(result,/súkromný koncept/);
});
