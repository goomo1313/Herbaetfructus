// Export aktuálneho verejného katalógu Supabase. Fail closed: bez dát nikdy neprepisovať profily.
import {readFileSync,writeFileSync,existsSync,readdirSync,mkdirSync,rmSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {publicProfiles,renderProfile,renderArchive,mainLogo} from './variety-seo-lib.mjs';
const mode=process.argv.includes('--write')?'write':process.argv.includes('--check')?'check':null;
if(!mode)throw Error('Použi --write alebo --check.');
if(mode==='check'){
 if(!existsSync('odrody/manifest.json')){console.log('Profily ešte nie sú publikované.');process.exit(0);}
 const manifest=JSON.parse(readFileSync('odrody/manifest.json','utf8'));
 if(!Array.isArray(manifest)||!manifest.length)throw Error('Neplatný manifest odrôd.');
 for(const row of manifest){
  if(!row||!row.name||!(/^[a-z0-9-]+$/).test(row.slug))throw Error('Neplatný profil.');
  const file='odrody/'+row.slug+'/index.html';
  if(!existsSync(file)||!readFileSync(file,'utf8').includes('rel="canonical" href="https://herbaetfructus.sk/odrody/'+row.slug+'/'))
   throw Error('Chýba platný profil '+row.slug);
 }
 console.log('Overených '+manifest.length+' verejných profilov.');process.exit(0);
}
const config=readFileSync('config.js','utf8');
const url=config.match(/supabaseUrl:\s*["'](https:\/\/[^"']+)["']/);
const key=config.match(/supabaseAnonKey:\s*["']([^"']+)["']/);
if(!url||!key)throw Error('Chýba verejná konfigurácia Supabase.');
const endpoint=new URL('/rest/v1/site_content',url[1]);
endpoint.searchParams.set('select','id,content');
endpoint.searchParams.set('id','in.(sections,varieties)');
const response=await fetch(endpoint,{headers:{apikey:key[1],Accept:'application/json'},signal:AbortSignal.timeout(25000)});
if(!response.ok)throw Error('Neprístupné verejné dáta Supabase, HTTP '+response.status);
const rows=await response.json();
if(!Array.isArray(rows)||rows.length!==2)throw Error('Chýba aktuálny záznam verejných odrôd alebo sekcií.');
const data=Object.fromEntries(rows.map(row=>[row.id,row.content]));
const profiles=publicProfiles(data);
const logo=mainLogo(readFileSync('index.html','utf8'));
const files=new Map([['odrody/index.html',renderArchive(profiles,logo)],
 ['odrody/manifest.json',JSON.stringify(profiles.map(p=>({name:p.name,slug:p.slug,section:p.section})),null,2)+'\n']]);
for(const p of profiles)files.set('odrody/'+p.slug+'/index.html',renderProfile(p,logo,profiles));
for(const [path,content] of files){if(!path.startsWith('odrody/')||path.includes('..')||!content)throw Error('Neplatný verejný export.');}
for(const [path,content] of files){
 if(existsSync(path)&&readFileSync(path,'utf8')===content)continue;
 mkdirSync(dirname(path),{recursive:true});writeFileSync(path,content,'utf8');
}
const names=new Set(profiles.map(p=>p.slug));
if(existsSync('odrody'))for(const e of readdirSync('odrody',{withFileTypes:true})){
 if(!e.isDirectory()||names.has(e.name))continue;
 const filename=join('odrody',e.name,'index.html');
 if(existsSync(filename)&&readFileSync(filename,'utf8').startsWith('<!-- AUTO-GENERATED: scripts/generate-varieties.mjs'))
  rmSync(join('odrody',e.name),{recursive:true,force:true});
}
console.log('Aktualizovaných '+profiles.length+' verejných profilov zo Supabase.');
