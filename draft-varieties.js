/* Neverejná dielňa Pripravujeme. Záznamy ostávajú v site_content.varieties,
 * section="pripravujeme", hidden=true. Nevyžaduje sa nová DB tabuľka.
 * Bez autentifikácie/RLS sa nedá uložiť ani zverejniť. */
(() => {
 'use strict';
 const DRAFT_SECTION='pripravujeme';
 const $=id=>document.getElementById(id);
 let busy=false;
 function adminReady(){return typeof adminAuthenticated!=='undefined' && adminAuthenticated && cloudDatabaseReady;}
 function drafts(){return varietyDatabase.filter(v=>v&&v.section===DRAFT_SECTION);}
 function liveSections(){
  return sectionsDatabase.filter(s=>s && !s.hidden && s.id && !['domov','blog','podmienky',DRAFT_SECTION].includes(s.id));
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
  if(!Number.isInteger(Number(v.stock)) || Number(v.stock)<0)issues.push('sklad');
  return issues;
 }
 function feedback(message,isError=false){
  const el=$('draftsFeedback');
  if(el){el.textContent=message;el.style.color=isError?'#a11b1b':'#285a3b';}
 }
 function open(){
  if(!adminReady()){alert('Pripravujeme vyžaduje prihlásenie správcu a dostupnú databázu Supabase.');return false;}
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
  const isDraft=$('varSectionSelect')?.value===DRAFT_SECTION;
  const hidden=$('varHidden');
  if(hidden){if(isDraft)hidden.checked=true;hidden.disabled=isDraft;}
  const hint=$('varDraftHint');if(hint)hint.hidden=!isDraft;
 }
 function create(){
  if(!adminReady())return false;
  openVarietyModal();
  $('varSectionSelect').value=DRAFT_SECTION;
  $('varType').value='Neurčené';
  $('varColor').value='Neurčená';
  $('varPrice').value='';
  $('varStock').value='0';
  $('varSeedsPerPack').value='';
  $('varHidden').checked=true;
  syncEditor();
  $('varName')?.focus();
  return true;
 }
 function edit(name){
  if(!adminReady())return false;
  const idx=varietyDatabase.findIndex(v=>v&&v.section===DRAFT_SECTION&&v.name===name);
  if(idx<0)return false;
  editVariety(idx);syncEditor();return true;
 }
 function makeButton(text,fn){
  const button=document.createElement('button');
  button.type='button';button.textContent=text;button.className='drafts-action';
  button.addEventListener('click',fn);
  return button;
 }
 function render(){
  const all=drafts(),host=$('draftsRows');
  if($('draftsAdminCount'))$('draftsAdminCount').textContent=all.length?'('+all.length+')':'';
  if($('draftsCount'))$('draftsCount').textContent=all.length+' rozpracovaných odrôd';
  if(!host)return;
  host.replaceChildren();
  if(!adminReady()){host.textContent='Len pre prihláseného správcu.';return;}
  if(!all.length){const empty=document.createElement('p');empty.className='drafts-empty';
   empty.textContent='Zatiaľ tu nie sú žiadne odrody. Klikni na „Pripraviť novú odrodu“.';
   host.appendChild(empty);return;}
  for(const item of all){
   const row=document.createElement('article');row.className='drafts-item';
   const cover=document.createElement('div');cover.className='drafts-thumb';
   if(/^https:\/\//i.test(String(item.img||''))){const image=document.createElement('img');image.src=item.img;image.alt='Fotografia odrody '+item.name;image.loading='lazy';cover.appendChild(image);}
   else cover.textContent='📷';
   const body=document.createElement('div');body.className='drafts-main';
   const title=document.createElement('strong');title.textContent=item.name||'Bez názvu';
   const errors=readiness(item);
   const hint=document.createElement('p');hint.textContent=errors.length?'Pred zverejnením doplniť: '+errors.join(', '):'Pripravená na kontrolu a publikovanie.';
   const controls=document.createElement('div');controls.className='drafts-item-controls';
   const section=document.createElement('select');section.className='drafts-destination';
   section.setAttribute('aria-label','Cieľová kategória pre '+item.name);
   for(const dest of liveSections()){const opt=document.createElement('option');opt.value=dest.id;opt.textContent=dest.name;section.appendChild(opt);}
   controls.appendChild(section);
   controls.appendChild(makeButton('✏️ Upraviť',()=>edit(item.name)));
   controls.appendChild(makeButton('Presunúť ako skryté',()=>move(item.name,section.value,false)));
   const pub=makeButton('✓ Zverejniť',()=>move(item.name,section.value,true));
   pub.classList.add('drafts-publish');
   pub.title=errors.length?'Chýba: '+errors.join(', '):'Po potvrdení sa zobrazí v katalógu a ďalšom SEO exporte';
   controls.appendChild(pub);
   body.append(title,hint,controls);row.append(cover,body);host.appendChild(row);
  }
 }
 async function move(name,destination,publish){
  if(busy || !adminReady()){feedback('Uloženiu bráni prebiehajúca operácia alebo chýbajúce oprávnenie.',true);return false;}
  const idx=varietyDatabase.findIndex(v=>v&&v.section===DRAFT_SECTION&&v.name===name);
  const target=liveSections().find(s=>s.id===destination);
  if(idx<0||!target){feedback('Neplatná odroda alebo kategória. Skontroluj viditeľnosť cieľovej kategórie.',true);return false;}
  const current=varietyDatabase[idx];
  if(!current.hidden){feedback('Rozpracovaná odroda nemá bezpečný stav hidden=true. Najprv ju uprav.',true);return false;}
  const missing=readiness(current);
  if(publish&&missing.length){feedback('Odrodu ešte nemožno zverejniť. Doplň: '+missing.join(', ')+'.',true);return false;}
  const question=publish
   ? 'Zverejniť odrodu „'+name+'“ v kategórii „'+target.name+'“? Bude dostupná návštevníkom aj vo verejnom SEO exporte.'
   : 'Presunúť odrodu „'+name+'“ do kategórie „'+target.name+'“ ako naďalej skrytú?';
  if(!confirm(question))return false;
  const next=varietyDatabase.map((v,i)=>i===idx?{...v,section:destination,hidden:!publish}:v);
  busy=true;
  const overlay=$('draftsOverlay');overlay?.setAttribute('aria-busy','true');
  feedback('☁️ Ukladám zmenu do Supabase…');
  try{
   const saved=await queueCloudSave('varieties',next);
   if(!saved){feedback('Uloženie do Supabase zlyhalo. Odroda zostala v Pripravujeme.',true);return false;}
   varietyDatabase=next;
   renderAll();
   render();
   feedback(publish?'✅ Odroda bola zverejnená v '+target.name+'.':'✅ Odroda bola presunutá do '+target.name+' a zostáva skrytá.');
   return true;
  }catch(error){feedback('Uloženie zlyhalo: '+(error.message||'neznáma chyba'),true);return false;}
  finally{busy=false;overlay?.setAttribute('aria-busy','false');}
 }
 const el=$('draftsOverlay');
 el?.addEventListener('click',e=>{if(e.target===el)close()});
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape' && $('draftsOverlay')?.classList.contains('active') && !$('varietyModal')?.classList.contains('active'))close();
 });
 window.HERBA_DRAFTS={open,close,create,edit,render,move,syncEditor,readiness,drafts};
})();
