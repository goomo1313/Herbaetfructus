/* Herba et Fructus – schéma a validácia hromadných operácií.
 * Úprava mení len explicitne vybrané záznamy a zachováva ostatné atribúty.
 * Bez automatického odvodenia rastu, chuti alebo pôvodu odrody.
 */
(() => {
    'use strict';
    const standard = [
        {key:'name',label:'Názov odrody (šablóna)',group:'Základné údaje',kind:'name',placeholder:'{name} – 2026',max:150},
        {key:'section',label:'Katalógová sekcia',group:'Základné údaje',kind:'section'},
        {key:'type',label:'Typ / pomológia',group:'Základné údaje',kind:'type',max:120},
        {key:'color',label:'Farba plodu',group:'Základné údaje',kind:'color'},
        {key:'weight',label:'Hmotnosť plodu',group:'Základné údaje',kind:'text',max:100,allowClear:true},
        {key:'info',label:'Popis odrody',group:'Základné údaje',kind:'longtext',max:4000,allowClear:true},
        {key:'multiflora',label:'Označenie multiflora',group:'Základné údaje',kind:'boolean'},
        {key:'hidden',label:'Skryť / zobraziť odrodu',group:'Základné údaje',kind:'boolean'},
        {key:'isFlagship',label:'Označenie vlajkovej odrody',group:'Základné údaje',kind:'boolean'},
        {key:'price',label:'Cena za balenie (€) – nastaviť',group:'Ceny a zásoby',kind:'price'},
        {key:'pricePercent',label:'Cena – zmeniť o %',group:'Ceny a zásoby',kind:'percent'},
        {key:'stock',label:'Sklad balení – nastaviť',group:'Ceny a zásoby',kind:'stock'},
        {key:'stockDelta',label:'Sklad balení – pridať / odobrať',group:'Ceny a zásoby',kind:'delta'},
        {key:'seedsPerPack',label:'Počet semien v balení',group:'Ceny a zásoby',kind:'seeds'},
        {key:'img',label:'Hlavná fotografia – HTTPS adresa',group:'Fotografie',kind:'url'},
        {key:'imgClear',label:'Hlavná fotografia – odstrániť odkaz',group:'Fotografie',kind:'confirmClear'},
        {key:'imageFit',label:'Hlavná fotografia – spôsob zobrazenia',group:'Fotografie',kind:'fit'},
        {key:'galleryAdd',label:'Galéria – pridať HTTPS adresy',group:'Fotografie',kind:'urls'},
        {key:'galleryReplace',label:'Galéria – nahradiť HTTPS adresy',group:'Fotografie',kind:'urls'},
        {key:'galleryRemove',label:'Galéria – odstrániť zadané adresy',group:'Fotografie',kind:'urls'},
        {key:'galleryClear',label:'Galéria – vyprázdniť odkazy',group:'Fotografie',kind:'confirmClear'},
        {key:'galleryFit',label:'Galéria – zobrazenie všetkých fotiek',group:'Fotografie',kind:'fit'},
        {key:'photoUploadMain',label:'Nahrať jednu spoločnú hlavnú fotografiu',group:'Fotografie',kind:'file'},
        {key:'photoUploadGallery',label:'Nahrať spoločné fotografie do galérie',group:'Fotografie',kind:'files'}
    ];
    const fields=()=>standard.concat((window.HERBA_VARIETY_PROPERTIES?.fields||[]).map(f=>({
        key:f.key,label:f.label,group:'Pestovateľské vlastnosti',kind:'property',max:f.max,allowClear:true,placeholder:f.placeholder
    })));
    const field=key=>fields().find(f=>f.key===key)||null;
    const colors=['Červená','Žltá / Oranžová','Čierna / Tmavá','Pásikavá / Pestrá','Zelená / Iná'];
    const types=['Indeterminantná','Determinantná','Multiflora','Cherry & Koktailová','Býčie srdce','Omáčková','Zberateľská špecialita','Tekvica','Cuketa'];
    const normalize=value=>String(value??'').trim();
    const safeUrl=value=>/^https:\/\/[a-z0-9][^\s<>"']*$/i.test(value) && !/[{}]/.test(value);
    const toUrls=value=>{
        const vals=normalize(value).split(/\r?\n/).map(v=>v.trim()).filter(Boolean);
        if(!vals.length||vals.length>8||vals.some(v=>!safeUrl(v)))throw Error('Zadaj 1 až 8 platných HTTPS adries (každú na samostatný riadok).');
        return [...new Set(vals)];
    };
    function parsedValue(def,raw,options={}) {
        if(!def)throw Error('Vyber povolené pole.');
        if(options.clear===true){
            if(!def.allowClear)throw Error('Toto pole sa nedá vymazať. Použi samostatnú operáciu.');
            return {clear:true};
        }
        const v=normalize(raw);
        if(def.kind==='file'||def.kind==='files') {
            if(!options.uploadedUrls?.length)throw Error('Najprv vyber fotografie na nahratie.');
            if(def.kind==='file'&&options.uploadedUrls.length!==1)throw Error('Na hlavnú fotografiu vyber presne jeden súbor.');
            return def.kind==='file' ? options.uploadedUrls[0] : options.uploadedUrls.slice();
        }
        if(def.kind==='confirmClear')return true;
        if(def.kind==='boolean'){
            if(v!=='true'&&v!=='false')throw Error('Zvoľ áno alebo nie.');
            return v==='true';
        }
        if(def.kind==='fit'){
            if(v!=='contain'&&v!=='cover')throw Error('Zvoľ spôsob zobrazenia fotografie.');
            return v;
        }
        if(def.kind==='color'){
            if(!colors.includes(v))throw Error('Zvoľ farbu zo zoznamu.');
            return v;
        }
        if(def.kind==='section'){
            if(!Array.isArray(options.sectionIds)||!options.sectionIds.includes(v))throw Error('Zvoľ existujúcu katalógovú sekciu.');
            return v;
        }
        if(def.kind==='urls')return toUrls(v);
        if(def.kind==='url'){
            if(!safeUrl(v))throw Error('Fotografia musí mať platnú HTTPS adresu.');
            return v;
        }
        if(def.kind==='price'||def.kind==='percent'){
            const rawNum=v.replace(',','.');
            if(!/^-?\d+(?:\.\d{1,2})?$/.test(rawNum))throw Error('Zadaj platné číslo (napríklad 1,50 alebo -10).');
            const num=Number(rawNum);
            if(!Number.isFinite(num))throw Error('Neplatná číselná hodnota.');
            if(def.kind==='price'&&(num<=0||num>1000))throw Error('Cena musí byť vyššia než 0 € a najviac 1000 €.');
            if(def.kind==='percent'&&(num<=-100||num>1000||num===0))throw Error('Percento musí byť väčšie než -100 a najviac 1000 (okrem 0).');
            return num;
        }
        if(def.kind==='stock'||def.kind==='delta'){
            if(!/^[+-]?\d+$/.test(v))throw Error('Sklad musí byť celé číslo.');
            const num=Number(v);
            if(!Number.isSafeInteger(num)||Math.abs(num)>100000)throw Error('Zadaj celé číslo v rozsahu -100000 až 100000.');
            if(def.kind==='stock'&&num<0)throw Error('Sklad nesmie byť záporný.');
            if(def.kind==='delta'&&num===0)throw Error('Zadaj nenulovú zmenu skladu.');
            return num;
        }
        if(def.kind==='seeds'){
            if(!/^\d+\s*ks$/i.test(v)||parseInt(v,10)<1||parseInt(v,10)>100000)throw Error('Počet semien zadaj napríklad „10 ks“.');
            return parseInt(v,10)+' ks';
        }
        if(!v||v.length>(def.max||1000))throw Error('Vyplň hodnotu (najviac '+(def.max||1000)+' znakov).');
        if(def.kind==='name'&&!v.includes('{name}')&&options.selectionCount>1)
            throw Error('Pri viacerých odrodách musí názov obsahovať {name}, aby nevznikli duplicitné názvy.');
        return v;
    }
    function updatedOne(item,def,value) {
        const old=item||{};
        const result={...old};
        const key=def.key;
        if(def.kind==='property') {
            if(value&&typeof value==='object'&&value.clear===true){
                const properties={...(old.properties||{})};
                delete properties[key];
                if(Object.keys(properties).length)result.properties=properties;
                else delete result.properties;
                return result;
            }
            return window.HERBA_VARIETY_PROPERTIES.withProperty(old,key,value);
        }
        if(value&&typeof value==='object'&&value.clear===true){delete result[key];return result;}
        if(def.kind==='price')result.price=value.toFixed(2);
        else if(def.kind==='percent'){
            const oldPrice=Number(String(old.price||'').replace(',','.').replace('€',''));
            const next=Math.round((oldPrice*(1+value/100)+Number.EPSILON)*100)/100;
            if(!Number.isFinite(oldPrice)||oldPrice<=0||!Number.isFinite(next)||next<=0||next>1000)
                throw Error('Percentuálna zmena vytvorí neplatnú cenu pri „'+old.name+'“.');
            result.price=next.toFixed(2);
        }else if(def.kind==='delta'){
            const prev=Number(old.stock);
            const next=prev+value;
            if(!Number.isSafeInteger(prev)||!Number.isSafeInteger(next)||next<0||next>100000)
                throw Error('Zmena skladu prekračuje povolený rozsah pri „'+old.name+'“.');
            result.stock=next;
        }else if(def.kind==='name'){
            const name=value.includes('{name}')?value.split('{name}').join(String(old.name||'')):value;
            if(!name.trim()||name.length>150)throw Error('Nový názov musí mať 1 až 150 znakov.');
            result.name=name.trim();
        }else if(def.kind==='confirmClear'){
            if(key==='imgClear')delete result.img;
            if(key==='galleryClear'){result.gallery=[];result.galleryImageFits={};}
        }else if(key==='galleryAdd'||key==='galleryReplace'||key==='photoUploadGallery'){
            const addition=Array.isArray(value)?value:[value];
            const next=key==='galleryReplace'?[]:(Array.isArray(old.gallery)?old.gallery:[]);
            result.gallery=[...new Set(next.concat(addition).filter(u=>u!==old.img))];
            const fits={...old.galleryImageFits};
            result.galleryImageFits=Object.fromEntries(result.gallery.map(u=>[u,fits[u]==='cover'?'cover':'contain']));
        }else if(key==='galleryRemove'){
            const next=(Array.isArray(old.gallery)?old.gallery:[]).filter(u=>!value.includes(u));
            result.gallery=next;
            result.galleryImageFits=Object.fromEntries(next.map(u=>[u,old.galleryImageFits?.[u]==='cover'?'cover':'contain']));
        }else if(key==='galleryFit'){
            const next=Array.isArray(old.gallery)?old.gallery:[];
            result.galleryImageFits=Object.fromEntries(next.map(u=>[u,value]));
        }else if(key==='photoUploadMain'){
            result.img=value;
        }else{
            result[key]=value;
        }
        // Hlavná fotografia nesmie byť zároveň duplicitne v galérii.
        if((key==='img'||key==='photoUploadMain')&&Array.isArray(result.gallery)){
            result.gallery=result.gallery.filter(url=>url!==result.img);
            if(result.galleryImageFits&&typeof result.galleryImageFits==='object')
                result.galleryImageFits=Object.fromEntries(
                    result.gallery.map(url=>[url,result.galleryImageFits[url]||'contain'])
                );
        }
        const total=(result.img?1:0)+(Array.isArray(result.gallery)?result.gallery.length:0);
        if(total>8)throw Error('Odroda „'+old.name+'“ by mala viac než 8 fotografií. Zvoľ menší výber alebo nahraď galériu.');
        return result;
    }
    function candidateFor(items,indices,key,rawValue,options={}) {
        const def=field(key);
        if(!def)throw Error('Vyber jednu povolenú vlastnosť.');
        if(!Array.isArray(items)||!Array.isArray(indices)||!indices.length||
           indices.length!==new Set(indices).size)throw Error('Označ aspoň jednu platnú odrodu.');
        for(const i of indices){
            if(!Number.isInteger(i)||i<0||i>=items.length)throw Error('Neplatný výber odrody.');
        }
        const value=parsedValue(def,rawValue,{...options,selectionCount:indices.length});
        const chosen=new Set(indices);
        const updated=items.map((item,index)=>chosen.has(index)?updatedOne(item,def,value):item);
        if(key==='name') {
            const names=new Set();
            for(const item of updated) {
                const n=String(item.name||'').trim().toLocaleLowerCase('sk');
                if(names.has(n))throw Error('Úprava by vytvorila duplicitný názov „'+item.name+'“.');
                names.add(n);
            }
        }
        return updated;
    }
    window.HERBA_BULK_FIELDS=Object.freeze({fields,field,colors,types,parsedValue,candidateFor,safeUrl});
})();
