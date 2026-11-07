import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext,Script} from 'node:vm';
import test from 'node:test';

const propsCode=readFileSync('variety-properties.js','utf8');
const bulkCode=readFileSync('variety-bulk.js','utf8');
const bulkFieldsCode=readFileSync('variety-bulk-fields.js','utf8');
const html=readFileSync('index.html','utf8');
const detailCode=readFileSync('catalogue-ui.js','utf8');

function sample(){
    return [
        {name:'Black Strawberry',section:'paradajky',type:'Cherry & Koktailová',price:'1.50',stock:5,img:'https://cdn.example/1.jpg',gallery:['https://cdn.example/2.jpg'],galleryImageFits:{'https://cdn.example/2.jpg':'cover'},info:'Opis',properties:{origin:'Zo zbierky'}},
        {name:'Ildi',section:'paradajky',price:'1.40',stock:20,img:'',properties:{otherField:'Ponechať'}},
        {name:'Hokkaido',section:'tekvice',price:'1.20',stock:2,img:'https://cdn.example/3.jpg'}
    ];
}
function element() {
    const listeners={};
    const classes=new Set();
    return {
        textContent:'',value:'',children:[],style:{},disabled:false,maxLength:0,hidden:false,files:[],
        classList:{add(c){classes.add(c);},remove(c){classes.delete(c);},contains(c){return classes.has(c);}},
        setAttribute(){},focus(){},
        closest(){return {hidden:false};},querySelectorAll(){return [];},
        addEventListener(type,fn){listeners[type]=fn;},
        appendChild(child){this.children.push(child);},
        append(...items){this.children.push(...items);},
        get _listeners(){return listeners;}
    };
}
function env(){
    const controls=new Map();
    for(const id of ['bulkVarietyModal','bulkSearch','bulkField','bulkValue','bulkVarietyList','bulkSearchCount','bulkSelectedCount','bulkPreview','bulkApply','bulkClose','bulkSelectVisible','bulkClear','bulkStatus','bulkLongValue','bulkChoice','bulkPhotoFiles','bulkClearValue','bulkFieldHelp', 'varGrowth','varRipening','varFlavor','varUsage','varGrowing','varOrigin']) controls.set(id,element());
    const source=sample(),record={content:structuredClone(source),updated_at:'2026-11-02T07:00:00+00:00'};
    const alerts=[],messages=[],written=[],uploads=[],removed=[];
    let fail=false,uploadHook=null;
    const fakeDb={
        from(table){
            assert.equal(table,'site_content');
            return {
                select(fields){
                    assert.equal(fields,'content,updated_at');
                    return {eq(key,value){
                        assert.equal(key,'id');assert.equal(value,'varieties');
                        return {async single(){return {data:structuredClone(record),error:null};}};
                    }};
                },
                update(changes){
                    const filters=[];
                    return {eq(k,v){filters.push([k,v]);return this;},
                        async select(label){
                            assert.equal(label,'id');
                            if(fail)return {error:{message:'RLS blocked'},data:null};
                            if(!filters.some(([k,v])=>k==='updated_at'&&v===record.updated_at)){
                                return {data:[],error:null};
                            }
                            record.content=structuredClone(changes.content);
                            record.updated_at=changes.updated_at;
                            written.push(structuredClone(changes));
                            return {data:[{id:'varieties'}],error:null};
                        }
                    };
                }
            };
        }
    };
    fakeDb.storage={
        from(bucket){
            assert.equal(bucket,'site-images');
            return {
                async upload(path,file) {
                    uploads.push({path,type:file.type});
                    if(uploadHook)uploadHook();
                    return {error:null};
                },
                getPublicUrl(path){return {data:{publicUrl:'https://cdn.example/'+path}};},
                async remove(paths){removed.push(...paths);return {error:null};}
            };
        }
    };
    const document={
        getElementById:id=>controls.get(id)||null,
        createElement:()=>element(),
        createDocumentFragment:()=>element(),
        addEventListener(){},
        body:{classList:{contains:()=>true}}
    };
    const context=createContext({
        window:{},document,console,alert:s=>alerts.push(String(s)),
        confirm:()=>true
    });
    runInContext(propsCode,context);
    runInContext(bulkFieldsCode,context);
    Object.assign(context,{
        varietyDatabase:structuredClone(source),
        sectionsDatabase:[{id:'paradajky',name:'Paradajky'},{id:'tekvice',name:'Tekvice a cukety'}],
        prepareVarietyPhoto:async file=>file,
        cloudDatabaseReady:true,
        adminSupabase:fakeDb,
        cloudContentTable:'site_content',
        cloudSaveQueues:{},
        stableCloudJson:obj=>JSON.stringify(obj),
        requireAdmin:()=>true,
        renderAll:()=>{},
        renderAdminTable:()=>{},
        showToast:msg=>messages.push(msg)
    });
    runInContext(bulkCode,context);
    return {context,controls,record,alerts,written,messages,uploads,removed,
        failWrites(){fail=true;}, onUpload(cb){uploadHook=cb;}};
}

test('properties schema is optional and preserves unknown fields and legacy price, stock, photos',()=>{
    assert.doesNotThrow(()=>new Script(propsCode));
    const {context}=env();
    const original=sample()[0];
    const edited=context.window.HERBA_VARIETY_PROPERTIES.withProperty(original,'ripening','  Stredne skorá  ');
    assert.equal(edited.properties.ripening,'Stredne skorá');
    assert.equal(edited.properties.origin,'Zo zbierky');
    assert.equal(original.properties.ripening,undefined);
    for(const key of ['price','stock','img','gallery','galleryImageFits','name','type','info']){
        assert.deepEqual(edited[key],original[key],key+' must not change');
    }
    assert.throws(()=>context.window.HERBA_VARIETY_PROPERTIES.withProperty(original,'price','99'),/Nepovolená/);
    assert.throws(()=>context.window.HERBA_VARIETY_PROPERTIES.withProperty(original,'growth',' '),/Zadaj/);
});
test('editor leaves all existing values unchanged if six optional inputs are empty',()=>{
    const {context}=env(),P=context.window.HERBA_VARIETY_PROPERTIES;
    P.fillEditor(sample()[0]);
    const values=P.fromEditor();
    const result=P.withEditorProperties(sample()[0],values);
    assert.deepEqual(JSON.parse(JSON.stringify(result)),sample()[0]);
    const empty=P.withEditorProperties(sample()[2],Object.fromEntries(P.fields.map(f=>[f.key,''])));
    assert.deepEqual(JSON.parse(JSON.stringify(empty)),sample()[2]);
});
test('facts only display confirmed data and escape any html',()=>{
    const {context}=env(),P=context.window.HERBA_VARIETY_PROPERTIES;
    assert.equal(P.cardFacts(sample()[2]),'');
    const facts=P.cardFacts({properties:{usage:'<img src=x onerror=alert(1)>',growth:'Kríčková'}});
    assert.match(facts,/&lt;img/);
    assert.doesNotMatch(facts,/<img/);
    assert.equal(P.detailFacts(sample()[0])[0][1],'Zo zbierky');
});
test('bulk candidate modifies selected property only; rejects duplicate and invalid indices',()=>{
    const {context}=env(),B=context.window.HERBA_BULK, before=sample();
    const next=B.candidateFor(before,[0,2],'growth','Kolíková');
    assert.deepEqual(next[1],before[1]);
    assert.equal(next[0].properties.growth,'Kolíková');
    assert.equal(next[2].properties.growth,'Kolíková');
    for(let i=0;i<before.length;i++){
        for(const key of ['name','price','stock','img','gallery','info']){
            assert.deepEqual(next[i][key],before[i][key]);
        }
    }
    assert.throws(()=>B.candidateFor(before,[0,0],'growth','x'),/Označ/);
    assert.throws(()=>B.candidateFor(before,[12],'growth','x'),/Neplatný/);
    assert.equal(B.candidateFor(before,[0],'stock','99')[0].stock,99);
    assert.equal(B.candidateFor(before,[0],'price','2,50')[0].price,'2.50');
});
test('bulk save uses timestamp conditional update, changes selected fields, not prices or photos',async()=>{
    const e=env(),B=e.context.window.HERBA_BULK;
    assert.equal(B.open(),true);
    B.selectVisible();
    e.controls.get('bulkValue').value='Skorá';
    e.controls.get('bulkField').value='ripening';
    assert.equal(await B.apply(),true);
    assert.equal(e.written.length,1);
    assert.equal(e.record.content[0].properties.ripening,'Skorá');
    assert.equal(e.record.content[1].properties.otherField,'Ponechať');
    for(let i=0;i<sample().length;i++){
        assert.equal(e.record.content[i].price,sample()[i].price);
        assert.equal(e.record.content[i].stock,sample()[i].stock);
        assert.equal(e.record.content[i].img,sample()[i].img);
        assert.deepEqual(e.record.content[i].gallery,sample()[i].gallery);
    }
});
test('out-of-date cloud data refuses bulk save and does not change local rows',async()=>{
    const e=env(),B=e.context.window.HERBA_BULK;
    B.open();B.selectVisible();e.controls.get('bulkValue').value='Sladká';e.controls.get('bulkField').value='flavor';
    const original=structuredClone(e.context.varietyDatabase);
    e.record.content[0].stock=199;
    assert.equal(await B.apply(),false);
    assert.equal(e.written.length,0);
    assert.deepEqual(e.context.varietyDatabase,original);
    assert.match(e.controls.get('bulkStatus').textContent,/inom zariadení/);
});
test('server failure refuses change without mutating local database',async()=>{
    const e=env(),B=e.context.window.HERBA_BULK;
    B.open();B.selectVisible();e.controls.get('bulkValue').value='Voľná pôda';e.controls.get('bulkField').value='growing';
    const original=structuredClone(e.context.varietyDatabase);
    e.failWrites();
    assert.equal(await B.apply(),false);
    assert.equal(e.written.length,0);
    assert.deepEqual(e.context.varietyDatabase,original);
});
test('web uses new assets, labelled editor, preview, readable cards and detail features',()=>{
    for(const src of ['variety-properties.js','variety-bulk.js','variety-properties.css'])assert.ok(html.includes(src));
    for(const id of ['varGrowth','varRipening','varFlavor','varUsage','varGrowing','varOrigin','bulkVarietyModal','bulkPreview'])assert.ok(html.includes('id="'+id+'"'));
    assert.match(html,/HERBA_VARIETY_PROPERTIES\?\.cardFacts\(t\)/);
    assert.match(html,/HERBA_VARIETY_PROPERTIES\.withEditorProperties/);
    assert.match(detailCode,/HERBA_VARIETY_PROPERTIES\?\.detailFacts\(item\)/);
});


test('hromadne sa dajú bezpečne nastaviť ceny, zásoby aj počet semien',()=>{
    const e=env(),B=e.context.window.HERBA_BULK;
    const before=sample();
    const prices=B.candidateFor(before,[0,2],'price','2,20');
    assert.equal(prices[0].price,'2.20');
    assert.equal(prices[2].price,'2.20');
    assert.deepEqual(prices[1],before[1]);
    assert.equal(prices[0].stock,before[0].stock);
    assert.deepEqual(prices[0].gallery,before[0].gallery);
    assert.equal(B.candidateFor(before,[0,1],'pricePercent','10')[0].price,'1.65');
    assert.equal(B.candidateFor(before,[0,1],'stockDelta','-2')[1].stock,18);
    assert.equal(B.candidateFor(before,[0,1],'stock','0')[0].stock,0);
    assert.equal(B.candidateFor(before,[0,1],'seedsPerPack','15 ks')[1].seedsPerPack,'15 ks');
    assert.throws(()=>B.candidateFor(before,[0],'price','-1'),/Cena/);
    assert.throws(()=>B.candidateFor(before,[0],'price','0'),/Cena/);
    assert.throws(()=>B.candidateFor(before,[0],'stockDelta','-99'),/rozsah/);
    assert.throws(()=>B.candidateFor(before,[0],'stock','2.5'),/celé číslo/);
    assert.throws(()=>B.candidateFor(before,[0],'pricePercent','-100'),/Percento/);
});
test('názvy, sekcie, typy, farby, popisy, prepínače a vlastnosti sa upravujú nezávisle',()=>{
    const e=env(),B=e.context.window.HERBA_BULK,old=sample();
    const section=B.candidateFor(old,[0,1],'section','tekvice',{sectionIds:['paradajky','tekvice']});
    assert.equal(section[0].section,'tekvice');
    assert.equal(section[2].section,'tekvice');
    assert.throws(()=>B.candidateFor(old,[0],'section','admin',{sectionIds:['paradajky','tekvice']}),/sekciu/);
    const names=B.candidateFor(old,[0,1],'name','{name} – 2026');
    assert.equal(names[0].name,'Black Strawberry – 2026');
    assert.equal(names[1].name,'Ildi – 2026');
    assert.throws(()=>B.candidateFor(old,[0,1],'name','Jedna'),/\{name\}/);
    assert.throws(()=>B.candidateFor(old,[0],'name','Ildi'),/duplicitný/);
    assert.equal(B.candidateFor(old,[0],'type','Multiflora')[0].type,'Multiflora');
    assert.equal(B.candidateFor(old,[0],'color','Červená')[0].color,'Červená');
    assert.equal(B.candidateFor(old,[0],'info','Nový opis')[0].info,'Nový opis');
    assert.equal(B.candidateFor(old,[0],'multiflora','true')[0].multiflora,true);
    assert.equal(B.candidateFor(old,[0],'hidden','true')[0].hidden,true);
    assert.equal(B.candidateFor(old,[0],'isFlagship','true')[0].isFlagship,true);
    assert.equal(B.candidateFor(old,[0],'growth','Kolíková')[0].properties.growth,'Kolíková');
    assert.deepEqual(B.candidateFor(old,[0],'origin','',{clear:true})[0].properties,undefined);
    assert.throws(()=>B.candidateFor(old,[0],'hidden','možno'),/áno alebo nie/);
});
test('hromadné fotografie pridajú a nahradia len zvolený obrázok alebo galériu',()=>{
    const e=env(),B=e.context.window.HERBA_BULK,items=sample();
    const add=B.candidateFor(items,[0],'galleryAdd','https://cdn.example/new.jpg');
    assert.deepEqual(JSON.parse(JSON.stringify(add[0].gallery)),['https://cdn.example/2.jpg','https://cdn.example/new.jpg']);
    assert.equal(add[0].img,'https://cdn.example/1.jpg');
    assert.deepEqual(add[1],items[1]);
    const replace=B.candidateFor(items,[0],'galleryReplace','https://cdn.example/3.jpg');
    assert.deepEqual(JSON.parse(JSON.stringify(replace[0].gallery)),['https://cdn.example/3.jpg']);
    assert.equal(replace[0].img,items[0].img);
    assert.equal(B.candidateFor(items,[0],'imageFit','cover')[0].imageFit,'cover');
    assert.equal(B.candidateFor(items,[0],'galleryFit','contain')[0].galleryImageFits['https://cdn.example/2.jpg'],'contain');
    assert.deepEqual(JSON.parse(JSON.stringify(B.candidateFor(items,[0],'galleryClear','')[0].gallery)),[]);
    assert.equal(B.candidateFor(items,[0],'imgClear','')[0].img,undefined);
    assert.equal(B.candidateFor(items,[0],'img','https://cdn.example/2.jpg')[0].gallery.length,0);
    assert.throws(()=>B.candidateFor(items,[0],'img','javascript:alert(1)'),/HTTPS/);
    assert.throws(()=>B.candidateFor(items,[0],'galleryAdd','http://not-secure.example/1.jpg'),/HTTPS/);
    const full=[{...items[0],gallery:Array.from({length:7},(_,i)=>'https://cdn.example/x'+i+'.jpg')}];
    assert.throws(()=>B.candidateFor(full,[0],'galleryAdd','https://cdn.example/eighth.jpg'),/viac než 8/);
});
test('ukladanie novej ceny do cloudu zachová fotografie a zásoby iných odrôd',async()=>{
    const e=env(),B=e.context.window.HERBA_BULK;
    assert.equal(B.open(),true);
    B.selectVisible();
    e.controls.get('bulkField').value='price';
    e.controls.get('bulkValue').value='1,99';
    assert.equal(await B.apply(),true);
    assert.equal(e.record.content[0].price,'1.99');
    assert.equal(e.record.content[1].price,'1.99');
    assert.equal(e.record.content[2].price,'1.99');
    for(let i=0;i<sample().length;i++){
        assert.equal(e.record.content[i].stock,sample()[i].stock);
        assert.deepEqual(e.record.content[i].gallery,sample()[i].gallery);
        assert.equal(e.record.content[i].img,sample()[i].img);
    }
});


test('hromadné nahratie jednej fotografie mení len hlavný obrázok označených odrôd',async()=>{
    const e=env(),B=e.context.window.HERBA_BULK;
    B.open();B.selectVisible();
    e.controls.get('bulkField').value='photoUploadMain';
    e.controls.get('bulkPhotoFiles').files=[{name:'plody.jpg',type:'image/jpeg',size:1200}];
    assert.equal(await B.apply(),true);
    assert.equal(e.uploads.length,1);
    assert.equal(e.removed.length,0);
    assert.equal(e.written.length,1);
    const url=e.record.content[0].img;
    assert.ok(url.startsWith('https://cdn.example/varieties/bulk-'));
    assert.equal(e.record.content[1].img,url);
    assert.equal(e.record.content[2].img,url);
    assert.equal(e.record.content[0].price,'1.50');
    assert.equal(e.record.content[0].stock,5);
    assert.deepEqual(e.record.content[0].gallery,['https://cdn.example/2.jpg']);
});
test('súbežná zmena počas uploadu zastaví hromadný zápis a vyčistí nahraný súbor',async()=>{
    const e=env(),B=e.context.window.HERBA_BULK;
    B.open();B.selectVisible();
    e.controls.get('bulkField').value='photoUploadGallery';
    e.controls.get('bulkPhotoFiles').files=[{name:'rastlina.png',type:'image/png',size:1800}];
    e.onUpload(()=>{e.record.content[0].stock=999;});
    assert.equal(await B.apply(),false);
    assert.equal(e.written.length,0);
    assert.equal(e.uploads.length,1);
    assert.equal(e.removed.length,1);
    assert.equal(e.context.varietyDatabase[0].stock,5);
    assert.match(e.controls.get('bulkStatus').textContent,/inom zariadení/);
});
