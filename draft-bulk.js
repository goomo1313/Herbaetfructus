/* Hromadné operácie so súkromnými konceptmi. Nikdy nemení verejný katalóg. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const selected=new Set();
 const supported=new Set(['type','growthHabit','color','weight','info','multiflora','isFlagship','price','pricePercent','stock','stockDelta','seedsPerPack','img','imgClear','imageFit','galleryAdd','galleryReplace','galleryRemove','galleryClear','galleryFit']);
 let records=[],original=new Map(),busy=false,modal=null;
 const drafts=()=>window.HERBA_DRAFTS;
 const defs=()=>window.HERBA_BULK_FIELDS;
 const sections=()=>sectionsDatabase.filter(s=>s && s.id && !s.hidden && !['domov','blog','podmienky','pripravujeme'].includes(s.id));
 const fields=()=>[
  {key:'targetSection',label:'Cieľová kategória po zverejnení',kind:'destination'},
  ...(defs()?.fields()||[]).filter(f=>supported.has(f.key)||f.kind==='property')
 ];
 const lookup=key=>fields().find(f=>f.key===key);
 const ready=()=>typeof requireAdmin==='function' && requireAdmin() && !!adminSupabase && cloudDatabaseReady && !!drafts()?.entries && !!defs()?.candidateFor;
 const json=v=>JSON.stringify(v);
 const status=(message,error=false)=>{
  const el=$('draftBulkStatus');if(el){el.textContent=message;el.style.color=error?'#9e2525':'#2d633c';}
 };
 function makeModal(){
  if(modal)return;
  modal=document.createElement('div');
  modal.id='draftBulkOverlay';
  modal.className='modal-overlay';
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML='<section class="modal-box bulk-dialog draft-bulk-dialog" role="dialog" aria-modal="true" aria-labelledby="draftBulkTitle">'+
   '<div class="bulk-header"><h3 id="draftBulkTitle">🛠️ Hromadné operácie – Pripravujeme</h3><button id="draftBulkClose" class="admin-btn" type="button">✕ Zatvoriť</button></div>'+
   '<p class="bulk-description">Upravujú sa výhradne označené súkromné koncepty. Ostatné údaje zostanú zachované. Z tejto obrazovky sa nič nezverejňuje ani neodstraňuje.</p>'+
   '<label for="draftBulkSearch">Hľadať medzi konceptmi</label><input id="draftBulkSearch" type="search" placeholder="Názov, farba, typ alebo kategória…">'+
   '<div class="bulk-tools"><button id="draftBulkSelect" type="button">Označiť vyfiltrované</button><button id="draftBulkClear" type="button">Zrušiť výber</button><span id="draftBulkCount" role="status"></span></div>'+
   '<p id="draftBulkFiltered" class="image-fit-hint"></p><div id="draftBulkList" class="bulk-variety-list" aria-label="Koncepty na úpravu"></div>'+
   '<div class="bulk-controls"><label for="draftBulkField">Ktoré pole zmeniť?<select id="draftBulkField"></select></label>'+
   '<div class="bulk-input-wrapper"><label for="draftBulkValue">Nová hodnota</label><input id="draftBulkValue" type="text" maxlength="4000" placeholder="Zadaj hodnotu">'+
   '<select id="draftBulkChoice" aria-label="Nová hodnota" hidden></select><textarea id="draftBulkLong" aria-label="Nová hodnota – opis alebo fotografie" rows="4" hidden></textarea>'+
   '<label id="draftBulkClearWrap" class="bulk-clear-value" hidden><input id="draftBulkErase" type="checkbox"> Vymazať hodnotu pri označených konceptoch</label></div></div>'+
   '<p id="draftBulkHelp" class="bulk-field-help"></p><div id="draftBulkPreview" class="bulk-preview" aria-live="polite"></div>'+
   '<button id="draftBulkApply" type="button" class="admin-btn" disabled>Skontrolovať a uložiť súkromné zmeny</button>'+
   '<p id="draftBulkStatus" role="status" aria-live="polite" class="drafts-feedback"></p></section>';
  document.body.appendChild(modal);
  $('draftBulkClose').addEventListener('click',close);
  $('draftBulkSearch').addEventListener('input',renderRows);
  $('draftBulkSelect').addEventListener('click',()=>{for(const row of filtered())selected.add(row.id);renderRows();});
  $('draftBulkClear').addEventListener('click',()=>{selected.clear();renderRows();});
  $('draftBulkField').addEventListener('change',changeField);
  for(const id of ['draftBulkValue','draftBulkChoice','draftBulkLong'])$(id).addEventListener('input',preview);
  $('draftBulkChoice').addEventListener('change',preview);
  $('draftBulkErase').addEventListener('change',preview);
  $('draftBulkApply').addEventListener('click',save);
  modal.addEventListener('click',event=>{if(event.target===modal&&!busy)close();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&modal?.classList.contains('active')&&!busy)close();});
 }
 function filtered(){
  const q=String($('draftBulkSearch')?.value||'').trim().toLocaleLowerCase('sk');
  return records.filter(r=>!q||[r.content.name,r.content.type,r.content.fruitType,r.content.growthHabit,r.content.color,r.content.targetSection]
   .map(x=>String(x||'')).join(' ').toLocaleLowerCase('sk').includes(q));
 }
 function renderRows(){
  const list=$('draftBulkList');if(!list)return;
  list.replaceChildren();
  for(const row of filtered()){
   const label=document.createElement('label');label.className='bulk-variety-row';
   const cb=document.createElement('input');cb.type='checkbox';cb.checked=selected.has(row.id);cb.disabled=busy;
   cb.setAttribute('aria-label','Označiť koncept '+String(row.content.name||''));
   cb.addEventListener('change',()=>{if(busy)return;cb.checked?selected.add(row.id):selected.delete(row.id);preview();});
   const name=document.createElement('span');name.textContent=String(row.content.name||'Bez názvu');
   const category=document.createElement('small');category.textContent=row.content.targetSection||'Bez cieľovej kategórie';
   label.append(cb,name,category);list.appendChild(label);
  }
  $('draftBulkCount').textContent='Označené: '+selected.size;
  $('draftBulkFiltered').textContent='Zobrazených '+filtered().length+' z '+records.length+' konceptov';
  preview();
 }
 function selectOptions(values){
  const select=$('draftBulkChoice');select.replaceChildren();
  for(const [value,label] of values){
   const option=document.createElement('option');option.value=value;option.textContent=label;select.appendChild(option);
  }
 }
 function changeField(){
  const f=lookup($('draftBulkField').value);
  const choice=$('draftBulkChoice'),input=$('draftBulkValue'),area=$('draftBulkLong'),erase=$('draftBulkErase'),wrap=$('draftBulkClearWrap');
  if(!f)return;
  choice.hidden=true;input.hidden=true;area.hidden=true;wrap.hidden=!f.allowClear;
  erase.checked=false;
  if(f.kind==='destination')selectOptions(sections().map(s=>[s.id,s.name]));
  else if(f.kind==='boolean')selectOptions([['true','Áno'],['false','Nie']]);
  else if(f.kind==='growthHabit')selectOptions(defs().growths.map(x=>[x,x]));
  else if(f.kind==='color')selectOptions(defs().colors.map(x=>[x,x]));
  else if(f.kind==='fit')selectOptions([['contain','Celý obrázok'],['cover','Orezať do rámika']]);
  if(['destination','boolean','growthHabit','color','fit'].includes(f.kind))choice.hidden=false;
  else if(['longtext','urls'].includes(f.kind))area.hidden=false;
  else if(f.kind!=='confirmClear')input.hidden=false;
  input.value='';area.value='';
  const descriptions={targetSection:'Iba plánovaná kategória; koncept zostáva súkromný.',pricePercent:'Relatívna zmena ceny v percentách, napr. 10 alebo -10.',stockDelta:'Pripočíta alebo odpočíta počet balení od každého označeného konceptu.',galleryAdd:'HTTPS adresy fotografií, každá v novom riadku.'};
  $('draftBulkHelp').textContent=descriptions[f.key]||'Úprava zasiahne len vybrané súkromné koncepty, ostatné polia sa zachovajú.';
  preview();
 }
 function calculate(source=records){
  const ids=source.map((row,i)=>selected.has(row.id)?i:-1).filter(i=>i>=0);
  if(!ids.length)throw Error('Najprv označ aspoň jeden koncept.');
  const f=lookup($('draftBulkField').value);
  if(!f)throw Error('Zvoľ povolené pole.');
  const raw=f.kind==='destination'||['boolean','growthHabit','color','fit'].includes(f.kind)
   ?$('draftBulkChoice').value:['longtext','urls'].includes(f.kind)?$('draftBulkLong').value:$('draftBulkValue').value;
  const items=source.map(r=>r.content);
  let updated;
  if(f.kind==='destination'){
   if(!sections().some(s=>s.id===raw))throw Error('Zvoľ platnú cieľovú kategóriu.');
   updated=items.map((item,i)=>ids.includes(i)?{...item,targetSection:raw}:item);
  }else{
   updated=defs().candidateFor(items,ids,f.key,raw,{clear:$('draftBulkErase').checked===true,sectionIds:sections().map(s=>s.id)});
  }
  for(const i of ids){
   const old=items[i],next=updated[i];
   if(!old||old.section!=='pripravujeme'||old.hidden!==true||next.section!=='pripravujeme'||next.hidden!==true)
    throw Error('Koncept musí zostať súkromný a skrytý.');
  }
  const changes=ids.filter(i=>json(updated[i])!==json(items[i]))
   .map(i=>({id:source[i].id,old:items[i],content:updated[i]}));
  if(!changes.length)throw Error('Zvolená operácia by nič nezmenila.');
  return {f,changes};
 }
 function preview(){
  if(!$('draftBulkPreview'))return;
  const apply=$('draftBulkApply');if(apply)apply.disabled=true;
  const host=$('draftBulkPreview');host.replaceChildren();
  if(busy)return;
  try{
   const {f,changes}=calculate();
   const p=document.createElement('p');
   p.textContent='Pripravená zmena: '+f.label+' · '+changes.length+' konceptov.';
   host.appendChild(p);
   for(const change of changes.slice(0,8)){
    const line=document.createElement('p');line.className='draft-bulk-example';
    const value=f.key==='targetSection'?change.content.targetSection:
     ['pricePercent','price','stockDelta','stock'].includes(f.key)?(f.key.startsWith('price')?change.content.price:change.content.stock):
     f.key==='type'?change.content.type:change.content[f.key];
    line.textContent='• '+change.old.name+' → '+(typeof value==='string'?value:JSON.stringify(value)??'upravené');
    host.appendChild(line);
   }
   if(changes.length>8){const p2=document.createElement('p');p2.textContent='… a ďalších '+(changes.length-8)+' konceptov.';host.appendChild(p2);}
   apply.disabled=false;
  }catch(e){host.textContent=e.message||'Vyplň hodnotu a označ koncepty.';}
  $('draftBulkCount').textContent='Označené: '+selected.size;
 }
 async function open(){
  if(!ready()){alert('Hromadné úpravy sú dostupné len prihlásenému správcovi so súkromnou databázou.');return false;}
  if(!(await drafts().load())){alert('Nepodarilo sa načítať súkromné koncepty zo Supabase.');return false;}
  records=drafts().entries();
  original=new Map(records.map(r=>[r.id,json(r.content)]));selected.clear();
  makeModal();$('draftBulkSearch').value='';
  const select=$('draftBulkField');select.replaceChildren();
  for(const f of fields()){
   const opt=document.createElement('option');opt.value=f.key;opt.textContent=f.label;select.appendChild(opt);
  }
  select.value='targetSection';changeField();renderRows();status('');
  modal.classList.add('active');modal.setAttribute('aria-hidden','false');$('draftBulkSearch').focus();
  return true;
 }
 function close(){
  if(busy)return;
  if(modal){modal.classList.remove('active');modal.setAttribute('aria-hidden','true');}
  selected.clear();records=[];original.clear();
 }
 async function save(){
  if(busy||!ready())return false;
  let prepared;
  try{prepared=calculate();}catch(e){status(e.message,true);return false;}
  if(!confirm('Uložiť hromadnú zmenu „'+prepared.f.label+'“ pri '+prepared.changes.length+' súkromných konceptoch? Nič sa nezverejní.'))return false;
  busy=true;$('draftBulkApply').disabled=true;modal?.setAttribute('aria-busy','true');
  try{
   // Pred zápisom opäť načítaj databázu, aby sa neprepísali novšie ručné zmeny.
   if(!(await drafts().load()))throw Error('Nepodarilo sa overiť aktuálne súkromné koncepty.');
   const fresh=drafts().entries(),lookupFresh=new Map(fresh.map(r=>[r.id,r]));
   for(const id of selected){
    const row=lookupFresh.get(id);
    if(!row||json(row.content)!==original.get(id))throw Error('Niektorý koncept sa medzitým zmenil. Obnov hromadné operácie a výber.');
   }
   const {changes}=calculate(fresh);
   if(changes.some(c=>!c.content.hidden||c.content.section!=='pripravujeme'))
    throw Error('Hromadná úprava nesmie zverejniť koncepty.');
   const timestamp=new Date().toISOString();
   const payload=changes.map(c=>({id:c.id,content:c.content,updated_at:timestamp}));
   const {data,error}=await adminSupabase.from('site_drafts').upsert(payload,{onConflict:'id'}).select('id');
   if(error)throw error;
   if(!Array.isArray(data)||data.length!==payload.length)throw Error('Nepodarilo sa potvrdiť zápis všetkých konceptov. Skontroluj údaje v Supabase.');
   if(!(await drafts().load()))throw Error('Zápis prebehol, ale nové údaje sa nepodarilo opäť načítať.');
   const verified=new Map(drafts().entries().map(r=>[r.id,r.content]));
   if(changes.some(c=>json(verified.get(c.id))!==json(c.content)))throw Error('Zápis sa nepodarilo jednoznačne overiť. Skontroluj koncepty.');
   records=drafts().entries();original=new Map(records.map(r=>[r.id,json(r.content)]));
   selected.clear();renderRows();
   status('✅ Uložených '+changes.length+' súkromných konceptov. Verejný katalóg zostal nezmenený.');
   return true;
  }catch(e){status('⚠️ '+(e.message||'Ukladanie zlyhalo.'),true);return false;}
  finally{busy=false;modal?.setAttribute('aria-busy','false');preview();}
 }
 window.HERBA_DRAFT_BULK={open,close};
})();