import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createContext,runInContext} from 'node:vm';
import {sharedHeader,sharedHeaderAssets} from '../scripts/shared-site-header.mjs';

const root=readFileSync('index.html','utf8');
const generator=readFileSync('3d/index.html','utf8');
const articleArchive=readFileSync('clanky/index.html','utf8');
const article=readFileSync('clanky/vysev-paradajok/index.html','utf8');
const varietyArchive=readFileSync('odrody/index.html','utf8');
const sharedJs=readFileSync('shared-site-header.js','utf8');
const sharedCss=readFileSync('shared-site-header.css','utf8');
const seoSource=readFileSync('scripts/generate-seo.mjs','utf8');
const profileSource=readFileSync('scripts/variety-seo-lib.mjs','utf8');
const logo=()=>{
 const i=root.indexOf('<a class="logo"'),j=root.indexOf('</a>',i);
 assert.ok(i>=0&&j>=0);
 return root.slice(i,j+4).replace('href="./"','href="/"')
  .replace(' onclick="switchSection(\'domov\'); return false;"','');
};

test('3D a články zobrazia identické SVG logo, farby a navigačné karty hlavného webu',()=>{
 for(const [name,page] of [['3D',generator],['Články',articleArchive],['Článok',article],['Archív odrôd',varietyArchive]]){
  assert.ok(page.includes(logo()),name+' musí používať hlavné logo');
  assert.match(page,/class="hf-site-header"/,name);
  assert.match(page,/class="hf-site-nav"/,name);
  assert.match(page,/class="nav-links" data-hf-site-nav/,name);
  assert.match(page,/shared-site-header.css/,name);
  assert.match(page,/shared-site-header.js/,name);
  assert.match(page,/href="\/#sekcia=paradajky"/,name);
  assert.match(page,/href="\/#sekcia=blog"/,name);
  assert.match(page,/href="\/3d\/"/,name);
 }
 assert.match(sharedCss,/max-width:1200px/);
 assert.match(sharedCss,/border-radius:30px/);
 assert.match(sharedCss,/overflow-x:auto/);
 assert.match(generator,/id="markerForm"/);
 assert.match(generator,/id="downloadStl"/);
 assert.match(articleArchive,/href="\/clanky\/vysev-paradajok\/"/);
});
test('SEO generátory používajú spoločnú šablónu, aby budúca synchronizácia nevrátila starý dizajn',()=>{
 assert.match(seoSource,/sharedHeader\(mainSiteLogo\(\), "blog"\)/);
 assert.match(profileSource,/sharedHeader\(logo\)/);
 assert.match(seoSource,/sharedHeaderAssets\("\.\.\/\.\.\/"\)/);
 assert.match(profileSource,/sharedHeaderAssets\(path\)/);
 assert.match(root,/function activateSharedSiteSection\(\)/);
 assert.match(root,/activateSharedSiteSection\(\);/);
 assert.match(root,/window\.addEventListener\('hashchange', activateSharedSiteSection\)/);
 const markup=sharedHeader(logo(),'blog');
 assert.match(markup,/aria-current="page"/);
 assert.match(markup,/data-hf-site-nav/);
 assert.match(sharedHeaderAssets('../'),/shared-site-header.js/);
});
test('navigácia prečíta len verejné sekcie, nikdy neukáže skrytý obsah ani pozastavený generátor',async()=>{
 const created=[];
 const element=tag=>({
  tag,children:[],textContent:'',attributes:{},classList:{add(name){this[name]=true}},
  setAttribute(k,v){this.attributes[k]=v;},
  appendChild(child){this.children.push(child);return child;},
  replaceChildren(...children){this.children=children;},
 });
 const nav=element('ul');
 let fetched='';
 const ctx=createContext({
  document:{
   querySelector(selector){return selector==='[data-hf-site-nav]'?nav:null;},
   createElement(tag){const el=element(tag);created.push(el);return el;},
   createDocumentFragment(){return element('fragment');}
  },
  window:{HERBA_CONFIG:{supabaseUrl:'https://example.supabase.co',supabaseAnonKey:'public-test'}},
  location:{pathname:'/clanky/'},URL,AbortController,setTimeout,clearTimeout,
  fetch:async url=>{fetched=String(url);return {ok:true,json:async()=>[
   {id:'sections',content:[
    {id:'domov',name:'Náš príbeh',hidden:false},
    {id:'paradajky',name:'Paradajky',hidden:false},
    {id:'pripravujeme',name:'SÚKROMNÉ',hidden:false},
    {id:'tekvice',name:'Tekvice',hidden:true},
    {id:'blog',name:'Blog & Rady',hidden:false}
   ]},
   {id:'settings',content:{generatorPaused:true}}
  ]};}
 });
 runInContext(sharedJs,ctx);
 await new Promise(resolve=>setImmediate(resolve));
 const links=nav.children[0].children.map(li=>li.children[0]);
 assert.deepEqual(links.map(link=>link.textContent),['Náš príbeh','Paradajky','Blog & Rady','Pestovateľský kalendár']);
 assert.ok(!links.some(link=>link.textContent==='SÚKROMNÉ'||link.textContent==='3D generátor'));
 assert.equal(links.find(link=>link.textContent==='Blog & Rady').attributes['aria-current'],'page');
 assert.equal(links.find(link=>link.textContent==='Paradajky').href,'/#sekcia=paradajky');
 assert.match(fetched,/site_content/);
 assert.doesNotMatch(fetched,/site_drafts/);
});
test('spoločný skript a SEO generátory sú syntakticky platné',()=>{
 for(const file of ['shared-site-header.js','scripts/shared-site-header.mjs','scripts/generate-seo.mjs','scripts/variety-seo-lib.mjs']){
  const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  assert.equal(result.status,0,file+' '+result.stderr);
 }
});


test('všetky HTML podstránky používajú rovnakú hlavičku a funkčné relatívne súbory',()=>{
 const pages=[];
 function walk(dir){
  for(const entry of readdirSync(dir,{withFileTypes:true})){
   const path=join(dir,entry.name);
   if(entry.isDirectory())walk(path);
   else if(entry.isFile()&&entry.name.endsWith('.html'))pages.push(path);
  }
 }
 for(const dir of ['3d','clanky','odrody'])walk(dir);
 pages.push('dakujeme.html');
 assert.ok(pages.length>=60,'Kontrola má pokrývať všetky články a profily odrôd');
 const expectedLogo=logo();
 for(const file of pages){
  const page=readFileSync(file,'utf8');
  assert.match(page,/<body class="hf-unified-page(?: [^"]+)?">/,file);
  assert.match(page,/<header class="hf-site-header">/,file);
  assert.match(page,/<nav class="hf-site-nav" aria-label="Hlavná navigácia">/,file);
  assert.match(page,/<ul class="nav-links" data-hf-site-nav>/,file);
  assert.ok(page.includes(expectedLogo),'Logo je iné ako na hlavnej stránke: '+file);
  for(const text of ['Náš príbeh','Paradajky','Pestovateľský kalendár','3D generátor']){
   assert.ok(page.includes(text),'Chýba položka navigácie '+text+': '+file);
  }
  assert.match(page,/href="\/#sekcia=paradajky"/,file);
  assert.match(page,/href="\/#sekcia=blog"/,file);
  assert.match(page,/href="\/3d\/"/,file);
  const css=page.match(/href="([^"]*shared-site-header\.css(?:\?[^"]*)?)"/)?.[1];
  const js=page.match(/src="([^"]*shared-site-header\.js(?:\?[^"]*)?)"/)?.[1];
  assert.ok(css&&js,'Chýba zdieľaný štýl alebo navigácia: '+file);
  for(const asset of [css,js]){
   const localPath=resolve(dirname(file),asset.split('?')[0]);
   assert.ok(existsSync(localPath),'Chýbajúci súbor '+asset+' na '+file);
  }
  assert.doesNotMatch(page,/<header class="page-header">|<header class="site-header">/,file);
 }
 const confirmation=readFileSync('dakujeme.html','utf8');
 assert.match(confirmation,/<meta name="robots" content="noindex,follow">/);
 assert.match(confirmation,/id="obsah" class="confirmation-card"/);
 assert.match(confirmation,/herba_inquiry_pending_v1/);
 assert.match(confirmation,/href="\.\/index\.html"/);
});
