import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createContext,runInContext} from 'node:vm';

const html=readFileSync('index.html','utf8');
const tool=readFileSync('3d/index.html','utf8');
const scad=readFileSync('3d/model/plant-markers.scad','utf8');
const main=readFileSync('generator-3d.js','utf8');
const worker=readFileSync('generator-3d-worker.js','utf8');
const app=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean).join('\n');

test('generátor má skutočný pôvodný OpenSCAD profil, 12 voliteľných názvov a nastaviteľné rozmery',()=>{
 assert.match(scad,/module stick_profile\(\)/);
 assert.match(scad,/module marker_text\(txt\)/);
 assert.match(scad,/module plant_marker\(txt\)/);
 assert.match(scad,/linear_extrude\(height=base_height\)/);
 assert.match(scad,/linear_extrude\(height=text_height\)/);
 assert.match(scad,/enable_cutouts && stick_width >= 10/);
 assert.match(scad,/enable_center_hole && stick_width >= 10/);
 for(let i=1;i<=12;i++)assert.match(scad,new RegExp('Name_'+i+'\\s*='));
 for(const key of ['stick_length','stick_width','tip_length','text_size','base_height',
  'text_height','border_radius','max_text_length','y_spacing','text_y_factor',
  'enable_cutouts','enable_center_hole','font_choice'])
  assert.ok(scad.includes(key+' ='),key);
});
test('generator sa publikuje pod /3d s dostupným formulárom, náhľadom a exportmi',()=>{
 for(const id of ['markerForm','names','generateBtn','downloadScad','downloadStl',
  'markerCanvas','renderStatus','generatorApp','generatorGate'])
  assert.match(tool,new RegExp('id="'+id+'"'));
 assert.match(tool,/src="\.\.\/generator-3d.js"/);
 assert.match(tool,/src="\.\.\/config.js"/);
 assert.match(tool,/rel="canonical" href="https:\/\/herbaetfructus.sk\/3d\/"/);
 assert.match(tool,/Štítky|štítky/);
 assert.match(main,/new STLLoader\(\)\.parse/);
 assert.match(main,/new Worker\(new URL\('\.\/generator-3d-worker.js',import\.meta\.url\)/);
 assert.match(main,/stopWorker\(\)/);
 assert.match(main,/generatorPaused===true/);
 assert.match(main,/cache:'no-store'/);
 assert.match(main,/overrideScad\(state.source,values\)/);
 assert.match(worker,/@lofcz\/openscad-wasm@0\.0\.2/);
 assert.match(worker,/--export-format=binstl/);
 assert.match(worker,/addFonts\(app\)/);
 assert.match(worker,/self\.postMessage\(\{type:'result',bytes:copy.buffer\}/);
});
test('všetky skripty sú syntakticky platné',()=>{
 for(const filename of ['generator-3d.js','generator-3d-worker.js']){
  const result=spawnSync(process.execPath,['--check',filename],{encoding:'utf8'});
  assert.equal(result.status,0,filename+'\n'+result.stderr);
 }
});
test('správca má v existujúcom nastavení nezávislý prepínač generátora',()=>{
 assert.match(html,/id="toggleGeneratorBtn"/);
 assert.match(html,/onclick="toggleGeneratorPaused\(\)"/);
 assert.match(html,/async function toggleGeneratorPaused\(\)/);
 assert.match(html,/isGeneratorPaused\(\) \|\| isAdmin/);
 assert.match(html,/saveVisibilitySetting\('generatorPaused'/);
 assert.match(html,/queueCloudSave\('settings', nextSettings\)/);
 assert.match(html,/if \(!saved\)/);
});
test('prepínač generátora zachová stav cien a formulára a neprepisuje cloud pri chybe',async()=>{
 const alertMessages=[];
 const controls={
  toggleGeneratorBtn:{disabled:false,style:{},attrs:{},setAttribute(k,v){this.attrs[k]=v;}},
  togglePricesBtn:{disabled:false,style:{},attrs:{},setAttribute(k,v){this.attrs[k]=v;}},
  toggleOrderFormBtn:{disabled:false,style:{},attrs:{},setAttribute(k,v){this.attrs[k]=v;}},
  floatingPriceTotal:{style:{}},
  kontaktSection:{style:{}}
 };
 const context=createContext({
  window:{HERBA_CONFIG:{}},
  document:{
   addEventListener(){},querySelectorAll(){return[];},getElementById(id){return controls[id]||null;},
   querySelector(){return null;},body:{classList:{contains(){return false;}}}
  },
  localStorage:{getItem(){return null}},
  console:{warn(){},error(){},info(){}},
  setTimeout(){},
  alert(m){alertMessages.push(String(m))}
 });
 runInContext(app,context);
 context.window.__saved=[];
 runInContext("adminAuthenticated=true;cloudDatabaseReady=true;farmSettings.pricesHidden=true;farmSettings.orderFormPaused=true;farmSettings.email='owner@example.com';queueCloudSave=async(k,v)=>{window.__saved.push({k,v});return true;};renderAll=()=>{updateGeneratorVisibility();};showToast=()=>{};",context);
 assert.equal(await runInContext('toggleGeneratorPaused()',context),true);
 assert.equal(runInContext('farmSettings.generatorPaused',context),true);
 assert.equal(runInContext('farmSettings.pricesHidden',context),true);
 assert.equal(runInContext('farmSettings.orderFormPaused',context),true);
 assert.equal(runInContext('farmSettings.email',context),'owner@example.com');
 assert.equal(context.window.__saved[0].k,'settings');
 assert.equal(context.window.__saved[0].v.generatorPaused,true);
 assert.equal(controls.toggleGeneratorBtn.attrs['aria-pressed'],'true');
 assert.equal(await runInContext('toggleGeneratorPaused()',context),true);
 assert.equal(runInContext('farmSettings.generatorPaused',context),false);
 runInContext('queueCloudSave=async()=>false;',context);
 assert.equal(await runInContext('toggleGeneratorPaused()',context),false);
 assert.equal(runInContext('farmSettings.generatorPaused',context),false);
 assert.ok(alertMessages.some(m=>m.includes('nepodarilo uložiť')));
});
