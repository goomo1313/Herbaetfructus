// Generuje verejné, statické SEO stránky zo schválených redakčných článkov.
// Spustenie: node scripts/generate-seo.mjs --write
// Kontrola bez zmien: node scripts/generate-seo.mjs --check
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { sharedHeader, sharedHeaderAssets } from './shared-site-header.mjs';

function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

function slug(p){if(!/^hf-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.id))throw Error("Unsafe article ID "+p.id);return p.id.slice(3);}

function articleUrl(p){return "https://herbaetfructus.sk/clanky/"+slug(p)+"/";}

function structuredData(value){return JSON.stringify(value).replace(/</g,"\\u003c").replace(/>/g,"\\u003e").replace(/&/g,"\\u0026");}

function articleMarkup(p){
 if(/<\s*(script|iframe|object|embed)\b|on[a-z]+\s*=|javascript:/i.test(p.content))throw Error("Unsafe editorial HTML in "+p.id);
 return String(p.content).replace(/<h4>/g,"<h2>").replace(/<\/h4>/g,"</h2>").replace(/<h3>/g,"<h2>").replace(/<\/h3>/g,"</h2>");
}

function publishDate(p){const months={"január":"01","február":"02","marec":"03","apríl":"04","máj":"05","jún":"06","júl":"07","august":"08","september":"09","október":"10","november":"11","december":"12"};const m=String(p.date||"").match(/^(\d{1,2})\.\s+(\S+)\s+(\d{4})$/);return m&&months[m[2]]?m[3]+"-"+months[m[2]]+"-"+m[1].padStart(2,"0"):"";}

function seoTitle(post) {
  const titles={
  "hf-ako-odobrat-semena": "Semená paradajok: zber a sušenie | Herba et Fructus",
  "hf-vysev-paradajok": "Výsev paradajok: silné priesady | Herba et Fructus",
  "hf-typy-paradajok": "Typy paradajok: cherry a biftek | Herba et Fructus",
  "hf-praskanie-spicky-plesen": "Čierne špičky a pleseň paradajok | Herba et Fructus",
  "hf-tekvice-krizenie": "Kríženie cukiet a tekvíc | Herba et Fructus",
  "hf-cucoriedky-nadoby": "Čučoriedky v nádobe: pH a zálievka | Herba et Fructus",
  "hf-zahon-jarny-plan": "Príprava pôdy pred výsadbou | Herba et Fructus",
  "hf-zahradny-dennik": "Záhradný denník a odrody | Herba et Fructus",
  "hf-deti-v-zahrade": "Pestovanie s deťmi | Herba et Fructus",
  "hf-hybridy-a-semena": "F1 hybrid a vlastné semená | Herba et Fructus",
  "hf-odroda-ma-svoj-charakter": "Výber odrôd paradajok | Herba et Fructus",
  "hf-od-letnej-cukety-po-zimnu-tekvicu": "Cukety a tekvice: zber a skladovanie | Herba et Fructus"
};
  if(!Object.prototype.hasOwnProperty.call(titles,post.id))throw new Error('Chýba SEO titulok článku: '+post.id);
  return titles[post.id];
}

function mainSiteLogo() {
  const source = readFileSync('index.html', 'utf8');
  const first = source.indexOf('<a class="logo"');
  const last = source.indexOf('</a>', first);
  if (first === -1 || last === -1) throw new Error('Logo chýba v index.html');
  const markup = source.slice(first, last + 4)
    .replace('href="./"', 'href="/"')
    .replace(' onclick="switchSection(\'domov\'); return false;"', '');
  if (!markup.includes('<svg') || markup.includes('onclick=')) throw new Error('Logo nie je pripravené na publikovanie');
  return markup;
}

function renderArticle(p,all){
 const url=articleUrl(p),title=esc(p.title),description=esc(String(p.excerpt||"").slice(0,156)),image=/^https:\/\/[a-z0-9.-]+\/[^\s"<>]+$/i.test(p.img||"")?String(p.img):"",pub=publishDate(p);
 const schema={"@context":"https://schema.org","@type":"BlogPosting",headline:p.title,description:p.excerpt,inLanguage:"sk-SK",mainEntityOfPage:url};
 if(pub)schema.datePublished=pub;
 if(image)schema.image=[image];
 const n=all.findIndex(a=>a.id===p.id),prev=n>0?all[n-1]:null,next=n<all.length-1?all[n+1]:null;
 return `<!-- AUTO-GENERATED: scripts/generate-seo.mjs; do not edit manually. -->
<!doctype html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(seoTitle(p))}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Herba et Fructus">
<meta property="og:locale" content="sk_SK">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${esc(url)}">
${image?`<meta property="og:image" content="${esc(image)}">`:""}
<meta name="twitter:card" content="${image?"summary_large_image":"summary"}">
<meta name="theme-color" content="#2c5530">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../../article-pages.css">
${sharedHeaderAssets("../../")}
<script type="application/ld+json">${structuredData(schema)}</script>
</head>
<body class="hf-unified-page">
<a class="skip-link" href="#obsah">Preskočiť na článok</a>
${sharedHeader(mainSiteLogo(), "blog")}
<main id="obsah" class="article-container">
<nav class="breadcrumbs" aria-label="Omrvinková navigácia"><a href="/">Domov</a> <span aria-hidden="true">›</span> <a href="/clanky/">Články</a> <span aria-hidden="true">›</span> ${title}</nav>
<article class="article-card">
  <div class="article-kicker">${esc(p.category||"Zo záhrady")}${p.readTime?" · "+esc(p.readTime)+" čítania":""}</div>
  <h1>${title}</h1>
  ${pub?`<p class="date"><time datetime="${pub}">${esc(p.date)}</time></p>`:`<p class="date">${esc(p.date||"")}</p>`}
  <p class="dek">${esc(p.excerpt)}</p>
  ${image?`<figure class="article-hero"><img src="${esc(image)}" alt="${title}" loading="eager" decoding="async"></figure>`:""}
  <div class="article-body">${articleMarkup(p)}</div>
</article>
<nav class="article-pager" aria-label="Ďalšie články">
${prev?`<a href="/clanky/${slug(prev)}/"><span>← Predchádzajúci článok</span><strong>${esc(prev.title)}</strong></a>`:""}
${next?`<a href="/clanky/${slug(next)}/"><span>Nasledujúci článok →</span><strong>${esc(next.title)}</strong></a>`:""}
</nav>
<p class="back-to-blog"><a href="/clanky/">← Všetky pestovateľské články</a></p>
</main>
<footer class="page-footer">© Herba et Fructus · Osobný projekt · <a href="/">Späť na hlavnú stránku</a></footer>
</body></html>
`;
}

function renderArchive(posts){
 const cards=posts.map(p=>`<li class="archive-card"><div class="article-kicker">${esc(p.category)}</div><h2><a href="/clanky/${slug(p)}/">${esc(p.title)}</a></h2><p>${esc(p.excerpt)}</p><a class="read-more" href="/clanky/${slug(p)}/">Prečítať článok →</a></li>`).join("\n");
 return `<!-- AUTO-GENERATED: scripts/generate-seo.mjs; do not edit manually. -->
<!doctype html>
<html lang="sk">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pestovateľské články a rady zo záhrady | Herba et Fructus</title>
<meta name="description" content="Praktické články o paradajkách, semenárstve, tekviciach, čučoriedkach a pestovaní. Skúsenosti a overené postupy z osobného pestovateľského projektu Herba et Fructus.">
<link rel="canonical" href="https://herbaetfructus.sk/clanky/">
<meta property="og:type" content="website">
<meta property="og:title" content="Pestovateľské články | Herba et Fructus">
<meta property="og:description" content="Pestovateľské rady o odrodách paradajok, tekviciach, semenárstve a záhrade.">
<meta property="og:url" content="https://herbaetfructus.sk/clanky/">
<meta name="theme-color" content="#2c5530">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../article-pages.css">
${sharedHeaderAssets("../")}
</head>
<body class="hf-unified-page">
<a class="skip-link" href="#obsah">Preskočiť na články</a>
${sharedHeader(mainSiteLogo(), "blog")}
<main id="obsah" class="article-container">
<nav class="breadcrumbs" aria-label="Omrvinková navigácia"><a href="/">Domov</a> <span aria-hidden="true">›</span> Články</nav>
<section class="archive-heading"><div class="article-kicker">Rady zo záhrady</div><h1>Pestovateľské články</h1><p>Výber praktických návodov, skúseností a zaujímavostí o paradajkách, tekviciach, uchovávaní semien a starostlivosti o záhradu.</p></section>
<aside class="archive-calendar-feature" aria-label="Pestovateľský kalendár">
  <span aria-hidden="true">📅</span>
  <div><strong>Pestovateľský kalendár</strong><p>Ročný plán od januára do decembra: výsev paradajok, výsadba, zber a uchovávanie semien.</p></div>
  <a href="/#sekcia=kalendar" aria-label="Otvoriť pestovateľský kalendár v sekcii Blog a rady">Otvoriť v Blog &amp; Rady</a>
</aside>
<ul class="archive-grid">${cards}</ul>
</main>
<footer class="page-footer">© Herba et Fructus · Osobný projekt · <a href="/">Späť na hlavnú stránku</a></footer>
</body></html>
`;
}

function renderSitemap(posts){
 const manifest=existsSync('odrody/manifest.json')?JSON.parse(readFileSync('odrody/manifest.json','utf8')):[];
 if(!Array.isArray(manifest)||manifest.some(row=>!row||!(/^[a-z0-9-]+$/).test(row.slug)))throw Error('Neplatný verejný manifest odrôd.');
 const varietyUrls=manifest.map(row=>'https://herbaetfructus.sk/odrody/'+row.slug+'/');
 const urls=["https://herbaetfructus.sk/","https://herbaetfructus.sk/3d/","https://herbaetfructus.sk/clanky/",...posts.map(articleUrl),...varietyUrls];
 return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(u=>"  <url><loc>"+esc(u)+"</loc></url>").join("\n")+"\n</urlset>\n";
}

const context={window:{}};
runInNewContext(readFileSync('editorial-content.js','utf8'),context,{timeout:1000});
const posts=context.window.HERBA_EDITORIAL_POSTS;
if(!Array.isArray(posts)||!posts.length)throw new Error('Chýbajú redakčné články');
if(new Set(posts.map(p=>p.id)).size!==posts.length)throw new Error('Duplicitné ID článkov');
const outputs=new Map();
outputs.set('clanky/index.html',renderArchive(posts));
for(const post of posts)outputs.set('clanky/'+slug(post)+'/index.html',renderArticle(post,posts));
outputs.set('sitemap.xml',renderSitemap(posts));
const mode=process.argv.includes('--write')?'write':process.argv.includes('--check')?'check':null;
if(!mode)throw new Error('Použi --write alebo --check');
const stale=[];
if(existsSync('clanky'))for(const entry of readdirSync('clanky',{withFileTypes:true})){
  if(!entry.isDirectory())continue;
  const target=join('clanky',entry.name,'index.html');
  if(existsSync(target)&&!outputs.has(target)&&readFileSync(target,'utf8').startsWith('<!-- AUTO-GENERATED: scripts/generate-seo.mjs'))stale.push(target);
}
let differences=0;
for(const [path,content] of outputs){
  if(!existsSync(path)||readFileSync(path,'utf8')!==content){
    differences++;
    if(mode==='write'){
      mkdirSync(dirname(path),{recursive:true});writeFileSync(path,content,'utf8');
      process.stdout.write('Vygenerované: '+path+'\\n');
    }else process.stderr.write('Neaktuálny alebo chýbajúci súbor: '+path+'\\n');
  }
}
for(const path of stale){differences++;if(mode==='write'){rmSync(dirname(path),{recursive:true,force:true});process.stdout.write('Odstránená stará SEO stránka: '+path+'\\n');}else process.stderr.write('Zastaralá stránka: '+path+'\\n');}
if(mode==='check'&&differences)process.exitCode=1;
else process.stdout.write('SEO: '+posts.length+' článkov, '+(outputs.get('sitemap.xml').match(/<loc>/g)||[]).length+' URL v sitemap. '+(differences?'Zmeny: '+differences:'Všetko aktuálne')+'\\n');
