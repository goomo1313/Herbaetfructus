import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext, Script } from 'node:vm';
import test from 'node:test';

const html=readFileSync('index.html','utf8');
const catalogue=readFileSync('catalogue-ui.js','utf8');
const enhancements=readFileSync('site-enhancements.js','utf8');
const app=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(m=>m[1]).filter(Boolean).join('\n');

function environment() {
    const alerts=[], saves=[], toasts=[];
    const count={innerText:''}, totalPrice={innerText:''};
    const checkbox={checked:true,value:'Ildi',dataset:{price:'1.50'}};
    const selectorItem={querySelector(q) {
        return q==='input[type="checkbox"]'?checkbox:
            q==='.form-qty-input'?{value:'2'}:null;
    }};
    const classes=new Set();
    const controls={
        toggleOrderFormBtn:{textContent:'',style:{},disabled:false,attrs:{},setAttribute(k,v){this.attrs[k]=v;}},
        togglePricesBtn:{textContent:'',style:{},disabled:false,attrs:{},setAttribute(k,v){this.attrs[k]=v;},focus(){}},
        openVisibilitySettingsBtn:{focus(){}},
        visibilitySettingsModal:{classList:{add(k){classes.add(k)},remove(k){classes.delete(k)}},attrs:{},setAttribute(k,v){this.attrs[k]=v;}},
        visibilitySettingsStatus:{textContent:''},
        floatingPriceTotal:{style:{}},
        floatingCounter:{style:{display:'none'},querySelector(q){return q==='.count'?count:q==='.totalPrice'?totalPrice:null;}},
        kontaktSection:{style:{display:'none'}},
        submit:{disabled:false},
        cartSummaryContent:{innerHTML:''},
        orderSummary:{value:''}
    };
    const document={
        addEventListener(){},
        querySelectorAll(sel){return sel==='#formTomatoSelector .selector-item'?[selectorItem]:[];},
        querySelector(sel){return sel==='#contactForm button[type="submit"]'?controls.submit:null;},
        getElementById(id){return controls[id]||null;},
        body:{classList:{contains(){return false;}}}
    };
    const context=createContext({
        window:{HERBA_CONFIG:{},__toasts:toasts},document,
        console:{info(){},warn(){},error(){}},
        localStorage:{getItem(){return null}},
        alert(m){alerts.push(String(m))},setTimeout(){}
    });
    runInContext(app,context);
    runInContext("showToast = m => window.__toasts.push(m); renderAll = () => { updateOrderFormVisibility(); updatePriceVisibility(); };",context);
    return {context,controls,alerts,saves,toasts,classes,count,totalPrice};
}

test('spoločné administračné okno ponúka obe nezávislé voľby',()=>{
    assert.doesNotThrow(()=>new Script(app));
    assert.match(html,/id="openVisibilitySettingsBtn"/);
    assert.match(html,/id="visibilitySettingsModal"/);
    assert.match(html,/id="toggleOrderFormBtn"/);
    assert.match(html,/id="togglePricesBtn"/);
    const {context,controls,classes}=environment();
    assert.equal(runInContext('arePricesHidden()',context),false);
    runInContext('adminAuthenticated=true; openVisibilitySettingsModal()',context);
    assert.ok(classes.has('active'));
    runInContext('closeVisibilitySettingsModal()',context);
    assert.ok(!classes.has('active'));
    assert.equal(controls.visibilitySettingsModal.attrs['aria-hidden'],'true');
});

test('ceny sa skryjú v súhrne výberu aj odosielanom dopyte, počet balení zostane',()=>{
    const {context,controls,count}=environment();
    runInContext("currentActiveSection='paradajky'; updateSelectionCounter(); updatePriceVisibility();",context);
    assert.match(controls.cartSummaryContent.innerHTML,/3\.00 €/);
    assert.match(controls.orderSummary.value,/3\.00 €/);
    runInContext("farmSettings.pricesHidden=true; updateSelectionCounter(); updatePriceVisibility();",context);
    assert.equal(runInContext('arePricesHidden()',context),true);
    assert.doesNotMatch(controls.cartSummaryContent.innerHTML,/€|hodnota výberu|Suma nezahŕňa/);
    assert.doesNotMatch(controls.orderSummary.value,/€|Orientačná hodnota/);
    assert.match(controls.orderSummary.value,/Celkový počet balíčkov: 2/);
    assert.equal(count.innerText,2);
    assert.equal(controls.floatingPriceTotal.style.display,'none');
    assert.equal(controls.togglePricesBtn.attrs['aria-pressed'],'true');
    assert.match(controls.togglePricesBtn.textContent,/Zobraziť ceny/);
    runInContext("farmSettings.pricesHidden=false; updateSelectionCounter(); updatePriceVisibility();",context);
    assert.match(controls.cartSummaryContent.innerHTML,/3\.00 €/);
    assert.equal(controls.floatingPriceTotal.style.display,'');
});

test('prepínanie cien a formulára zachová oba údaje a ostatné settings',async()=>{
    const {context,saves,controls}=environment();
    context.window.__saves=saves;
    runInContext("adminAuthenticated=true; cloudDatabaseReady=true; farmSettings.email='owner@example.com'; queueCloudSave=async(k,v)=>{window.__saves.push({k,v});return true;};",context);
    assert.equal(await runInContext('togglePricesHidden()',context),true);
    assert.equal(runInContext('farmSettings.pricesHidden',context),true);
    assert.equal(runInContext('farmSettings.email',context),'owner@example.com');
    assert.equal(await runInContext('toggleOrderFormPaused()',context),true);
    assert.equal(runInContext('farmSettings.orderFormPaused',context),true);
    assert.equal(saves.length,2);
    assert.equal(saves[0].k,'settings');
    assert.equal(saves[1].k,'settings');
    assert.equal(saves[1].v.pricesHidden,true);
    assert.equal(controls.toggleOrderFormBtn.disabled,false);
    assert.equal(controls.togglePricesBtn.disabled,false);
    assert.equal(await runInContext('togglePricesHidden()',context),true);
    assert.equal(runInContext('farmSettings.orderFormPaused',context),true);
    assert.equal(runInContext('farmSettings.pricesHidden',context),false);
});

test('zlyhanie zápisu a neprihlásený správca nemôžu zmeniť stav cien',async()=>{
    const {context,alerts}=environment();
    assert.equal(await runInContext('togglePricesHidden()',context),false);
    runInContext("adminAuthenticated=true; cloudDatabaseReady=false;",context);
    assert.equal(await runInContext('togglePricesHidden()',context),false);
    assert.ok(alerts.some(x=>x.includes('Databáza Supabase')));
    runInContext("cloudDatabaseReady=true; farmSettings.pricesHidden=true; queueCloudSave=async()=>false;",context);
    assert.equal(await runInContext('togglePricesHidden()',context),false);
    assert.equal(runInContext('farmSettings.pricesHidden',context),true);
    assert.ok(alerts.some(x=>x.includes('nepodarilo uložiť')));
});

test('súbežné prepínanie nemožno odoslať a prepísať druhú voľbu',async()=>{
    const {context}=environment();
    context.window.__pending={};
    runInContext("adminAuthenticated=true; cloudDatabaseReady=true; queueCloudSave=()=>new Promise(resolve=>window.__pending.resolve=resolve);",context);
    const first=runInContext('togglePricesHidden()',context);
    assert.equal(await runInContext('toggleOrderFormPaused()',context),false);
    context.window.__pending.resolve(true);
    assert.equal(await first,true);
    assert.equal(runInContext('farmSettings.pricesHidden',context),true);
    assert.equal(runInContext('isOrderFormPaused()',context),false);
});

test('verejné karty, zoradenie, detail aj porovnávač rešpektujú skryté ceny',()=>{
    assert.match(html,/const priceFormatted = !arePricesHidden\(\) && t.price/);
    assert.match(html,/arePricesHidden\(\) \? '' : '<option value="price-asc"/);
    assert.match(html,/arePricesHidden\(\) \? '' : \` \(\$\{escapeHtml\(priceClean\)\}\)\`/);
    assert.match(catalogue,/byId\('detailPrice'\)\.style\.display = pricesHidden/);
    assert.match(enhancements,/arePricesHidden\(\) \? \[\] : \[\['Cena\/balenie'/);
    assert.match(html,/id="floatingPriceTotal"/);
});
