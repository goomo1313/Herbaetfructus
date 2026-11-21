// Verejný export aktuálnych odrôd: nikdy nepublikovať cenu, zásoby ani skryté odrody.
export const SITE='https://herbaetfructus.sk';
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const txt=(v,n=4000)=>typeof v==='string'?v.trim().slice(0,n):'';
export function slugify(name){
 return String(name??'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
  .replace(/ł/g,'l').replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);
}
function image(v){
 if(typeof v!=='string')return '';
 try{const u=new URL(v.trim());return u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash?u.href:'';}catch{return '';}
}
function hash(s){let h=2166136261;for(const c of s)h=Math.imul(h^c.codePointAt(0),16777619)>>>0;return h.toString(36);}
const fields=[['growth','Rastový typ'],['ripening','Skorosť / dozrievanie'],['flavor','Chuť'],['usage','Využitie plodov'],['growing','Pestovanie / stanovište'],['origin','Pôvod / zdroj osiva']];
export function publicProfiles(records){
 if(!records||!Array.isArray(records.sections)||!Array.isArray(records.varieties))
  throw Error('Chýbajú aktuálne záznamy sections/varieties z cloudu.');
 const sections=new Map(records.sections.filter(s=>s&&s.hidden===false&&s.id&&!['domov','blog','podmienky'].includes(s.id))
  .map(s=>[s.id,txt(s.name,120)]));
 if(!sections.size)throw Error('Žiadne verejné sekcie; z bezpečnostných dôvodov nezverejňujem.');
 const rows=records.varieties.filter(v=>v&&v.hidden===false&&sections.has(v.section)&&txt(v.name,150));
 if(!rows.length)throw Error('Žiadna verejná odroda; z bezpečnostných dôvodov nezverejňujem.');
 const counts=new Map();
 for(const row of rows){const slug=slugify(row.name);if(!slug)throw Error('Neplatný verejný názov odrody.');counts.set(slug,(counts.get(slug)||0)+1);}
 const names=new Set(),slugs=new Set();
 return rows.map(v=>{
  const name=txt(v.name,150),base=slugify(name);
  if(names.has(name.toLocaleLowerCase('sk')))throw Error('Duplicitný názov odrody.');
  names.add(name.toLocaleLowerCase('sk'));
  const slug=counts.get(base)>1?base+'-'+hash(name):base;
  if(slugs.has(slug))throw Error('Kolízia URL odrody.');
  slugs.add(slug);
  const properties=v.properties&&!Array.isArray(v.properties)&&typeof v.properties==='object'?v.properties:{};
  return {name,slug,section:v.section,sectionTitle:sections.get(v.section),type:txt(v.type,120),
   color:txt(v.color,100),weight:txt(v.weight,100),info:txt(v.info),
   photos:[...new Set([v.img,...(Array.isArray(v.gallery)?v.gallery:[])].map(image).filter(Boolean))].slice(0,8),
   imageFit:v.imageFit==='cover'?'cover':'contain',
   facts:fields.map(([key,label])=>({label,value:txt(properties[key],180)})).filter(x=>x.value)};
 }).sort((a,b)=>a.name.localeCompare(b.name,'sk',{sensitivity:'base'}));
}
export function mainLogo(index){
 const start=index.indexOf('<a class="logo"'),end=index.indexOf('</a>',start);
 if(start<0||end<0)throw Error('Pôvodné SVG logo chýba.');
 const markup=index.slice(start,end+4).replace('href="./"','href="/"').replace(' onclick="switchSection(\'domov\'); return false;"','');
 if(!markup.includes('<svg')||markup.includes('onclick='))throw Error('Neplatné logo.');
 return markup;
}
const commonHead=(path)=>'<link rel="preconnect" href="https://fonts.googleapis.com">'+
 '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'+
 '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">'+
 '<link rel="stylesheet" href="'+path+'article-pages.css"><link rel="stylesheet" href="'+path+'variety-seo.css">';
const header=logo=>'<a class="skip-link" href="#obsah">Preskočiť na obsah</a><header class="page-header"><div class="header-inner">'+logo+
 '<nav aria-label="Hlavná navigácia"><a href="/odrody/">Odrody</a><a href="/clanky/">Články</a><a href="/">Katalóg</a></nav></div></header>';
const footer='<footer class="page-footer">© Herba et Fructus · Rodinná semenná farma · <a href="/">Domov</a></footer>';
const head=title=>'<!doctype html><html lang="sk"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title>';
const xmljson=v=>JSON.stringify(v).replace(/</g,'\\u003c');
const varietyKind=p=>p.section==='paradajky'?'paradajka':p.section==='tekvice'?'tekvica':'odroda';
// Meta popis skladáme iba z celých viet a verejných overiteľných údajov.
// Skracovanie cez slice() môže zanechať na konci rozpracovanú vetu.
export const describe=p=>{
 const parts=[];
 const add=value=>{
  let sentence=String(value??'').trim();
  if(!sentence)return false;
  if(!/[.!?…]$/u.test(sentence))sentence+='.';
  if([...parts,sentence].join(' ').length>155)return false;
  parts.push(sentence);
  return true;
 };
 if(!add(p.name+' – '+varietyKind(p)))add('Profil odrody Herba et Fructus');
 const info=String(p.info??'').replace(/\s+/g,' ').trim();
 for(const sentence of info.split(/(?<=[.!?])\s+(?=[\p{Lu}0-9])/u))add(sentence);
 for(const [label,value] of [['Hmotnosť',p.weight],['Typ',p.type],['Farba',p.color]]){
  if(value)add(label+': '+value);
 }
 if(parts.join(' ').length<75)add('Opis a fotografie v zbierke Herba et Fructus');
 return parts.join(' ');
};
const seoTitle=p=>{
 const brand=' | Herba et Fructus';
 const long=p.name+' – '+varietyKind(p)+brand;
 if(long.length<=60)return long;
 const shorter=p.name+brand;
 return shorter.length<=60?shorter:p.name.slice(0,60-brand.length-1).trimEnd()+'…'+brand;
};
const startTag='<!-- AUTO-GENERATED: scripts/generate-varieties.mjs; do not edit. -->\n';
export function renderProfile(p,logo,all=[]){
 const canonical=SITE+'/odrody/'+p.slug+'/',description=describe(p);
 const facts=[['Typ / pomológia',p.type],['Farba plodu',p.color],['Hmotnosť plodu',p.weight],...p.facts.map(x=>[x.label,x.value])].filter(x=>x[1]);
 const schema={'@context':'https://schema.org','@type':'WebPage',url:canonical,name:p.name+' – profil odrody',description,inLanguage:'sk-SK'};
 if(p.photos[0])schema.primaryImageOfPage=p.photos[0];
 const group=all.filter(item=>item.section===p.section);
 const current=group.findIndex(item=>item.slug===p.slug);
 const related=current<0?[]:[...group.slice(current+1),...group.slice(0,current)].filter(item=>item.slug!==p.slug).slice(0,4);
 const tips=p.section==='paradajky'?
  [['Výsev paradajok','/clanky/vysev-paradajok/'],['Ako odobrať a usušiť semená paradajok','/clanky/ako-odobrat-semena/']]:
  p.section==='tekvice'?
  [['Zber a skladovanie cukiet a tekvíc','/clanky/od-letnej-cukety-po-zimnu-tekvicu/'],['Kríženie cukiet a tekvíc','/clanky/tekvice-krizenie/']]:[];
 const extras=(related.length||tips.length)?
  '<aside class="profile-explore" aria-label="Ďalšie odrody a pestovateľské rady"><h2>Objavte viac</h2>'+
  (related.length?'<h3>Ďalšie odrody z tejto skupiny</h3><ul>'+related.map(item=>
   '<li><a href="/odrody/'+esc(item.slug)+'/">'+esc(item.name)+'</a></li>').join('')+'</ul>':'')+
  (tips.length?'<h3>Pestovateľské rady</h3><ul>'+tips.map(([label,url])=>
   '<li><a href="'+url+'">'+esc(label)+'</a></li>').join('')+'</ul>':'')+
  '</aside>':'';

 return startTag+head(seoTitle(p))+
 '<meta name="description" content="'+esc(description)+'"><link rel="canonical" href="'+esc(canonical)+'">'+
 '<meta property="og:title" content="'+esc(p.name+' | Herba et Fructus')+'">'+
 '<meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+esc(canonical)+'">'+
 (p.photos[0]?'<meta property="og:image" content="'+esc(p.photos[0])+'">':'')+
 commonHead('../../')+'<script src="../../config.js" defer></script><script src="../../variety-marker-link.js" defer></script><script type="application/ld+json">'+xmljson(schema)+'</script></head><body>'+header(logo)+
 '<main id="obsah" class="article-container"><nav class="breadcrumbs"><a href="/">Domov</a> › <a href="/odrody/">Odrody</a> › '+esc(p.name)+'</nav>'+
 '<article class="article-card variety-seo-profile"><p class="article-kicker">'+esc(p.sectionTitle)+'</p><h1>'+esc(p.name)+'</h1>'+
 (p.photos[0]?'<figure class="profile-hero"><img src="'+esc(p.photos[0])+'" alt="'+esc(p.name)+'" style="object-fit:'+p.imageFit+'" decoding="async"></figure>':
 '<div class="profile-hero profile-placeholder">Fotografiu odrody ešte pripravujeme.</div>')+
 '<h2>Charakteristika odrody</h2><p>'+esc(p.info||'Podrobnejší opis doplníme podľa vlastných pestovateľských skúseností.')+'</p>'+
 (facts.length?'<h2>Vlastnosti odrody</h2><dl class="profile-facts">'+facts.map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd></div>').join('')+'</dl>':'')+
 (p.photos.length>1?'<h2>Fotogaléria</h2><div class="profile-gallery">'+p.photos.slice(1).map((src,i)=>
 '<a href="'+esc(src)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(src)+'" alt="'+esc(p.name)+' – fotografia '+(i+2)+'" loading="lazy"></a>').join('')+'</div>':'')+
 '<p class="profile-actions"><a class="profile-primary" href="/#odroda='+encodeURIComponent(p.name)+'">Zobraziť v katalógu a poslať nezáväzný dopyt</a> '+
 '<a class="profile-marker" data-marker-link href="/3d/?odroda='+encodeURIComponent(p.name)+'" hidden>🖨️ Vytvoriť 3D štítok</a></p>'+
 extras+'</article><p class="back-to-blog"><a href="/odrody/">← Všetky odrody</a></p></main>'+footer+'</body></html>\n';
}
export function renderArchive(profiles,logo){
 const sections=new Map(profiles.map(p=>[p.section,p.sectionTitle]));
 const options=[...sections].sort((a,b)=>a[1].localeCompare(b[1],'sk')).map(([id,name])=>
  '<option value="'+esc(id)+'">'+esc(name)+'</option>').join('');
 const cards=profiles.map(p=>'<li class="profile-card" data-section="'+esc(p.section)+'"><a href="/odrody/'+esc(p.slug)+'/" class="profile-card-link">'+
 (p.photos[0]?'<img src="'+esc(p.photos[0])+'" alt="'+esc(p.name)+'" loading="lazy">':'<span class="profile-thumb-fallback">🌱</span>')+
 '<span class="profile-card-content"><small>'+esc(p.sectionTitle)+'</small><strong>'+esc(p.name)+'</strong></span></a></li>').join('');
 const desc='Zbierka verejných odrôd paradajok a iných rastlín Herba et Fructus – charakteristiky, vlastnosti a fotografie.';
 const schema={'@context':'https://schema.org','@type':'CollectionPage',name:'Profily odrôd | Herba et Fructus',url:SITE+'/odrody/',
  mainEntity:{'@type':'ItemList',numberOfItems:profiles.length,itemListElement:profiles.map((p,i)=>({
   '@type':'ListItem',position:i+1,name:p.name,url:SITE+'/odrody/'+p.slug+'/'}))}};
 return startTag+head('Odrody paradajok a rastlín | Herba et Fructus')+
 '<meta name="description" content="'+esc(desc)+'"><link rel="canonical" href="'+SITE+'/odrody/">'+commonHead('../')+
 '<script type="application/ld+json">'+xmljson(schema)+'</script>'+
 '<script src="../variety-archive.js" defer></script>'+
 '</head><body>'+header(logo)+'<main id="obsah" class="article-container"><nav class="breadcrumbs"><a href="/">Domov</a> › Odrody</nav>'+
 '<div class="archive-heading"><p class="article-kicker">Rodinná semenná farma</p><h1>Profily odrôd</h1>'+
 '<p>Vlastnosti a fotografie aktuálne verejných odrôd. Dostupnosť overíte v <a href="/">katalógu</a>.</p></div>'+
 '<form class="profile-filters" id="profile-filters" role="search">'+
 '<div class="profile-filter-field"><label for="profile-search">Vyhľadať odrodu</label><input type="search" id="profile-search" placeholder="Napr. Ildi alebo Tigerella" autocomplete="off"></div>'+
 '<div class="profile-filter-field"><label for="profile-section">Skupina rastlín</label><select id="profile-section"><option value="">Všetky skupiny</option>'+options+'</select></div>'+
 '<button class="profile-reset" type="button" id="profile-reset">Vymazať filtre</button></form>'+
 '<p class="profile-result-count" id="profile-count" aria-live="polite">'+(profiles.length===1?'1 odroda':profiles.length>=2&&profiles.length<=4?profiles.length+' odrody':profiles.length+' odrôd')+'</p>'+
 '<p class="profile-empty" id="profile-empty" hidden>Nenašli sa žiadne odrody. Skúste upraviť názov alebo vybrať inú skupinu.</p>'+
 '<ul class="profile-grid" id="profile-list">'+cards+'</ul>'+
 '<noscript><p>Vyhľadávanie vyžaduje JavaScript. Všetky profily odrôd sú uvedené vyššie.</p></noscript>'+
 '</main>'+footer+'</body></html>\n';
}
