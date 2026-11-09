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
