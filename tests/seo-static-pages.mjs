import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const ctx={window:{}};
runInNewContext(readFileSync('editorial-content.js','utf8'),ctx);
const posts=ctx.window.HERBA_EDITORIAL_POSTS;
const html=readFileSync('index.html','utf8');
const sitemap=readFileSync('sitemap.xml','utf8');
test('dvanásť SEO článkov má obsah v HTML bez JavaScriptu',()=>{
 assert.equal(posts.length,12);
 for(const post of posts){
   const slug=post.id.slice(3);
   const path='clanky/'+slug+'/index.html';
   assert.ok(existsSync(path),path);
   const page=readFileSync(path,'utf8');
   assert.match(page,/<main id="obsah"/);
   assert.match(page,/<h1>/);
   const title=page.match(/<title>([^<]+)<\/title>/)?.[1];
   assert.ok(title && title.length<=60,'SEO titulok nie je primerane krátky: '+post.id);
   assert.match(page,/<article class="article-card">/);
   assert.match(page,/class="article-body"/);
   assert.match(page,/application\/ld\+json/);
   assert.match(page,/rel="canonical"/);
   assert.ok(page.includes('https://herbaetfructus.sk/clanky/'+slug+'/'));
   assert.ok(page.includes(post.title.replaceAll('&','&amp;'))||page.includes(post.title.replaceAll('"','&quot;')));
   assert.match(sitemap,new RegExp('https://herbaetfructus\\.sk/clanky/'+slug+'/'));
   assert.ok(page.length>2500);
 }
});
test('archív má na všetkých dvanásť článkov priame HTML odkazy',()=>{
 const archive=readFileSync('clanky/index.html','utf8');
 assert.match(archive,/<h1>Pestovateľské články<\/h1>/);
 for(const post of posts)assert.ok(archive.includes('/clanky/'+post.id.slice(3)+'/'));
});
test('sitemap obsahuje iba skutočné kanonické stránky',()=>{
 const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 assert.equal(urls.length,posts.length+2);
 assert.equal(new Set(urls).size,urls.length);
 assert.ok(urls.includes('https://herbaetfructus.sk/'));
 assert.ok(urls.includes('https://herbaetfructus.sk/clanky/'));
 assert.ok(!urls.some(url=>url.endsWith('/index.html')));
});
test('blog uchoval rozbaľovanie, nové statické odkazy a názov osobný projekt',()=>{
 assert.match(html,/class="blog-details"/);
 assert.match(html,/blog-permalink/);
 assert.match(html,/href="\/clanky\/"/);
 assert.doesNotMatch(html,/rodinná semenná farma/i);
 assert.match(html,/Herba et Fructus je osobný projekt/);
});


test('všetky články aj archív používajú rovnaké originálne SVG logo ako hlavný web',()=>{
 const first=html.indexOf('<a class="logo"'),last=html.indexOf('</a>',first);
 assert.ok(first>=0 && last>first);
 const expected=html.slice(first,last+4).replace('href="./"','href="/"').replace(' onclick="switchSection(\'domov\'); return false;"','');
 for(const path of ['clanky/index.html',...posts.map(post=>'clanky/'+post.id.slice(3)+'/index.html')]){
   const page=readFileSync(path,'utf8'),start=page.indexOf('<a class="logo"'),end=page.indexOf('</a>',start);
   assert.ok(start>=0 && end>start,path);
   assert.equal(page.slice(start,end+4),expected,path);
   assert.doesNotMatch(page,/class="brand-icon"|🍅/);
 }
});
