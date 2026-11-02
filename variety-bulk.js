/* Bezpečné hromadné úpravy voliteľných vlastností odrôd.
 * Iba explicitne označené záznamy, jedno povolené pole, bez úprav cien/skladu/fotografií.
 * Optimistic concurrency: Supabase updated_at = hodnota načítaná pred uložením.
 */
(() => {
    'use strict';
    const $=id=>document.getElementById(id);
    const p=()=>window.HERBA_VARIETY_PROPERTIES;
    const selected=new Set();
    let openedSignature='';
    let busy=false;
    const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
    function signature(items) {
        return typeof stableCloudJson==='function'
            ? stableCloudJson(items) : JSON.stringify(items);
    }
    function candidateFor(items, indices, key, value) {
        const keyAllowed=!!p()?.field(key);
        if (!keyAllowed) throw new Error('Vyber jednu povolenú vlastnosť.');
        if (!Array.isArray(items) || !Array.isArray(indices) ||
            !indices.length || new Set(indices).size!==indices.length) {
            throw new Error('Označ aspoň jednu platnú odrodu.');
        }
        for (const index of indices) {
            if (!Number.isInteger(index) || index<0 || index>=items.length) {
                throw new Error('Neplatný výber odrody.');
            }
        }
        const ids=new Set(indices);
        return items.map((item,i)=> ids.has(i)
            ? p().withProperty(item,key,value)
            : item);
    }
    function countLabel(n) {
        return n===1?'1 odroda':n<5?n+' odrody':n+' odrôd';
    }
    function visibleIndices() {
        const query=String($('bulkSearch')?.value||'').trim().toLocaleLowerCase('sk');
        return varietyDatabase.map((item,i)=>({item,i})).filter(({item})=>
            !query || [item.name,item.type,item.color,item.section].join(' ')
                .toLocaleLowerCase('sk').includes(query)
        ).map(x=>x.i);
    }
    function renderRows() {
        const host=$('bulkVarietyList');
        if (!host) return;
        const shown=visibleIndices();
        host.textContent='';
        const fragment=document.createDocumentFragment();
        for (const index of shown) {
            const item=varietyDatabase[index];
            const label=document.createElement('label');
            label.className='bulk-variety-row';
            const checkbox=document.createElement('input');
            checkbox.type='checkbox';
            checkbox.checked=selected.has(index);
            checkbox.disabled=busy;
            checkbox.setAttribute('aria-label','Označiť odrodu '+item.name);
            checkbox.addEventListener('change',()=>{
                if (checkbox.checked) selected.add(index);
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
        const count=$('bulkSearchCount');
        if(count)count.textContent='Zobrazených '+shown.length+' z '+varietyDatabase.length;
        preview();
    }
    function preview() {
        const count=$('bulkSelectedCount'), result=$('bulkPreview'), submit=$('bulkApply');
        const field=p()?.field($('bulkField')?.value||'');
        const value=String($('bulkValue')?.value||'').trim();
        if (count) count.textContent='Vybrané: '+countLabel(selected.size);
        const valid=!!field&&!!value&&value.length<=field.max&&selected.size>0&&!busy;
        if(submit) submit.disabled=!valid;
        if (!result) return;
        result.textContent='';
        if (!field) {result.textContent='Vyber vlastnosť, ktorú chceš upraviť.';return;}
        const summary=document.createElement('p');
        summary.textContent=valid
            ? 'Náhľad: '+field.label+' → „'+value+'“ pre '+countLabel(selected.size)+'.'
            : 'Vyber odrody a zadaj novú hodnotu (max. '+field.max+' znakov).';
        result.appendChild(summary);
        const names=[...selected].sort((a,b)=>a-b).slice(0,12).map(i=>varietyDatabase[i]?.name||'?');
        if (names.length) {
            const secondary=document.createElement('small');
            secondary.textContent=names.join(' • ')+(selected.size>12?' a ďalšie…':'');
            result.appendChild(secondary);
        }
    }
    function open() {
        if (!requireAdmin()) return false;
        if (!cloudDatabaseReady||!adminSupabase) {
            alert('Hromadné úpravy vyžadujú dostupnú databázu Supabase.');
            return false;
        }
        selected.clear();
        openedSignature=signature(varietyDatabase);
        $('bulkSearch').value='';
        $('bulkField').value='growth';
        $('bulkValue').value='';
        busy=false;
        renderRows();
        $('bulkVarietyModal').classList.add('active');
        $('bulkVarietyModal').setAttribute('aria-hidden','false');
        $('bulkSearch').focus();
        return true;
    }
    function close() {
        if (busy) return false;
        $('bulkVarietyModal')?.classList.remove('active');
        $('bulkVarietyModal')?.setAttribute('aria-hidden','true');
        selected.clear();
        return true;
    }
    function selectVisible() {
        if(busy)return;
        for(const index of visibleIndices())selected.add(index);
        renderRows();
    }
    function clear() {
        if(busy)return;
        selected.clear();
        renderRows();
    }
    async function apply() {
        if (busy||!requireAdmin()) return false;
        if (!cloudDatabaseReady||!adminSupabase) {
            alert('Supabase nie je dostupná. Nič sa nezmenilo.');return false;
        }
        const indices=[...selected].sort((a,b)=>a-b);
        const field=$('bulkField')?.value;
        const value=String($('bulkValue')?.value||'').trim();
        let candidate;
        try {candidate=candidateFor(varietyDatabase,indices,field,value);}
        catch(error){alert(error.message);return false;}
        if(signature(varietyDatabase)!==openedSignature) {
            alert('Údaje sa počas úpravy zmenili. Zatvor okno, obnov prehľad a skús znova.');
            return false;
        }
        const label=p().field(field).label;
        if(!confirm('Zmeniť „'+label+'“ u '+countLabel(indices.length)+
            '?\nNová hodnota: '+value+
            '\n\nCeny, sklad, názvy a fotografie sa nezmenia.')) return false;
        const button=$('bulkApply'),status=$('bulkStatus');
        busy=true;
        if(button)button.disabled=true;
        if(status)status.textContent='Overujem čerstvosť údajov v Supabase…';
        try {
            const waiting=await Promise.all(Object.values(cloudSaveQueues));
            if(waiting.some(result=>result===false))throw Error('Staršie neúspešné ukladanie; obnov stránku.');
            if(signature(varietyDatabase)!==openedSignature)throw Error('Údaje sa zmenili v tomto prehliadači.');
            const {data:record,error:readError}=await adminSupabase
                .from(cloudContentTable).select('content,updated_at').eq('id','varieties').single();
            if(readError) throw readError;
            if(!record||!record.updated_at)throw Error('V Supabase chýba aktuálny záznam odrôd.');
            if(signature(record.content)!==openedSignature) {
                throw Error('Odrody sa medzitým zmenili na inom zariadení. Nič sa neuložilo; obnov stránku.');
            }
            const timestamp=new Date().toISOString();
            const {data:updated,error:writeError}=await adminSupabase
                .from(cloudContentTable)
                .update({content:candidate,updated_at:timestamp})
                .eq('id','varieties').eq('updated_at',record.updated_at).select('id');
            if(writeError)throw writeError;
            if(!Array.isArray(updated)||updated.length!==1) {
                throw Error('Súbežná úprava na inom zariadení. Zápis bol bezpečne odmietnutý.');
            }
            varietyDatabase=candidate;
            openedSignature=signature(varietyDatabase);
            selected.clear();
            renderAll();
            if(typeof renderAdminTable==='function')renderAdminTable();
            closeAfterSuccess();
            showToast('✅ Vlastnosť „'+label+'“ aktualizovaná u '+countLabel(indices.length)+'.');
            return true;
        }catch(error){
            if(status)status.textContent='❌ '+(error.message||'Zápis zlyhal.')+
                ' Existujúce údaje zostali nezmenené. Pre kontrolu použi Overiť cloud.';
            return false;
        }finally{
            busy=false;
            preview();
        }
    }
    function closeAfterSuccess() {
        $('bulkVarietyModal')?.classList.remove('active');
        $('bulkVarietyModal')?.setAttribute('aria-hidden','true');
    }
    function setup() {
        const el=$('bulkVarietyModal');
        if(!el)return;
        const selector=$('bulkField');
        const fields=p()?.fields||[];
        selector.textContent='';
        for(const f of fields){
            const opt=document.createElement('option');opt.value=f.key;opt.textContent=f.label;
            selector.appendChild(opt);
        }
        $('bulkSearch').addEventListener('input',renderRows);
        $('bulkField').addEventListener('change',()=>{
            const def=p().field(selector.value);
            $('bulkValue').maxLength=def.max;
            $('bulkValue').value='';
            preview();
        });
        $('bulkValue').addEventListener('input',preview);
        $('bulkSelectVisible').addEventListener('click',selectVisible);
        $('bulkClear').addEventListener('click',clear);
        $('bulkApply').addEventListener('click',apply);
        $('bulkClose').addEventListener('click',close);
        document.addEventListener('keydown',event=>{
            if(event.key==='Escape'&&el.classList.contains('active'))close();
        });
    }
    window.HERBA_BULK=Object.freeze({
        open,close,apply,candidateFor,selectVisible,clear,
        selected:()=>[...selected]
    });
    setup();
})();
