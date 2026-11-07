/* Herba et Fructus – hromadná správa kompletnej karty odrody.
 * Zmení sa iba zvolené pole pri výslovne označených záznamoch.
 * Kontrola stavu proti Supabase pred aj po nahrávaní fotografií.
 */
(() => {
    'use strict';
    const $=id=>document.getElementById(id);
    const defs=()=>window.HERBA_BULK_FIELDS;
    const selected=new Set();
    let openedSignature='',busy=false;
    function signature(items) {
        return typeof stableCloudJson==='function' ? stableCloudJson(items) : JSON.stringify(items);
    }
    function candidateFor(items,indices,key,value,options={}) {
        return defs().candidateFor(items,indices,key,value,options);
    }
    function countLabel(n) {
        return n===1?'1 odroda':n<5?n+' odrody':n+' odrôd';
    }
    function sectionIds() {
        return sectionsDatabase.filter(s=>s&&!s.hidden&&
            !['domov','blog','podmienky'].includes(s.id)).map(s=>s.id);
    }
    function visibleIndices() {
        const query=String($('bulkSearch')?.value||'').trim().toLocaleLowerCase('sk');
        return varietyDatabase.map((item,i)=>({item,i})).filter(({item})=>
            !query || [item.name,item.type,item.color,item.section].join(' ')
                .toLocaleLowerCase('sk').includes(query)).map(x=>x.i);
    }
    function renderRows() {
        const host=$('bulkVarietyList');
        if(!host)return;
        const shown=visibleIndices();
        host.textContent='';
        const fragment=document.createDocumentFragment();
        for(const index of shown) {
            const item=varietyDatabase[index];
            const label=document.createElement('label');
            label.className='bulk-variety-row';
            const checkbox=document.createElement('input');
            checkbox.type='checkbox';
            checkbox.checked=selected.has(index);
            checkbox.disabled=busy;
            checkbox.setAttribute('aria-label','Označiť odrodu '+item.name);
            checkbox.addEventListener('change',()=>{
                if(busy)return;
                if(checkbox.checked)selected.add(index);
                else selected.delete(index);
                preview();
            });
            const name=document.createElement('span');
            name.textContent=String(item.name||'Bez názvu');
            const section=document.createElement('small');
            section.textContent=String(item.section||'');
            label.append(checkbox,name,section);
            fragment.appendChild(label);
        }
        host.appendChild(fragment);
        if($('bulkSearchCount'))$('bulkSearchCount').textContent=
            'Zobrazených '+shown.length+' z '+varietyDatabase.length;
        preview();
    }
    function readInput() {
        const def=defs()?.field($('bulkField')?.value||'');
        if(!def)return {def:null,value:'',options:{}};
        const clear=$('bulkClearValue')?.checked===true && !!def.allowClear;
        const options={clear,sectionIds:sectionIds()};
        if(['file','files'].includes(def.kind)) {
            const files=Array.from($('bulkPhotoFiles')?.files||[]);
            options.files=files;
            options.uploadedUrls=files.map((_,i)=>
                'https://example.invalid/hromadne-'+i+'.jpg');
            return {def,value:'',options};
        }
        let value='';
        if(['boolean','fit','color','section'].includes(def.kind))
            value=$('bulkChoice')?.value||'';
        else if(['longtext','urls'].includes(def.kind))
            value=$('bulkLongValue')?.value||'';
        else value=$('bulkValue')?.value||'';
        return {def,value,options};
    }
    function optionsForChoice(def) {
        if(def.kind==='boolean')return [['true','Áno'],['false','Nie']];
        if(def.kind==='fit')return [['contain','Zobraziť celú – bez orezania'],['cover','Vyplniť rámik – s orezaním']];
        if(def.kind==='color')return defs().colors.map(c=>[c,c]);
        if(def.kind==='section')return sectionsDatabase.filter(s=>
            s && !s.hidden && sectionIds().includes(s.id)).map(s=>[s.id,s.name]);
        return [];
    }
    function setOptions(select,entries) {
        select.textContent='';
        entries.forEach(([value,label])=>{
            const option=document.createElement('option');
            option.value=value;
            option.textContent=label;
            select.appendChild(option);
        });
        if(entries.length)select.value=entries[0][0];
    }
    function changeField() {
        if(busy)return;
        const def=defs()?.field($('bulkField')?.value||'');
        if(!def)return;
        const choice=$('bulkChoice'),input=$('bulkValue'),
            textarea=$('bulkLongValue'),photo=$('bulkPhotoFiles'),clear=$('bulkClearValue');
        choice.hidden=!['boolean','fit','color','section'].includes(def.kind);
        input.hidden=!['name','type','text','property','price','percent','stock','delta','seeds','url'].includes(def.kind);
        textarea.hidden=!['longtext','urls'].includes(def.kind);
        photo.hidden=!['file','files'].includes(def.kind);
        clear.closest('label').hidden=!def.allowClear;
        clear.checked=false;
        input.disabled=false;textarea.disabled=false;choice.disabled=false;
        input.value='';textarea.value='';photo.value='';
        input.maxLength=def.max||500;
        input.placeholder=def.placeholder||(
            def.kind==='price'?'napr. 1,50':
            def.kind==='percent'?'napr. -10 (zlacniť) alebo 15':
            def.kind==='stock'?'napr. 10':
            def.kind==='delta'?'napr. +5 alebo -2':
            def.kind==='name'?'{name} – nová sezóna':
            def.kind==='seeds'?'10 ks':
            def.kind==='url'?'https://.../fotografia.jpg':
            def.kind==='type'?'napr. Cherry & Koktailová':
            'Zadaj novú hodnotu'
        );
        if(!choice.hidden)setOptions(choice,optionsForChoice(def));
        const guide=$('bulkFieldHelp');
        if(guide)guide.textContent=
            def.kind==='name'?'Pri viacerých odrodách použi {name} ako pôvodný názov. Napr. {name} – 2026. Duplicitné názvy sa nepovolia.':
            def.kind==='percent'?'Záporné percento znižuje cenu, kladné ju zvyšuje. Výsledok sa zaokrúhli na centy.':
            def.kind==='delta'?'Zadaj kladné alebo záporné celé číslo. Výsledný sklad nemôže klesnúť pod nulu.':
            def.kind==='file'||def.kind==='files'?'Ten istý vybraný obrázok / obrázky sa priradia ku každej označenej odrode. Súbory sa nahrajú do Supabase až po potvrdení.':
            def.kind==='urls'?'Jedna HTTPS adresa na riadok. Limit: 8 fotografií na odrodu vrátane hlavnej.':
            def.kind==='confirmClear'?'Táto operácia odstráni odkazy z kariet, nemaže fyzické súbory v úložisku.':
            def.allowClear?'Voliteľné pole môžeš tiež vymazať pomocou prepínača nižšie.':
            'Zmení sa len vybrané pole pri označených odrodách.';
        preview();
    }
    function preview() {
        const count=$('bulkSelectedCount'),result=$('bulkPreview'),submit=$('bulkApply');
        if(count)count.textContent='Vybrané: '+countLabel(selected.size);
        if(!result)return;
        result.textContent='';
        const {def,value,options}=readInput();
        if(!def) {
            result.textContent='Vyber pole, ktoré chceš upraviť.';
            if(submit)submit.disabled=true;
            return;
        }
        let candidate=null,error='';
        const files=options.files||[];
        if(def.kind==='file'||def.kind==='files') {
            if(!files.length||files.length>6||(def.kind==='file'&&files.length!==1))
                error='Vyber '+(def.kind==='file'?'presne jednu fotografiu.':'1 až 6 fotografií.');
            else if(files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||
                f.size>20*1024*1024||f.size===0))
                error='Fotografie musia byť JPG/PNG/WebP a mať maximálne 20 MB každá.';
        }
        if(!error && selected.size) {
            try{candidate=candidateFor(varietyDatabase,[...selected],def.key,value,options);}
            catch(e){error=e.message;}
        }
        const changed=candidate&&candidate.some((item,i)=>
            signature(item)!==signature(varietyDatabase[i]));
        const valid=!!candidate&&changed&&!error&&!busy&&
            signature(varietyDatabase)===openedSignature;
        if(submit)submit.disabled=!valid;
        const main=document.createElement('p');
        let description=(options.clear?'VYMAZAŤ HODNOTU':
            ['file','files'].includes(def.kind)?files.map(f=>f.name).join(', '):
            ['confirmClear'].includes(def.kind)?'VYMAZAŤ ODKAZY':
            ['boolean'].includes(def.kind)?(value==='true'?'Áno':'Nie'):
            value);
        main.textContent=error?'⚠️ '+error:
            !selected.size?'Najprv označ aspoň jednu odrodu.':
            !changed?'Zvolená hodnota nezmení žiadnu z označených odrôd.':
            'Náhľad: '+def.label+' → „'+description+'“ pre '+countLabel(selected.size)+'.';
        result.appendChild(main);
        if(candidate && changed) {
            const examples=[...selected].sort((a,b)=>a-b).slice(0,5).map(i=>{
                const before=varietyDatabase[i],after=candidate[i];
                const key=def.kind==='percent'?'price':
                    def.kind==='delta'?'stock':
                    def.kind==='property'?'properties':
                    def.kind==='confirmClear'?(def.key==='imgClear'?'img':'gallery'):
                    def.kind==='file'?'img':
                    def.kind==='files'?'gallery':
                    def.key==='galleryAdd'||def.key==='galleryReplace'||def.key==='galleryRemove'?'gallery':
                    def.key==='galleryFit'?'galleryImageFits':def.key;
                const oldValue=key==='properties'?before.properties?.[def.key]:before[key];
                const newValue=key==='properties'?after.properties?.[def.key]:after[key];
                const format=v=>Array.isArray(v)?v.length+' fotiek':
                    v&&typeof v==='object'?'nastavenie zobrazenia':String(v??'—');
                return String(before.name||'Odroda')+': '+format(oldValue)+' → '+format(newValue);
            });
            const details=document.createElement('small');
            details.textContent=examples.join(' | ')+(selected.size>5?' | a ďalšie…':'');
            result.appendChild(details);
        }
        if(['file','files'].includes(def.kind)&&files.length) {
            const warning=document.createElement('small');
            warning.textContent='Pozor: tá istá fotografia sa zobrazí pri každej vybranej odrode. Nezvoľ rôzne odrody, ak ich fotografie nesúvisia.';
            result.appendChild(warning);
        }
        if($('bulkStatus') && !busy)$('bulkStatus').textContent='';
    }
    function open() {
        if(!requireAdmin())return false;
        if(!cloudDatabaseReady||!adminSupabase){
            alert('Hromadné úpravy vyžadujú dostupnú databázu Supabase.');
            return false;
        }
        selected.clear();openedSignature=signature(varietyDatabase);
        busy=false;
        $('bulkSearch').value='';
        $('bulkField').value=defs().fields()[0].key;
        changeField();renderRows();
        $('bulkVarietyModal').classList.add('active');
        $('bulkVarietyModal').setAttribute('aria-hidden','false');
        $('bulkSearch').focus();
        return true;
    }
    function close() {
        if(busy)return false;
        $('bulkVarietyModal')?.classList.remove('active');
        $('bulkVarietyModal')?.setAttribute('aria-hidden','true');
        selected.clear();return true;
    }
    function selectVisible() {
        if(busy)return;
        for(const index of visibleIndices())selected.add(index);
        renderRows();
    }
    function clear() {
        if(busy)return;
        selected.clear();renderRows();
    }
    function setBusy(value) {
        busy=value;
        ['bulkClose','bulkField','bulkValue','bulkLongValue','bulkChoice','bulkClearValue',
        'bulkPhotoFiles','bulkSearch','bulkSelectVisible','bulkClear','bulkApply'].forEach(id=>{
            const el=$(id);if(el)el.disabled=value;
        });
        $('bulkVarietyList')?.querySelectorAll('input[type="checkbox"]').forEach(cb=>{cb.disabled=value;});
    }
    async function cloudSnapshot() {
        const {data,error}=await adminSupabase.from(cloudContentTable)
            .select('content,updated_at').eq('id','varieties').single();
        if(error)throw error;
        if(!data?.updated_at)throw Error('V Supabase chýba aktuálny záznam odrôd.');
        if(signature(data.content)!==openedSignature)
            throw Error('Odrody sa medzitým zmenili na inom zariadení. Nič sa neuložilo; obnov stránku.');
        return data;
    }
    async function uploadFiles(files,paths) {
        const urls=[];
        for(let i=0;i<files.length;i++){
            const status=$('bulkStatus');
            if(status)status.textContent='Nahrávam fotografiu '+(i+1)+' z '+files.length+'…';
            const photo=await prepareVarietyPhoto(files[i]);
            const ext=photo.type==='image/png'?'.png':
                photo.type==='image/jpeg'?'.jpg':'.webp';
            const filepath='varieties/bulk-'+Date.now()+'-'+
                Math.random().toString(36).slice(2,10)+ext;
            const bucket=adminSupabase.storage.from('site-images');
            const {error}=await bucket.upload(filepath,photo,{
                upsert:false,contentType:photo.type
            });
            if(error)throw error;
            paths.push(filepath);
            const {data}=bucket.getPublicUrl(filepath);
            if(!data||!defs().safeUrl(data.publicUrl))
                throw Error('Nepodarilo sa získať HTTPS adresu fotografie.');
            urls.push(data.publicUrl);
        }
        return urls;
    }
    async function apply() {
        if(busy||!requireAdmin())return false;
        if(!cloudDatabaseReady||!adminSupabase){
            alert('Supabase nie je dostupná. Nič sa nezmenilo.');return false;
        }
        const indices=[...selected].sort((a,b)=>a-b);
        const {def,value,options}=readInput();
        const uploadedPaths=[];
        let candidate;
        try {
            candidate=candidateFor(varietyDatabase,indices,def?.key,value,options);
            if(signature(candidate)===signature(varietyDatabase))throw Error('Vybraná operácia nezmení žiadne údaje.');
            const files=options.files||[];
            if(files.length&&(files.length>6||
                files.some(f=>f.size===0||f.size>20*1024*1024||
                    !['image/jpeg','image/png','image/webp'].includes(f.type))))
                throw Error('Neplatné fotografie: len 1 až 6 súborov JPG/PNG/WebP do 20 MB.');
        }catch(error){alert(error.message);return false;}
        if(signature(varietyDatabase)!==openedSignature){
            alert('Údaje sa počas úpravy zmenili. Obnov prehľad a skús znova.');
            return false;
        }
        const newVal=options.clear?'VYMAZAŤ':
            ['file','files'].includes(def.kind)?options.files.map(f=>f.name).join(', '):
            def.kind==='confirmClear'?'VYMAZAŤ ODKAZY':value;
        if(!confirm('Naozaj zmeniť „'+def.label+'“ u '+countLabel(indices.length)+
            '?\nHodnota: '+String(newVal).slice(0,250)+
            '\n\nZmena sa okamžite prejaví všetkým návštevníkom a dotkne sa len označených odrôd.'))return false;
        setBusy(true);
        if($('bulkStatus'))$('bulkStatus').textContent='Overujem aktuálne údaje Supabase…';
        let committed=false;
        try {
            const waiting=await Promise.all(Object.values(cloudSaveQueues));
            if(waiting.some(r=>r===false))throw Error('Staršie neúspešné ukladanie; obnov stránku.');
            if(signature(varietyDatabase)!==openedSignature)throw Error('Údaje sa zmenili v tomto prehliadači.');
            const snapshot=await cloudSnapshot();
            if(options.files?.length) {
                const urls=await uploadFiles(options.files,uploadedPaths);
                candidate=candidateFor(varietyDatabase,indices,def.key,value,{
                    ...options,uploadedUrls:urls
                });
                // Nahratie mohlo trvať dlho. Pred uložením znova over databázu.
                const refreshed=await cloudSnapshot();
                if(refreshed.updated_at!==snapshot.updated_at)
                    throw Error('Počas nahrávania iné zariadenie upravilo odrody.');
            }
            const {data:updated,error}=await adminSupabase.from(cloudContentTable)
                .update({content:candidate,updated_at:new Date().toISOString()})
                .eq('id','varieties').eq('updated_at',snapshot.updated_at).select('id');
            if(error)throw error;
            if(!Array.isArray(updated)||updated.length!==1)
                throw Error('Súbežná úprava na inom zariadení. Zápis bol odmietnutý.');
            committed=true;
            varietyDatabase=candidate;
            openedSignature=signature(varietyDatabase);
            selected.clear();
            try{
                renderAll();
                if(typeof renderAdminTable==='function')renderAdminTable();
            }catch(renderError){console.warn('Uložené, ale obnovenie zobrazenia zlyhalo:',renderError);}
            $('bulkVarietyModal')?.classList.remove('active');
            $('bulkVarietyModal')?.setAttribute('aria-hidden','true');
            showToast('✅ Hromadne uložené: '+def.label+' pre '+countLabel(indices.length)+'.');
            return true;
        }catch(error){
            if($('bulkStatus'))$('bulkStatus').textContent='❌ '+(error.message||'Zápis zlyhal.')+
                (committed?' Zmeny boli uložené.':' Údaje odrôd sa nezmenili.');
            return false;
        }finally{
            if(!committed&&uploadedPaths.length){
                try{
                    const {error}=await adminSupabase.storage.from('site-images').remove(uploadedPaths);
                    if(error)throw error;
                }catch(cleanupError){
                    console.warn('Osamotené obrázky je potrebné skontrolovať v Supabase:',cleanupError);
                    if($('bulkStatus'))$('bulkStatus').textContent+=
                        ' Pozor: nepoužité fotografie môže byť potrebné odstrániť v Supabase.';
                }
            }
            setBusy(false);preview();
        }
    }
    function setup() {
        const overlay=$('bulkVarietyModal');
        if(!overlay)return;
        const selector=$('bulkField');
        selector.textContent='';
        let group=null,groupTitle='';
        for(const f of defs().fields()){
            if(groupTitle!==f.group){
                groupTitle=f.group;
                group=document.createElement('optgroup');
                group.label=groupTitle;
                selector.appendChild(group);
            }
            const option=document.createElement('option');
            option.value=f.key;option.textContent=f.label;
            group.appendChild(option);
        }
        $('bulkSearch').addEventListener('input',renderRows);
        selector.addEventListener('change',changeField);
        ['bulkValue','bulkLongValue','bulkChoice','bulkPhotoFiles'].forEach(id=>{
            $(id)?.addEventListener(id==='bulkPhotoFiles'?'change':'input',preview);
            if(id==='bulkChoice')$(id)?.addEventListener('change',preview);
        });
        $('bulkClearValue').addEventListener('change',()=>{
            const off=$('bulkClearValue').checked;
            $('bulkValue').disabled=off;
            $('bulkLongValue').disabled=off;
            $('bulkChoice').disabled=off;
            preview();
        });
        $('bulkSelectVisible').addEventListener('click',selectVisible);
        $('bulkClear').addEventListener('click',clear);
        $('bulkApply').addEventListener('click',apply);
        $('bulkClose').addEventListener('click',close);
        document.addEventListener('keydown',event=>{
            if(event.key==='Escape'&&overlay.classList.contains('active'))close();
        });
        changeField();
    }
    window.HERBA_BULK=Object.freeze({
        open,close,apply,candidateFor,selectVisible,clear,selected:()=>[...selected]
    });
    setup();
})();
