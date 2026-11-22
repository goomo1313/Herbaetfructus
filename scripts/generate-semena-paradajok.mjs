// Z verejneho manifestu vytvara staticku stranku s odkazmi na viditelne paradajky.
// Neobsahuje ceny, sklad, sukromne udaje ani skryte odrody.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname} from 'node:path';

const mode=process.argv.includes('--write')?'write':process.argv.includes('--check')?'check':null;
if(!mode)throw Error('Pouzi --write alebo --check.');
const SITE='https://herbaetfructus.sk';
const target='semena-paradajok/index.html';
const escaped=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const index=readFileSync('index.html','utf8');
const start=index.indexOf('<a class="logo"'),end=index.indexOf('</a>',start);
if(start<0||end<=start)throw Error('Logo hlavneho webu chyba.');
const logo=index.slice(start,end+4).replace('href="./"','href="/"').replace(' onclick="switchSection(\'domov\'); return false;"','');
if(!logo.includes('<svg')||logo.includes('onclick='))throw Error('Neplatne logo.');
const manifest=JSON.parse(readFileSync('odrody/manifest.json','utf8'));
if(!Array.isArray(manifest)||!manifest.length)throw Error('Nie su verejne odrody; nemozem vytvorit stranku.');
const tomato=manifest.filter(p=>p&&p.section==='paradajky').sort((a,b)=>a.name.localeCompare(b.name,'sk',{sensitivity:'base'}));
if(!tomato.length)throw Error('Ziadne verejne paradajky; odmietam vytvorit prazdnu stranku.');
const slugs=new Set();
for(const p of tomato){
 if(typeof p.name!=='string'||!p.name.trim()||typeof p.slug!=='string'||!(/^[a-z0-9-]+$/).test(p.slug)||slugs.has(p.slug))
  throw Error('Neplatna alebo duplicitna odroda.');
 slugs.add(p.slug);
 const profile='odrody/'+p.slug+'/index.html';
 if(!existsSync(profile)||!readFileSync(profile,'utf8').includes('rel="canonical" href="'+SITE+'/odrody/'+p.slug+'/'))
  throw Error('Profil nie je verejny alebo nie je publikovany: '+p.slug);
}
const list=tomato.map(p=>'<li><a href="/odrody/'+escaped(p.slug)+'/">'+escaped(p.name)+'</a></li>').join('\n');
const url=SITE+'/semena-paradajok/';
const schema={
 '@context':'https://schema.org',
 '@graph':[
  {'@type':'CollectionPage','@id':url+'#page',url,name:'Semená paradajok – zberateľské odrody | Herba et Fructus',
   description:'Prehľad verejných zberateľských odrôd paradajok z katalógu Herba et Fructus.',inLanguage:'sk-SK',
   mainEntity:{'@id':url+'#varieties'}},
  {'@type':'ItemList','@id':url+'#varieties',numberOfItems:tomato.length,
   itemListElement:tomato.map((p,i)=>({'@type':'ListItem',position:i+1,name:p.name,url:SITE+'/odrody/'+p.slug+'/'}))},
  {'@type':'BreadcrumbList',itemListElement:[
    {'@type':'ListItem',position:1,name:'Domov',item:SITE+'/'},
    {'@type':'ListItem',position:2,name:'Semená paradajok',item:url}
  ]}
 ]
};
const data=JSON.stringify(schema).replace(/</g,'\\u003c');
const template=readFileSync('scripts/semena-paradajok-template.txt','utf8');
for(const tag of ['{{LOGO}}','{{COUNT}}','{{TOMATO_LINKS}}','{{STRUCTURED_DATA}}'])
 if(!template.includes(tag))throw Error('V sablone chyba: '+tag);
const html=template.replace('{{LOGO}}',logo).replace('{{COUNT}}',String(tomato.length))
 .replace('{{TOMATO_LINKS}}',list).replace('{{STRUCTURED_DATA}}',data);
if(html.includes('{{'))throw Error('Sablona obsahuje nevyplnene polia.');
if(mode==='check'){
 if(!existsSync(target)||readFileSync(target,'utf8')!==html)throw Error('SEO stranka semen-paradajok nie je aktualna.');
 console.log('SEO: '+tomato.length+' verejnych paradajok, stranka aktualna.');
}else{
 mkdirSync(dirname(target),{recursive:true});
 if(!existsSync(target)||readFileSync(target,'utf8')!==html)writeFileSync(target,html,'utf8');
 console.log('SEO: vytvorena stranka so '+tomato.length+' verejnymi odrodami.');
}
