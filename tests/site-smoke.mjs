import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createContext, runInContext, Script } from 'node:vm';
import test from 'node:test';

const html = readFileSync(resolve('index.html'), 'utf8');
const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).filter(script => script.trim());
const script = inlineScripts.join('\n');

function makeSite() {
    const alerts = [];
    const document = {
        addEventListener() {},
        querySelectorAll() { return []; },
        getElementById() { return null; },
        body: { classList: { contains() { return false; } } }
    };
    const context = createContext({
        window: { HERBA_CONFIG: {} },
        document,
        console: { warn() {}, error() {}, info() {} },
        localStorage: { getItem() { return null; } },
        setTimeout() {},
        alert(message) { alerts.push(message); }
    });
    runInContext(script, context);
    return { context, document, alerts };
}

test('HTML has one valid inline JavaScript application', () => {
    assert.equal(inlineScripts.length, 1);
    assert.doesNotThrow(() => new Script(script));
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(ids.length, new Set(ids).size, 'Static HTML IDs must not repeat');
});

test('published defaults retain all 52 products, prices, 2 packs and 10 seeds', () => {
    const { context } = makeSite();
    const varieties = runInContext('varietyDatabase.map(x => ({ ...x }))', context);
    assert.equal(varieties.length, 52);
    assert.equal(new Set(varieties.map(item => item.name.toLowerCase())).size, 52);
    assert.equal(varieties.filter(item => item.section === 'paradajky').length, 51);
    assert.equal(varieties.filter(item => item.section === 'tekvice').length, 1);
    for (const item of varieties) {
        assert.equal(item.stock, 2, 'Incorrect stock: ' + item.name);
        assert.equal(item.seedsPerPack, '10 ks', 'Incorrect seed count: ' + item.name);
        assert.ok(item.name && item.type && item.section, 'Missing product data');
        assert.ok(Number.isFinite(Number.parseFloat(item.price)), 'Invalid price: ' + item.name);
    }
});

test('the initial story section remains available with editable content', () => {
    const { context } = makeSite();
    const sections = runInContext('sectionsDatabase.map(x => ({ ...x }))', context);
    const home = sections.find(section => section.id === 'domov');
    assert.ok(home);
    assert.equal(home.name, 'Náš príbeh');
    assert.equal(home.imagePosition, 'left');
    assert.match(home.content, /Vajce vtáka Ohniváka/);
});

test('order rejects empty selections and quantities above stock', () => {
    const { context, document, alerts } = makeSite();
    runInContext("farmSettings.email = 'seller@example.com'", context);
    const submit = runInContext('handleFormSubmit', context);
    const emptyEvent = { prevented: false, preventDefault() { this.prevented = true; } };
    assert.equal(submit(emptyEvent), false);
    assert.equal(emptyEvent.prevented, true);
    assert.ok(alerts.some(message => message.includes('Vyber aspoň jednu odrodu')));

    const first = runInContext('varietyDatabase[0]', context);
    const cb = { checked: true, value: first.name };
    const qty = { value: '3' };
    document.querySelectorAll = () => [{ querySelector(selector) {
        return selector.includes('checkbox') ? cb : qty;
    } }];
    const tooMany = { prevented: false, preventDefault() { this.prevented = true; } };
    assert.equal(submit(tooMany), false);
    assert.equal(tooMany.prevented, true);

    qty.value = '2';
    const valid = { prevented: false, preventDefault() { this.prevented = true; } };
    assert.equal(submit(valid), true);
    assert.equal(valid.prevented, false);
});

test('product-card quantity stops at available stock', () => {
    const { context } = makeSite();
    const change = runInContext('changeCardQty', context);
    const input = { dataset: { max: '2' }, value: '1' };
    const button = { parentElement: { querySelector() { return input; } } };
    change(button, 1);
    assert.equal(input.value, 2);
    change(button, 1);
    assert.equal(input.value, 2);
    change(button, -1);
    assert.equal(input.value, 1);
});

test('adding an already selected variety increases quantity correctly', () => {
    const { context, document } = makeSite();
    runInContext('updateSelectionCounter = function(){}; showToast = function(){};', context);
    const cb = { checked: false, disabled: false, value: 'Test' };
    const qty = { value: '1', dataset: { max: '5' } };
    const item = { querySelector(selector) {
        return selector.includes('checkbox') ? cb : qty;
    } };
    document.querySelectorAll = () => [item];
    const button = { closest() { return { querySelector() { return { value: '2' }; } }; } };
    const add = runInContext('addVarietyToForm', context);
    add('Test', button);
    assert.equal(qty.value, 2);
    add('Test', button);
    assert.equal(qty.value, 4);
    add('Test', button);
    assert.equal(qty.value, 5);
});

test('JSON importer never writes the removed story row to Supabase', () => {
    const allowed = ['sections', 'varieties', 'blog', 'settings'];
    assert.ok(html.includes("const recordIds = ['sections', 'varieties', 'blog', 'settings']"));
    assert.equal(allowed.length, 4);
    assert.ok(!html.includes("persistCloudContent('story', storyContent)"));
});

test('order quantity buttons expose distinct accessible labels', () => {
    assert.match(html, /aria-label="Odobrať balenie \$\{escapeHtml\(t\.name\)\}"/);
    assert.match(html, /aria-label="Pridať balenie \$\{escapeHtml\(t\.name\)\}"/);
    assert.match(html, /class="qty-input form-qty-input"[^>]*aria-label="Počet balení odrody/);
});


test('číslo na karte vidno: úzke textové pole má nulové vnútorné odsadenie',()=>{
    const css=readFileSync('site-enhancements.css','utf8');
    assert.match(css,/\.variety-card \.card-actions-row \.quantity-selector input\[type="text"\]\.qty-input\s*\{/);
    assert.match(css,/padding:\s*0\s*;/);
    assert.match(css,/-webkit-text-fill-color:\s*#214d31/);
    assert.match(css,/min-width:\s*38px/);
    assert.match(html,/class="qty-input" value="1" data-max="\$\{stockVal\}"/);
});

test('pridanie, zmena počtu a odstránenie obnovujú zelené označenie karty',()=>{
    const {context,document}=makeSite();
    const styles=new Set(),buttonStyles=new Set();
    const indicator={textContent:''};
    const addButton={
        textContent:'',attributes:{},
        classList:{toggle(name,on){if(on)buttonStyles.add(name);else buttonStyles.delete(name);}},
        setAttribute(name,value){this.attributes[name]=value;}
    };
    const card={
        dataset:{name:'Kajkyna kytica'},
        classList:{toggle(name,on){if(on)styles.add(name);else styles.delete(name);}},
        querySelector(sel){return sel==='.btn-select'?addButton:sel==='.card-selection-indicator'?indicator:null;}
    };
    const cb={checked:false,disabled:false,value:'Kajkyna kytica',dataset:{price:'1.5'}};
    const qty={value:'1',dataset:{max:'4'}};
    const item={querySelector(sel){return sel.includes('checkbox')?cb:qty;}};
    document.querySelectorAll=sel=>sel==='.variety-card'?[card]:[item];
    runInContext('showToast=()=>{};',context);
    runInContext('updateSelectionCounter()',context);
    assert.equal(styles.has('in-selection'),false);
    runInContext("addVarietyQuantityToForm('Kajkyna kytica',2)",context);
    assert.equal(qty.value,2);
    assert.equal(styles.has('in-selection'),true);
    assert.equal(buttonStyles.has('selected'),true);
    assert.equal(indicator.textContent,'✓ Vo výbere · 2 bal.');
    runInContext("addVarietyQuantityToForm('Kajkyna kytica',1)",context);
    assert.equal(qty.value,3);
    assert.equal(indicator.textContent,'✓ Vo výbere · 3 bal.');
    runInContext('removeSummaryVariety(0)',context);
    assert.equal(cb.checked,false);
    assert.equal(styles.has('in-selection'),false);
    assert.equal(indicator.textContent,'');
    assert.equal(addButton.textContent,'+ Pridať');
});

test('vybraná odroda ostáva označená aj po znovuvykreslení katalógu',()=>{
    const {context,document}=makeSite();
    const chosen=new Set();
    const card={
        dataset:{name:'Black Cherry'},
        classList:{toggle(name,enabled){if(enabled)chosen.add(name);}},
        querySelector(){return null;}
    };
    const cb={checked:true,value:'Black Cherry'};
    const item={querySelector(sel){return sel.includes('checkbox')?cb:{value:'2'};}};
    document.querySelectorAll=sel=>sel==='.variety-card'?[card]:[item];
    runInContext('syncSelectedVarietyCards()',context);
    assert.equal(chosen.has('in-selection'),true);
});
