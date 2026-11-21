import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const generator = readFileSync('3d/index.html','utf8');
const homepage = readFileSync('index.html','utf8');
const sitemap = readFileSync('sitemap.xml','utf8');
const sitemapGenerator = readFileSync('scripts/generate-seo.mjs','utf8');
const robots = readFileSync('robots.txt','utf8');

function meta(name, source=generator) {
 const quote = name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const match = source.match(new RegExp('<meta\\s+(?:name|property)="'+quote+'"\\s+content="([^"]*)"'));
 return match?.[1] || '';
}
test('3D generator has unique, descriptive metadata and one canonical URL',()=>{
 const title = generator.match(/<title>([^<]+)<\/title>/)?.[1];
 assert.ok(title?.includes('3D štítky na rastliny') && title.includes('STL'));
 assert.ok(title.length >= 40 && title.length <= 60);
 const description = meta('description');
 assert.match(description,/3D štítkov na rastliny/);
 assert.match(description,/STL/);
 assert.ok(description.length >= 105 && description.length <= 180);
 assert.match(generator,/<html lang="sk">/);
 assert.equal((generator.match(/<h1\b/g)||[]).length,1);
 assert.match(generator,/<link rel="canonical" href="https:\/\/herbaetfructus\.sk\/3d\/">/);
 assert.equal((generator.match(/rel="canonical"/g)||[]).length,1);
 assert.equal(meta('robots'),'index,follow');
 assert.doesNotMatch(generator,/<meta[^>]+content="noindex"/i);
 assert.equal(meta('og:url'),'https://herbaetfructus.sk/3d/');
 assert.equal(meta('og:locale'),'sk_SK');
 assert.match(meta('og:description'),/STL/);
 assert.match(meta('twitter:description'),/STL/);
});

test('Google WebApplication data is valid JSON-LD without invented ratings',()=>{
 const scripts = [...generator.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 assert.equal(scripts.length,1);
 const json=JSON.parse(scripts[0][1]);
 const graph=json['@graph'];
 assert.equal(json['@context'],'https://schema.org');
 const web=graph.find(e=>e['@type']==='WebPage');
 const app=graph.find(e=>e['@type']==='WebApplication');
 const crumbs=graph.find(e=>e['@type']==='BreadcrumbList');
 assert.ok(web&&app&&crumbs);
 assert.equal(app.url,'https://herbaetfructus.sk/3d/');
 assert.equal(app.offers.price,'0');
 assert.equal(app.offers.priceCurrency,'EUR');
 assert.equal(app.applicationCategory,'DesignApplication');
 assert.equal(app.operatingSystem,'Web browser');
 assert.equal(app.isAccessibleForFree,true);
 assert.ok(!('aggregateRating' in app) && !('review' in app));
 assert.equal(web.mainEntity['@id'],app['@id']);
 assert.equal(crumbs.itemListElement.at(-1).item,app.url);
});

test('Indexable public guide includes genuine STL instructions outside gated interactive app',()=>{
 const guide=generator.indexOf('class="generator-guide"');
 const app=generator.indexOf('id="generatorApp" hidden');
 const footer=generator.indexOf('<footer>');
 assert.ok(guide>app && guide<footer);
 assert.match(generator.slice(guide),/štítky pre paradajky, bylinky/);
 assert.match(generator.slice(guide),/12, 12 a 6 štítkami/);
 assert.match(generator.slice(guide),/PETG/);
 assert.match(generator.slice(guide),/PLA/);
 assert.match(generator.slice(guide),/href="\/odrody\/"/);
 assert.match(generator.slice(guide),/href="\/clanky\/"/);
 assert.equal((generator.slice(guide).match(/<summary>/g)||[]).length,5);
});

test('sitemap includes permanent unique generator URL and generator script preserves it',()=>{
 const target='https://herbaetfructus.sk/3d/';
 assert.equal((sitemap.match(/https:\/\/herbaetfructus\.sk\/3d\//g)||[]).length,1);
 assert.match(sitemapGenerator, /"https:\/\/herbaetfructus\.sk\/3d\/"/);
 assert.match(robots,/Allow: \/\s*\n/);
 assert.match(robots,/Sitemap: https:\/\/herbaetfructus\.sk\/sitemap\.xml/);
 assert.ok(sitemap.includes('<url><loc>'+target+'</loc></url>'));
});

test('homepage exposes real crawlable link only when generator not paused',()=>{
 assert.match(homepage, /id="heroGeneratorLink"[^>]*href="\/3d\/"[^>]*hidden/);
 assert.match(homepage, /heroGeneratorLink\.hidden = paused \|\| !cloudContentLoaded/);
 assert.match(homepage,/const generatorButton = document\.createElement\('a'\)/);
 assert.match(homepage,/generatorButton\.href = '\/3d\/'/);
 assert.match(homepage,/function isGeneratorPaused\(\)/);
});
