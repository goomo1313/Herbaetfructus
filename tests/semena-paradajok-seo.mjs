import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync('semena-paradajok/index.html','utf8');
const home=readFileSync('index.html','utf8');
const sitemap=readFileSync('sitemap.xml','utf8');
const manifest=JSON.parse(readFileSync('odrody/manifest.json','utf8'));
const publiclyListed=manifest.filter(item=>item.section==='paradajky');

test('stranka semena paradajok ma vlastne SEO udaje, slovensky obsah a odkazy',()=>{
 assert.match(page,/<html lang="sk">/);
 assert.match(page,/<title>Semená paradajok/);
 assert.match(page,/<h1 id="seed-title">Semená paradajok/);
 assert.match(page,/<link rel="canonical" href="https:\/\/herbaetfructus\.sk\/semena-paradajok\/">/);
 assert.match(page,/<meta name="robots" content="index,follow">/);
 assert.match(page,/Semená sú zberateľské\/okrasné/);
 assert.match(page,/nezáväzný dopyt/i);
 assert.match(page,/href="\/clanky\/vysev-paradajok\/"/);
 assert.match(page,/href="\/odrody\/"/);
 assert.doesNotMatch(page,/\{\{(?:LOGO|COUNT|TOMATO_LINKS|STRUCTURED_DATA)\}\}/);
 assert.ok(page.length>8000);
 assert.equal((page.match(/<h1\b/g)||[]).length,1);
});
test('vsetky a iba verejne paradajky su indexovatelne odkazy na ich profil',()=>{
 const links=[...page.matchAll(/<li><a href="\/odrody\/([a-z0-9-]+)\/">/g)].map(m=>m[1]);
 assert.ok(links.length>0);
 assert.equal(links.length,publiclyListed.length);
 assert.deepEqual(new Set(links),new Set(publiclyListed.map(row=>row.slug)));
 const graph=JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]??'null')['@graph'];
 const collection=graph.find(item=>item['@type']==='CollectionPage');
 const list=graph.find(item=>item['@type']==='ItemList');
 const crumbs=graph.find(item=>item['@type']==='BreadcrumbList');
 assert.equal(collection.url,'https://herbaetfructus.sk/semena-paradajok/');
 assert.equal(list.numberOfItems,publiclyListed.length);
 assert.equal(list.itemListElement.length,publiclyListed.length);
 assert.ok(crumbs.itemListElement.at(-1).item===collection.url);
});
test('stranka je vyhladatelna z domovskej a z mapy webu',()=>{
 assert.match(home,/<a class="hero-seeds-link" href="\/semena-paradajok\/">/);
 assert.match(home,/<footer>[\s\S]*href="\/semena-paradajok\/"/);
 assert.match(home,/<meta name="description" content="[^"]*semená paradajok/);
 assert.match(sitemap,/<loc>https:\/\/herbaetfructus\.sk\/semena-paradajok\/<\/loc>/);
 assert.equal((sitemap.match(/https:\/\/herbaetfructus\.sk\/semena-paradajok\//g)||[]).length,1);
});
