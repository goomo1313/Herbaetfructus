import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext,Script} from 'node:vm';
import test from 'node:test';

const propsCode=readFileSync('variety-properties.js','utf8');
const bulkCode=readFileSync('variety-bulk.js','utf8');
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
        textContent:'',value:'',children:[],style:{},disabled:false,maxLength:0,
        classList:{add(c){classes.add(c);},remove(c){classes.delete(c);},contains(c){return classes.has(c);}},
        setAttribute(){},focus(){},
        addEventListener(type,fn){listeners[type]=fn;},
        appendChild(child){this.children.push(child);},
        append(...items){this.children.push(...items);},
        get _listeners(){return listeners;}
    };
}
function env(){
    const controls=new Map();
    for(const id of ['bulkVarietyModal','bulkSearch','bulkField','bulkValue','bulkVarietyList','bulkSearchCount','bulkSelectedCount','bulkPreview','bulkApply','bulkClose','bulkSelectVisible','bulkClear','bulkStatus', 'varGrowth','varRipening','varFlavor','varUsage','varGrowing','varOrigin']) controls.set(id,element());
    const source=sample(),record={content:structuredClone(source),updated_at:'2026-11-02T07:00:00+00:00'};
    const alerts=[],messages=[],written=[];
    let fail=false;
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
    Object.assign(context,{
        varietyDatabase:structuredClone(source),
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
    return {context,controls,record,alerts,written,messages,failWrites(){fail=true;}};
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
    assert.throws(()=>B.candidateFor(before,[0],'stock','99'),/Vyber/);
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
