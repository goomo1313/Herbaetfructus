/* Pripravujeme – súkromné koncepty v public.site_drafts s RLS iba pre správcu.
 * NIKDY sa neukladajú do verejného site_content.varieties pred schválením. */
(() => {
 'use strict';
 const DRAFT_SECTION='pripravujeme', TABLE='site_drafts';
 const $=id=>document.getElementById(id);
 let rows=[], loaded=false, loading=null, busy=false, editorId=null, editorMode=false;
 const adminReady=()=>typeof adminAuthenticated!=='undefined' && adminAuthenticated && cloudDatabaseReady && !!adminSupabase;
 const isDraft=v=>v && v.section===DRAFT_SECTION;
 const drafts=()=>rows.map(x=>x.content).filter(isDraft);
 const current=()=>rows.find(x=>x.id===editorId)?.content||null;
 const resetEditor=()=>{editorId=null;editorMode=false;};
 const inDraftEditor=()=>editorMode;
 const liveSections=()=>sectionsDatabase.filter(s=>s && !s.hidden && s.id && !['domov','blog','podmienky',DRAFT_SECTION].includes(s.id));
 function feedback(message,isError=false){
  const el=$('draftsFeedback');
  if(el){el.textContent=message;el.style.color=isError?'#a11b1b':'#285a3b';}
 }
 function readiness(v){
  const issues=[];
  if(!String(v.name||'').trim())issues.push('názov');
  if(!v.type||v.type==='Neurčené')issues.push('typ');
  if(!v.color||v.color==='Neurčená')issues.push('farba');
  if(String(v.info||'').trim().length<120)issues.push('opis aspoň 120 znakov');
  if(!/^https:\/\//i.test(String(v.img||'')))issues.push('hlavná fotografia HTTPS');
  if(!(Number(String(v.price||'').replace(',','.'))>0))issues.push('platná cena');
  if(!/^\d+\s*ks$/i.test(String(v.seedsPerPack||''))||parseInt(v.seedsPerPack,10)<1)issues.push('počet semien');
  if(!Number.isInteger(Number(v.stock))||Number(v.stock)<0)issues.push('sklad');
  return issues;
 }
 async function load(){
  if(!adminReady())return false;
  if(loading)return loading;
  loading=(async()=>{
   try{
    const {data,error}=await adminSupabase.from(TABLE).select('id,content');
    if(error)throw error;
    rows=(Array.isArray(data)?data:[]).filter(x=>x && typeof x.id==='string' && isDraft(x.content));
    loaded=true;render();return true;
   }catch(e){
    loaded=false;
    feedback('Súkromná tabuľka Pripravujeme nie je dostupná: '+(e.message||'skontroluj RLS'),true);
    return false;
   }finally{loading=null;}
  })();
  return loading;
 }
 async function open(){
  if(!adminReady()){alert('Pripravujeme vyžaduje prihlásenie správcu a dostupné Supabase.');return false;}
  if(!loaded && !(await load())){
   alert('Pripravujeme je pripravené v kóde, ale v Supabase ešte chýba súkromná tabuľka alebo prístup. Spusť SUPABASE_PRIPRAVUJEME.sql v SQL Editore, potom otvor kartu znova.');
   return false;
  }
  render();
  const el=$('draftsOverlay');if(!el)return false;
  el.classList.add('active');el.setAttribute('aria-hidden','false');
  el.querySelector('button')?.focus();
  return true;
 }
 function close(){
  const el=$('draftsOverlay');
  if(el){el.classList.remove('active');el.setAttribute('aria-hidden','true');}
  $('openDraftsButton')?.focus();
 }
 function syncEditor(){
  const draft=$('varSectionSelect')?.value===DRAFT_SECTION;
  const hidden=$('varHidden');
  if(hidden){if(draft)hidden.checked=true;hidden.disabled=draft;}
  const hint=$('varDraftHint');if(hint)hint.hidden=!draft;
 }
 function create(){
  if(!adminReady() || !loaded)return false;
  openVarietyModal();
  editorMode=true;editorId=null;
  $('varSectionSelect').value=DRAFT_SECTION;
  $('varType').value='Neurčené';
  $('varColor').value='Neurčená';
  $('varPrice').value='';
  $('varStock').value='0';
  $('varSeedsPerPack').value='';
  $('varHidden').checked=true;
  syncEditor();$('varName')?.focus();
  return true;
 }
 function edit(id){
  if(!adminReady()||!loaded)return false;
  const row=rows.find(x=>x.id===id);if(!row)return false;
  const v=row.content;
  openVarietyModal();
  editorId=id;editorMode=true;
  const put=(key,value)=>{if($(key))$(key).value=String(value??'');};
  put('varName',v.name);
  const type=$('varType');
  if(type){
   const found=[...type.options].some(opt=>opt.value===v.type);
   type.value=found?v.type:'Ďalší';
   put('varCustomType',found?'':v.type);
   const custom=$('customTypeWrapper');if(custom)custom.style.display=found?'none':'block';
  }
  put('varColor',v.color||'Neurčená');
  put('varPrice',v.price);
  put('varSeedsPerPack',v.seedsPerPack);
  put('varStock',v.stock);
  put('varWeight',v.weight);
  put('varImg',v.img);
  put('varImageFit',v.imageFit||'contain');
  put('varGalleryUrls',Array.isArray(v.gallery)?v.gallery.join('\n'):'');
  put('varInfo',v.info);
  if(typeof varietyGalleryFitDraft!=='undefined')varietyGalleryFitDraft=Object.assign(Object.create(null),v.galleryImageFits||{});
  if(typeof renderVarietyGalleryFitControls==='function')renderVarietyGalleryFitControls();
  if($('varPhotoFiles'))$('varPhotoFiles').value='';
  if($('varMultiflora'))$('varMultiflora').checked=!!v.multiflora;
  if($('varHidden'))$('varHidden').checked=true;
  put('varSectionSelect',DRAFT_SECTION);
  window.HERBA_VARIETY_PROPERTIES?.fillEditor(v);
  syncEditor();
  if(typeof updateImageFitPreview==='function')updateImageFitPreview('varImg','varPhotoFiles','varImageFit','varMainPhotoPreview');
  return true;
 }
 async function saveDraft(item, existingId=null){
  if(!adminReady()||!loaded||!isDraft(item)||!item.hidden)return false;
  const selectedId=existingId&&rows.some(x=>x.id===existingId)?existingId:editorId;
  const duplicate=rows.some(x=>x.id!==selectedId && x.content?.name?.toLocaleLowerCase('sk')===item.name.toLocaleLowerCase('sk'))
    || varietyDatabase.some(v=>v&&v.name?.toLocaleLowerCase('sk')===item.name.toLocaleLowerCase('sk'));
  if(duplicate){feedback('Tento názov už existuje v katalógu alebo medzi konceptmi.',true);return false;}
  const id=selectedId||'draft-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10);
  const content={...item,section:DRAFT_SECTION,hidden:true};
  const old=rows.find(x=>x.id===id);
  if(old?.content?.targetSection)content.targetSection=old.content.targetSection;
  try{
   const {error}=await adminSupabase.from(TABLE).upsert({id,content,updated_at:new Date().toISOString()},{onConflict:'id'});
   if(error)throw error;
   const index=rows.findIndex(x=>x.id===id);
   if(index>=0)rows[index]={id,content};else rows.push({id,content});
   editorId=id;render();feedback('✅ Koncept je súkromne uložený do Supabase.');
   return true;
  }catch(e){feedback('Koncept sa nepodarilo uložiť: '+(e.message||'skontroluj prístup'),true);return false;}
 }
 function makeButton(label,handler){
  const btn=document.createElement('button');btn.type='button';
  btn.textContent=label;btn.className='drafts-action';btn.addEventListener('click',handler);
  return btn;
 }
 function render(){
  if($('draftsAdminCount'))$('draftsAdminCount').textContent=loaded&&rows.length?'('+rows.length+')':'';
  if($('draftsCount'))$('draftsCount').textContent=loaded?rows.length+' rozpracovaných odrôd':'Načítavam súkromné koncepty…';
  const host=$('draftsRows');if(!host)return;
  host.replaceChildren();
  if(!adminReady()||!loaded){host.textContent='Súkromné koncepty sú dostupné až po bezpečnom prihlásení a načítaní.';return;}
  if(!rows.length){const p=document.createElement('p');p.className='drafts-empty';p.textContent='Zatiaľ tu nie sú odrody. Klikni na Pripraviť novú odrodu.';host.appendChild(p);return;}
  for(const row of rows){
   const item=row.content;
   const card=document.createElement('article');card.className='drafts-item';
   const cover=document.createElement('div');cover.className='drafts-thumb';
   if(/^https:\/\//i.test(String(item.img||''))){
    const img=document.createElement('img');img.src=item.img;img.alt='Fotografia odrody '+item.name;img.loading='lazy';cover.appendChild(img);
   }else cover.textContent='📷';
   const body=document.createElement('div');body.className='drafts-main';
   const title=document.createElement('strong');title.textContent=item.name||'Bez názvu';
   const issues=readiness(item);
   const hint=document.createElement('p');
   hint.textContent=issues.length?'Doplniť pred publikovaním: '+issues.join(', '):'Pripravené na kontrolu a zverejnenie.';
   const controls=document.createElement('div');controls.className='drafts-item-controls';
   const select=document.createElement('select');select.className='drafts-destination';
   select.setAttribute('aria-label','Cieľová kategória odrody '+item.name);
   for(const dest of liveSections()){
    const option=document.createElement('option');option.value=dest.id;option.textContent=dest.name;select.appendChild(option);
   }
   if(liveSections().some(s=>s.id===item.targetSection))select.value=item.targetSection;
   controls.appendChild(select);
   controls.appendChild(makeButton('✏️ Upraviť',()=>edit(row.id)));
   controls.appendChild(makeButton('Uložiť cieľovú kategóriu',()=>move(row.id,select.value,false)));
   const pub=makeButton('✓ Zverejniť',()=>move(row.id,select.value,true));pub.classList.add('drafts-publish');
   pub.title=issues.length?'Chýba: '+issues.join(', '):'Zverejniť v katalógu';
   controls.appendChild(pub);
   body.append(title,hint,controls);card.append(cover,body);host.appendChild(card);
  }
 }
 async function move(id,destination,publish){
  if(busy||!adminReady()||!loaded){feedback('Ukladanie nie je dostupné.',true);return false;}
  const row=rows.find(x=>x.id===id),target=liveSections().find(x=>x.id===destination);
  if(!row||!target){feedback('Neplatná odroda alebo cieľová kategória.',true);return false;}
  const item=row.content;
  if(!isDraft(item)||item.hidden!==true){feedback('Koncept nie je bezpečne skrytý.',true);return false;}
  const missing=readiness(item);
  if(publish && missing.length){feedback('Pred zverejnením treba doplniť: '+missing.join(', '),true);return false;}
  if(publish && varietyDatabase.some(v=>v&&v.name?.trim().toLocaleLowerCase('sk')===item.name.trim().toLocaleLowerCase('sk'))){
   feedback('Odroda s týmto názvom už je v katalógu. Zverejnenie bolo zablokované.',true);return false;
  }
  const prompt=publish?'Zverejniť „'+item.name+'“ v kategórii '+target.name+'? Tento krok sprístupní odrodu verejnosti.':
   'Uložiť cieľovú kategóriu '+target.name+'? Koncept zostane iba v súkromnej tabuľke.';
  if(!confirm(prompt))return false;
  busy=true;$('draftsOverlay')?.setAttribute('aria-busy','true');
  try{
   if(!publish){
    const updated={...item,targetSection:destination};
    const {error}=await adminSupabase.from(TABLE).upsert({id,content:updated,updated_at:new Date().toISOString()},{onConflict:'id'});
    if(error)throw error;row.content=updated;render();feedback('✅ Cieľová kategória uložená. Koncept stále nie je verejný.');return true;
   }
   const publicItem={...item,section:destination,hidden:false};
   delete publicItem.targetSection;
   const next=[...varietyDatabase,publicItem];
   const saved=await queueCloudSave('varieties',next);
   if(!saved){feedback('Verejné uloženie zlyhalo. Koncept zostáva súkromný.',true);return false;}
   varietyDatabase=next;
   const {error}=await adminSupabase.from(TABLE).delete().eq('id',id);
   if(error){
    renderAll();feedback('Odroda je verejná, ale vymazanie konceptu zlyhalo. Skontroluj ho v Pripravujeme: '+(error.message||''),true);
    return true;
   }
   rows=rows.filter(x=>x.id!==id);
   renderAll();render();feedback('✅ Odroda zverejnená v '+target.name+'.');
   return true;
  }catch(e){feedback('Operácia zlyhala: '+(e.message||'neznáma chyba'),true);return false;}
  finally{busy=false;$('draftsOverlay')?.setAttribute('aria-busy','false');}
 }
 const overlay=$('draftsOverlay');
 overlay?.addEventListener('click',e=>{if(e.target===overlay)close()});
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && overlay?.classList.contains('active') && !$('varietyModal')?.classList.contains('active'))close();
 });
 window.HERBA_DRAFTS={load,open,close,create,edit,saveDraft,move,render,drafts,current,resetEditor,inDraftEditor,syncEditor,readiness};
})();
